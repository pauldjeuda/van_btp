/**
 * scripts/createUsers.js
 * Crée tous les comptes de test pour VAN BTP ERP.
 * Usage : node scripts/createUsers.js
 * 
 * Comptes créés :
 *  DG       — VMAT0001 / admin123
 *  Chef     — VMAT0002 / chef123
 *  Technicien — VMAT0003 / tech123
 *  RH       — VMAT0004 / rh1234
 */
require('dotenv').config();
const bcrypt    = require('bcryptjs');
const sequelize = require('../config/db');
const db        = require('../models');

const users = [
  {
    model: 'Directeur_technique',
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
    model: 'TechnicienChantier',
    data: {
      matricule: 'VMAT0003',
      nom: 'Mvondo',
      prenom: 'Eric',
      email: 'eric.mvondo@vanbtp.cm',
      motDePasse: 'tech123',
      telephone: '+237 692 00 00 03',
      specialite: 'Maçonnerie',
      dateEmbauche: '2022-06-01',
      actif: true,
      doitChangerMotDePasse: false,
    },
  },
  {
    model: 'RH',
    data: {
      matricule: 'VMAT0004',
      nom: 'Bello',
      prenom: 'Marie',
      email: 'marie.bello@vanbtp.cm',
      motDePasse: 'rh1234',
      telephone: '+237 693 00 00 04',
      dateEmbauche: '2021-09-01',
      actif: true,
      doitChangerMotDePasse: false,
    },
  },
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL OK\n');
    await sequelize.sync({ alter: true });
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
    console.log('  Technicien  VMAT0003  tech123');
    console.log('  RH          VMAT0004  rh1234');
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

run();
