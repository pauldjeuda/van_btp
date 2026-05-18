import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, Eye, EyeOff, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Button ──────────────────────────────────────────────────────────────── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, fullWidth, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';
    const variants = {
      primary:   'bg-[var(--color-primary)] text-white hover:opacity-90 focus-visible:ring-[var(--color-primary)] shadow-sm',
      secondary: 'bg-[var(--color-accent)] text-white hover:opacity-90 focus-visible:ring-[var(--color-accent)] shadow-sm',
      outline:   'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400',
      ghost:     'bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-400',
      danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
      success:   'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm',
      warning:   'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400 shadow-sm',
    };
    const sizes = {
      xs:   'h-7 px-2.5 text-xs gap-1',
      sm:   'h-8 px-3 text-sm gap-1.5',
      md:   'h-10 px-4 text-sm gap-2',
      lg:   'h-12 px-6 text-base gap-2',
      icon: 'h-10 w-10 p-0',
    };
    return (
      <button ref={ref} disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)} {...props}>
        {isLoading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

/* ─── Input ───────────────────────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type, leftIcon, rightElement, id, ...props }, ref) => {
    const [showPwd, setShowPwd] = React.useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const isPwd = type === 'password';
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{leftIcon}</div>
          )}
          <input id={inputId} ref={ref} type={isPwd ? (showPwd ? 'text' : 'password') : type}
            className={cn(
              'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm transition-all',
              'placeholder:text-slate-400 text-slate-900',
              'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
              leftIcon && 'pl-9',
              (isPwd || rightElement) && 'pr-10',
              className
            )} {...props} />
          {isPwd && (
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {!isPwd && rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
        {error && <p className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertCircle className="w-3 h-3" />{error}</p>}
        {!error && hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ─── Textarea ────────────────────────────────────────────────────────────── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full space-y-1.5">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
        <textarea id={inputId} ref={ref}
          className={cn(
            'flex w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-all',
            'placeholder:text-slate-400 text-slate-900 resize-none',
            'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-400',
            className
          )} {...props} />
        {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/* ─── Select ──────────────────────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full space-y-1.5">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
        <select id={inputId} ref={ref}
          className={cn(
            'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm transition-all appearance-none',
            'text-slate-900 border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-400',
            className
          )} {...props}>
          {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
        </select>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* ─── Card ────────────────────────────────────────────────────────────────── */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'raised';
}
export const Card: React.FC<CardProps> = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'border border-slate-200 bg-white shadow-sm',
    flat:    'bg-slate-50 border border-slate-100',
    raised:  'border border-slate-200 bg-white shadow-md',
  };
  return (
    <div className={cn('rounded-2xl overflow-hidden', variants[variant as keyof typeof variants], className)} {...props}>
      {children}
    </div>
  );
};

/* ─── Badge ───────────────────────────────────────────────────────────────── */
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}
const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  info:    'bg-blue-100 text-blue-700',
  neutral: 'bg-slate-100 text-slate-500',
};
export const Badge: React.FC<BadgeProps> = ({ children, className, variant = 'default', dot, ...props }) => (
  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', BADGE_STYLES[variant as keyof typeof BADGE_STYLES], className)} {...props}>
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full', {
      'bg-slate-500': variant === 'default' || variant === 'neutral',
      'bg-emerald-500': variant === 'success',
      'bg-amber-500': variant === 'warning',
      'bg-red-500': variant === 'danger',
      'bg-blue-500': variant === 'info',
    })} />}
    {children}
  </span>
);

/* ─── Modal ───────────────────────────────────────────────────────────────── */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  description?: string;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, description, children, footer, size = 'md' }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-full mx-4' };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className={cn('relative w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
        'rounded-t-3xl sm:rounded-2xl max-h-[95dvh] sm:max-h-[85vh]', sizes[size as keyof typeof sizes])}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="pr-4">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose}
            className="p-2 -mr-1 -mt-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 overscroll-contain">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="shrink-0 p-5 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
        {/* iOS safe area */}
        <div className="h-safe-bottom sm:hidden shrink-0" />
      </div>
    </div>
  );
};

/* ─── Drawer ──────────────────────────────────────────────────────────────── */
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: 'right' | 'left';
}
export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, side = 'right' }) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);
  return (
    <>
      <div className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={onClose} />
      <div className={cn('fixed inset-y-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
        side === 'right' ? 'right-0' : 'left-0',
        isOpen ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full')}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  );
};

/* ─── Alert ───────────────────────────────────────────────────────────────── */
interface AlertProps { variant?: BadgeVariant; title?: string; children: React.ReactNode; className?: string; }
const ALERT_ICON: Record<BadgeVariant, React.FC<any>> = {
  success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle,
  info: Info, default: Info, neutral: Info,
};
const ALERT_STYLE: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger:  'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  default: 'bg-slate-50 border-slate-200 text-slate-800',
  neutral: 'bg-slate-50 border-slate-200 text-slate-600',
};
export const Alert: React.FC<AlertProps> = ({ variant = 'info', title, children, className }) => {
  const Icon = ALERT_ICON[variant as keyof typeof ALERT_ICON];
  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border', ALERT_STYLE[variant], className)}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
};

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse bg-slate-200 rounded-xl', className)} />
);

/* ─── Empty State ─────────────────────────────────────────────────────────── */
interface EmptyStateProps { icon?: React.FC<any>; title: string; description?: string; action?: React.ReactNode; }
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {Icon && (
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
    )}
    <p className="text-base font-semibold text-slate-700 mb-1">{title}</p>
    {description && <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ─── Stat Card ───────────────────────────────────────────────────────────── */
interface StatCardProps { label: string; value: string | number; icon?: React.FC<any>; trend?: number; trendLabel?: string; color?: string; bg?: string; loading?: boolean; }
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, trendLabel, color = 'text-[var(--color-primary)]', bg = 'bg-blue-50', loading }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 truncate">{label}</p>
        {loading ? <Skeleton className="h-8 w-24" /> : (
          <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        )}
        {trend !== undefined && !loading && (
          <p className={cn('flex items-center gap-1 text-xs font-medium mt-2', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
            {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
          </p>
        )}
      </div>
      {Icon && (
        <div className={cn('p-3 rounded-xl shrink-0', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      )}
    </div>
  </Card>
);

/* ─── Page Header ─────────────────────────────────────────────────────────── */
interface PageHeaderProps { icon?: React.FC<any>; category?: string; title: string; description?: string; actions?: React.ReactNode; }
export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, category, title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
    <div>
      {(Icon || category) && (
        <div className="flex items-center gap-2 text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest mb-2">
          {Icon && <Icon className="w-4 h-4" />}
          {category && <span>{category}</span>}
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{title}</h1>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

/* ─── Tab Bar ─────────────────────────────────────────────────────────────── */
interface TabBarProps { tabs: { key: string; label: string; icon?: React.FC<any>; badge?: number }[]; active: string; onChange: (k: string) => void; className?: string; }
export const TabBar: React.FC<TabBarProps> = ({ tabs, active, onChange, className }) => (
  <div className={cn('flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none', className)}>
    {tabs.map(tab => (
      <button key={tab.key} onClick={() => onChange(tab.key)}
        className={cn('flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0',
          active === tab.key ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
        {tab.icon && <tab.icon className="w-4 h-4" />}
        {tab.label}
        {tab.badge !== undefined && tab.badge > 0 && (
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
            active === tab.key ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-600')}>
            {tab.badge > 99 ? '99+' : tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

/* ─── Section ─────────────────────────────────────────────────────────────── */
interface SectionProps { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; }
export const Section: React.FC<SectionProps> = ({ title, description, actions, children, className }) => (
  <div className={cn('space-y-4', className)}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-4">
        <div>
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

/* ─── Data Table ──────────────────────────────────────────────────────────── */
interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode; className?: string; headerClassName?: string; }
interface DataTableProps<T> { columns: Column<T>[]; data: T[]; keyField?: string; loading?: boolean; emptyTitle?: string; emptyDescription?: string; className?: string; onRowClick?: (row: T) => void; }
export function DataTable<T extends Record<string, any>>({ columns, data, keyField = 'id', loading, emptyTitle = 'Aucune donnée', emptyDescription, className, onRowClick }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto -mx-4 sm:mx-0', className)}>
      <div className="min-w-full inline-block align-middle">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map(col => (
                <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap first:pl-4 sm:first:pl-6', col.headerClassName)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 first:pl-4 sm:first:pl-6">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-sm">
                  <p className="font-semibold text-slate-500">{emptyTitle}</p>
                  {emptyDescription && <p className="mt-1 text-xs">{emptyDescription}</p>}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row[keyField] ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={cn('transition-colors hover:bg-slate-50', onRowClick && 'cursor-pointer')}>
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-sm text-slate-700 first:pl-4 sm:first:pl-6', col.className)}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
interface KpiCardProps { label: string; value: string | number; subtitle?: string; icon: React.FC<any>; color?: string; bg?: string; trend?: number; loading?: boolean; onClick?: () => void; }
export const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtitle, icon: Icon, color = 'text-blue-600', bg = 'bg-blue-50', trend, loading, onClick }) => (
  <Card className={cn('p-4 sm:p-5', onClick && 'cursor-pointer hover:shadow-md transition-shadow')} onClick={onClick}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
      <div className={cn('p-2 rounded-xl shrink-0', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
    </div>
    {loading ? (
      <><Skeleton className="h-7 w-24 mb-1" /><Skeleton className="h-3 w-16" /></>
    ) : (
      <>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        {trend !== undefined && (
          <p className={cn('text-xs font-semibold mt-1.5', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mois préc.
          </p>
        )}
      </>
    )}
  </Card>
);
