'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Supprimer le champ weather de la table daily_reports
    await queryInterface.removeColumn('daily_reports', 'weather');
  },

  async down (queryInterface, Sequelize) {
    // Ajouter le champ weather à la table daily_reports (rollback)
    await queryInterface.addColumn('daily_reports', 'weather', {
      type: Sequelize.ENUM('Ensoleillé', 'Nuageux', 'Pluvieux', 'Orageux'),
      defaultValue: 'Ensoleillé',
      allowNull: false
    });
  }
};
