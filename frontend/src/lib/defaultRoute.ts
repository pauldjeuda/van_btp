import type { Role } from '../context/UserContext';

/** Page d'accueil après connexion (sans tableau de bord pour Chef_chantier). */
export function getHomePathForRole(role: Role | string | null): string {
  switch (role) {
    case 'Chef_chantier':
      return '/projects';
    case 'Gestionnaire de stocks':
      return '/resources';
    case 'Gerant_production':
      return '/production';
    default:
      return '/dashboard';
  }
}

export function canAccessDashboard(role: Role | string | null): boolean {
  return role !== 'Chef_chantier';
}
