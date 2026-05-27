'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('daily_reports');
    if (!table.weather) return;

    await queryInterface.removeColumn('daily_reports', 'weather');
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('daily_reports');
    if (table.weather) return;

    await queryInterface.addColumn('daily_reports', 'weather', {
      type: Sequelize.ENUM('Ensoleillé', 'Nuageux', 'Pluvieux', 'Orageux'),
      defaultValue: 'Ensoleillé',
      allowNull: false,
    });
  },
};
