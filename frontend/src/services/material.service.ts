import { api } from './api';

export type MaterialCategory = 'Matériaux' | 'Carburants' | 'EPI' | 'Outillage' | 'Autre';
export type MaterialStatus = 'empty' | 'alert' | 'ok';

export interface StockMaterialRow {
  id: number;
  name: string;
  category: MaterialCategory;
  unit: string;
  alertThreshold: number;
  projectId: number;
  currentStock: number;
  status: MaterialStatus;
  levelPercent: number;
}

export interface StockInventoryStats {
  alert: number;
  ok: number;
  movementsThisMonth: number;
  totalMaterials: number;
}

export interface StockInventoryResponse {
  items: StockMaterialRow[];
  stats: StockInventoryStats;
}

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export const materialService = {
  getInventory: async (projectId: number): Promise<StockInventoryResponse> => {
    const res = await api.get<any>(`/api/materials/inventory?projectId=${projectId}`);
    return unwrap<StockInventoryResponse>(res);
  },

  create: async (payload: {
    name: string;
    category: MaterialCategory;
    unit: string;
    alertThreshold: number;
    projectId: number;
  }) => {
    const res = await api.post<any>('/api/materials', payload);
    return unwrap<StockMaterialRow>(res);
  },

  update: async (
    id: number,
    payload: Partial<{ name: string; category: MaterialCategory; unit: string; alertThreshold: number }>,
  ) => {
    const res = await api.put<any>(`/api/materials/${id}`, payload);
    return unwrap<StockMaterialRow>(res);
  },

  remove: async (id: number) => {
    await api.delete(`/api/materials/${id}`);
  },
};
