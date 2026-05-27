'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('project_tasks');

    if (!table.blockedReason) {
      await queryInterface.addColumn('project_tasks', 'blockedReason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!table.position) {
      await queryInterface.addColumn('project_tasks', 'position', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('project_tasks');

    if (table.blockedReason) {
      await queryInterface.removeColumn('project_tasks', 'blockedReason');
    }
    if (table.position) {
      await queryInterface.removeColumn('project_tasks', 'position');
    }
  },
};
