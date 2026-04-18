import { authService } from './authService';
import { Attendance, AuthSession, Student } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface ApiClass {
  id: string;
  name: string;
  level: string;
  studentsCount: number;
  teachersCount: number;
}

interface ApiClassStudentResponse {
  id: string;
  name: string;
  level: string;
  students: Array<{
    id: string;
    schoolId: string;
    classId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
  }>;
}

interface ApiClassGradebookRow {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    classId?: string;
  };
  average: number | null;
  gradesCount: number;
}

interface ApiAssessment {
  id: string;
  title: string;
  type: string;
  coefficient: number;
  date: string;
  subject: string;
}

interface ApiStudentGradesResponse {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    classId?: string;
  };
  summary: {
    generalAverage: number | null;
    gradesCount: number;
  };
  grades: Array<{
    id: string;
    value: number;
    comment?: string;
    assessmentId: string;
    assessmentTitle: string;
    assessmentType: string;
    date: string | null;
    coefficient: number;
    subject: string;
  }>;
}

interface ApiStudentAttendanceResponse {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    classId?: string;
  };
  summary: {
    present: number;
    absent: number;
    late: number;
  };
  records: Array<{
    id: string;
    date: string | null;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    reason?: string;
    minutesLate?: number;
    classId?: string | null;
    subject?: string | null;
  }>;
}

export interface TeacherDashboardData {
  teacherId: string;
  teacherName: string;
  classes: ApiClass[];
  selectedClassId: string;
  selectedClassName: string;
  assessments: ApiAssessment[];
  assessmentsByClass: Record<string, ApiAssessment[]>;
  students: Student[];
  gradebook: Array<{
    student: Student;
    average: number | null;
    gradesCount: number;
  }>;
}

export interface TeacherLesson {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface TeacherQuickContact {
  parentName: string;
  studentName: string;
  phone: string;
  lastMessage: string;
}

export interface TeacherWorkspaceData {
  upcomingLessons: TeacherLesson[];
  weeklySchedule: TeacherLesson[];
  quickContacts: TeacherQuickContact[];
}

export interface TeacherRecommendationRecord {
  id: string;
  studentId?: string;
  classId?: string;
  scope?: 'student' | 'class';
  summary: string;
  riskLevel: string;
  recommendations: string[];
  explanation?: string;
  whatsappMessage?: string;
  whatsappSent?: boolean;
  whatsappSentAt?: string;
  prompt?: string;
  createdAt: string;
}

export interface TeacherStudentRiskSignals {
  studentId: string;
  classId?: string | null;
  averageGrade: number | null;
  classAverage: number | null;
  totalSessions: number;
  absenceRate: number;
  absentCount: number;
  lateCount: number;
  gradeEvolution: number;
  subjectsAtRisk: string[];
  riskScore: number;
  riskLevel: string;
}

export interface TeacherClassRiskSignals {
  classId: string;
  classAverage: number | null;
  attendanceSessions: number;
  totalAbsences: number;
  totalLate: number;
  absenceRate: number;
  lateRate: number;
  studentsCount: number;
  studentsAtRisk: number;
  riskScore: number;
  riskLevel: string;
}

const toAttendanceStatus = (status: 'PRESENT' | 'ABSENT' | 'LATE'): Attendance['status'] => {
  if (status === 'ABSENT') return 'absent';
  if (status === 'LATE') return 'late';
  return 'present';
};

const createStudentName = (firstName: string, lastName: string) =>
  `${firstName} ${lastName}`.trim();

const request = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error ${response.status}`);
  }

  return response.json();
};

export const fetchTeacherDashboardData = async (
  session: AuthSession,
): Promise<TeacherDashboardData> => {
  const token = session.accessToken;

  const classesResponse = await request<{ data: ApiClass[] }>('/api/teacher/classes', token);
  const selectedClass = classesResponse.data[0];

  if (!selectedClass) {
    // Pas encore de classes affectées — retour propre sans throw
    return {
      teacherId: session.user.id,
      teacherName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      classes: [],
      selectedClassId: '',
      selectedClassName: '',
      assessments: [],
      assessmentsByClass: {},
      students: [],
      gradebook: [],
    };
  }

  const classPayloads = await Promise.all(
    classesResponse.data.map(async (classItem) => {
      const [classStudentsResponse, assessmentsResponse, gradebookResponse] = await Promise.all([
        request<{ data: ApiClassStudentResponse }>(
          `/api/classes/${classItem.id}/students`,
          token,
        ),
        request<{ data: ApiAssessment[] }>(
          `/api/academics/classes/${classItem.id}/assessments`,
          token,
        ),
        request<{ data: { rows: ApiClassGradebookRow[] } }>(
          `/api/academics/classes/${classItem.id}/gradebook`,
          token,
        ),
      ]);

      return {
        classId: classItem.id,
        students: classStudentsResponse.data.students,
        assessments: assessmentsResponse.data,
        gradebookRows: gradebookResponse.data.rows,
      };
    }),
  );

  const uniqueStudents = new Map<
    string,
    ApiClassStudentResponse['students'][number]
  >();

  classPayloads.forEach((payload) => {
    payload.students.forEach((student) => {
      uniqueStudents.set(student.id, student);
    });
  });

  const studentDetails = await Promise.all(
    Array.from(uniqueStudents.values()).map(async (student) => {
      const [gradesResponse, attendanceResponse] = await Promise.all([
        request<{ data: ApiStudentGradesResponse }>(
          `/api/academics/students/${student.id}/grades`,
          token,
        ),
        request<{ data: ApiStudentAttendanceResponse }>(
          `/api/attendance/students/${student.id}`,
          token,
        ),
      ]);

      const grades = gradesResponse.data.grades.map((grade) => ({
        id: grade.id,
        studentId: student.id,
        subject: grade.subject,
        value: grade.value,
        coefficient: grade.coefficient,
        date: grade.date || '',
        comment: grade.comment,
      }));

      const attendance = attendanceResponse.data.records.map((record) => ({
        id: record.id,
        studentId: student.id,
        date: record.date || '',
        status: toAttendanceStatus(record.status),
        reason: record.reason,
      }));

      return {
        id: student.id,
        name: createStudentName(student.firstName, student.lastName),
        email: student.email,
        role: 'student' as const,
        classId: student.classId,
        parentPhone: student.phone || '',
        grades,
        attendance,
      };
    }),
  );

  const assessmentsByClass = Object.fromEntries(
    classPayloads.map((payload) => [payload.classId, payload.assessments]),
  );

  const selectedGradebookRows =
    classPayloads.find((payload) => payload.classId === selectedClass.id)?.gradebookRows ?? [];

  const studentMap = new Map(studentDetails.map((student) => [student.id, student]));
  const gradebook = selectedGradebookRows
    .map((row) => ({
      student: studentMap.get(row.student.id),
      average: row.average,
      gradesCount: row.gradesCount,
    }))
    .filter((row): row is { student: Student; average: number | null; gradesCount: number } => Boolean(row.student));

  return {
    teacherId: session.user.id,
    teacherName: createStudentName(session.user.firstName, session.user.lastName),
    classes: classesResponse.data,
    selectedClassId: selectedClass.id,
    selectedClassName: selectedClass.name,
    assessments: assessmentsByClass[selectedClass.id] ?? [],
    assessmentsByClass,
    students: studentDetails,
    gradebook,
  };
};

export const fetchTeacherWorkspaceData = async (session: AuthSession) => {
  const response = await request<{ data: TeacherWorkspaceData }>(
    '/api/teacher/dashboard',
    session.accessToken,
  );

  return response.data;
};

export const fetchTeacherRecommendations = async (studentId: string) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: TeacherRecommendationRecord[] }>(
    `/api/teacher/students/${studentId}/recommendations`,
    session.accessToken,
  );

  return response.data;
};

export const fetchTeacherStudentRiskSignals = async (studentId: string) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: TeacherStudentRiskSignals }>(
    `/api/teacher/students/${studentId}/risk-signals`,
    session.accessToken,
  );

  return response.data;
};

export const fetchTeacherClassRiskSignals = async (classId: string) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: TeacherClassRiskSignals }>(
    `/api/teacher/classes/${classId}/risk-signals`,
    session.accessToken,
  );

  return response.data;
};

export const saveTeacherRecommendation = async (
  studentId: string,
  input: {
    summary: string;
    riskLevel?: string;
    recommendations: string[];
    explanation?: string;
    whatsappMessage?: string;
    prompt?: string;
  },
) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: TeacherRecommendationRecord }>(
    `/api/teacher/students/${studentId}/recommendations`,
    session.accessToken,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return response.data;
};

export const fetchTeacherClassRecommendations = async (classId: string) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: TeacherRecommendationRecord[] }>(
    `/api/teacher/classes/${classId}/recommendations`,
    session.accessToken,
  );

  return response.data;
};

export const saveTeacherClassRecommendation = async (
  classId: string,
  input: {
    summary: string;
    riskLevel?: string;
    recommendations: string[];
    explanation?: string;
    prompt?: string;
  },
) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: TeacherRecommendationRecord }>(
    `/api/teacher/classes/${classId}/recommendations`,
    session.accessToken,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return response.data;
};

export const sendTeacherWhatsAppMessage = async (
  studentId: string,
  message: string,
  recommendationId?: string,
) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: { sent: number; deliveries: Array<any>; preview: string } }>(
    `/api/teacher/students/${studentId}/whatsapp-message`,
    session.accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ message, recommendationId }),
    },
  );

  return response.data;
};

export const updateTeacherGrade = async (gradeId: string, value: number, comment?: string) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: { id: string; value: number; comment?: string } }>(
    `/api/academics/grades/${gradeId}`,
    session.accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ value, comment }),
    },
  );

  return response.data;
};

export const saveTeacherAttendance = async (input: {
  classId: string;
  teacherId: string;
  date: string;
  entries: Array<{
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    reason?: string;
    minutesLate?: number;
  }>;
}) => {
  const session = authService.getStoredSession();
  if (!session) {
    throw new Error('Session introuvable.');
  }

  const response = await request<{ data: unknown }>(
    '/api/attendance/records/bulk',
    session.accessToken,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return response.data;
};
