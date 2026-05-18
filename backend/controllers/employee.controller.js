const db           = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getChefProjectIds = async (chefId) => {
  const projects = await db.Project.findAll({ where: { chefId }, attributes: ['id'] });
  return projects.map(p => p.id);
};

const logAction = (action, module, entityType, entityId, req) =>
  db.Log.create({
    action, module, entityType, entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

const EMPLOYEE_INCLUDE = [
  { model: db.Project, as: 'currentProject', attributes: ['id', 'name'] },
];

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;

  if (req.role === 'Chef_chantier') {
    where.projectId = await getChefProjectIds(req.user.id);
  } else if (req.role === 'Technicien_chantier') {
    // Le technicien voit les gens de son projet, ou juste lui-même s'il n'est pas assigné
    const matricule = (req.user.matricule || '').trim().toLowerCase();
    const emp = await db.Employee.findOne({ 
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('matricule')),
        matricule
      )
    });
    if (emp?.projectId) {
      where.projectId = emp.projectId;
    } else {
      // Pas assigné : on ne retourne que lui-même pour qu'il puisse au moins se trouver dans le Dashboard
      const searchMatricule = (req.user.matricule || '').trim().toLowerCase();
      where[Op.and] = [
        db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('matricule')),
          searchMatricule
        )
      ];
    }
  }
  // RH voit tout le personnel sans filtre supplémentaire

  const employees = await db.Employee.findAll({
    where,
    include: EMPLOYEE_INCLUDE,
    order: [['name', 'ASC']],
  });
  return success(res, employees);
});

exports.getById = asyncHandler(async (req, res) => {
  const emp = await db.Employee.findByPk(req.params.id, {
    include: [
      ...EMPLOYEE_INCLUDE,
      {
        model: db.EmployeeAssignment,
        as: 'assignments',
        include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      },
    ],
  });
  if (!emp) return notFound(res, 'Employé introuvable');
  return success(res, emp);
});

exports.create = asyncHandler(async (req, res) => {
  const { matricule, name, role, contract, projectId } = req.body;
  if (!matricule || !name || !role) {
    return badRequest(res, 'Matricule, nom et rôle sont obligatoires');
  }

  const existing = await db.Employee.findOne({ where: { matricule } });

  if (existing) {
    await existing.update({ name, role, contract, projectId, ...req.body });
    if (projectId && !existing.projectId) {
      await db.EmployeeAssignment.create({ employeeId: existing.id, projectId, startDate: new Date() });
    }
    await logAction(`Mise à jour de l'employé : ${name}`, 'Ressources', 'Employee', existing.id, req);
    return success(res, existing, 'Employé mis à jour avec succès');
  }

  const employee = await db.Employee.create({ matricule, name, role, contract, projectId, ...req.body });
  if (projectId) {
    await db.EmployeeAssignment.create({ employeeId: employee.id, projectId, startDate: new Date() });
  }
  await logAction(`Ajout de l'employé : ${name}`, 'Ressources', 'Employee', employee.id, req);
  return created(res, employee, 'Employé créé avec succès');
});

exports.update = asyncHandler(async (req, res) => {
  const emp = await db.Employee.findByPk(req.params.id);
  if (!emp) return notFound(res, 'Employé introuvable');

  const oldProjectId = emp.projectId;
  await emp.update(req.body);

  if (req.body.projectId && req.body.projectId !== oldProjectId) {
    await db.EmployeeAssignment.create({
      employeeId: emp.id, projectId: req.body.projectId, startDate: new Date(),
    });
  }
  return success(res, emp, 'Employé mis à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const emp = await db.Employee.findByPk(req.params.id);
  if (!emp) return notFound(res, 'Employé introuvable');
  await emp.destroy();
  return success(res, null, 'Employé supprimé');
});

exports.unassign = asyncHandler(async (req, res) => {
  const emp = await db.Employee.findByPk(req.params.id);
  if (!emp) return notFound(res, 'Employé introuvable');
  await emp.update({ projectId: null });
  await logAction(`Désaffectation de l'employé : ${emp.name}`, 'Ressources', 'Employee', emp.id, req);
  return success(res, emp, 'Employé désaffecté avec succès');
});
