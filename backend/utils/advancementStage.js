/** Calcule statut tâche selon l'étape d'avancement sélectionnée (index inclus = terminé). */
function taskFieldsForStageIndex(index, stageIndex) {
  if (stageIndex < 0) return { status: 'À faire', progress: 0 };
  if (index <= stageIndex) return { status: 'Terminé', progress: 100 };
  return { status: 'À faire', progress: 0 };
}

/** Étape d'avancement = dernière tâche terminée, sinon la première de la liste. */
function computeStageFromTasks(tasks) {
  const ordered = [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
  const lastDone = [...ordered].reverse().find((t) => t.status === 'Terminé');
  if (lastDone) return lastDone.title;
  return '';
}

function computeProgressFromTasks(tasks) {
  const total = tasks.length;
  if (total === 0) return 0;
  const done = tasks.filter((t) => t.status === 'Terminé').length;
  return Math.round((done / total) * 100);
}

/** Applique une étape d'avancement sur les tâches d'un chantier (match par titre). */
async function syncTasksToAdvancementStage(db, projectId, stageTitle) {
  const tasks = await db.ProjectTask.findAll({
    where: { projectId },
    order: [['position', 'ASC'], ['id', 'ASC']],
  });
  if (!tasks.length) return { progress: 0, status: stageTitle || '' };

  const stageIndex = stageTitle
    ? tasks.findIndex((t) => t.title === stageTitle)
    : -1;

  for (let i = 0; i < tasks.length; i++) {
    const fields = taskFieldsForStageIndex(i, stageIndex);
    await tasks[i].update(fields);
  }

  const progress = stageIndex >= 0
    ? computeProgressFromTasks(tasks.map((t, i) => ({ ...t.toJSON(), ...taskFieldsForStageIndex(i, stageIndex) })))
    : 0;

  return { progress, status: stageTitle || computeStageFromTasks(tasks) };
}

module.exports = {
  taskFieldsForStageIndex,
  computeStageFromTasks,
  computeProgressFromTasks,
  syncTasksToAdvancementStage,
};
