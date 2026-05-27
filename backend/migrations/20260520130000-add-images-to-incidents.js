'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('incidents');
    if (table.images) return;

    await queryInterface.addColumn('incidents', 'images', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('incidents');
    if (!table.images) return;

    await queryInterface.removeColumn('incidents', 'images');
  },
};
