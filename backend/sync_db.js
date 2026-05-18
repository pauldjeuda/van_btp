require('dotenv').config();
const sequelize = require('./config/db');
require('./models');

const sync = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection OK');
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
};

sync();
