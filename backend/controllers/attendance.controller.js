const { Op } = require('sequelize');
const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');

const STANDARD_ARRIVAL_MINS = 7 * 60 + 30; // 07:30
const { resolveChefProjectIds } = require('../utils/chefProjectAccess');
const { buildPayrollRecap, getPeriodBounds } = require('../utils/payrollRecap');

const assertChefOwnsProject = async (chefUser, projectId) => {
  const project = await db.Project.findByPk(projectId);
  if (!project) return { ok: false, message: 'Chantier introuvable' };
  const allowed = await resolveChefProjectIds(chefUser);
  if (!allowed.includes(Number(projectId))) {
    return { ok: false, message: 'Vous ne gérez pas ce chantier' };
  }
  return { ok: true, project };
};

const assertEmployeeOnProject = async (employeeId, projectId) => {
  const emp = await db.Employee.findByPk(employeeId);
  if (!emp) return { ok: false, message: 'Employé introuvable' };
  if (Number(emp.projectId) !== Number(projectId)) {
    return { ok: false, message: 'Cet employé n\'est pas affecté à ce chantier' };
  }
  return { ok: true, employee: emp };
};

const computeLateMinutes = (arrivalTime) => {
  if (!arrivalTime) return 0;
  const [h, m] = arrivalTime.split(':').map(Number);
  const arrivalMins = h * 60 + m;
  return arrivalMins > STANDARD_ARRIVAL_MINS ? arrivalMins - STANDARD_ARRIVAL_MINS : 0;
};

const nowTimeHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ─── Liste paginée + filtres ───────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.employeeId) where.employeeId = req.query.employeeId;
  if (req.query.date) where.date = req.query.date;
  if (req.query.status) where.status = req.query.status;

  if (req.query.fromDate || req.query.toDate) {
    where.date = {};
    if (req.query.fromDate) where.date[Op.gte] = req.query.fromDate;
    if (req.query.toDate) where.date[Op.lte] = req.query.toDate;
  }

  if (req.role === 'Chef_chantier') {
    const projectIds = await resolveChefProjectIds(req.user);
    if (!projectIds.length) {
      return success(res, { records: [], pagination: { page, limit, total: 0, totalPages: 0 }, stats: {} });
    }
    if (req.query.projectId) {
      if (!projectIds.includes(Number(req.query.projectId))) {
        return forbidden(res, 'Accès refusé à ce chantier');
      }
    } else {
      where.projectId = { [Op.in]: projectIds };
    }
  }

  const { count, rows } = await db.Attendance.findAndCountAll({
    where,
    include: [
      { model: db.Employee, as: 'employee', attributes: ['id', 'name', 'matricule', 'role'] },
      { model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] },
    ],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset,
  });

  const statsWhere = { ...where };
  delete statsWhere.date;
  if (where.date) statsWhere.date = where.date;

  const allForStats = await db.Attendance.findAll({
    where,
    attributes: ['status'],
  });
  const stats = {
    total: count,
    present: allForStats.filter((r) => r.status === 'Présent').length,
    late: allForStats.filter((r) => r.status === 'Retard').length,
    absent: allForStats.filter((r) => r.status === 'Absent').length,
    halfDay: allForStats.filter((r) => r.status === 'Demi-journée').length,
  };

  return success(res, {
    records: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
    },
    stats,
  });
});

// ─── Pointage unitaire (chef) ──────────────────────────────────────────────────

exports.mark = asyncHandler(async (req, res) => {
  const { employeeId, projectId, date, action } = req.body;
  const workDate = date || new Date().toISOString().split('T')[0];

  if (!employeeId || !projectId || !action) {
    return badRequest(res, 'employeeId, projectId et action sont obligatoires');
  }

  const validActions = ['arrival', 'departure', 'absent', 'half_day', 'present'];
  if (!validActions.includes(action)) {
    return badRequest(res, `Action invalide. Valeurs : ${validActions.join(', ')}`);
  }

  if (req.role === 'Chef_chantier') {
    const projCheck = await assertChefOwnsProject(req.user, projectId);
    if (!projCheck.ok) return badRequest(res, projCheck.message);
  }

  const empCheck = await assertEmployeeOnProject(employeeId, projectId);
  if (!empCheck.ok) return badRequest(res, empCheck.message);

  let attendanceRecord = await db.Attendance.findOne({
    where: { employeeId, date: workDate },
  });

  const time = nowTimeHHMM();

  if (action === 'absent') {
    const payload = {
      employeeId,
      projectId,
      date: workDate,
      status: 'Absent',
      arrivalTime: null,
      departureTime: null,
      lateMinutes: 0,
      recordedBy: req.user.id,
    };
    if (attendanceRecord) await attendanceRecord.update(payload);
    else attendanceRecord = await db.Attendance.create(payload);
  } else if (action === 'half_day') {
    const payload = {
      employeeId,
      projectId,
      date: workDate,
      status: 'Demi-journée',
      arrivalTime: attendanceRecord?.arrivalTime || time,
      departureTime: null,
      lateMinutes: 0,
      recordedBy: req.user.id,
    };
    if (attendanceRecord) await attendanceRecord.update(payload);
    else attendanceRecord = await db.Attendance.create(payload);
  } else if (action === 'arrival' || action === 'present') {
    const lateMinutes = computeLateMinutes(time);
    const status = lateMinutes > 0 ? 'Retard' : 'Présent';
    const payload = {
      employeeId,
      projectId,
      date: workDate,
      arrivalTime: time,
      status,
      lateMinutes,
      recordedBy: req.user.id,
    };
    if (attendanceRecord) {
      await attendanceRecord.update({
        ...payload,
        departureTime: attendanceRecord.departureTime,
      });
    } else {
      attendanceRecord = await db.Attendance.create(payload);
    }
  } else if (action === 'departure') {
    if (!attendanceRecord) {
      return badRequest(res, 'Enregistrez d\'abord l\'arrivée ou la présence');
    }
    await attendanceRecord.update({
      departureTime: time,
      projectId,
      recordedBy: req.user.id,
    });
  }

  const full = await db.Attendance.findByPk(attendanceRecord.id, {
    include: [
      { model: db.Employee, as: 'employee', attributes: ['id', 'name', 'matricule', 'role'] },
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
    ],
  });

  await db.Log.create({
    action: `Pointage ${action} — employé #${employeeId} — ${workDate}`,
    module: 'Ressources',
    entityType: 'Attendance',
    entityId: attendanceRecord.id,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  });

  return success(res, full, 'Pointage enregistré');
});

// ─── Bulk (conservé) ───────────────────────────────────────────────────────────

exports.bulkCreate = asyncHandler(async (req, res) => {
  const { projectId, date, records } = req.body;
  if (!projectId || !date || !Array.isArray(records) || !records.length) {
    return badRequest(res, 'projectId, date et records[] sont obligatoires');
  }

  if (req.role === 'Chef_chantier') {
    const projCheck = await assertChefOwnsProject(req.user, projectId);
    if (!projCheck.ok) return badRequest(res, projCheck.message);
  }

  const created_records = [];

  for (const r of records) {
    if (!r.employeeId) continue;

    if (req.role === 'Chef_chantier') {
      const empCheck = await assertEmployeeOnProject(r.employeeId, projectId);
      if (!empCheck.ok) continue;
    }

    let lateMinutes = 0;
    const statusToUse = r.status || 'Présent';
    if (r.arrivalTime && statusToUse === 'Présent') {
      lateMinutes = computeLateMinutes(r.arrivalTime);
    }

    let attendanceRecord = await db.Attendance.findOne({
      where: { employeeId: r.employeeId, date },
    });

    const finalStatus = lateMinutes > 0 && r.status === 'Présent' ? 'Retard' : (r.status || 'Présent');

    if (attendanceRecord) {
      await attendanceRecord.update({
        projectId,
        arrivalTime: r.arrivalTime ?? attendanceRecord.arrivalTime,
        departureTime: r.departureTime ?? attendanceRecord.departureTime,
        status: finalStatus,
        lateMinutes: lateMinutes || attendanceRecord.lateMinutes,
        note: r.note ?? attendanceRecord.note,
        recordedBy: req.user.id,
      });
    } else {
      attendanceRecord = await db.Attendance.create({
        employeeId: r.employeeId,
        projectId,
        date,
        arrivalTime: r.arrivalTime || null,
        departureTime: r.departureTime || null,
        status: finalStatus,
        lateMinutes,
        note: r.note || null,
        recordedBy: req.user.id,
      });
    }
    created_records.push(attendanceRecord);
  }

  await db.Log.create({
    action: `Pointage enregistré : ${created_records.length} employé(s) — ${date}`,
    module: 'Ressources',
    entityType: 'Attendance',
    entityId: projectId,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  });

  return success(res, created_records, 'Pointage enregistré avec succès');
});

exports.getHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(90, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = { employeeId };
  if (req.query.fromDate || req.query.toDate) {
    where.date = {};
    if (req.query.fromDate) where.date[Op.gte] = req.query.fromDate;
    if (req.query.toDate) where.date[Op.lte] = req.query.toDate;
  }

  const { count, rows } = await db.Attendance.findAndCountAll({
    where,
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    order: [['date', 'DESC']],
    limit,
    offset,
  });

  return success(res, {
    records: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 0 },
  });
});

exports.getPayrollRecap = asyncHandler(async (req, res) => {
  const periodType = req.query.periodType === 'month' ? 'month' : 'week';
  const referenceDate = req.query.referenceDate || new Date().toISOString().split('T')[0];
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;

  const empWhere = {
    isLocal: true,
    weeklySalary: { [Op.gt]: 0 },
  };
  if (projectId) empWhere.projectId = projectId;

  const employees = await db.Employee.findAll({
    where: empWhere,
    include: [{ model: db.Project, as: 'currentProject', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  const { from, to } = getPeriodBounds(periodType, referenceDate);

  const attendanceWhere = {
    date: { [Op.between]: [from, to] },
    employeeId: { [Op.in]: employees.map((e) => e.id) },
  };
  if (projectId) attendanceWhere.projectId = projectId;

  const attendances = employees.length
    ? await db.Attendance.findAll({ where: attendanceWhere })
    : [];

  const recap = buildPayrollRecap({
    periodType,
    referenceDate,
    employees,
    attendances,
  });

  await db.Log.create({
    action: `Export récap paie ${periodType} — ${recap.period.label}`,
    module: 'Ressources',
    entityType: 'Attendance',
    entityId: projectId || 0,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  });

  return success(res, recap);
});
