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
const nowIso = () => new Date().toISOString();
const plusDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const schools: DevSchool[] = [
  {
    id: "school_xelal_1",
    name: "Xelal Academy Dakar",
    country: "Senegal",
    timezone: "Africa/Dakar",
  },
];

const users: DevUser[] = [
  {
    id: "admin_1",
    schoolId: "school_xelal_1",
    firstName: "Aissatou",
    lastName: "Camara",
    email: "admin@xelal.ai",
    role: "ADMIN",
    status: "ACTIVE",
    passwordHash: hashPassword("admin123"),
  },
  {
    id: "teacher_1",
    schoolId: "school_xelal_1",
    classId: "class_term_s1",
    firstName: "Mamadou",
    lastName: "Sow",
    email: "teacher@xelal.ai",
    phone: "+221770000010",
    role: "TEACHER",
    status: "ACTIVE",
    passwordHash: hashPassword("teacher123"),
  },
  {
    id: "student_1",
    schoolId: "school_xelal_1",
    classId: "class_term_s1",
    firstName: "Moussa",
    lastName: "Diop",
    email: "student@xelal.ai",
    phone: "+221770000011",
    role: "STUDENT",
    status: "ACTIVE",
    passwordHash: hashPassword("student123"),
  },
  {
    id: "student_2",
    schoolId: "school_xelal_1",
    classId: "class_term_s1",
    firstName: "Awa",
    lastName: "Ndiaye",
    email: "student2@xelal.ai",
    phone: "+221770000012",
    role: "STUDENT",
    status: "ACTIVE",
    passwordHash: hashPassword("student123"),
  },
  {
    id: "parent_1",
    schoolId: "school_xelal_1",
    firstName: "Fatou",
    lastName: "Diop",
    email: "parent@xelal.ai",
    phone: "+221770000001",
    role: "PARENT",
    status: "ACTIVE",
    passwordHash: hashPassword("parent123"),
  },
  {
    id: "teacher_pending_1",
    schoolId: "school_xelal_1",
    firstName: "Khady",
    lastName: "Ba",
    email: "khady.ba@xelal.ai",
    phone: "+221770000013",
    role: "TEACHER",
    status: "PENDING",
  },
];

const invitations: DevInvitation[] = [
  {
    id: "invite_teacher_pending_1",
    schoolId: "school_xelal_1",
    userId: "teacher_pending_1",
    email: "khady.ba@xelal.ai",
    role: "TEACHER",
    code: "482731",
    status: "PENDING",
    createdAt: nowIso(),
    expiresAt: plusDays(7),
  },
];

const classes: DevClass[] = [
  {
    id: "class_term_s1",
    schoolId: "school_xelal_1",
    academicYearId: "ay_2025_2026",
    name: "Terminale S1",
    level: "Terminale",
    studentIds: ["student_1", "student_2"],
    teacherIds: ["teacher_1"],
  },
];

const academicYears: DevAcademicYear[] = [
  {
    id: "ay_2025_2026",
    schoolId: "school_xelal_1",
    name: "2025-2026",
    isActive: true,
  },
];

const subjects: DevSubject[] = [
  {
    id: "subject_math",
    schoolId: "school_xelal_1",
    name: "Mathematiques",
    coefficientDefault: 4,
  },
  {
    id: "subject_fr",
    schoolId: "school_xelal_1",
    name: "Francais",
    coefficientDefault: 3,
  },
  {
    id: "subject_pc",
    schoolId: "school_xelal_1",
    name: "Physique-Chimie",
    coefficientDefault: 4,
  },
];

const teacherAssignments: DevTeacherAssignment[] = [
  { id: "ta_1", teacherId: "teacher_1", classId: "class_term_s1", subjectId: "subject_math" },
  { id: "ta_2", teacherId: "teacher_1", classId: "class_term_s1", subjectId: "subject_fr" },
  { id: "ta_3", teacherId: "teacher_1", classId: "class_term_s1", subjectId: "subject_pc" },
];

const assessments: DevAssessment[] = [
  {
    id: "assessment_math_quiz_1",
    classId: "class_term_s1",
    subjectId: "subject_math",
    teacherId: "teacher_1",
    title: "Interrogation 1",
    type: "QUIZ",
    coefficient: 1,
    date: "2026-04-10",
  },
  {
    id: "assessment_math_exam_1",
    classId: "class_term_s1",
    subjectId: "subject_math",
    teacherId: "teacher_1",
    title: "Devoir surveille 1",
    type: "EXAM",
    coefficient: 2,
    date: "2026-04-15",
  },
  {
    id: "assessment_fr_hw_1",
    classId: "class_term_s1",
    subjectId: "subject_fr",
    teacherId: "teacher_1",
    title: "Dissertation courte",
    type: "HOMEWORK",
    coefficient: 1,
    date: "2026-04-12",
  },
];

const grades: DevGrade[] = [
  { id: "grade_1", assessmentId: "assessment_math_quiz_1", studentId: "student_1", value: 14 },
  {
    id: "grade_2",
    assessmentId: "assessment_math_exam_1",
    studentId: "student_1",
    value: 8,
    comment: "Besoin de revoir les equations",
  },
  { id: "grade_3", assessmentId: "assessment_fr_hw_1", studentId: "student_1", value: 12 },
  { id: "grade_4", assessmentId: "assessment_math_quiz_1", studentId: "student_2", value: 18 },
  { id: "grade_5", assessmentId: "assessment_math_exam_1", studentId: "student_2", value: 16 },
  { id: "grade_6", assessmentId: "assessment_fr_hw_1", studentId: "student_2", value: 15 },
];

const attendanceSessions: DevAttendanceSession[] = [
  {
    id: "attendance_session_1",
    classId: "class_term_s1",
    teacherId: "teacher_1",
    subjectId: "subject_math",
    date: "2026-04-16",
  },
  {
    id: "attendance_session_2",
    classId: "class_term_s1",
    teacherId: "teacher_1",
    subjectId: "subject_fr",
    date: "2026-04-17",
  },
];

const attendanceRecords: DevAttendanceRecord[] = [
  {
    id: "attendance_record_1",
    sessionId: "attendance_session_1",
    studentId: "student_1",
    status: "ABSENT",
    reason: "Maladie",
  },
  { id: "attendance_record_2", sessionId: "attendance_session_1", studentId: "student_2", status: "PRESENT" },
  {
    id: "attendance_record_3",
    sessionId: "attendance_session_2",
    studentId: "student_1",
    status: "LATE",
    minutesLate: 10,
  },
  { id: "attendance_record_4", sessionId: "attendance_session_2", studentId: "student_2", status: "PRESENT" },
];

const messages: DevMessage[] = [
  {
    id: "msg_1",
    teacherId: "teacher_1",
    parentUserId: "parent_1",
    studentId: "student_1",
    content: "Bonjour, Moussa a été absent ce matin. Je vous envoie le certificat médical demain.",
    senderRole: "PARENT",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg_2",
    teacherId: "teacher_1",
    parentUserId: "parent_1",
    studentId: "student_1",
    content: "Bonjour Mme Diop. Pas de problème, j'ai mis les cours à disposition. Bon rétablissement à Moussa !",
    senderRole: "TEACHER",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const timeSlots: DevTimeSlot[] = [
  { id: "ts_1", classId: "class_term_s1", subjectId: "subject_math", teacherId: "teacher_1", day: "Lundi",    startTime: "08:00", endTime: "10:00", room: "Salle A1" },
  { id: "ts_2", classId: "class_term_s1", subjectId: "subject_fr",   teacherId: "teacher_1", day: "Lundi",    startTime: "10:30", endTime: "12:30", room: "Salle A1" },
  { id: "ts_3", classId: "class_term_s1", subjectId: "subject_pc",   teacherId: "teacher_1", day: "Mardi",    startTime: "08:00", endTime: "10:00", room: "Salle B2" },
  { id: "ts_4", classId: "class_term_s1", subjectId: "subject_math", teacherId: "teacher_1", day: "Mercredi", startTime: "14:00", endTime: "16:00", room: "Salle A3" },
  { id: "ts_5", classId: "class_term_s1", subjectId: "subject_pc",   teacherId: "teacher_1", day: "Jeudi",    startTime: "08:30", endTime: "10:30", room: "Salle B2" },
  { id: "ts_6", classId: "class_term_s1", subjectId: "subject_fr",   teacherId: "teacher_1", day: "Vendredi", startTime: "11:00", endTime: "13:00", room: "Salle C1" },
];

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
