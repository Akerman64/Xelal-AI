import { AuthSession } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const request = async <T>(path: string, session: AuthSession, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...init?.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Requête impossible.');
  return payload;
};

export interface StudentGradeSummary {
  generalAverage: number | null;
  gradesCount: number;
}

export interface StudentSubjectSummary {
  subjectId: string;
  subject: string;
  average: number | null;
  gradesCount: number;
}

export interface StudentGradeEntry {
  id: string;
  value: number;
  comment?: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: string;
  date: string | null;
  coefficient: number;
  subject: string;
}

export interface StudentGradesData {
  summary: StudentGradeSummary;
  subjectSummaries: StudentSubjectSummary[];
  grades: StudentGradeEntry[];
}

export interface StudentAttendanceSummary {
  present: number;
  absent: number;
  late: number;
}

export interface StudentAttendanceRecord {
  id: string;
  date: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  reason?: string;
  minutesLate?: number;
  subject?: string | null;
}

export interface StudentAttendanceData {
  summary: StudentAttendanceSummary;
  records: StudentAttendanceRecord[];
}

export interface StudentRecommendation {
  id: string;
  studentId: string;
  scope: string;
  summary: string;
  riskLevel: string;
  recommendations: string[];
  explanation?: string;
  createdAt: string;
}

export interface StudentScheduleSlot {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface StudentTutorAnswer {
  answer: string;
  source: 'ai' | 'fallback';
  generatedAt: string;
}

export const studentService = {
  async fetchGrades(session: AuthSession, studentId: string): Promise<StudentGradesData> {
    const response = await request<{ data: { summary: StudentGradeSummary; subjectSummaries: StudentSubjectSummary[]; grades: StudentGradeEntry[] } }>(
      `/api/academics/students/${studentId}/grades`,
      session,
    );
    return response.data;
  },

  async fetchAttendance(session: AuthSession, studentId: string): Promise<StudentAttendanceData> {
    const response = await request<{ data: { summary: StudentAttendanceSummary; records: StudentAttendanceRecord[] } }>(
      `/api/attendance/students/${studentId}`,
      session,
    );
    return response.data;
  },

  async fetchRecommendations(session: AuthSession, studentId: string): Promise<StudentRecommendation[]> {
    const response = await request<{ data: StudentRecommendation[] }>(
      `/api/academics/students/${studentId}/recommendations`,
      session,
    );
    return response.data;
  },

  async fetchSchedule(session: AuthSession, studentId: string): Promise<StudentScheduleSlot[]> {
    const response = await request<{ data: StudentScheduleSlot[] }>(
      `/api/student/${studentId}/schedule`,
      session,
    );
    return response.data;
  },

  async askTutor(session: AuthSession, studentId: string, question: string): Promise<StudentTutorAnswer> {
    const response = await request<{ data: StudentTutorAnswer }>(
      '/api/student/ai/ask',
      session,
      {
        method: 'POST',
        body: JSON.stringify({ studentId, question }),
      },
    );
    return response.data;
  },
};
