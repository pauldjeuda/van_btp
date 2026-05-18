const db = require('./models');

async function check() {
  try {
    const movements = await db.StockMovement.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    console.log('--- Derniers mouvements ---');
    movements.forEach(m => {
      console.log(`ID: ${m.id}, Item: ${m.item}, Type: ${m.type}, ProjectID: ${m.projectId}, CreatedAt: ${m.createdAt}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

check();
