const { Op } = require('sequelize');
const db = require('../models');
const sequelize = require('../config/db');

async function findChefByMatricule(matricule) {
  const m = String(matricule || '').trim().toLowerCase();
  if (!m) return null;
  return db.ChefChantier.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('matricule')),
      m,
    ),
  });
}

function isChefEmployee(employee) {
  const r = String(employee?.role || '').toLowerCase();
  return r.includes('chef') && r.includes('chantier');
}

/**
 * IDs des chantiers accessibles au chef (chefId + réparation via fiche employé).
 */
async function resolveChefProjectIds(chefUser) {
  const chefId = Number(chefUser?.id);
  if (!chefId) return [];

  const byChefId = await db.Project.findAll({
    where: { chefId },
    attributes: ['id'],
  });
  if (byChefId.length) {
    return byChefId.map((p) => p.id);
  }

  const chefAccount = await db.ChefChantier.findByPk(chefId);
  const matricule = chefAccount?.matricule || chefUser?.matricule;
  if (!matricule) return [];

  const emp = await db.Employee.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('matricule')),
      String(matricule).trim().toLowerCase(),
    ),
  });
  if (!emp?.projectId) return [];

  const project = await db.Project.findByPk(emp.projectId);
  if (!project) return [];

  if (!project.chefId) {
    await project.update({ chefId });
  } else if (Number(project.chefId) !== chefId) {
    return [];
  }

  return [project.id];
}

/**
 * Quand un chef est affecté en tant qu'employé à un chantier, lier Project.chefId.
 */
async function syncChefProjectFromEmployee(employee, { oldProjectId, newProjectId } = {}) {
  const chef = await findChefByMatricule(employee?.matricule);
  if (!chef) return;

  const chefId = chef.id;
  const prevId = oldProjectId != null ? Number(oldProjectId) : null;
  const nextId = newProjectId != null ? Number(newProjectId) : null;

  if (prevId && prevId > 0) {
    await db.Project.update(
      { chefId: null },
      { where: { id: prevId, chefId } },
    );
  }

  if (nextId && nextId > 0) {
    await db.Project.update(
      { chefId: null },
      { where: { chefId, id: { [Op.ne]: nextId } } },
    );
    await db.Project.update(
      { chefId },
      { where: { id: nextId } },
    );
  }
}

module.exports = {
  findChefByMatricule,
  isChefEmployee,
  resolveChefProjectIds,
  syncChefProjectFromEmployee,
};
