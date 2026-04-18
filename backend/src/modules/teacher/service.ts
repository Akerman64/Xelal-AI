import { AnalysisType, RiskLevel } from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { devStore } from "../core/dev-store";
import { notificationsService } from "../notifications/service";
import { schoolRepository } from "../core/school-repository";

const scheduleTemplate = [
  { day: "Lundi", startTime: "08:00", endTime: "10:00", room: "Salle A1" },
  { day: "Lundi", startTime: "10:30", endTime: "12:30", room: "Salle A1" },
  { day: "Mardi", startTime: "08:00", endTime: "10:00", room: "Salle B2" },
  { day: "Mercredi", startTime: "14:00", endTime: "16:00", room: "Salle B2" },
  { day: "Jeudi", startTime: "08:30", endTime: "10:30", room: "Salle A3" },
  { day: "Vendredi", startTime: "11:00", endTime: "13:00", room: "Salle A3" },
];

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

function buildLessonId(index: number, classId: string, subjectId: string) {
  return `lesson_${classId}_${subjectId}_${index}`;
}

async function buildTeacherSchedule(teacherId: string) {
  if (!isPrismaEnabled()) {
    const classes = devStore.classes.filter((item) => item.teacherIds.includes(teacherId));
    const lessons = classes.flatMap((classRecord, classIndex) =>
      devStore.subjects.slice(0, 2).map((subject, subjectIndex) => {
        const template = scheduleTemplate[(classIndex * 2 + subjectIndex) % scheduleTemplate.length];
        return {
          id: buildLessonId(classIndex * 10 + subjectIndex, classRecord.id, subject.id),
          classId: classRecord.id,
          className: classRecord.name,
          subjectId: subject.id,
          subjectName: subject.name,
          ...template,
        };
      }),
    );

    return {
      weeklySchedule: lessons,
      upcomingLessons: lessons.slice(0, 3),
    };
  }

  const prisma = getPrismaClient();
  const assignments = await prisma!.teacherAssignment.findMany({
    where: { teacherId },
    include: {
      class: true,
      subject: true,
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  const lessons = assignments.map((assignment, index) => {
    const template = scheduleTemplate[index % scheduleTemplate.length];
    return {
      id: buildLessonId(index, assignment.classId, assignment.subjectId),
      classId: assignment.classId,
      className: assignment.class.name,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      ...template,
    };
  });

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
  const assignments = await prisma!.teacherAssignment.findMany({
    where: { teacherId },
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

  async listStudentRecommendations(studentId: string) {
    if (!isPrismaEnabled()) {
      return [];
    }

    const prisma = getPrismaClient();
    const items = await prisma!.aIAnalysis.findMany({
      where: {
        studentId,
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
    const created = await prisma!.aIAnalysis.create({
      data: {
        studentId: input.studentId,
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
      prompt: input.prompt ?? "",
      createdAt: created.createdAt.toISOString(),
    };
  },

  async sendWhatsAppToStudentParents(input: {
    studentId: string;
    teacherId: string;
    message: string;
  }) {
    const report = await schoolRepository.getStudentGrades(input.studentId);
    if (!report) {
      throw new TeacherError("Eleve introuvable.", 404);
    }

    const fullMessage = [
      `Message de l'enseignant concernant ${report.student.firstName} ${report.student.lastName}:`,
      input.message,
    ].join("\n\n");

    return notificationsService.deliverCustomMessageToStudentParents(
      input.studentId,
      fullMessage,
    );
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
      prompt: created.prompt ?? "",
      createdAt: created.createdAt.toISOString(),
    };
  },
};
