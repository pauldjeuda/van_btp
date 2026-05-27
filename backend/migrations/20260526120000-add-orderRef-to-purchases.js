'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('purchases');
    if (table.orderRef) return;

    await queryInterface.addColumn('purchases', 'orderRef', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addIndex('purchases', ['orderRef'], {
      name: 'purchases_order_ref_idx',
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('purchases');
    if (!table.orderRef) return;

    await queryInterface.removeIndex('purchases', 'purchases_order_ref_idx');
    await queryInterface.removeColumn('purchases', 'orderRef');
  },
};
