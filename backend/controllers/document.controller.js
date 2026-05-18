const asyncHandler = require('../middlewares/asyncHandler');
const path = require('path');
const fs = require('fs');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.type) where.type = req.query.type;
  const documents = await db.Document.findAll({
    where,
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
  return success(res, documents);
});

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'Aucun fichier fourni');
  const { name, type, projectId } = req.body;
  const fileSizeKb = Math.round(req.file.size / 1024);
  const fileSize = fileSizeKb > 1024
    ? `${(fileSizeKb / 1024).toFixed(1)} MB`
    : `${fileSizeKb} KB`;

  const document = await db.Document.create({
    name: name || req.file.originalname,
    type: type || 'Autre',
    filePath: `/uploads/documents/${req.file.filename}`,
    fileSize,
    mimeType: req.file.mimetype,
    projectId: projectId || null,
    uploadedBy: req.user.id,
    uploadedByRole: req.role,
  });
  await db.Log.create({
    action: `Document uploadé : ${document.name}`,
    module: 'GED', entityType: 'Document', entityId: document.id,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });
  return created(res, document, 'Document uploadé avec succès');
});

exports.download = asyncHandler(async (req, res) => {
  const document = await db.Document.findByPk(req.params.id);
  if (!document) return notFound(res, 'Document introuvable');
  const fullPath = path.join(__dirname, '..', document.filePath);
  if (!fs.existsSync(fullPath)) return notFound(res, 'Fichier physique introuvable');
  res.download(fullPath, document.name);
});

exports.remove = asyncHandler(async (req, res) => {
  const document = await db.Document.findByPk(req.params.id);
  if (!document) return notFound(res, 'Document introuvable');
  // Supprimer le fichier physique
  const fullPath = path.join(__dirname, '..', document.filePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  await document.destroy();
  return success(res, null, 'Document supprimé');
});
