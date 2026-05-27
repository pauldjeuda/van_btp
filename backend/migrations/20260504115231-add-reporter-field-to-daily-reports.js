'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('daily_reports');
    if (table.reporter) return;

    await queryInterface.addColumn('daily_reports', 'reporter', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('daily_reports');
    if (!table.reporter) return;

    await queryInterface.removeColumn('daily_reports', 'reporter');
  },
};
