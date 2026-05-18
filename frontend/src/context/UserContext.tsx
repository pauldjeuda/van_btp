import React, {
  createContext, useContext, useMemo, useState,
  useEffect, useCallback, ReactNode,
} from 'react';
import { authService } from '../services/auth.service';
import { employeeRHService, EmployeeRH } from '../services/employeeRH.service';

export type Role = 'Directeur_technique' | 'Chef_chantier' | 'Technicien_chantier' | 'RH';

export interface UserProfile {
  matricule: string;
  name: string;
  email?: string;
  photoUrl?: string;
  phone?: string;
  adresse?: string;
  service?: string;
  compagnie?: string;
  category?: string;
  role?: string;
  dateNaissance?: string;
  sexe?: string;
  situationMatrimoniale?: string;
  nombreEnfants?: number;
  numeroCni?: string;
  ecoleFrequente?: string;
  dernierDiplome?: string;
  numeroCnps?: string;
  compteBancaire?: string;
  banque?: string;
  joinDate?: string;
  id?: string | number;
}

interface UserContextType {
  role: Role | null;
  setRole: (role: Role | null) => void;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
  isRestoring: boolean;
  employeeData: UserProfile | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = authService.getCachedUser();
  const cachedRole = authService.getCachedRole();

  const [role, setRoleState] = useState<Role | null>(cachedRole);
  const [profile, setProfileState] = useState<UserProfile | null>(
    cachedUser
      ? {
        id: cachedUser.id,
        matricule: cachedUser.matricule,
        // Éviter d'utiliser les valeurs par défaut "Externe Utilisateur" du cache JWT
        name: (() => {
          const prenom = cachedUser.prenom && cachedUser.prenom !== 'Externe' ? cachedUser.prenom : '';
          const nom = cachedUser.nom && cachedUser.nom !== 'Utilisateur' ? cachedUser.nom : '';
          const jwtName = [prenom, nom].filter(Boolean).join(' ').trim();
          return jwtName || cachedUser.matricule || 'Utilisateur';
        })(),
        email: cachedUser.email,
        photoUrl: cachedUser.photoUrl,
      }
      : null
  );
  const [employeeData, setEmployeeData] = useState<UserProfile | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);

  // ── Restauration de session au démarrage + récupération des données complètes ──────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const session = await authService.restoreSession();
      if (session) {
        setRoleState(session.role);

        // Éviter d'utiliser les valeurs par défaut "Externe Utilisateur" du JWT
        const prenom = session.user.prenom && session.user.prenom !== 'Externe' ? session.user.prenom : '';
        const nom = session.user.nom && session.user.nom !== 'Utilisateur' ? session.user.nom : '';
        const jwtName = [prenom, nom].filter(Boolean).join(' ').trim();

        const baseProfile = {
          id: session.user.id,
          matricule: session.user.matricule,
          name: jwtName || session.user.matricule || 'Utilisateur',
          email: session.user.email,
          photoUrl: session.user.photoUrl,
        };
        setProfileState(baseProfile);

        // Récupérer les données complètes de l'employé depuis VAN RH
        // On passe AUSSI le matricule comme fallback car l'ID local ne correspond pas toujours à l'ID VAN RH
        try {
          const completeEmployee = await employeeRHService.getEmployeeById(
            session.user.id,
            session.user.matricule   // ← fallback : recherche dans la liste complète par matricule
          );
          if (completeEmployee) {
            // Mapping permissif : VAN RH peut utiliser des noms de champs différents
            const raw = completeEmployee as any;

            // Construire le nom complet depuis VAN RH si disponible
            const vanRHFirstName = raw.prenom || raw.Prenom || raw.firstName || raw.FirstName || '';
            const vanRHLastName = raw.nom || raw.Nom || raw.lastName || raw.LastName || '';
            const vanRHFullName = raw.name || raw.Name || raw.fullName || raw.FullName ||
              ([vanRHFirstName, vanRHLastName].filter(Boolean).join(' ').trim());

            const enrichedProfile: UserProfile = {
              ...baseProfile,
              // Utiliser le nom complet de VAN RH s'il est disponible et valide
              name: (vanRHFullName && vanRHFullName !== 'Externe Utilisateur' && vanRHFullName !== 'undefined undefined')
                ? vanRHFullName
                : baseProfile.name,
              // Le service normalise déjà le phone via extractPhone(), mais on garde le fallback
              phone: raw.phone || raw.Phone || raw.telephone || raw.Tel || raw.tel || raw.phoneNumber || raw.phone_number || '',
              adresse: raw.adresse || raw.Adresse || raw.address || raw.Address || '',
              service: raw.service || raw.Service || raw.department || raw.Department || '',
              compagnie: raw.compagnie || raw.Compagnie || raw.company || raw.Company || '',
              category: raw.category || raw.Category || raw.categorie || raw.Categorie || '',
              role: raw.role || raw.Role || raw.poste || raw.Poste || '',
              dateNaissance: raw.dateNaissance || raw.DateNaissance || raw.birthDate || raw.BirthDate || '',
              sexe: raw.sexe || raw.Sexe || raw.gender || raw.Gender || '',
              situationMatrimoniale: raw.situationMatrimoniale || raw.SituationMatrimoniale || raw.maritalStatus || '',
              nombreEnfants: Number(raw.nombreEnfants || raw.NombreEnfants || raw.childrenCount || 0),
              numeroCni: raw.numeroCni || raw.NumeroCni || raw.cni || raw.CNI || raw.identityNumber || '',
              ecoleFrequente: raw.ecoleFrequente || raw.EcoleFrequente || raw.school || '',
              dernierDiplome: raw.dernierDiplome || raw.DernierDiplome || raw.diploma || raw.diplome || '',
              numeroCnps: raw.numeroCnps || raw.NumeroCnps || raw.cnps || raw.CNPS || raw.socialSecurityNumber || '',
              compteBancaire: raw.compteBancaire || raw.CompteBancaire || raw.rib || raw.RIB || raw.bankAccount || '',
              banque: raw.banque || raw.Banque || raw.bank || raw.Bank || '',
              joinDate: raw.joinDate || raw.JoinDate || raw.dateEmbauche || raw.DateEmbauche || raw.hireDate || '',
            };
            console.log('✅ [USER CONTEXT] Profil enrichi:', {
              phone: enrichedProfile.phone,
              service: enrichedProfile.service,
              matricule: session.user.matricule,
            });
            setProfileState(enrichedProfile);
            setEmployeeData(enrichedProfile);
          } else {
            console.warn('⚠️ [USER CONTEXT] Aucune donnée employé retournée pour id=', session.user.id, 'matricule=', session.user.matricule);
          }
        } catch (err: any) {
          console.warn('⚠️ [USER CONTEXT] Impossible de récupérer les données complètes de l\'employé:', err.message);
        }
      } else if (!cachedRole) {
        // Pas de session valide et pas de cache → s'assurer que l'état est vide
        setRoleState(null);
        setProfileState(null);
      }
      setIsRestoring(false);
    };
    restore();
  }, []);

  // ── Écoute de l'événement session_expired (émis par api.ts) ──────────────
  useEffect(() => {
    const onExpired = () => {
      setRoleState(null);
      setProfileState(null);
      setEmployeeData(null);
    };
    window.addEventListener('van_btp:session_expired', onExpired);
    return () => window.removeEventListener('van_btp:session_expired', onExpired);
  }, []);

  const setRole = (nextRole: Role | null) => setRoleState(nextRole);
  const setProfile = (nextProfile: UserProfile | null) => setProfileState(nextProfile);
  const updateProfile = (updates: Partial<UserProfile>) =>
    setProfileState(prev => prev ? { ...prev, ...updates } : null);

  const logout = useCallback(async () => {
    await authService.logout();
    setRoleState(null);
    setProfileState(null);
    setEmployeeData(null);
  }, []);

  const value = useMemo(
    () => ({ role, setRole, profile, setProfile, updateProfile, logout, isRestoring, employeeData }),
    [role, profile, isRestoring, logout, employeeData]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
