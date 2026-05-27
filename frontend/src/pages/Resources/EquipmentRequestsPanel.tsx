import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ClipboardList, Inbox } from 'lucide-react';
import { Card, Input, cn } from '../../components/ui';
import { EquipmentRequestCard } from './EquipmentRequestCard';
import type { EquipmentRequest, EquipmentRequestStatus } from '../../services/equipmentRequest.service';

type StatusFilter = 'all' | EquipmentRequestStatus;

type Props = {
  requests: EquipmentRequest[];
  isLoading: boolean;
  isLive?: boolean;
  showCancel: boolean;
  getProjectLabel: (req: EquipmentRequest) => string;
  onCancel: (req: EquipmentRequest) => void;
  onRetry: (req: EquipmentRequest) => void;
};

const FILTER_STATUSES: EquipmentRequestStatus[] = [
  'En attente',
  'Approuvée',
  'Rejetée',
  'Erreur envoi',
  'Annulée',
];

export const EquipmentRequestsPanel = ({
  requests,
  isLoading,
  isLive,
  showCancel,
  getProjectLabel,
  onCancel,
  onRetry,
}: Props) => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    FILTER_STATUSES.forEach((s) => {
      c[s] = requests.filter((r) => r.status === s).length;
    });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => {
        if (!q) return true;
        const d = typeof r.logisticsDetails === 'string' ? r.logisticsDetails : '';
        return (
          r.needDescription.toLowerCase().includes(q) ||
          r.ref.toLowerCase().includes(q) ||
          (r.externalId || '').toLowerCase().includes(q) ||
          String(d).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, statusFilter, search]);

  const statusFilterKey = (s: StatusFilter) =>
    s === 'all' ? 'all' : {
      'En attente': 'pending',
      Approuvée: 'approved',
      Rejetée: 'rejected',
      Annulée: 'cancelled',
      'Erreur envoi': 'sync_error',
    }[s];

  return (
    <Card className="p-0 border-none shadow-lg shadow-slate-200/50 overflow-hidden">
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg shadow-blue-900/15 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight">
              {t('resources.equipment.my_requests_title')}
            </h4>
            <p className="text-sm text-slate-500 font-medium mt-0.5 max-w-xl">
              {t('resources.equipment.my_requests_hint')}
            </p>
            {isLive && (
              <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('resources.equipment.live_sync')}
              </p>
            )}
          </div>
        </div>

        {requests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {(['all', ...FILTER_STATUSES] as StatusFilter[]).map((s) => {
              const count = counts[s] ?? 0;
              if (s !== 'all' && count === 0) return null;
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all',
                    active
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                  )}
                >
                  {t(`resources.equipment.filters.${statusFilterKey(s)}`)}
                  <span
                    className={cn(
                      'ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px]',
                      active ? 'bg-white/20' : 'bg-slate-100',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {requests.length > 3 && (
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('resources.equipment.search_placeholder')}
              className="h-10 pl-10 text-sm"
            />
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-base font-black text-slate-700">{t('resources.equipment.no_requests')}</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{t('resources.equipment.empty_hint')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 font-medium text-center py-8">
            {t('resources.equipment.no_filter_results')}
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => (
              <EquipmentRequestCard
                key={req.id}
                req={req}
                projectLabel={getProjectLabel(req)}
                showCancel={showCancel}
                onCancel={() => onCancel(req)}
                onRetry={() => onRetry(req)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
