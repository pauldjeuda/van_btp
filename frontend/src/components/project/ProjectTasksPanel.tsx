import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown, ChevronUp, User, Calendar, Flag, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { Button, Input, Modal, cn } from '../ui';
import { projectTaskService } from '../../services/projectTask.service';
import { useNotification } from '../../context/NotificationContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  'À faire':   { label: 'À faire',   color: 'bg-slate-100 text-slate-600',    icon: Clock },
  'En cours':  { label: 'En cours',  color: 'bg-blue-100 text-blue-700',      icon: ChevronDown },
  'Terminé':   { label: 'Terminé',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'Bloqué':    { label: 'Bloqué',    color: 'bg-red-100 text-red-700',        icon: XCircle },
};
const PRIORITY_CONFIG: Record<string, string> = {
  'Basse':    'bg-slate-100 text-slate-500',
  'Normale':  'bg-blue-100 text-blue-600',
  'Haute':    'bg-amber-100 text-amber-700',
  'Critique': 'bg-red-100 text-red-700',
};

interface Props {
  projectId: number;
  employees: any[];
  canEdit: boolean;
}

export const ProjectTasksPanel: React.FC<Props> = ({ projectId, employees, canEdit }) => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [tasks,       setTasks]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState<'liste' | 'kanban'>('liste');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', assignedTo: '', assignedRole: '',
    status: 'À faire', priority: 'Normale', startDate: '', dueDate: '', progress: 0,
  });

  const load = async () => {
    setLoading(true);
    try { setTasks(await projectTaskService.getAll(projectId)); }
    catch { setTasks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({ title: '', description: '', assignedTo: '', assignedRole: '', status: 'À faire', priority: 'Normale', startDate: '', dueDate: '', progress: 0 });
    setIsModalOpen(true);
  };
  const openEdit = (t: any) => {
    setEditingTask(t);
    setForm({ title: t.title, description: t.description || '', assignedTo: t.assignedTo ? String(t.assignedTo) : '', assignedRole: t.assignedRole || '', status: t.status, priority: t.priority, startDate: t.startDate || '', dueDate: t.dueDate || '', progress: t.progress || 0 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { notify('Le titre est obligatoire', 'error'); return; }
    setIsSubmitting(true);
    try {
      const payload = { ...form, assignedTo: form.assignedTo ? Number(form.assignedTo) : null, progress: Number(form.progress) };
      if (editingTask) {
        await projectTaskService.update(projectId, editingTask.id, payload);
        notify('Tâche mise à jour', 'success');
      } else {
        await projectTaskService.create(projectId, payload);
        notify('Tâche créée', 'success');
      }
      setIsModalOpen(false);
      load();
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleStatusChange = async (task: any, newStatus: string) => {
    try {
      await projectTaskService.updateStatus(projectId, task.id, { status: newStatus });
      load();
    } catch { notify('Erreur mise à jour statut', 'error'); }
  };

  const handleDelete = async (taskId: number) => {
    try { await projectTaskService.remove(projectId, taskId); load(); }
    catch { notify('Erreur suppression', 'error'); }
  };

  const byStatus = (s: string) => tasks.filter(t => t.status === s);
  const today = new Date().toISOString().split('T')[0];

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {(['liste', 'kanban'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all',
                view === v ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
              {v === 'liste' ? 'Liste' : 'Kanban'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{tasks.filter(t => t.status === 'Terminé').length}/{tasks.length} terminées</span>
          {canEdit && (
            <Button size="sm" onClick={openCreate} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">{t('common.no_data')}</p>
          {canEdit && <Button size="sm" onClick={openCreate} className="mt-3 gap-1"><Plus className="w-3.5 h-3.5" />Créer la première tâche</Button>}
        </div>
      )}

      {/* Vue Liste */}
      {view === 'liste' && tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Tâche', 'Responsable', 'Priorité', 'Statut', 'Échéance', 'Avancement', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'Terminé';
                const StatusIcon = STATUS_CONFIG[task.status]?.icon || Clock;
                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className={cn("text-sm font-bold text-slate-900", task.status === 'Terminé' && 'line-through opacity-50')}>{task.title}</p>
                      {task.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-black flex items-center justify-center">
                            {task.assignee.name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{task.assignee.name}</p>
                            {task.assignedRole && <p className="text-xs text-slate-400">{task.assignedRole}</p>}
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-300">{t('resources.details.assignment')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[task.priority] || ''}`}>{task.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <select value={task.status} onChange={e => handleStatusChange(task, e.target.value)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${STATUS_CONFIG[task.status]?.color || ''}`}>
                          {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_CONFIG[task.status]?.color || ''}`}>{task.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 font-black' : 'text-slate-600'}`}>
                          {isOverdue && '⚠ '}{task.dueDate}
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                          <div className="h-1.5 bg-[var(--color-primary)] rounded-full" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{task.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(task)} className="text-slate-300 hover:text-[var(--color-primary)] p-1 transition-colors text-xs font-bold rotate-45">✏</button>
                          <button onClick={() => handleDelete(task.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Vue Kanban */}
      {view === 'kanban' && tasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const col = byStatus(status);
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-slate-400 font-bold">{col.length}</span>
                </div>
                {col.map(task => {
                  const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'Terminé';
                  return (
                    <div key={task.id} onClick={() => canEdit && openEdit(task)}
                      className={cn("bg-white border border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-[var(--color-primary)]/30", isOverdue && "border-red-200")}>
                      <p className="text-sm font-bold text-slate-900 mb-2">{task.title}</p>
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs font-black flex items-center justify-center">{task.assignee.name?.[0]}</div>
                          <span className="text-xs text-slate-500">{task.assignee.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_CONFIG[task.priority] || ''}`}>{task.priority}</span>
                        {task.dueDate && <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>{task.dueDate}</span>}
                      </div>
                      {task.progress > 0 && (
                        <div className="mt-2 h-1 bg-slate-100 rounded-full"><div className="h-1 bg-[var(--color-primary)] rounded-full" style={{ width: `${task.progress}%` }} /></div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création/édition */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Titre *" required value={form.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, title: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Responsable</label>
              <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                <option value="">— Non assigné —</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
              </select>
            </div>
            <Input label="Rôle / Fonction" value={form.assignedRole} placeholder="Ingénieur, Consultant..."
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, assignedRole: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Priorité</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                {['Basse','Normale','Haute','Critique'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Statut</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date début" type="date" value={form.startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, startDate: e.target.value }))} />
            <Input label="Date fin" type="date" value={form.dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Avancement : {form.progress}%</label>
            <input type="range" min={0} max={100} value={form.progress}
              onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))}
              className="w-full accent-[var(--color-primary)]" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingTask ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
