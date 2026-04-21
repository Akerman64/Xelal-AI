import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../auth/middleware";
import { AcademicsError, academicsService } from "./service";

export const academicsRouter = Router();

academicsRouter.use(requireAuth);

academicsRouter.get("/subjects", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await academicsService.listSubjects() });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

academicsRouter.get("/classes/:classId/assessments", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await academicsService.listAssessmentsByClass(req.params.classId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Classe introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});

academicsRouter.get("/classes/:classId/gradebook", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res
        .status(200)
        .json({ data: await academicsService.getClassGradebook(req.params.classId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Classe introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});

academicsRouter.get("/students/:studentId/grades", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res
        .status(200)
        .json({ data: await academicsService.getStudentGrades(req.params.studentId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Eleve introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});

academicsRouter.post("/assessments", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { classId, subjectId, teacherId, title, type, coefficient, date, lessonIds } = req.body ?? {};

      if (!classId || !subjectId || !teacherId || !title || !type || !date) {
        return res.status(400).json({ error: "Payload d'evaluation incomplet." });
      }

      return res.status(201).json({
        data: await academicsService.createAssessment({
          classId,
          subjectId,
          teacherId,
          title,
          type,
          coefficient: Number(coefficient ?? 1),
          date,
          lessonIds: Array.isArray(lessonIds) ? lessonIds.map(String) : undefined,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Creation impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

academicsRouter.post("/grades/bulk", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const assessmentId =
        typeof req.body?.assessmentId === "string" ? req.body.assessmentId : "";
      const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

      if (!assessmentId || !entries.length) {
        return res
          .status(400)
          .json({ error: "assessmentId et entries sont obligatoires." });
      }

      return res.status(200).json({
        data: await academicsService.bulkUpsertGrades(
          assessmentId,
          entries.map((entry) => ({
            studentId: String(entry.studentId),
            value: Number(entry.value),
            comment:
              typeof entry.comment === "string" ? entry.comment : undefined,
          })),
        ),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Enregistrement impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// Accessible par l'élève lui-même ou un enseignant/admin
academicsRouter.get("/students/:studentId/recommendations", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const currentUser = req.currentUser;
      const { studentId } = req.params;

      // Un élève ne peut lire que ses propres recommandations
      if (currentUser?.role === "STUDENT" && currentUser.id !== studentId) {
        return res.status(403).json({ error: "Accès non autorisé." });
      }

      return res.status(200).json({
        data: await academicsService.listStudentRecommendations(studentId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

academicsRouter.patch("/grades/:gradeId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const value = Number(req.body?.value);
      if (!Number.isFinite(value)) {
        return res.status(400).json({ error: "La valeur de note est invalide." });
      }

      return res.status(200).json({
        data: await academicsService.updateGrade(
          req.params.gradeId,
          value,
          typeof req.body?.comment === "string" ? req.body.comment : undefined,
        ),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AcademicsError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Mise a jour impossible.";
      return res.status(statusCode).json({ error: message });
    });
});
