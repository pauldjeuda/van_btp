/**
 * ControlComponents.tsx
 * Sous-composants de la page Contrôle HSE.
 */
import React from 'react';
import { Card, cn } from '../../components/ui';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, CheckSquare, Calendar } from 'lucide-react';

export const ControlKpiCard = ({ title, value, change, isPositive, icon: Icon, color }: {
  title: string; value: string | number; change?: string;
  isPositive?: boolean; icon: React.ElementType; color: string;
}) => {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600'
  };
  return (
    <Card className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl transition-colors", colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
          isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">{value}</h3>
    </Card>
  );
};

interface ChecklistItemProps {
  key?: React.Key;
  checklist: any;
  onToggleTask?: (taskId: string) => void;
  onClick?: () => void;
  getProjectName?: (projectId?: number) => string;
}
export function ChecklistItem({ checklist, onToggleTask, onClick, getProjectName }: ChecklistItemProps) {
  const completedCount = checklist.tasks.filter((t: any) => t.completed).length;
  const totalCount = checklist.tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div 
      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            progress === 100 ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
          )}>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">{checklist.title}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{(getProjectName ? getProjectName(checklist.projectId) : null) || checklist.chantier || ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-900">{completedCount}/{totalCount}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Tâches</p>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn(
            "h-full transition-all",
            progress === 100 ? "bg-emerald-500" : "bg-[var(--color-primary)]"
          )}
        />
      </div>
    </div>
  );
};

interface AuditItemProps { key?: React.Key; title: string; date: string; auditor: string; onClick?: () => void; }
export function AuditItem({ title, date, auditor, onClick }: AuditItemProps) { return (
  <div 
    onClick={onClick}
    className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer group"
  >
    <div className="flex justify-between items-start mb-2">
      <p className="text-sm font-black text-white group-hover:text-blue-200 transition-colors">{title}</p>
      <Calendar className="w-4 h-4 text-blue-300" />
    </div>
    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-blue-200">
      <span>{date}</span>
      <span>{auditor}</span>
    </div>
  </div>
);
}