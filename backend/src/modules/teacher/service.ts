import { AnalysisType, RiskLevel } from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { devStore } from "../core/dev-store";
import { notificationsService } from "../notifications/service";
import { schoolRepository } from "../core/school-repository";
import { messagesService } from "./messages-service";

export class TeacherError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toRiskLevel(value?: string) {
  if (!value) return "MEDIUM";
  const candidate = value.toUpperCase();
  if (candidate === "LOW" || candidate === "MEDIUM" || candidate === "HIGH") {
    return candidate;
  }
  return "MEDIUM";
}

function average(values: number[]) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function resolveRiskLevel(score: number) {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

async function resolveTeacherProfileId(userId: string) {
  if (!isPrismaEnabled()) return userId;

  const prisma = getPrismaClient();
  const teacher = await prisma!.teacher.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!teacher) {
    throw new TeacherError("Profil enseignant introuvable.", 404);
  }

  return teacher.id;
}

async function resolveStudentProfileId(studentId: string) {
  if (!isPrismaEnabled()) return studentId;

  const prisma = getPrismaClient();
  const student = await prisma!.student.findFirst({
    where: {
      OR: [{ id: studentId }, { userId: studentId }],
    },
    select: { id: true },
  });

  if (!student) {
    throw new TeacherError("Élève introuvable.", 404);
  }

  return student.id;
}

async function resolveStudentClassId(studentId: string) {
  if (!isPrismaEnabled()) {
    return devStore.users.find((user) => user.id === studentId)?.classId ?? null;
  }

  const prisma = getPrismaClient();
  const studentProfileId = await resolveStudentProfileId(studentId);
  const enrollment = await prisma!.studentEnrollment.findFirst({
    where: {
      studentId: studentProfileId,
      status: "ACTIVE",
    },
    orderBy: {
      academicYearId: "desc",
    },
  });

  return enrollment?.classId ?? null;
}

async function computeStudentRiskSignals(studentId: string) {
  const [grades, attendance] = await Promise.all([
    schoolRepository.getStudentGrades(studentId),
    schoolRepository.getStudentAttendance(studentId),
  ]);

  if (!grades || !attendance) {
    throw new TeacherError("Élève introuvable.", 404);
  }

  const classId = await resolveStudentClassId(studentId);
  const classGradebook = classId ? await schoolRepository.getClassGradebook(classId) : null;
  const classAverage = classGradebook
    ? average(classGradebook.rows.map((row) => row.average).filter((value): value is number => value !== null))
    : null;

  const totalSessions =
    attendance.summary.present + attendance.summary.absent + attendance.summary.late;
  const absenceRate =
    totalSessions > 0 ? Number(((attendance.summary.absent / totalSessions) * 100).toFixed(1)) : 0;

  const orderedGrades = [...grades.grades].sort((left, right) =>
    String(left.date ?? "").localeCompare(String(right.date ?? "")),
  );
  const earlyAvg = average(orderedGrades.slice(0, 3).map((item) => item.value));
  const recentAvg = average(orderedGrades.slice(-3).map((item) => item.value));
  const gradeEvolution =
    earlyAvg !== null && recentAvg !== null ? Number((recentAvg - earlyAvg).toFixed(2)) : 0;

  const subjectsAtRisk = grades.subjectSummaries
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => (item.average ?? 0) < 10)
    .map((item) => item.subject);

  const score =
    Math.min(absenceRate, 40) * 0.8 +
    Math.max(0, 10 - (grades.summary.generalAverage ?? 10)) * 4 +
    Math.max(0, -gradeEvolution) * 6 +
    attendance.summary.late * 3 +
    subjectsAtRisk.length * 5;

  return {
    studentId,
    classId,
    averageGrade: grades.summary.generalAverage,
    classAverage,
    totalSessions,
    absenceRate,
    absentCount: attendance.summary.absent,
    lateCount: attendance.summary.late,
    gradeEvolution,
    subjectsAtRisk,
    riskScore: Number(Math.min(score, 100).toFixed(1)),
    riskLevel: resolveRiskLevel(score),
  };
}

async function computeClassRiskSignals(classId: string) {
  const [gradebook, attendance] = await Promise.all([
    schoolRepository.getClassGradebook(classId),
    schoolRepository.getClassAttendance(classId),
  ]);

  if (!gradebook || !attendance) {
    throw new TeacherError("Classe introuvable.", 404);
  }

  const rows = gradebook.rows;
  const classAverage = average(
    rows.map((row) => row.average).filter((value): value is number => value !== null),
  );

  const attendanceSessions = attendance.sessions.length;
  const totalAbsences = attendance.sessions.reduce((sum, session) => sum + session.summary.absent, 0);
  const totalLate = attendance.sessions.reduce((sum, session) => sum + session.summary.late, 0);
  const totalPresent = attendance.sessions.reduce((sum, session) => sum + session.summary.present, 0);
  const totalEvents = totalAbsences + totalLate + totalPresent;
  const absenceRate = totalEvents > 0 ? Number(((totalAbsences / totalEvents) * 100).toFixed(1)) : 0;
  const lateRate = totalEvents > 0 ? Number(((totalLate / totalEvents) * 100).toFixed(1)) : 0;

  const atRiskStudents = rows.filter((row) => row.average !== null && row.average < 10).length;

  const score =
    Math.min(absenceRate, 40) * 0.7 +
    Math.min(lateRate, 30) * 0.6 +
    Math.max(0, 10 - (classAverage ?? 10)) * 5 +
    atRiskStudents * 6;

  return {
    classId,
    classAverage,
    attendanceSessions,
    totalAbsences,
    totalLate,
    absenceRate,
    lateRate,
    studentsCount: rows.length,
    studentsAtRisk: atRiskStudents,
    riskScore: Number(Math.min(score, 100).toFixed(1)),
    riskLevel: resolveRiskLevel(score),
  };
}

async function buildTeacherSchedule(teacherId: string) {
  if (!isPrismaEnabled()) {
    const slots = devStore.timeSlots.filter((s) => s.teacherId === teacherId);
    const lessons = slots.map((slot) => {
      const classRecord = devStore.classes.find((c) => c.id === slot.classId);
      const subject = devStore.subjects.find((s) => s.id === slot.subjectId);
      return {
        id: slot.id,
        classId: slot.classId,
        className: classRecord?.name ?? slot.classId,
        subjectId: slot.subjectId,
        subjectName: subject?.name ?? slot.subjectId,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room ?? "",
      };
    });

    const dayOrder = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    lessons.sort((a, b) => {
      const di = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      return di !== 0 ? di : a.startTime.localeCompare(b.startTime);
    });

    return {
      weeklySchedule: lessons,
      upcomingLessons: lessons.slice(0, 3),
    };
  }

  const slots = await schoolRepository.listTimeSlots({ teacherId });
  const lessons = slots.map((slot) => ({
    id: slot.id,
    classId: slot.classId,
    className: slot.className,
    subjectId: slot.subjectId,
    subjectName: slot.subjectName,
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room ?? "",
  }));

  return {
    weeklySchedule: lessons,
    upcomingLessons: lessons.slice(0, 3),
  };
}

async function buildQuickContacts(teacherId: string) {
  if (!isPrismaEnabled()) {
    return [
      {
        parentName: "Fatou Diop",
        studentName: "Moussa Diop",
        phone: "+33748407869",
        lastMessage: "Bonjour, je souhaite le détail des notes de cette semaine.",
      },
    ];
  }

  const prisma = getPrismaClient();
  const teacherProfileId = await resolveTeacherProfileId(teacherId);
  const assignments = await prisma!.teacherAssignment.findMany({
    where: { teacherId: teacherProfileId },
    include: {
      class: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              student: {
                include: {
                  user: true,
                  parentLinks: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const studentIds = Array.from(
    new Set(
      assignments.flatMap((assignment) =>
        assignment.class.enrollments.map((enrollment) => enrollment.student.id),
      ),
    ),
  );

  const parentLinks = await prisma!.parentStudent.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  const parentIds = Array.from(new Set(parentLinks.map((link) => link.parentUserId)));
  const parents = await prisma!.user.findMany({
    where: { id: { in: parentIds } },
  });
  const parentMap = new Map(parents.map((parent) => [parent.id, parent]));

  return parentLinks
    .map((link) => {
      const parent = parentMap.get(link.parentUserId);
      if (!parent?.phone) return null;

      return {
        parentName: `${parent.firstName} ${parent.lastName}`,
        studentName: `${link.student.user.firstName} ${link.student.user.lastName}`,
        phone: parent.phone,
        lastMessage: "Envoyer un message WhatsApp direct",
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

export const teacherService = {
  async getDashboard(teacherId: string) {
    const [schedule, contacts] = await Promise.all([
      buildTeacherSchedule(teacherId),
      buildQuickContacts(teacherId),
    ]);

    return {
      upcomingLessons: schedule.upcomingLessons,
      weeklySchedule: schedule.weeklySchedule,
      quickContacts: contacts,
    };
  },

  async getStudentRiskSignals(studentId: string) {
    return computeStudentRiskSignals(studentId);
  },

  async getClassRiskSignals(classId: string) {
    return computeClassRiskSignals(classId);
  },

  async getTeacherClasses(teacherId: string) {
    if (!isPrismaEnabled()) {
      const assignments = devStore.teacherAssignments.filter(
        (a) => a.teacherId === teacherId,
      );
      const classIds = Array.from(new Set(assignments.map((a) => a.classId)));

      return devStore.classes
        .filter((c) => classIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          schoolId: c.schoolId,
          academicYearId: c.academicYearId,
          name: c.name,
          level: c.level,
          studentsCount: c.studentIds.length,
          teachersCount: c.teacherIds.length,
        }));
    }

    const prisma = getPrismaClient();
    const teacherProfileId = await resolveTeacherProfileId(teacherId);
    const assignments = await prisma!.teacherAssignment.findMany({
      where: { teacherId: teacherProfileId },
      include: {
        class: {
          include: {
            enrollments: { where: { status: "ACTIVE" } },
            assignments: true,
          },
        },
      },
    });

    const uniqueClasses = new Map<string, object>();
    for (const assignment of assignments) {
      if (!uniqueClasses.has(assignment.classId)) {
        uniqueClasses.set(assignment.classId, {
          id: assignment.class.id,
          schoolId: assignment.class.schoolId,
          academicYearId: assignment.class.academicYearId,
          name: assignment.class.name,
          level: assignment.class.level,
          studentsCount: assignment.class.enrollments.length,
          teachersCount: new Set(assignment.class.assignments.map((a) => a.teacherId)).size,
        });
      }
    }

    return Array.from(uniqueClasses.values());
  },

  async getTeacherAssignments(teacherId: string) {
    if (!isPrismaEnabled()) {
      return devStore.teacherAssignments
        .filter((assignment) => assignment.teacherId === teacherId)
        .map((assignment) => {
          const classRecord = devStore.classes.find((item) => item.id === assignment.classId);
          const subject = devStore.subjects.find((item) => item.id === assignment.subjectId);
          return {
            classId: assignment.classId,
            className: classRecord?.name ?? assignment.classId,
            subjectId: assignment.subjectId,
            subjectName: subject?.name ?? assignment.subjectId,
          };
        });
    }

    const prisma = getPrismaClient();
    const teacherProfileId = await resolveTeacherProfileId(teacherId);
    const rows = await prisma!.teacherAssignment.findMany({
      where: { teacherId: teacherProfileId },
      include: { class: true, subject: true },
      orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
    });

    return rows.map((row) => ({
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
    }));
  },

  async listLessons(teacherId: string) {
    if (!isPrismaEnabled()) return [];

    const prisma = getPrismaClient() as any;
    const rows = await prisma.lesson.findMany({
      where: { teacherId },
      include: { class: true, subject: true },
      orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }, { orderIndex: "asc" }],
    });

    return rows.map((row: any) => ({
      id: row.id,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      title: row.title,
      description: row.description ?? "",
      objectives: row.objectives ?? "",
      orderIndex: row.orderIndex,
      createdAt: row.createdAt.toISOString(),
    }));
  },

  async createLesson(input: {
    teacherId: string;
    classId: string;
    subjectId: string;
    title: string;
    description?: string;
    objectives?: string;
    orderIndex?: number;
  }) {
    const assignments = await this.getTeacherAssignments(input.teacherId);
    const allowed = assignments.some(
      (assignment) => assignment.classId === input.classId && assignment.subjectId === input.subjectId,
    );
    if (!allowed) {
      throw new TeacherError("Vous ne pouvez créer des leçons que pour vos matières affectées.", 403);
    }

    if (!isPrismaEnabled()) {
      return {
        id: `lesson_${Date.now()}`,
        classId: input.classId,
        subjectId: input.subjectId,
        title: input.title,
        description: input.description ?? "",
        objectives: input.objectives ?? "",
        orderIndex: input.orderIndex ?? 0,
        createdAt: new Date().toISOString(),
      };
    }

    const prisma = getPrismaClient() as any;
    const created = await prisma.lesson.create({
      data: {
        teacherId: input.teacherId,
        classId: input.classId,
        subjectId: input.subjectId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        objectives: input.objectives?.trim() || null,
        orderIndex: input.orderIndex ?? 0,
      },
      include: { class: true, subject: true },
    });

    return {
      id: created.id,
      classId: created.classId,
      className: created.class.name,
      subjectId: created.subjectId,
      subjectName: created.subject.name,
      title: created.title,
      description: created.description ?? "",
      objectives: created.objectives ?? "",
      orderIndex: created.orderIndex,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async cancelTimeSlot(input: { teacherId: string; slotId: string; date: string; reason: string }) {
    if (!input.reason.trim()) {
      throw new TeacherError("La justification est obligatoire.", 400);
    }
    if (isPrismaEnabled()) {
      const prisma = getPrismaClient();
      const slot = await prisma!.timeSlot.findUnique({ where: { id: input.slotId } });
      if (!slot || slot.teacherId !== input.teacherId) {
        throw new TeacherError("Créneau introuvable pour cet enseignant.", 404);
      }
    }
    return schoolRepository.cancelTimeSlot({
      slotId: input.slotId,
      date: input.date,
      reason: input.reason,
      cancelledBy: input.teacherId,
    });
  },

  async listStudentRecommendations(studentId: string) {
    if (!isPrismaEnabled()) {
      return [];
    }

    const prisma = getPrismaClient();
    const studentProfileId = await resolveStudentProfileId(studentId);
    const items = await prisma!.aIAnalysis.findMany({
      where: {
        studentId: studentProfileId,
        analysisType: AnalysisType.RECOMMENDATION,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return items.map((item) => {
      const output = item.output as any;
      const snapshot = item.inputSnapshot as any;
      return {
        id: item.id,
        studentId: item.studentId,
        scope: "student",
        summary: output.summary ?? "",
        riskLevel: String(output.riskLevel ?? item.riskLevel ?? "MEDIUM").toLowerCase(),
        recommendations: Array.isArray(output.recommendations) ? output.recommendations : [],
        explanation: output.explanation ?? "",
        whatsappMessage: output.whatsappMessage ?? "",
        whatsappSent: Boolean(output.whatsappSent),
        whatsappSentAt: output.whatsappSentAt ?? "",
        prompt: snapshot.prompt ?? "",
        createdAt: item.createdAt.toISOString(),
      };
    });
  },

  async saveStudentRecommendation(input: {
    studentId: string;
    teacherId: string;
    summary: string;
    riskLevel?: string;
    recommendations: string[];
    explanation?: string;
    prompt?: string;
    whatsappMessage?: string;
  }) {
    if (!isPrismaEnabled()) {
      return {
        id: `memory_${Date.now()}`,
        scope: "student",
        ...input,
        createdAt: new Date().toISOString(),
      };
    }

    const prisma = getPrismaClient();
    const studentProfileId = await resolveStudentProfileId(input.studentId);
    const created = await prisma!.aIAnalysis.create({
      data: {
        studentId: studentProfileId,
        analysisType: AnalysisType.RECOMMENDATION,
        riskLevel: toRiskLevel(input.riskLevel) as RiskLevel,
        inputSnapshot: {
          teacherId: input.teacherId,
          prompt: input.prompt ?? "",
          source: "teacher_dashboard",
        },
        output: {
          summary: input.summary,
          riskLevel: input.riskLevel ?? "medium",
          recommendations: input.recommendations,
          explanation: input.explanation ?? "",
          whatsappMessage: input.whatsappMessage ?? "",
          whatsappSent: false,
          whatsappSentAt: null,
        },
      },
    });

    return {
      id: created.id,
      studentId: input.studentId,
      scope: "student",
      summary: input.summary,
      riskLevel: (input.riskLevel ?? "medium").toLowerCase(),
      recommendations: input.recommendations,
      explanation: input.explanation ?? "",
      whatsappMessage: input.whatsappMessage ?? "",
      whatsappSent: false,
      whatsappSentAt: "",
      prompt: input.prompt ?? "",
      createdAt: created.createdAt.toISOString(),
    };
  },

  async sendWhatsAppToStudentParents(input: {
    studentId: string;
    teacherId: string;
    message: string;
    recommendationId?: string;
  }) {
    const report = await schoolRepository.getStudentGrades(input.studentId);
    if (!report) {
      throw new TeacherError("Eleve introuvable.", 404);
    }

    const fullMessage = [
      `Message de l'enseignant concernant ${report.student.firstName} ${report.student.lastName}:`,
      input.message,
    ].join("\n\n");

    const delivery = await notificationsService.deliverCustomMessageToStudentParents(
      input.studentId,
      fullMessage,
    );

    if (delivery.sent > 0) {
      try {
        await messagesService.sendMessage(input.teacherId, input.studentId, input.message);
      } catch {
        // On ne bloque pas l'envoi WhatsApp si l'archivage du message échoue.
      }
    }

    if (input.recommendationId && isPrismaEnabled()) {
      const prisma = getPrismaClient();
      const existing = await prisma!.aIAnalysis.findUnique({
        where: { id: input.recommendationId },
      });

      if (existing) {
        const output = (existing.output as any) ?? {};
        await prisma!.aIAnalysis.update({
          where: { id: input.recommendationId },
          data: {
            output: {
              ...output,
              whatsappMessage: input.message,
              whatsappSent: delivery.sent > 0,
              whatsappSentAt: delivery.sent > 0 ? new Date().toISOString() : null,
            },
          },
        });
      }
    }

    return delivery;
  },

  async listClassRecommendations(classId: string) {
    if (!isPrismaEnabled()) {
      return [];
    }

    const prisma = getPrismaClient() as any;
    const items = await prisma.teacherRecommendation.findMany({
      where: {
        classId,
        scope: "CLASS",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return items.map((item) => ({
      id: item.id,
      classId,
      scope: "class",
      summary: item.summary,
      riskLevel: String(item.riskLevel ?? "MEDIUM").toLowerCase(),
      recommendations: Array.isArray(item.recommendations) ? item.recommendations : [],
      explanation: item.explanation ?? "",
      whatsappMessage: "",
      whatsappSent: false,
      whatsappSentAt: "",
      prompt: item.prompt ?? "",
      createdAt: item.createdAt.toISOString(),
    }));
  },

  async saveClassRecommendation(input: {
    classId: string;
    teacherId: string;
    summary: string;
    riskLevel?: string;
    recommendations: string[];
    explanation?: string;
    prompt?: string;
  }) {
    if (!isPrismaEnabled()) {
      return {
        id: `memory_class_${Date.now()}`,
        classId: input.classId,
        scope: "class",
        summary: input.summary,
        riskLevel: (input.riskLevel ?? "medium").toLowerCase(),
        recommendations: input.recommendations,
        explanation: input.explanation ?? "",
        prompt: input.prompt ?? "",
        createdAt: new Date().toISOString(),
      };
    }

    const prisma = getPrismaClient() as any;
    const created = await prisma.teacherRecommendation.create({
      data: {
        teacherId: input.teacherId,
        classId: input.classId,
        scope: "CLASS",
        riskLevel: toRiskLevel(input.riskLevel) as RiskLevel,
        summary: input.summary,
        explanation: input.explanation ?? "",
        prompt: input.prompt ?? "",
        recommendations: input.recommendations,
      },
    });

    return {
      id: created.id,
      classId: input.classId,
      scope: "class",
      summary: created.summary,
      riskLevel: String(created.riskLevel ?? "MEDIUM").toLowerCase(),
      recommendations: Array.isArray(created.recommendations) ? created.recommendations : [],
      explanation: created.explanation ?? "",
      whatsappMessage: "",
      whatsappSent: false,
      whatsappSentAt: "",
      prompt: created.prompt ?? "",
      createdAt: created.createdAt.toISOString(),
    };
  },
};
