# Architecture Backend, IA et WhatsApp

## Objectif

Document de reference pour la V1 de Xelal AI:

- backend metier
- base de donnees
- integration IA
- integration WhatsApp
- notifications
- plan de mise en oeuvre

L'objectif est de transformer le prototype frontend actuel en une vraie plateforme scolaire exploitable, scalable et multi-ecoles.

## Vue d'ensemble

Architecture cible:

```text
[React Web / Mobile Web]
   |
   v
[API Backend Node.js + TypeScript]
   |
   +--> [PostgreSQL]
   +--> [Redis + Jobs]
   +--> [Storage S3]
   +--> [OpenAI API]
   +--> [WhatsApp Cloud API - Meta]
```

## Principes d'architecture

- Le frontend ne doit jamais appeler l'IA directement avec une cle API exposee.
- Toute la logique metier doit vivre dans le backend.
- Les donnees scolaires doivent etre persistantes et historisees.
- L'IA doit s'appuyer sur des faits calcules par le systeme, pas sur des suppositions.
- WhatsApp doit etre integre via l'API officielle Meta Cloud API.
- Le systeme doit etre pense des le depart pour le multi-ecoles.

## Decoupage backend

Modules recommandes:

- `auth`: connexion, session, roles, permissions
- `schools`: ecoles, annees scolaires, classes, niveaux
- `users`: admin, enseignants, eleves, parents
- `subjects`: matieres, coefficients
- `academics`: evaluations, notes, moyennes, bulletins
- `attendance`: absences, retards, motifs
- `messaging`: conversations parent/prof/admin
- `notifications`: WhatsApp, web, et plus tard email/SMS
- `ai`: scoring risque, resumes, recommandations
- `reports`: PDF, CSV, exports
- `whatsapp`: webhook, envoi messages, templates, routage
- `audit`: journalisation, tracabilite

## Schema fonctionnel

Acteurs:

- `Admin`
- `Teacher`
- `Student`
- `Parent`

Relations principales:

```text
School
 ├─ Users
 ├─ AcademicYears
 ├─ Classes
 ├─ Subjects
 └─ Terms

Class
 ├─ TeacherAssignments
 ├─ StudentEnrollments
 ├─ Assessments
 └─ AttendanceSessions

Student
 ├─ Parents
 ├─ Grades
 ├─ Attendances
 ├─ AIAnalyses
 └─ Notifications
```

## Schema de donnees

Base recommandee: PostgreSQL

ORM recommande: Prisma

### Tables principales

#### `schools`

- `id`
- `name`
- `country`
- `timezone`
- `created_at`

#### `users`

- `id`
- `school_id`
- `role` (`ADMIN`, `TEACHER`, `STUDENT`, `PARENT`)
- `first_name`
- `last_name`
- `phone`
- `email`
- `password_hash`
- `status`
- `created_at`

#### `students`

- `id`
- `user_id`
- `matricule`
- `birth_date`
- `gender`

#### `parents_students`

- `id`
- `parent_user_id`
- `student_id`
- `relationship` (`MOTHER`, `FATHER`, `TUTOR`)
- `is_primary`

#### `teachers`

- `id`
- `user_id`
- `employee_code`

#### `academic_years`

- `id`
- `school_id`
- `name`
- `start_date`
- `end_date`
- `is_active`

#### `terms`

- `id`
- `academic_year_id`
- `name`
- `start_date`
- `end_date`
- `order_index`

#### `classes`

- `id`
- `school_id`
- `academic_year_id`
- `name`
- `level`
- `stream`

#### `student_enrollments`

- `id`
- `student_id`
- `class_id`
- `academic_year_id`
- `status`

#### `subjects`

- `id`
- `school_id`
- `name`
- `code`
- `coefficient_default`

#### `teacher_assignments`

- `id`
- `teacher_id`
- `class_id`
- `subject_id`

#### `assessments`

- `id`
- `class_id`
- `subject_id`
- `teacher_id`
- `term_id`
- `title`
- `type` (`QUIZ`, `HOMEWORK`, `EXAM`, `PROJECT`)
- `coefficient`
- `date`

#### `grades`

- `id`
- `assessment_id`
- `student_id`
- `value`
- `comment`
- `created_by`
- `created_at`

#### `attendance_sessions`

- `id`
- `class_id`
- `subject_id`
- `teacher_id`
- `date`
- `start_time`
- `end_time`

#### `attendance_records`

- `id`
- `session_id`
- `student_id`
- `status` (`PRESENT`, `ABSENT`, `LATE`)
- `reason`
- `minutes_late`

#### `conversations`

- `id`
- `school_id`
- `channel` (`WHATSAPP`, `WEB`)
- `parent_user_id`
- `student_id`
- `assigned_teacher_id`
- `status` (`OPEN`, `CLOSED`, `PENDING`)

#### `messages`

- `id`
- `conversation_id`
- `sender_type` (`PARENT`, `TEACHER`, `ADMIN`, `AI`, `SYSTEM`)
- `sender_user_id`
- `content`
- `message_type` (`TEXT`, `ALERT`, `SUMMARY`)
- `external_message_id`
- `created_at`

#### `notifications`

- `id`
- `school_id`
- `student_id`
- `parent_user_id`
- `type` (`ABSENCE`, `GRADE`, `AI_ALERT`, `MESSAGE`)
- `channel` (`WHATSAPP`, `WEB`)
- `status` (`QUEUED`, `SENT`, `FAILED`)
- `payload_json`
- `sent_at`

#### `ai_analyses`

- `id`
- `student_id`
- `analysis_type` (`RISK`, `PERFORMANCE`, `RECOMMENDATION`, `PARENT_SUMMARY`)
- `risk_level` (`LOW`, `MEDIUM`, `HIGH`)
- `input_snapshot_json`
- `output_json`
- `created_at`

#### `ai_risk_signals`

- `id`
- `student_id`
- `signal_key`
- `signal_value`
- `detected_at`

#### `report_exports`

- `id`
- `school_id`
- `type` (`PDF_BULLETIN`, `CSV_GRADES`, `CSV_ATTENDANCE`)
- `storage_url`
- `created_by`
- `created_at`

#### `audit_logs`

- `id`
- `school_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata_json`
- `created_at`

## Exemple de schema Prisma simplifie

```prisma
model School {
  id        String   @id @default(cuid())
  name      String
  country   String?
  timezone  String   @default("Africa/Dakar")
  users     User[]
  classes   Class[]
  subjects  Subject[]
  createdAt DateTime @default(now())
}

model User {
  id           String     @id @default(cuid())
  schoolId     String
  role         Role
  firstName    String
  lastName     String
  phone        String?    @unique
  email        String?    @unique
  passwordHash String?
  status       UserStatus @default(ACTIVE)
  school       School     @relation(fields: [schoolId], references: [id])
  student      Student?
  teacher      Teacher?
  createdAt    DateTime   @default(now())
}

model Student {
  id          String             @id @default(cuid())
  userId      String             @unique
  matricule   String?            @unique
  user        User               @relation(fields: [userId], references: [id])
  grades      Grade[]
  attendances AttendanceRecord[]
  analyses    AIAnalysis[]
}

model Teacher {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}

model Grade {
  id           String   @id @default(cuid())
  assessmentId String
  studentId    String
  value        Float
  comment      String?
  student      Student  @relation(fields: [studentId], references: [id])
  createdAt    DateTime @default(now())
}

model AttendanceRecord {
  id        String   @id @default(cuid())
  studentId String
  status    AttendanceStatus
  reason    String?
  student   Student  @relation(fields: [studentId], references: [id])
}

model AIAnalysis {
  id            String     @id @default(cuid())
  studentId     String
  analysisType  AnalysisType
  riskLevel     RiskLevel?
  inputSnapshot Json
  output        Json
  createdAt     DateTime   @default(now())
  student       Student    @relation(fields: [studentId], references: [id])
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}

enum AnalysisType {
  RISK
  PERFORMANCE
  RECOMMENDATION
  PARENT_SUMMARY
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
}
```

## Endpoints API recommandes

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`

### Ecoles et structure

- `GET /schools/:id`
- `GET /academic-years/active`
- `GET /classes`
- `GET /classes/:id`
- `GET /classes/:id/students`
- `GET /subjects`

### Notes

- `GET /students/:id/grades`
- `POST /assessments`
- `POST /grades/bulk`
- `PATCH /grades/:id`

### Absences

- `POST /attendance/sessions`
- `POST /attendance/records/bulk`
- `GET /students/:id/attendance`

### Dashboards

- `GET /dashboard/teacher`
- `GET /dashboard/admin`
- `GET /dashboard/student`

### Messagerie

- `GET /conversations`
- `GET /conversations/:id/messages`
- `POST /conversations`
- `POST /messages`

### IA

- `POST /ai/students/:id/analyze`
- `GET /ai/students/:id/latest-analysis`
- `POST /ai/parents/query`

### Notifications

- `POST /notifications/dispatch`
- `GET /notifications`

### WhatsApp

- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`
- `POST /whatsapp/send-template`
- `POST /whatsapp/send-text`

### Reports

- `POST /reports/bulletin/:studentId`
- `POST /reports/export/grades`
- `POST /reports/export/attendance`

## Architecture IA

Je recommande une IA en deux couches.

### 1. Couche analytique

Elle calcule des faits fiables a partir des donnees scolaires:

- moyenne generale
- moyenne par matiere
- variation sur 7 jours
- variation sur 30 jours
- frequence d'absence
- frequence de retard
- baisse de performance
- score de risque

Cette couche doit etre 100% backend et deterministic si possible.

### 2. Couche generative

Elle transforme les faits calcules en langage naturel:

- resume enseignant
- message parent
- conseils eleve
- explication d'une baisse
- recommandations d'actions

### Flux IA

```text
Notes/Absences -> Calculs metier -> Signaux IA -> Base
                                      |
                                      v
                           LLM avec outils/facts
                                      |
                                      v
                        Resume / Alerte / Conseil / Chat
```

## Score de risque eleve

Version V1 simple et utile:

```text
risk_score =
  0.40 * baisse_notes
+ 0.30 * absences_recentes
+ 0.15 * retards_recents
+ 0.15 * variabilite_notes
```

Exemples de regles:

- baisse > 2 points sur 3 semaines => signal fort
- 3 absences sur 14 jours => signal fort
- moyenne matiere cle < 9/20 => signal moyen
- amelioration continue sur 30 jours => signal positif

Exemple de sortie stockee:

```json
{
  "riskLevel": "high",
  "score": 0.78,
  "signals": [
    "Baisse de 2.4 points en mathematiques sur 21 jours",
    "3 absences sur les 14 derniers jours",
    "Moyenne generale passee de 12.8 a 10.6"
  ],
  "recommendations": [
    "Programmer un entretien parent-professeur",
    "Prevoir un exercice cible en mathematiques",
    "Suivi hebdomadaire sur 3 semaines"
  ]
}
```

## IA conversationnelle parent WhatsApp

Le modele ne doit jamais acceder librement a toute la base. Il doit utiliser des outils backend controles.

Outils metier a exposer au modele:

- `get_student_summary(parent_phone)`
- `get_student_grades(student_id, term)`
- `get_student_attendance(student_id, range)`
- `get_student_schedule(student_id, day)`
- `get_latest_ai_analysis(student_id)`
- `create_teacher_contact_request(student_id, message)`

Approche recommande avec OpenAI:

- Responses API
- function calling
- Structured Outputs

## Schema du chatbot WhatsApp

```text
Parent message
   |
   v
WhatsApp webhook
   |
   v
Identity resolver by phone
   |
   +--> inconnu => onboarding / liaison compte
   |
   v
Intent router
   |
   +--> notes
   +--> absences
   +--> emploi du temps
   +--> analyse IA
   +--> contacter professeur
   +--> question libre
   |
   v
Tool calls backend
   |
   v
Reponse courte WhatsApp
   |
   v
Log conversation + analytics
```

## Integration WhatsApp

Canal recommande: Meta WhatsApp Cloud API

Composants:

- webhook de verification `GET /webhooks/whatsapp`
- webhook messages entrants `POST /webhooks/whatsapp`
- service d'envoi de messages
- service de templates
- mapping `numero -> parent -> eleve`

### Flux entrant

1. Le parent ecrit sur WhatsApp
2. Meta appelle `POST /webhooks/whatsapp`
3. Le backend identifie le parent via son numero
4. Le backend determine l'eleve concerne
5. Le routeur detecte l'intention
6. Le backend appelle les outils metier necessaires
7. Si besoin, le backend appelle l'IA
8. Le backend repond via WhatsApp
9. Toute la conversation est journalisee en base

### Cas supportes en V1

- voir les notes
- voir les absences
- voir l'emploi du temps
- recevoir une analyse IA
- contacter le professeur
- poser une question libre guidee

## Notifications

Pipeline recommande:

```text
Evenement metier
 -> notification job
 -> choix canal
 -> rendu message
 -> envoi
 -> statut SENT/FAILED
```

Evenements a supporter:

- `GRADE_PUBLISHED`
- `ATTENDANCE_ABSENT`
- `ATTENDANCE_LATE`
- `AI_RISK_HIGH`
- `NEW_MESSAGE_FROM_TEACHER`

Canaux:

- WhatsApp
- web
- plus tard email / SMS

## Securite

Points obligatoires:

- JWT + refresh token
- RBAC par role
- isolation stricte par `school_id`
- audit logs
- chiffrement des secrets
- zero cle IA cote frontend
- validation de webhook Meta
- rate limiting sur les routes sensibles
- limitation stricte des donnees visibles par parent
- consentement et tracabilite des interactions

## Arborescence backend recommandee

```text
backend/
  src/
    app.ts
    server.ts
    config/
    modules/
      auth/
      schools/
      users/
      classes/
      subjects/
      academics/
      attendance/
      messaging/
      notifications/
      ai/
      reports/
      whatsapp/
      audit/
    jobs/
    lib/
    middleware/
    prisma/
      schema.prisma
```

## Stack technique recommandee

- Backend: `Node.js + TypeScript + Fastify`
- ORM: `Prisma`
- DB: `PostgreSQL`
- Queue: `BullMQ + Redis`
- Auth: `JWT + Refresh`
- IA: `OpenAI Responses API`
- WhatsApp: `Meta Cloud API`
- PDF: `react-pdf` ou `Playwright`
- Storage: `S3`

## Ordre de mise en oeuvre

Je recommande cet ordre:

1. base PostgreSQL + Prisma + auth + roles
2. classes / eleves / matieres / affectations
3. saisie notes + absences
4. dashboards alimentes par vraie donnee
5. notifications automatiques
6. webhook WhatsApp + menu parent
7. moteur IA analytique
8. chatbot IA outille
9. PDF bulletins + exports
10. multi-ecoles complet

## V1 realiste

Perimetre V1 conseille:

- web enseignant
- web admin basique
- espace eleve simple
- parent sur WhatsApp
- notes
- absences
- alertes IA basiques
- contact parent/prof
- notifications automatiques

## Suite recommandee

Les prochaines etapes utiles sont:

1. creer le backend dans `backend/`
2. ecrire le `schema.prisma` complet
3. definir les DTO et contrats API
4. implementer le webhook WhatsApp
5. brancher l'IA uniquement via le backend

