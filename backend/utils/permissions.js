/**
 * utils/permissions.js
 * Matrice des permissions par rôle — miroir de src/types/permissions.ts du frontend.
 * Source unique de vérité pour les autorisations côté serveur.
 */

const ROLE_PERMISSIONS = {
  Directeur_technique: [
    'view_dashboard_global', 'view_all_projects', 'view_all_finances',
    'view_all_resources', 'view_all_control', 'view_all_documents',
    'pilot_kpi', 'follow_alerts', 'view_budgets', 'view_purchases',
    'view_stock', 'view_rh', 'view_engins', 'view_incidents',
    'view_audits', 'view_documents', 'consult_budget', 'view_finances',
  ],
  Chef_chantier: [
    'view_dashboard_operational', 'view_my_projects', 'view_project_finances',
    'view_project_resources', 'view_project_control', 'view_project_documents',
    'create_project', 'modify_project', 'follow_project_budget',
    'create_expense', 'follow_invoices', 'manage_purchases', 'consult_stock',
    'assign_personnel', 'assign_equipment', 'declare_incident',
    'create_audit', 'plan_audits', 'manage_checklists', 'update_status',
    'validate_reports', 'consult_documents', 'manage_planning',
    'manage_tasks', 'consult_budget', 'view_finances',
    'create_documents', 'archive_documents',
  ],
  Technicien_chantier: [
    'view_my_projects_terrain', 'view_field_info', 'view_checklist',
    'view_planning', 'view_daily_reports', 'view_documents_terrain',
    'view_incidents_terrain', 'create_daily_report', 'declare_incident',
    'check_tasks', 'consult_planning', 'consult_material',
    'add_field_documents', 'field_feedback', 'update_status',
  ],
  RH: [
    'view_personnel', 'view_rh_assignments', 'view_collaborator_info',
    'view_contracts', 'view_projects_rh', 'manage_rh_assignments',
    'follow_admin_info', 'consult_personnel_by_project',
  ],
};

const can = (role, permission) => {
  if (!role || !permission) return false;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
};

const getPermissions = (role) => ROLE_PERMISSIONS[role] || [];

module.exports = { ROLE_PERMISSIONS, can, getPermissions };
