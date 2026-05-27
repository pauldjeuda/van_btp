const db           = require('../models');
const { Op }       = require('sequelize');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');
const { resolveChefProjectIds, syncChefProjectFromEmployee } = require('../utils/chefProjectAccess');

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
    const projectIds = await resolveChefProjectIds(req.user);
    if (projectIds.length === 0) {
      return success(res, []);
    }
    where.projectId = { [Op.in]: projectIds };
  }
  // Directeur technique : tout le personnel (pas de filtre supplémentaire)

  let employees = await db.Employee.findAll({
    where,
    include: EMPLOYEE_INCLUDE,
    order: [['name', 'ASC']],
  });

  // Désaffecter uniquement si le chantier n'existe plus (pas seulement si la jointure est vide)
  const activeProjectIds = new Set(
    (await db.Project.findAll({ attributes: ['id'] })).map((p) => p.id),
  );
  const orphans = employees.filter(
    (emp) => emp.projectId && !activeProjectIds.has(Number(emp.projectId)),
  );
  if (orphans.length) {
    await Promise.all(orphans.map((emp) => emp.update({ projectId: null })));
    employees = await db.Employee.findAll({
      where,
      include: EMPLOYEE_INCLUDE,
      order: [['name', 'ASC']],
    });
  }

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
  const { matricule, name, role, contract, projectId, isLocal, weeklySalary } = req.body;
  if (!matricule || !name || !role) {
    return badRequest(res, 'Matricule, nom et rôle sont obligatoires');
  }

  const localWorker = isLocal === true || isLocal === 'true';
  if (localWorker) {
    const salary = parseFloat(weeklySalary);
    if (!Number.isFinite(salary) || salary <= 0) {
      return badRequest(res, 'Le salaire hebdomadaire est obligatoire pour un ouvrier local');
    }
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
    await syncChefProjectFromEmployee(employee, { newProjectId: projectId });
  }
  await logAction(`Ajout de l'employé : ${name}`, 'Ressources', 'Employee', employee.id, req);
  return created(res, employee, 'Employé créé avec succès');
});

exports.update = asyncHandler(async (req, res) => {
  const emp = await db.Employee.findByPk(req.params.id);
  if (!emp) return notFound(res, 'Employé introuvable');

  const oldProjectId = emp.projectId;
  await emp.update(req.body);
  await emp.reload();

  const newProjectId = emp.projectId;
  if (newProjectId !== oldProjectId) {
    if (newProjectId) {
      await db.EmployeeAssignment.create({
        employeeId: emp.id, projectId: newProjectId, startDate: new Date(),
      });
    }
    await syncChefProjectFromEmployee(emp, {
      oldProjectId,
      newProjectId: newProjectId || null,
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
  const oldProjectId = emp.projectId;
  await emp.update({ projectId: null });
  await syncChefProjectFromEmployee(emp, { oldProjectId, newProjectId: null });
  await logAction(`Désaffectation de l'employé : ${emp.name}`, 'Ressources', 'Employee', emp.id, req);
  return success(res, emp, 'Employé désaffecté avec succès');
});
