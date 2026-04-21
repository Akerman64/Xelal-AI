import { callAiJson, isAiAvailable } from "../../lib/ai";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { devStore } from "../core/dev-store";
import { schoolRepository } from "../core/school-repository";

export class StudentError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const average = (values: number[]) =>
  values.length
    ? Number((values.reduce((sum, current) => sum + current, 0) / values.length).toFixed(2))
    : null;

function buildFallbackStudentAnswer(input: {
  studentFirstName: string;
  question: string;
  generalAverage: number | null;
  weakestSubject?: string;
  absentCount: number;
  lateCount: number;
}) {
  const lower = input.question.toLowerCase();

  if (lower.includes("moyenne")) {
    return `Ta moyenne actuelle est de ${input.generalAverage ?? "N/A"}/20. Continue avec un rythme de travail régulier cette semaine.`;
  }

  if (lower.includes("math")) {
    return input.weakestSubject?.toLowerCase().includes("math")
      ? "Les mathématiques font partie de tes priorités. Reprends les exercices corrigés, puis entraîne-toi 20 à 30 minutes par jour."
      : "En mathématiques, essaie de refaire les derniers exercices vus en classe et note ce que tu n’as pas compris pour demander une explication ciblée.";
  }

  if (lower.includes("absence") || lower.includes("retard")) {
    return `Tu as actuellement ${input.absentCount} absence(s) et ${input.lateCount} retard(s). La régularité en classe peut améliorer directement ta progression.`;
  }

  return [
    `Bonjour ${input.studentFirstName}, voici un conseil personnalisé.`,
    input.weakestSubject
      ? `Concentre-toi d'abord sur ${input.weakestSubject}, qui semble être ta matière la plus fragile en ce moment.`
      : "Continue à consolider les bases dans les matières les plus importantes.",
    "Travaille par petites séances régulières, puis vérifie avec ton enseignant les points encore flous.",
  ].join(" ");
}

export const studentService = {
  async askTutor(studentId: string, question: string) {
    const [grades, attendance] = await Promise.all([
      schoolRepository.getStudentGrades(studentId),
      schoolRepository.getStudentAttendance(studentId),
    ]);

    if (!grades || !attendance) {
      throw new StudentError("Élève introuvable.", 404);
    }

    const weakestSubject = grades.subjectSummaries
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => (left.average ?? 0) - (right.average ?? 0))[0];

    const context = {
      student: `${grades.student.firstName} ${grades.student.lastName}`,
      generalAverage: grades.summary.generalAverage,
      gradesCount: grades.summary.gradesCount,
      subjectSummaries: grades.subjectSummaries,
      latestGrades: grades.grades.slice(0, 6),
      attendanceSummary: attendance.summary,
      latestAttendance: attendance.records.slice(0, 6),
    };

    if (!isAiAvailable()) {
      return {
        answer: buildFallbackStudentAnswer({
          studentFirstName: grades.student.firstName,
          question,
          generalAverage: grades.summary.generalAverage,
          weakestSubject: weakestSubject?.subject,
          absentCount: attendance.summary.absent,
          lateCount: attendance.summary.late,
        }),
        source: "fallback",
        generatedAt: new Date().toISOString(),
      };
    }

    const prompt = `
      Tu es un tuteur pédagogique bienveillant pour un élève.
      Contexte réel de l'élève: ${JSON.stringify(context)}
      Question de l'élève: ${question}

      Règles obligatoires:
      - Tu ne dois jamais créer, deviner, compléter ou arrondir une information.
      - Tu peux citer uniquement les notes, moyennes, matières, absences, retards et dates présents dans le contexte réel.
      - Si une donnée n'est pas présente dans le contexte, dis qu'elle n'est pas encore enregistrée.
      - Tu ne dois pas dire qu'une performance, une assiduité ou une tendance est bonne, mauvaise, en hausse ou en baisse sans valeur réelle du contexte.

      Réponds en français simple, avec:
      1. une réponse claire et motivante
      2. 2 ou 3 actions concrètes à faire
      3. aucune invention si l'information n'est pas dans le contexte

      Réponds en JSON strict:
      {
        "answer": string
      }
    `;

    try {
      const parsed = await callAiJson<{ answer?: string }>(prompt);
      return {
        answer:
          typeof parsed.answer === "string" && parsed.answer.trim()
            ? parsed.answer
            : buildFallbackStudentAnswer({
                studentFirstName: grades.student.firstName,
                question,
                generalAverage: grades.summary.generalAverage,
                weakestSubject: weakestSubject?.subject,
                absentCount: attendance.summary.absent,
                lateCount: attendance.summary.late,
              }),
        source: "ai",
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        answer: buildFallbackStudentAnswer({
          studentFirstName: grades.student.firstName,
          question,
          generalAverage: grades.summary.generalAverage,
          weakestSubject: weakestSubject?.subject,
          absentCount: attendance.summary.absent,
          lateCount: attendance.summary.late,
        }),
        source: "fallback",
        generatedAt: new Date().toISOString(),
      };
    }
  },

  async getSchedule(studentId: string) {
    if (!isPrismaEnabled()) {
      // En dev-store : chercher la classId de l'élève
      const user = devStore.users.find((u) => u.id === studentId);
      const classId = user?.classId;
      if (!classId) return [];

      const slots = devStore.timeSlots.filter((s) => s.classId === classId);
      const dayOrder = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      slots.sort((a, b) => {
        const di = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        return di !== 0 ? di : a.startTime.localeCompare(b.startTime);
      });

      return slots.map((slot) => {
        const cls = devStore.classes.find((c) => c.id === slot.classId);
        const subject = devStore.subjects.find((s) => s.id === slot.subjectId);
        const teacher = devStore.users.find((u) => u.id === slot.teacherId);
        return {
          id: slot.id,
          classId: slot.classId,
          className: cls?.name ?? slot.classId,
          subjectId: slot.subjectId,
          subjectName: subject?.name ?? slot.subjectId,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room ?? "",
        };
      });
    }

    const prisma = getPrismaClient();

    // Trouver la classe active de l'élève (via enrollment ou studentId direct)
    const student = await prisma!.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          orderBy: { academicYearId: "desc" },
          take: 1,
        },
      },
    });

    const classId = student?.enrollments[0]?.classId;
    if (!classId) return [];

    const slots = await prisma!.timeSlot.findMany({
      where: { classId },
      include: { subject: true, class: true },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    // Résoudre le nom de l'enseignant
    const teacherIds = [...new Set(slots.map((s) => s.teacherId))];
    const teachers = teacherIds.length
      ? await prisma!.user.findMany({ where: { id: { in: teacherIds } } })
      : [];
    const teacherMap = new Map(teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));

    return slots.map((slot) => ({
      id: slot.id,
      classId: slot.classId,
      className: slot.class.name,
      subjectId: slot.subjectId,
      subjectName: slot.subject.name,
      teacherName: teacherMap.get(slot.teacherId) ?? "",
      day: slot.day as string,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room ?? "",
    }));
  },
};
