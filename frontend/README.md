# VAN BTP ERP

Système de gestion intégrée (ERP) complet pour les entreprises du BTP, centré sur le pilotage de chantiers au Cameroun.

---

## 🗂️ Arborescence du projet

```
src/
├── App.tsx                        # Entrée principale, routage global
├── main.tsx
├── index.css
│
├── pages/                         # Une page = un dossier
│   ├── index.ts                   # Barrel export de toutes les pages
│   ├── Auth/
│   │   └── index.tsx              # LoginPage, RegisterPage, ForgotPasswordPage
│   ├── Dashboard/
│   │   └── index.tsx              # Tableau de bord (adaptatif par rôle)
│   ├── Projects/
│   │   └── index.tsx              # Gestion des chantiers + Gantt
│   ├── Finances/
│   │   └── index.tsx              # Dépenses, factures, trésorerie
│   ├── Resources/
│   │   ├── index.tsx              # Page principale avec navigation par onglets
│   │   ├── PurchasesTab.tsx       # Onglet Achats
│   │   ├── StockTab.tsx           # Onglet Stock
│   │   ├── EquipmentTab.tsx       # Onglet Engins
│   │   ├── PersonnelTab.tsx       # Onglet Personnel
│   │   └── SubcontractingTab.tsx  # Onglet Sous-traitance
│   ├── Control/
│   │   └── index.tsx              # HSE : incidents, audits, checklists
│   ├── Support/
│   │   └── index.tsx              # GED, tickets, référentiels
│   └── Settings/
│       └── index.tsx              # Profil, thème, notifications, sécurité
│
├── components/                    # Composants réutilisables uniquement
│   ├── ui/
│   │   └── index.tsx              # Button, Card, Input, Modal, Drawer…
│   └── layout/
│       └── index.tsx              # MainLayout, Sidebar, Header
│
├── context/                       # État global React Context
│   ├── DataContext.tsx            # Données métier (projets, transactions…)
│   ├── UserContext.tsx            # Utilisateur connecté + profil
│   ├── ThemeContext.tsx           # Thème, mode sombre, densité
│   ├── NotificationContext.tsx    # Toasts + notifications persistantes
│   └── HistoryContext.tsx         # Journal des actions utilisateur
│
├── hooks/                         # Hooks React réutilisables
│   ├── index.ts                   # Barrel export
│   ├── usePermissions.ts          # Vérification des droits par rôle
│   ├── useFilters.ts              # Filtres région/chantier/période
│   ├── useExport.ts               # Export Excel, CSV, Word
│   └── useForm.ts                 # Gestion formulaires + validation
│
├── types/                         # Types et interfaces TypeScript
│   ├── index.ts                   # Barrel export
│   ├── models.ts                  # Project, Employee, Incident, Equipment…
│   └── permissions.ts             # Role, Permission, ROLE_PERMISSIONS
│
├── services/                      # Couche d'abstraction API (prête pour backend)
│   ├── index.ts                   # Barrel export
│   ├── api.ts                     # Wrapper fetch (GET, POST, PUT, DELETE)
│   ├── auth.service.ts            # Login, logout, changePassword
│   └── project.service.ts         # CRUD projets + utilitaires métier
│
├── lib/                           # Fonctions utilitaires pures
│   ├── index.ts                   # Barrel export
│   ├── exportUtils.ts             # Export CSV (existant)
│   ├── formatters.ts              # formatCFA, formatDate, getStatusBadgeClass…
│   ├── validators.ts              # required, minLength, isValidMatricule…
│   └── constants.ts               # REGIONS, EXPENSE_CATEGORIES, PROJECT_STATUSES…
│
└── i18n/                          # Internationalisation
    ├── index.ts                   # Configuration i18next
    └── locales/
        ├── fr.json                # Traductions françaises
        └── en.json                # Traductions anglaises
```

---

## 👥 Rôles et accès

| Rôle        | Matricule  | Mot de passe | Accès |
|-------------|-----------|-------------|-------|
| DG          | VMAT0001  | admin123    | Vue globale, KPIs, alertes, lecture seule |
| Chef chantier | VMAT0002 | chef123    | Gestion complète de ses projets |
| Technicien  | VMAT0003  | tech123     | Vue terrain, rapports, checklists |
| RH          | VMAT0004  | rh123       | Gestion du personnel |

---

## 🚀 Lancer le projet

**Prérequis :** Node.js 18+

```bash
npm install
npm run dev
```

---

## 🔧 Stack technique

- **React 18** + **TypeScript** + **Vite**
- **React Router v6** — routage avec routes protégées par rôle
- **Recharts** — graphiques (barres, camembert, aires)
- **Framer Motion** — animations UI
- **XLSX + docx + file-saver** — exports Office
- **i18next** — multilingue (FR / EN)
- **Tailwind CSS** — styles utilitaires

---

## 📌 Conventions

- Chaque **page** a son propre dossier dans `pages/` avec un `index.tsx`
- Les **composants réutilisables** vivent dans `components/ui/` ou `components/layout/`
- Les **types** sont centralisés dans `types/models.ts` et `types/permissions.ts`
- Les **services** préparent le branchement backend (remplacer les mocks par des `api.get/post`)
- Les **hooks** extraits (`useFilters`, `useExport`, `useForm`) évitent la duplication de logique
