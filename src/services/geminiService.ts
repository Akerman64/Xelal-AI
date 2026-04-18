/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

let aiInstance: any = null;

const getAI = () => {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
};

export const analyzeStudentPerformance = async (student: Student, extraPrompt?: string) => {
  const ai = getAI();
  if (!ai) {
    return {
      summary: "L'analyse IA est désactivée. Veuillez configurer la clé API Gemini.",
      riskLevel: 'low',
      recommendations: ["Assurer un suivi régulier des notes."],
      explanation: "Mode sans IA active.",
    };
  }

  const prompt = `
    En tant qu'assistant pédagogique intelligent pour une école au Sénégal, analyse les performances de l'élève suivant:
    Nom: ${student.name}
    Notes: ${JSON.stringify(student.grades)}
    Absences: ${JSON.stringify(student.attendance)}
    Consigne complémentaire de l'enseignant: ${extraPrompt || "Aucune"}

    Fournis une analyse structurée en JSON avec les champs suivants:
    - summary (string): Résumé de la situation actuelle
    - riskLevel (string: 'low', 'medium', 'high'): Niveau de risque de décrochage ou baisse de performance
    - recommendations (string[]): 3 conseils concrets pour l'élève ou les parents.
    - explanation (string): Pourquoi cette analyse ?

    Réponds uniquement en JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: "Erreur lors de l'analyse IA.",
      riskLevel: 'medium',
      recommendations: ["Vérifier les données manuellement."],
      explanation: "La génération IA a échoué.",
    };
  }
};

export const analyzeClassPerformance = async (
  className: string,
  students: Student[],
  extraPrompt?: string,
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
    };
  }

  const prompt = `
    En tant qu'assistant pédagogique intelligent pour une école au Sénégal, analyse la classe suivante:
    Classe: ${className}
    Effectif analysé: ${students.length}
    Synthèse des élèves: ${JSON.stringify(classSummary)}
    Consigne complémentaire de l'enseignant: ${extraPrompt || "Aucune"}

    Fournis une analyse structurée en JSON avec les champs suivants:
    - summary (string): Résumé global de la classe
    - riskLevel (string: 'low', 'medium', 'high'): Niveau de vigilance global
    - recommendations (string[]): 3 à 5 actions concrètes pour l'enseignant ou l'équipe pédagogique
    - explanation (string): Pourquoi cette analyse ?

    Réponds uniquement en JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Class Analysis Error:", error);
    return {
      summary: "Erreur lors de l'analyse IA de la classe.",
      riskLevel: "medium",
      recommendations: ["Vérifier les résultats et absences de la classe manuellement."],
      explanation: "La génération IA a échoué.",
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
