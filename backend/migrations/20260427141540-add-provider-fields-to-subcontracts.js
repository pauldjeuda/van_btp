'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('subcontracts');

    if (!tableInfo.type) {
      await queryInterface.addColumn('subcontracts', 'type', {
        type: Sequelize.ENUM('subcontract', 'provider'),
        defaultValue: 'subcontract'
      });
    }

    if (!tableInfo.paymentStatus) {
      await queryInterface.addColumn('subcontracts', 'paymentStatus', {
        type: Sequelize.ENUM('En attente', 'Payé'),
        defaultValue: 'En attente'
      });
    }
    
    // Pillar 2: Ensure unique indexes are correctly named if we wanted to enforce them via migrations
    // But for now, we handled it in models.
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('subcontracts', 'type');
    await queryInterface.removeColumn('subcontracts', 'paymentStatus');
  }
};
