import { api, tokenStore } from './api';

import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const getBaseUrl = () => resolveApiBaseUrl();

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export type ProjectDocumentType =
  | 'Plan'
  | 'Rapport'
  | 'Contrat'
  | 'Facture'
  | 'Permis'
  | 'Normes'
  | 'Autre';

export interface ProjectFileDocument {
  id: number;
  name: string;
  type: ProjectDocumentType;
  filePath: string;
  fileSize?: string;
  mimeType?: string;
  projectId?: number;
  createdAt: string;
}

export const documentService = {
  getAll: async (filters?: { projectId?: number; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.type) params.set('type', filters.type);
    const res = await api.get<any>(`/api/documents${params.toString() ? `?${params}` : ''}`);
    const data = unwrap<ProjectFileDocument[]>(res);
    return Array.isArray(data) ? data : [];
  },

  upload: async (formData: FormData) => {
    const res = await api.upload<any>('/api/documents', formData);
    return unwrap<ProjectFileDocument>(res);
  },

  remove: async (id: number) => {
    await api.delete(`/api/documents/${id}`);
  },

  /**
   * Téléchargement via fetch (token en mémoire, pas en localStorage)
   * Le token est injecté dans l'en-tête Authorization par api.get
   */
  download: async (id: number, filename: string): Promise<void> => {
    const token = tokenStore.get();
    const base = getBaseUrl();
    const response = await fetch(`${base}/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Téléchargement échoué');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** @deprecated Utiliser download() à la place */
  downloadUrl: (id: number): string => {
    const token = tokenStore.get();
    const base = getBaseUrl();
    return `${base}/api/documents/${id}/download${token ? `?token=${token}` : ''}`;
  },

  /** Charge le fichier pour l’aperçu (visionneuse avec auth) */
  fetchPreviewBlob: async (id: number): Promise<Blob> => {
    const token = tokenStore.get();
    const base = getBaseUrl();
    const response = await fetch(`${base}/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Aperçu indisponible');
    return response.blob();
  },

  /** URL publique des fichiers statiques (images déjà servies sans auth) */
  resolveStaticUrl: (filePath?: string | null): string => {
    if (!filePath) return '';
    const base = getBaseUrl();
    if (filePath.startsWith('http')) return filePath;
    const path = filePath.startsWith('/') ? filePath : `/uploads/documents/${filePath}`;
    return `${base}${path}`;
  },
};
