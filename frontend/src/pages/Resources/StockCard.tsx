import React from 'react';
import { Card, Button, cn } from '../../components/ui';
import { useTranslation } from 'react-i18next';

interface StockCardProps {
  title: string;
  qty: string | number;
  status: 'Normal' | 'Bas' | 'Critique' | 'Vide';
  icon: React.ElementType;
  color: string;
}

export const StockCard = ({ title, qty, status, icon: Icon, color }: any) => {
  const { t } = useTranslation();
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600'
  };
  const qtyNum = typeof qty === 'string' ? parseFloat(qty.replace(/[^0-9.-]/g, '')) : (qty || 0);
  const isEmpty = qtyNum <= 0;
  const isLow = !isEmpty && status === 'Bas';
  return (
    <Card className={cn("p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group", isEmpty && "border-2 border-red-200")}>

      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl transition-colors", isEmpty ? 'bg-red-100 text-red-600' : colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={cn(
          "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
          isEmpty ? "bg-red-50 text-red-700" :
            status === 'Normal' ? "bg-emerald-50 text-emerald-700" :
              status === 'Bas' ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
        )}>
          {isEmpty ? 'Vide' : status}
        </span>
      </div>
      <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h4>
      <p className={cn("text-2xl font-black tracking-tighter", isEmpty ? "text-red-600" : "text-slate-900")}>{qty}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-bold h-8 bg-slate-50 hover:bg-white" onClick={() => window.dispatchEvent(new CustomEvent('open-logbook'))}>{t('common.history')}</Button>
        <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-bold h-8 bg-slate-50 hover:bg-white" onClick={() => window.dispatchEvent(new CustomEvent('open-inventory'))}>{t('common.inventory')}</Button>
      </div>
    </Card>
  );
};
