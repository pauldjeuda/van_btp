/**
 * @file permissions.ts
 * Types et constantes liés au système de rôles et permissions du projet VAN BTP ERP.
 */

export type Role =
  | 'Directeur technique'
  | 'Chef_chantier'
  | 'Gerant_production'
  | 'Gestionnaire de stocks';

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
  // Personnel / RH (DG & Chef)
  | 'view_personnel'
  | 'view_rh_assignments'
  | 'view_collaborator_info'
  | 'view_contracts'
  | 'view_projects_rh'
  | 'manage_rh_assignments'
  | 'follow_admin_info'
  | 'consult_personnel_by_project';

/** Permissions opérationnelles chantier (chef + DT) — hors création / modification de chantier (DT seul) */
const SITE_OPERATIONAL_PERMISSIONS: Permission[] = [
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
  'create_documents',
  'archive_documents',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'Directeur technique': [
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
    'view_personnel',
    'view_rh_assignments',
    'view_collaborator_info',
    'view_contracts',
    'view_projects_rh',
    'manage_rh_assignments',
    'follow_admin_info',
    'consult_personnel_by_project',
    'create_project',
    'modify_project',
    ...SITE_OPERATIONAL_PERMISSIONS,
  ],
  Chef_chantier: [
    'view_my_projects',
    'view_project_finances',
    'view_project_resources',
    'view_project_control',
    'view_project_documents',
    'view_settings_personal',
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
    'view_personnel',
    'view_rh_assignments',
    'view_collaborator_info',
    'view_contracts',
    'view_projects_rh',
    'manage_rh_assignments',
    'follow_admin_info',
    'consult_personnel_by_project',
  ],
  Gerant_production: [],
  'Gestionnaire de stocks': [
    'view_stock',
  ],
};
