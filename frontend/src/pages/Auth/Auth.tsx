import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { useTranslation } from 'react-i18next';
import { LogIn, User, Lock, Eye, EyeOff, ArrowRight, Activity, Terminal, ShieldCheck, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/auth.service';
import { getHomePathForRole } from '../../lib/defaultRoute';

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [matricule, setMatricule] = useState(() => {
    const savedRemember = localStorage.getItem('remember_me') === 'true';
    return savedRemember ? localStorage.getItem('remembered_matricule') || '' : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true';
  });
  const { role, setRole, setProfile } = useUser();
  const { notify } = useNotification();

  useEffect(() => {
    if (role) navigate(getHomePathForRole(role), { replace: true });
  }, [role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanMatricule = matricule.trim();
    const cleanPassword = password.trim();

    if (!cleanMatricule || !cleanPassword) {
      notify(t('auth.validation_required'), 'error', '/login');
      setIsLoading(false);
      return;
    }

    const result = await authService.login({
      matricule: cleanMatricule,
      password: cleanPassword,
    });

    if (result.success && result.user && result.role) {
      if (rememberMe) {
        localStorage.setItem('remembered_matricule', cleanMatricule);
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remembered_matricule');
        localStorage.removeItem('remember_me');
      }

      setRole(result.role);
      setProfile({
        id: result.user.id,
        matricule: result.user.matricule,
        name: [result.user.prenom, result.user.nom].filter(Boolean).join(' ').trim() || result.user.matricule,
        email: result.user.email,
        photoUrl: result.user.photoUrl,
      });
      const home = getHomePathForRole(result.role);
      notify(
        t('auth.welcome_user', {
          name: [result.user.prenom, result.user.nom].filter(Boolean).join(' ').trim() || result.user.matricule,
        }),
        'success',
        home
      );
      navigate(home, { replace: true });
    } else {
      notify(result.error || t('auth.invalid_credentials'), 'error', '/login');
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/65 backdrop-brightness-75" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row">
        
        {/* Left Side - Info */}
        <div className="flex-1 hidden lg:flex flex-col p-12 lg:p-20 text-white">
          {/* Top Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-auto"
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png?v=2" alt="Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
            <div className="flex flex-col border-l border-white/20 pl-4">
              <span className="text-xl font-black tracking-tighter uppercase leading-none">VAN BTP</span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-blue-400 uppercase mt-0.5">{t('auth.ecosystem')}</span>
            </div>
          </motion.div>

          {/* Center Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl my-auto"
          >
            <h1 className="text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6 uppercase">
              {t('auth.hero_title')} <br />
              <span className="text-[var(--color-accent)]">{t('auth.hero_sites')}</span> <br />
              {t('auth.hero_precision')}
            </h1>
            <p className="text-sm lg:text-base text-slate-300 max-w-md leading-relaxed mb-6 font-medium opacity-90">
              {t('auth.hero_desc')}
            </p>
          </motion.div>

          {/* Bottom Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex flex-wrap gap-12 mt-auto"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{t('auth.data_security')}</span>
                <span className="text-xs font-black text-white uppercase tracking-wider">{t('auth.secured_infra')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{t('auth.system_version')}</span>
                <span className="text-xs font-black text-white uppercase tracking-wider">{t('auth.version_label')}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Login Card */}
        <div className="flex-1 lg:flex-none lg:w-[500px] flex items-start lg:items-center justify-center p-6 pt-10 lg:p-8 relative">


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-[400px] bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden"
          >
            {/* Ambient glows */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Logo without background container */}
              <div className="w-24 h-24 mb-4 flex items-center justify-center">
                <img src="/logo.png?v=2" alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
              </div>

              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">{t('auth.login_title')}</h2>
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.15em] mb-8 max-w-[280px] leading-relaxed">
                {t('auth.auth_required')}
              </p>

              <form onSubmit={handleLogin} className="w-full space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                    {t('auth.matricule_label')}
                  </label>
                  <Input
                    type="text"
                    placeholder="VMAT0001"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    className="bg-slate-800/40 border-white/10 text-white placeholder:text-slate-500 h-12 rounded-[16px] focus:bg-slate-800/60 focus:border-white/20 transition-all text-sm pl-11 pr-4"
                    leftIcon={<Mail className="w-5 h-5 text-slate-400" />}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                    {t('auth.password_label')}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800/40 border-white/10 text-white placeholder:text-slate-500 h-12 rounded-[16px] focus:bg-slate-800/60 focus:border-white/20 transition-all text-sm pl-11 pr-11"
                      leftIcon={<Lock className="w-5 h-5 text-slate-400" />}
                      hidePasswordToggle={true}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-20"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center px-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300 ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-white/10 bg-slate-800/40 group-hover:border-white/20'}`}>
                      {rememberMe && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                      {t('auth.remember_me')}
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-[16px] text-xs font-black uppercase tracking-[0.1em] shadow-lg group active:scale-[0.98] transition-all"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-950 rounded-full animate-spin mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      {t('auth.enter_system')}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </Button>

                <div className="pt-6 border-t border-white/5 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    {t('auth.powered_by')}
                  </span>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">{t('auth.registration_disabled')}</h1>
        <p className="text-slate-500 mb-6">{t('auth.contact_admin')}</p>
        <Button onClick={() => window.history.back()}>{t('auth.back')}</Button>
      </Card>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">{t('auth.recovery_disabled')}</h1>
        <p className="text-slate-500 mb-6">{t('auth.recovery_it')}</p>
        <Button onClick={() => window.history.back()}>{t('auth.back')}</Button>
      </Card>
    </div>
  );
};
