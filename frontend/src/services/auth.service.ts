/**
 * @file auth.service.ts
 * Service d'authentification VAN BTP ERP.
 *
 * Basculement via VITE_DATA_SOURCE dans frontend/.env :
 *   VITE_DATA_SOURCE=local   → Backend Express local
 *   VITE_DATA_SOURCE=van_rh  → Serveur VAN RH distant (192.168.1.103:4000)
 */

import { api, tokenStore } from './api';
import { Role } from '../types/permissions';

export interface AuthUser {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  photoUrl?: string;
  avatar?: string;
  doitChangerMotDePasse?: boolean;
}

export interface LoginCredentials {
  matricule: string;
  password: string;
  compagnie?: string;
  service?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  role?: Role;
  token?: string;
  error?: string;
}

const USER_KEY = 'van_btp_user';
const ROLE_KEY = 'van_btp_role';

// ─── Source de données active ─────────────────────────────────────────────────
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'local';
const VAN_RH_URL = import.meta.env.VITE_VAN_RH_URL || 'http://10.99.173.66:4000';

const isVanRH = DATA_SOURCE === 'van_rh';

console.log(`🔌 [AUTH SERVICE] Source de données : ${isVanRH ? '🌐 VAN RH (' + VAN_RH_URL + ')' : '🏠 LOCAL'}`);

// ─── Helpers partagés ─────────────────────────────────────────────────────────

const fixImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  const baseUrl = isVanRH
    ? (import.meta.env.VITE_VAN_RH_URL || 'http://10.99.173.66:4000')
    : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const saveSession = (token: string, user: AuthUser, role: Role) => {
  tokenStore.set(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ROLE_KEY, role);
};

// ─── Login LOCAL ──────────────────────────────────────────────────────────────

const loginLocal = async (credentials: LoginCredentials): Promise<AuthResult> => {
  console.log('🏠 [AUTH SERVICE] Connexion via backend LOCAL...');
  const json = await api.post<any>('/api/auth/login', credentials);

  if (!json.success) throw new Error(json.message || 'Échec connexion');

  const { token, user } = json;
  const role = user?.role as Role;
  const adaptedUser: AuthUser = {
    ...user,
    photoUrl: fixImageUrl(user.avatar || user.photoUrl)
  };

  saveSession(token, adaptedUser, role);
  return { success: true, token, role, user: adaptedUser };
};

// ─── Login VAN RH ─────────────────────────────────────────────────────────────

const loginVanRH = async (credentials: LoginCredentials): Promise<AuthResult> => {
  console.log(`🌐 [AUTH SERVICE] Connexion via VAN RH : ${VAN_RH_URL}/api/auth-app/login`);

  // compagnie et service sont hardcodés — l'utilisateur n'a pas à les saisir
  const body = {
    matricule: credentials.matricule,
    password: credentials.password,
    compagnie: 'VAN INTERNATIONAL',
    service: 'van BTP',
  };

  const response = await fetch(`${VAN_RH_URL}/api/auth-app/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Erreur VAN RH : HTTP ${response.status}`);
  }

  const json = await response.json();

  // Adapter la réponse VAN RH vers notre format standard
  const token = json.token || json.accessToken;
  const rawUser = json.user || json;
  const role = (rawUser?.role || rawUser?.Role) as Role;

  const adaptedUser: AuthUser = {
    id: rawUser.id,
    matricule: rawUser.matricule,
    nom: rawUser.nom,
    prenom: rawUser.prenom,
    email: rawUser.email,
    photoUrl: fixImageUrl(rawUser.photoUrl || rawUser.avatar || rawUser.Avatar || rawUser.PhotoUrl),
    doitChangerMotDePasse: rawUser.doitChangerMotDePasse,
  };

  // Stocker le token VAN RH séparément (utilisé par employeeRH.service.ts)
  localStorage.setItem('van_rh_token', token);

  saveSession(token, adaptedUser, role);
  return { success: true, token, role, user: adaptedUser };
};

// ─── Service exporté ──────────────────────────────────────────────────────────

export const authService = {

  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      return isVanRH ? await loginVanRH(credentials) : await loginLocal(credentials);
    } catch (err: any) {
      console.error('💥 [AUTH SERVICE] Erreur login:', err.message);
      return { success: false, error: err?.message || 'Erreur de connexion' };
    }
  },

  logout: async (): Promise<void> => {
    try {
      if (!isVanRH) {
        await api.post('/api/auth/logout', {});
      }
    } catch {
      // Déconnecter localement même si le serveur répond mal
    } finally {
      tokenStore.clear();
      localStorage.removeItem('van_rh_token');
    }
  },

  /**
   * Restaure la session depuis le localStorage (fonctionne pour les deux modes).
   * Instantané, pas d'appel réseau.
   */
  restoreSession: async (): Promise<{ user: AuthUser; role: Role } | null> => {
    try {
      const token = tokenStore.get();
      const user = authService.getCachedUser();
      const role = authService.getCachedRole();

      if (!token || !user || !role) return null;
      return { user, role };
    } catch {
      return null;
    }
  },

  getCachedUser: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    if (user.photoUrl) {
      user.photoUrl = fixImageUrl(user.photoUrl);
    }
    return user;
  },

  getCachedRole: (): Role | null =>
    (localStorage.getItem(ROLE_KEY) as Role) || null,

  getToken: (): string | null => tokenStore.get(),
};
