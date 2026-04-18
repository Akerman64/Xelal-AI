/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";
import { TeacherClassRiskSignals, TeacherStudentRiskSignals } from "./backendService";

let aiInstance: any = null;

type RecommendationResponse = {
  summary: string;
  riskLevel: string;
  recommendations: string[];
  explanation: string;
  whatsappMessage?: string;
};

const getAI = () => {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
};

export const analyzeStudentPerformance = async (
  student: Student,
  extraPrompt?: string,
  riskSignals?: TeacherStudentRiskSignals | null,
) => {
  const ai = getAI();
  if (!ai) {
    return {
      summary: "L'analyse IA est désactivée. Veuillez configurer la clé API Gemini.",
      riskLevel: 'low',
      recommendations: ["Assurer un suivi régulier des notes."],
      explanation: "Mode sans IA active.",
      whatsappMessage: `Bonjour, nous vous invitons à suivre régulièrement la scolarité de ${student.name}.`,
    };
  }

  const localAverage =
    student.grades.length > 0
      ? Number((student.grades.reduce((sum, grade) => sum + grade.value, 0) / student.grades.length).toFixed(2))
      : null;
  const fallbackSignals = {
    absenceRate:
      student.attendance.length > 0
        ? Number(
            (
              (student.attendance.filter((item) => item.status === "absent").length /
                student.attendance.length) *
              100
            ).toFixed(1),
          )
        : 0,
    averageGrade: localAverage,
    classAverage: null,
    gradeEvolution:
      student.grades.length >= 2
        ? Number((student.grades.at(-1)!.value - student.grades[0]!.value).toFixed(2))
        : 0,
    lateCount: student.attendance.filter((item) => item.status === "late").length,
    subjectsAtRisk: Array.from(
      new Set(student.grades.filter((grade) => grade.value < 10).map((grade) => grade.subject)),
    ),
    absentCount: student.attendance.filter((item) => item.status === "absent").length,
    totalSessions: student.attendance.length,
    riskLevel: "medium",
    riskScore: 40,
  };

  const signals = riskSignals ?? fallbackSignals;

  const prompt = `
    Élève: ${student.name}
    Classe: ${student.classId || "non renseignée"}
    Absences: ${signals.absenceRate}% (${signals.absentCount} sur ${signals.totalSessions} séances)
    Moyenne: ${signals.averageGrade ?? "N/A"}/20
    Moyenne de classe: ${signals.classAverage ?? "N/A"}/20
    Évolution: ${signals.gradeEvolution} points sur les dernières notes
    Retards: ${signals.lateCount}
    Matières à risque: ${signals.subjectsAtRisk.join(", ") || "aucune"}
    Score de risque: ${signals.riskScore}/100
    Niveau de risque calculé: ${signals.riskLevel}
    Notes détaillées: ${JSON.stringify(student.grades)}
    Présences détaillées: ${JSON.stringify(student.attendance)}
    Consigne complémentaire de l'enseignant: ${extraPrompt || "Aucune"}

    En tant que conseiller pédagogique, analyse la situation et fournis:
    1. Niveau de risque (low / medium / high / critical)
    2. Résumé en 2 phrases pour l'enseignant
    3. 3 recommandations actionnables et concrètes
    4. Une explication courte fondée sur les signaux
    5. Un message WhatsApp pour le parent (max 160 mots, ton bienveillant)

    Réponds en JSON strict:
    {
      "riskLevel": string,
      "summary": string,
      "recommendations": string[],
      "explanation": string,
      "whatsappMessage": string
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}") as RecommendationResponse;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: "Erreur lors de l'analyse IA.",
      riskLevel: 'medium',
      recommendations: ["Vérifier les données manuellement."],
      explanation: "La génération IA a échoué.",
      whatsappMessage: `Bonjour, nous vous recommandons de prendre contact avec l'établissement au sujet de ${student.name}.`,
    };
  }
};

export const analyzeClassPerformance = async (
  className: string,
  students: Student[],
  extraPrompt?: string,
  riskSignals?: TeacherClassRiskSignals | null,
) => {
  const ai = getAI();
  const classSummary = students.map((student) => ({
    name: student.name,
    average:
      student.grades.length > 0
        ? Number(
            (
              student.grades.reduce((sum, grade) => sum + grade.value, 0) /
              student.grades.length
            ).toFixed(1),
          )
        : null,
    absences: student.attendance.filter((item) => item.status === "absent").length,
    lateCount: student.attendance.filter((item) => item.status === "late").length,
    latestGrades: student.grades.slice(-3),
  }));

  if (!ai) {
    return {
      summary: `Analyse de classe indisponible pour ${className}.`,
      riskLevel: "medium",
      recommendations: [
        "Planifier une révision ciblée sur les notions les moins acquises.",
        "Contacter les parents des élèves les plus fragiles.",
        "Prévoir un suivi court en début de semaine prochaine.",
      ],
      explanation: "Mode sans IA active.",
      whatsappMessage: "",
    };
  }

  const localClassAverage = students.length
    ? Number(
        (
          students.reduce((sum, student) => {
            const avg =
              student.grades.length > 0
                ? student.grades.reduce((acc, grade) => acc + grade.value, 0) / student.grades.length
                : 0;
            return sum + avg;
          }, 0) / students.length
        ).toFixed(2),
      )
    : null;
  const localSignals = riskSignals ?? {
    classId: "",
    classAverage: localClassAverage,
    attendanceSessions: students.reduce((sum, student) => sum + student.attendance.length, 0),
    totalAbsences: students.reduce(
      (sum, student) => sum + student.attendance.filter((item) => item.status === "absent").length,
      0,
    ),
    totalLate: students.reduce(
      (sum, student) => sum + student.attendance.filter((item) => item.status === "late").length,
      0,
    ),
    absenceRate: 0,
    lateRate: 0,
    studentsCount: students.length,
    studentsAtRisk: students.filter((student) =>
      student.grades.some((grade) => grade.value < 10),
    ).length,
    riskScore: 40,
    riskLevel: "medium",
  };

  const prompt = `
    Classe: ${className}
    Effectif analysé: ${students.length}
    Moyenne de classe: ${localSignals.classAverage ?? "N/A"}/20
    Séances observées: ${localSignals.attendanceSessions}
    Taux d'absence: ${localSignals.absenceRate}%
    Taux de retard: ${localSignals.lateRate}%
    Élèves à risque: ${localSignals.studentsAtRisk}/${localSignals.studentsCount}
    Score de risque: ${localSignals.riskScore}/100
    Niveau de risque calculé: ${localSignals.riskLevel}
    Synthèse des élèves: ${JSON.stringify(classSummary)}
    Consigne complémentaire de l'enseignant: ${extraPrompt || "Aucune"}

    En tant qu'assistant pédagogique, fournis:
    1. Niveau de risque (low / medium / high / critical)
    2. Résumé global de la classe
    3. 3 à 5 actions concrètes pour l'enseignant ou l'équipe pédagogique
    4. Une explication courte fondée sur les signaux
    5. Un message WhatsApp type que l'enseignant pourrait adapter pour les parents

    Réponds en JSON strict:
    {
      "riskLevel": string,
      "summary": string,
      "recommendations": string[],
      "explanation": string,
      "whatsappMessage": string
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

    return JSON.parse(response.text || "{}") as RecommendationResponse;
  } catch (error) {
    console.error("AI Class Analysis Error:", error);
    return {
      summary: "Erreur lors de l'analyse IA de la classe.",
      riskLevel: "medium",
      recommendations: ["Vérifier les résultats et absences de la classe manuellement."],
      explanation: "La génération IA a échoué.",
      whatsappMessage: "",
    };
  }
};

export const generateWhatsAppReply = async (message: string, context: any) => {
  const ai = getAI();
  if (!ai) return "Je suis le chatbot de l'école. Comment puis-je vous aider ? (IA non configurée)";

  const prompt = `
    Tu es le chatbot WhatsApp intelligent de l'école Xelal AI au Sénégal.
    Un parent demande: "${message}"
    Context (données de l'enfant): ${JSON.stringify(context)}
    
    Réponds de manière cordiale, concise (format WhatsApp) et en français.
    Si la question concerne les notes ou absences, utilise les données fournies.
    Si tu ne sais pas, propose de contacter le professeur.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Désolé, je ne peux pas répondre pour le moment.";
  } catch (error) {
    return "Désolé, je rencontre une petite difficulté technique.";
  }
};
