/**
 * ProjectsComponents.tsx  
 * Utilitaires et sous-composants pour la page Projets.
 */
import React from 'react';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

export const calculateTimeRemaining = (endDate: string): string => {
  if (!endDate) return '142 Jours'; // Valeur par défaut
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} jours de retard`;
  } else if (diffDays === 0) {
    return 'Dernier jour';
  } else {
    return `${diffDays} jours`;
  }
};

// Fonction pour formater les dates des avenants
export const formatDateAmendment = (dateStr: string): string => {
  if (!dateStr || dateStr === '0000-00-00') return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { projectService } from '../../services/project.service';
import { ProjectTasksPanel } from '../../components/project/ProjectTasksPanel';
import { amendmentService } from '../../services/amendment.service';


// ─── Composant ────────────────────────────────────────────────────────────────

export const InfoItem = ({ label, value }: any) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className="text-sm font-black text-slate-900">{value}</p>
  </div>
);
