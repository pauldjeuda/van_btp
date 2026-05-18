import { api, tokenStore } from './api';

const getBaseUrl = () => import.meta.env.VITE_API_URL || '';

export const documentService = {
  getAll: async (filters?: { projectId?: number; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.type) params.set('type', filters.type);
    const res = await api.get<{ data: any[] }>(`/api/documents${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },

  upload: async (formData: FormData) => {
    const res = await api.upload<{ data: any }>('/api/documents', formData);
    return res.data;
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
};
