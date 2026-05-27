import { api } from './api';

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export interface RecipeLine {
  id?: number;
  materialId: number;
  quantityPerBatch: number;
  unit?: string;
  sortOrder?: number;
  material?: { id: number; name: string; unit: string };
}

export interface ProductionRecipe {
  id: number;
  name: string;
  productType: string;
  productLabel?: string;
  expectedOutput: number;
  outputUnit: string;
  estimatedCost: number;
  finishedMaterialId?: number | null;
  isActive: boolean;
  lines?: RecipeLine[];
  finishedMaterial?: { id: number; name: string; unit: string };
}

export interface ProductionEntryRow {
  id: number;
  productType: string;
  productLabel?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  productionDate: string;
  status: 'brouillon' | 'validee' | 'annulee' | 'legacy';
  recipeId?: number;
  lossQty?: number;
  operatorName?: string;
  machineLabel?: string;
  materialCost?: number;
  laborCost?: number;
  fuelCost?: number;
  maintenanceCost?: number;
  totalCost?: number;
  yieldRatio?: number;
  recipe?: { id: number; name: string };
  consumptions?: {
    material?: { name: string; unit: string };
    quantityActual: number;
    quantityTheoretical: number;
    totalValue: number;
  }[];
}

export const productionService = {
  getDashboard: async () => unwrap(await api.get('/api/production/dashboard')),
  getMaterials: async (projectId = 0) =>
    unwrap<any[]>(await api.get(`/api/production/materials?projectId=${projectId}`)),

  getRecipes: async (params?: { active?: boolean; productType?: string }) => {
    const q = new URLSearchParams();
    if (params?.active) q.set('active', '1');
    if (params?.productType) q.set('productType', params.productType);
    return unwrap<ProductionRecipe[]>(await api.get(`/api/production/recipes?${q}`));
  },
  getRecipe: async (id: number) => unwrap<ProductionRecipe>(await api.get(`/api/production/recipes/${id}`)),
  createRecipe: async (payload: any) => unwrap(await api.post('/api/production/recipes', payload)),
  updateRecipe: async (id: number, payload: any) => unwrap(await api.put(`/api/production/recipes/${id}`, payload)),
  deleteRecipe: async (id: number) => { await api.delete(`/api/production/recipes/${id}`); },
  previewRecipe: async (id: number, quantityProduced: number, overrides?: any[]) =>
    unwrap(await api.post(`/api/production/recipes/${id}/preview`, { quantityProduced, overrides })),

  getEntries: async (filters?: { productType?: string; from?: string; to?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.productType) params.set('productType', filters.productType);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.status) params.set('status', filters.status);
    return unwrap<ProductionEntryRow[]>(
      await api.get(`/api/production/entries${params.toString() ? `?${params}` : ''}`),
    );
  },
  createEntry: async (payload: any) => unwrap(await api.post('/api/production/entries', payload)),
  validateEntry: async (id: number) => unwrap(await api.post(`/api/production/entries/${id}/validate`, {})),
  deleteEntry: async (id: number) => { await api.delete(`/api/production/entries/${id}`); },

  getSales: async (filters?: { productType?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.productType) params.set('productType', filters.productType);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return unwrap<any[]>(await api.get(`/api/production/sales${params.toString() ? `?${params}` : ''}`));
  },
  createSale: async (payload: any) => unwrap(await api.post('/api/production/sales', payload)),
  deleteSale: async (id: number) => { await api.delete(`/api/production/sales/${id}`); },
};
