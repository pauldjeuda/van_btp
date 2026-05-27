'use strict';

/** Renomme le rôle Directeur_technique → Directeur technique dans refresh_tokens */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE refresh_tokens
      SET userRole = 'Directeur technique'
      WHERE userRole = 'Directeur_technique'
    `);

    await queryInterface.changeColumn('refresh_tokens', 'userRole', {
      type: "ENUM('Directeur technique', 'Chef_chantier', 'Gerant_production', 'Gerant_stock')",
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE refresh_tokens
      SET userRole = 'Directeur_technique'
      WHERE userRole = 'Directeur technique'
    `);

    await queryInterface.changeColumn('refresh_tokens', 'userRole', {
      type: "ENUM('Directeur_technique', 'Chef_chantier', 'Gerant_production', 'Gerant_stock')",
      allowNull: false,
    });
  },
};
