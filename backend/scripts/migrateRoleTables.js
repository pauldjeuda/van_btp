/**
 * scripts/migrateRoleTables.js
 * Renomme les anciennes tables de rôles vers les nouveaux noms.
 *
 * Anciennes → Nouvelles :
 *   dgs         → pdgs
 *   chefs       → chefs_chantier
 *   techniciens → techniciens_chantier
 *   rhs         → rhs (inchangé)
 *
 * Usage : node scripts/migrateRoleTables.js
 */
require('dotenv').config();
const sequelize = require('../config/db');

const migrations = [
  { from: 'dgs',         to: 'pdgs' },
  { from: 'chefs',       to: 'chefs_chantier' },
  { from: 'techniciens', to: 'techniciens_chantier' },
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL OK\n');

    const [tables] = await sequelize.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables existantes :', tableNames.join(', '), '\n');

    for (const { from, to } of migrations) {
      const fromExists = tableNames.includes(from);
      const toExists   = tableNames.includes(to);

      if (toExists) {
        console.log(`✅ ${to} existe déjà — aucune action`);
        continue;
      }

      if (!fromExists) {
        console.log(`ℹ️  ${from} introuvable — sera créée par sequelize.sync()`);
        continue;
      }

      await sequelize.query(`RENAME TABLE \`${from}\` TO \`${to}\``);
      console.log(`✅ ${from} → ${to}`);
    }

    // Synchroniser les nouveaux modèles (crée les tables manquantes)
    console.log('\nSynchronisation des modèles...');
    const db = require('../models');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronisées\n');

    console.log('Migration terminée. Lancez maintenant : node scripts/createUsers.js');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

run();
