'use strict';

/** Renomme le rôle Gerant_stock → Gestionnaire de stocks dans refresh_tokens */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE refresh_tokens
      SET userRole = 'Gestionnaire de stocks'
      WHERE userRole = 'Gerant_stock'
    `);

    await queryInterface.changeColumn('refresh_tokens', 'userRole', {
      type: "ENUM('Directeur technique', 'Chef_chantier', 'Gerant_production', 'Gestionnaire de stocks')",
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE refresh_tokens
      SET userRole = 'Gerant_stock'
      WHERE userRole = 'Gestionnaire de stocks'
    `);

    await queryInterface.changeColumn('refresh_tokens', 'userRole', {
      type: "ENUM('Directeur technique', 'Chef_chantier', 'Gerant_production', 'Gerant_stock')",
      allowNull: false,
    });
  },
};
