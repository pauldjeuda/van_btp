import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Printer,
  Map,
  FileBarChart,
  FileSignature,
  Receipt,
  Shield,
  BookOpen,
  Paperclip,
  Upload,
  Download,
  Calculator,
} from 'lucide-react';
import { Button, Input, Modal, cn } from '../../components/ui';
import { useNotification } from '../../context/NotificationContext';
import { useUser } from '../../context/UserContext';
import {
  projectQuoteService,
  ProjectQuote,
  QuoteLine,
  calcGrandTotal,
  calcLineTotal,
  parseQuoteLines,
} from '../../services/projectQuote.service';
import {
  documentService,
  ProjectDocumentType,
  ProjectFileDocument,
} from '../../services/document.service';
import { formatDateShort, formatNumber } from '../../lib/formatters';
import { generateProjectQuotePDF } from '../../utils/quotePdfGenerator';

type LineForm = { designation: string; unitPrice: string; quantity: string };

type NewDocChoice = 'quote' | ProjectDocumentType;

type LibraryItem =
  | { kind: 'quote'; id: string; date: string; quote: ProjectQuote }
  | { kind: 'file'; id: string; date: string; file: ProjectFileDocument };

const emptyLine = (): LineForm => ({ designation: '', unitPrice: '', quantity: '1' });

const linesToForm = (lines: QuoteLine[]): LineForm[] =>
  lines.length
    ? lines.map((l) => ({
        designation: l.designation,
        unitPrice: String(l.unitPrice),
        quantity: String(l.quantity ?? 1),
      }))
    : [emptyLine()];

const UPLOAD_TYPES: ProjectDocumentType[] = [
  'Plan',
  'Rapport',
  'Contrat',
  'Facture',
  'Permis',
  'Normes',
  'Autre',
];

const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  quote: Calculator,
  Plan: Map,
  Rapport: FileBarChart,
  Contrat: FileSignature,
  Facture: Receipt,
  Permis: Shield,
  Normes: BookOpen,
  Autre: Paperclip,
};

interface Props {
  projectId: number;
  canEdit: boolean;
  projectName?: string;
  projectCode?: string;
  clientName?: string;
  projectLocation?: string;
}

const STATUS_STYLE: Record<string, string> = {
  'En attente': 'bg-amber-100 text-amber-800',
  'Validé': 'bg-emerald-100 text-emerald-800',
  'Rejeté': 'bg-red-100 text-red-800',
};

export const ProjectDocumentsSection: React.FC<Props> = ({
  projectId,
  canEdit,
  projectName = 'Chantier',
  projectCode,
  clientName,
  projectLocation,
}) => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const { role, profile } = useUser();
  const isDt = role === 'Directeur technique';
  const isChef = role === 'Chef_chantier';

  const [quotes, setQuotes] = useState<ProjectQuote[]>([]);
  const [files, setFiles] = useState<ProjectFileDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<ProjectDocumentType>('Plan');

  const [editing, setEditing] = useState<ProjectQuote | null>(null);
  const [formTitle, setFormTitle] = useState('Devis chantier');
  const [formLines, setFormLines] = useState<LineForm[]>([emptyLine()]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewQuote, setViewQuote] = useState<ProjectQuote | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const formGrandTotal = useMemo(() => calcGrandTotal(formLines), [formLines]);
  const isResubmitEdit = editing?.status === 'Rejeté';

  const libraryItems = useMemo((): LibraryItem[] => {
    const items: LibraryItem[] = [
      ...quotes.map((quote) => ({
        kind: 'quote' as const,
        id: `quote-${quote.id}`,
        date: quote.createdAt,
        quote,
      })),
      ...files.map((file) => ({
        kind: 'file' as const,
        id: `file-${file.id}`,
        date: file.createdAt,
        file,
      })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotes, files]);

  const load = async () => {
    setLoading(true);
    try {
      const [q, f] = await Promise.all([
        projectQuoteService.getAll(projectId),
        documentService.getAll({ projectId }),
      ]);
      setQuotes(q);
      setFiles(f);
    } catch {
      setQuotes([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const openTypePicker = () => setTypePickerOpen(true);

  const onChooseDocType = (choice: NewDocChoice) => {
    setTypePickerOpen(false);
    if (choice === 'quote') {
      setEditing(null);
      setFormTitle('Devis chantier');
      setFormLines([emptyLine()]);
      setFormOpen(true);
      return;
    }
    setUploadType(choice);
    setUploadTitle('');
    setUploadFile(null);
    setUploadOpen(true);
  };

  const openEdit = (quote: ProjectQuote) => {
    const lines = parseQuoteLines(quote.lines);
    if (!lines.length) {
      notify(t('projectDetail.documents.no_lines'), 'error');
      return;
    }
    setEditing(quote);
    setFormTitle(quote.title);
    setFormLines(linesToForm(lines));
    setFormOpen(true);
  };

  const isQuoteOwner = (quote: ProjectQuote) =>
    quote.createdBy == null || Number(quote.createdBy) === Number(profile?.id);

  const canModifyQuote = (quote: ProjectQuote) =>
    isChef &&
    (quote.status === 'En attente' || quote.status === 'Rejeté') &&
    isQuoteOwner(quote);

  const buildPayloadLines = () =>
    formLines
      .filter((l) => l.designation.trim())
      .map((l) => ({
        designation: l.designation.trim(),
        unitPrice: Number(l.unitPrice || 0),
        quantity: l.quantity.trim() ? Number(l.quantity) : 1,
      }));

  const printQuotePdf = (quote: ProjectQuote) => {
    const lines = parseQuoteLines(quote.lines);
    if (!lines.length) {
      notify(t('projectDetail.documents.no_lines'), 'error');
      return;
    }
    generateProjectQuotePDF({
      quoteId: quote.id,
      title: quote.title,
      status: quote.status,
      date: formatDateShort(quote.createdAt),
      projectName,
      projectCode,
      clientName,
      location: projectLocation,
      lines,
      totalAmount: Number(quote.totalAmount),
      rejectionReason: quote.rejectionReason,
    });
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloadLines = buildPayloadLines();
    if (!payloadLines.length) {
      notify(t('projectDetail.documents.line_required'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await projectQuoteService.update(projectId, editing.id, { title: formTitle, lines: payloadLines });
        notify(
          isResubmitEdit ? t('projectDetail.documents.resubmitted') : t('projectDetail.documents.updated'),
          'success',
        );
        if (isResubmitEdit) window.dispatchEvent(new CustomEvent('van_btp:approvals_updated'));
      } else {
        await projectQuoteService.create(projectId, { title: formTitle, lines: payloadLines });
        notify(
          isDt ? t('projectDetail.documents.created') : t('projectDetail.documents.submitted'),
          'success',
        );
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      notify(t('projectDetail.documents.file_required'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('name', uploadTitle.trim() || uploadFile.name);
      fd.append('type', uploadType);
      fd.append('projectId', String(projectId));
      await documentService.upload(fd);
      notify(t('projectDetail.documents.file_uploaded'), 'success');
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      await load();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openView = async (quote: ProjectQuote) => {
    setViewLoading(true);
    setRejectReason('');
    setViewQuote(quote);
    try {
      const full = await projectQuoteService.getOne(projectId, quote.id);
      setViewQuote(full);
    } catch {
      setViewQuote({ ...quote, lines: parseQuoteLines(quote.lines) });
    } finally {
      setViewLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!viewQuote) return;
    setSubmitting(true);
    try {
      await projectQuoteService.approve(projectId, viewQuote.id);
      notify(t('projectDetail.documents.approved'), 'success');
      setViewQuote(null);
      window.dispatchEvent(new CustomEvent('van_btp:approvals_updated'));
      await load();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!viewQuote) return;
    setSubmitting(true);
    try {
      await projectQuoteService.reject(projectId, viewQuote.id, rejectReason);
      notify(t('projectDetail.documents.rejected'), 'warning');
      setViewQuote(null);
      window.dispatchEvent(new CustomEvent('van_btp:approvals_updated'));
      await load();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuote = async (quote: ProjectQuote) => {
    if (!window.confirm(t('projectDetail.documents.confirm_delete'))) return;
    try {
      await projectQuoteService.remove(projectId, quote.id);
      notify(t('projectDetail.documents.deleted'), 'success');
      await load();
    } catch {
      notify(t('common.error_generic'), 'error');
    }
  };

  const handleDeleteFile = async (file: ProjectFileDocument) => {
    if (!window.confirm(t('projectDetail.documents.confirm_delete_file'))) return;
    try {
      await documentService.remove(file.id);
      notify(t('projectDetail.documents.file_deleted'), 'success');
      await load();
    } catch {
      notify(t('common.error_generic'), 'error');
    }
  };

  const renderFormEditor = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
        <span className="col-span-5">{t('projectDetail.documents.col_designation')}</span>
        <span className="col-span-3">{t('projectDetail.documents.col_price')}</span>
        <span className="col-span-2">{t('projectDetail.documents.col_qty')}</span>
        <span className="col-span-2 text-right">{t('projectDetail.documents.col_total')}</span>
      </div>
      {formLines.map((line, i) => {
        const lineTotal = calcLineTotal(Number(line.unitPrice || 0), line.quantity);
        return (
          <div key={`form-line-${i}`} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-5 h-9 px-2 border border-slate-200 rounded-lg text-sm"
              value={line.designation}
              placeholder={t('projectDetail.documents.designation_ph')}
              onChange={(e) => {
                const next = [...formLines];
                next[i] = { ...next[i], designation: e.target.value };
                setFormLines(next);
              }}
            />
            <input
              type="number"
              min={0}
              className="col-span-3 h-9 px-2 border border-slate-200 rounded-lg text-sm"
              value={line.unitPrice}
              onChange={(e) => {
                const next = [...formLines];
                next[i] = { ...next[i], unitPrice: e.target.value };
                setFormLines(next);
              }}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              className="col-span-2 h-9 px-2 border border-slate-200 rounded-lg text-sm"
              value={line.quantity}
              onChange={(e) => {
                const next = [...formLines];
                next[i] = { ...next[i], quantity: e.target.value };
                setFormLines(next);
              }}
            />
            <span className="col-span-2 text-right text-sm font-bold text-slate-700">{formatNumber(lineTotal)}</span>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => setFormLines([...formLines, emptyLine()])}>
        <Plus className="w-3.5 h-3.5 mr-1" /> {t('projectDetail.documents.add_line')}
      </Button>
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <p className="text-sm font-black text-slate-900">
          {t('projectDetail.documents.grand_total')} : {formatNumber(formGrandTotal)} FCFA
        </p>
      </div>
    </div>
  );

  const renderViewTable = (quote: ProjectQuote) => {
    const lines = parseQuoteLines(quote.lines);
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <th className="text-left px-4 py-3">{t('projectDetail.documents.col_designation')}</th>
              <th className="text-right px-4 py-3">{t('projectDetail.documents.col_price')}</th>
              <th className="text-right px-4 py-3">{t('projectDetail.documents.col_qty')}</th>
              <th className="text-right px-4 py-3">{t('projectDetail.documents.col_total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">
                  {t('projectDetail.documents.no_lines')}
                </td>
              </tr>
            ) : (
              lines.map((line, i) => (
                <tr key={`view-line-${i}`} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{line.designation}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatNumber(line.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{line.quantity}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatNumber(line.total)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--color-primary)]/5">
              <td colSpan={3} className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase">
                {t('projectDetail.documents.grand_total')}
              </td>
              <td className="px-4 py-3 text-right text-base font-black text-[var(--color-primary)]">
                {formatNumber(Number(quote.totalAmount))} FCFA
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const typeLabel = (item: LibraryItem) => {
    if (item.kind === 'quote') return t('projectDetail.documents.type_quote');
    return t(`projectDetail.documents.type_${item.file.type.toLowerCase()}`, {
      defaultValue: item.file.type,
    });
  };

  const renderLibraryRow = (item: LibraryItem) => {
    if (item.kind === 'quote') {
      const quote = item.quote;
      const Icon = TYPE_ICONS.quote;
      return (
        <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
          <Icon className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{quote.title}</p>
            <p className="text-xs text-slate-500">
              {typeLabel(item)} · {formatDateShort(quote.createdAt)} ·{' '}
              {parseQuoteLines(quote.lines).length} {t('projectDetail.documents.lines_count')} ·{' '}
              {formatNumber(Number(quote.totalAmount))} FCFA
            </p>
          </div>
          <span
            className={cn(
              'text-[10px] font-black uppercase px-2 py-1 rounded-lg',
              STATUS_STYLE[quote.status] || 'bg-slate-100 text-slate-600',
            )}
          >
            {quote.status}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openView(quote)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--color-primary)]"
              aria-label={t('common.view')}
            >
              <Eye className="w-4 h-4" />
            </button>
            {canModifyQuote(quote) && (
              <>
                <button
                  type="button"
                  onClick={() => openEdit(quote)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                  aria-label={t('common.edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuote(quote)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </li>
      );
    }

    const file = item.file;
    const Icon = TYPE_ICONS[file.type] || Paperclip;
    return (
      <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
        <Icon className="w-5 h-5 text-indigo-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
          <p className="text-xs text-slate-500">
            {typeLabel(item)} · {formatDateShort(file.createdAt)}
            {file.fileSize ? ` · ${file.fileSize}` : ''}
          </p>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
          {file.type}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => documentService.download(file.id, file.name)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--color-primary)]"
            aria-label={t('common.download')}
          >
            <Download className="w-4 h-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => handleDeleteFile(file)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </li>
    );
  };

  const pickerOptions: { id: NewDocChoice; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { id: 'quote', icon: Calculator, desc: t('projectDetail.documents.type_quote_desc') },
    { id: 'Plan', icon: Map, desc: t('projectDetail.documents.type_plan_desc') },
    { id: 'Rapport', icon: FileBarChart, desc: t('projectDetail.documents.type_rapport_desc') },
    { id: 'Contrat', icon: FileSignature, desc: t('projectDetail.documents.type_contrat_desc') },
    { id: 'Facture', icon: Receipt, desc: t('projectDetail.documents.type_facture_desc') },
    { id: 'Permis', icon: Shield, desc: t('projectDetail.documents.type_permis_desc') },
    { id: 'Normes', icon: BookOpen, desc: t('projectDetail.documents.type_normes_desc') },
    { id: 'Autre', icon: Paperclip, desc: t('projectDetail.documents.type_autre_desc') },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500 font-medium">{t('projectDetail.documents.library_hint')}</p>
        {canEdit && (
          <Button size="sm" onClick={openTypePicker} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> {t('projectDetail.documents.new_document')}
          </Button>
        )}
      </div>

      {libraryItems.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">{t('projectDetail.documents.empty')}</p>
      ) : (
        <ul className="space-y-2">{libraryItems.map(renderLibraryRow)}</ul>
      )}

      {/* Choix du type de document */}
      <Modal
        isOpen={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        title={t('projectDetail.documents.choose_type')}
        size="lg"
      >
        <p className="text-sm text-slate-500 mb-4">{t('projectDetail.documents.choose_type_hint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pickerOptions.map((opt) => {
            const Icon = opt.icon;
            const label =
              opt.id === 'quote'
                ? t('projectDetail.documents.type_quote')
                : t(`projectDetail.documents.type_${String(opt.id).toLowerCase()}`, { defaultValue: opt.id });
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChooseDocType(opt.id)}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-[var(--color-primary)] hover:bg-blue-50/50 text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Upload fichier */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title={t('projectDetail.documents.upload_title', {
          type: t(`projectDetail.documents.type_${uploadType.toLowerCase()}`, { defaultValue: uploadType }),
        })}
        size="md"
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <Input
            label={t('projectDetail.documents.file_name')}
            value={uploadTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadTitle(e.target.value)}
            placeholder={t('projectDetail.documents.file_name_ph')}
          />
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
              {t('projectDetail.documents.file_type')}
            </label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as ProjectDocumentType)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
            >
              {UPLOAD_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`projectDetail.documents.type_${tp.toLowerCase()}`, { defaultValue: tp })}
                </option>
              ))}
            </select>
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[var(--color-primary)] transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.doc,.docx,.xls,.xlsx"
              className="text-sm w-full"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            {uploadFile && (
              <p className="text-xs font-bold text-emerald-600 mt-2">{uploadFile.name}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setUploadOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={submitting}>
              {t('projectDetail.documents.upload_submit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Devis — création / édition */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={
          isResubmitEdit
            ? t('projectDetail.documents.edit_resubmit')
            : editing
              ? t('projectDetail.documents.edit_quote')
              : t('projectDetail.documents.new_quote')
        }
        size="lg"
      >
        <form onSubmit={handleSubmitQuote} className="space-y-4">
          {isResubmitEdit && editing && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-800 font-medium">
              {t('projectDetail.documents.rejection_notice')}
              {editing.rejectionReason && (
                <p className="mt-1 text-amber-900">
                  <span className="font-bold">{t('projectDetail.documents.rejection_label')} :</span>{' '}
                  {editing.rejectionReason}
                </p>
              )}
            </div>
          )}
          <Input
            label={t('projectDetail.documents.quote_title')}
            value={formTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTitle(e.target.value)}
          />
          {renderFormEditor()}
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
            {editing && parseQuoteLines(editing.lines).length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => printQuotePdf({ ...editing, title: formTitle, lines: parseQuoteLines(editing.lines) })}
              >
                <Printer className="w-4 h-4 mr-1" />
                {t('projectDetail.documents.print_pdf')}
              </Button>
            )}
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={submitting}>
              {isResubmitEdit ? t('projectDetail.documents.resubmit') : editing ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Consultation devis */}
      <Modal
        isOpen={!!viewQuote}
        onClose={() => setViewQuote(null)}
        title={viewQuote?.title || t('projectDetail.documents.view_quote')}
        description={
          viewQuote ? `${formatDateShort(viewQuote.createdAt)} · ${viewQuote.status}` : undefined
        }
        size="xl"
      >
        {viewQuote && (
          <div className="space-y-5">
            {viewLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg',
                      STATUS_STYLE[viewQuote.status],
                    )}
                  >
                    {viewQuote.status}
                  </span>
                  {viewQuote.createdByRole && (
                    <span className="text-xs text-slate-500 font-medium">
                      {t('projectDetail.documents.created_by', { role: viewQuote.createdByRole })}
                    </span>
                  )}
                </div>

                {viewQuote.status === 'Rejeté' && isChef && isQuoteOwner(viewQuote) && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-800">
                    <p className="font-bold">{t('projectDetail.documents.rejection_notice')}</p>
                    {viewQuote.rejectionReason ? (
                      <p className="mt-1">
                        <span className="font-semibold">{t('projectDetail.documents.rejection_label')} :</span>{' '}
                        {viewQuote.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                )}

                {renderViewTable(viewQuote)}

                {isDt && viewQuote.status === 'En attente' && (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('projectDetail.documents.reject_reason_ph')}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-600 border-red-200"
                        onClick={handleReject}
                        isLoading={submitting}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t('common.reject')}
                      </Button>
                      <Button type="button" onClick={handleApprove} isLoading={submitting}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {t('common.validate')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => printQuotePdf(viewQuote)}
                    disabled={parseQuoteLines(viewQuote.lines).length === 0}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    {t('projectDetail.documents.print_pdf')}
                  </Button>
                  {canModifyQuote(viewQuote) && viewQuote.status === 'Rejeté' && (
                    <Button
                      type="button"
                      onClick={() => {
                        const q = viewQuote;
                        setViewQuote(null);
                        openEdit(q);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      {t('projectDetail.documents.edit_resubmit')}
                    </Button>
                  )}
                  <Button variant="outline" type="button" onClick={() => setViewQuote(null)}>
                    {t('common.close')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
