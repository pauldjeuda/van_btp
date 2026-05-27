'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some(
      (t) => String(t).toLowerCase() === 'project_fixed_costs',
    );
    if (exists) return;

    await queryInterface.createTable('project_fixed_costs', {
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
      type: {
        type: Sequelize.ENUM('ENEO', 'Carburant', 'Eau', 'Maintenance', 'Autre'),
        allowNull: false,
        defaultValue: 'Autre',
      },
      label: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      period: {
        type: Sequelize.ENUM('Journalier', 'Hebdomadaire', 'Mensuel', 'Ponctuel'),
        allowNull: false,
        defaultValue: 'Mensuel',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some(
      (t) => String(t).toLowerCase() === 'project_fixed_costs',
    );
    if (!exists) return;

    await queryInterface.dropTable('project_fixed_costs');
  },
};
