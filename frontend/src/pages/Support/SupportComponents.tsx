/**
 * SupportComponents.tsx
 * Sous-composants de la page Support.
 */
import React from 'react';
import { Card, cn } from '../../components/ui';
import { ChevronRight, Folder, Clock, Users } from 'lucide-react';

export const TabButton = ({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string;
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-6 py-4 border-b-2 transition-all whitespace-nowrap",
      active 
        ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5" 
        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-[var(--color-primary)]" : "text-slate-400")} />
    <span className="text-sm font-black tracking-tight">{label}</span>
  </button>
);

export const FolderCard = ({ title, count, color }: { title: string; count: number | string; color: string; }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  };
  return (
    <Card className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all cursor-pointer group">
      <div className={cn("p-3 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform", colors[color as keyof typeof colors])}>
        <Folder className="w-6 h-6" />
      </div>
      <h4 className="font-black text-slate-900 tracking-tight">{title}</h4>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{count}</p>
    </Card>
  );
};

export const TicketRow = ({ id, title, status, priority, date }: {
  id: number | string; title: string; status: string; priority: string; date: string; [key: string]: unknown;
}) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 tracking-widest">{id}</span>
        <h4 className="text-sm font-black text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">{title}</h4>
      </div>
      <span className={cn(
        "text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
        priority === 'Haute' ? "bg-red-100 text-red-700" : 
        priority === 'Moyenne' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
      )}>
        {priority}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {date}</span>
        <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> Support Technique</span>
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-wider",
        status === 'Résolu' ? "text-emerald-600" : "text-blue-600"
      )}>
        {status}
      </span>
    </div>
  </div>
);

export const ReferentialCard = ({ title, desc, icon: Icon, count, onClick }: {
  title: string; desc: string; icon: React.ElementType; count: number; onClick: () => void;
}) => (
  <Card 
    onClick={onClick}
    className="p-8 border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all group cursor-pointer hover:-translate-y-1 active:scale-[0.98]"
  >
    <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl w-fit mb-6 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all group-hover:rotate-6">
      <Icon className="w-8 h-8" />
    </div>
    <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">{title}</h4>
    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{desc}</p>
    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{count}</span>
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  </Card>
);

export const ContactItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string; }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  </div>
);
