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

export const analyzeStudentPerformance = async (student: Student) => {
  const ai = getAI();
  if (!ai) {
    return {
      summary: "L'analyse IA est désactivée. Veuillez configurer la clé API Gemini.",
      riskLevel: 'low',
      recommendations: ["Assurer un suivi régulier des notes."],
    };
  }

  const prompt = `
    En tant qu'assistant pédagogique intelligent pour une école au Sénégal, analyse les performances de l'élève suivant:
    Nom: ${student.name}
    Notes: ${JSON.stringify(student.grades)}
    Absences: ${JSON.stringify(student.attendance)}

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
