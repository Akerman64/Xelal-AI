import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../auth/middleware";
import { teacherService, TeacherError } from "./service";
import { messagesService, MessagesError } from "./messages-service";

export const teacherRouter = Router();

teacherRouter.use(requireAuth, requireRole("TEACHER", "ADMIN"));

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
      if (!message.trim()) {
        return res.status(400).json({ error: "Le message est obligatoire." });
      }

      return res.status(200).json({
        data: await teacherService.sendWhatsAppToStudentParents({
          studentId: req.params.studentId,
          teacherId,
          message: message.trim(),
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
