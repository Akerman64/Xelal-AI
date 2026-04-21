import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../auth/middleware";
import { AppRole, AppUserStatus } from "../core/dev-store";
import { AdminError, adminService } from "./service";
import { schoolRepository } from "../core/school-repository";
import { callAiJson, isAiAvailable } from "../../lib/ai";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/users", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.listUsers() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.get("/overview", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.getOverview() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.get("/recommendations/stats", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.getRecommendationsStats() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.get("/academic-activity", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.getAcademicActivity() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.get("/academic-statistics", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.getAcademicStatistics() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.patch("/grades/:gradeId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const value = Number(req.body?.value);
      if (!Number.isFinite(value)) {
        return res.status(400).json({ error: "La note est obligatoire." });
      }
      return res.status(200).json({
        data: await adminService.updateGrade(req.params.gradeId, {
          value,
          comment: typeof req.body?.comment === "string" ? req.body.comment : undefined,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Modification impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.post("/ai/class-report/:classId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await adminService.generateClassReport(req.params.classId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Rapport IA impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.get("/invitations", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.listInvitations() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.post("/invitations/:invitationId/resend", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await adminService.resendInvitation(req.params.invitationId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Relance impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.patch("/invitations/:invitationId/status", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const status = String(req.body?.status);
      if (status !== "EXPIRED") {
        return res.status(400).json({ error: "Statut d'invitation invalide." });
      }

      return res.status(200).json({
        data: await adminService.expireInvitation(req.params.invitationId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message =
        error instanceof Error ? error.message : "Mise a jour impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.post("/users/invite", (req, res) => {
  Promise.resolve()
    .then(async () => {
    const { schoolId, firstName, lastName, email, phone, role, classId } = req.body ?? {};
    const normalizedRole = String(role) as AppRole;

    if (!schoolId || !firstName || !lastName || !role) {
      return res.status(400).json({
        error: "schoolId, firstName, lastName et role sont obligatoires.",
      });
    }

    // Email obligatoire pour enseignants et admins (ils reçoivent le code par mail)
    if (normalizedRole !== "STUDENT" && normalizedRole !== "PARENT" && !email) {
      return res.status(400).json({
        error: "L'email est obligatoire pour les enseignants et administrateurs.",
      });
    }

    return res.status(201).json({
      data: await adminService.inviteUser({
        schoolId,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        role: normalizedRole,
        classId,
      }),
    });
    })
    .catch((error) => {
    const statusCode = error instanceof AdminError ? error.statusCode : 400;
    const message = error instanceof Error ? error.message : "Invitation impossible.";
    return res.status(statusCode).json({ error: message });
    });
});

adminRouter.post("/parents", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { schoolId, firstName, lastName, email, phone } = req.body ?? {};

      if (!schoolId || !firstName || !lastName || !phone) {
        return res.status(400).json({
          error: "schoolId, firstName, lastName et phone sont obligatoires.",
        });
      }

      return res.status(201).json({
        data: await adminService.registerParent({
          schoolId,
          firstName,
          lastName,
          email,
          phone,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Création impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.patch("/users/:userId/status", (req, res) => {
  Promise.resolve()
    .then(async () => {
    const status = String(req.body?.status) as AppUserStatus;
    if (!["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }

    return res.status(200).json({
      data: await adminService.updateUserStatus(req.params.userId, status),
    });
    })
    .catch((error) => {
    const statusCode = error instanceof AdminError ? error.statusCode : 400;
    const message =
      error instanceof Error ? error.message : "Mise a jour impossible.";
    return res.status(statusCode).json({ error: message });
    });
});

adminRouter.delete("/users/:userId", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await adminService.deleteUser(req.params.userId, req.currentUser?.id),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.get("/classes", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.listClasses() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.post("/classes", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { schoolId, academicYearId, name, level } = req.body ?? {};
      if (!schoolId || !name) {
        return res.status(400).json({ error: "schoolId et name sont obligatoires." });
      }
      return res.status(201).json({
        data: await adminService.createClass({ schoolId, academicYearId: academicYearId ?? "ay_2025_2026", name, level }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Création impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.delete("/classes/:classId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.deleteClass(req.params.classId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.get("/subjects", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.listSubjects() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.post("/subjects", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { schoolId, name, coefficientDefault } = req.body ?? {};
      if (!schoolId || !name) {
        return res.status(400).json({ error: "schoolId et name sont obligatoires." });
      }
      return res.status(201).json({
        data: await adminService.createSubject({ schoolId, name, coefficientDefault: coefficientDefault ? Number(coefficientDefault) : undefined }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Création impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.delete("/subjects/:subjectId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.deleteSubject(req.params.subjectId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.get("/assignments", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.listAssignments() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.get("/parent-student-links", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.listParentStudentLinks() });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.post("/parent-student-links", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { parentUserId, studentId, relationship, isPrimary } = req.body ?? {};
      if (!parentUserId || !studentId || !relationship) {
        return res.status(400).json({
          error: "parentUserId, studentId et relationship sont obligatoires.",
        });
      }

      return res.status(201).json({
        data: await adminService.createParentStudentLink({
          parentUserId,
          studentId,
          relationship,
          isPrimary: Boolean(isPrimary),
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Création impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.delete("/parent-student-links/:linkId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await adminService.deleteParentStudentLink(req.params.linkId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// ─── Inscriptions élèves dans les classes ──────────────────────────────────

adminRouter.get("/enrollments", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
      return res.status(200).json({ data: await adminService.listEnrollments(classId) });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.post("/enrollments", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { studentId, classId } = req.body ?? {};
      if (!studentId || !classId) {
        return res.status(400).json({ error: "studentId et classId sont obligatoires." });
      }
      return res.status(201).json({ data: await adminService.createEnrollment({ studentId, classId }) });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Inscription impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.delete("/enrollments/:enrollmentId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.deleteEnrollment(req.params.enrollmentId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// ─── Emploi du temps ───────────────────────────────────────────────────────

adminRouter.get("/schedule", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
      return res.status(200).json({ data: await adminService.listTimeSlots(classId) });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Lecture impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.post("/schedule", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { classId, subjectId, teacherId, day, startTime, endTime, room } = req.body ?? {};
      if (!classId || !subjectId || !teacherId || !day || !startTime || !endTime) {
        return res.status(400).json({
          error: "classId, subjectId, teacherId, day, startTime et endTime sont obligatoires.",
        });
      }
      return res.status(201).json({
        data: await adminService.createTimeSlot({ classId, subjectId, teacherId, day, startTime, endTime, room }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Création impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.delete("/schedule/:slotId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await adminService.deleteTimeSlot(req.params.slotId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.post("/schedule/:slotId/cancellations", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const { date, reason } = req.body ?? {};
      if (!date || !reason) {
        return res.status(400).json({ error: "date et reason sont obligatoires." });
      }
      return res.status(201).json({
        data: await adminService.cancelTimeSlot({
          slotId: req.params.slotId,
          date: String(date),
          reason: String(reason),
          cancelledBy: req.currentUser?.id ?? "admin",
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Annulation impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

adminRouter.post("/assignments", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { teacherId, classId, subjectId, coefficient } = req.body ?? {};
      if (!teacherId || !classId || !subjectId) {
        return res.status(400).json({ error: "teacherId, classId et subjectId sont obligatoires." });
      }
      const coef = coefficient !== undefined ? Number(coefficient) : undefined;
      return res.status(201).json({
        data: await adminService.createAssignment({
          teacherId,
          classId,
          subjectId,
          coefficient: coef && Number.isFinite(coef) && coef > 0 ? coef : undefined,
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Affectation impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

// ─── Analyse IA admin ─────────────────────────────────────────────────────

/**
 * POST /api/admin/analyze
 * Analyse un élève ou une classe, toutes matières ou une matière en particulier.
 * Body: { classId, studentId?, subjectId?, subjectName?, extraPrompt? }
 */
adminRouter.post("/analyze", (req: AuthenticatedRequest, res) => {
  Promise.resolve()
    .then(async () => {
      const { classId, studentId, subjectId, subjectName, extraPrompt } = req.body ?? {};

      if (!classId) return res.status(400).json({ error: "classId requis." });

      if (!isAiAvailable()) {
        return res.status(503).json({ error: "Service IA non configuré (DEEPSEEK_API_KEY ou GEMINI_API_KEY manquant)." });
      }

      const subjectFilter = subjectName ?? (subjectId ? `matière ${subjectId}` : null);
      const scopeLabel = subjectFilter ? `en ${subjectFilter}` : "toutes matières confondues";

      if (studentId) {
        // ── Analyse individuelle ──────────────────────────────────────────
        const gradesReport = await schoolRepository.getStudentGrades(studentId);
        const attendanceReport = await schoolRepository.getStudentAttendance(studentId);

        if (!gradesReport) return res.status(404).json({ error: "Élève introuvable." });

        const grades = subjectId
          ? gradesReport.grades.filter((g) => g.subjectId === subjectId || g.subject?.toLowerCase().includes((subjectName ?? "").toLowerCase()))
          : gradesReport.grades;

        const subjectSummaries = subjectId
          ? gradesReport.subjectSummaries.filter((s) => s && (s.subjectId === subjectId || s.subject?.toLowerCase().includes((subjectName ?? "").toLowerCase())))
          : gradesReport.subjectSummaries;

        const prompt = `
Tu es le directeur pédagogique de l'école. Tu analyses la situation scolaire d'un élève ${scopeLabel}.
Tu as accès à toutes les données de l'école.

Élève: ${gradesReport.student.firstName} ${gradesReport.student.lastName}
Analyse: ${scopeLabel}
${extraPrompt ? `Contexte supplémentaire: ${extraPrompt}` : ""}

Moyenne générale: ${gradesReport.summary.generalAverage ?? "non calculée"}
Moyennes par matière (filtrées): ${JSON.stringify(subjectSummaries)}
Notes détaillées: ${JSON.stringify(grades.slice(0, 30))}
Absences: ${JSON.stringify(attendanceReport?.summary ?? {})}
Dernières présences: ${JSON.stringify(attendanceReport?.records.slice(0, 10) ?? [])}

Règles:
- Base-toi uniquement sur les données fournies.
- Ne commente que ${subjectFilter ? `la matière ${subjectFilter}` : "les matières pour lesquelles il y a des données"}.
- Ne jamais inventer une note, une tendance ou un statut absent du contexte.

Réponds en JSON strict:
{
  "summary": string (résumé de la situation en 2-3 phrases),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "recommendations": string[] (3-5 recommandations actionnables),
  "explanation": string (analyse détaillée),
  "whatsappMessage": string (message WhatsApp pour les parents, chaleureux)
}
        `.trim();

        const result = await callAiJson<{
          summary: string; riskLevel: string; recommendations: string[];
          explanation: string; whatsappMessage: string;
        }>(prompt);

        if (!result) return res.status(503).json({ error: "Service IA indisponible." });
        return res.status(200).json({ data: { ...result, scope: "student", subjectFilter, source: "ai" } });

      } else {
        // ── Analyse de classe ─────────────────────────────────────────────
        const [classStudents, gradebook, attendance] = await Promise.all([
          schoolRepository.getClassStudents(classId),
          schoolRepository.getClassGradebook(classId),
          schoolRepository.getClassAttendance(classId),
        ]);

        const gradebookRows = gradebook?.rows ?? [];
        const filteredStudents = gradebookRows.map((row) => ({
          name: `${row.student.firstName} ${row.student.lastName}`,
          average: row.average,
          gradesCount: row.gradesCount,
          grades: subjectId
            ? (row as any).grades?.filter((g: { subjectId?: string; subject?: string }) =>
                g.subjectId === subjectId ||
                g.subject?.toLowerCase().includes((subjectName ?? "").toLowerCase())
              )
            : (row as any).grades,
        }));

        const attendanceSessions = attendance?.sessions ?? [];
        const attendanceSummary = attendanceSessions.reduce(
          (acc, s) => ({ present: acc.present + s.summary.present, absent: acc.absent + s.summary.absent, late: acc.late + s.summary.late }),
          { present: 0, absent: 0, late: 0 },
        );

        const prompt = `
Tu es le directeur pédagogique de l'école. Tu analyses une classe ${scopeLabel}.

Classe: ${classId}
Analyse: ${scopeLabel}
Effectif: ${classStudents?.students?.length ?? 0} élèves
${extraPrompt ? `Contexte supplémentaire: ${extraPrompt}` : ""}

Données par élève: ${JSON.stringify(filteredStudents.slice(0, 20))}
Résumé présences classe: ${JSON.stringify(attendanceSummary)}

Règles:
- Base-toi uniquement sur les données fournies.
- Ne commente que ${subjectFilter ? `la matière ${subjectFilter}` : "les matières pour lesquelles il y a des données"}.
- Identifie les élèves en difficulté par nom si les données le permettent.
- Ne jamais inventer une note, une tendance ou un statut absent du contexte.

Réponds en JSON strict:
{
  "summary": string (bilan de la classe en 2-3 phrases),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "recommendations": string[] (3-5 recommandations actionnables pour la direction),
  "explanation": string (analyse détaillée avec identification des élèves à risque si possible),
  "studentsAtRisk": string[] (prénoms des élèves nécessitant un suivi, liste vide si aucun)
}
        `.trim();

        const result = await callAiJson<{
          summary: string; riskLevel: string; recommendations: string[];
          explanation: string; studentsAtRisk: string[];
        }>(prompt);

        if (!result) return res.status(503).json({ error: "Service IA indisponible." });
        return res.status(200).json({ data: { ...result, scope: "class", subjectFilter, source: "ai" } });
      }
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Analyse impossible.";
      return res.status(400).json({ error: message });
    });
});

adminRouter.delete("/assignments/:assignmentId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({
        data: await adminService.deleteAssignment(req.params.assignmentId),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Suppression impossible.";
      return res.status(statusCode).json({ error: message });
    });
});
