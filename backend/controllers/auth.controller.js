/**
 * controllers/auth.controller.js
 * Authentification — Login par matricule/mot de passe avec JWT RSA par rôle.
 * Architecture "Bulletproof Refresh" : Transactions, Rotation & Sécurité.
 */
const bcrypt = require('bcryptjs');
const db = require('../models');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshExpiresMs,
} = require('../services/jwt.service');
const { success, unauthorized, badRequest, error } = require('../utils/response');

// ─── Map rôle → modèle Sequelize ─────────────────────────────────────────────

const ROLE_MODELS = {
  'Directeur technique': db['Directeur technique'],
  Chef_chantier: db.ChefChantier,
  Gerant_production: db.GerantProduction,
  'Gestionnaire de stocks': db.GerantStock,
};

// ─── Helpers cookie ───────────────────────────────────────────────────────────

const COOKIE_NAME = 'van_btp_refresh';

const setRefreshCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
};

// ─── Actions ──────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { matricule, password } = req.body;

    if (!matricule || !password) return badRequest(res, 'Matricule et mot de passe requis');

    // Chercher l'utilisateur dans les tables de rôles
    let foundUser = null;
    let foundRole = null;

    for (const [role, Model] of Object.entries(ROLE_MODELS)) {
      const user = await Model.findOne({ where: { matricule } });
      if (user) {
        foundUser = user;
        foundRole = role;
        break;
      }
    }

    if (!foundUser) return unauthorized(res, 'Matricule ou mot de passe incorrect');
    
    const isValid = await bcrypt.compare(password, foundUser.motDePasse);
    if (!isValid) return unauthorized(res, 'Matricule ou mot de passe incorrect');
    if (foundUser.actif === false) return unauthorized(res, 'Compte désactivé');

    // Générer les tokens
    const accessToken = generateToken(foundUser, foundRole);
    const { token: refreshToken, expiresAt } = generateRefreshToken(foundUser, foundRole);

    // Rotation : Invalider les anciens tokens
    await db.RefreshToken.update({ revoked: true }, { 
      where: { userId: foundUser.id, userRole: foundRole, revoked: false } 
    });

    // Créer le nouveau
    await db.RefreshToken.create({
      token: refreshToken,
      userId: foundUser.id,
      userRole: foundRole,
      expiresAt,
      userAgent: req.headers['user-agent']?.slice(0, 255) || null,
      ipAddress: (req.ip || '').slice(0, 45),
    });

    setRefreshCookie(res, refreshToken);

    // Structure conforme à VAN RH
    return res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: foundUser.id,
        matricule: foundUser.matricule,
        nom: foundUser.nom,
        prenom: foundUser.prenom,
        email: foundUser.email,
        avatar: foundUser.photoUrl,
        role: foundRole,
        doitChangerMotDePasse: foundUser.doitChangerMotDePasse,
      },
      message: 'Connexion réussie',
    });

  } catch (err) {
    console.error('[AUTH] login error:', err);
    return error(res, 'Erreur serveur lors de la connexion', 500);
  }
};

exports.refresh = async (req, res) => {
  try {
    console.log('--- [DEBUG] Refresh attempt ---');
    console.log('Headers:', req.headers.cookie);
    console.log('Cookies parsed:', req.cookies);

    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      console.log('❌ [DEBUG] No cookie found in req.cookies');
      return unauthorized(res, 'Session expirée (pas de cookie)');
    }

    // Vérifier la signature du token
    let payload;
    try {
      payload = verifyRefreshToken(token);
      console.log('✅ [DEBUG] Token payload verified:', payload.id);
    } catch (e) {
      console.log('❌ [DEBUG] Token verification failed:', e.message);
      clearRefreshCookie(res);
      return unauthorized(res, 'Session invalide');
    }

    // --- LOGIQUE TRANSACTIONNELLE BULLETPROOF ---
    const result = await db.sequelize.transaction(async (t) => {
      // 1. Chercher et verrouiller le token actuel
      const stored = await db.RefreshToken.findOne({
        where: { token },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      // 2. Détection de réutilisation ou révocation
      if (!stored || stored.revoked) {
        if (stored?.replacedByToken) {
          // Tentative de rejeu détectée ! On révoque tout par sécurité
          await db.RefreshToken.update({ revoked: true }, {
            where: { userId: payload.id, userRole: payload.role },
            transaction: t
          });
        }
        throw new Error('REUSE_DETECTION');
      }

      // 3. Vérifier expiration
      if (new Date() > stored.expiresAt) {
        await stored.update({ revoked: true }, { transaction: t });
        throw new Error('EXPIRED');
      }

      // 4. Récupérer l'utilisateur
      const Model = ROLE_MODELS[stored.userRole];
      const user = await Model.findByPk(stored.userId, {
        attributes: { exclude: ['motDePasse'] },
        transaction: t
      });

      if (!user || user.actif === false) throw new Error('USER_INACTIVE');

      // 5. Rotation : Générer les nouveaux
      const newAccessToken = generateToken(user, stored.userRole);
      const { token: newRefreshToken, expiresAt } = generateRefreshToken(user, stored.userRole);

      // 6. Mettre à jour l'ancien et créer le nouveau
      await stored.update({ revoked: true, replacedByToken: newRefreshToken }, { transaction: t });
      await db.RefreshToken.create({
        token: newRefreshToken,
        userId: user.id,
        userRole: stored.userRole,
        expiresAt,
        userAgent: req.headers['user-agent']?.slice(0, 255) || null,
        ipAddress: (req.ip || '').slice(0, 45),
      }, { transaction: t });

      return { newAccessToken, newRefreshToken, user, role: stored.userRole };
    });

    const { newAccessToken, newRefreshToken, user, role } = result;

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        avatar: user.photoUrl,
        role: role,
      },
      message: 'Session renouvelée',
    });

  } catch (err) {
    console.error('[AUTH] refresh error:', err.message);
    clearRefreshCookie(res);
    const msg = err.message === 'REUSE_DETECTION' ? 'Alerte sécurité : session déjà utilisée' : 
                err.message === 'EXPIRED' ? 'Session expirée' : 'Erreur de session';
    return error(res, msg, 401);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await db.RefreshToken.update({ revoked: true }, { where: { token } });
    }
    clearRefreshCookie(res);
    return success(res, null, 'Déconnexion réussie');
  } catch (err) {
    return error(res, 'Erreur lors de la déconnexion', 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const Model = ROLE_MODELS[role];
    if (!Model) return badRequest(res, 'Rôle inconnu');

    const user = await Model.findByPk(id, {
      attributes: { exclude: ['motDePasse'] },
    });

    if (!user) return unauthorized(res, 'Utilisateur introuvable');
    return success(res, { user, role });
  } catch (err) {
    return error(res, 'Erreur récupération profil', 500);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) return badRequest(res, 'Champs requis');
    if (newPassword.length < 6) return badRequest(res, '6 caractères min');

    const Model = ROLE_MODELS[role];
    const user = await Model.findByPk(id);
    if (!user) return unauthorized(res, 'Utilisateur introuvable');

    const isValid = await bcrypt.compare(currentPassword, user.motDePasse);
    if (!isValid) return badRequest(res, 'Mot de passe actuel incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ motDePasse: hashed, doitChangerMotDePasse: false });

    return success(res, null, 'Mot de passe modifié');
  } catch (err) {
    return error(res, 'Erreur modification mot de passe', 500);
  }
};
