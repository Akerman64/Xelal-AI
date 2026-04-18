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

  async fetchUsers(session: AuthSession) {
    const response = await request<{ data: Array<any> }>('/api/admin/users', session);
    return response.data.map(toAdminUser);
  },

  async fetchInvitations(session: AuthSession) {
    const response = await request<{ data: Array<any> }>('/api/admin/invitations', session);
    return response.data.map(toInvitation);
  },

  async inviteUser(
    session: AuthSession,
    input: { schoolId: string; firstName: string; lastName: string; email: string; role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'; classId?: string },
  ) {
    const response = await request<{ data: { user: any; invitation: any } }>(
      '/api/admin/users/invite',
      session,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );

    return {
      user: toAdminUser(response.data.user),
      invitation: toInvitation(response.data.invitation),
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
    input: { teacherId: string; classId: string; subjectId: string },
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
};
