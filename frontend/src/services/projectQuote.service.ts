import { api } from './api';

export type QuoteLine = {
  designation: string;
  unitPrice: number;
  quantity: number;
  total: number;
};

export type QuoteStatus = 'En attente' | 'Validé' | 'Rejeté';

export interface ProjectQuote {
  id: number;
  projectId: number;
  title: string;
  status: QuoteStatus;
  lines: QuoteLine[];
  totalAmount: number;
  createdBy?: number;
  createdByRole?: string;
  reviewedBy?: number;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export function parseQuoteLines(lines: unknown): QuoteLine[] {
  if (lines == null) return [];
  let raw: unknown = lines;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line: any) => {
      const designation = String(line?.designation || '').trim();
      if (!designation) return null;
      const unitPrice = Number(line?.unitPrice ?? line?.price ?? 0);
      const qtyRaw = line?.quantity;
      const quantity = qtyRaw != null && qtyRaw !== '' ? Number(qtyRaw) : 1;
      const qty = quantity > 0 ? quantity : 1;
      const total = Number(line?.total) || Math.round(unitPrice * qty * 100) / 100;
      return { designation, unitPrice, quantity: qty, total };
    })
    .filter(Boolean) as QuoteLine[];
}

export function normalizeQuote(raw: any): ProjectQuote {
  const lines = parseQuoteLines(raw?.lines);
  return {
    id: Number(raw.id),
    projectId: Number(raw.projectId),
    title: raw.title || 'Devis chantier',
    status: raw.status || 'En attente',
    lines,
    totalAmount: Number(raw.totalAmount ?? 0) || lines.reduce((s, l) => s + l.total, 0),
    createdBy: raw.createdBy != null ? Number(raw.createdBy) : undefined,
    createdByRole: raw.createdByRole,
    reviewedBy: raw.reviewedBy != null ? Number(raw.reviewedBy) : undefined,
    rejectionReason: raw.rejectionReason ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const projectQuoteService = {
  getAll: async (projectId: number) => {
    const res = await api.get<any>(`/api/projects/${projectId}/quotes`);
    const rows = unwrap<ProjectQuote[]>(res);
    return (Array.isArray(rows) ? rows : []).map(normalizeQuote);
  },
  getOne: async (projectId: number, quoteId: number) => {
    const res = await api.get<any>(`/api/projects/${projectId}/quotes/${quoteId}`);
    return normalizeQuote(unwrap(res));
  },
  create: async (projectId: number, payload: { title?: string; lines: Partial<QuoteLine>[] }) => {
    const res = await api.post<any>(`/api/projects/${projectId}/quotes`, payload);
    return normalizeQuote(unwrap(res));
  },
  update: async (projectId: number, quoteId: number, payload: { title?: string; lines: Partial<QuoteLine>[] }) => {
    const res = await api.put<any>(`/api/projects/${projectId}/quotes/${quoteId}`, payload);
    return normalizeQuote(unwrap(res));
  },
  approve: async (projectId: number, quoteId: number, payload?: { title?: string; lines?: Partial<QuoteLine>[] }) => {
    const res = await api.patch<any>(`/api/projects/${projectId}/quotes/${quoteId}/approve`, payload || {});
    return normalizeQuote(unwrap(res));
  },
  reject: async (projectId: number, quoteId: number, reason?: string) => {
    const res = await api.patch<any>(`/api/projects/${projectId}/quotes/${quoteId}/reject`, { reason });
    return normalizeQuote(unwrap(res));
  },
  remove: async (projectId: number, quoteId: number) => {
    await api.delete(`/api/projects/${projectId}/quotes/${quoteId}`);
  },
};

export function calcLineTotal(unitPrice: number, quantity?: number | string) {
  const qty = quantity != null && quantity !== '' ? Number(quantity) : 1;
  const q = qty > 0 ? qty : 1;
  return Math.round(Number(unitPrice || 0) * q * 100) / 100;
}

export function calcGrandTotal(lines: { unitPrice?: number | string; quantity?: number | string }[]) {
  return lines.reduce((sum, l) => sum + calcLineTotal(Number(l.unitPrice || 0), l.quantity), 0);
}
