'use strict';

/** Retire les rôles RH et Technicien_chantier des enums / tokens existants */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE refresh_tokens
      SET userRole = 'Chef_chantier'
      WHERE userRole IN ('RH', 'Technicien_chantier')
    `);

    await queryInterface.changeColumn('refresh_tokens', 'userRole', {
      type: "ENUM('Directeur_technique', 'Chef_chantier', 'Gerant_production', 'Gerant_stock')",
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.changeColumn('refresh_tokens', 'userRole', {
      type: "ENUM('Directeur_technique', 'Chef_chantier', 'RH', 'Gerant_production', 'Gerant_stock')",
      allowNull: false,
    });
  },
};
