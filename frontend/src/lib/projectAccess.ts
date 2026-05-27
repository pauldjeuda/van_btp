import type { Project } from '../types/models';
import type { Role } from '../context/UserContext';

/** Filtre défensif : n'affiche que les chantiers du chef (évite le flash des données DT en cache). */
export function filterProjectsForRole(
  projects: Project[],
  role: Role | null | string,
  userId?: number | string | null,
): Project[] {
  if (role !== 'Chef_chantier' || userId == null || userId === '') {
    return projects;
  }
  const uid = Number(userId);
  if (!uid) return projects;
  return projects.filter((p) => Number(p.chefId) === uid);
}
