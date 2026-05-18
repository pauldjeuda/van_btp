import React from 'react';
import { Card, cn, Button } from '../../components/ui';
import { motion } from 'motion/react';
import {
  ArrowUpRight, ArrowDownRight, HardHat, ChevronRight,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

export const StatCard = ({ title, value, unit, change, isPositive, icon: Icon, trend, onClick }: {
  title: string; value: string | number; unit?: string;
  change?: string | number; isPositive?: boolean;
  icon: React.ElementType; trend?: string; onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group overflow-hidden relative cursor-pointer"
  >
    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-slate-100 rounded-2xl text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
          isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</h4>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 mt-2">{trend}</p>
    </div>
  </Card>
);

export const ProjectRow = ({ name, client, budget, ca, margin, progress, status }: any) => (
  <tr className="hover:bg-slate-50/80 transition-colors group">
    <td className="py-5 pr-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
          <HardHat className="w-5 h-5" />
        </div>
        <div>
          <p className="font-black text-slate-900 tracking-tight">{name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{client}</p>
        </div>
      </div>
    </td>
    <td className="py-5 px-4">
      <p className="text-sm font-black text-slate-900">{new Intl.NumberFormat('fr-FR').format(ca)} FCFA</p>
      <p className="text-[10px] font-bold text-slate-400">Budget: {new Intl.NumberFormat('fr-FR').format(budget)} FCFA</p>
    </td>
    <td className="py-5 px-4">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
        {margin}
      </span>
    </td>
    <td className="py-5 px-4">
      <div className="w-32">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-slate-900">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[var(--color-primary)] rounded-full"
          />
        </div>
      </div>
    </td>
    <td className="py-5 pl-4">
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
        status === "clôture" ? "bg-emerald-100 text-emerald-700" :
          status === "exécution" ? "bg-blue-100 text-blue-700" :
            "bg-amber-100 text-amber-700"
      )}>
        {status}
      </span>
    </td>
  </tr>
);

export const AlertItem = ({ type, title, desc, onClick }: any) => {
  const colors = {
    danger: 'border-red-500 bg-red-500/10 hover:bg-red-500/20',
    warning: 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20',
    info: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
  };
  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn("p-4 rounded-2xl border-l-4 cursor-pointer transition-all", colors[type as keyof typeof colors])}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-black tracking-tight">{title}</p>
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
      <p className="text-xs text-white/60 font-medium mt-1">{desc}</p>
    </motion.div>
  );
};
