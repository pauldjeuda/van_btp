# VAN BTP ERP — Backend

API REST Node.js / Express / Sequelize / MySQL pour le système ERP VAN BTP.

---

## 🚀 Démarrage rapide

### 1. Prérequis
- Node.js 18+
- MySQL 8.0+

### 2. Installation

```bash
cd backend
npm install
```

### 3. Configuration

```bash
cp .env.example .env
# Remplir DB_HOST, DB_NAME, DB_USER, DB_PASSWORD dans .env
```

### 4. Générer les clés RSA (JWT par rôle)

```bash
npm run generate-keys
```

Cela crée `.private/dg/`, `.private/chef/`, `.private/technicien/`, `.private/rh/`  
avec une paire `private.pem` + `public.pem` pour chaque rôle.

### 5. Créer la base de données MySQL

```sql
CREATE DATABASE van_btp_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. Démarrer le serveur (les tables se créent automatiquement)

```bash
npm run dev
```

### 7. Créer les comptes utilisateurs de démo

```bash
node scripts/createDG.js       # Compte DG (VMAT0001 / admin123)
node scripts/createUsers.js    # Comptes Chef, Technicien, RH
node seeders/001-seed-projects.js  # 3 projets de démo
node seeders/002-seed-data.js      # Personnel, engins, transactions, incidents
```

---

## 📋 Comptes de démo

| Rôle       | Matricule | Mot de passe |
|------------|-----------|-------------|
| DG         | VMAT0001  | admin123    |
| Chef       | VMAT0002  | chef123     |
| Technicien | VMAT0003  | tech123     |
| RH         | VMAT0004  | rh123       |

---

## 🌐 Endpoints API

```
POST   /api/auth/login                          ← Public
GET    /api/auth/me                             ← Token requis
PUT    /api/auth/password                       ← Token requis

GET    /api/dashboard                           ← Tous les rôles

GET    /api/projects                            ← DG, Chef, Technicien, RH
POST   /api/projects                            ← Chef
PUT    /api/projects/:id                        ← DG, Chef
DELETE /api/projects/:id                        ← DG, Chef

GET    /api/transactions                        ← DG, Chef
POST   /api/transactions                        ← Chef
PUT    /api/transactions/:id                    ← Chef
DELETE /api/transactions/:id                    ← DG, Chef

GET    /api/employees                           ← DG, Chef, RH
POST   /api/employees                           ← Chef, RH
PUT    /api/employees/:id                       ← Chef, RH
DELETE /api/employees/:id                       ← Chef, RH

GET    /api/equipment                           ← DG, Chef, Technicien
POST   /api/equipment                           ← Chef
PUT    /api/equipment/:id                       ← DG, Chef
DELETE /api/equipment/:id                       ← DG, Chef

GET    /api/stock                               ← DG, Chef, Technicien
POST   /api/stock                               ← Chef, Technicien
DELETE /api/stock/:id                           ← Chef

GET    /api/purchases                           ← DG, Chef
POST   /api/purchases                           ← Chef
PATCH  /api/purchases/:id/status               ← DG, Chef
DELETE /api/purchases/:id                       ← Chef

GET    /api/subcontracts                        ← DG, Chef
POST   /api/subcontracts                        ← Chef
PUT    /api/subcontracts/:id                    ← Chef
PATCH  /api/subcontracts/:id/tasks/:taskId/toggle ← DG, Chef
DELETE /api/subcontracts/:id                    ← Chef

GET    /api/incidents                           ← DG, Chef, Technicien
POST   /api/incidents                           ← Chef, Technicien (multipart/form-data)
PUT    /api/incidents/:id                       ← DG, Chef

GET    /api/audits                              ← DG, Chef
POST   /api/audits                              ← Chef
PUT    /api/audits/:id                          ← DG, Chef
DELETE /api/audits/:id                          ← Chef

GET    /api/checklists                          ← DG, Chef, Technicien
POST   /api/checklists                          ← Chef
PUT    /api/checklists/:id                      ← Chef
PATCH  /api/checklists/:id/tasks/:taskId/toggle ← Chef, Technicien
DELETE /api/checklists/:id                      ← Chef

GET    /api/daily-reports                       ← DG, Chef, Technicien
POST   /api/daily-reports                       ← Chef, Technicien
PUT    /api/daily-reports/:id                   ← Chef, Technicien

GET    /api/documents                           ← Tous les rôles
POST   /api/documents                           ← Chef, Technicien (multipart/form-data)
GET    /api/documents/:id/download              ← Tous les rôles
DELETE /api/documents/:id                       ← Chef

GET    /api/tickets                             ← Tous les rôles
POST   /api/tickets                             ← Tous les rôles
PUT    /api/tickets/:id                         ← DG
DELETE /api/tickets/:id                         ← DG
```

---

## 🔐 Sécurité JWT RSA-2048

Chaque rôle possède sa propre paire de clés RSA dans `.private/{role}/`.  
Le token est signé avec la clé **privée** du rôle et vérifié avec la clé **publique**.

**Header requis pour les routes protégées :**
```
Authorization: Bearer <token_jwt>
```

---

## 🗄️ Structure du projet

```
backend/
├── server.js                 ← Point d'entrée
├── config/db.js              ← Connexion Sequelize/MySQL
├── models/                   ← 15 modèles Sequelize + associations
├── controllers/              ← 15 controllers (logique métier)
├── router/                   ← 15 routers + index.js
├── middlewares/              ← verifyToken, verifyRole, upload, errorHandler
├── services/                 ← jwt.service, upload.service
├── utils/                    ← generateKeys, response, permissions
├── scripts/                  ← createDG, createUsers
├── seeders/                  ← Données de démo
├── uploads/                  ← Fichiers uploadés (gitignore)
└── .private/                 ← Clés RSA par rôle (gitignore)
```

---

## 🔗 Communication avec le Frontend

Dans `frontend/.env` :
```
VITE_API_URL=http://localhost:3001
```

Le frontend dispose déjà de `src/services/api.ts` qui consomme cette URL.  
Il suffit de mettre à jour `src/services/auth.service.ts` et `src/services/project.service.ts`  
pour remplacer les mocks par de vrais appels `api.post('/auth/login', ...)`.
