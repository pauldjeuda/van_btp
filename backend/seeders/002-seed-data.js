/**
 * seeders/002-seed-data.js
 * Données de démo : personnel, engins, transactions, incidents.
 * Usage : node seeders/002-seed-data.js
 */
require('dotenv').config();
const sequelize = require('../config/db');
const db = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const project = await db.Project.findOne({ where: { code: 'PROJ-2024-001' } });
    if (!project) {
      console.log('⚠️  Projets non trouvés — exécutez d\'abord le seeder 001');
      process.exit(1);
    }

    // ── Personnel ─────────────────────────────────────────────────────────────
    const employees = [
      { matricule: 'EMP001', name: 'Nguema Pierre',    role: 'Maçon',      contract: 'CDD',  projectId: project.id, niu: 'P001234567' },
      { matricule: 'EMP002', name: 'Fomba Aristide',   role: 'Ferrailleur', contract: 'CDI',  projectId: project.id, niu: 'P001234568' },
      { matricule: 'EMP003', name: 'Djomo Caroline',   role: 'Coffreur',   contract: 'CDD',  projectId: project.id, niu: 'P001234569' },
    ];
    for (const e of employees) {
      const exists = await db.Employee.findOne({ where: { matricule: e.matricule } });
      if (!exists) { await db.Employee.create(e); console.log(`✅ Employé : ${e.name}`); }
    }

    // ── Engins ────────────────────────────────────────────────────────────────
    const equipment = [
      { name: 'Grue Liebherr 200T', ref: 'ENG-001', status: 'En mission',  projectId: project.id, nextMaintenance: '2025-06-01' },
      { name: 'Excavatrice CAT 320', ref: 'ENG-002', status: 'Disponible', projectId: project.id, nextMaintenance: '2025-04-15' },
      { name: 'Bétonnière 500L',     ref: 'ENG-003', status: 'En mission', projectId: project.id, nextMaintenance: '2025-05-20' },
    ];
    for (const e of equipment) {
      const exists = await db.Equipment.findOne({ where: { ref: e.ref } });
      if (!exists) { await db.Equipment.create(e); console.log(`✅ Engin : ${e.name}`); }
    }

    // ── Transactions ──────────────────────────────────────────────────────────
    const txs = [
      { reference: 'DEP-001', type: 'expense', category: 'Ciment',         amount: 4500000,  status: 'Validé', paymentMethod: 'Virement', provider: 'CIMENCAM', transactionDate: '2024-02-10', projectId: project.id },
      { reference: 'DEP-002', type: 'expense', category: 'Fer à béton',    amount: 8200000,  status: 'Validé', paymentMethod: 'Chèque',   provider: 'ACILOR',   transactionDate: '2024-02-20', projectId: project.id },
      { reference: 'FAC-001', type: 'invoice', category: 'Acompte client', amount: 85000000, status: 'Payé',   paymentMethod: 'Virement', client: 'Mairie de Yaoundé', transactionDate: '2024-03-01', projectId: project.id },
    ];
    for (const t of txs) {
      const exists = await db.Transaction.findOne({ where: { reference: t.reference } });
      if (!exists) { await db.Transaction.create(t); console.log(`✅ Transaction : ${t.reference}`); }
    }

    // ── Incident de démo ─────────────────────────────────────────────────────
    const incidentExists = await db.Incident.findOne({ where: { projectId: project.id } });
    if (!incidentExists) {
      const incident = await db.Incident.create({
        title: 'Chute de matériaux zone nord', type: 'Chute d\'objet',
        category: 'hse', gravity: 'Modéré', status: 'En cours de traitement',
        description: 'Des parpaings ont chuté depuis l\'échafaudage de la zone nord.',
        actionPlan: 'Sécurisation immédiate de la zone, inspection complète de l\'échafaudage.',
        impact: 'Légères blessures sur un ouvrier — pris en charge immédiatement.',
        incidentDate: '2024-03-14', projectId: project.id,
      });
      await db.IncidentHistory.create({
        action: 'Incident déclaré par le chef de chantier',
        incidentId: incident.id, userRole: 'Chef_chantier',
      });
      console.log(`✅ Incident de démo créé`);
    }

    console.log('\nSeed données terminé.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

seed();
