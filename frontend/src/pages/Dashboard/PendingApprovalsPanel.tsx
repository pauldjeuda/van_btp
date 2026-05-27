import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, XCircle, FileText, ShoppingCart, Wallet,
  ChevronRight, Inbox, Loader2,
} from 'lucide-react';
import { Button, cn } from '../../components/ui';
import {
  approvalService,
  PendingApprovalItem,
  PendingApprovalsResponse,
  ApprovalType,
} from '../../services/approval.service';
import { useNotification } from '../../context/NotificationContext';

function formatCFA(n?: number | null) {
  if (n == null || Number.isNaN(n)) return null;
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

interface Props {
  initialData?: PendingApprovalsResponse | null;
  onUpdated?: (data: PendingApprovalsResponse) => void;
  compact?: boolean;
}

export function PendingApprovalsPanel({ initialData, onUpdated, compact }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [data, setData] = useState<PendingApprovalsResponse | null>(initialData || null);
  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  const typeMeta = (type: ApprovalType) => {
    const icons = { amendment: FileText, purchase: ShoppingCart, expense: Wallet, quote: FileText };
    const colors = {
      amendment: 'bg-violet-100 text-violet-700',
      purchase: 'bg-blue-100 text-blue-700',
      expense: 'bg-amber-100 text-amber-700',
      quote: 'bg-teal-100 text-teal-700',
    };
    return {
      label: t(`approvals.types.${type}`),
      icon: icons[type],
      color: colors[type],
    };
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await approvalService.getPending();
      setData(res);
      onUpdatedRef.current?.(res);
    } catch {
      const empty = { items: [], counts: { amendment: 0, purchase: 0, expense: 0, quote: 0, total: 0 } };
      setData(empty);
      onUpdatedRef.current?.(empty);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => load(true);
    window.addEventListener('van_btp:approvals_updated', onRefresh);
    return () => window.removeEventListener('van_btp:approvals_updated', onRefresh);
  }, [load]);

  const handleDecide = async (item: PendingApprovalItem, decision: 'approve' | 'reject') => {
    const key = `${item.type}-${item.id}`;
    setActingKey(key);
    try {
      const res = await approvalService.decide(item.type, item.id, decision);
      if (res.pending) {
        setData(res.pending);
        onUpdated?.(res.pending);
      } else await load();
      notify(
        decision === 'approve'
          ? t('approvals.approved', { title: item.title })
          : t('approvals.rejected', { title: item.title }),
        decision === 'approve' ? 'success' : 'info'
      );
      window.dispatchEvent(new CustomEvent('van_btp:approvals_updated'));
    } catch (err: any) {
      notify(err?.message || t('approvals.error'), 'error');
    } finally {
      setActingKey(null);
    }
  };

  const total = data?.counts.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className={cn('border border-slate-200 rounded-2xl overflow-hidden bg-white', compact ? 'shadow-lg' : 'shadow-xl')}>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">
          <Inbox className="w-5 h-5" />
          {t('approvals.title')}
          {total > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {!isExpanded && total > 0 && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              {t('approvals.counts_summary', {
                amendment: data?.counts.amendment ?? 0,
                purchase: data?.counts.purchase ?? 0,
                expense: data?.counts.expense ?? 0,
                quote: data?.counts.quote ?? 0,
              })}
            </span>
          )}
          <span className={`text-[var(--color-primary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3 flex justify-end border-b border-slate-50">
            <Button variant="outline" size="sm" onClick={load} className="font-bold" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('approvals.refresh')}
            </Button>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className={cn('divide-y divide-slate-100 max-h-[420px] overflow-y-auto', compact && 'max-h-[300px]')}>
              {total === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-bold text-slate-600">{t('approvals.empty')}</p>
                </div>
              ) : (
                items.map((item) => {
                  const meta = typeMeta(item.type);
                  const Icon = meta.icon;
                  const busy = actingKey === `${item.type}-${item.id}`;
                  return (
                    <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-slate-50/80">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded', meta.color)}>
                              {meta.label}
                            </span>
                            <p className="font-black text-slate-900 text-sm mt-1 truncate">{item.title}</p>
                            <p className="text-xs text-slate-500">{item.projectName}</p>
                            {item.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                            )}
                            {formatCFA(item.amount) && (
                              <p className="text-sm font-black text-[var(--color-primary)] mt-1">{formatCFA(item.amount)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => navigate(item.navigateTo)}>
                            {t('approvals.view')} <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => handleDecide(item, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                            {t('approvals.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => handleDecide(item, 'reject')}
                            className="border-red-200 text-red-700 text-xs font-bold"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> {t('approvals.reject')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
