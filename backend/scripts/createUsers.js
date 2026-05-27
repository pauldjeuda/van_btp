/**
 * scripts/createUsers.js
 * Crée tous les comptes de test pour VAN BTP ERP.
 * Usage : node scripts/createUsers.js
 * 
 * Comptes créés :
 *  DG       — VMAT0001 / admin123
 *  Chef     — VMAT0002 / chef123
 */
require('dotenv').config();
const bcrypt    = require('bcryptjs');
const sequelize = require('../config/db');
const db        = require('../models');

const users = [
  {
    model: 'Directeur technique',
    data: {
      matricule: 'VMAT0001',
      nom: 'Abena',
      prenom: 'Paul',
      email: 'paul.abena@vanbtp.cm',
      motDePasse: 'admin123',
      telephone: '+237 690 00 00 01',
      dateEmbauche: '2020-01-01',
      actif: true,
      doitChangerMotDePasse: false,
    },
  },
  {
    model: 'ChefChantier',
    data: {
      matricule: 'VMAT0002',
      nom: 'Nkomo',
      prenom: 'Jean',
      email: 'jean.nkomo@vanbtp.cm',
      motDePasse: 'chef123',
      telephone: '+237 691 00 00 02',
      specialite: 'Génie Civil',
      dateEmbauche: '2021-03-15',
      actif: true,
      doitChangerMotDePasse: false,
    },
  },

  {
    model: 'GerantProduction',
    data: {
      matricule: 'VMAT0005',
      nom: 'Talla',
      prenom: 'Alain',
      email: 'alain.talla@vanbtp.cm',
      motDePasse: 'prod123',
      telephone: '+237 694 00 00 05',
      dateEmbauche: '2023-01-15',
      actif: true,
      doitChangerMotDePasse: false,
    },
  },
  {
    model: 'GerantStock',
    data: {
      matricule: 'VMAT0006',
      nom: 'Eteki',
      prenom: 'David',
      email: 'david.eteki@vanbtp.cm',
      motDePasse: 'stock123',
      telephone: '+237 695 00 00 06',
      dateEmbauche: '2023-02-01',
      actif: true,
      doitChangerMotDePasse: false,
    },
  },
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL OK\n');
    await sequelize.sync({ alter: false });
    console.log('✅ Tables synchronisées\n');

    for (const { model, data } of users) {
      const Model = db[model];
      if (!Model) { console.warn(`⚠️  Modèle ${model} introuvable`); continue; }

      const existing = await Model.findOne({ where: { matricule: data.matricule } });
      if (existing) {
        console.log(`⚠️  ${model} ${data.matricule} existe déjà — ignoré`);
        continue;
      }

      const hashed = await bcrypt.hash(data.motDePasse, 12);
      const plainPwd = data.motDePasse;
      await Model.create({ ...data, motDePasse: hashed });
      console.log(`✅ ${model} créé : ${data.matricule} / ${plainPwd}`);
    }

    console.log('\n─────────────────────────────────────────');
    console.log('Comptes disponibles :');
    console.log('  DG          VMAT0001  admin123');
    console.log('  Chef        VMAT0002  chef123');
    console.log('  Prod        VMAT0005  prod123');
    console.log('  Stock       VMAT0006  stock123');
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

run();
