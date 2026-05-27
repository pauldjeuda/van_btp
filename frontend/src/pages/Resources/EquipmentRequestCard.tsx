import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  Calendar,
  MapPin,
  User,
  Truck,
  Banknote,
  Hash,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { Button, cn } from '../../components/ui';
import {
  parseLogisticsDetails,
  type EquipmentRequest,
  type EquipmentRequestStatus,
} from '../../services/equipmentRequest.service';

type Props = {
  req: EquipmentRequest;
  projectLabel: string;
  onCancel?: () => void;
  onRetry?: () => void;
  showCancel?: boolean;
};

const STATUS_UI: Record<
  EquipmentRequestStatus,
  { icon: React.ElementType; border: string; bg: string; badge: string; dot: string }
> = {
  'En attente': {
    icon: Clock,
    border: 'border-l-amber-400',
    bg: 'bg-amber-50/40',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-400',
  },
  Approuvée: {
    icon: CheckCircle2,
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/30',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Rejetée: {
    icon: XCircle,
    border: 'border-l-red-500',
    bg: 'bg-red-50/30',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  Annulée: {
    icon: Ban,
    border: 'border-l-slate-300',
    bg: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  'Erreur envoi': {
    icon: AlertTriangle,
    border: 'border-l-orange-500',
    bg: 'bg-orange-50/40',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const InfoChip = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-100 text-xs font-bold text-slate-600">
    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    {children}
  </span>
);

const DetailCell = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white border border-slate-100">
      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--color-primary)]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-900 break-words">{value}</p>
      </div>
    </div>
  );
};

export const EquipmentRequestCard = ({ req, projectLabel, onCancel, onRetry, showCancel }: Props) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const d = parseLogisticsDetails(req.logisticsDetails);
  const ui = STATUS_UI[req.status];
  const StatusIcon = ui.icon;
  const canExpand = req.status === 'Approuvée' || req.status === 'Rejetée';
  const hasDetailFields = Boolean(
    d && Object.keys(d).some((k) => k !== 'receivedAt' && d[k as keyof typeof d] != null && d[k as keyof typeof d] !== ''),
  );

  const statusLabel = t(`resources.equipment.request_status.${{
    'En attente': 'pending',
    Approuvée: 'approved',
    Rejetée: 'rejected',
    Annulée: 'cancelled',
    'Erreur envoi': 'sync_error',
  }[req.status]}`);

  const formatAmount = (n?: number) =>
    n != null ? `${Number(n).toLocaleString('fr-FR')} FCFA` : undefined;

  const logisticsRef = d?.reference || req.externalId;

  return (
    <article
      className={cn(
        'rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-shadow hover:shadow-md border-l-4',
        ui.border,
        ui.bg,
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border',
              ui.badge,
            )}
          >
            <StatusIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border',
                  ui.badge,
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', ui.dot)} />
                {statusLabel}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{req.ref}</span>
            </div>

            <p className="text-base font-black text-slate-900 leading-snug">{req.needDescription}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              <InfoChip icon={MapPin}>{projectLabel}</InfoChip>
              <InfoChip icon={Calendar}>{formatDate(req.desiredDate)}</InfoChip>
              {logisticsRef && <InfoChip icon={Hash}>{logisticsRef}</InfoChip>}
            </div>

            {req.status === 'En attente' && (
              <p className="mt-3 text-xs text-amber-700 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {t('resources.equipment.pending_waiting')}
              </p>
            )}

            {req.status === 'Approuvée' && (d?.vehiclePlate || d?.driverName) && !expanded && (
              <div className="mt-3 flex flex-wrap gap-2">
                {d.vehiclePlate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black">
                    <Truck className="w-3.5 h-3.5" />
                    {d.vehiclePlate}
                  </span>
                )}
                {d.driverName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <User className="w-3.5 h-3.5" />
                    {d.driverName}
                  </span>
                )}
                {d.totalAmount != null && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold">
                    <Banknote className="w-3.5 h-3.5" />
                    {formatAmount(d.totalAmount)}
                  </span>
                )}
              </div>
            )}

            {req.status === 'Rejetée' && (req.rejectionReason || d?.rejectionReason) && !expanded && (
              <p className="mt-3 text-sm text-red-700 font-medium bg-red-50/80 border border-red-100 rounded-xl px-3 py-2">
                <span className="font-black text-[10px] uppercase block text-red-500 mb-0.5">
                  {t('resources.equipment.rejection_reason')}
                </span>
                {d?.rejectionReason || req.rejectionReason}
              </p>
            )}

            {req.status === 'Erreur envoi' && req.syncError && (
              <p className="mt-3 text-sm text-orange-700 font-medium bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                {req.syncError}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100/80">
          {canExpand && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-bold h-9"
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronDown
                className={cn('w-4 h-4 mr-1.5 transition-transform', expanded && 'rotate-180')}
              />
              {expanded
                ? t('resources.equipment.hide_details')
                : t('resources.equipment.show_details')}
            </Button>
          )}
          {req.status === 'En attente' && showCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 font-bold h-9"
              onClick={onCancel}
            >
              {t('resources.equipment.cancel_request')}
            </Button>
          )}
          {req.status === 'Erreur envoi' && onRetry && (
            <Button variant="outline" size="sm" className="font-bold h-9" onClick={onRetry}>
              {t('resources.equipment.retry_send')}
            </Button>
          )}
          {req.respondedAt && (
            <span className="ml-auto text-[10px] font-bold text-slate-400 self-center">
              {t('resources.equipment.responded_on', { date: formatDate(req.respondedAt) })}
            </span>
          )}
        </div>
      </div>

      {expanded && canExpand && (
        <div className="px-4 sm:px-5 pb-5 pt-0">
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
              {req.status === 'Approuvée'
                ? t('resources.equipment.approval_details')
                : t('resources.equipment.rejection_details')}
            </h5>
            {d && hasDetailFields ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailCell
                  icon={Hash}
                  label={t('resources.equipment.fields.description')}
                  value={d.description || req.needDescription}
                />
                <DetailCell
                  icon={Calendar}
                  label={t('resources.equipment.fields.desired_start')}
                  value={formatDate(d.desiredStartDate || req.desiredDate)}
                />
                {req.status === 'Approuvée' && (
                  <>
                    <DetailCell
                      icon={Calendar}
                      label={t('resources.equipment.fields.start_date')}
                      value={formatDate(d.startDate)}
                    />
                    <DetailCell
                      icon={Banknote}
                      label={t('resources.equipment.fields.total_amount')}
                      value={formatAmount(d.totalAmount)}
                    />
                    <DetailCell
                      icon={User}
                      label={t('resources.equipment.fields.driver')}
                      value={d.driverName}
                    />
                    <DetailCell
                      icon={Truck}
                      label={t('resources.equipment.fields.vehicle_plate')}
                      value={d.vehiclePlate}
                    />
                    <DetailCell
                      icon={Truck}
                      label={t('resources.equipment.fields.vehicle_brand')}
                      value={d.vehicleBrand}
                    />
                    <DetailCell
                      icon={Truck}
                      label={t('resources.equipment.fields.vehicle_model')}
                      value={d.vehicleModel}
                    />
                    <DetailCell
                      icon={Truck}
                      label={t('resources.equipment.fields.vehicle_type')}
                      value={d.vehicleType}
                    />
                  </>
                )}
                {req.status === 'Rejetée' && (
                  <DetailCell
                    icon={XCircle}
                    label={t('resources.equipment.rejection_reason')}
                    value={d.rejectionReason || req.rejectionReason}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">{t('resources.equipment.no_logistics_details')}</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
