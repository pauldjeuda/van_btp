import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { useTranslation } from 'react-i18next';
import { LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/auth.service';

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [matricule, setMatricule] = useState(() => {
    const savedRemember = localStorage.getItem('remember_me') === 'true';
    return savedRemember ? localStorage.getItem('remembered_matricule') || '' : '';
  });
  const [password,  setPassword]  = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true';
  });
  const { role, setRole, setProfile } = useUser();
  const { notify } = useNotification();

  useEffect(() => {
    if (role) navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanMatricule = matricule.trim();
    const cleanPassword  = password.trim();

    if (!cleanMatricule || !cleanPassword) {
      notify('Le matricule et le mot de passe sont obligatoires.', 'error', '/login');
      setIsLoading(false);
      return;
    }

    // compagnie et service sont gérés automatiquement dans auth.service.ts selon VITE_DATA_SOURCE
    const result = await authService.login({
      matricule: cleanMatricule,
      password:  cleanPassword,
    });

    if (result.success && result.user && result.role) {
      // Gérer le "Se souvenir de moi"
      if (rememberMe) {
        localStorage.setItem('remembered_matricule', cleanMatricule);
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remembered_matricule');
        localStorage.removeItem('remember_me');
      }

      setRole(result.role);
      setProfile({
        matricule: result.user.matricule,
        name:      [result.user.prenom, result.user.nom].filter(Boolean).join(' ').trim() || result.user.matricule,
        email:     result.user.email,
        photoUrl:  result.user.photoUrl,
      });
      notify(
        `Bienvenue, ${[result.user.prenom, result.user.nom].filter(Boolean).join(' ').trim() || result.user.matricule} !`,
        'success',
        '/dashboard'
      );
      navigate('/dashboard', { replace: true });
    } else {
      notify(result.error || 'Matricule ou mot de passe incorrect.', 'error', '/login');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Partie gauche - Informations plateforme */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/90 relative overflow-hidden">
        {/* Pattern de fond décoratif */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl" />
          <div className="absolute top-1/2 right-20 w-48 h-48 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-white rounded-full blur-2xl" />
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-white rounded-full blur-xl" />
        </div>
        
        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-lg"
          >
            {/* Logo */}
            <div className="flex items-center mb-8">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl overflow-hidden mr-4">
                <img src="/logo.png?v=2" alt="VAN BTP" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">VAN BTP</h1>
                <p className="text-blue-100 text-sm">Système de gestion intégré</p>
              </div>
            </div>

            {/* Titre principal */}
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Bienvenue dans votre espace de travail
            </h2>

            {/* Description */}
            <p className="text-lg text-blue-100 mb-8 leading-relaxed">
              La solution complète pour la gestion de vos chantiers, équipes et ressources. 
              Optimisez votre productivité avec notre plateforme moderne et intuitive.
            </p>

            {/* Features list */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-blue-50">Gestion des chantiers en temps réel</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-blue-50">Suivi des équipes et ressources</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-blue-50">Rapports et analyses détaillés</span>
              </div>
            </div>

            
            {/* Footer */}
            <div className="flex items-center text-blue-200 text-sm">
              <ShieldCheck className="w-4 h-4 mr-2" />
              <span>Sécurisé et certifié ISO 27001</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Partie droite - Formulaire de connexion */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Background décoratif */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-accent)]/8 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[var(--color-primary)]/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-accent)]/5 rounded-full blur-2xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          whileHover={{ 
            y: -8,
            transition: { duration: 0.3, ease: "easeOut" }
          }}
          className="w-full max-w-md relative z-10"
        >
          {/* Header mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--color-primary)]/10 rounded-2xl overflow-hidden mb-4">
              <img src="/logo.png?v=2" alt="VAN BTP" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">VAN BTP</h1>
            <p className="text-slate-600">Connexion à votre espace</p>
          </div>

          {/* Carte du formulaire */}
          <Card className="p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] shadow-[var(--color-primary)]/20 border-0 bg-white/90 backdrop-blur-xl transform hover:scale-[1.02] transition-all duration-300 ease-out">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {t('auth.welcome')}
              </h2>
              <p className="text-slate-600">
                Connectez-vous pour accéder à votre tableau de bord
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  label="Matricule"
                  type="text"
                  placeholder="Ex: VMAT0001"
                  required
                  className="h-12 text-base"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label={t('auth.password')}
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-12 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-2"
                  />
                  <span className="text-sm text-slate-600">{t('auth.remember_me')}</span>
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold shadow-xl shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/30 transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    {t('auth.login')}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center text-slate-500 text-sm">
                <ShieldCheck className="w-4 h-4 mr-2" />
                <span>Connexion sécurisée par Dowhile</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Inscription Désactivée</h1>
        <p className="text-slate-500 mb-6">Veuillez contacter l'administrateur pour obtenir vos accès.</p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </Card>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Récupération Désactivée</h1>
        <p className="text-slate-500 mb-6">Veuillez contacter le service IT pour réinitialiser votre mot de passe.</p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </Card>
    </div>
  );
};
