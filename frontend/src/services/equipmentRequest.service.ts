import { api } from './api';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const LOG = '[VAN LOGISTIQUE FRONT]';

export type EquipmentRequestStatus =
  | 'En attente'
  | 'Approuvée'
  | 'Rejetée'
  | 'Annulée'
  | 'Erreur envoi';

/** Réponse VAN Logistique (approved / rejected) */
export interface LogisticsDetails {
  reference?: string;
  decision?: string;
  status?: string;
  description?: string;
  desiredStartDate?: string;
  startDate?: string;
  totalAmount?: number;
  driverName?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleType?: string;
  rejectionReason?: string;
  receivedAt?: string;
}

export interface EquipmentRequest {
  id: number;
  ref: string;
  equipmentRequested: string;
  needDescription: string;
  desiredDate: string;
  status: EquipmentRequestStatus;
  projectId: number;
  requestedBy?: number;
  requesterMatricule?: string;
  requesterName?: string;
  externalId?: string | null;
  rejectionReason?: string | null;
  respondedAt?: string | null;
  respondedBy?: string | null;
  syncError?: string | null;
  logisticsDetails?: LogisticsDetails | null;
  createdAt: string;
  project?: { id: number; name: string; code?: string };
}

export interface CreateEquipmentRequestPayload {
  needDescription: string;
  desiredDate: string;
  projectId: number;
}

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

/** logisticsDetails peut arriver en chaîne JSON depuis MySQL */
export const parseLogisticsDetails = (value: unknown): LogisticsDetails | null => {
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as LogisticsDetails;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as LogisticsDetails) : null;
    } catch {
      return null;
    }
  }
  return null;
};

const normalizeRequest = (row: EquipmentRequest): EquipmentRequest => ({
  ...row,
  logisticsDetails: parseLogisticsDetails(row.logisticsDetails),
});

export const equipmentRequestService = {
  getAll: async (filters?: {
    status?: EquipmentRequestStatus;
    projectId?: number;
    mine?: boolean;
  }): Promise<EquipmentRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.mine) params.set('mine', 'true');
    const q = params.toString();
    const res = await api.get<any>(`/api/equipment-requests${q ? `?${q}` : ''}`);
    const data = unwrap<EquipmentRequest[]>(res);
    return Array.isArray(data) ? data.map(normalizeRequest) : [];
  },

  create: async (payload: CreateEquipmentRequestPayload): Promise<EquipmentRequest> => {
    const url = `${resolveApiBaseUrl()}/api/equipment-requests`;
    console.log(`${LOG} POST create → BTP backend`, { url, payload });
    try {
      const res = await api.post<any>('/api/equipment-requests', payload);
      const entity = normalizeRequest(unwrap<EquipmentRequest>(res));
      console.log(`${LOG} create réponse OK`, {
        ref: entity.ref,
        status: entity.status,
        syncError: entity.syncError,
        externalId: entity.externalId,
      });
      return entity;
    } catch (err: unknown) {
      const e = err as Error & { cause?: unknown };
      console.error(`${LOG} create échec (fetch BTP ou HTTP)`, {
        message: e?.message,
        name: e?.name,
        cause: e?.cause,
        url,
      });
      throw err;
    }
  },

  cancel: async (id: number): Promise<EquipmentRequest> => {
    const res = await api.patch<any>(`/api/equipment-requests/${id}/cancel`);
    return normalizeRequest(unwrap<EquipmentRequest>(res));
  },

  retry: async (id: number): Promise<EquipmentRequest> => {
    const path = `/api/equipment-requests/${id}/retry`;
    console.log(`${LOG} POST retry → BTP backend`, { path, id });
    try {
      const res = await api.post<any>(path);
      const entity = normalizeRequest(unwrap<EquipmentRequest>(res));
      console.log(`${LOG} retry réponse OK`, {
        ref: entity.ref,
        status: entity.status,
        syncError: entity.syncError,
      });
      return entity;
    } catch (err: unknown) {
      const e = err as Error;
      console.error(`${LOG} retry échec`, { message: e?.message, path, id });
      throw err;
    }
  },
};
