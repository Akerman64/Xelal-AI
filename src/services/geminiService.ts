/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service IA frontend — délègue tout au backend.
 * Le backend utilise DeepSeek (prioritaire) ou Gemini selon la config.
 * Plus d'appels directs à Google AI depuis le navigateur.
 */

import { authService } from './authService';
import { Student } from '../types';
import { TeacherClassRiskSignals, TeacherStudentRiskSignals } from './backendService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

type RecommendationResponse = {
  summary: string;
  riskLevel: string;
  recommendations: string[];
  explanation: string;
  whatsappMessage?: string;
  source?: string;
};

async function postToBackend<T>(path: string, body: unknown): Promise<T> {
  const session = authService.getStoredSession();
  const token = session?.accessToken ?? '';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erreur API ${response.status}`);
  }

  const payload = await response.json() as { data: T };
  return payload.data;
}

export const analyzeStudentPerformance = async (
  student: Student,
  extraPrompt?: string,
  riskSignals?: TeacherStudentRiskSignals | null,
): Promise<RecommendationResponse> => {
  try {
    return await postToBackend<RecommendationResponse>('/api/teacher/analyze-student', {
      studentId: student.id,
      studentName: student.name,
      extraPrompt,
      riskSignals,
      grades: student.grades,
      attendance: student.attendance,
    });
  } catch {
    return {
      summary: "Analyse IA indisponible. Vérifiez que le backend est démarré et qu'une clé API est configurée (DEEPSEEK_API_KEY ou GEMINI_API_KEY).",
      riskLevel: 'medium',
      recommendations: [
        "Suivre régulièrement les notes et l'assiduité.",
        "Contacter les parents en cas d'absence répétée.",
        "Proposer un soutien personnalisé pour les matières faibles.",
      ],
      explanation: "L'analyse IA n'a pas pu être effectuée.",
      whatsappMessage: `Bonjour, nous vous invitons à suivre régulièrement la scolarité de ${student.name}.`,
      source: 'fallback',
    };
  }
};

export const analyzeClassPerformance = async (
  className: string,
  students: Student[],
  extraPrompt?: string,
  riskSignals?: TeacherClassRiskSignals | null,
): Promise<RecommendationResponse> => {
  const classSummary = students.map((s) => ({
    name: s.name,
    average: s.grades.length
      ? Number((s.grades.reduce((sum, g) => sum + g.value, 0) / s.grades.length).toFixed(1))
      : null,
    absences: s.attendance.filter((a) => a.status === 'absent').length,
  }));

  try {
    return await postToBackend<RecommendationResponse>('/api/teacher/analyze-class', {
      classId: riskSignals?.classId ?? '',
      className,
      extraPrompt,
      students: classSummary,
      classSignals: riskSignals,
    });
  } catch {
    return {
      summary: `Analyse de classe indisponible pour ${className}.`,
      riskLevel: 'medium',
      recommendations: [
        "Planifier une révision ciblée sur les notions les moins acquises.",
        "Contacter les parents des élèves les plus fragiles.",
        "Prévoir un suivi court en début de semaine prochaine.",
      ],
      explanation: "L'analyse IA n'a pas pu être effectuée.",
      whatsappMessage: '',
      source: 'fallback',
    };
  }
};

export const generateWhatsAppReply = async (
  message: string,
  studentContext?: Student,
): Promise<string> => {
  const studentName = studentContext?.name ?? "votre enfant";
  try {
    return await postToBackend<string>('/api/whatsapp/preview-reply', {
      message,
      studentId: studentContext?.id,
      studentName,
    });
  } catch {
    const normalized = message.toLowerCase();
    if (normalized.includes('note') || normalized.includes('moyenne')) {
      return `Je peux vous aider à suivre les notes de ${studentName}. Connectez-vous à l’espace parent pour voir le détail par matière et les dernières évaluations.`;
    }
    if (normalized.includes('absence') || normalized.includes('retard')) {
      return `Pour ${studentName}, les absences et retards sont suivis dans Xelal. Si une absence est à justifier, vous pouvez envoyer le motif directement ici.`;
    }
    if (normalized.includes('emploi') || normalized.includes('cours') || normalized.includes('horaire')) {
      return `L’emploi du temps de ${studentName} dépend de sa classe. Vous pourrez bientôt le consulter directement depuis WhatsApp.`;
    }
    return `Bonjour, j’ai bien reçu votre message concernant ${studentName}. Je peux vous aider sur les notes, absences, retards, emploi du temps et recommandations de suivi.`;
  }
};
