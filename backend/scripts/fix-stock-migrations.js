/**
 * Répare l'état migrations stock : enregistre la migration catalogue si la table existe déjà,
 * puis applique materialId sur stock_movements.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const db = require('../models');

const CATALOG_MIGRATION = '20260525130000-create-stock-materials.js';

async function main() {
  await db.sequelize.authenticate();
  const [tables] = await db.sequelize.query("SHOW TABLES LIKE 'stock_materials'");
  if (tables.length) {
    const [existing] = await db.sequelize.query(
      'SELECT name FROM SequelizeMeta WHERE name = :name',
      { replacements: { name: CATALOG_MIGRATION } },
    );
    if (!existing.length) {
      await db.sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (:name)', {
        replacements: { name: CATALOG_MIGRATION },
      });
      console.log(`✅ Migration ${CATALOG_MIGRATION} marquée comme appliquée`);
    } else {
      console.log(`ℹ️  ${CATALOG_MIGRATION} déjà enregistrée`);
    }
  }
  await db.sequelize.close();

  execSync('npx sequelize-cli db:migrate', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
