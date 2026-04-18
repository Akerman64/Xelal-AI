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

export interface MessageContact {
  parentUserId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderRole: 'TEACHER' | 'PARENT' | null;
  unreadCount: number;
}

export interface MessageEntry {
  id: string;
  content: string;
  senderRole: 'TEACHER' | 'PARENT';
  createdAt: string;
}

export interface MessageThread {
  student: { id: string; firstName: string; lastName: string };
  parent: { id: string; firstName: string; lastName: string } | null;
  thread: MessageEntry[];
}

export const messageService = {
  async fetchContacts(session: AuthSession): Promise<MessageContact[]> {
    const response = await request<{ data: MessageContact[] }>('/api/teacher/messages', session);
    return response.data;
  },

  async fetchThread(session: AuthSession, studentId: string): Promise<MessageThread> {
    const response = await request<{ data: MessageThread }>(`/api/teacher/messages/${studentId}`, session);
    return response.data;
  },

  async sendMessage(session: AuthSession, studentId: string, content: string): Promise<MessageEntry> {
    const response = await request<{ data: MessageEntry }>(
      `/api/teacher/messages/${studentId}`,
      session,
      { method: 'POST', body: JSON.stringify({ content }) },
    );
    return response.data;
  },
};
