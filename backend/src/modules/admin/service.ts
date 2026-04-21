import {
  AppRole,
  AppUserStatus,
  createId,
  createInvitationCode,
  devStore,
  publicInvitation,
  publicUser,
} from "../core/dev-store";
import { authAdminRepository } from "../core/auth-admin-repository";
import { schoolRepository } from "../core/school-repository";
import { teacherService } from "../teacher/service";
import { AnalysisType } from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { callAiJson, callAiText, isAiAvailable } from "../../lib/ai";
import { whatsappService } from "../whatsapp/service";
import { emailService } from "../email/service";

export class AdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const inSevenDays = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const riskWeight = (value?: string) => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "critical") return 4;
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  return 1;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const relationshipLabels = {
  MOTHER: "Mère",
  FATHER: "Père",
  TUTOR: "Tuteur",
} as const;

async function buildParentWelcomeMessage(input: {
  parentFirstName: string;
  linkedStudentName: string;
  childrenNames: string[];
}) {
  const fallback = [
    `Bonjour ${input.parentFirstName}, votre compte parent est maintenant lié à ${input.linkedStudentName} sur Xelal AI.`,
    "Vous pouvez m'écrire ici naturellement pour demander les notes, absences, retards, emploi du temps ou conseils de suivi.",
    "Je répondrai uniquement avec les informations enregistrées par l'école.",
  ].join("\n");

  if (!isAiAvailable()) {
    return fallback;
  }

  const reply = await callAiText(
    [
      {
        role: "user",
        content: [
          `Parent: ${input.parentFirstName}`,
          `Élève nouvellement lié: ${input.linkedStudentName}`,
          `Tous les enfants suivis: ${input.childrenNames.join(", ")}`,
          "Écris le message de bienvenue WhatsApp.",
        ].join("\n"),
      },
    ],
    [
      "Tu écris un message WhatsApp de bienvenue pour un parent qui vient d'être lié à son enfant dans Xelal AI.",
      "Le ton doit être humain, chaleureux, simple et naturel.",
      "Maximum 3 phrases courtes.",
      "Explique qu'il peut poser des questions naturellement sur les notes, absences, retards, emploi du temps ou conseils.",
      "Précise que les réponses se basent uniquement sur les informations enregistrées par l'école.",
      "Ne donne aucune note, absence, horaire ou performance dans ce message de bienvenue.",
    ].join("\n"),
  ).catch(() => null);

  return reply?.trim() || fallback;
}

export const adminService = {
  async getOverview() {
    const [users, invitations] = await Promise.all([
      authAdminRepository.listUsers(),
      authAdminRepository.listInvitations(),
    ]);

    const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
    const pendingUsers = users.filter((user) => user.status === "PENDING").length;
    const suspendedUsers = users.filter((user) => user.status === "SUSPENDED").length;

    return {
      totals: {
        users: users.length,
        activeUsers,
        pendingUsers,
        suspendedUsers,
        invitationsPending: invitations.filter((item) => item.status === "PENDING").length,
      },
      byRole: {
        admins: users.filter((user) => user.role === "ADMIN").length,
        teachers: users.filter((user) => user.role === "TEACHER").length,
        students: users.filter((user) => user.role === "STUDENT").length,
        parents: users.filter((user) => user.role === "PARENT").length,
      },
      recentInvitations: invitations
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
        .map(publicInvitation),
    };
  },

  async listUsers() {
    const users = await authAdminRepository.listUsers();
    return users.map(publicUser);
  },

  async listInvitations() {
    const invitations = await authAdminRepository.listInvitations();
    return invitations.map(publicInvitation);
  },

  async inviteUser(input: {
    schoolId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role: AppRole;
    classId?: string;
  }) {
    const normalizedEmail = input.email?.trim().toLowerCase();

    if (normalizedEmail) {
      const existingUser = await authAdminRepository.findUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new AdminError("Un utilisateur avec cet email existe deja.", 409);
      }
    }

    // Élève sans email : création directe en ACTIVE, pas d'invitation
    if (input.role === "STUDENT" && !normalizedEmail) {
      const user = await authAdminRepository.createUser({
        schoolId: input.schoolId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
        status: "ACTIVE",
      });

      return {
        user: publicUser(user),
        invitation: null,
        emailDelivery: null,
        whatsappDelivery: null,
      };
    }

    const user = await authAdminRepository.createPendingUser({
      schoolId: input.schoolId,
      classId: input.classId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail!,
      phone: input.phone,
      role: input.role,
    });
    const invitation = await authAdminRepository.createInvitation({
      schoolId: input.schoolId,
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: inSevenDays(),
    });

    // Email en priorité, WhatsApp en fallback
    let emailDelivery: { delivered: boolean; reason?: string } | null = null;
    let whatsappDelivery: { delivered: boolean; reason?: string } | null = null;

    if (user.email) {
      emailDelivery = await emailService.sendInvitation({
        to: user.email,
        firstName: user.firstName,
        role: user.role,
        code: invitation.code,
        email: user.email,
      });
    }

    if (user.phone) {
      const roleLabel = user.role === "TEACHER" ? "enseignant(e)" : user.role === "STUDENT" ? "élève" : user.role.toLowerCase();
      const message = [
        `Bonjour ${user.firstName},`,
        ``,
        `Vous avez été invité(e) sur Xelal AI en tant qu'${roleLabel}.`,
        ``,
        `Votre code d'activation : ${invitation.code}`,
        user.email ? `Email de connexion : ${user.email}` : "",
        ``,
        `Ce code expire dans 7 jours.`,
      ].filter(Boolean).join("\n");

      whatsappDelivery = await whatsappService.sendText(user.phone, message);
    }

    return {
      user: publicUser(user),
      invitation: {
        ...publicInvitation(invitation),
        code: invitation.code,
      },
      emailDelivery,
      whatsappDelivery,
    };
  },

  async registerParent(input: {
    schoolId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }) {
    const normalizedEmail = input.email?.trim().toLowerCase();
    const normalizedPhone = input.phone.trim();

    if (normalizedEmail) {
      const existingByEmail = await authAdminRepository.findUserByEmail(normalizedEmail);
      if (existingByEmail) {
        throw new AdminError("Un utilisateur avec cet email existe deja.", 409);
      }
    }

    const existingUsers = await authAdminRepository.listUsers();
    const existingByPhone = existingUsers.find(
      (user) => user.phone?.replace(/\s+/g, "") === normalizedPhone.replace(/\s+/g, ""),
    );
    if (existingByPhone) {
      throw new AdminError("Un utilisateur avec ce numéro existe deja.", 409);
    }

    const user = await authAdminRepository.createUser({
      schoolId: input.schoolId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: "PARENT",
      status: "ACTIVE",
    });

    return {
      user: publicUser(user),
    };
  },

  async updateUserStatus(userId: string, status: AppUserStatus) {
    try {
      const user = await authAdminRepository.updateUserStatus(userId, status);
      return publicUser(user);
    } catch {
      throw new AdminError("Utilisateur introuvable.", 404);
    }
  },

  async deleteUser(userId: string, currentUserId?: string) {
    if (userId === currentUserId) {
      throw new AdminError("Vous ne pouvez pas supprimer votre propre compte.", 400);
    }

    if (!isPrismaEnabled()) {
      const index = devStore.users.findIndex((user) => user.id === userId);
      if (index === -1) throw new AdminError("Utilisateur introuvable.", 404);

      devStore.users.splice(index, 1);
      devStore.invitations = devStore.invitations.filter((invite) => invite.userId !== userId);
      devStore.classes.forEach((classRecord) => {
        classRecord.studentIds = classRecord.studentIds.filter((id) => id !== userId);
        classRecord.teacherIds = classRecord.teacherIds.filter((id) => id !== userId);
      });
      devStore.teacherAssignments = devStore.teacherAssignments.filter((item) => item.teacherId !== userId);
      devStore.parentStudentLinks = devStore.parentStudentLinks.filter(
        (link) => link.parentUserId !== userId && link.studentId !== userId,
      );
      devStore.messages = devStore.messages.filter(
        (message) =>
          message.teacherId !== userId &&
          message.parentUserId !== userId &&
          message.studentId !== userId,
      );
      return { id: userId };
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, teacherProfile: true },
    });
    if (!user) {
      throw new AdminError("Utilisateur introuvable.", 404);
    }

    await prisma!.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { userId } });

      if (user.studentProfile) {
        const studentId = user.studentProfile.id;
        const attendanceRecords = await tx.attendanceRecord.findMany({
          where: { studentId },
          select: { sessionId: true },
        });
        const sessionIds = Array.from(new Set(attendanceRecords.map((record) => record.sessionId)));

        await tx.message.deleteMany({ where: { studentId } });
        await tx.teacherRecommendation.deleteMany({
          where: { OR: [{ studentId }, { teacherId: userId }] },
        });
        await tx.aIAnalysis.deleteMany({ where: { studentId } });
        await tx.parentStudent.deleteMany({ where: { studentId } });
        await tx.grade.deleteMany({ where: { studentId } });
        await tx.attendanceRecord.deleteMany({ where: { studentId } });
        await tx.studentEnrollment.deleteMany({ where: { studentId } });
        await tx.student.delete({ where: { id: studentId } });

        for (const sessionId of sessionIds) {
          const remaining = await tx.attendanceRecord.count({ where: { sessionId } });
          if (remaining === 0) {
            await tx.attendanceSession.delete({ where: { id: sessionId } }).catch(() => null);
          }
        }
      }

      if (user.teacherProfile) {
        await tx.teacherAssignment.deleteMany({ where: { teacherId: user.teacherProfile.id } });
        await tx.teacher.delete({ where: { id: user.teacherProfile.id } });
      }

      if (user.role === "PARENT") {
        await tx.parentStudent.deleteMany({ where: { parentUserId: userId } });
        await tx.message.deleteMany({ where: { parentUserId: userId } });
      }

      await tx.message.deleteMany({ where: { teacherId: userId } });
      await tx.teacherRecommendation.deleteMany({ where: { teacherId: userId } });
      const teacherSessions = await tx.attendanceSession.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      await tx.attendanceRecord.deleteMany({
        where: { sessionId: { in: teacherSessions.map((session) => session.id) } },
      });
      await tx.attendanceSession.deleteMany({ where: { teacherId: userId } });
      await tx.timeSlot.deleteMany({ where: { teacherId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { id: userId };
  },

  async resendInvitation(invitationId: string) {
    const invitation = await authAdminRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new AdminError("Invitation introuvable.", 404);
    }

    const refreshed = await authAdminRepository.refreshInvitation(invitationId, {
      code: createInvitationCode(),
      expiresAt: inSevenDays(),
      status: "PENDING",
    });

    return {
      ...publicInvitation(refreshed),
      code: refreshed.code,
    };
  },

  async expireInvitation(invitationId: string) {
    const invitation = await authAdminRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new AdminError("Invitation introuvable.", 404);
    }

    const updated = await authAdminRepository.updateInvitationStatus(invitationId, "EXPIRED");
    return publicInvitation(updated);
  },

  async listClasses() {
    return schoolRepository.listClasses();
  },

  async createClass(input: { schoolId: string; academicYearId: string; name: string; level?: string }) {
    try {
      return await schoolRepository.createClass(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Création impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteClass(classId: string) {
    try {
      return await schoolRepository.deleteClass(classId);
    } catch {
      throw new AdminError("Classe introuvable.", 404);
    }
  },

  async listSubjects() {
    return schoolRepository.listSubjects();
  },

  async createSubject(input: { schoolId: string; name: string; coefficientDefault?: number }) {
    try {
      return await schoolRepository.createSubject(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Création impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteSubject(subjectId: string) {
    try {
      return await schoolRepository.deleteSubject(subjectId);
    } catch {
      throw new AdminError("Matière introuvable.", 404);
    }
  },

  async listAssignments() {
    return schoolRepository.listAssignments();
  },

  async listParentStudentLinks() {
    if (!isPrismaEnabled()) {
      return devStore.parentStudentLinks.map((link) => {
        const parent = devStore.users.find((u) => u.id === link.parentUserId);
        const student = devStore.users.find((u) => u.id === link.studentId);
        if (!parent || !student) return null;
        return {
          id: link.id,
          parentUserId: link.parentUserId,
          parentName: `${parent.firstName} ${parent.lastName}`,
          parentPhone: parent.phone ?? undefined,
          studentId: link.studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          relationship: link.relationship,
          relationshipLabel: relationshipLabels[link.relationship],
          isPrimary: link.isPrimary,
        };
      }).filter(Boolean);
    }

    const prisma = getPrismaClient();
    const links = await prisma!.parentStudent.findMany({
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { parentUserId: "asc" },
        { isPrimary: "desc" },
      ],
    });

    const parentIds = Array.from(new Set(links.map((item) => item.parentUserId)));
    const parents = await prisma!.user.findMany({
      where: { id: { in: parentIds } },
    });
    const parentMap = new Map(parents.map((parent) => [parent.id, parent]));

    return links
      .map((link) => {
        const parent = parentMap.get(link.parentUserId);
        if (!parent) return null;

        return {
          id: link.id,
          parentUserId: parent.id,
          parentName: `${parent.firstName} ${parent.lastName}`,
          parentPhone: parent.phone ?? "",
          studentId: link.student.id,
          studentName: `${link.student.user.firstName} ${link.student.user.lastName}`,
          relationship: link.relationship,
          relationshipLabel: relationshipLabels[link.relationship],
          isPrimary: link.isPrimary,
        };
      })
      .filter(Boolean);
  },

  async createParentStudentLink(input: {
    parentUserId: string;
    studentId: string;
    relationship: "MOTHER" | "FATHER" | "TUTOR";
    isPrimary?: boolean;
  }) {
    if (!isPrismaEnabled()) {
      const parent = devStore.users.find((u) => u.id === input.parentUserId && u.role === "PARENT");
      if (!parent) throw new AdminError("Parent introuvable.", 404);

      const student = devStore.users.find((u) => u.id === input.studentId && u.role === "STUDENT");
      if (!student) throw new AdminError("Élève introuvable.", 404);

      const existing = devStore.parentStudentLinks.find(
        (l) => l.parentUserId === input.parentUserId && l.studentId === input.studentId,
      );
      if (existing) throw new AdminError("Ce parent est déjà rattaché à cet élève.", 409);

      if (input.isPrimary) {
        devStore.parentStudentLinks
          .filter((l) => l.studentId === input.studentId)
          .forEach((l) => { l.isPrimary = false; });
      }

      const link = {
        id: createId("link"),
        parentUserId: input.parentUserId,
        studentId: input.studentId,
        relationship: input.relationship,
        isPrimary: input.isPrimary ?? true,
      };
      devStore.parentStudentLinks.push(link);

      return {
        id: link.id,
        parentUserId: parent.id,
        parentName: `${parent.firstName} ${parent.lastName}`,
        parentPhone: parent.phone ?? undefined,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        relationship: link.relationship,
        relationshipLabel: relationshipLabels[link.relationship],
        isPrimary: link.isPrimary,
      };
    }

    const prisma = getPrismaClient();
    const [parent, student] = await Promise.all([
      prisma!.user.findUnique({ where: { id: input.parentUserId } }),
      prisma!.student.findFirst({
        where: { OR: [{ id: input.studentId }, { userId: input.studentId }] },
        include: { user: true },
      }),
    ]);

    if (!parent || parent.role !== "PARENT") {
      throw new AdminError("Parent introuvable.", 404);
    }

    if (!student) {
      throw new AdminError("Élève introuvable.", 404);
    }

    // Utiliser le vrai Student.id pour toutes les opérations suivantes
    const studentProfileId = student.id;

    const existing = await prisma!.parentStudent.findFirst({
      where: {
        parentUserId: input.parentUserId,
        studentId: studentProfileId,
      },
    });

    if (existing) {
      throw new AdminError("Ce parent est déjà rattaché à cet élève.", 409);
    }

    if (input.isPrimary) {
      await prisma!.parentStudent.updateMany({
        where: { studentId: studentProfileId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await prisma!.parentStudent.create({
      data: {
        parentUserId: input.parentUserId,
        studentId: studentProfileId,
        relationship: input.relationship,
        isPrimary: Boolean(input.isPrimary),
      },
    });

    const allChildrenLinks = await prisma!.parentStudent.findMany({
      where: { parentUserId: parent.id },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ isPrimary: "desc" }],
    });

    const childrenNames = allChildrenLinks.map(
      (link) => `${link.student.user.firstName} ${link.student.user.lastName}`,
    );

    let welcomeDelivery:
      | { delivered: boolean; reason?: string }
      | null = null;

    if (parent.phone) {
      const message = await buildParentWelcomeMessage({
        parentFirstName: parent.firstName,
        linkedStudentName: `${student.user.firstName} ${student.user.lastName}`,
        childrenNames,
      });

      welcomeDelivery = await whatsappService.sendText(parent.phone, message);
      if (!welcomeDelivery.delivered) {
        const templateDelivery = await whatsappService.sendTemplate(parent.phone, "hello_world", "en_US");
        welcomeDelivery = {
          ...templateDelivery,
          reason: templateDelivery.delivered
            ? "text_refused_template_sent"
            : welcomeDelivery.reason,
        };
      }
    }

    return {
      id: created.id,
      parentUserId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      parentPhone: parent.phone ?? "",
      studentId: student.userId,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      relationship: created.relationship,
      relationshipLabel: relationshipLabels[created.relationship],
      isPrimary: created.isPrimary,
      welcomeDelivery,
    };
  },

  async deleteParentStudentLink(linkId: string) {
    if (!isPrismaEnabled()) {
      const idx = devStore.parentStudentLinks.findIndex((l) => l.id === linkId);
      if (idx === -1) throw new AdminError("Liaison introuvable.", 404);
      devStore.parentStudentLinks.splice(idx, 1);
      return { id: linkId };
    }

    const prisma = getPrismaClient();
    const existing = await prisma!.parentStudent.findUnique({
      where: { id: linkId },
    });

    if (!existing) {
      throw new AdminError("Liaison introuvable.", 404);
    }

    await prisma!.parentStudent.delete({
      where: { id: linkId },
    });

    return { id: linkId };
  },

  async getRecommendationsStats() {
    if (!isPrismaEnabled()) {
      return {
        totals: {
          total: 0,
          studentRecommendations: 0,
          classRecommendations: 0,
          whatsappSent: 0,
          followThroughRate: 0,
        },
        byRiskLevel: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        timeline: [{ date: todayKey(), total: 0, whatsappSent: 0 }],
        topClasses: [],
      };
    }

    const prisma = getPrismaClient() as any;
    const [studentRecommendations, classRecommendations] = await Promise.all([
      prisma.aIAnalysis.findMany({
        where: { analysisType: AnalysisType.RECOMMENDATION },
        orderBy: { createdAt: "asc" },
      }),
      prisma.teacherRecommendation.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          class: true,
        },
      }),
    ]);

    const byRiskLevel = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const timelineMap = new Map<string, { date: string; total: number; whatsappSent: number }>();
    const topClassesMap = new Map<string, { classId: string; className: string; total: number; weightedRisk: number }>();
    let whatsappSent = 0;

    for (const item of studentRecommendations) {
      const output = (item.output as any) ?? {};
      const level = String(output.riskLevel ?? item.riskLevel ?? "medium").toLowerCase();
      if (level in byRiskLevel) {
        byRiskLevel[level as keyof typeof byRiskLevel] += 1;
      } else {
        byRiskLevel.medium += 1;
      }

      if (output.whatsappSent) {
        whatsappSent += 1;
      }

      const day = item.createdAt.toISOString().slice(0, 10);
      const bucket = timelineMap.get(day) ?? { date: day, total: 0, whatsappSent: 0 };
      bucket.total += 1;
      bucket.whatsappSent += output.whatsappSent ? 1 : 0;
      timelineMap.set(day, bucket);
    }

    for (const item of classRecommendations) {
      const level = String(item.riskLevel ?? "MEDIUM").toLowerCase();
      if (level in byRiskLevel) {
        byRiskLevel[level as keyof typeof byRiskLevel] += 1;
      } else {
        byRiskLevel.medium += 1;
      }

      const day = item.createdAt.toISOString().slice(0, 10);
      const bucket = timelineMap.get(day) ?? { date: day, total: 0, whatsappSent: 0 };
      bucket.total += 1;
      timelineMap.set(day, bucket);

      const label = item.class?.name ?? "Classe inconnue";
      const classBucket =
        topClassesMap.get(item.classId ?? label) ??
        { classId: item.classId ?? label, className: label, total: 0, weightedRisk: 0 };
      classBucket.total += 1;
      classBucket.weightedRisk += riskWeight(level);
      topClassesMap.set(item.classId ?? label, classBucket);
    }

    const total = studentRecommendations.length + classRecommendations.length;

    return {
      totals: {
        total,
        studentRecommendations: studentRecommendations.length,
        classRecommendations: classRecommendations.length,
        whatsappSent,
        followThroughRate: total > 0 ? Math.round((whatsappSent / total) * 100) : 0,
      },
      byRiskLevel,
      timeline:
        Array.from(timelineMap.values())
          .sort((left, right) => left.date.localeCompare(right.date))
          .slice(-10),
      topClasses: Array.from(topClassesMap.values())
        .sort((left, right) => right.weightedRisk - left.weightedRisk || right.total - left.total)
        .slice(0, 5)
        .map((item) => ({
          classId: item.classId,
          className: item.className,
          recommendationsCount: item.total,
          averageRiskScore: Number((item.weightedRisk / item.total).toFixed(2)),
        })),
    };
  },

  async generateClassReport(classId: string) {
    const [classRecord, gradebook, attendance, classSignals] = await Promise.all([
      schoolRepository.getClassStudents(classId),
      schoolRepository.getClassGradebook(classId),
      schoolRepository.getClassAttendance(classId),
      teacherService.getClassRiskSignals(classId),
    ]);

    if (!classRecord || !gradebook || !attendance) {
      throw new AdminError("Classe introuvable.", 404);
    }

    const studentSignals = (
      await Promise.all(
        classRecord.students.map(async (student) => {
          const signals = await teacherService.getStudentRiskSignals(student.id);
          return {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            averageGrade: signals.averageGrade,
            absenceRate: signals.absenceRate,
            lateCount: signals.lateCount,
            gradeEvolution: signals.gradeEvolution,
            subjectsAtRisk: signals.subjectsAtRisk,
            riskScore: signals.riskScore,
            riskLevel: signals.riskLevel,
          };
        }),
      )
    ).sort((left, right) => right.riskScore - left.riskScore);

    const topStudents = studentSignals.slice(0, 5);
    const classAverage = classSignals.classAverage;
    const fallbackRecommendations = [
      classSignals.absenceRate > 15
        ? "Planifier un suivi renforcé de l’assiduité avec les familles les plus concernées."
        : "Maintenir un suivi hebdomadaire de l’assiduité pour conserver la dynamique actuelle.",
      classSignals.studentsAtRisk > 0
        ? "Prévoir des remédiations ciblées pour les élèves en dessous de 10/20."
        : "Capitaliser sur les bonnes pratiques pédagogiques de la classe pour diffuser les progrès.",
      "Partager un point synthétique avec l’équipe pédagogique pour ajuster les actions du mois.",
    ];

    let summary = `${classRecord.name} compte ${classSignals.studentsCount} élève(s) avec une moyenne de classe de ${classAverage ?? "N/A"}/20 et un taux d’absence de ${classSignals.absenceRate}%.`;
    let recommendations = fallbackRecommendations;

    if (isAiAvailable()) {
      const prompt = `
Tu es un conseiller académique pour une administration scolaire.
Voici les données réelles de la classe ${classRecord.name}:
${JSON.stringify({
  classSignals,
  topStudents,
  gradebookRows: gradebook.rows,
  attendanceSessions: attendance.sessions,
})}

Règles obligatoires:
- Tu ne dois jamais créer, deviner ou compléter une information.
- Tu peux citer uniquement les notes, moyennes, tendances, absences, retards, classes, matières, élèves et données présentes dans les données réelles ci-dessus.
- Si une information n'est pas disponible, écris "non disponible" ou explique que les données ne sont pas encore enregistrées.
- Les recommandations, alertes, bulletins et rapports doivent être basés sur les valeurs de la base de données.

Réponds en JSON strict:
{
  "summary": string,
  "recommendations": string[]
}
      `;

      try {
        const parsed = await callAiJson<{ summary?: string; recommendations?: unknown[] }>(prompt);
        if (typeof parsed.summary === "string" && parsed.summary.trim()) {
          summary = parsed.summary.trim();
        }
        if (Array.isArray(parsed.recommendations) && parsed.recommendations.length) {
          recommendations = parsed.recommendations
            .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
            .slice(0, 5);
        }
      } catch {
        // Fallback volontaire pour garder le rapport disponible sans casser l'admin.
      }
    }

    return {
      classId,
      className: classRecord.name,
      generatedAt: new Date().toISOString(),
      riskLevel: classSignals.riskLevel,
      summary,
      classSignals,
      studentsAtRisk: topStudents,
      recommendations,
    };
  },

  async getAcademicActivity() {
    if (!isPrismaEnabled()) {
      return { recentGrades: [], recentAttendance: [] };
    }

    const prisma = getPrismaClient();
    const [grades, sessions] = await Promise.all([
      prisma!.grade.findMany({
        include: {
          student: { include: { user: true } },
          assessment: { include: { class: true, subject: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma!.attendanceSession.findMany({
        include: {
          class: true,
          subject: true,
          records: { include: { student: { include: { user: true } } } },
        },
        orderBy: { date: "desc" },
        take: 12,
      }),
    ]);

    return {
      recentGrades: grades.map((grade) => ({
        id: grade.id,
        studentName: `${grade.student.user.firstName} ${grade.student.user.lastName}`,
        className: grade.assessment.class.name,
        subjectName: grade.assessment.subject.name,
        assessmentTitle: grade.assessment.title,
        value: grade.value,
        updatedAt: grade.updatedAt.toISOString(),
      })),
      recentAttendance: sessions.map((session) => ({
        id: session.id,
        className: session.class.name,
        subjectName: session.subject?.name ?? "Matière non renseignée",
        date: session.date.toISOString().slice(0, 10),
        present: session.records.filter((record) => record.status === "PRESENT").length,
        absent: session.records.filter((record) => record.status === "ABSENT").length,
        late: session.records.filter((record) => record.status === "LATE").length,
        absentStudents: session.records
          .filter((record) => record.status === "ABSENT" || record.status === "LATE")
          .map((record) => ({
            studentName: `${record.student.user.firstName} ${record.student.user.lastName}`,
            status: record.status,
            reason: record.reason ?? "",
          })),
      })),
    };
  },

  async getAcademicStatistics() {
    if (!isPrismaEnabled()) {
      return { grades: [], teachers: [], lessons: [], recommendations: [] };
    }

    const prisma = getPrismaClient();
    const [grades, teachers, lessons, studentRecommendations, classRecommendations] = await Promise.all([
      prisma!.grade.findMany({
        include: {
          student: { include: { user: true, enrollments: { include: { class: true } } } },
          assessment: {
            include: {
              class: true,
              subject: true,
              lessonLinks: { include: { lesson: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma!.teacher.findMany({
        include: {
          user: true,
          assignments: { include: { class: true, subject: true } },
        },
        orderBy: { user: { lastName: "asc" } },
      }),
      prisma!.lesson.findMany({
        include: { class: true, subject: true },
        orderBy: [{ class: { name: "asc" } }, { orderIndex: "asc" }],
        take: 200,
      }),
      prisma!.teacherRecommendation.findMany({
        where: { scope: "STUDENT" },
        include: { student: { include: { user: true } }, class: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma!.teacherRecommendation.findMany({
        where: { scope: "CLASS" },
        include: { class: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const slots = await prisma!.timeSlot.findMany({
      include: { subject: true },
    });

    const slotKey = (classId: string, subjectId: string) => `${classId}:${subjectId}`;
    const slotMap = new Map<string, typeof slots>();
    for (const slot of slots) {
      const key = slotKey(slot.classId, slot.subjectId);
      slotMap.set(key, [...(slotMap.get(key) ?? []), slot]);
    }

    return {
      grades: grades.map((grade) => {
        const classEnrollment = grade.student.enrollments.find((enrollment) => enrollment.classId === grade.assessment.classId);
        const relatedSlots = slotMap.get(slotKey(grade.assessment.classId, grade.assessment.subjectId)) ?? [];
        return {
          id: grade.id,
          value: grade.value,
          comment: grade.comment ?? "",
          updatedAt: grade.updatedAt.toISOString(),
          studentId: grade.student.userId,
          studentName: `${grade.student.user.firstName} ${grade.student.user.lastName}`,
          classId: grade.assessment.classId,
          className: classEnrollment?.class.name ?? grade.assessment.class.name,
          subjectId: grade.assessment.subjectId,
          subjectName: grade.assessment.subject.name,
          teacherId: grade.assessment.teacherId,
          assessmentId: grade.assessmentId,
          assessmentTitle: grade.assessment.title,
          assessmentType: grade.assessment.type,
          assessmentDate: grade.assessment.date.toISOString().slice(0, 10),
          coefficient: grade.assessment.coefficient,
          lessons: grade.assessment.lessonLinks.map((link) => ({
            id: link.lesson.id,
            title: link.lesson.title,
            orderIndex: link.lesson.orderIndex,
          })),
          timeSlots: relatedSlots.map((slot) => ({
            id: slot.id,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room ?? "",
          })),
        };
      }),
      teachers: teachers.map((teacher) => ({
        id: teacher.userId,
        name: `${teacher.user.firstName} ${teacher.user.lastName}`,
        subjects: teacher.assignments.map((assignment) => ({
          classId: assignment.classId,
          className: assignment.class.name,
          subjectId: assignment.subjectId,
          subjectName: assignment.subject.name,
          coefficient: assignment.coefficient ?? assignment.subject.coefficientDefault,
        })),
      })),
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? "",
        objectives: lesson.objectives ?? "",
        orderIndex: lesson.orderIndex,
        classId: lesson.classId,
        className: lesson.class.name,
        subjectId: lesson.subjectId,
        subjectName: lesson.subject.name,
        teacherId: lesson.teacherId,
      })),
      recommendations: [
        ...studentRecommendations.map((item) => ({
          id: item.id,
          scope: "STUDENT",
          targetName: item.student ? `${item.student.user.firstName} ${item.student.user.lastName}` : "Élève",
          className: item.class?.name ?? "",
          riskLevel: item.riskLevel,
          summary: item.summary,
          createdAt: item.createdAt.toISOString(),
        })),
        ...classRecommendations.map((item) => ({
          id: item.id,
          scope: "CLASS",
          targetName: item.class?.name ?? "Classe",
          className: item.class?.name ?? "",
          riskLevel: item.riskLevel,
          summary: item.summary,
          createdAt: item.createdAt.toISOString(),
        })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  },

  async updateGrade(gradeId: string, input: { value: number; comment?: string }) {
    const grade = await schoolRepository.updateGrade(gradeId, input.value, input.comment);
    if (!grade) {
      throw new AdminError("Note introuvable.", 404);
    }
    return grade;
  },

  async listTimeSlots(classId?: string) {
    return schoolRepository.listTimeSlots(classId ? { classId } : undefined);
  },

  async createTimeSlot(input: {
    classId: string;
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    try {
      return await schoolRepository.createTimeSlot(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Création impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteTimeSlot(slotId: string) {
    try {
      return await schoolRepository.deleteTimeSlot(slotId);
    } catch {
      throw new AdminError("Créneau introuvable.", 404);
    }
  },

  async cancelTimeSlot(input: { slotId: string; date: string; cancelledBy: string; reason: string }) {
    if (!input.reason.trim()) {
      throw new AdminError("La justification est obligatoire.", 400);
    }
    try {
      return await schoolRepository.cancelTimeSlot(input);
    } catch {
      throw new AdminError("Créneau introuvable ou annulation impossible.", 404);
    }
  },

  async listEnrollments(classId?: string) {
    return schoolRepository.listEnrollments(classId);
  },

  async createEnrollment(input: { studentId: string; classId: string }) {
    try {
      return await schoolRepository.createEnrollment(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inscription impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteEnrollment(enrollmentId: string) {
    try {
      return await schoolRepository.deleteEnrollment(enrollmentId);
    } catch {
      throw new AdminError("Inscription introuvable.", 404);
    }
  },

  async createAssignment(input: { teacherId: string; classId: string; subjectId: string; coefficient?: number }) {
    try {
      return await schoolRepository.createAssignment(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Affectation impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteAssignment(assignmentId: string) {
    try {
      return await schoolRepository.deleteAssignment(assignmentId);
    } catch {
      throw new AdminError("Affectation introuvable.", 404);
    }
  },
};
