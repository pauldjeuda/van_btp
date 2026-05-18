/**
 * @file permissions.ts
 * Types et constantes liés au système de rôles et permissions du projet VAN BTP ERP.
 */

export type Role = 'Directeur_technique' | 'Chef_chantier' | 'Technicien_chantier' | 'RH';

export type Permission =
  // DG
  | 'view_dashboard_global'
  | 'view_all_projects'
  | 'view_all_finances'
  | 'view_all_resources'
  | 'view_all_control'
  | 'view_all_documents'
  | 'view_settings_global'
  | 'pilot_kpi'
  | 'follow_alerts'
  | 'view_budgets'
  | 'view_purchases'
  | 'view_stock'
  | 'view_rh'
  | 'view_engins'
  | 'view_incidents'
  | 'view_audits'
  | 'view_documents'
  | 'admin_app'
  | 'consult_budget'
  | 'view_finances'
  // Chef
  | 'view_dashboard_operational'
  | 'view_my_projects'
  | 'view_project_finances'
  | 'view_project_resources'
  | 'view_project_control'
  | 'view_project_documents'
  | 'view_settings_personal'
  | 'create_project'
  | 'modify_project'
  | 'follow_project_budget'
  | 'create_expense'
  | 'follow_invoices'
  | 'manage_purchases'
  | 'consult_stock'
  | 'assign_personnel'
  | 'assign_equipment'
  | 'declare_incident'
  | 'create_audit'
  | 'create_audits'
  | 'plan_audits'
  | 'manage_checklists'
  | 'update_status'
  | 'validate_reports'
  | 'consult_documents'
  | 'manage_planning'
  | 'manage_tasks'
  | 'create_documents'
  | 'archive_documents'
  // Technicien
  | 'view_my_projects_terrain'
  | 'view_field_info'
  | 'view_checklist'
  | 'view_planning'
  | 'view_daily_reports'
  | 'view_documents_terrain'
  | 'view_incidents_terrain'
  | 'create_daily_report'
  | 'check_tasks'
  | 'consult_planning'
  | 'consult_material'
  | 'add_field_documents'
  | 'field_feedback'
  // RH
  | 'view_personnel'
  | 'view_rh_assignments'
  | 'view_collaborator_info'
  | 'view_contracts'
  | 'view_projects_rh'
  | 'manage_rh_assignments'
  | 'follow_admin_info'
  | 'consult_personnel_by_project';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Directeur_technique: [
    'view_dashboard_global',
    'view_all_projects',
    'view_all_finances',
    'view_all_resources',
    'view_all_control',
    'view_all_documents',
    'view_settings_global',
    'pilot_kpi',
    'follow_alerts',
    'view_budgets',
    'view_purchases',
    'view_stock',
    'view_rh',
    'view_engins',
    'view_incidents',
    'view_audits',
    'view_documents',
    'admin_app',
    'consult_budget',
    'view_finances',
  ],
  Chef_chantier: [
    'view_dashboard_operational',
    'view_my_projects',
    'view_project_finances',
    'view_project_resources',
    'view_project_control',
    'view_project_documents',
    'view_settings_personal',
    'create_project',
    'modify_project',
    'follow_project_budget',
    'create_expense',
    'follow_invoices',
    'manage_purchases',
    'consult_stock',
    'assign_personnel',
    'assign_equipment',
    'declare_incident',
    'create_audit',
    'create_audits',
    'plan_audits',
    'manage_checklists',
    'update_status',
    'validate_reports',
    'consult_documents',
    'manage_planning',
    'manage_tasks',
    'admin_app',
    'consult_budget',
    'view_finances',
    'create_documents',
    'archive_documents',
  ],
  Technicien_chantier: [
    'view_my_projects_terrain',
    'view_field_info',
    'view_checklist',
    'view_planning',
    'view_daily_reports',
    'view_documents_terrain',
    'view_incidents_terrain',
    'view_settings_personal',
    'create_daily_report',
    'declare_incident',
    'check_tasks',
    'consult_planning',
    'consult_material',
    'add_field_documents',
    'field_feedback',
    'admin_app',
    'update_status',
  ],
  RH: [
    'view_personnel',
    'view_rh_assignments',
    'view_collaborator_info',
    'view_contracts',
    'view_projects_rh',
    'view_settings_personal',
    'manage_rh_assignments',
    'follow_admin_info',
    'consult_personnel_by_project',
    'admin_app',
  ],
};
