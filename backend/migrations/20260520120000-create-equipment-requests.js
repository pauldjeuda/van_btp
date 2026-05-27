'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ancien schéma incompatible (requestDate, neededDate, createdBy…) — remplacement propre
    await queryInterface.dropTable('equipment_requests').catch(() => {});

    await queryInterface.createTable('equipment_requests', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ref: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      equipmentRequested: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      needDescription: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      desiredDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('En attente', 'Approuvée', 'Rejetée', 'Annulée', 'Erreur envoi'),
        allowNull: false,
        defaultValue: 'En attente',
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      requestedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      requesterMatricule: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      requesterName: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      externalId: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      respondedBy: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      syncError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('equipment_requests', ['status']);
    await queryInterface.addIndex('equipment_requests', ['projectId']);
    await queryInterface.addIndex('equipment_requests', ['requestedBy']);
    await queryInterface.addIndex('equipment_requests', ['externalId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('equipment_requests');
  },
};
