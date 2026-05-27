'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');
    if (table.isLocal) return;

    await queryInterface.addColumn('employees', 'isLocal', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('employees');
    if (!table.isLocal) return;

    await queryInterface.removeColumn('employees', 'isLocal');
  },
};
