/**
 * jobs/cleanupTokens.js
 * Job de nettoyage automatique des refresh tokens expirés ou révoqués.
 *
 * Stratégie :
 *   - Supprime les tokens expirés (expiresAt < maintenant)
 *   - Supprime les tokens révoqués de plus de 30 jours (sécurité + traçabilité courte)
 *   - Tourne toutes les nuits à 2h00 du matin
 *   - Journalise le résultat sans planter le serveur en cas d'échec
 */

const { Op } = require('sequelize');
const db      = require('../models');

// ─── Logique de nettoyage ─────────────────────────────────────────────────────

const runCleanup = async () => {
  try {
    const now     = new Date();
    const il30j   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Tokens expirés (quelle que soit leur révocation)
    const expiredCount = await db.RefreshToken.destroy({
      where: { expiresAt: { [Op.lt]: now } },
    });

    // 2. Tokens révoqués depuis plus de 30 jours
    const revokedCount = await db.RefreshToken.destroy({
      where: {
        revoked:   true,
        updatedAt: { [Op.lt]: il30j },
      },
    });

    const total = expiredCount + revokedCount;

    if (total > 0) {
      console.log(
        `[CleanupJob] ${new Date().toISOString()} — ` +
        `${expiredCount} token(s) expiré(s) + ${revokedCount} révoqué(s) supprimé(s)`
      );
    }
  } catch (err) {
    // Ne jamais planter le serveur — juste loguer
    console.error('[CleanupJob] Erreur nettoyage tokens :', err.message);
  }
};

// ─── Planification ────────────────────────────────────────────────────────────

const MS_PAR_HEURE  = 60 * 60 * 1000;
const MS_PAR_JOUR   = 24 * MS_PAR_HEURE;
const HEURE_CIBLE   = 2; // 2h00 du matin

/**
 * Calcule le délai en ms jusqu'au prochain 2h00.
 * Si on est après 2h00 aujourd'hui, on vise 2h00 demain.
 */
const msJusquauProchain2h = () => {
  const maintenant = new Date();
  const cible      = new Date(maintenant);

  cible.setHours(HEURE_CIBLE, 0, 0, 0);

  if (maintenant >= cible) {
    cible.setDate(cible.getDate() + 1);
  }

  return cible.getTime() - maintenant.getTime();
};

/**
 * Démarre le job :
 *   1. Premier run au prochain 2h00
 *   2. Puis toutes les 24h
 */
const startCleanupJob = () => {
  const delai = msJusquauProchain2h();
  const heures = (delai / MS_PAR_HEURE).toFixed(1);

  console.log(`[CleanupJob] Planifié — premier run dans ${heures}h (toutes les 24h ensuite)`);

  setTimeout(() => {
    runCleanup();
    setInterval(runCleanup, MS_PAR_JOUR);
  }, delai);
};

module.exports = { startCleanupJob, runCleanup };
