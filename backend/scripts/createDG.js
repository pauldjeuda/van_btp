/**
 * scripts/createDG.js
 * Crée le compte administrateur DG initial dans la base de données.
 * Usage : node scripts/createDG.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const db = require('../models');

const createDG = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const existing = await db['Directeur technique'].findOne({ where: { matricule: 'VMAT0001' } });
    if (existing) {
      console.log('⚠️  Le compte DG (VMAT0001) existe déjà.');
      process.exit(0);
    }

    const hashed = await bcrypt.hash('admin123', 12);
    const dg = await db['Directeur technique'].create({
      matricule: 'VMAT0001',
      nom: 'Abena',
      prenom: 'Paul',
      email: 'paul.abena@vanbtp.cm',
      motDePasse: hashed,
      telephone: '+237 690 00 00 01',
      dateEmbauche: '2020-01-01',
      actif: true,
      doitChangerMotDePasse: false,
    });

    console.log('✅ Compte DG créé avec succès :');
    console.log(`   Matricule : ${dg.matricule}`);
    console.log(`   Mot de passe : admin123`);
    console.log(`   ⚠️  Changez ce mot de passe en production !`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

createDG();
