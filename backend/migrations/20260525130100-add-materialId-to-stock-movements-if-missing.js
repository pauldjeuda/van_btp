'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('stock_movements');
    if (!table.materialId) {
      await queryInterface.addColumn('stock_movements', 'materialId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'stock_materials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('stock_movements');
    if (table.materialId) {
      await queryInterface.removeColumn('stock_movements', 'materialId');
    }
  },
};
