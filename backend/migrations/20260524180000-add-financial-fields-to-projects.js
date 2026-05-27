'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('projects', 'airRate', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('projects', 'guaranteeRetention', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.addColumn('projects', 'guaranteeBank', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('projects', 'guaranteeBank');
    await queryInterface.removeColumn('projects', 'guaranteeRetention');
    await queryInterface.removeColumn('projects', 'airRate');
  },
};
