import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import { AppRole, AppUserStatus } from "../core/dev-store";
import { AdminError, adminService } from "./service";

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

    if (!schoolId || !firstName || !lastName || !email || !role) {
      return res.status(400).json({
        error: "schoolId, firstName, lastName, email et role sont obligatoires.",
      });
    }

    return res.status(201).json({
      data: await adminService.inviteUser({
        schoolId,
        firstName,
        lastName,
        email,
        phone,
        role: String(role) as AppRole,
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

adminRouter.post("/assignments", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { teacherId, classId, subjectId } = req.body ?? {};
      if (!teacherId || !classId || !subjectId) {
        return res.status(400).json({ error: "teacherId, classId et subjectId sont obligatoires." });
      }
      return res.status(201).json({
        data: await adminService.createAssignment({ teacherId, classId, subjectId }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AdminError ? error.statusCode : 400;
      const message = error instanceof Error ? error.message : "Affectation impossible.";
      return res.status(statusCode).json({ error: message });
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
