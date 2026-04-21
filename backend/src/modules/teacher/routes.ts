import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../auth/middleware";
import { teacherService, TeacherError } from "./service";
import { messagesService, MessagesError } from "./messages-service";
import { callAiJson, isAiAvailable } from "../../lib/ai";

export const teacherRouter = Router();

teacherRouter.use(requireAuth, requireRole("TEACHER", "ADMIN"));

teacherRouter.get("/classes", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      return res.status(200).json({ data: await teacherService.getTeacherClasses(teacherId) });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/assignments", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      return res.status(200).json({ data: await teacherService.getTeacherAssignments(teacherId) });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/lessons", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      return res.status(200).json({ data: await teacherService.listLessons(teacherId) });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/lessons", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      const { classId, subjectId, title, description, objectives, orderIndex } = req.body ?? {};
      if (!classId || !subjectId || !title) {
        return res.status(400).json({ error: "classId, subjectId et title sont obligatoires." });
      }
      return res.status(201).json({
        data: await teacherService.createLesson({
          teacherId,
          classId: String(classId),
          subjectId: String(subjectId),
          title: String(title),
          description: typeof description === "string" ? description : undefined,
          objectives: typeof objectives === "string" ? objectives : undefined,
          orderIndex: orderIndex !== undefined ? Number(orderIndex) : undefined,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Création impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/schedule/:slotId/cancellations", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      const { date, reason } = req.body ?? {};
      if (!date || !reason) {
        return res.status(400).json({ error: "date et reason sont obligatoires." });
      }
      return res.status(201).json({
        data: await teacherService.cancelTimeSlot({
          teacherId,
          slotId: req.params.slotId,
          date: String(date),
          reason: String(reason),
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Annulation impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/dashboard", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) {
        return res.status(401).json({ error: "Session invalide." });
      }

      return res.status(200).json({
        data: await teacherService.getDashboard(teacherId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/students/:studentId/risk-signals", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await teacherService.getStudentRiskSignals(req.params.studentId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/classes/:classId/risk-signals", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await teacherService.getClassRiskSignals(req.params.classId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/students/:studentId/recommendations", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await teacherService.listStudentRecommendations(req.params.studentId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/students/:studentId/recommendations", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) {
        return res.status(401).json({ error: "Session invalide." });
      }

      const { summary, riskLevel, recommendations, explanation, prompt } = req.body ?? {};
      if (!summary || !Array.isArray(recommendations)) {
        return res.status(400).json({
          error: "summary et recommendations sont obligatoires.",
        });
      }

      return res.status(201).json({
        data: await teacherService.saveStudentRecommendation({
          studentId: req.params.studentId,
          teacherId,
          summary: String(summary),
          riskLevel: typeof riskLevel === "string" ? riskLevel : undefined,
          recommendations: recommendations.map((item: unknown) => String(item)),
          explanation: typeof explanation === "string" ? explanation : undefined,
          prompt: typeof prompt === "string" ? prompt : undefined,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Enregistrement impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/students/:studentId/whatsapp-message", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) {
        return res.status(401).json({ error: "Session invalide." });
      }

      const message = typeof req.body?.message === "string" ? req.body.message : "";
      const recommendationId =
        typeof req.body?.recommendationId === "string" ? req.body.recommendationId : undefined;
      if (!message.trim()) {
        return res.status(400).json({ error: "Le message est obligatoire." });
      }

      return res.status(200).json({
        data: await teacherService.sendWhatsAppToStudentParents({
          studentId: req.params.studentId,
          teacherId,
          message: message.trim(),
          recommendationId,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Envoi impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/classes/:classId/recommendations", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await teacherService.listClassRecommendations(req.params.classId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/classes/:classId/recommendations", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) {
        return res.status(401).json({ error: "Session invalide." });
      }

      const { summary, riskLevel, recommendations, explanation, prompt } = req.body ?? {};
      if (!summary || !Array.isArray(recommendations)) {
        return res.status(400).json({
          error: "summary et recommendations sont obligatoires.",
        });
      }

      return res.status(201).json({
        data: await teacherService.saveClassRecommendation({
          classId: req.params.classId,
          teacherId,
          summary: String(summary),
          riskLevel: typeof riskLevel === "string" ? riskLevel : undefined,
          recommendations: recommendations.map((item: unknown) => String(item)),
          explanation: typeof explanation === "string" ? explanation : undefined,
          prompt: typeof prompt === "string" ? prompt : undefined,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof TeacherError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Enregistrement impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// ─── Messages Parents ──────────────────────────────────────────────────────────

teacherRouter.get("/messages", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      return res.status(200).json({ data: await messagesService.listContacts(teacherId) });
    })
    .catch((error) => {
      const statusCode = error instanceof MessagesError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.get("/messages/:studentId", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      return res.status(200).json({ data: await messagesService.getThread(teacherId, req.params.studentId) });
    })
    .catch((error) => {
      const statusCode = error instanceof MessagesError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/messages/:studentId", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      if (!content) return res.status(400).json({ error: "Le message ne peut pas être vide." });
      return res.status(201).json({ data: await messagesService.sendMessage(teacherId, req.params.studentId, content) });
    })
    .catch((error) => {
      const statusCode = error instanceof MessagesError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Envoi impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

teacherRouter.post("/messages/:studentId/read", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherId = req.currentUser?.id;
      if (!teacherId) return res.status(401).json({ error: "Session invalide." });
      return res.status(200).json({
        data: await messagesService.markThreadAsRead(teacherId, req.params.studentId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof MessagesError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Mise à jour impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// ─── Analyse IA côté backend ────────────────────────────────────────────────
// Le frontend appelle ces endpoints au lieu d'appeler Gemini directement (fix IA statique)

teacherRouter.post("/analyze-student", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherUserId = req.currentUser?.id;
      if (!teacherUserId) return res.status(401).json({ error: "Session invalide." });

      const { studentId, studentName, extraPrompt, riskSignals, grades, attendance } = req.body ?? {};

      if (!studentId) return res.status(400).json({ error: "studentId requis." });

      // Récupérer les matières enseignées par ce prof pour filtrer l'analyse
      const assignments = await teacherService.getTeacherAssignments(teacherUserId);
      const teacherSubjectNames = [...new Set(assignments.map((a) => a.subjectName))];
      const teacherSubjectIds = [...new Set(assignments.map((a) => a.subjectId))];

      // Filtrer les notes pour ne garder que les matières du prof
      const filteredGrades = Array.isArray(grades)
        ? grades.filter((g: { subject?: string; subjectId?: string }) =>
            teacherSubjectNames.some((name) => g.subject?.toLowerCase().includes(name.toLowerCase())) ||
            teacherSubjectIds.includes(g.subjectId ?? "")
          )
        : [];

      // Filtrer les absences par matières du prof si elles ont un champ subject
      const filteredAttendance = Array.isArray(attendance)
        ? attendance.filter((a: { subject?: string }) =>
            !a.subject ||
            teacherSubjectNames.some((name) => a.subject?.toLowerCase().includes(name.toLowerCase()))
          )
        : attendance;

      const subjectsLabel = teacherSubjectNames.length
        ? teacherSubjectNames.join(", ")
        : "sa matière";

      const teacherFirstName = req.currentUser?.firstName ?? "";
      const teacherLastName = req.currentUser?.lastName ?? "";
      const teacherFullName = `${teacherFirstName} ${teacherLastName}`.trim() || "L'enseignant";

      if (!isAiAvailable()) {
        return res.status(200).json({
          data: {
            summary: "L'analyse IA est désactivée. Configurez DEEPSEEK_API_KEY ou GEMINI_API_KEY.",
            riskLevel: "medium",
            recommendations: [
              "Suivre régulièrement les notes et l'assiduité.",
              "Organiser des séances de rattrapage pour les matières faibles.",
              "Maintenir un contact régulier avec les parents.",
            ],
            explanation: "Aucune clé API IA configurée.",
            whatsappMessage: `Bonjour, nous vous invitons à suivre la scolarité de ${studentName ?? "votre enfant"}.`,
            source: "fallback",
          },
        });
      }

      const prompt = `
Tu es ${teacherFullName}, enseignant(e) de ${subjectsLabel}.
Tu analyses la situation d'un de tes élèves dans ta ou tes matières uniquement.
Tu ne dois PAS commenter les matières que tu n'enseignes pas.

Élève: ${studentName ?? studentId}
Tes matières: ${subjectsLabel}
${extraPrompt ? `Contexte supplémentaire: ${extraPrompt}` : ""}

Signaux de risque (tes matières): ${JSON.stringify(riskSignals ?? {})}
Notes dans tes matières: ${JSON.stringify(filteredGrades.length ? filteredGrades : "Aucune note disponible dans tes matières")}
Présences dans tes cours: ${JSON.stringify(filteredAttendance ?? "Aucune donnée")}

Règles obligatoires:
- Analyse UNIQUEMENT les matières listées ci-dessus (${subjectsLabel}).
- Ne mentionne jamais d'autres matières même si des signaux généraux y font référence.
- Tu ne dois jamais créer, deviner ou compléter une information absente du contexte.
- Tu peux citer uniquement les notes, moyennes, absences et signaux présents dans le contexte.
- Si les données sont insuffisantes, dis-le clairement et base-toi sur ce qui est disponible.

Réponds en JSON strict:
{
  "summary": string (résumé en 2-3 phrases, centré sur tes matières),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "recommendations": string[] (3 recommandations actionnables pour tes matières),
  "explanation": string (explication pédagogique détaillée, tes matières uniquement),
  "whatsappMessage": string (message WhatsApp signé par ${teacherFullName}, enseignant(e) de ${subjectsLabel})
}
      `.trim();

      const result = await callAiJson<{
        summary: string;
        riskLevel: string;
        recommendations: string[];
        explanation: string;
        whatsappMessage: string;
      }>(prompt);

      if (!result) {
        return res.status(503).json({ error: "Service IA indisponible." });
      }

      return res.status(200).json({ data: { ...result, source: "ai" } });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Analyse impossible.";
      return res.status(400).json({ error: message });
    });
});

teacherRouter.post("/analyze-class", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const teacherUserId = req.currentUser?.id;
      if (!teacherUserId) return res.status(401).json({ error: "Session invalide." });

      const { classId, className, extraPrompt, students, classSignals } = req.body ?? {};
      if (!classId) return res.status(400).json({ error: "classId requis." });

      // Matières enseignées par ce prof dans cette classe
      const assignments = await teacherService.getTeacherAssignments(teacherUserId);
      const classAssignments = assignments.filter((a) => a.classId === classId);
      const teacherSubjectNames = [...new Set(classAssignments.map((a) => a.subjectName))];

      const teacherFirstName = req.currentUser?.firstName ?? "";
      const teacherLastName = req.currentUser?.lastName ?? "";
      const teacherFullName = `${teacherFirstName} ${teacherLastName}`.trim() || "L'enseignant";
      const subjectsLabel = teacherSubjectNames.length ? teacherSubjectNames.join(", ") : "sa matière";

      // Filtrer les données élèves pour ne garder que les notes des matières du prof
      const filteredStudents = Array.isArray(students)
        ? students.map((s: { name?: string; grades?: Array<{ subject?: string }> }) => ({
            ...s,
            grades: Array.isArray(s.grades)
              ? s.grades.filter((g) =>
                  teacherSubjectNames.some((name) => g.subject?.toLowerCase().includes(name.toLowerCase()))
                )
              : [],
          }))
        : [];

      if (!isAiAvailable()) {
        return res.status(200).json({
          data: {
            summary: "L'analyse IA est désactivée. Configurez DEEPSEEK_API_KEY ou GEMINI_API_KEY.",
            riskLevel: "medium",
            recommendations: [
              "Planifier un point de suivi avec les élèves en difficulté.",
              "Identifier les lacunes récurrentes dans la matière.",
              "Communiquer les résultats aux familles concernées.",
            ],
            explanation: "Aucune clé API IA configurée.",
            source: "fallback",
          },
        });
      }

      const prompt = `
Tu es ${teacherFullName}, enseignant(e) de ${subjectsLabel}.
Tu analyses ta classe dans tes matières uniquement. Ne commente pas les autres matières.

Classe: ${className ?? classId}
Tes matières: ${subjectsLabel}
${extraPrompt ? `Contexte supplémentaire: ${extraPrompt}` : ""}

Signaux de risque classe: ${JSON.stringify(classSignals ?? {})}
Données élèves — notes filtrées à tes matières (${filteredStudents.length} élèves):
${JSON.stringify(filteredStudents.slice(0, 15))}

Règles obligatoires:
- Analyse UNIQUEMENT les matières: ${subjectsLabel}.
- Ne mentionne jamais d'autres matières.
- Tu ne dois jamais créer, deviner ou compléter une information absente du contexte.
- Toute alerte de performance ou d'assiduité doit être basée sur les valeurs présentes.

Réponds en JSON strict:
{
  "summary": string (bilan de la classe dans tes matières, 2-3 phrases),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "recommendations": string[] (3-5 recommandations actionnables pour tes matières),
  "explanation": string (analyse pédagogique détaillée, tes matières uniquement)
}
      `.trim();

      const result = await callAiJson<{
        summary: string;
        riskLevel: string;
        recommendations: string[];
        explanation: string;
      }>(prompt);

      if (!result) {
        return res.status(503).json({ error: "Service IA indisponible." });
      }

      return res.status(200).json({ data: { ...result, source: "ai" } });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Analyse impossible.";
      return res.status(400).json({ error: message });
    });
});
