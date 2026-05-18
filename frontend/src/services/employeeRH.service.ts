/**
 * @file employeeRH.service.ts
 * Service pour récupérer les employés.
 *
 * Basculement via VITE_DATA_SOURCE dans frontend/.env :
 *   VITE_DATA_SOURCE=local   → Retourne un tableau vide (données locales à venir)
 *   VITE_DATA_SOURCE=van_rh  → Données depuis le serveur VAN RH distant
 */

export interface EmployeeRH {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
  phone?: string;
  role: string;
  service: string;
  compagnie: string;
  category?: string;
  contractType?: string;
  status?: string;
  avatar?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  sexe?: string;
  adresse?: string;
  situationMatrimoniale?: string;
  nombreEnfants?: number;
  personneAContacter?: string;
  numeroPersonneAContacter?: string;
  numeroCni?: string;
  ecoleFrequente?: string;
  dernierDiplome?: string;
  numeroCnps?: string;
  compteBancaire?: string;
  banque?: string;
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Source de données active ─────────────────────────────────────────────────
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'local';
const VAN_RH_URL = import.meta.env.VITE_VAN_RH_URL || 'http://10.99.173.66:4000';

const isVanRH = DATA_SOURCE === 'van_rh';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getVanRHToken = (): string | null => {
  const token = localStorage.getItem('van_rh_token');
  if (!token) console.warn('⚠️ [EMPLOYEE RH SERVICE] Aucun token VAN RH dans localStorage');
  return token;
};

const getAuthHeaders = (): HeadersInit => {
  const token = getVanRHToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Implémentation VAN RH ────────────────────────────────────────────────────

const getAllEmployeesVanRH = async (): Promise<EmployeeRH[]> => {
  console.log(`🌐 [EMPLOYEE RH SERVICE] Récupération depuis VAN RH : ${VAN_RH_URL}/api/employer-app/btp`);

  const response = await fetch(`${VAN_RH_URL}/api/employer-app/btp`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur VAN RH HTTP ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  console.log(`✅ [EMPLOYEE RH SERVICE] ${Array.isArray(json) ? json.length : 0} employés reçus`);

  // Console log détaillé pour voir les données reçues
  if (Array.isArray(json) && json.length > 0) {
    console.log('📋 [EMPLOYEE RH SERVICE] Détails des employés VAN RH reçus :');
    console.table(json.slice(0, 3)); // Affiche les 3 premiers employés en tableau
    console.log('🔍 [EMPLOYEE RH SERVICE] Exemple complet du premier employé :');
    console.log(json[0]); // Affiche le premier employé en détail
  } else {
    console.log('⚠️ [EMPLOYEE RH SERVICE] Aucun employé reçu ou format invalide :', json);
  }

  return Array.isArray(json) ? json : [];
};

/**
 * Normalise les champs téléphone qui peuvent varier selon l'API VAN RH :
 * phone, Phone, telephone, Tel, tel, phoneNumber, phone_number
 */
const extractPhone = (raw: any): string =>
  raw?.phone || raw?.Phone || raw?.telephone || raw?.Tel || raw?.tel ||
  raw?.phoneNumber || raw?.phone_number || raw?.Telephone || '';

/**
 * Récupère un employé VAN RH par son ID.
 * Stratégie à 2 niveaux :
 *   1. Appel direct /api/employer-app/btp/:id  (rapide)
 *   2. Si échec → parcours de la liste complète filtré par matricule (fallback fiable)
 */
const getEmployeeByIdVanRH = async (
  id: string | number,
  matriculeFallback?: string
): Promise<EmployeeRH | null> => {
  console.log(`🌐 [EMPLOYEE RH SERVICE] getEmployeeByIdVanRH — id=${id}, matricule=${matriculeFallback}`);

  // ── Tentative 1 : endpoint direct ──────────────────────────────────────────
  try {
    const response = await fetch(`${VAN_RH_URL}/api/employer-app/btp/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const phone = extractPhone(data);
      console.log(`✅ [EMPLOYEE RH SERVICE] Employé trouvé par ID. phone brut=`, extractPhone(data), '| données:', data);
      // Normaliser le téléphone dans l'objet retourné
      return { ...data, phone };
    }
    console.warn(`⚠️ [EMPLOYEE RH SERVICE] Endpoint /btp/${id} → HTTP ${response.status} — passage au fallback matricule`);
  } catch (err: any) {
    console.warn(`⚠️ [EMPLOYEE RH SERVICE] Endpoint /btp/${id} en erreur : ${err.message} — passage au fallback matricule`);
  }

  // ── Tentative 2 : recherche par matricule dans la liste complète ────────────
  if (matriculeFallback) {
    console.log(`🔄 [EMPLOYEE RH SERVICE] Recherche par matricule=${matriculeFallback} dans la liste complète`);
    try {
      const all = await getAllEmployeesVanRH();
      const found = all.find(
        (e: any) =>
          (e.matricule && e.matricule === matriculeFallback) ||
          (e.Matricule && e.Matricule === matriculeFallback)
      );
      if (found) {
        const phone = extractPhone(found);
        console.log(`✅ [EMPLOYEE RH SERVICE] Employé trouvé par matricule. phone=`, phone, '| données:', found);
        return { ...found, phone };
      }
      console.warn(`⚠️ [EMPLOYEE RH SERVICE] Aucun employé avec matricule=${matriculeFallback} dans la liste VAN RH`);
    } catch (err: any) {
      console.error(`💥 [EMPLOYEE RH SERVICE] Fallback matricule échoué : ${err.message}`);
    }
  }

  return null;
};

// ─── Implémentation LOCAL ─────────────────────────────────────────────────────

const getAllEmployeesLocal = async (): Promise<EmployeeRH[]> => {
  console.log('🏠 [EMPLOYEE RH SERVICE] Mode LOCAL — données employés non disponibles');
  // Retourne un tableau vide (à connecter plus tard sur votre propre backend si besoin)
  return [];
};

const getEmployeeByIdLocal = async (_id: string): Promise<EmployeeRH | null> => {
  console.log('🏠 [EMPLOYEE RH SERVICE] Mode LOCAL — employé individuel non disponible');
  return null;
};

// ─── Service exporté ──────────────────────────────────────────────────────────

export const employeeRHService = {

  getAllEmployees: async (): Promise<EmployeeRH[]> => {
    try {
      return isVanRH
        ? await getAllEmployeesVanRH()
        : await getAllEmployeesLocal();
    } catch (err: any) {
      console.error('💥 [EMPLOYEE RH SERVICE] Erreur getAllEmployees:', err.message);
      throw err;
    }
  },

  /**
   * @param id        – ID de l'utilisateur (local DB ou VAN RH selon le mode)
   * @param matricule – Matricule de l'employé (fallback fiable si l'ID ne correspond pas)
   */
  getEmployeeById: async (id: string | number, matricule?: string): Promise<EmployeeRH | null> => {
    try {
      return isVanRH
        ? await getEmployeeByIdVanRH(id, matricule)
        : await getEmployeeByIdLocal(String(id));
    } catch (err: any) {
      console.error('💥 [EMPLOYEE RH SERVICE] Erreur getEmployeeById:', err.message);
      return null;
    }
  },
};
