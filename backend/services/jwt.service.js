/**
 * services/jwt.service.js
 * Gestion des tokens JWT avec clés RSA-2048 par rôle.
 * Access token  : RS256, courte durée (15min par défaut)
 * Refresh token : HS256 avec secret dédié, longue durée (7j par défaut)
 */
const jwt  = require('jsonwebtoken');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ACCESS_EXPIRES_IN  = process.env.JWT_EXPIRES_IN         || '24h';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '24h';
const REFRESH_SECRET     = process.env.JWT_REFRESH_SECRET     || crypto.randomBytes(64).toString('hex');

// ─── Clés RSA par rôle (access token) ────────────────────────────────────────

/** Dossiers .private existants (ancien nom directeur_technique conservé). */
const ROLE_RSA_DIRS = {
  'directeur technique': 'directeur_technique',
  'directeur_technique': 'directeur_technique',
  'gestionnaire de stocks': 'gerant_stock',
  gerant_stock: 'gerant_stock',
};

const getRoleKeyDir = (role) => ROLE_RSA_DIRS[role.toLowerCase()] ?? role.toLowerCase();

const getKeys = (role) => {
  const dir         = path.join(__dirname, '../.private', getRoleKeyDir(role));
  const privatePath = path.join(dir, 'private.pem');
  const publicPath  = path.join(dir, 'public.pem');

  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
    throw new Error(
      `Clés RSA introuvables pour le rôle "${role}". Exécutez : npm run generate-keys`
    );
  }

  return {
    privateKey: fs.readFileSync(privatePath, 'utf8'),
    publicKey:  fs.readFileSync(publicPath,  'utf8'),
  };
};

// ─── Access Token (RS256, courte durée) ──────────────────────────────────────

const generateToken = (user, role) => {
  const { privateKey } = getKeys(role);
  return jwt.sign(
    { id: user.id, matricule: user.matricule, role, nom: user.nom, prenom: user.prenom },
    privateKey,
    { algorithm: 'RS256', expiresIn: ACCESS_EXPIRES_IN }
  );
};

const verifyToken = (token, role) => {
  const { publicKey } = getKeys(role);
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
};

const decodeToken = (token) => {
  try { return jwt.decode(token); }
  catch { return null; }
};

// ─── Refresh Token (HS256, longue durée) ─────────────────────────────────────

/**
 * Génère un refresh token opaque + son payload JWT signé en HS256.
 * On stocke le token haché en DB pour la sécurité.
 */
const generateRefreshToken = (user, role) => {
  // On ajoute un jti (JWT ID) unique pour s'assurer que même générés dans la même seconde,
  // les tokens soient physiquement différents en DB.
  const payload = { 
    id: user.id, 
    role, 
    type: 'refresh',
    jti: crypto.randomUUID()
  };
  const token   = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  // Calculer la date d'expiration
  const decoded   = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  return { token, expiresAt };
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

// Durée en ms pour le cookie
const getRefreshExpiresMs = () => {
  const match = REFRESH_EXPIRES_IN.match(/^(\d+)([dhm])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // 7j par défaut
  const [, num, unit] = match;
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(num) * multipliers[unit];
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshExpiresMs,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
};
