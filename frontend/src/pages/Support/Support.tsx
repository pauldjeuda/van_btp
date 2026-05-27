import React, { useState } from 'react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Folder,
  Search,
  Upload,
  MoreVertical,
  Download,
  Share2,
  Users,
  LifeBuoy,
  MessageSquare,
  BookOpen,
  Settings,
  Shield,
  Database,
  ChevronRight,
  ArrowLeft,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSearch,
  HardHat,
  Truck,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProjectNameById } from '../../lib/project.utils';
import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { documentService } from '../../services/document.service';
import { TabButton, FolderCard, TicketRow, ReferentialCard, ContactItem } from './SupportComponents';
import { DocumentViewer } from './DocumentViewer';

export const SupportPage = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { role } = useUser();
  const { projects, tickets, addTicket, documents, addDocument } = useData();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'ged' | 'tickets' | 'referentials'>('ged');

  // Fonctions pour calculer les vrais chiffres des documents
  const getDocumentCountByType = (type: string) => {
    return documents.filter(doc => {
      const docType = doc.type || 'Autre';
      if (type === 'plans_techniques') {
        return docType === 'Plan' || docType === 'PDF';
      } else if (type === 'contracts_markets') {
        return docType === 'Contrat';
      } else if (type === 'invoices_quotes') {
        return docType === 'Facture' || docType === 'Excel';
      } else if (type === 'site_photos') {
        return docType === 'Image' || docType === 'Photo';
      }
      return false;
    }).length;
  };
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketStep, setTicketStep] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isForumModalOpen, setIsForumModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<number | null>(null);
  const [selectedReferential, setSelectedReferential] = useState<any>(null);
  const [docSearch, setDocSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTicket, setNewTicket] = useState({
    title: '',
    module: t('support.tickets.modules.dashboard'),
    priority: t('support.tickets.priorities.low'),
    description: ''
  });

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketStep < 2) {
      setIsSubmitting(true);
      try {
        await addTicket({
          title: newTicket.title,
          module: newTicket.module,
          priority: newTicket.priority,
          description: newTicket.description,
        });
        notify(t('support.tickets.success'), 'success', '/support');
        setTicketStep(ticketStep + 1);
      } catch (err: any) {
        notify(err.message || t('support.tickets.error'), 'error', '/support');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsTicketModalOpen(false);
      setTicketStep(1);
      setNewTicket({
        title: '',
        module: t('support.tickets.modules.dashboard'),
        priority: t('support.tickets.priorities.low'),
        description: ''
      });
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      await documentService.download(doc.id, doc.name || 'document');
      notify(t('support.upload.download'), 'info', '/support');
    } catch {
      notify(t('support.modals.download_error'), 'error', '/support');
    }
  };

  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'PDF',
    projectId: 0,
    folder: t('support.folders.plans_techniques'),
    description: '',
    size: '0 KB',
    file: null as File | null
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadStep === 1) {
      if (!newDocument.file) {
        notify(t('support.upload.error_no_file'), 'error', '/support');
        return;
      }
      if (!newDocument.name) {
        notify(t('support.upload.error_no_name'), 'error', '/support');
        return;
      }
      setIsSubmitting(true);
      try {
        await addDocument({
          ...newDocument,
          type: newDocument.folder === 'Plans & Techniques' ? 'Plan'
            : newDocument.folder === 'Contrats & Marchés' ? 'Contrat'
              : newDocument.folder === 'Factures & Devis' ? 'Facture'
                : newDocument.folder === 'Photos Chantier' ? 'Photo'
                  : 'Autre',
        });
        setUploadStep(2);
      } catch (err: any) {
        notify(err?.message || t('support.upload.error_upload'), 'error', '/support');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsUploadModalOpen(false);
      setUploadStep(1);
      setNewDocument({
        name: '',
        type: 'PDF',
        projectId: 0,
        folder: t('support.folders.plans_techniques'),
        description: '',
        size: '0 KB',
        file: null
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <LifeBuoy className="w-4 h-4" />
            <span>{t('support.ged')}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{t('support.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('support.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsTicketModalOpen(true)} className="bg-white border-slate-200 h-12 px-6 font-bold">
            <MessageSquare className="w-5 h-5 mr-2" />
            {t('support.open_ticket')}
          </Button>
          {(role === 'Directeur technique' || role === 'Chef_chantier') && (
            <Button onClick={() => setIsUploadModalOpen(true)} className="shadow-lg shadow-blue-900/20 h-12 px-6 font-bold bg-[var(--color-primary)]">
              <Upload className="w-5 h-5 mr-2" />
              {t('common.upload_document')}
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <TabButton
          active={activeTab === 'ged'}
          onClick={() => setActiveTab('ged')}
          icon={Folder}
          label={t('common.ged_management')}
        />
        <TabButton
          active={activeTab === 'tickets'}
          onClick={() => setActiveTab('tickets')}
          icon={MessageSquare}
          label={t('common.technical_support')}
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ged' && (
          <motion.div
            key="ged"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Folder Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FolderCard title={t('support.folders.plans_techniques')} count={`${getDocumentCountByType('plans_techniques')} fichiers`} color="blue" />
              <FolderCard title={t('support.folders.contracts_markets')} count={`${getDocumentCountByType('contracts_markets')} fichiers`} color="emerald" />
              <FolderCard title={t('support.folders.invoices_quotes')} count={`${getDocumentCountByType('invoices_quotes')} fichiers`} color="orange" />
              <FolderCard title={t('support.folders.site_photos')} count={`${getDocumentCountByType('site_photos')} fichiers`} color="purple" />
            </div>

            {/* Recent Documents Table */}
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('support.document_table.title')}</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t('support.search_placeholder')}
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-64"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">{t('support.document_table.filename')}</th>
                      <th className="px-6 py-4 text-left">{t('support.document_table.type')}</th>
                      <th className="px-6 py-4 text-left">{t('support.document_table.project')}</th>
                      <th className="px-6 py-4 text-left">{t('support.document_table.date')}</th>
                      <th className="px-6 py-4 text-left">{t('support.document_table.size')}</th>
                      <th className="px-6 py-4 text-right">{t('support.document_table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents
                      .filter(doc => {
                        const name = (doc.name || '').toLowerCase();
                        const projectLabel = getProjectNameById(projects, doc.projectId || 0).toLowerCase();
                        const q = docSearch.toLowerCase();
                        return name.includes(q) || projectLabel.includes(q);
                      })
                      .map((doc, i) => (
                        <tr
                          key={doc.id != null ? `doc-${doc.id}` : `doc-row-${i}`}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                doc.type === 'PDF' ? "bg-red-50 text-red-600" :
                                  doc.type === 'Excel' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                              )}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-black text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.type}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{getProjectNameById(projects, doc.projectId)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{doc.date}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{doc.size}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[var(--color-primary)]"><Download className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[var(--color-primary)]"><Share2 className="w-4 h-4" /></button>
                              <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(isMoreMenuOpen === i ? null : i); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[var(--color-primary)]"><MoreVertical className="w-4 h-4" /></button>
                                {isMoreMenuOpen === i && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2">
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Renommer</button>
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Déplacer</button>
                                    {(role === 'Directeur technique' || role === 'Chef_chantier') && (
                                      <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Archiver</button>
                                    )}
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg">{t('common.delete')}</button>
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Voir historique</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'tickets' && (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Mes Tickets Support</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-wider">2 En cours</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {tickets.map((ticket, idx) => (
                    <TicketRow
                      key={ticket.id ? `ticket-${ticket.id}` : `ticket-${idx}`}
                      id={ticket.id}
                      title={ticket.title}
                      status={ticket.status}
                      priority={ticket.priority}
                      date={ticket.date}
                    />
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                  <BookOpen className="w-8 h-8 text-blue-400 mb-4" />
                  <h4 className="text-lg font-black tracking-tight mb-2">Base de Connaissances</h4>
                  <p className="text-sm text-slate-400 font-medium mb-6">Accédez aux guides d'utilisation et aux tutoriels vidéos de VAN BTP ERP.</p>
                  <Button onClick={() => setIsHelpModalOpen(true)} className="w-full bg-white text-slate-900 hover:bg-blue-50 font-bold border-none">Consulter l'Aide</Button>
                </Card>
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 bg-white">
                  <Users className="w-8 h-8 text-[var(--color-primary)] mb-4" />
                  <h4 className="text-lg font-black tracking-tight mb-2">Communauté & Feedback</h4>
                  <p className="text-sm text-slate-500 font-medium mb-6">Partagez vos suggestions d'amélioration et échangez avec les autres utilisateurs.</p>
                  <Button onClick={() => setIsForumModalOpen(true)} variant="outline" className="w-full border-slate-200 text-slate-600 font-bold">Rejoindre le Forum</Button>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
                <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">Contact Support</h3>
                <div className="space-y-6">
                  <ContactItem icon={Clock} label="Temps de réponse moyen" value="< 4 heures" />
                  <ContactItem icon={Shield} label="Disponibilité" value="24/7 (Urgence)" />
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ligne Directe</p>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">+237 6XX XX XX XX</p>
                        <p className="text-[10px] text-slate-500 font-bold">Support VAN BTP Douala / Yaoundé</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title={t('support.upload.title')}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                uploadStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {uploadStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('support.doc_type')}</label>
                    <select
                      value={newDocument.folder}
                      onChange={(e) => setNewDocument({ ...newDocument, folder: e.target.value })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option>Plans & Techniques</option>
                      <option>Contrats & Marchés</option>
                      <option>Factures & Devis</option>
                      <option>Photos Chantier</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Chantier rattaché</label>
                    <select
                      value={newDocument.projectId}
                      onChange={(e) => setNewDocument({ ...newDocument, projectId: Number(e.target.value) })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value={0}>Aucun (Document général)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('support.doc_name')}</label>
                  <Input
                    placeholder="Ex: Plan de masse"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('support.doc_note')}</label>
                  <textarea
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Ajoutez une description pour faciliter la recherche..."
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Sélectionner le Document</label>
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-[var(--color-primary)] transition-all cursor-pointer bg-slate-50/50 group relative"
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                          const extension = file.name.split('.').pop()?.toUpperCase() || 'DOC';
                          setNewDocument({
                            ...newDocument,
                            name: file.name,
                            size: `${sizeMB} MB`,
                            type: extension,
                            file
                          });
                        }
                      }}
                    />
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-[var(--color-primary)] transition-colors shadow-sm">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {newDocument.name || "Sélectionner un fichier"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{t('support.formats')}</p>
                  </div>
                </div>
              </div>
            )}

            {uploadStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{t('support.archived')}</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">{t('support.modals.indexed_success')}</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => uploadStep > 1 ? setUploadStep(1) : setIsUploadModalOpen(false)} className="font-bold">
                {uploadStep === 1 ? t('common.cancel') : t('common.modals.previous')}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('common.modals.processing')}
                  </>
                ) : (
                  uploadStep === 2 ? t('common.close') : t('common.modals.launch_upload')
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Ticket Modal (Workflow) */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title={t('support.open_ticket')}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                ticketStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleTicketSubmit} className="space-y-6">
            {ticketStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('support.subject')}</label>
                  <Input
                    placeholder="Ex: Bug affichage planning"
                    required
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Module concerné</label>
                    <select
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newTicket.module}
                      onChange={(e) => setNewTicket({ ...newTicket, module: e.target.value })}
                    >
                      <option>Tableau de bord</option>
                      <option>Chantiers</option>
                      <option>Finances</option>
                      <option>Ressources</option>
                      <option>Contrôle</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Priorité</label>
                    <select
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    >
                      <option>Basse</option>
                      <option>Moyenne</option>
                      <option>Haute</option>
                      <option>{t('support.blocking')}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('support.detailed_desc')}</label>
                  <textarea
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Décrivez précisément votre problème ou votre besoin..."
                    required
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  ></textarea>
                </div>
              </div>
            )}

            {ticketStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{t('support.ticket_sent')}</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">{t('support.modals.ticket_contact')}</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => ticketStep > 1 ? setTicketStep(1) : setIsTicketModalOpen(false)} className="font-bold">
                {ticketStep === 1 ? t('common.cancel') : t('common.modals.previous')}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('common.modals.processing')}
                  </>
                ) : (
                  ticketStep === 2 ? t('common.close') : t('common.modals.send_ticket')
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <Modal
            isOpen={!!selectedDoc}
            onClose={() => setSelectedDoc(null)}
            title={t('support.modals.doc_detail', { name: selectedDoc.name })}
          >
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400">
                  <FileText className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDoc.name}</h3>
                  <p className="text-sm font-bold text-slate-500">{getProjectNameById(projects, selectedDoc.projectId)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-black text-slate-900">{selectedDoc.type || 'Non défini'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taille</p>
                  <p className="text-sm font-black text-slate-900">{selectedDoc.size || 'Non spécifiée'}</p>
                </div>
                {selectedDoc.projectId && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projet</p>
                    <p className="text-sm font-black text-slate-900">{getProjectNameById(projects, selectedDoc.projectId)}</p>
                  </div>
                )}
                {selectedDoc.uploadedBy && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('support.uploaded_by')}</p>
                    <p className="text-sm font-black text-slate-900">{selectedDoc.uploadedByRole || 'Utilisateur'}</p>
                  </div>
                )}
              </div>

              {selectedDoc.mimeType && (
                <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('support.tech_info')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('support.mime_type')}</p>
                      <p className="text-sm font-black text-slate-900">{selectedDoc.mimeType}</p>
                    </div>
                    {selectedDoc.filePath && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('support.file_path')}</p>
                        <p className="text-sm font-black text-slate-900 truncate">{selectedDoc.filePath}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedDoc(null)} className="font-bold">{t('common.close')}</Button>
                <Button onClick={() => setIsViewerModalOpen(true)} className="font-bold shadow-lg shadow-blue-900/20">{t('support.view_annotate')}</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Forum Modal */}
      <Modal isOpen={isForumModalOpen} onClose={() => setIsForumModalOpen(false)} title={t('support.modals.forum')} size="lg">
        <div className="space-y-6">
          <p className="text-sm text-slate-600">Bienvenue sur le forum d'entraide. Discutez avec vos pairs et partagez vos bonnes pratiques.</p>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">Astuces pour la gestion des chantiers</h4>
              <p className="text-xs text-slate-500">12 discussions • Dernière réponse il y a 1h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">Questions techniques ERP</h4>
              <p className="text-xs text-slate-500">45 discussions • Dernière réponse il y a 3h</p>
            </div>
          </div>
          <Button className="w-full font-bold">Accéder au Forum complet</Button>
        </div>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        isOpen={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
        title={t('support.modals.viewer', { name: selectedDoc?.name || t('common.details') })}
        size="full"
      >
        <div className="h-[78vh] min-h-[480px] flex flex-col">
          {selectedDoc && (
            <DocumentViewer
              document={selectedDoc}
              onDownload={() => handleDownload(selectedDoc)}
            />
          )}
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={t('support.modals.share')} size="sm">
        <div className="space-y-6">
          <Input label={t('support.modals.share_recipient')} placeholder="email@exemple.com" />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('support.modals.share_message')}</label>
            <textarea className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('common.modals.optional_message')}></textarea>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 font-bold" onClick={() => { setIsShareModalOpen(false); notify(t('support.modals.share_sent'), 'success', '/support'); }}>{t('common.send')}</Button>
            <Button variant="outline" className="font-bold" onClick={() => { setIsShareModalOpen(false); notify(t('support.modals.link_copied'), 'success', '/support'); }}>{t('support.modals.copy_link')}</Button>
          </div>
        </div>
      </Modal>

      {/* Help Center Modal */}
      <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title={t('support.help.title')} size="lg">
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher dans l'aide..." className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">FAQ</h4>
              <p className="text-xs text-slate-500">Questions fréquentes</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">Guides</h4>
              <p className="text-xs text-slate-500">Tutoriels pas-à-pas</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
