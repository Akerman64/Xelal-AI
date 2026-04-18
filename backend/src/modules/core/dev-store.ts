import { randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "./password";

export type AppRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
export type AppUserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface DevUser {
  id: string;
  schoolId: string;
  classId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: AppRole;
  status: AppUserStatus;
  passwordHash?: string;
  mustChangePassword?: boolean;
}

export interface DevInvitation {
  id: string;
  schoolId: string;
  userId: string;
  email: string;
  role: AppRole;
  code: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface DevClass {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  level: string;
  studentIds: string[];
  teacherIds: string[];
}

export interface DevSchool {
  id: string;
  name: string;
  country: string;
  timezone: string;
}

export interface DevAcademicYear {
  id: string;
  schoolId: string;
  name: string;
  isActive: boolean;
}

export interface DevSubject {
  id: string;
  schoolId: string;
  name: string;
  coefficientDefault: number;
}

export interface DevAssessment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  type: "QUIZ" | "HOMEWORK" | "EXAM" | "PROJECT";
  coefficient: number;
  date: string;
}

export interface DevGrade {
  id: string;
  assessmentId: string;
  studentId: string;
  value: number;
  comment?: string;
}

export interface DevAttendanceSession {
  id: string;
  classId: string;
  teacherId: string;
  subjectId?: string;
  date: string;
}

export interface DevAttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  reason?: string;
  minutesLate?: number;
}

export interface DevTeacherAssignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

export interface DevMessage {
  id: string;
  teacherId: string;   // user ID de l'enseignant
  parentUserId: string; // user ID du parent
  studentId: string;   // élève concerné (pour contexte)
  content: string;
  senderRole: 'TEACHER' | 'PARENT';
  createdAt: string;
  teacherReadAt?: string;
}

export type WeekDay = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';

export interface DevTimeSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  day: WeekDay;
  startTime: string; // "08:00"
  endTime: string;   // "10:00"
  room?: string;
}

const createCode = () => String(randomInt(100000, 999999));

const schools: DevSchool[] = [
  {
    id: "school_xelal_1",
    name: "Xelal Academy Dakar",
    country: "Senegal",
    timezone: "Africa/Dakar",
  },
];

// Seul compte gardé : l'admin, nécessaire pour se connecter et tout créer depuis l'interface.
const users: DevUser[] = [
  {
    id: "admin_1",
    schoolId: "school_xelal_1",
    firstName: "Admin",
    lastName: "Xelal",
    email: "admin@xelal.ai",
    role: "ADMIN",
    status: "ACTIVE",
    passwordHash: hashPassword("admin123"),
  },
];

const invitations: DevInvitation[] = [];
const classes: DevClass[] = [];

// Année scolaire conservée : nécessaire pour la création de classes via l'interface.
const academicYears: DevAcademicYear[] = [
  {
    id: "ay_2025_2026",
    schoolId: "school_xelal_1",
    name: "2025-2026",
    isActive: true,
  },
];

const subjects: DevSubject[] = [];
const teacherAssignments: DevTeacherAssignment[] = [];
const assessments: DevAssessment[] = [];
const grades: DevGrade[] = [];
const attendanceSessions: DevAttendanceSession[] = [];
const attendanceRecords: DevAttendanceRecord[] = [];
const messages: DevMessage[] = [];
const timeSlots: DevTimeSlot[] = [];

export const devStore = {
  schools,
  users,
  invitations,
  classes,
  academicYears,
  subjects,
  teacherAssignments,
  assessments,
  grades,
  attendanceSessions,
  attendanceRecords,
  messages,
  timeSlots,
};

export const publicUser = (user: DevUser) => ({
  id: user.id,
  schoolId: user.schoolId,
  classId: user.classId,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  mustChangePassword: Boolean(user.mustChangePassword),
});

export const publicInvitation = (invitation: DevInvitation) => ({
  id: invitation.id,
  schoolId: invitation.schoolId,
  userId: invitation.userId,
  email: invitation.email,
  role: invitation.role,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
  acceptedAt: invitation.acceptedAt,
});

export const createId = (prefix: string) => `${prefix}_${randomUUID()}`;
export const createInvitationCode = () => createCode();
