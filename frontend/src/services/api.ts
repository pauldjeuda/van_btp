/**
 * @file api.ts
 * Couche HTTP centralisée — toutes les requêtes vers le backend VAN BTP ERP.
 * Architecture Ultra-Stable (LocalStorage) inspirée de Claude9.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'van_btp_token';
const USER_KEY = 'van_btp_user';
const ROLE_KEY = 'van_btp_role';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  },
};

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token: explicitToken, ...fetchOptions } = options;

  const token = explicitToken || tokenStore.get();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBaseUrl}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // ─── Gestion de l'expiration du token (401) ───
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    tokenStore.clear();
    window.dispatchEvent(new CustomEvent('van_btp:session_expired'));
    throw new Error('Session expirée');
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (json as any).message || `Erreur HTTP ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),

  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = tokenStore.get();
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any).message || `Erreur HTTP ${response.status}`);
    return json as T;
  },
};
