import {
  AppRole,
  AppUserStatus,
  createInvitationCode,
  publicInvitation,
  publicUser,
} from "../core/dev-store";
import { authAdminRepository } from "../core/auth-admin-repository";
import { schoolRepository } from "../core/school-repository";
import { teacherService } from "../teacher/service";
import { AnalysisType } from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { whatsappService } from "../whatsapp/service";

export class AdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const inSevenDays = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || env.openAiApiKey;
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

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
    email: string;
    phone?: string;
    role: AppRole;
    classId?: string;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingUser = await authAdminRepository.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AdminError("Un utilisateur avec cet email existe deja.", 409);
    }

    const user = await authAdminRepository.createPendingUser({
      schoolId: input.schoolId,
      classId: input.classId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
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

    let whatsappDelivery: { delivered: boolean; reason?: string } | null = null;
    if (user.phone) {
      const roleLabel = user.role === "TEACHER" ? "enseignant(e)" : user.role.toLowerCase();
      const message = [
        `Bonjour ${user.firstName},`,
        ``,
        `Vous avez été invité(e) sur Xelal AI en tant qu'${roleLabel}.`,
        ``,
        `Votre code d'activation : ${invitation.code}`,
        `Email de connexion : ${user.email}`,
        ``,
        `Ce code expire dans 7 jours. Connectez-vous sur l'application et entrez ce code pour activer votre compte.`,
      ].join("\n");

      whatsappDelivery = await whatsappService.sendText(user.phone, message);
    }

    return {
      user: publicUser(user),
      invitation: {
        ...publicInvitation(invitation),
        code: invitation.code,
      },
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
      return [
        {
          id: "memory_link_parent_1_student_1",
          parentUserId: "parent_1",
          parentName: "Fatou Diop",
          parentPhone: "+221770000001",
          studentId: "student_1",
          studentName: "Moussa Diop",
          relationship: "MOTHER",
          relationshipLabel: relationshipLabels.MOTHER,
          isPrimary: true,
        },
      ];
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
      if (input.parentUserId !== "parent_1" || input.studentId !== "student_1") {
        throw new AdminError("Mode mémoire limité pour cette liaison.", 400);
      }

      return {
        id: "memory_link_parent_1_student_1",
        parentUserId: "parent_1",
        parentName: "Fatou Diop",
        parentPhone: "+221770000001",
        studentId: "student_1",
        studentName: "Moussa Diop",
        relationship: input.relationship,
        relationshipLabel: relationshipLabels[input.relationship],
        isPrimary: input.isPrimary ?? true,
      };
    }

    const prisma = getPrismaClient();
    const [parent, student] = await Promise.all([
      prisma!.user.findUnique({ where: { id: input.parentUserId } }),
      prisma!.student.findUnique({
        where: { id: input.studentId },
        include: { user: true },
      }),
    ]);

    if (!parent || parent.role !== "PARENT") {
      throw new AdminError("Parent introuvable.", 404);
    }

    if (!student) {
      throw new AdminError("Élève introuvable.", 404);
    }

    const existing = await prisma!.parentStudent.findFirst({
      where: {
        parentUserId: input.parentUserId,
        studentId: input.studentId,
      },
    });

    if (existing) {
      throw new AdminError("Ce parent est déjà rattaché à cet élève.", 409);
    }

    if (input.isPrimary) {
      await prisma!.parentStudent.updateMany({
        where: { studentId: input.studentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await prisma!.parentStudent.create({
      data: {
        parentUserId: input.parentUserId,
        studentId: input.studentId,
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
      const message = [
        `Bonjour ${parent.firstName}, vous êtes désormais enregistré(e) sur Xelal AI.`,
        `Vous pouvez suivre: ${childrenNames.join(", ")}.`,
        "Vous pouvez maintenant écrire sur WhatsApp: notes, absences, emploi du temps, conseils.",
      ].join("\n");

      welcomeDelivery = await whatsappService.sendText(parent.phone, message);
    }

    return {
      id: created.id,
      parentUserId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      parentPhone: parent.phone ?? "",
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      relationship: created.relationship,
      relationshipLabel: relationshipLabels[created.relationship],
      isPrimary: created.isPrimary,
      welcomeDelivery,
    };
  },

  async deleteParentStudentLink(linkId: string) {
    if (!isPrismaEnabled()) {
      if (linkId !== "memory_link_parent_1_student_1") {
        throw new AdminError("Liaison introuvable.", 404);
      }
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

    const ai = getAI();
    if (ai) {
      const prompt = `
Tu es un conseiller académique pour une administration scolaire.
Voici les données réelles de la classe ${classRecord.name}:
${JSON.stringify({
  classSignals,
  topStudents,
  gradebookRows: gradebook.rows,
  attendanceSessions: attendance.sessions,
})}

Réponds en JSON strict:
{
  "summary": string,
  "recommendations": string[]
}
      `;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
        const parsed = JSON.parse(response.text || "{}");
        if (typeof parsed.summary === "string" && parsed.summary.trim()) {
          summary = parsed.summary.trim();
        }
        if (Array.isArray(parsed.recommendations) && parsed.recommendations.length) {
          recommendations = parsed.recommendations
            .filter((item: unknown) => typeof item === "string" && item.trim())
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

  async createAssignment(input: { teacherId: string; classId: string; subjectId: string }) {
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
