import { api } from './api';

export type ApprovalType = 'amendment' | 'purchase' | 'expense' | 'quote';

export interface PendingApprovalItem {
  id: number;
  type: ApprovalType;
  entityType: string;
  title: string;
  description?: string;
  projectId: number;
  projectName: string;
  amount?: number | null;
  createdAt: string;
  navigateTo: string;
}

export interface PendingApprovalsResponse {
  items: PendingApprovalItem[];
  counts: {
    amendment: number;
    purchase: number;
    expense: number;
    quote: number;
    total: number;
  };
}

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export const approvalService = {
  getPending: async (): Promise<PendingApprovalsResponse> => {
    const res = await api.get<any>('/api/approvals/pending');
    return unwrap<PendingApprovalsResponse>(res);
  },

  decide: async (type: ApprovalType, id: number, decision: 'approve' | 'reject') => {
    const res = await api.post<any>(`/api/approvals/${type}/${id}/decide`, { decision });
    return unwrap<{ pending: PendingApprovalsResponse; entity?: unknown }>(res);
  },
};
