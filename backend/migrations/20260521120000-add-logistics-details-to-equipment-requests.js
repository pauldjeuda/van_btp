'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('equipment_requests');
    if (table.logisticsDetails) return;

    await queryInterface.addColumn('equipment_requests', 'logisticsDetails', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('equipment_requests');
    if (!table.logisticsDetails) return;

    await queryInterface.removeColumn('equipment_requests', 'logisticsDetails');
  },
};
