const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.employeeId) where.employeeId = req.query.employeeId;
  if (req.query.date) where.date = req.query.date;
  if (req.query.status) where.status = req.query.status;

  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    if (!req.query.projectId) where.projectId = projects.map(p => p.id);
  }

  if (req.role === 'Technicien_chantier') {
    const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
    where.employeeId = emp ? emp.id : -1;
  }

  const records = await db.Attendance.findAll({
    where,
    include: [
      { model: db.Employee, as: 'employee', attributes: ['id', 'name', 'matricule', 'role'] },
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
    ],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
  });
  return success(res, records);
});

exports.bulkCreate = asyncHandler(async (req, res) => {
  const { projectId, date, records } = req.body;
  if (!projectId || !date || !Array.isArray(records) || !records.length) {
    return badRequest(res, 'projectId, date et records[] sont obligatoires');
  }

  const created_records = [];
  // Résoudre l'ID employé correspondant à l'utilisateur connecté (si technicien)
  let requesterEmployeeId = null;
  if (req.role === 'Technicien_chantier') {
    const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
    if (emp) requesterEmployeeId = emp.id;
  }

  for (const r of records) {
    if (!r.employeeId) continue;

    // Sécurité : un technicien ne peut pointer que pour lui-même
    if (req.role === 'Technicien_chantier' && Number(r.employeeId) !== Number(requesterEmployeeId)) {
      continue;
    }

    // Calculer les minutes de retard (heure standard 07h30)
    let lateMinutes = 0;
    const statusToUse = r.status || 'Présent';
    if (r.arrivalTime && statusToUse === 'Présent') {
      const [h, m] = r.arrivalTime.split(':').map(Number);
      const arrivalMins = h * 60 + m;
      const standardMins = 7 * 60 + 30;
      if (arrivalMins > standardMins) lateMinutes = arrivalMins - standardMins;
    }

    // Recherche d'un enregistrement existant pour cet employé à cette date
    let attendanceRecord = await db.Attendance.findOne({
      where: { employeeId: r.employeeId, date }
    });

    if (attendanceRecord) {
      // Mise à jour : on ne remplace que ce qui est envoyé
      await attendanceRecord.update({
        projectId: projectId, // Au cas où le chantier a changé
        arrivalTime: r.arrivalTime || attendanceRecord.arrivalTime,
        departureTime: r.departureTime || attendanceRecord.departureTime,
        status: lateMinutes > 0 ? 'Retard' : (r.status || attendanceRecord.status),
        lateMinutes: lateMinutes || attendanceRecord.lateMinutes,
        note: r.note || attendanceRecord.note,
        recordedBy: req.user.id,
      });
    } else {
      // Création
      attendanceRecord = await db.Attendance.create({
        employeeId: r.employeeId,
        projectId,
        date,
        arrivalTime: r.arrivalTime || null,
        departureTime: r.departureTime || null,
        status: lateMinutes > 0 ? 'Retard' : (r.status || 'Présent'),
        lateMinutes,
        note: r.note || null,
        recordedBy: req.user.id,
      });
    }
    created_records.push(attendanceRecord);
  }

  await db.Log.create({
    action: `Pointage enregistré : ${created_records.length} employé(s) — ${date}`,
    module: 'Ressources', entityType: 'Attendance', entityId: projectId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

  return success(res, created_records, 'Pointage enregistré avec succès');
});

exports.getHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if (req.role === 'Technicien_chantier') {
    const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
    if (!emp || Number(employeeId) !== Number(emp.id)) {
      return forbidden(res, 'Vous ne pouvez consulter que votre propre historique');
    }
  }

  const records = await db.Attendance.findAll({
    where: { employeeId },
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    order: [['date', 'DESC']],
    limit: 90,
  });
  return success(res, records);
});
