import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { schoolRepository } from "../core/school-repository";

export class StudentError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || env.openAiApiKey;
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

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

    const ai = getAI();
    if (!ai) {
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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
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
};
