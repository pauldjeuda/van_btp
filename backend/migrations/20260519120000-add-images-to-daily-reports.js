'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('daily_reports');
    if (table.images) return;

    await queryInterface.addColumn('daily_reports', 'images', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('daily_reports');
    if (!table.images) return;

    await queryInterface.removeColumn('daily_reports', 'images');
  },
};
