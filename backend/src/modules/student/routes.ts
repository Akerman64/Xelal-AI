import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../auth/middleware";
import { StudentError, studentService } from "./service";

export const studentRouter = Router();

studentRouter.use(requireAuth, requireRole("STUDENT", "ADMIN", "TEACHER"));

studentRouter.post("/ai/ask", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const currentUser = req.currentUser;
      if (!currentUser) {
        return res.status(401).json({ error: "Session invalide." });
      }

      const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
      const requestedStudentId =
        typeof req.body?.studentId === "string" ? req.body.studentId : currentUser.id;

      if (!question) {
        return res.status(400).json({ error: "La question est obligatoire." });
      }

      if (currentUser.role === "STUDENT" && requestedStudentId !== currentUser.id) {
        return res.status(403).json({ error: "Accès non autorisé." });
      }

      return res.status(200).json({
        data: await studentService.askTutor(requestedStudentId, question),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof StudentError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Question impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// Emploi du temps de l'étudiant (créneaux de sa classe)
studentRouter.get("/:studentId/schedule", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const currentUser = req.currentUser;
      if (!currentUser) return res.status(401).json({ error: "Session invalide." });

      const { studentId } = req.params;

      // Un élève ne peut voir que son propre emploi du temps
      if (currentUser.role === "STUDENT" && studentId !== currentUser.id) {
        return res.status(403).json({ error: "Accès non autorisé." });
      }

      return res.status(200).json({
        data: await studentService.getSchedule(studentId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof StudentError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(statusCode).json({ error: message });
    });
});
