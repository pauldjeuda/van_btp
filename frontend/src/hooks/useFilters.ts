import { useState, useMemo } from 'react';
import { Project } from '../types';

interface UseFiltersOptions {
  projects: Project[];
}

export const useFilters = ({ projects }: UseFiltersOptions) => {
  const [selectedRegion, setSelectedRegion] = useState('Toutes les régions');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('T1 2024');

  const regions = useMemo(() => {
    const uniqueRegions = Array.from(new Set(projects.map((p) => p.region).filter(Boolean)));
    return ['Toutes les régions', ...uniqueRegions];
  }, [projects]);

  const projectOptions = useMemo(() => {
    const filtered = selectedRegion === 'Toutes les régions'
      ? projects
      : projects.filter((p) => p.region === selectedRegion);
    return [{ id: null, name: 'Tous les chantiers' }, ...filtered.map((p) => ({ id: p.id, name: p.name }))];
  }, [projects, selectedRegion]);

  const matchesRegion = (projectId?: number) => {
    if (selectedRegion === 'Toutes les régions') return true;
    const project = projects.find((p) => p.id === projectId);
    return project?.region === selectedRegion;
  };

  const matchesProject = (projectId?: number) => {
    if (selectedProjectId === null) return true;
    return projectId === selectedProjectId;
  };

  return {
    selectedRegion,
    setSelectedRegion,
    selectedProjectId,
    setSelectedProjectId,
    selectedPeriod,
    setSelectedPeriod,
    regions,
    projectOptions,
    matchesRegion,
    matchesProject,
  };
};
