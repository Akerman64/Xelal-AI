import { AuthSession, AuthUser, Role } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SESSION_STORAGE_KEY = 'xelal_auth_session';

type BackendRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

const roleMap: Record<BackendRole, Role> = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: BackendRole;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  classId?: string;
  phone?: string;
}

interface BackendSessionResponse {
  accessToken: string;
  tokenType: 'Bearer';
  user: BackendUser;
}

const toAuthUser = (user: BackendUser): AuthUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: roleMap[user.role],
  status: user.status,
  classId: user.classId,
  phone: user.phone,
});

const toSession = (payload: BackendSessionResponse): AuthSession => ({
  accessToken: payload.accessToken,
  tokenType: payload.tokenType,
  user: toAuthUser(payload.user),
});

const safeParseSession = (value: string | null) => {
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
};

export const authService = {
  getStoredSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    return safeParseSession(window.localStorage.getItem(SESSION_STORAGE_KEY));
  },

  storeSession(session: AuthSession) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Connexion impossible.');
    }

    const session = toSession(payload as BackendSessionResponse);
    this.storeSession(session);
    return session;
  },

  async activateInvitation(email: string, code: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/activate-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Activation impossible.');
    }

    return payload;
  },
};
