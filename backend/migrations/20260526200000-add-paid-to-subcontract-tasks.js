'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('subcontract_tasks');
    if (table.paid) return;

    await queryInterface.addColumn('subcontract_tasks', 'paid', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('subcontract_tasks');
    if (!table.paid) return;

    await queryInterface.removeColumn('subcontract_tasks', 'paid');
  },
};
