'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_materials', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      category: {
        type: Sequelize.ENUM('Matériaux', 'Carburants', 'EPI', 'Outillage', 'Autre'),
        defaultValue: 'Matériaux',
      },
      unit: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'Unités' },
      alertThreshold: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      projectId: { type: Sequelize.INTEGER, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('stock_materials', ['name', 'projectId'], {
      unique: true,
      name: 'stock_materials_name_project_unique',
    });

    await queryInterface.addColumn('stock_movements', 'materialId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'stock_materials', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_movements', 'materialId');
    await queryInterface.dropTable('stock_materials');
  },
};
