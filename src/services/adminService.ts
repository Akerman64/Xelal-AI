import { AuthSession, Role } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

type BackendRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
type BackendStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

const roleMap: Record<BackendRole, Role> = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export interface AdminUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  status: BackendStatus;
  classId?: string;
}

export interface AdminInvitationRecord {
  id: string;
  userId: string;
  email: string;
  role: Role;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  code?: string;
}

export interface AdminClassRecord {
  id: string;
  name: string;
  level?: string;
  studentsCount: number;
  teachersCount: number;
}

export interface AdminSubjectRecord {
  id: string;
  name: string;
  coefficientDefault: number;
}

export interface AdminAssignmentRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  coefficient: number;
}

export interface AdminOverview {
  totals: {
    users: number;
    activeUsers: number;
    pendingUsers: number;
    suspendedUsers: number;
    invitationsPending: number;
  };
  byRole: {
    admins: number;
    teachers: number;
    students: number;
    parents: number;
  };
  recentInvitations: AdminInvitationRecord[];
}

export interface AdminRecommendationStats {
  totals: {
    total: number;
    studentRecommendations: number;
    classRecommendations: number;
    whatsappSent: number;
    followThroughRate: number;
  };
  byRiskLevel: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timeline: Array<{
    date: string;
    total: number;
    whatsappSent: number;
  }>;
  topClasses: Array<{
    classId: string;
    className: string;
    recommendationsCount: number;
    averageRiskScore: number;
  }>;
}

export interface AdminClassReport {
  classId: string;
  className: string;
  generatedAt: string;
  riskLevel: string;
  summary: string;
  classSignals: {
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
  };
  studentsAtRisk: Array<{
    studentId: string;
    studentName: string;
    averageGrade: number | null;
    absenceRate: number;
    lateCount: number;
    gradeEvolution: number;
    subjectsAtRisk: string[];
    riskScore: number;
    riskLevel: string;
  }>;
  recommendations: string[];
}

export interface AdminAcademicActivity {
  recentGrades: Array<{
    id: string;
    studentName: string;
    className: string;
    subjectName: string;
    assessmentTitle: string;
    value: number;
    updatedAt: string;
  }>;
  recentAttendance: Array<{
    id: string;
    className: string;
    subjectName: string;
    date: string;
    present: number;
    absent: number;
    late: number;
    absentStudents: Array<{ studentName: string; status: string; reason?: string }>;
  }>;
}

export interface AdminAcademicStatistics {
  grades: Array<{
    id: string;
    value: number;
    comment: string;
    updatedAt: string;
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    teacherId: string;
    assessmentId: string;
    assessmentTitle: string;
    assessmentType: string;
    assessmentDate: string;
    coefficient: number;
    lessons: Array<{ id: string; title: string; orderIndex: number }>;
    timeSlots: Array<{ id: string; day: WeekDay; startTime: string; endTime: string; room: string }>;
  }>;
  teachers: Array<{
    id: string;
    name: string;
    subjects: Array<{ classId: string; className: string; subjectId: string; subjectName: string; coefficient: number }>;
  }>;
  lessons: Array<{
    id: string;
    title: string;
    description: string;
    objectives: string;
    orderIndex: number;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    teacherId: string;
  }>;
  recommendations: Array<{
    id: string;
    scope: 'STUDENT' | 'CLASS';
    targetName: string;
    className: string;
    riskLevel?: string;
    summary: string;
    createdAt: string;
  }>;
}

export type WeekDay = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';

export interface AdminTimeSlotRecord {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  room: string | null;
  cancellations?: Array<{ id: string; date: string; reason: string; cancelledBy: string; createdAt: string }>;
}

export interface AdminParentStudentLinkRecord {
  id: string;
  parentUserId: string;
  parentName: string;
  parentPhone?: string;
  studentId: string;
  studentName: string;
  relationship: 'MOTHER' | 'FATHER' | 'TUTOR';
  relationshipLabel: string;
  isPrimary: boolean;
  welcomeDelivery?: {
    delivered: boolean;
    reason?: string;
  } | null;
}

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

  if (!response.ok) {
    throw new Error(payload.error || 'Requête impossible.');
  }

  return payload;
};

const toAdminUser = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: BackendRole;
  status: BackendStatus;
  classId?: string;
}): AdminUserRecord => ({
  ...user,
  role: roleMap[user.role],
});

const toInvitation = (invitation: {
  id: string;
  userId: string;
  email: string;
  role: BackendRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  code?: string;
}): AdminInvitationRecord => ({
  ...invitation,
  role: roleMap[invitation.role],
});

export const adminService = {
  async fetchOverview(session: AuthSession) {
    const response = await request<{ data: Omit<AdminOverview, 'recentInvitations'> & { recentInvitations: Array<any> } }>(
      '/api/admin/overview',
      session,
    );

    return {
      ...response.data,
      recentInvitations: response.data.recentInvitations.map(toInvitation),
    } satisfies AdminOverview;
  },

  async fetchRecommendationStats(session: AuthSession): Promise<AdminRecommendationStats> {
    const response = await request<{ data: AdminRecommendationStats }>(
      '/api/admin/recommendations/stats',
      session,
    );
    return response.data;
  },

  async fetchAcademicActivity(session: AuthSession): Promise<AdminAcademicActivity> {
    const response = await request<{ data: AdminAcademicActivity }>('/api/admin/academic-activity', session);
    return response.data;
  },

  async fetchAcademicStatistics(session: AuthSession): Promise<AdminAcademicStatistics> {
    const response = await request<{ data: AdminAcademicStatistics }>('/api/admin/academic-statistics', session);
    return response.data;
  },

  async updateGrade(session: AuthSession, gradeId: string, input: { value: number; comment?: string }) {
    const response = await request<{ data: any }>(`/api/admin/grades/${gradeId}`, session, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async generateClassReport(session: AuthSession, classId: string): Promise<AdminClassReport> {
    const response = await request<{ data: AdminClassReport }>(
      `/api/admin/ai/class-report/${classId}`,
      session,
      {
        method: 'POST',
      },
    );
    return response.data;
  },

  async fetchUsers(session: AuthSession) {
    const response = await request<{ data: Array<any> }>('/api/admin/users', session);
    return response.data.map(toAdminUser);
  },

  async fetchParentStudentLinks(session: AuthSession): Promise<AdminParentStudentLinkRecord[]> {
    const response = await request<{ data: AdminParentStudentLinkRecord[] }>(
      '/api/admin/parent-student-links',
      session,
    );
    return response.data;
  },

  async createParentStudentLink(
    session: AuthSession,
    input: {
      parentUserId: string;
      studentId: string;
      relationship: 'MOTHER' | 'FATHER' | 'TUTOR';
      isPrimary?: boolean;
    },
  ): Promise<AdminParentStudentLinkRecord> {
    const response = await request<{ data: AdminParentStudentLinkRecord }>(
      '/api/admin/parent-student-links',
      session,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return response.data;
  },

  async deleteParentStudentLink(session: AuthSession, linkId: string): Promise<void> {
    await request<{ data: { id: string } }>(
      `/api/admin/parent-student-links/${linkId}`,
      session,
      { method: 'DELETE' },
    );
  },

  async fetchInvitations(session: AuthSession) {
    const response = await request<{ data: Array<any> }>('/api/admin/invitations', session);
    return response.data.map(toInvitation);
  },

  async inviteUser(
    session: AuthSession,
    input: { schoolId: string; firstName: string; lastName: string; email?: string; phone?: string; role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'; classId?: string },
  ) {
    const response = await request<{ data: { user: any; invitation: any; emailDelivery: any; whatsappDelivery: any } }>(
      '/api/admin/users/invite',
      session,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );

    return {
      user: toAdminUser(response.data.user),
      invitation: response.data.invitation ? toInvitation(response.data.invitation) : null,
      emailDelivery: response.data.emailDelivery as { delivered: boolean; reason?: string } | null,
      whatsappDelivery: response.data.whatsappDelivery as { delivered: boolean; reason?: string } | null,
    };
  },

  async registerParent(
    session: AuthSession,
    input: { schoolId: string; firstName: string; lastName: string; phone: string; email?: string },
  ) {
    const response = await request<{ data: { user: any } }>(
      '/api/admin/parents',
      session,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );

    return {
      user: toAdminUser(response.data.user),
    };
  },

  async updateUserStatus(
    session: AuthSession,
    userId: string,
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED',
  ) {
    const response = await request<{ data: any }>(
      `/api/admin/users/${userId}/status`,
      session,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );

    return toAdminUser(response.data);
  },

  async deleteUser(session: AuthSession, userId: string): Promise<void> {
    await request<{ data: { id: string } }>(
      `/api/admin/users/${userId}`,
      session,
      { method: 'DELETE' },
    );
  },

  async resendInvitation(session: AuthSession, invitationId: string) {
    const response = await request<{ data: any }>(
      `/api/admin/invitations/${invitationId}/resend`,
      session,
      {
        method: 'POST',
      },
    );

    return toInvitation(response.data);
  },

  async expireInvitation(session: AuthSession, invitationId: string) {
    const response = await request<{ data: any }>(
      `/api/admin/invitations/${invitationId}/status`,
      session,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'EXPIRED' }),
      },
    );

    return toInvitation(response.data);
  },

  async fetchClasses(session: AuthSession): Promise<AdminClassRecord[]> {
    const response = await request<{ data: AdminClassRecord[] }>('/api/admin/classes', session);
    return response.data;
  },

  async createClass(
    session: AuthSession,
    input: { schoolId: string; academicYearId?: string; name: string; level?: string },
  ): Promise<AdminClassRecord> {
    const response = await request<{ data: AdminClassRecord }>('/api/admin/classes', session, {
      method: 'POST',
      body: JSON.stringify({ academicYearId: 'ay_2025_2026', ...input }),
    });
    return response.data;
  },

  async deleteClass(session: AuthSession, classId: string): Promise<void> {
    await request<{ data: { id: string } }>(`/api/admin/classes/${classId}`, session, { method: 'DELETE' });
  },

  async fetchSubjects(session: AuthSession): Promise<AdminSubjectRecord[]> {
    const response = await request<{ data: AdminSubjectRecord[] }>('/api/admin/subjects', session);
    return response.data;
  },

  async createSubject(
    session: AuthSession,
    input: { schoolId: string; name: string; coefficientDefault?: number },
  ): Promise<AdminSubjectRecord> {
    const response = await request<{ data: AdminSubjectRecord }>('/api/admin/subjects', session, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async deleteSubject(session: AuthSession, subjectId: string): Promise<void> {
    await request<{ data: { id: string } }>(`/api/admin/subjects/${subjectId}`, session, { method: 'DELETE' });
  },

  async fetchAssignments(session: AuthSession): Promise<AdminAssignmentRecord[]> {
    const response = await request<{ data: AdminAssignmentRecord[] }>('/api/admin/assignments', session);
    return response.data;
  },

  async createAssignment(
    session: AuthSession,
    input: { teacherId: string; classId: string; subjectId: string; coefficient?: number },
  ): Promise<AdminAssignmentRecord> {
    const response = await request<{ data: AdminAssignmentRecord }>(
      '/api/admin/assignments',
      session,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.data;
  },

  async deleteAssignment(session: AuthSession, assignmentId: string): Promise<void> {
    await request<{ data: { id: string } }>(
      `/api/admin/assignments/${assignmentId}`,
      session,
      { method: 'DELETE' },
    );
  },

  async fetchEnrollments(session: AuthSession, classId?: string): Promise<{ id: string; studentId: string; studentName: string; classId: string; className: string; status: string }[]> {
    const url = classId ? `/api/admin/enrollments?classId=${encodeURIComponent(classId)}` : '/api/admin/enrollments';
    const response = await request<{ data: any[] }>(url, session);
    return response.data;
  },

  async createEnrollment(session: AuthSession, input: { studentId: string; classId: string }): Promise<{ id: string; studentId: string; studentName: string; classId: string; className: string; status: string }> {
    const response = await request<{ data: any }>('/api/admin/enrollments', session, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async deleteEnrollment(session: AuthSession, enrollmentId: string): Promise<void> {
    await request<{ data: { id: string } }>(`/api/admin/enrollments/${enrollmentId}`, session, { method: 'DELETE' });
  },

  async fetchTimeSlots(session: AuthSession, classId?: string): Promise<AdminTimeSlotRecord[]> {
    const url = classId ? `/api/admin/schedule?classId=${encodeURIComponent(classId)}` : '/api/admin/schedule';
    const response = await request<{ data: AdminTimeSlotRecord[] }>(url, session);
    return response.data;
  },

  async createTimeSlot(
    session: AuthSession,
    input: {
      classId: string;
      subjectId: string;
      teacherId: string;
      day: WeekDay;
      startTime: string;
      endTime: string;
      room?: string;
    },
  ): Promise<AdminTimeSlotRecord> {
    const response = await request<{ data: AdminTimeSlotRecord }>(
      '/api/admin/schedule',
      session,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.data;
  },

  async deleteTimeSlot(session: AuthSession, slotId: string): Promise<void> {
    await request<{ data: { id: string } }>(`/api/admin/schedule/${slotId}`, session, { method: 'DELETE' });
  },

  async cancelTimeSlot(session: AuthSession, slotId: string, input: { date: string; reason: string }) {
    const response = await request<{ data: any }>(`/api/admin/schedule/${slotId}/cancellations`, session, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async analyzeAdmin(
    session: AuthSession,
    input: {
      classId: string;
      studentId?: string;
      subjectId?: string;
      subjectName?: string;
      extraPrompt?: string;
    },
  ): Promise<{
    scope: 'student' | 'class';
    summary: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
    explanation: string;
    subjectFilter?: string;
    whatsappMessage?: string;
    studentsAtRisk?: string[];
    source: string;
  }> {
    const response = await request<{ data: any }>('/api/admin/analyze', session, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },
};
