/**
 * services/upload.service.js
 * Configuration Multer pour l'upload de fichiers.
 * UPLOAD_PATH utilise __dirname pour être portable en prod.
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Chemin absolu basé sur la position du fichier — portable cPanel / VPS
const UPLOAD_BASE = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.join(__dirname, '..', 'uploads');

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

// Créer les dossiers au démarrage si absents
['documents', 'incidents', 'avatars'].forEach(dir => {
  const fullPath = path.join(UPLOAD_BASE, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`[Upload] Dossier créé : ${fullPath}`);
  }
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = req.uploadFolder || 'documents';
    cb(null, path.join(UPLOAD_BASE, folder));
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
