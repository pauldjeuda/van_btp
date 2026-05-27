import { resolveApiBaseUrl } from './apiBaseUrl';

const defaultApiBase = () =>
  resolveApiBaseUrl() || import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Normalise le champ images incident (tableau, JSON string, imageUrl seul). */
export function parseIncidentImagePaths(
  images: unknown,
  imageUrl?: string | null,
): string[] {
  let list: unknown = images;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.startsWith('/') || list.startsWith('http') ? [list] : [];
    }
  }
  if (!Array.isArray(list)) list = [];
  const paths = (list as unknown[])
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  if (!paths.length && imageUrl) return [imageUrl];
  return paths;
}

export function resolveIncidentImageUrls(
  paths: string[],
  apiBase = defaultApiBase(),
): string[] {
  return paths.map((p) => (p.startsWith('http') ? p : `${apiBase}${p}`));
}

export function getIncidentImagesFromRecord(
  record: { images?: unknown; image?: string; imageUrl?: string | null },
  apiBase?: string,
): string[] {
  const paths = parseIncidentImagePaths(
    record.images,
    record.imageUrl || record.image,
  );
  return resolveIncidentImageUrls(paths, apiBase);
}
