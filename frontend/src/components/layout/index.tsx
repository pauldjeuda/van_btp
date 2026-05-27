import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, HardHat, Wallet, Truck, ShieldCheck,
  Settings, LogOut, Menu, X, Bell, Search, ChevronRight,
  Globe, Camera, Mail, Phone, MapPin, Clock, AlertTriangle,
  CheckCircle2, Factory, BarChart3, User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { cn, Modal, Drawer, Button, Input, Badge } from '../ui';
import { motion, AnimatePresence } from 'motion/react';
import { useUser, Role } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/auth.service';
import { approvalService } from '../../services/approval.service';
import { scrollToHashElement } from '../../lib/scrollToHash';

const ROLE_I18N_KEYS: Record<string, string> = {
  dg: 'roles.dg',
  chef: 'roles.chef',
  'Directeur technique': 'roles.directeur_technique',
  Chef_chantier: 'roles.chef_chantier',
  'Gestionnaire de stocks': 'roles.gerant_stock',
  Gerant_production: 'roles.gerant_production',
};

const getRoleBadgeColor = (role: Role | null) => {
  const colors: Record<string, string> = {
    // Anciens rôles
    dg: 'bg-purple-100 text-purple-700',
    chef: 'bg-blue-100 text-blue-700',
    'Directeur technique': 'bg-purple-100 text-purple-700',
    Chef_chantier: 'bg-blue-100 text-blue-700',
    'Gestionnaire de stocks': 'bg-indigo-100 text-indigo-700',
    Gerant_production: 'bg-orange-100 text-orange-700',
  };
  return colors[role || ''] || 'bg-slate-100 text-slate-600';
};

export const MainLayout = () => {
  const { t, i18n } = useTranslation();
  const getRoleLabel = (r: Role | null) => t(ROLE_I18N_KEYS[r || ''] || 'roles.user');
  const { role, profile, updateProfile, logout } = useUser();
  const { projects } = useData();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    if (role !== 'Directeur technique') {
      setPendingApprovalsCount(0);
      return;
    }
    const load = () => {
      approvalService.getPending()
        .then((r) => setPendingApprovalsCount(r.counts.total))
        .catch(() => setPendingApprovalsCount(0));
    };
    load();
    window.addEventListener('van_btp:approvals_updated', load);
    return () => window.removeEventListener('van_btp:approvals_updated', load);
  }, [role]);
  const { persistentNotifications, setPersistentNotifications } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false); // closed by default on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // collapsed (icon-only) on desktop
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '', email: profile?.email || '',
    phone: profile?.phone || '',
  });
  useEffect(() => {
    setProfileForm(prev => ({
      ...prev,
      name: profile?.name || prev.name,
      email: profile?.email || prev.email,
      phone: profile?.phone || prev.phone
    }));
  }, [profile]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const allNavItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard', roles: ['Directeur technique'] },
    { icon: HardHat, label: t('nav.projects'), path: '/projects', roles: ['Directeur technique', 'Chef_chantier'] },
    { icon: Wallet, label: t('nav.finances'), path: '/finances', roles: ['Directeur technique', 'Chef_chantier'] },
    { icon: Truck, label: t('nav.resources'), path: '/resources', roles: ['Directeur technique', 'Chef_chantier', 'Gestionnaire de stocks'] },
    { icon: ShieldCheck, label: t('nav.control'), path: '/control', roles: ['Directeur technique', 'Chef_chantier'] },
    { icon: Factory, label: t('nav.production'), path: '/production', roles: ['Directeur technique', 'Gerant_production'] },
    { icon: Globe, label: t('nav.support'), path: '/support', roles: ['Directeur technique', 'Chef_chantier'], dividerBefore: true },
    { icon: Settings, label: t('nav.settings'), path: '/settings', roles: ['Directeur technique', 'Chef_chantier'] },
  ];
  const navItems = allNavItems.filter(item => item.roles.includes(role || ''));

  const unread = persistentNotifications.filter(n => !n.read).length;

  // Search results (simple local filter)
  const searchResults = searchQuery.length > 1
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const expanded = !sidebarCollapsed;

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {!['Gestionnaire de stocks', 'Gerant_production'].includes(role || '') && (
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--color-primary)] text-white transition-all duration-300',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          expanded ? 'w-64' : 'w-[72px]',
        )}>
          {/* Logo */}
          <div className={cn(
            'flex h-16 items-center border-b border-white/10 shrink-0 transition-all',
            expanded ? 'px-5 gap-3' : 'justify-center px-0'
          )}>
            <div className="flex items-center justify-center h-10 w-10 overflow-hidden shrink-0">
              <img src="/logo.png?v=2" alt="VAN BTP" className="w-full h-full object-contain" />
            </div>
            {expanded && (
              <div className="overflow-hidden">
                <p className="font-black text-lg tracking-tight leading-none text-white">VAN BTP</p>
                <p className="text-[9px] text-white/50 font-semibold uppercase tracking-[0.15em] mt-0.5">{t('nav.erp_subtitle')}</p>
              </div>
            )}
            {/* Desktop collapse toggle */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn('hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0', !expanded && 'ml-0')}>
              <ChevronRight className={cn('w-4 h-4 transition-transform duration-300', expanded && 'rotate-180')} />
            </button>
            {/* Mobile close */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/60">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 overscroll-contain">
            {navItems.map((item, idx) => (
              <React.Fragment key={item.path}>
                {item.dividerBefore && idx > 0 && (
                  <div className="my-2 border-t border-white/10 mx-2" />
                )}
                <NavLink to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center rounded-xl transition-all duration-150 group relative',
                    expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3',
                    isActive
                      ? 'bg-white text-[var(--color-primary)] shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}>
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {expanded && <span className="text-sm font-medium truncate">{item.label}</span>}
                      {item.path === '/dashboard' && pendingApprovalsCount > 0 && (
                        <span className={cn(
                          'bg-red-500 text-white text-[10px] font-black min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center',
                          expanded ? 'ml-auto' : 'absolute -top-1 -right-1'
                        )}>
                          {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
                        </span>
                      )}
                      {expanded && isActive && !(item.path === '/dashboard' && pendingApprovalsCount > 0) && (
                        <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                      )}
                      {/* Tooltip when collapsed */}
                      {!expanded && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              </React.Fragment>
            ))}
          </nav>

          {/* User footer */}
          <div className={cn('border-t border-white/10 p-2 shrink-0')}>
            {expanded ? (
              <button onClick={() => setProfileOpen(true)}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/10 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white text-sm font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {profile?.photoUrl
                    ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                    : (profile?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{profile?.name || getRoleLabel(role)}</p>
                  <p className="text-xs text-white/50 truncate">{getRoleLabel(role)}</p>
                </div>
              </button>
            ) : (
              <button onClick={() => setProfileOpen(true)}
                className="flex justify-center w-full p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white text-sm font-bold flex items-center justify-center overflow-hidden">
                  {profile?.photoUrl
                    ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                    : (profile?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                  }
                </div>
              </button>
            )}
            <button onClick={handleLogout}
              className={cn('flex items-center gap-3 w-full p-2.5 rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors mt-1',
                !expanded && 'justify-center')}>
              <LogOut className="w-4 h-4 shrink-0" />
              {expanded && <span className="text-sm font-medium">{t('nav.logout')}</span>}
            </button>
          </div>
        </aside>
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 shrink-0">
          {/* Mobile hamburger */}
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-500 shrink-0">
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder={t('nav.search_projects')} className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-all placeholder:text-slate-400" />
            {/* Dropdown résultats */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => { navigate('/projects'); setSearchQuery(''); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-50 text-left transition-colors">
                    <HardHat className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.code} · {p.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Mobile search */}
            <button className="sm:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-500">
              <Search className="w-5 h-5" />
            </button>

            {/* Language */}
            <button onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-100 rounded-xl text-slate-500 text-xs font-bold uppercase transition-colors">
              <Globe className="w-4 h-4" />
              {i18n.language}
            </button>

            {/* Notifications */}
            <button onClick={() => setNotifOpen(true)}
              className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

            {/* Profile pill */}
            <button onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 sm:gap-3 p-1.5 sm:pl-1.5 sm:pr-3 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                  : (profile?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                }
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{profile?.name || 'Utilisateur'}</p>
                <p className="text-xs text-slate-400 leading-tight">{getRoleLabel(role)}</p>
              </div>
            </button>

            {['Gestionnaire de stocks', 'Gerant_production'].includes(role || '') && (
              <button onClick={handleLogout}
                className="flex items-center gap-2 p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-bold">Déconnexion</span>
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto pb-safe">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ── Notifications Drawer ─────────────────────────────────────────── */}
      <Drawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} title={t('nav.notifications')}>
        <div className="space-y-2">
          {unread > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700">{unread} non lue{unread > 1 ? 's' : ''}</span>
              <button onClick={() => setPersistentNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
                Tout marquer lu
              </button>
            </div>
          )}
          {persistentNotifications.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Aucune notification</p>
            </div>
          )}
          {persistentNotifications.map(notif => (
            <div key={notif.id} onClick={() => {
              if (notif.path) {
                const [pathname, hashPart] = notif.path.split('#');
                if (hashPart) {
                  navigate({ pathname: pathname || '/dashboard', hash: hashPart });
                  scrollToHashElement(`#${hashPart}`);
                } else {
                  navigate(notif.path);
                }
                setNotifOpen(false);
              }
              setPersistentNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            }}
              className={cn('flex gap-3 p-3.5 rounded-2xl cursor-pointer transition-colors',
                notif.read ? 'bg-slate-50 opacity-60' : 'bg-white border border-slate-100 shadow-sm hover:bg-slate-50')}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  notif.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600')}>
                <notif.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm text-slate-900 leading-tight', !notif.read && 'font-semibold')}>{notif.title}</p>
                  <span className="text-xs text-slate-400 shrink-0">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{notif.desc}</p>
              </div>
              {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      </Drawer>

      {/* ── Profile Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={profileOpen} onClose={() => { setProfileOpen(false); setEditingProfile(false); }}
        title={editingProfile ? t('profile.edit_title') : t('profile.title')} size="md">
        {!editingProfile ? (
          <div className="space-y-5">
            {/* Avatar + nom */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white text-2xl font-bold flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                  : (profile?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                }
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{profile?.name || 'Utilisateur'}</p>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1', getRoleBadgeColor(role))}>
                  {getRoleLabel(role)}
                </span>
              </div>
            </div>
            {/* Infos */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: Mail, label: 'Email', value: profile?.email || '—' },
                { icon: Phone, label: t('profile.phone'), value: profileForm.phone || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => setEditingProfile(true)}>{t('common.edit')}</Button>
              <Button variant="danger" fullWidth onClick={handleLogout}>Déconnexion</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); updateProfile({ name: profileForm.name, email: profileForm.email }); setEditingProfile(false); }}
            className="space-y-4">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white text-2xl font-bold flex items-center justify-center overflow-hidden shadow-md">
                  {profile?.photoUrl
                    ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                    : (profileForm.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                  }
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-[var(--color-primary)] border border-slate-200 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) updateProfile({ photoUrl: URL.createObjectURL(f) }); }} />
              </div>
            </div>
            <Input label="Nom complet" value={profileForm.name} required
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm(p => ({ ...p, name: e.target.value }))} />
            <Input label="Email" type="email" value={profileForm.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm(p => ({ ...p, email: e.target.value }))} />
            <Input label={t('profile.phone')} value={profileForm.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth type="button" onClick={() => setEditingProfile(false)}>{t('common.cancel')}</Button>
              <Button fullWidth type="submit">{t('common.save')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
