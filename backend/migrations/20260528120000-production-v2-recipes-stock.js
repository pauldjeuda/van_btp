'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('production_recipes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      productType: {
        type: Sequelize.ENUM('Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'),
        allowNull: false,
      },
      productLabel: { type: Sequelize.STRING(200) },
      expectedOutput: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
      outputUnit: { type: Sequelize.STRING(20), defaultValue: 'unité' },
      estimatedCost: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      finishedMaterialId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'stock_materials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable('production_recipe_lines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      recipeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'production_recipes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      materialId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'stock_materials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantityPerBatch: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      unit: { type: Sequelize.STRING(30) },
      sortOrder: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addColumn('production_entries', 'recipeId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'production_recipes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('production_entries', 'projectId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '0 = magasin central / usine',
    });
    await queryInterface.addColumn('production_entries', 'lossQty', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
    });
    await queryInterface.addColumn('production_entries', 'operatorName', { type: Sequelize.STRING(120) });
    await queryInterface.addColumn('production_entries', 'machineLabel', { type: Sequelize.STRING(120) });
    await queryInterface.addColumn('production_entries', 'status', {
      type: Sequelize.ENUM('brouillon', 'validee', 'annulee', 'legacy'),
      defaultValue: 'legacy',
    });
    await queryInterface.addColumn('production_entries', 'materialCost', { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 });
    await queryInterface.addColumn('production_entries', 'laborCost', { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 });
    await queryInterface.addColumn('production_entries', 'fuelCost', { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 });
    await queryInterface.addColumn('production_entries', 'maintenanceCost', { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 });
    await queryInterface.addColumn('production_entries', 'totalCost', { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 });
    await queryInterface.addColumn('production_entries', 'yieldRatio', { type: Sequelize.DECIMAL(8, 4) });
    await queryInterface.addColumn('production_entries', 'finishedMaterialId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'stock_materials', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('production_entry_consumptions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'production_entries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      materialId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'stock_materials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantityTheoretical: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      quantityActual: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      unitCost: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      totalValue: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      stockMovementId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'stock_movements', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addColumn('stock_movements', 'sourceType', { type: Sequelize.STRING(40), allowNull: true });
    await queryInterface.addColumn('stock_movements', 'sourceId', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('stock_movements', 'unitCost', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_movements', 'unitCost');
    await queryInterface.removeColumn('stock_movements', 'sourceId');
    await queryInterface.removeColumn('stock_movements', 'sourceType');
    await queryInterface.dropTable('production_entry_consumptions');
    const entryCols = [
      'finishedMaterialId', 'yieldRatio', 'totalCost', 'maintenanceCost', 'fuelCost',
      'laborCost', 'materialCost', 'status', 'machineLabel', 'operatorName', 'lossQty',
      'projectId', 'recipeId',
    ];
    for (const col of entryCols) {
      await queryInterface.removeColumn('production_entries', col);
    }
    await queryInterface.dropTable('production_recipe_lines');
    await queryInterface.dropTable('production_recipes');
  },
};
