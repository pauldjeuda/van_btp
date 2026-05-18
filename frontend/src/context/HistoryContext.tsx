import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface HistoryLog {
  id: number;
  date: string;
  module: string;
  action: string;
  user: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
}

interface HistoryContextType {
  logs: HistoryLog[];
  addLog: (log: Omit<HistoryLog, 'id' | 'date'>) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<HistoryLog[]>([
    { id: 1, date: '2024-04-07 14:30', module: 'Projets', action: 'Création du projet "Route Douala-Yaoundé"', user: 'Jean Dupont', type: 'success' },
    { id: 2, date: '2024-04-07 12:45', module: 'Finances', action: 'Validation du décompte n°4', user: 'Marie Claire', type: 'info' },
    { id: 3, date: '2024-04-07 09:15', module: 'Ressources', action: 'Affectation Pelle CAT 320', user: 'Paul Abena', type: 'warning' },
  ]);

  const addLog = (log: Omit<HistoryLog, 'id' | 'date'>) => {
    const newLog: HistoryLog = {
      ...log,
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setLogs(prev => [newLog, ...prev]);
  };

  return (
    <HistoryContext.Provider value={{ logs, addLog }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
