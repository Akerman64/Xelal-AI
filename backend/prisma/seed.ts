import {
  AssessmentType,
  AttendanceStatus,
  EnrollmentStatus,
  InvitationStatus,
  PrismaClient,
  Role,
  UserStatus,
} from "@prisma/client";
import { hashPassword } from "../src/modules/core/password";

const prisma = new PrismaClient();

async function main() {
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.message.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.teacherRecommendation.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.term.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  await prisma.school.create({
    data: {
      id: "school_xelal_1",
      name: "Xelal Academy Dakar",
      country: "Senegal",
      timezone: "Africa/Dakar",
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: "admin_1",
        schoolId: "school_xelal_1",
        firstName: "Aissatou",
        lastName: "Camara",
        email: "admin@xelal.ai",
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword("admin123"),
      },
      {
        id: "teacher_1",
        schoolId: "school_xelal_1",
        firstName: "Mamadou",
        lastName: "Sow",
        email: "teacher@xelal.ai",
        phone: "+221770000010",
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword("teacher123"),
      },
      {
        id: "student_1",
        schoolId: "school_xelal_1",
        firstName: "Moussa",
        lastName: "Diop",
        email: "student@xelal.ai",
        phone: "+221770000011",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword("student123"),
      },
      {
        id: "student_2",
        schoolId: "school_xelal_1",
        firstName: "Awa",
        lastName: "Ndiaye",
        email: "student2@xelal.ai",
        phone: "+221770000012",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword("student123"),
      },
      {
        id: "parent_1",
        schoolId: "school_xelal_1",
        firstName: "Fatou",
        lastName: "Diop",
        email: "parent@xelal.ai",
        phone: "+221770000001",
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword("parent123"),
      },
      {
        id: "teacher_pending_1",
        schoolId: "school_xelal_1",
        firstName: "Khady",
        lastName: "Ba",
        email: "khady.ba@xelal.ai",
        phone: "+221770000013",
        role: Role.TEACHER,
        status: UserStatus.PENDING,
      },
    ],
  });

  await prisma.teacher.createMany({
    data: [
      { id: "teacher_1", userId: "teacher_1", employeeCode: "ENS-001" },
      { id: "teacher_pending_1", userId: "teacher_pending_1", employeeCode: "ENS-002" },
    ],
  });

  await prisma.student.createMany({
    data: [
      { id: "student_1", userId: "student_1", matricule: "MAT-001" },
      { id: "student_2", userId: "student_2", matricule: "MAT-002" },
    ],
  });

  await prisma.parentStudent.create({
    data: {
      parentUserId: "parent_1",
      studentId: "student_1",
      relationship: "MOTHER",
      isPrimary: true,
    },
  });

  await prisma.invitation.create({
    data: {
      id: "invite_teacher_pending_1",
      schoolId: "school_xelal_1",
      userId: "teacher_pending_1",
      email: "khady.ba@xelal.ai",
      role: Role.TEACHER,
      code: "482731",
      status: InvitationStatus.PENDING,
      expiresAt: new Date("2026-04-25T00:00:00.000Z"),
      createdAt: new Date("2026-04-18T00:00:00.000Z"),
    },
  });

  await prisma.academicYear.create({
    data: {
      id: "ay_2025_2026",
      schoolId: "school_xelal_1",
      name: "2025-2026",
      startDate: new Date("2025-10-01T00:00:00.000Z"),
      endDate: new Date("2026-07-31T00:00:00.000Z"),
      isActive: true,
    },
  });

  await prisma.term.createMany({
    data: [
      {
        id: "term_1",
        academicYearId: "ay_2025_2026",
        name: "Trimestre 1",
        startDate: new Date("2025-10-01T00:00:00.000Z"),
        endDate: new Date("2025-12-31T00:00:00.000Z"),
        orderIndex: 1,
      },
      {
        id: "term_2",
        academicYearId: "ay_2025_2026",
        name: "Trimestre 2",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-03-31T00:00:00.000Z"),
        orderIndex: 2,
      },
      {
        id: "term_3",
        academicYearId: "ay_2025_2026",
        name: "Trimestre 3",
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-07-31T00:00:00.000Z"),
        orderIndex: 3,
      },
    ],
  });

  await prisma.class.create({
    data: {
      id: "class_term_s1",
      schoolId: "school_xelal_1",
      academicYearId: "ay_2025_2026",
      name: "Terminale S1",
      level: "Terminale",
    },
  });

  await prisma.studentEnrollment.createMany({
    data: [
      {
        id: "enrollment_1",
        studentId: "student_1",
        classId: "class_term_s1",
        academicYearId: "ay_2025_2026",
        status: EnrollmentStatus.ACTIVE,
      },
      {
        id: "enrollment_2",
        studentId: "student_2",
        classId: "class_term_s1",
        academicYearId: "ay_2025_2026",
        status: EnrollmentStatus.ACTIVE,
      },
    ],
  });

  await prisma.subject.createMany({
    data: [
      {
        id: "subject_math",
        schoolId: "school_xelal_1",
        name: "Mathematiques",
        code: "MATH",
        coefficientDefault: 4,
      },
      {
        id: "subject_fr",
        schoolId: "school_xelal_1",
        name: "Francais",
        code: "FR",
        coefficientDefault: 3,
      },
      {
        id: "subject_pc",
        schoolId: "school_xelal_1",
        name: "Physique-Chimie",
        code: "PC",
        coefficientDefault: 4,
      },
    ],
  });

  await prisma.teacherAssignment.createMany({
    data: [
      { id: "assignment_1", teacherId: "teacher_1", classId: "class_term_s1", subjectId: "subject_math" },
      { id: "assignment_2", teacherId: "teacher_1", classId: "class_term_s1", subjectId: "subject_fr" },
      { id: "assignment_3", teacherId: "teacher_1", classId: "class_term_s1", subjectId: "subject_pc" },
    ],
  });

  await prisma.assessment.createMany({
    data: [
      {
        id: "assessment_math_quiz_1",
        classId: "class_term_s1",
        subjectId: "subject_math",
        teacherId: "teacher_1",
        termId: "term_3",
        title: "Interrogation 1",
        type: AssessmentType.QUIZ,
        coefficient: 1,
        date: new Date("2026-04-10T00:00:00.000Z"),
      },
      {
        id: "assessment_math_exam_1",
        classId: "class_term_s1",
        subjectId: "subject_math",
        teacherId: "teacher_1",
        termId: "term_3",
        title: "Devoir surveille 1",
        type: AssessmentType.EXAM,
        coefficient: 2,
        date: new Date("2026-04-15T00:00:00.000Z"),
      },
      {
        id: "assessment_fr_hw_1",
        classId: "class_term_s1",
        subjectId: "subject_fr",
        teacherId: "teacher_1",
        termId: "term_3",
        title: "Dissertation courte",
        type: AssessmentType.HOMEWORK,
        coefficient: 1,
        date: new Date("2026-04-12T00:00:00.000Z"),
      },
    ],
  });

  await prisma.grade.createMany({
    data: [
      { id: "grade_1", assessmentId: "assessment_math_quiz_1", studentId: "student_1", value: 14 },
      { id: "grade_2", assessmentId: "assessment_math_exam_1", studentId: "student_1", value: 8, comment: "Besoin de revoir les equations" },
      { id: "grade_3", assessmentId: "assessment_fr_hw_1", studentId: "student_1", value: 12 },
      { id: "grade_4", assessmentId: "assessment_math_quiz_1", studentId: "student_2", value: 18 },
      { id: "grade_5", assessmentId: "assessment_math_exam_1", studentId: "student_2", value: 16 },
      { id: "grade_6", assessmentId: "assessment_fr_hw_1", studentId: "student_2", value: 15 },
    ],
  });

  await prisma.attendanceSession.createMany({
    data: [
      {
        id: "attendance_session_1",
        classId: "class_term_s1",
        teacherId: "teacher_1",
        subjectId: "subject_math",
        date: new Date("2026-04-16T00:00:00.000Z"),
      },
      {
        id: "attendance_session_2",
        classId: "class_term_s1",
        teacherId: "teacher_1",
        subjectId: "subject_fr",
        date: new Date("2026-04-17T00:00:00.000Z"),
      },
    ],
  });

  await prisma.attendanceRecord.createMany({
    data: [
      {
        id: "attendance_record_1",
        sessionId: "attendance_session_1",
        studentId: "student_1",
        status: AttendanceStatus.ABSENT,
        reason: "Maladie",
      },
      {
        id: "attendance_record_2",
        sessionId: "attendance_session_1",
        studentId: "student_2",
        status: AttendanceStatus.PRESENT,
      },
      {
        id: "attendance_record_3",
        sessionId: "attendance_session_2",
        studentId: "student_1",
        status: AttendanceStatus.LATE,
        minutesLate: 10,
      },
      {
        id: "attendance_record_4",
        sessionId: "attendance_session_2",
        studentId: "student_2",
        status: AttendanceStatus.PRESENT,
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        id: "message_1",
        teacherId: "teacher_1",
        parentUserId: "parent_1",
        studentId: "student_1",
        content: "Bonjour, je souhaite le détail des notes de cette semaine.",
        senderRole: "PARENT",
        createdAt: new Date("2026-04-17T08:10:00.000Z"),
      },
      {
        id: "message_2",
        teacherId: "teacher_1",
        parentUserId: "parent_1",
        studentId: "student_1",
        content: "Bonjour Madame Diop, Moussa a reçu 14/20 puis 8/20 en mathématiques cette semaine.",
        senderRole: "TEACHER",
        createdAt: new Date("2026-04-17T08:30:00.000Z"),
      },
      {
        id: "message_3",
        teacherId: "teacher_1",
        parentUserId: "parent_1",
        studentId: "student_1",
        content: "Merci, je vais revoir les exercices avec lui ce soir.",
        senderRole: "PARENT",
        createdAt: new Date("2026-04-17T08:45:00.000Z"),
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
