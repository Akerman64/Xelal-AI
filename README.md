# Xelal AI — Lancer le projet en local

## Prérequis

- [Node.js 20+](https://nodejs.org)
- [Git](https://git-scm.com)

---

## Installation

```bash
git clone git@github.com:Akerman64/Xelal-AI.git
cd Xelal-AI
npm install
cp .env.example .env
```

---

## Configuration

Ouvrir `.env` et renseigner au minimum :

```env
# IA — au moins une des deux clés (DeepSeek prioritaire, Gemini en fallback)
DEEPSEEK_API_KEY=""
GEMINI_API_KEY=""

# Laisser vide pour rester en mode démo (aucune base de données requise)
DATABASE_URL=""
```

> Sans clé IA, les fonctionnalités d'analyse et le bot WhatsApp tournent en mode statique.
> Sans `DATABASE_URL`, toutes les données sont en mémoire — les comptes de démo fonctionnent immédiatement.

---

## Lancer l'app

Ouvrir **deux terminaux** dans le dossier du projet.

**Terminal 1 — Backend**
```bash
npm run backend:dev
```
→ API disponible sur `http://localhost:4000`

**Terminal 2 — Frontend**
```bash
npm run dev
```
→ App disponible sur `http://localhost:3000`

---

## Comptes de démo

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@xelal.ai` | `admin123` |
| Enseignant | `teacher@xelal.ai` | `teacher123` |
| Élève | `student@xelal.ai` | `student123` |
| Parent | `parent@xelal.ai` | `parent123` |
