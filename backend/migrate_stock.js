const db = require('./models');

async function migrate() {
  try {
    console.log('Début de la migration...');
    const queryInterface = db.sequelize.getQueryInterface();
    
    // Rendre projectId nullable
    await queryInterface.changeColumn('stock_movements', 'projectId', {
      type: db.Sequelize.INTEGER,
      allowNull: true
    });
    
    console.log('Migration terminée avec succès : stock_movements.projectId est désormais NULLABLE.');
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de la migration:', err);
    process.exit(1);
  }
}

migrate();
