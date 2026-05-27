/**
 * @file auth.service.ts
 * Service d'authentification VAN BTP ERP.
 *
 * Basculement via VITE_DATA_SOURCE dans frontend/.env :
 *   VITE_DATA_SOURCE=local   → Backend Express local
 *   VITE_DATA_SOURCE=van_rh  → Serveur VAN RH (URL : backend/.env VAN_RH_URL)
 */

import { api, tokenStore } from './api';
import { Role } from '../types/permissions';
import {
  fixIntegrationImageUrl,
  getVanRhUrl,
  isVanRhDataSource,
  loadIntegrationConfig,
} from '../lib/integrationConfig';

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

const ROLE_ALIASES: Record<string, Role> = {
  Gerant_stock: 'Gestionnaire de stocks',
};

const normalizeRole = (role: string | null | undefined): Role | null => {
  if (!role) return null;
  return (ROLE_ALIASES[role] ?? role) as Role;
};

// ─── Source de données active ─────────────────────────────────────────────────
const isVanRH = isVanRhDataSource();

console.log(
  `🔌 [AUTH SERVICE] Source de données : ${isVanRH ? '🌐 VAN RH' : '🏠 LOCAL'}`,
);

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
  const role = normalizeRole(user?.role)!;
  const adaptedUser: AuthUser = {
    ...user,
    photoUrl: fixIntegrationImageUrl(user.avatar || user.photoUrl)
  };

  saveSession(token, adaptedUser, role);
  return { success: true, token, role, user: adaptedUser };
};

// ─── Login VAN RH ─────────────────────────────────────────────────────────────

const loginVanRH = async (credentials: LoginCredentials): Promise<AuthResult> => {
  await loadIntegrationConfig();
  const vanRhUrl = getVanRhUrl();
  if (!vanRhUrl) {
    throw new Error('VAN_RH_URL non configuré sur le backend (backend/.env)');
  }

  console.log(`🌐 [AUTH SERVICE] Connexion via VAN RH : ${vanRhUrl}/api/auth-app/login`);

  // compagnie et service sont hardcodés — l'utilisateur n'a pas à les saisir
  const body = {
    matricule: credentials.matricule,
    password: credentials.password,
    compagnie: 'VAN INTERNATIONAL',
    service: 'van BTP',
  };

  const response = await fetch(`${vanRhUrl}/api/auth-app/login`, {
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
  const role = normalizeRole(rawUser?.role || rawUser?.Role)!;

  const adaptedUser: AuthUser = {
    id: rawUser.id,
    matricule: rawUser.matricule,
    nom: rawUser.nom,
    prenom: rawUser.prenom,
    email: rawUser.email,
    photoUrl: fixIntegrationImageUrl(
      rawUser.photoUrl || rawUser.avatar || rawUser.Avatar || rawUser.PhotoUrl,
    ),
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
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
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
      user.photoUrl = fixIntegrationImageUrl(user.photoUrl);
    }
    return user;
  },

  getCachedRole: (): Role | null =>
    normalizeRole(localStorage.getItem(ROLE_KEY)),

  getToken: (): string | null => tokenStore.get(),
};
