import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, CheckCircle2, Pencil, Check } from 'lucide-react';
import { Button, Input, Modal, cn } from '../ui';
import { projectTaskService } from '../../services/projectTask.service';
import { useNotification } from '../../context/NotificationContext';

interface TaskRow {
  id: number | string;
  title: string;
  description?: string | null;
  status: string;
  position?: number;
  _deleted?: boolean;
  _isNew?: boolean;
  _edited?: boolean;
  _moved?: boolean;
}

interface Props {
  projectId: number;
  canEdit: boolean;
  onProgressChange?: (progress: number) => void;
}

const sortByPosition = (list: TaskRow[]) =>
  [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const calcProgress = (list: TaskRow[]) => {
  const active = list.filter((t) => !t._deleted);
  const total = active.length;
  const done = active.filter((t) => t.status === 'Terminé').length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
};

const toDraft = (list: any[]): TaskRow[] =>
  sortByPosition(
    list.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      position: t.position ?? 0,
    })),
  );

const ordersEqual = (a: TaskRow[], b: TaskRow[]) =>
  a.length === b.length && a.every((t, i) => String(t.id) === String(b[i]?.id));

export const ProjectTasksPanel: React.FC<Props> = ({ projectId, canEdit, onProgressChange }) => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draftTasks, setDraftTasks] = useState<TaskRow[]>([]);
  const [baselineOrder, setBaselineOrder] = useState<TaskRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<TaskRow | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const tasksRef = useRef<TaskRow[]>([]);
  const onProgressChangeRef = useRef(onProgressChange);
  const lastReportedProgressRef = useRef<number | null>(null);

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  const applyTasks = useCallback((list: any[]) => {
    const normalized = toDraft(list);
    setTasks(normalized);
    tasksRef.current = normalized;
    const progress = calcProgress(normalized);
    if (lastReportedProgressRef.current !== progress) {
      lastReportedProgressRef.current = progress;
      onProgressChangeRef.current?.(progress);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    lastReportedProgressRef.current = null;

    (async () => {
      setInitialLoad(true);
      try {
        const data = await projectTaskService.getAll(projectId);
        if (!cancelled) applyTasks(data);
      } catch {
        if (!cancelled) applyTasks([]);
      } finally {
        if (!cancelled) setInitialLoad(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, applyTasks]);

  const displayTasks = editMode ? draftTasks.filter((t) => !t._deleted) : tasks;

  const hasPendingChanges = editMode && (() => {
    const active = draftTasks.filter((t) => !t._deleted);
    if (draftTasks.some((t) => t._deleted || t._isNew || t._edited)) return true;
    return !ordersEqual(active, baselineOrder);
  })();

  const enterEditMode = () => {
    const draft = toDraft(tasks);
    setDraftTasks(draft);
    setBaselineOrder(draft);
    setEditMode(true);
  };

  const exitEditMode = () => {
    setEditMode(false);
    setDraftTasks([]);
    setBaselineOrder([]);
    setDragIndex(null);
  };

  const handleEditToggle = async () => {
    if (!editMode) {
      enterEditMode();
      return;
    }
    if (!hasPendingChanges) {
      exitEditMode();
      return;
    }
    await applyDraftChanges();
  };

  const handleToggle = async (task: TaskRow) => {
    if (!canEdit || editMode) return;
    const done = task.status === 'Terminé';
    const nextStatus = done ? 'À faire' : 'Terminé';
    const prev = tasksRef.current;
    const optimistic = prev.map((t) =>
      t.id === task.id ? { ...t, status: nextStatus } : t,
    );
    setTasks(optimistic);
    tasksRef.current = optimistic;
    onProgressChange?.(calcProgress(optimistic));
    try {
      await projectTaskService.updateStatus(projectId, task.id as number, {
        status: nextStatus,
        progress: done ? 0 : 100,
      });
    } catch {
      setTasks(prev);
      tasksRef.current = prev;
      onProgressChange?.(calcProgress(prev));
      notify(t('projects.tasks.status_error'), 'error');
    }
  };

  const markDelete = (taskId: number | string) => {
    setDraftTasks((list) =>
      list.map((t) => (t.id === taskId ? { ...t, _deleted: true } : t)),
    );
  };

  const moveDraft = (from: number, to: number) => {
    const visible = draftTasks.filter((t) => !t._deleted);
    if (to < 0 || to >= visible.length || from === to) return;
    const reordered = [...visible];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const deleted = draftTasks.filter((t) => t._deleted);
    const withFlags = reordered.map((t, i) => ({
      ...t,
      position: i,
      _moved: !ordersEqual(reordered, baselineOrder),
    }));
    setDraftTasks([...withFlags, ...deleted]);
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    moveDraft(dragIndex, dropIndex);
    setDragIndex(null);
  };

  const openCreateDraft = () => {
    setEditingDraft(null);
    setForm({ title: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditDraft = (task: TaskRow) => {
    setEditingDraft(task);
    setForm({ title: task.title, description: task.description || '' });
    setIsModalOpen(true);
  };

  const handleDraftFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      notify(t('projects.tasks.title_required'), 'error');
      return;
    }
    if (editingDraft) {
      setDraftTasks((list) =>
        list.map((t) =>
          t.id === editingDraft.id
            ? {
                ...t,
                title: form.title.trim(),
                description: form.description.trim() || null,
                _edited: !t._isNew,
              }
            : t,
        ),
      );
    } else {
      const tempId = `new-${Date.now()}`;
      setDraftTasks((list) => [
        ...list,
        {
          id: tempId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: 'À faire',
          position: list.filter((t) => !t._deleted).length,
          _isNew: true,
        },
      ]);
    }
    setIsModalOpen(false);
  };

  const applyDraftChanges = async () => {
    setApplying(true);
    try {
      const deleted = draftTasks.filter((t) => t._deleted && typeof t.id === 'number');
      for (const t of deleted) {
        await projectTaskService.remove(projectId, t.id as number);
      }

      const idMap = new Map<string, number>();
      const active = sortByPosition(draftTasks.filter((t) => !t._deleted));

      for (const t of active) {
        if (t._isNew) {
          const created = await projectTaskService.create(projectId, {
            title: t.title,
            description: t.description || null,
            status: t.status,
            progress: t.status === 'Terminé' ? 100 : 0,
            position: t.position ?? 0,
          });
          idMap.set(String(t.id), created.id);
        } else if (t._edited) {
          await projectTaskService.update(projectId, t.id as number, {
            title: t.title,
            description: t.description || null,
          });
        }
      }

      const orderedIds = active.map((t) =>
        t._isNew ? idMap.get(String(t.id))! : (t.id as number),
      );
      await projectTaskService.reorder(projectId, orderedIds);

      const fresh = await projectTaskService.getAll(projectId);
      applyTasks(fresh);
      exitEditMode();
      notify(t('projects.tasks.changes_applied'), 'success');
    } catch (err: any) {
      notify(err?.message || t('projects.tasks.apply_error'), 'error');
    } finally {
      setApplying(false);
    }
  };

  const completedCount = displayTasks.filter((task) => task.status === 'Terminé').length;

  if (initialLoad) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-bold">
            {t('projects.tasks.tasks_completed', { completed: completedCount, total: displayTasks.length })}
          </span>
          {editMode && hasPendingChanges && (
            <span className="text-amber-600 font-bold">{t('projects.tasks.pending_changes')}</span>
          )}
          {applying && <span className="text-[var(--color-primary)]">{t('projects.tasks.applying')}</span>}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && editMode && (
            <Button size="sm" variant="outline" onClick={openCreateDraft} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> {t('projects.tasks.add_task')}
            </Button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={handleEditToggle}
              disabled={applying}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                editMode
                  ? hasPendingChanges
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
              aria-label={editMode ? t('projects.tasks.validate_changes') : t('projects.tasks.enter_edit_mode')}
            >
              {editMode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {hasPendingChanges ? t('projects.tasks.validate') : t('common.done')}
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  {t('common.edit')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {displayTasks.length > 0 ? (
        <ul className="space-y-2">
          {displayTasks.map((task, index) => {
            const done = task.status === 'Terminé';
            return (
              <li
                key={String(task.id)}
                draggable={editMode && !applying}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white transition-all duration-200',
                  done && !editMode && 'border-emerald-100 bg-emerald-50/40',
                  !done && !editMode && 'border-slate-200',
                  editMode && task._isNew && 'border-blue-300 bg-blue-50/50',
                  editMode && task._edited && 'border-amber-300 bg-amber-50/40',
                  editMode && task._moved && 'ring-1 ring-amber-200',
                  dragIndex === index && 'opacity-60 scale-[0.99]',
                )}
              >
                {editMode && (
                  <span className="text-slate-300 cursor-grab active:cursor-grabbing shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </span>
                )}

                {!editMode && (
                  <button
                    type="button"
                    onClick={() => handleToggle(task)}
                    disabled={!canEdit}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                      done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 hover:border-[var(--color-primary)]',
                    )}
                    aria-label={done ? t('projects.tasks.mark_undone') : t('projects.tasks.mark_done')}
                  >
                    {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold text-slate-900', done && !editMode && 'line-through text-slate-500')}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
                  )}
                </div>

                {editMode && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveDraft(index, index - 1)}
                      disabled={index === 0 || applying}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      aria-label={t('projects.tasks.move_up')}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraft(index, index + 1)}
                      disabled={index === displayTasks.length - 1 || applying}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      aria-label={t('projects.tasks.move_down')}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditDraft(task)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => markDelete(task.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">{t('projects.tasks.checklist_empty')}</p>
          {canEdit && !editMode && (
            <Button size="sm" onClick={enterEditMode} className="mt-3 gap-1">
              <Pencil className="w-3.5 h-3.5" /> {t('projects.tasks.manage_tasks')}
            </Button>
          )}
        </div>
      )}

      {editMode && draftTasks.some((t) => t._deleted) && (
        <ul className="space-y-2 pt-2 border-t border-dashed border-red-200">
          {draftTasks
            .filter((t) => t._deleted)
            .map((task) => (
              <li
                key={`del-${task.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-red-300 bg-red-50"
              >
                <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm font-bold text-red-700 line-through flex-1">{task.title}</p>
                <button
                  type="button"
                  onClick={() =>
                    setDraftTasks((list) =>
                      list.map((t) => (t.id === task.id ? { ...t, _deleted: false } : t)),
                    )
                  }
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  {t('common.cancel')}
                </button>
              </li>
            ))}
        </ul>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDraft ? t('projects.modals.edit_task') : t('projects.modals.new_task')}
        size="md"
      >
        <form onSubmit={handleDraftFormSubmit} className="space-y-4">
          <Input
            label={t('projects.modals.task_title')}
            required
            value={form.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((p) => ({ ...p, title: e.target.value }))
            }
          />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('projects.modals.task_description')}</label>
            <textarea
              value={form.description}
              rows={3}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{editingDraft ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
