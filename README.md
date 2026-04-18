# Xelal AI — Plateforme de gestion scolaire intelligente

Application de gestion scolaire multi-rôle (admin, enseignant, élève, parent) avec analyse IA des performances académiques, messagerie enseignant-parent, et alertes WhatsApp.

---

## Table des matières

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancer le projet](#lancer-le-projet)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Interfaces disponibles](#interfaces-disponibles)
- [API — Endpoints disponibles](#api--endpoints-disponibles)
- [Mode démo vs mode production](#mode-démo-vs-mode-production)
- [Structure du projet](#structure-du-projet)

---

## Architecture

```
xelal-ai/
├── src/                    # Frontend React + TypeScript (Vite)
│   ├── components/         # Dashboards par rôle
│   └── services/           # Clients API (auth, admin, messages, élève...)
├── backend/                # Backend Express + TypeScript
│   ├── src/modules/        # Modules métier (auth, admin, teacher, student...)
│   ├── prisma/             # Schema Prisma (PostgreSQL)
│   └── src/lib/            # Prisma client + config
└── package.json            # Scripts unifiés (frontend + backend)
```

Le backend tourne sur le **port 4000**, le frontend sur le **port 3000**.

---

## Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |

Aucune base de données n'est requise pour la démo — tout tourne en mémoire.

---

## Installation

```bash
# Cloner le repo
git clone git@github.com:Akerman64/Xelal-AI.git
cd Xelal-AI

# Installer toutes les dépendances (frontend + backend)
npm install
```

---

## Configuration

Copier le fichier d'exemple et remplir les variables nécessaires :

```bash
cp .env.example .env
```

Ouvrir `.env` et renseigner :

```env
# Obligatoire pour les fonctionnalités IA (analyse élève/classe)
GEMINI_API_KEY="votre_clé_gemini"

# Laisser vide pour rester en mode démo in-memory
DATABASE_URL=""

# Secret JWT (peut rester tel quel en dev)
AUTH_SECRET="change-me-in-production"
```

> **Note :** Sans `GEMINI_API_KEY`, toutes les fonctionnalités sauf l'IA marchent normalement.
> Sans `DATABASE_URL`, le projet utilise le store in-memory (aucune installation PostgreSQL requise).

---

## Lancer le projet

Il faut lancer **deux processus en parallèle** dans deux terminaux séparés.

### Terminal 1 — Backend (API)

```bash
npm run backend:dev
```

Le backend démarre sur `http://localhost:4000`.
Vous devriez voir :

```
🚀 Xelal AI API — port 4000
📦 Mode: dev store (in-memory)
```

### Terminal 2 — Frontend (UI)

```bash
npm run dev
```

Le frontend démarre sur `http://localhost:3000`.
Ouvrir `http://localhost:3000` dans le navigateur.

---

## Comptes de démonstration

Tous ces comptes sont disponibles immédiatement en mode démo (aucune configuration requise) :

| Rôle | Email | Mot de passe | Description |
|---|---|---|---|
| **Admin** | `admin@xelal.ai` | `admin123` | Accès complet à la gestion de l'école |
| **Enseignant** | `teacher@xelal.ai` | `teacher123` | Mamadou Sow, Terminale S1 |
| **Élève** | `student@xelal.ai` | `student123` | Moussa Diop, Terminale S1 |
| **Élève 2** | `student2@xelal.ai` | `student123` | Awa Ndiaye, Terminale S1 |
| **Parent** | `parent@xelal.ai` | `parent123` | Fatou Diop, mère de Moussa |

---

## Interfaces disponibles

### Dashboard Admin (`admin@xelal.ai`)

| Onglet | Ce qu'on peut faire |
|---|---|
| **Vue d'ensemble** | Statistiques globales de l'école |
| **Utilisateurs** | Lister tous les utilisateurs, voir leur statut (ACTIVE / PENDING / SUSPENDED) |
| **Établissement → Vue globale** | Vue de l'école et de l'année scolaire |
| **Établissement → Classes** | Créer / supprimer des classes (nom + niveau) |
| **Établissement → Matières** | Créer / supprimer des matières (nom + coefficient) |
| **Affectations** | Affecter un enseignant à une classe + matière, supprimer une affectation, vue groupée par enseignant |
| **Messagerie** | *(à venir — Sprint 2)* |

### Dashboard Enseignant (`teacher@xelal.ai`)

| Onglet | Ce qu'on peut faire |
|---|---|
| **Accueil** | Vue résumée de la classe, alertes absentéisme |
| **Élèves** | Liste des élèves de la classe, accès au profil individuel |
| **Notes** | Saisir des notes par évaluation, par matière, avec coefficient |
| **Présences** | Marquer présent / absent / en retard pour chaque séance |
| **Analyse IA** | Lancer une analyse Gemini sur un élève ou la classe entière, sauvegarder les recommandations |
| **Messages** | Fil de conversation avec les parents, envoi de messages, aperçu du dernier message par contact |

### Dashboard Élève (`student@xelal.ai`)

| Onglet | Ce qu'on peut faire |
|---|---|
| **Accueil** | Moyenne générale pondérée, résumé par matière, dernière recommandation IA |
| **Notes** | Détail des notes par matière, barres de progression |
| **Agenda** | Historique absences / retards / présences avec détails |
| **IA Tutor** | Lire les recommandations IA générées par l'enseignant, classées par niveau de risque |

> **Données disponibles en démo :**
> - 3 évaluations avec notes (Maths ×2, Français ×1)
> - 2 séances de présence (1 absence, 1 retard pour Moussa Diop)
> - 1 fil de messages pré-rempli (parent ↔ enseignant)

---

## API — Endpoints disponibles

Base URL : `http://localhost:4000/api`

### Authentification

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Connexion, retourne un JWT |
| `POST` | `/auth/change-password` | Changement de mot de passe |

### Admin

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Statistiques globales |
| `GET` | `/admin/users` | Liste tous les utilisateurs |
| `GET` | `/admin/classes` | Liste les classes |
| `POST` | `/admin/classes` | Crée une classe `{ name, level }` |
| `DELETE` | `/admin/classes/:id` | Supprime une classe (cascade assignments) |
| `GET` | `/admin/subjects` | Liste les matières |
| `POST` | `/admin/subjects` | Crée une matière `{ name, coefficientDefault }` |
| `DELETE` | `/admin/subjects/:id` | Supprime une matière (cascade assignments) |
| `GET` | `/admin/assignments` | Liste les affectations enseignant↔classe↔matière |
| `POST` | `/admin/assignments` | Crée une affectation `{ teacherId, classId, subjectId }` |
| `DELETE` | `/admin/assignments/:id` | Supprime une affectation |

### Enseignant

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/teacher/dashboard` | Dashboard enseignant avec classes et élèves |
| `POST` | `/teacher/students/:id/recommendations` | Sauvegarde une analyse IA |
| `GET` | `/teacher/students/:id/recommendations` | Historique des recommandations |
| `POST` | `/teacher/students/:id/whatsapp-message` | Envoie un message WhatsApp au parent |
| `POST` | `/teacher/classes/:id/recommendations` | Analyse IA de toute la classe |
| `GET` | `/teacher/messages` | Liste des contacts parents avec dernier message |
| `GET` | `/teacher/messages/:studentId` | Fil de conversation pour un élève |
| `POST` | `/teacher/messages/:studentId` | Envoie un message au parent |

### Élève / Académique

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/academics/students/:id/grades` | Notes d'un élève |
| `GET` | `/academics/students/:id/attendance` | Présences d'un élève |
| `GET` | `/academics/students/:id/recommendations` | Recommandations IA (accès propre uniquement) |

### Santé

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Vérification que le serveur tourne |

---

## Mode démo vs mode production

| | Mode démo (défaut) | Mode production |
|---|---|---|
| **Déclencheur** | `DATABASE_URL` absent ou vide | `DATABASE_URL` renseigné |
| **Stockage** | In-memory (redémarrage = reset) | PostgreSQL via Prisma |
| **Setup requis** | Aucun | PostgreSQL / Neon + migration |
| **Données** | Pré-remplies (voir comptes démo) | À importer via seed |

Pour activer le mode production avec une base PostgreSQL (ex. Neon) :

```bash
# Renseigner DATABASE_URL dans .env, puis :
npm run prisma:db:push    # Crée les tables
npm run prisma:seed       # Insère les données initiales
npm run backend:dev       # Le backend bascule automatiquement sur Prisma
```

---

## Structure du projet

```
src/
├── App.tsx                         # Routage principal, gestion de session
├── types.ts                        # Types partagés (AuthSession, etc.)
├── components/
│   ├── AuthPortal.tsx              # Écran de connexion multi-rôle
│   ├── DashboardAdmin.tsx          # Interface administrateur
│   ├── DashboardEnseignant.tsx     # Interface enseignant + messagerie
│   └── DashboardEleve.tsx          # Interface élève + IA Tutor
└── services/
    ├── authService.ts              # Login, changement de mot de passe
    ├── adminService.ts             # CRUD classes, matières, affectations
    ├── messageService.ts           # Messagerie enseignant↔parent
    ├── studentService.ts           # Notes, présences, recommandations élève
    ├── geminiService.ts            # Appels Gemini AI
    └── backendService.ts           # Helpers HTTP génériques

backend/
├── src/
│   ├── app.ts                      # Express app setup
│   ├── server.ts                   # Point d'entrée serveur
│   ├── config/env.ts               # Variables d'environnement
│   ├── lib/prisma.ts               # Client Prisma + isPrismaEnabled()
│   ├── routes/index.ts             # Routeur principal
│   └── modules/
│       ├── auth/                   # Login, JWT, middleware requireRole
│       ├── admin/                  # CRUD école, classes, matières, affectations
│       ├── teacher/                # Dashboard, notes, analyses IA, messages
│       ├── academics/              # Endpoints élève (notes, absences, reco)
│       ├── attendance/             # Gestion des présences
│       ├── users/                  # Gestion utilisateurs
│       ├── whatsapp/               # Intégration WhatsApp Cloud API
│       ├── notifications/          # Notifications
│       └── core/
│           ├── dev-store.ts        # Données in-memory (mode démo)
│           ├── school-repository.ts # Repo classes/matières/affectations
│           └── auth-admin-repository.ts # Repo utilisateurs/invitations
└── prisma/
    ├── schema.prisma               # Modèles de base de données
    └── seed.ts                     # Données initiales
```

---

## Scripts disponibles

```bash
npm run dev              # Démarre le frontend (port 3000)
npm run backend:dev      # Démarre le backend (port 4000)
npm run build            # Build frontend pour production
npm run backend:build    # Compile le backend TypeScript
npm run lint             # Vérifie les types TypeScript
npm run prisma:db:push   # Crée/met à jour les tables en base
npm run prisma:seed      # Insère les données initiales
```
