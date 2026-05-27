/**
 * Groupes de rôles pour verifyRole — éviter les oublis Directeur technique.
 */
const ROLE_DG = 'Directeur technique';
const ROLE_CHEF = 'Chef_chantier';
const ROLE_STOCK = 'Gestionnaire de stocks';
const ROLE_PROD = 'Gerant_production';

module.exports = {
  ROLE_DG,
  ROLE_CHEF,
  ROLE_STOCK,
  ROLE_PROD,
  /** Lecture projets (tous rôles métier) */
  PROJECTS_READ: [ROLE_DG, ROLE_CHEF, ROLE_STOCK, ROLE_PROD],
  /** Gestion opérationnelle chantier + DG */
  MANAGEMENT: [ROLE_DG, ROLE_CHEF],
  /** DG seul (validations globales si tableau vide dans verifyRole) */
  DG_ONLY: [ROLE_DG],
};
