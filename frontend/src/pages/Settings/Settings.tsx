import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Drawer, cn } from '../../components/ui';
import { 
  Palette, 
  Bell, 
  Shield,
  Check,
  User,
  Settings,
  Camera,
  Lock,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Monitor,
  History,
  QrCode
} from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { useHistory } from '../../context/HistoryContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import { usePermissions } from '../../hooks/usePermissions';
import { useNotification } from '../../context/NotificationContext';
import { useUser } from '../../context/UserContext';
import { authService } from '../../services/auth.service';

export const SettingsPage = () => {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { logs } = useHistory();
  const { notify } = useNotification();
  const { role, profile, updateProfile, logout: contextLogout } = useUser();

  useEffect(() => {
    // All roles can access settings now as per requirements
    // if (!can('admin_app')) {
    //   navigate('/dashboard');
    // }
  }, [can, navigate]);

  const { currentTheme, setTheme, displayMode, setDisplayMode, density, setDensity } = useTheme();
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<'profile' | 'appearance' | 'notifications'>('profile');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: profile?.name.split(' ')[0] || '',
    lastName: profile?.name.split(' ').slice(1).join(' ') || '',
    matricule: profile?.matricule || '',
    phone: profile?.phone || '',
    language: 'fr'
  });

  useEffect(() => {
    if (profile) {
      setProfileForm(prev => ({
        ...prev,
        firstName: profile.name.split(' ')[0] || '',
        lastName: profile.name.split(' ').slice(1).join(' ') || '',
        matricule: profile.matricule || ''
      }));
    }
  }, [profile]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(1);

  const [textSize, setTextSize] = useState(100);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}%`;
  }, [textSize]);

  useEffect(() => {
    if (!animationsEnabled) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }
  }, [animationsEnabled]);

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      updateProfile({
        name: `${profileForm.firstName} ${profileForm.lastName}`.trim(),
        matricule: profileForm.matricule
      });
      setIsSavingProfile(false);
      notify("Profil mis à jour avec succès", 'success', '/settings');
    }, 1000);
  };

  const handleCancelProfile = () => {
    if (profile) {
      setProfileForm({
        firstName: profile.name.split(' ')[0] || '',
        lastName: profile.name.split(' ').slice(1).join(' ') || '',
        matricule: profile.matricule || '',
        phone: profile.phone || '',
        language: 'fr'
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    if (newPassword !== confirmPassword) {
      notify('Les mots de passe ne correspondent pas', 'error', '/settings');
      setIsUpdatingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      notify('Le nouveau mot de passe doit faire au moins 6 caractères', 'error', '/settings');
      setIsUpdatingPassword(false);
      return;
    }
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      if (result.success) {
        notify('Mot de passe mis à jour avec succès', 'success', '/settings');
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        notify(result.error || 'Erreur lors du changement de mot de passe', 'error', '/settings');
      }
    } catch (err: any) {
      notify(err?.message || 'Erreur lors du changement de mot de passe', 'error', '/settings');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <Settings className="w-4 h-4" />
            <span>{t('settings.system_config')}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{t('settings.app_name')}</h1>
          <p className="text-slate-500 font-medium mt-1">Gérez vos préférences, votre sécurité et l'apparence de votre ERP</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white border-slate-200 font-bold h-12 px-6" onClick={() => setIsHistoryDrawerOpen(true)}>
            <History className="w-5 h-5 mr-2" />
            {t('settings.change_history')}
          </Button>
          <Button variant="danger" className="font-bold h-12 px-6 shadow-lg shadow-red-900/20" onClick={() => setIsLogoutModalOpen(true)}>
            <LogOut className="w-5 h-5 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar Navigation */}
        <div className="space-y-1">
          <SettingsNavButton 
            icon={User} 
            label="Mon Profil" 
            active={activeSection === 'profile'} 
            onClick={() => setActiveSection('profile')} 
          />
          <SettingsNavButton 
            icon={Monitor} 
            label="Apparence & Thèmes" 
            active={activeSection === 'appearance'} 
            onClick={() => setActiveSection('appearance')} 
          />
          <SettingsNavButton 
            icon={Bell} 
            label="Notifications" 
            active={activeSection === 'notifications'} 
            onClick={() => setActiveSection('notifications')} 
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-10">
          <AnimatePresence mode="wait">
            {activeSection === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="p-8 border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-[var(--color-accent)] text-white flex items-center justify-center text-3xl font-black shadow-xl overflow-hidden">
                        {profile?.photoUrl ? (
                          <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          profile?.name.split(' ').map(n => n[0]).join('') || 'U'
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-2 bg-white border border-slate-100 text-slate-600 rounded-lg shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                        <Camera className="w-4 h-4" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateProfile({ photoUrl: reader.result as string });
                                notify("Photo de profil mise à jour", 'success');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div className="text-center md:text-left">
                      <h2 className="text-xl font-bold text-slate-900">{profile?.name || 'Utilisateur'}</h2>
                      <p className="text-slate-500 text-sm">
                        {profile?.matricule} • {
                          role === 'Directeur_technique' ? 'Directeur Général' : 
                          role === 'Chef_chantier' ? 'Chef de Chantier' :
                          role === 'RH' ? 'RH' :
                          'Technicien Chantier'
                        }
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          Compte {
                            role === 'Directeur_technique' ? 'Administrateur' : 
                            role === 'Chef_chantier' ? 'Superviseur' :
                            role === 'RH' ? 'Gestionnaire' :
                            'Opérateur'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.first_name')}</label>
                      <Input 
                        value={profileForm.firstName} 
                        className="bg-slate-50/50 border-slate-200" 
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom</label>
                      <Input 
                        value={profileForm.lastName} 
                        className="bg-slate-50/50 border-slate-200" 
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Matricule</label>
                      <Input 
                        value={profileForm.matricule} 
                        className="bg-slate-50/50 border-slate-200" 
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Téléphone</label>
                      <Input 
                        value={profileForm.phone} 
                        className="bg-slate-50/50 border-slate-200" 
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('settings.language_pref')}</label>
                      <select 
                        value={profileForm.language}
                        className="w-full h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm outline-none"
                        disabled={true}
                      >
                        <option value="fr">{t('settings.french')}</option>
                        <option value="en">{t('settings.english')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-3">
                    <p className="text-xs text-slate-400 italic">{t('settings.admin_managed')}</p>
                  </div>
                </Card>

                <Card className="p-8 border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">{t('settings.security_account')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <Lock className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Mot de passe</p>
                          <p className="text-xs text-slate-500">Dernière modification il y a 3 mois</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(true)} className="text-xs font-bold">{t('common.edit')}</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <Shield className={cn("w-5 h-5", is2FAEnabled ? "text-emerald-500" : "text-slate-400")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{t('settings.two_factor')}</p>
                            {is2FAEnabled && <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">{t('settings.enabled')}</span>}
                          </div>
                          <p className="text-xs text-slate-500">{is2FAEnabled ? "Votre compte est sécurisé" : "Non activée"}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs font-bold" onClick={() => setIs2FAModalOpen(true)}>
                        {is2FAEnabled ? "Gérer" : "Activer"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeSection === 'appearance' && (
              <motion.div 
                key="appearance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="p-8 border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">{t('settings.display_mode')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DisplayModeCard 
                      icon={Sun} 
                      label="Mode Clair" 
                      active={displayMode === 'light'} 
                      onClick={() => setDisplayMode('light')}
                    />
                    <DisplayModeCard 
                      icon={Moon} 
                      label="Mode Sombre" 
                      active={displayMode === 'dark'} 
                      onClick={() => setDisplayMode('dark')}
                    />
                    <DisplayModeCard 
                      icon={Monitor} 
                      label="Système" 
                      active={displayMode === 'system'} 
                      onClick={() => setDisplayMode('system')}
                    />
                  </div>
                </Card>

                <Card className="p-8 border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">{t('settings.interface_density')}</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t('settings.font_size')}</p>
                        <p className="text-xs text-slate-500">Ajuster la taille du texte pour une meilleure lisibilité</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => setTextSize(Math.max(80, textSize - 10))}>A-</Button>
                        <span className="text-sm font-bold px-2">{textSize}%</span>
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => setTextSize(Math.min(120, textSize + 10))}>A+</Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Densité de l'interface</p>
                        <p className="text-xs text-slate-500">Espacement entre les éléments de l'interface</p>
                      </div>
                      <select 
                        value={density}
                        onChange={(e) => setDensity(e.target.value as any)}
                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      >
                        <option value="comfortable">Confortable</option>
                        <option value="compact">Compact</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Animations</p>
                        <p className="text-xs text-slate-500">Activer les transitions fluides entre les pages</p>
                      </div>
                      <button 
                        className={cn("w-12 h-6 rounded-full relative transition-colors", animationsEnabled ? "bg-emerald-500" : "bg-slate-300")}
                        onClick={() => setAnimationsEnabled(!animationsEnabled)}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all", animationsEnabled ? "right-1" : "left-1")}></div>
                      </button>
                    </div>
                  </div>
                </Card>

                <Card className="p-8 border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Catalogue de Thèmes</h3>
                      <p className="text-xs text-slate-500 mt-1">Personnalisez les couleurs de votre espace de travail</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setTheme(theme.id)}
                        className={cn(
                          "group relative flex flex-col p-3 rounded-2xl border transition-all hover:border-slate-300",
                          currentTheme.id === theme.id ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]" : "border-slate-100 bg-white"
                        )}
                      >
                        <div className="w-full aspect-video rounded-xl mb-3 flex flex-col overflow-hidden border border-slate-100">
                          <div className="flex-1" style={{ backgroundColor: theme.primary }}></div>
                          <div className="h-1/3" style={{ backgroundColor: theme.accent }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 truncate w-full">{theme.name}</span>
                        <span className="text-[8px] text-slate-400 font-medium uppercase mt-0.5">{theme.category}</span>
                        {currentTheme.id === theme.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeSection === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="p-8 border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Canaux de communication</h3>
                  <div className="space-y-4">
                    <NotificationToggle 
                      title="Notifications Email" 
                      desc="Recevoir les rapports et alertes par courrier électronique" 
                      enabled={true} 
                    />
                    <NotificationToggle 
                      title="Notifications Push" 
                      desc="Alertes en temps réel sur votre navigateur et mobile" 
                      enabled={true} 
                    />
                    <NotificationToggle 
                      title="Alertes SMS" 
                      desc="Notifications critiques pour les urgences chantiers" 
                      enabled={false} 
                    />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Password Modal */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        title="Modifier le mot de passe"
        size="md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <Input label="Mot de passe actuel" type="password" required
            value={currentPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} />
          <Input label="Nouveau mot de passe" type="password" required
            value={newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} />
          <Input label="Confirmer le nouveau mot de passe" type="password" required
            value={confirmPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} />
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsPasswordModalOpen(false)} className="font-bold" disabled={isUpdatingPassword}>
              Annuler
            </Button>
            <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                "Mettre à jour"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* History Drawer */}
      <Drawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        title={t('settings.change_history')}
      >
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500">{log.date}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-md">{log.module}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">{log.action}</p>
              <p className="text-xs text-slate-500">Par: {log.user}</p>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Logout Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Déconnexion"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir vous déconnecter de votre session ?</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsLogoutModalOpen(false)} className="font-bold">{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => {
              setIsLogoutModalOpen(false);
              contextLogout();
              notify("Déconnexion réussie. Redirection vers l'écran de connexion...", "info");
              setTimeout(() => navigate('/login'), 1000);
            }} className="font-bold">Se déconnecter</Button>
          </div>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => {
          setIs2FAModalOpen(false);
          setTwoFAStep(1);
        }}
        title={is2FAEnabled ? "Gérer la Double Authentification" : "Activer la Double Authentification"}
        size="md"
      >
        <div className="space-y-6">
          {is2FAEnabled ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-600">La double authentification est actuellement activée sur votre compte.</p>
              <Button variant="danger" className="w-full font-bold" onClick={() => {
                setIs2FAEnabled(false);
                setIs2FAModalOpen(false);
                notify(t('settings.two_factor') + " désactivée.", "warning", '/settings');
              }}>Désactiver</Button>
            </div>
          ) : (
            <>
              {twoFAStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Sécurisez votre compte en ajoutant une étape de vérification supplémentaire lors de la connexion.</p>
                  <Button className="w-full font-bold" onClick={() => setTwoFAStep(2)}>Commencer la configuration</Button>
                </div>
              )}
              {twoFAStep === 2 && (
                <div className="space-y-6 text-center">
                  <p className="text-sm text-slate-600">Scannez ce QR Code avec votre application d'authentification (Google Authenticator, Authy, etc.)</p>
                  <div className="w-48 h-48 bg-slate-100 border-2 border-dashed border-slate-300 mx-auto flex items-center justify-center rounded-xl">
                    <QrCode className="w-16 h-16 text-slate-400" />
                  </div>
                  <p className="text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">ABCD-EFGH-IJKL-MNOP</p>
                  <Button className="w-full font-bold" onClick={() => setTwoFAStep(3)}>{t('common.next')}</Button>
                </div>
              )}
              {twoFAStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Entrez le code à 6 chiffres généré par votre application.</p>
                  <Input placeholder="000 000" className="text-center text-2xl tracking-widest font-mono" />
                  <Button className="w-full font-bold" onClick={() => setTwoFAStep(4)}>Vérifier le code</Button>
                </div>
              )}
              {twoFAStep === 4 && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Configuration terminée</h3>
                  <p className="text-sm text-slate-600">Votre compte est désormais protégé par la double authentification.</p>
                  <Button className="w-full font-bold" onClick={() => {
                    setIs2FAEnabled(true);
                    setIs2FAModalOpen(false);
                    setTwoFAStep(1);
                    notify(t('settings.two_factor') + " activée avec succès !", 'success', '/settings');
                  }}>{t('common.finish')}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

const NotificationToggle = ({ title, desc, enabled }: any) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
    <div>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <button className={cn(
      "w-10 h-5 rounded-full relative transition-all duration-300",
      enabled ? "bg-emerald-500" : "bg-slate-200"
    )}>
      <div className={cn(
        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
        enabled ? "right-1" : "left-1"
      )}></div>
    </button>
  </div>
);

const DisplayModeCard = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "p-6 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all",
      active ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg shadow-[var(--color-primary)]/10" : "border-slate-50 hover:border-slate-200 bg-slate-50/50"
    )}
  >
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", active ? "bg-[var(--color-primary)] text-white" : "bg-white text-slate-400")}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">{label}</span>
  </button>
);

const SettingsNavButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 w-full px-6 py-4 rounded-3xl text-sm font-black transition-all",
      active 
        ? "bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/20 scale-105" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400")} />
    <span className="tracking-tight">{label}</span>
    {active && <ChevronRight className="ml-auto w-4 h-4 text-white/50" />}
  </button>
);
