
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const sequelize = require('./config/db');
const db = require('./models');
const apiRouter = require('./router/index');
const errorHandler = require('./middlewares/errorHandler');
const { startCleanupJob } = require('./jobs/cleanupTokens');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://www.vanbtp.net',
  'https://vanbtp.net',
  'http://192.168.1.173:5073',
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://192.168.1.191:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, mobile, serveur)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Origine bloquée : ${origin}`);
    return callback(new Error(`CORS: origine non autorisée — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Pré-répondre aux requêtes OPTIONS (preflight)
app.options('*', cors());

// ─── Parsers JSON/URL ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// ─── Fichiers statiques (uploads) ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use(['/api', '/'], apiRouter);

// ─── Route santé (health check) ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'VAN BTP ERP',
    version: '1.0.0',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// ─── Gestionnaire d'erreurs global ───────────────────────────────────────────
app.use(errorHandler);

// ─── Démarrage ───────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL établie');

    await sequelize.sync({ alter: false });
    console.log('✅ Modèles Sequelize synchronisés');

    app.listen(PORT, () => {
      console.log(`\n VAN BTP ERP Backend démarré`);
      console.log(`   → http://localhost:${PORT}`);
      console.log(`   → Env : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   → Frontend autorisé : ${process.env.FRONTEND_URL}`);
      console.log(`   → Health : http://localhost:${PORT}/health\n`);

      // Démarrer le job de nettoyage des refresh tokens expirés
      startCleanupJob();
    });
  } catch (err) {
    console.error('❌ Erreur de démarrage :', err.message);
    process.exit(1);
  }
};

start();
