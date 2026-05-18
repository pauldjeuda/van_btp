'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Ajouter le champ reporter à la table daily_reports
    await queryInterface.addColumn('daily_reports', 'reporter', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Supprimer le champ reporter de la table daily_reports
    await queryInterface.removeColumn('daily_reports', 'reporter');
  }
};
