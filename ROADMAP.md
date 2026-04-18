# Roadmap Xelal AI — État complet au 18 avril 2026

---

## BLOC 1 — Authentification & Gestion des comptes ✅

| Feature | Statut |
|---|---|
| Login multi-rôle (admin, enseignant, élève, parent) | ✅ |
| JWT + middleware `requireRole()` | ✅ |
| Invitations par code (enseignants) | ✅ |
| Changement de mot de passe obligatoire au 1er login | ✅ |
| Portail auth unifié (`AuthPortal.tsx`) | ✅ |

---

## BLOC 2 — Administration école ✅

| Feature | Statut |
|---|---|
| Dashboard admin avec navigation par onglets | ✅ |
| Gestion des utilisateurs (liste, statut, suspension) | ✅ |
| Gestion des classes (CRUD complet) | ✅ |
| Gestion des matières (CRUD complet) | ✅ |
| Affectations enseignant ↔ classe ↔ matière (CRUD) | ✅ |
| Vue groupée par enseignant dans l'interface | ✅ |
| Suppression en cascade (class/subject → assignments) | ✅ |

---

## BLOC 3 — Dashboard enseignant ✅

| Feature | Statut |
|---|---|
| Vue classes et élèves | ✅ |
| Saisie des notes par évaluation | ✅ |
| Gestion des présences / absences | ✅ |
| Création d'évaluations (type, coeff, date) | ✅ |
| Vue stats de classe | ✅ |

---

## BLOC 4 — Messagerie enseignant ↔ parent ✅ / ⬜ partiel

| Feature | Statut |
|---|---|
| Liste des contacts parents (avec dernier message) | ✅ |
| Fil de conversation par élève | ✅ |
| Envoi de message (Enter key, auto-scroll) | ✅ |
| Mise à jour optimiste de l'UI | ✅ |
| Backend in-memory + stubs Prisma | ✅ |
| Messagerie parent côté dashboard parent | ⬜ |
| Compteur de non-lus réel (mark as read API) | ⬜ |
| Notifications en temps réel (polling ou WebSocket) | ⬜ |

---

## BLOC 5 — Dashboard élève ✅

| Feature | Statut |
|---|---|
| Vue accueil avec moyenne réelle + matières | ✅ |
| Carnet de notes avec barres de progression | ✅ |
| Suivi des absences / retards | ✅ |
| Section IA Tutor avec recommandations sauvegardées | ✅ |
| Accès sécurisé aux données propres uniquement | ✅ |

---

## BLOC 6 — IA Analyse enseignant ✅ (phase 1)

| Feature | Statut |
|---|---|
| Analyse individuelle élève via Gemini | ✅ |
| Analyse globale de classe via Gemini | ✅ |
| Sauvegarde des recommandations en base | ✅ |
| Affichage historique côté enseignant | ✅ |
| Envoi WhatsApp avec message généré par IA | ✅ |

---

## BLOC 7 — IA avancée ⬜ (phase 2)

### 7.1 — Signaux de risque déterministes (backend)

Avant chaque appel Gemini, calculer des métriques objectives et les injecter dans le prompt :

```ts
riskSignals = {
  absenceRate: absences / totalSessions,         // > 20% = CRITIQUE
  averageGrade: moyennePondérée,                  // < 8 = CRITIQUE
  gradeEvolution: notesRécentes - notesAnciennes, // négatif = MOYEN
  lateCount: nombreRetards,
  subjectsAtRisk: matières en dessous de la moyenne de classe
}
```

**À implémenter dans** : `backend/src/modules/teacher/service.ts`
**Statut** : ⬜

---

### 7.2 — Prompts structurés avec données réelles

Remplacer le prompt libre actuel par un template avec données injectées :

```
Élève: ${firstName} ${lastName}, ${level}
Absences: ${absenceRate}% (${count} sur ${total} séances)
Moyenne: ${avg}/20 (classe: ${classAvg}/20)
Évolution: ${evolution} points sur les 30 derniers jours
Matières à risque: ${subjectsAtRisk.join(', ')}

En tant que conseiller pédagogique, analyse la situation et fournis:
1. Niveau de risque (FAIBLE / MOYEN / ÉLEVÉ / CRITIQUE)
2. Résumé en 2 phrases pour l'enseignant
3. 3 recommandations actionnables et concrètes
4. Message WhatsApp pour le parent (max 160 mots, ton bienveillant)

Réponds en JSON strict: { riskLevel, summary, recommendations[], whatsappMessage }
```

**À implémenter dans** : `src/services/geminiService.ts`
**Statut** : ⬜

---

### 7.3 — Endpoint IA global admin

`POST /api/admin/ai/class-report/:classId`

Génère un rapport IA agrégé de toute la classe pour l'admin :
- Élèves à risque identifiés et classés
- Tendances globales (absentéisme, évolution des notes)
- Recommandations au niveau de la classe

**Statut** : ⬜

---

### 7.4 — IA Tutor interactif (élève)

Dans `DashboardEleve.tsx > IATutorView`, ajouter une interface de questions :

- Zone de texte libre : "Pose ta question..."
- Appel `POST /api/student/ai/ask` avec contexte injecté (notes + absences de l'élève)
- Réponse Gemini affichée dynamiquement
- Suggestions rapides : "Explique-moi mes erreurs en maths", "Comment améliorer ma moyenne ?"

**Statut** : ⬜

---

### 7.5 — WhatsApp enrichi (message auto-généré)

- Le JSON retourné par Gemini inclut un champ `whatsappMessage`
- Bouton "Envoyer le message suggéré" pré-remplit l'UI enseignant avec ce message
- Champ `whatsappSent: boolean` ajouté sur la recommendation pour suivi

**Statut** : ⬜

---

### 7.6 — Tableau de bord suivi des recommandations (admin)

Vue agrégée de toutes les recommandations émises dans l'école :
- Répartition par niveau de risque (CRITIQUE / ÉLEVÉ / MOYEN / FAIBLE)
- Taux de suivi (recommandation → WhatsApp envoyé)
- Évolution dans le temps

**Endpoint** : `GET /api/admin/recommendations/stats`
**Statut** : ⬜

---

## BLOC 8 — Dashboard parent ⬜

| Feature | Statut |
|---|---|
| Connexion parent (email + code invitation) | ⬜ |
| Vue notes et absences de l'enfant | ⬜ |
| Messagerie avec l'enseignant (côté parent) | ⬜ |
| Notification des recommandations reçues | ⬜ |

---

## BLOC 9 — Production & Infrastructure ⬜ (partiel)

| Feature | Statut |
|---|---|
| Schema Prisma (User, Class, Subject, Assignment, Grade, Attendance) | ✅ partiel |
| DevStore in-memory complet pour démo | ✅ |
| `isPrismaEnabled()` guard dans tous les repos | ✅ |
| Modèle Prisma `Message` (schema + migration) | ⬜ |
| Migration Neon complète (toutes les tables) | ⬜ |
| Variables d'env prod (Render + Neon) | ⬜ |
| CI/CD (GitHub Actions) | ⬜ |

---

## BLOC 10 — Qualité & Robustesse ⬜

| Feature | Statut |
|---|---|
| Tests unitaires backend (Jest) | ⬜ |
| Tests e2e critiques (login, saisie notes, messagerie) | ⬜ |
| Gestion d'erreurs frontend (toasts globaux, fallback UI) | ⬜ partiel |
| Rate limiting API | ⬜ |
| Logs structurés (pino) | ⬜ |

---

## Ordre de priorité recommandé

```
Sprint 1 — IA robuste
  → 7.1 Signaux de risque déterministes
  → 7.2 Prompts structurés avec données réelles
  → 7.5 WhatsApp enrichi (message auto-généré)

Sprint 2 — Dashboard parent
  → 8.1 Connexion parent
  → 8.2 Vue notes + absences enfant
  → 8.3 Messagerie côté parent (BLOC 4 complété)

Sprint 3 — IA admin + reporting
  → 7.3 Endpoint IA global admin
  → 7.4 IA Tutor interactif élève
  → 7.6 Tableau de bord recommandations

Sprint 4 — Production
  → 9 Prisma Message + migration Neon complète
  → 10 Tests + qualité + CI/CD
```
