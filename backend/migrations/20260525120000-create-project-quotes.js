'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((t) => String(t).toLowerCase() === 'project_quotes');
    if (exists) return;

    await queryInterface.createTable('project_quotes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: 'Devis chantier',
      },
      status: {
        type: Sequelize.ENUM('En attente', 'Validé', 'Rejeté'),
        allowNull: false,
        defaultValue: 'En attente',
      },
      lines: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      createdByRole: { type: Sequelize.STRING(50), allowNull: true },
      reviewedBy: { type: Sequelize.INTEGER, allowNull: true },
      rejectionReason: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((t) => String(t).toLowerCase() === 'project_quotes');
    if (!exists) return;
    await queryInterface.dropTable('project_quotes');
  },
};
