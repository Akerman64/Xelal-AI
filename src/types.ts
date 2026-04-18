/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'teacher' | 'admin' | 'student' | 'parent';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatar?: string;
  classId?: string; // For students/teachers
}

export interface Student extends User {
  role: 'student';
  parentPhone: string;
  grades: Grade[];
  attendance: Attendance[];
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  value: number;
  coefficient: number;
  date: string;
  comment?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  reason?: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  students: string[]; // IDs
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'ai_feedback' | 'alert';
}

export interface AIAnalysis {
  studentId: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  timestamp: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: AccountStatus;
  classId?: string;
  phone?: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
}
