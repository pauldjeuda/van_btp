'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');
    if (table.weeklySalary) return;

    await queryInterface.addColumn('employees', 'weeklySalary', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Salaire hebdomadaire (ouvriers locaux chantier)',
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('employees');
    if (!table.weeklySalary) return;
    await queryInterface.removeColumn('employees', 'weeklySalary');
  },
};
