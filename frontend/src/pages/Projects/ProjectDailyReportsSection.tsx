import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Calendar, Users, ChevronRight, ImagePlus, X, Pencil, ClipboardList,
} from 'lucide-react';
import { Button, Input, Textarea, Modal, cn } from '../../components/ui';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { ReportPhotos } from '../../components/project/ReportPhotos';
import { formatDateShort } from '../../lib/formatters';

export type ProjectDailyReportRow = {
  id: number;
  reportDate?: string;
  date?: string;
  projectId: number;
  reporter?: string;
  reporterId?: number;
  status?: string;
  workDone?: string;
  issuesEncountered?: string;
  nextDayPlan?: string;
  workerCount?: number;
  images?: string[];
};

const emptyForm = {
  reportDate: '',
  workerCount: '',
  workDone: '',
  issuesEncountered: '',
  nextDayPlan: '',
};

function statusClass(status?: string) {
  if (status === 'Validé') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Brouillon') return 'bg-slate-100 text-slate-600';
  return 'bg-amber-100 text-amber-800';
}

interface Props {
  projectId: number;
  reports: ProjectDailyReportRow[];
  role: string;
  userId?: number;
}

export const ProjectDailyReportsSection: React.FC<Props> = ({
  projectId,
  reports,
  role,
  userId,
}) => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const { addDailyReport, updateDailyReport } = useData();

  const canCreate = role === 'Chef_chantier';
  const today = new Date().toISOString().split('T')[0];

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => {
      const da = a.reportDate || a.date || '';
      const db = b.reportDate || b.date || '';
      return db.localeCompare(da);
    }),
    [reports],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [detailReport, setDetailReport] = useState<ProjectDailyReportRow | null>(null);
  const [editing, setEditing] = useState<ProjectDailyReportRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, reportDate: today });
    setImages([]);
    setFormOpen(true);
  };

  const openEdit = (report: ProjectDailyReportRow) => {
    setEditing(report);
    setForm({
      reportDate: report.reportDate || report.date || today,
      workerCount: String(report.workerCount ?? ''),
      workDone: report.workDone || '',
      issuesEncountered: report.issuesEncountered || '',
      nextDayPlan: report.nextDayPlan || '',
    });
    setImages(Array.isArray(report.images) ? [...report.images] : []);
    setFormOpen(true);
    setDetailReport(null);
  };

  const canEditReport = (report: ProjectDailyReportRow) => {
    if (!canCreate) return false;
    if (report.reporterId != null && userId != null) {
      return Number(report.reporterId) === Number(userId);
    }
    return true;
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 10) {
      notify(t('projectDetail.dailyReports.photos_max'), 'error');
      return;
    }
    const allowed = files.slice(0, 10 - images.length);
    const readers = allowed.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }),
    );
    Promise.all(readers).then((added) => setImages((prev) => [...prev, ...added].slice(0, 10)));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reportDate) {
      notify(t('projectDetail.dailyReports.date_required'), 'error');
      return;
    }
    if (!form.workDone.trim()) {
      notify(t('projectDetail.dailyReports.work_required'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        projectId,
        reportDate: form.reportDate,
        workerCount: Number(form.workerCount || 0),
        workDone: form.workDone.trim(),
        issuesEncountered: form.issuesEncountered.trim(),
        nextDayPlan: form.nextDayPlan.trim(),
        images,
      };
      if (editing?.id) {
        await updateDailyReport(editing.id, payload);
        notify(t('projectDetail.dailyReports.updated'), 'success');
      } else {
        await addDailyReport(payload);
        notify(t('projectDetail.dailyReports.created'), 'success');
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (sortedReports.length === 0 && !canCreate) {
    return (
      <p className="text-sm text-slate-400 py-2">{t('projectDetail.dailyReports.empty')}</p>
    );
  }

  return (
    <>
      {canCreate && (
        <div className="flex justify-end mb-3 -mt-1">
          <Button size="sm" className="text-xs font-bold" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t('projectDetail.dailyReports.new')}
          </Button>
        </div>
      )}

      {sortedReports.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/80">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">{t('projectDetail.dailyReports.empty_chef')}</p>
          {canCreate && (
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t('projectDetail.dailyReports.new')}
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedReports.map((report) => {
            const dateLabel = formatDateShort(report.reportDate || report.date || '');
            const imgCount = Array.isArray(report.images) ? report.images.length : 0;
            return (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => setDetailReport(report)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-[var(--color-primary)]/30 hover:bg-white hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <Calendar className="w-3 h-3" />
                          {dateLabel}
                        </span>
                        <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md', statusClass(report.status))}>
                          {report.status || 'Soumis'}
                        </span>
                        {imgCount > 0 && (
                          <span className="text-[9px] font-bold text-slate-400">
                            {t('common.photos_count', { count: imgCount })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                        {report.workDone || '—'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                        {report.reporter}
                        {report.workerCount != null && report.workerCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-2">
                            <Users className="w-3 h-3" />
                            {report.workerCount}
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--color-primary)] shrink-0 mt-1" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Détail — consultation DT / chef */}
      <Modal
        isOpen={!!detailReport}
        onClose={() => setDetailReport(null)}
        title={t('projectDetail.dailyReports.detail_title', {
          date: detailReport ? formatDateShort(detailReport.reportDate || detailReport.date || '') : '',
        })}
        size="lg"
      >
        {detailReport && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg', statusClass(detailReport.status))}>
                {detailReport.status || 'Soumis'}
              </span>
              {detailReport.reporter && (
                <span className="text-xs font-bold text-slate-500">{detailReport.reporter}</span>
              )}
              {detailReport.workerCount != null && detailReport.workerCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                  <Users className="w-3.5 h-3.5" />
                  {t('projectDetail.dailyReports.workers', { count: detailReport.workerCount })}
                </span>
              )}
            </div>

            <DetailBlock label={t('projectDetail.dailyReports.work_done')} text={detailReport.workDone} />
            {detailReport.issuesEncountered && (
              <DetailBlock label={t('projectDetail.dailyReports.issues')} text={detailReport.issuesEncountered} />
            )}
            {detailReport.nextDayPlan && (
              <DetailBlock label={t('projectDetail.dailyReports.next_day')} text={detailReport.nextDayPlan} />
            )}

            {detailReport.images && detailReport.images.length > 0 && (
              <ReportPhotos images={detailReport.images} reportId={detailReport.id} />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              {canEditReport(detailReport) && (
                <Button
                  variant="outline"
                  onClick={() => openEdit(detailReport)}
                  className="font-bold"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {t('common.edit')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailReport(null)} className="font-bold">
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Création / édition — chef */}
      <Modal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? t('projectDetail.dailyReports.edit') : t('projectDetail.dailyReports.new')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('projectDetail.dailyReports.date')}
              type="date"
              required
              value={form.reportDate}
              max={today}
              onChange={(e) => setForm((f) => ({ ...f, reportDate: e.target.value }))}
            />
            <Input
              label={t('projectDetail.dailyReports.worker_count')}
              type="number"
              min={0}
              value={form.workerCount}
              onChange={(e) => setForm((f) => ({ ...f, workerCount: e.target.value }))}
            />
          </div>
          <Textarea
            label={t('projectDetail.dailyReports.work_done')}
            required
            rows={4}
            value={form.workDone}
            onChange={(e) => setForm((f) => ({ ...f, workDone: e.target.value }))}
            placeholder={t('projectDetail.dailyReports.work_done_ph')}
          />
          <Textarea
            label={t('projectDetail.dailyReports.issues')}
            rows={3}
            value={form.issuesEncountered}
            onChange={(e) => setForm((f) => ({ ...f, issuesEncountered: e.target.value }))}
            placeholder={t('projectDetail.dailyReports.issues_ph')}
          />
          <Textarea
            label={t('projectDetail.dailyReports.next_day')}
            rows={3}
            value={form.nextDayPlan}
            onChange={(e) => setForm((f) => ({ ...f, nextDayPlan: e.target.value }))}
            placeholder={t('projectDetail.dailyReports.next_day_ph')}
          />

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
              {t('projectDetail.dailyReports.photos')}
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-[var(--color-primary)]/40 transition-colors">
              <label className="flex flex-col items-center cursor-pointer gap-2">
                <ImagePlus className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">{t('projectDetail.dailyReports.add_photos')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleImagesChange}
                />
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label={t('common.delete')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editing ? t('common.save') : t('projectDetail.dailyReports.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

function DetailBlock({ label, text }: { label: string; text?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
