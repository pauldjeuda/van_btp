/**
 * seeders/001-seed-projects.js
 * Données de démonstration : 3 projets de chantier VAN BTP.
 * Usage : node seeders/001-seed-projects.js
 */
require('dotenv').config();
const sequelize = require('../config/db');
const db = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    // Trouver le chef pour l'associer aux projets
    const chef = await db.ChefChantier.findOne({ where: { matricule: 'VMAT0002' } });
    if (!chef) {
      console.log('⚠️  Aucun chef trouvé — exécutez d\'abord : node scripts/createUsers.js');
      process.exit(1);
    }

    const projects = [
      {
        code: 'PROJ-2024-001', name: 'Construction Pont de Messa',
        client: 'Mairie de Yaoundé', status: 'En cours',
        budget: 850000000, progress: 65,
        location: 'Messa, Yaoundé', region: 'Centre',
        startDate: '2024-01-15', endDate: '2024-12-31',
        chefId: chef.id,
      },
      {
        code: 'PROJ-2024-002', name: 'Réhabilitation Route Douala-Édéa',
        client: 'Ministère des Travaux Publics', status: 'En cours',
        budget: 1200000000, progress: 42,
        location: 'Axe Douala-Édéa', region: 'Littoral',
        startDate: '2024-03-01', endDate: '2025-06-30',
        chefId: chef.id,
      },
      {
        code: 'PROJ-2024-003', name: 'Immeuble Résidentiel Bonamoussadi',
        client: 'Groupe Immobilier SAGEM', status: 'Planifié',
        budget: 450000000, progress: 0,
        location: 'Bonamoussadi, Douala', region: 'Littoral',
        startDate: '2025-01-10', endDate: '2026-03-31',
        chefId: chef.id,
      },
    ];

    for (const p of projects) {
      const exists = await db.Project.findOne({ where: { code: p.code } });
      if (!exists) {
        await db.Project.create(p);
        console.log(`✅ Projet créé : ${p.name}`);
      } else {
        console.log(`⚠️  Projet existant ignoré : ${p.code}`);
      }
    }

    console.log('\nSeed projets terminé.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

seed();
