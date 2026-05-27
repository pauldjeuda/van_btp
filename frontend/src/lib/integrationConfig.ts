/**
 * URLs d'intégration externes — source unique côté frontend via backend/.env
 * (GET /api/public/config). Ne pas dupliquer VITE_VAN_RH_URL dans les services.
 */

import { resolveApiBaseUrl } from './apiBaseUrl';

const API_URL = resolveApiBaseUrl();

let vanRhUrl = '';
let loaded = false;
let loadPromise: Promise<void> | null = null;

export const isVanRhDataSource = (): boolean =>
  (import.meta.env.VITE_DATA_SOURCE || 'local') === 'van_rh';

export async function loadIntegrationConfig(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/config`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || `HTTP ${res.status}`);
        }
        vanRhUrl = String(json.data?.vanRh?.url || '').replace(/\/$/, '');
        if (isVanRhDataSource() && !vanRhUrl) {
          console.warn(
            '[integrationConfig] VAN_RH_URL non défini dans backend/.env — mode van_rh inutilisable',
          );
        } else if (vanRhUrl) {
          console.log(`🔌 [integrationConfig] VAN RH : ${vanRhUrl}`);
        }
      } catch (err) {
        console.warn('[integrationConfig] Échec chargement config backend :', err);
        vanRhUrl = '';
      } finally {
        loaded = true;
      }
    })();
  }
  await loadPromise;
}

/** URL VAN RH (backend/.env → VAN_RH_URL). Appeler loadIntegrationConfig() avant usage en mode van_rh. */
export const getVanRhUrl = (): string => vanRhUrl;

export const getApiBaseUrl = (): string =>
  API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

/** Base pour les chemins relatifs d'images (avatars, pièces jointes). */
export const resolveMediaBaseUrl = (useVanRh = isVanRhDataSource()): string =>
  useVanRh ? getVanRhUrl() || API_URL : API_URL;

export const fixIntegrationImageUrl = (
  url?: string,
  useVanRh = isVanRhDataSource(),
): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  const baseUrl = resolveMediaBaseUrl(useVanRh);
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
};
