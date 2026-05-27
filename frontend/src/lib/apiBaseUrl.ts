/**
 * URL de base API — en dev, chemins relatifs (/api) passent par le proxy Vite → backend local.
 */
export const resolveApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return '';
  }
  const url = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return url;
};
