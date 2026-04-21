import { PrismaClient, Role, UserStatus, Gender, AssessmentType, AttendanceStatus, MessageSenderRole } from "@prisma/client";
import { hashPassword } from "../src/modules/core/password";

const prisma = new PrismaClient();

async function main() {
  // ── Nettoyage complet ────────────────────────────────────────────────────
  await prisma.timeSlotCancellation.deleteMany();
  await prisma.assessmentLesson.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.timeSlot.deleteMany();
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

  // ── École ────────────────────────────────────────────────────────────────
  await prisma.school.create({
    data: {
      id: "school_xelal_1",
      name: "Xelal Academy Dakar",
      country: "Senegal",
      timezone: "Africa/Dakar",
    },
  });

  // ── Année scolaire + Trimestres ──────────────────────────────────────────
  await prisma.academicYear.create({
    data: {
      id: "ay_2025_2026",
      schoolId: "school_xelal_1",
      name: "2025-2026",
      startDate: new Date("2025-10-01"),
      endDate: new Date("2026-07-31"),
      isActive: true,
    },
  });

  await prisma.term.createMany({
    data: [
      { id: "term_1", academicYearId: "ay_2025_2026", name: "Trimestre 1", startDate: new Date("2025-10-01"), endDate: new Date("2025-12-31"), orderIndex: 1 },
      { id: "term_2", academicYearId: "ay_2025_2026", name: "Trimestre 2", startDate: new Date("2026-01-01"), endDate: new Date("2026-03-31"), orderIndex: 2 },
      { id: "term_3", academicYearId: "ay_2025_2026", name: "Trimestre 3", startDate: new Date("2026-04-01"), endDate: new Date("2026-07-31"), orderIndex: 3 },
    ],
  });

  // ── Matières ────────────────────────────────────────────────────────────
  await prisma.subject.createMany({
    data: [
      { id: "subj_maths",    schoolId: "school_xelal_1", name: "Mathématiques",     code: "MATH", coefficientDefault: 5 },
      { id: "subj_physchim", schoolId: "school_xelal_1", name: "Physique-Chimie",    code: "PC",   coefficientDefault: 4 },
      { id: "subj_svt",      schoolId: "school_xelal_1", name: "SVT",                code: "SVT",  coefficientDefault: 3 },
      { id: "subj_fr",       schoolId: "school_xelal_1", name: "Français",           code: "FR",   coefficientDefault: 4 },
      { id: "subj_ang",      schoolId: "school_xelal_1", name: "Anglais",            code: "ANG",  coefficientDefault: 3 },
      { id: "subj_histgeo",  schoolId: "school_xelal_1", name: "Histoire-Géographie",code: "HG",   coefficientDefault: 3 },
      { id: "subj_philo",    schoolId: "school_xelal_1", name: "Philosophie",        code: "PHILO",coefficientDefault: 3 },
      { id: "subj_eps",      schoolId: "school_xelal_1", name: "EPS",                code: "EPS",  coefficientDefault: 1 },
    ],
  });

  // ── Classes ──────────────────────────────────────────────────────────────
  await prisma.class.createMany({
    data: [
      { id: "class_ts1", schoolId: "school_xelal_1", academicYearId: "ay_2025_2026", name: "Terminale S1", level: "Terminale", stream: "S" },
      { id: "class_ts2", schoolId: "school_xelal_1", academicYearId: "ay_2025_2026", name: "Terminale S2", level: "Terminale", stream: "S" },
      { id: "class_pl1", schoolId: "school_xelal_1", academicYearId: "ay_2025_2026", name: "Première L1",  level: "Première",  stream: "L" },
    ],
  });

  // ── Admin ────────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      id: "admin_1",
      schoolId: "school_xelal_1",
      firstName: "Admin",
      lastName: "Xelal",
      email: "admin@xelal.ai",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: hashPassword("admin123"),
    },
  });

  // ── Enseignants ──────────────────────────────────────────────────────────
  const teachers = [
    { userId: "user_t1", teacherId: "teacher_t1", firstName: "Mamadou",  lastName: "Sow",    email: "teacher@xelal.ai",   password: "teacher123" },
    { userId: "user_t2", teacherId: "teacher_t2", firstName: "Aissatou", lastName: "Diallo",  email: "diallo@xelal.ai",    password: "teacher123" },
    { userId: "user_t3", teacherId: "teacher_t3", firstName: "Ousmane",  lastName: "Fall",    email: "fall@xelal.ai",      password: "teacher123" },
    { userId: "user_t4", teacherId: "teacher_t4", firstName: "Mariama",  lastName: "Ndiaye",  email: "ndiaye@xelal.ai",    password: "teacher123" },
  ];

  for (const t of teachers) {
    await prisma.user.create({
      data: {
        id: t.userId,
        schoolId: "school_xelal_1",
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword(t.password),
      },
    });
    await prisma.teacher.create({ data: { id: t.teacherId, userId: t.userId } });
  }

  // ── Affectations enseignant → classe + matière ───────────────────────────
  // Sow : Maths — TS1, TS2
  // Diallo : Physique-Chimie + SVT — TS1, TS2
  // Fall : Français + Philosophie — TS1, TS2, PL1
  // Ndiaye : Anglais + Histoire-Géo — TS1, TS2, PL1 + EPS PL1
  const assignments = [
    // Sow — Maths
    { id: "asgn_t1_ts1_math",    teacherId: "teacher_t1", classId: "class_ts1", subjectId: "subj_maths",    coefficient: 5 },
    { id: "asgn_t1_ts2_math",    teacherId: "teacher_t1", classId: "class_ts2", subjectId: "subj_maths",    coefficient: 5 },
    // Diallo — PC + SVT
    { id: "asgn_t2_ts1_pc",      teacherId: "teacher_t2", classId: "class_ts1", subjectId: "subj_physchim", coefficient: 4 },
    { id: "asgn_t2_ts2_pc",      teacherId: "teacher_t2", classId: "class_ts2", subjectId: "subj_physchim", coefficient: 4 },
    { id: "asgn_t2_ts1_svt",     teacherId: "teacher_t2", classId: "class_ts1", subjectId: "subj_svt",      coefficient: 3 },
    { id: "asgn_t2_ts2_svt",     teacherId: "teacher_t2", classId: "class_ts2", subjectId: "subj_svt",      coefficient: 3 },
    // Fall — Français + Philo
    { id: "asgn_t3_ts1_fr",      teacherId: "teacher_t3", classId: "class_ts1", subjectId: "subj_fr",       coefficient: 4 },
    { id: "asgn_t3_ts2_fr",      teacherId: "teacher_t3", classId: "class_ts2", subjectId: "subj_fr",       coefficient: 4 },
    { id: "asgn_t3_pl1_fr",      teacherId: "teacher_t3", classId: "class_pl1", subjectId: "subj_fr",       coefficient: 5 },
    { id: "asgn_t3_ts1_philo",   teacherId: "teacher_t3", classId: "class_ts1", subjectId: "subj_philo",    coefficient: 3 },
    { id: "asgn_t3_ts2_philo",   teacherId: "teacher_t3", classId: "class_ts2", subjectId: "subj_philo",    coefficient: 3 },
    { id: "asgn_t3_pl1_philo",   teacherId: "teacher_t3", classId: "class_pl1", subjectId: "subj_philo",    coefficient: 3 },
    // Ndiaye — Anglais + HG + EPS
    { id: "asgn_t4_ts1_ang",     teacherId: "teacher_t4", classId: "class_ts1", subjectId: "subj_ang",      coefficient: 3 },
    { id: "asgn_t4_ts2_ang",     teacherId: "teacher_t4", classId: "class_ts2", subjectId: "subj_ang",      coefficient: 3 },
    { id: "asgn_t4_pl1_ang",     teacherId: "teacher_t4", classId: "class_pl1", subjectId: "subj_ang",      coefficient: 4 },
    { id: "asgn_t4_ts1_hg",      teacherId: "teacher_t4", classId: "class_ts1", subjectId: "subj_histgeo",  coefficient: 3 },
    { id: "asgn_t4_ts2_hg",      teacherId: "teacher_t4", classId: "class_ts2", subjectId: "subj_histgeo",  coefficient: 3 },
    { id: "asgn_t4_pl1_hg",      teacherId: "teacher_t4", classId: "class_pl1", subjectId: "subj_histgeo",  coefficient: 3 },
    { id: "asgn_t4_pl1_eps",     teacherId: "teacher_t4", classId: "class_pl1", subjectId: "subj_eps",      coefficient: 1 },
  ];
  await prisma.teacherAssignment.createMany({ data: assignments });

  // ── Emplois du temps ─────────────────────────────────────────────────────
  // Planifié sans aucun conflit prof (même prof, même créneau, classes différentes = interdit).
  //
  // Sow   (t1) : TS1 Lundi 8-10, Jeudi 8-10 | TS2 Lundi 14-16, Mercredi 14-16
  // Diallo(t2) : TS1 Lundi 10-12, Mercredi 8-10, Vendredi 8-10
  //              TS2 Mardi 8-10, Jeudi 10-12, Vendredi 10-12, Samedi 8-10
  // Fall  (t3) : TS1 Mardi 8-10, Jeudi 10-12, Samedi 8-10
  //              TS2 Mardi 14-16, Jeudi 14-16
  //              PL1 Lundi 8-10, Mercredi 8-10, Mercredi 10-12, Vendredi 10-12
  // Ndiaye(t4) : TS1 Mardi 10-12, Mercredi 10-12, Samedi 10-12
  //              TS2 Jeudi 8-10, Vendredi 8-10
  //              PL1 Lundi 10-12, Lundi 14-16, Vendredi 14-16, Samedi 8-10, Samedi 14-16

  // Terminale S1 (11 créneaux)
  await prisma.timeSlot.createMany({
    data: [
      { classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", day: "Lundi",    startTime: "08:00", endTime: "10:00", room: "A101" },
      { classId: "class_ts1", subjectId: "subj_physchim", teacherId: "teacher_t2", day: "Lundi",    startTime: "10:00", endTime: "12:00", room: "Labo 1" },
      { classId: "class_ts1", subjectId: "subj_fr",       teacherId: "teacher_t3", day: "Mardi",    startTime: "08:00", endTime: "10:00", room: "B202" },
      { classId: "class_ts1", subjectId: "subj_ang",      teacherId: "teacher_t4", day: "Mardi",    startTime: "10:00", endTime: "12:00", room: "B203" },
      { classId: "class_ts1", subjectId: "subj_svt",      teacherId: "teacher_t2", day: "Mercredi", startTime: "08:00", endTime: "10:00", room: "Labo 2" },
      { classId: "class_ts1", subjectId: "subj_histgeo",  teacherId: "teacher_t4", day: "Mercredi", startTime: "10:00", endTime: "12:00", room: "B202" },
      { classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", day: "Jeudi",    startTime: "08:00", endTime: "10:00", room: "A101" },
      { classId: "class_ts1", subjectId: "subj_philo",    teacherId: "teacher_t3", day: "Jeudi",    startTime: "10:00", endTime: "12:00", room: "B202" },
      { classId: "class_ts1", subjectId: "subj_physchim", teacherId: "teacher_t2", day: "Vendredi", startTime: "08:00", endTime: "10:00", room: "Labo 1" },
      { classId: "class_ts1", subjectId: "subj_fr",       teacherId: "teacher_t3", day: "Samedi",   startTime: "08:00", endTime: "10:00", room: "B202" },
      { classId: "class_ts1", subjectId: "subj_ang",      teacherId: "teacher_t4", day: "Samedi",   startTime: "10:00", endTime: "12:00", room: "B203" },
    ],
  });

  // Terminale S2 (10 créneaux)
  await prisma.timeSlot.createMany({
    data: [
      { classId: "class_ts2", subjectId: "subj_maths",    teacherId: "teacher_t1", day: "Lundi",    startTime: "14:00", endTime: "16:00", room: "A102" },
      { classId: "class_ts2", subjectId: "subj_physchim", teacherId: "teacher_t2", day: "Mardi",    startTime: "08:00", endTime: "10:00", room: "Labo 1" },
      { classId: "class_ts2", subjectId: "subj_fr",       teacherId: "teacher_t3", day: "Mardi",    startTime: "14:00", endTime: "16:00", room: "B204" },
      { classId: "class_ts2", subjectId: "subj_maths",    teacherId: "teacher_t1", day: "Mercredi", startTime: "14:00", endTime: "16:00", room: "A102" },
      { classId: "class_ts2", subjectId: "subj_histgeo",  teacherId: "teacher_t4", day: "Jeudi",    startTime: "08:00", endTime: "10:00", room: "B204" },
      { classId: "class_ts2", subjectId: "subj_svt",      teacherId: "teacher_t2", day: "Jeudi",    startTime: "10:00", endTime: "12:00", room: "Labo 2" },
      { classId: "class_ts2", subjectId: "subj_philo",    teacherId: "teacher_t3", day: "Jeudi",    startTime: "14:00", endTime: "16:00", room: "B204" },
      { classId: "class_ts2", subjectId: "subj_ang",      teacherId: "teacher_t4", day: "Vendredi", startTime: "08:00", endTime: "10:00", room: "B203" },
      { classId: "class_ts2", subjectId: "subj_physchim", teacherId: "teacher_t2", day: "Vendredi", startTime: "10:00", endTime: "12:00", room: "Labo 1" },
      { classId: "class_ts2", subjectId: "subj_svt",      teacherId: "teacher_t2", day: "Samedi",   startTime: "08:00", endTime: "10:00", room: "Labo 2" },
    ],
  });

  // Première L1 (9 créneaux — pas de Maths ni SVT/PC, littéraire)
  await prisma.timeSlot.createMany({
    data: [
      { classId: "class_pl1", subjectId: "subj_fr",      teacherId: "teacher_t3", day: "Lundi",    startTime: "08:00", endTime: "10:00", room: "C301" },
      { classId: "class_pl1", subjectId: "subj_ang",     teacherId: "teacher_t4", day: "Lundi",    startTime: "10:00", endTime: "12:00", room: "C302" },
      { classId: "class_pl1", subjectId: "subj_histgeo", teacherId: "teacher_t4", day: "Lundi",    startTime: "14:00", endTime: "16:00", room: "C302" },
      { classId: "class_pl1", subjectId: "subj_philo",   teacherId: "teacher_t3", day: "Mercredi", startTime: "08:00", endTime: "10:00", room: "C301" },
      { classId: "class_pl1", subjectId: "subj_fr",      teacherId: "teacher_t3", day: "Mercredi", startTime: "10:00", endTime: "12:00", room: "C301" },
      { classId: "class_pl1", subjectId: "subj_philo",   teacherId: "teacher_t3", day: "Vendredi", startTime: "10:00", endTime: "12:00", room: "C301" },
      { classId: "class_pl1", subjectId: "subj_histgeo", teacherId: "teacher_t4", day: "Vendredi", startTime: "14:00", endTime: "16:00", room: "C302" },
      { classId: "class_pl1", subjectId: "subj_ang",     teacherId: "teacher_t4", day: "Samedi",   startTime: "08:00", endTime: "10:00", room: "C302" },
      { classId: "class_pl1", subjectId: "subj_eps",     teacherId: "teacher_t4", day: "Samedi",   startTime: "14:00", endTime: "16:00", room: "Terrain" },
    ],
  });

  // ── Élèves — Terminale S1 (5 élèves) ────────────────────────────────────
  const studentsTS1 = [
    { userId: "user_s1",  studentId: "stu_s1",  firstName: "Moussa",    lastName: "Diop",   email: "student@xelal.ai",  password: "student123", gender: Gender.MALE },
    { userId: "user_s2",  studentId: "stu_s2",  firstName: "Awa",       lastName: "Ndiaye", email: "student2@xelal.ai", password: "student123", gender: Gender.FEMALE },
    { userId: "user_s3",  studentId: "stu_s3",  firstName: "Ibrahima",  lastName: "Sarr",   email: "sarr@xelal.ai",     password: "student123", gender: Gender.MALE },
    { userId: "user_s4",  studentId: "stu_s4",  firstName: "Fatou",     lastName: "Ba",     email: "fba@xelal.ai",      password: "student123", gender: Gender.FEMALE },
    { userId: "user_s5",  studentId: "stu_s5",  firstName: "Cheikh",    lastName: "Mbaye",  email: "cmbaye@xelal.ai",   password: "student123", gender: Gender.MALE },
  ];

  // Élèves — Terminale S2 (5 élèves)
  const studentsTS2 = [
    { userId: "user_s6",  studentId: "stu_s6",  firstName: "Aminata",   lastName: "Diallo", email: "adiallo@xelal.ai",  password: "student123", gender: Gender.FEMALE },
    { userId: "user_s7",  studentId: "stu_s7",  firstName: "Omar",      lastName: "Gueye",  email: "ogueye@xelal.ai",   password: "student123", gender: Gender.MALE },
    { userId: "user_s8",  studentId: "stu_s8",  firstName: "Rokhaya",   lastName: "Thiam",  email: "rthiam@xelal.ai",   password: "student123", gender: Gender.FEMALE },
    { userId: "user_s9",  studentId: "stu_s9",  firstName: "Pape",      lastName: "Seck",   email: "pseck@xelal.ai",    password: "student123", gender: Gender.MALE },
    { userId: "user_s10", studentId: "stu_s10", firstName: "Mariama",   lastName: "Fall",   email: "mfall@xelal.ai",    password: "student123", gender: Gender.FEMALE },
  ];

  // Élèves — Première L1 (4 élèves)
  const studentsPL1 = [
    { userId: "user_s11", studentId: "stu_s11", firstName: "Sokhna",    lastName: "Ly",     email: "sly@xelal.ai",      password: "student123", gender: Gender.FEMALE },
    { userId: "user_s12", studentId: "stu_s12", firstName: "Abdou",     lastName: "Cissé",  email: "acisse@xelal.ai",   password: "student123", gender: Gender.MALE },
    { userId: "user_s13", studentId: "stu_s13", firstName: "Binta",     lastName: "Kane",   email: "bkane@xelal.ai",    password: "student123", gender: Gender.FEMALE },
    { userId: "user_s14", studentId: "stu_s14", firstName: "Thierno",   lastName: "Sy",     email: "tsy@xelal.ai",      password: "student123", gender: Gender.MALE },
  ];

  const allStudents = [
    ...studentsTS1.map(s => ({ ...s, classId: "class_ts1" })),
    ...studentsTS2.map(s => ({ ...s, classId: "class_ts2" })),
    ...studentsPL1.map(s => ({ ...s, classId: "class_pl1" })),
  ];

  for (const s of allStudents) {
    await prisma.user.create({
      data: {
        id: s.userId,
        schoolId: "school_xelal_1",
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash: hashPassword(s.password),
      },
    });
    await prisma.student.create({ data: { id: s.studentId, userId: s.userId, gender: s.gender } });
    await prisma.studentEnrollment.create({
      data: {
        studentId: s.studentId,
        classId: s.classId,
        academicYearId: "ay_2025_2026",
        status: "ACTIVE",
      },
    });
  }

  // ── Évaluations + Notes ─────────────────────────────────────────────────
  // Terminale S1 — Trimestre 1 + 2
  const assessmentsTS1 = [
    // Maths T1
    { id: "asmt_ts1_math_t1_1", classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_1", title: "Devoir 1 — Suites numériques",     type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2025-10-20") },
    { id: "asmt_ts1_math_t1_2", classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_1", title: "Composition 1 — Analyse",           type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-11-25") },
    { id: "asmt_ts1_math_t2_1", classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_2", title: "Devoir 2 — Géométrie",              type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-01-20") },
    { id: "asmt_ts1_math_t2_2", classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_2", title: "Composition 2 — Probabilités",      type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2026-02-28") },
    // Physique-Chimie T1
    { id: "asmt_ts1_pc_t1_1",   classId: "class_ts1", subjectId: "subj_physchim", teacherId: "teacher_t2", termId: "term_1", title: "TP 1 — Cinétique chimique",         type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-10-28") },
    { id: "asmt_ts1_pc_t1_2",   classId: "class_ts1", subjectId: "subj_physchim", teacherId: "teacher_t2", termId: "term_1", title: "Composition 1 — Mécanique",         type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-02") },
    { id: "asmt_ts1_pc_t2_1",   classId: "class_ts1", subjectId: "subj_physchim", teacherId: "teacher_t2", termId: "term_2", title: "Devoir 3 — Électricité",            type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-02-05") },
    // SVT T1
    { id: "asmt_ts1_svt_t1_1",  classId: "class_ts1", subjectId: "subj_svt",      teacherId: "teacher_t2", termId: "term_1", title: "Contrôle — Génétique",              type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-11-10") },
    { id: "asmt_ts1_svt_t2_1",  classId: "class_ts1", subjectId: "subj_svt",      teacherId: "teacher_t2", termId: "term_2", title: "Composition — Écosystèmes",         type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2026-02-15") },
    // Français T1
    { id: "asmt_ts1_fr_t1_1",   classId: "class_ts1", subjectId: "subj_fr",       teacherId: "teacher_t3", termId: "term_1", title: "Dissertation — Victor Hugo",        type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2025-11-05") },
    { id: "asmt_ts1_fr_t1_2",   classId: "class_ts1", subjectId: "subj_fr",       teacherId: "teacher_t3", termId: "term_1", title: "Composition Français T1",           type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-05") },
    { id: "asmt_ts1_fr_t2_1",   classId: "class_ts1", subjectId: "subj_fr",       teacherId: "teacher_t3", termId: "term_2", title: "Commentaire — Poésie moderne",      type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-02-10") },
    // Anglais T1
    { id: "asmt_ts1_ang_t1_1",  classId: "class_ts1", subjectId: "subj_ang",      teacherId: "teacher_t4", termId: "term_1", title: "Reading Comprehension T1",          type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-11-12") },
    { id: "asmt_ts1_ang_t2_1",  classId: "class_ts1", subjectId: "subj_ang",      teacherId: "teacher_t4", termId: "term_2", title: "Essay — Environment",               type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-01-28") },
    // Histoire-Géo T1
    { id: "asmt_ts1_hg_t1_1",   classId: "class_ts1", subjectId: "subj_histgeo",  teacherId: "teacher_t4", termId: "term_1", title: "Dissertation — Décolonisation",     type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-08") },
    { id: "asmt_ts1_hg_t2_1",   classId: "class_ts1", subjectId: "subj_histgeo",  teacherId: "teacher_t4", termId: "term_2", title: "Commentaire de docs — Mondialisation", type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-03-05") },
    // Philosophie T1
    { id: "asmt_ts1_phi_t1_1",  classId: "class_ts1", subjectId: "subj_philo",    teacherId: "teacher_t3", termId: "term_1", title: "Dissertation — Liberté et déterminisme", type: AssessmentType.EXAM, coefficient: 2, date: new Date("2025-12-10") },
    { id: "asmt_ts1_phi_t2_1",  classId: "class_ts1", subjectId: "subj_philo",    teacherId: "teacher_t3", termId: "term_2", title: "Explication de texte — Descartes",  type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-03-10") },
  ];

  // Terminale S2
  const assessmentsTS2 = [
    { id: "asmt_ts2_math_t1_1", classId: "class_ts2", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_1", title: "Devoir 1 — Fonctions",              type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2025-10-22") },
    { id: "asmt_ts2_math_t1_2", classId: "class_ts2", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_1", title: "Composition 1 — Algèbre",           type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-11-27") },
    { id: "asmt_ts2_math_t2_1", classId: "class_ts2", subjectId: "subj_maths",    teacherId: "teacher_t1", termId: "term_2", title: "Devoir 2 — Intégrales",             type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-01-22") },
    { id: "asmt_ts2_pc_t1_1",   classId: "class_ts2", subjectId: "subj_physchim", teacherId: "teacher_t2", termId: "term_1", title: "TP — Titrage",                      type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-10-30") },
    { id: "asmt_ts2_pc_t1_2",   classId: "class_ts2", subjectId: "subj_physchim", teacherId: "teacher_t2", termId: "term_1", title: "Composition 1 — Optique",           type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-03") },
    { id: "asmt_ts2_svt_t1_1",  classId: "class_ts2", subjectId: "subj_svt",      teacherId: "teacher_t2", termId: "term_1", title: "Contrôle — Neurophysiologie",       type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-11-15") },
    { id: "asmt_ts2_fr_t1_1",   classId: "class_ts2", subjectId: "subj_fr",       teacherId: "teacher_t3", termId: "term_1", title: "Texte argumentatif",                type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2025-11-08") },
    { id: "asmt_ts2_fr_t1_2",   classId: "class_ts2", subjectId: "subj_fr",       teacherId: "teacher_t3", termId: "term_1", title: "Composition Français T1",           type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-06") },
    { id: "asmt_ts2_ang_t1_1",  classId: "class_ts2", subjectId: "subj_ang",      teacherId: "teacher_t4", termId: "term_1", title: "Grammar Test T1",                   type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-11-18") },
    { id: "asmt_ts2_hg_t1_1",   classId: "class_ts2", subjectId: "subj_histgeo",  teacherId: "teacher_t4", termId: "term_1", title: "Dissertation — Guerre froide",      type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-09") },
    { id: "asmt_ts2_phi_t1_1",  classId: "class_ts2", subjectId: "subj_philo",    teacherId: "teacher_t3", termId: "term_1", title: "Dissertation — Bonheur et morale",  type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-11") },
  ];

  // Première L1
  const assessmentsPL1 = [
    { id: "asmt_pl1_fr_t1_1",   classId: "class_pl1", subjectId: "subj_fr",      teacherId: "teacher_t3", termId: "term_1", title: "Commentaire — Le Horla",            type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2025-10-25") },
    { id: "asmt_pl1_fr_t1_2",   classId: "class_pl1", subjectId: "subj_fr",      teacherId: "teacher_t3", termId: "term_1", title: "Composition Français T1",           type: AssessmentType.EXAM,     coefficient: 3, date: new Date("2025-12-04") },
    { id: "asmt_pl1_fr_t2_1",   classId: "class_pl1", subjectId: "subj_fr",      teacherId: "teacher_t3", termId: "term_2", title: "Dissertation — Roman et réalité",   type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2026-02-12") },
    { id: "asmt_pl1_ang_t1_1",  classId: "class_pl1", subjectId: "subj_ang",     teacherId: "teacher_t4", termId: "term_1", title: "Oral Presentation",                 type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-11-20") },
    { id: "asmt_pl1_ang_t1_2",  classId: "class_pl1", subjectId: "subj_ang",     teacherId: "teacher_t4", termId: "term_1", title: "Composition Anglais T1",            type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-07") },
    { id: "asmt_pl1_hg_t1_1",   classId: "class_pl1", subjectId: "subj_histgeo", teacherId: "teacher_t4", termId: "term_1", title: "Commentaire — Sources historiques", type: AssessmentType.HOMEWORK, coefficient: 1, date: new Date("2025-11-14") },
    { id: "asmt_pl1_hg_t1_2",   classId: "class_pl1", subjectId: "subj_histgeo", teacherId: "teacher_t4", termId: "term_1", title: "Composition — Afrique contemporaine",type: AssessmentType.EXAM,    coefficient: 2, date: new Date("2025-12-12") },
    { id: "asmt_pl1_phi_t1_1",  classId: "class_pl1", subjectId: "subj_philo",   teacherId: "teacher_t3", termId: "term_1", title: "Dissertation — L'État",             type: AssessmentType.EXAM,     coefficient: 2, date: new Date("2025-12-15") },
    { id: "asmt_pl1_eps_t1_1",  classId: "class_pl1", subjectId: "subj_eps",     teacherId: "teacher_t4", termId: "term_1", title: "Évaluation EPS T1",                 type: AssessmentType.QUIZ,     coefficient: 1, date: new Date("2025-11-28") },
  ];

  await prisma.assessment.createMany({ data: [...assessmentsTS1, ...assessmentsTS2, ...assessmentsPL1] });

  // ── Notes — profils variés pour l'IA ────────────────────────────────────
  // TS1 :
  //   Moussa Diop    — élève moyen, faible en Maths, bien en Français
  //   Awa Ndiaye     — excellente dans tout, régulière
  //   Ibrahima Sarr  — très faible, en danger, beaucoup d'absences
  //   Fatou Ba       — bonne, forte en Sciences
  //   Cheikh Mbaye   — moyen, faible en Anglais, souvent absent

  const gradesTS1: Array<{ assessmentId: string; studentId: string; value: number; comment?: string }> = [
    // Moussa — moyen/faible maths
    { assessmentId: "asmt_ts1_math_t1_1", studentId: "stu_s1", value: 9.5 },
    { assessmentId: "asmt_ts1_math_t1_2", studentId: "stu_s1", value: 8.0, comment: "Difficultés en analyse" },
    { assessmentId: "asmt_ts1_math_t2_1", studentId: "stu_s1", value: 10.5 },
    { assessmentId: "asmt_ts1_math_t2_2", studentId: "stu_s1", value: 9.0 },
    { assessmentId: "asmt_ts1_pc_t1_1",   studentId: "stu_s1", value: 11.0 },
    { assessmentId: "asmt_ts1_pc_t1_2",   studentId: "stu_s1", value: 10.0 },
    { assessmentId: "asmt_ts1_pc_t2_1",   studentId: "stu_s1", value: 11.5 },
    { assessmentId: "asmt_ts1_svt_t1_1",  studentId: "stu_s1", value: 13.0 },
    { assessmentId: "asmt_ts1_svt_t2_1",  studentId: "stu_s1", value: 12.5 },
    { assessmentId: "asmt_ts1_fr_t1_1",   studentId: "stu_s1", value: 14.0 },
    { assessmentId: "asmt_ts1_fr_t1_2",   studentId: "stu_s1", value: 13.5 },
    { assessmentId: "asmt_ts1_fr_t2_1",   studentId: "stu_s1", value: 14.5 },
    { assessmentId: "asmt_ts1_ang_t1_1",  studentId: "stu_s1", value: 11.5 },
    { assessmentId: "asmt_ts1_ang_t2_1",  studentId: "stu_s1", value: 12.0 },
    { assessmentId: "asmt_ts1_hg_t1_1",   studentId: "stu_s1", value: 13.0 },
    { assessmentId: "asmt_ts1_hg_t2_1",   studentId: "stu_s1", value: 12.0 },
    { assessmentId: "asmt_ts1_phi_t1_1",  studentId: "stu_s1", value: 12.5 },
    { assessmentId: "asmt_ts1_phi_t2_1",  studentId: "stu_s1", value: 13.0 },

    // Awa — excellente
    { assessmentId: "asmt_ts1_math_t1_1", studentId: "stu_s2", value: 18.5 },
    { assessmentId: "asmt_ts1_math_t1_2", studentId: "stu_s2", value: 17.0 },
    { assessmentId: "asmt_ts1_math_t2_1", studentId: "stu_s2", value: 19.0 },
    { assessmentId: "asmt_ts1_math_t2_2", studentId: "stu_s2", value: 18.0 },
    { assessmentId: "asmt_ts1_pc_t1_1",   studentId: "stu_s2", value: 17.5 },
    { assessmentId: "asmt_ts1_pc_t1_2",   studentId: "stu_s2", value: 16.5 },
    { assessmentId: "asmt_ts1_pc_t2_1",   studentId: "stu_s2", value: 17.0 },
    { assessmentId: "asmt_ts1_svt_t1_1",  studentId: "stu_s2", value: 18.0 },
    { assessmentId: "asmt_ts1_svt_t2_1",  studentId: "stu_s2", value: 17.5 },
    { assessmentId: "asmt_ts1_fr_t1_1",   studentId: "stu_s2", value: 16.0 },
    { assessmentId: "asmt_ts1_fr_t1_2",   studentId: "stu_s2", value: 17.0 },
    { assessmentId: "asmt_ts1_fr_t2_1",   studentId: "stu_s2", value: 16.5 },
    { assessmentId: "asmt_ts1_ang_t1_1",  studentId: "stu_s2", value: 18.0 },
    { assessmentId: "asmt_ts1_ang_t2_1",  studentId: "stu_s2", value: 17.5 },
    { assessmentId: "asmt_ts1_hg_t1_1",   studentId: "stu_s2", value: 16.5 },
    { assessmentId: "asmt_ts1_hg_t2_1",   studentId: "stu_s2", value: 17.0 },
    { assessmentId: "asmt_ts1_phi_t1_1",  studentId: "stu_s2", value: 15.5 },
    { assessmentId: "asmt_ts1_phi_t2_1",  studentId: "stu_s2", value: 16.0 },

    // Ibrahima — très faible, en danger
    { assessmentId: "asmt_ts1_math_t1_1", studentId: "stu_s3", value: 4.0,  comment: "Travail insuffisant" },
    { assessmentId: "asmt_ts1_math_t1_2", studentId: "stu_s3", value: 3.5,  comment: "Copie quasi vide" },
    { assessmentId: "asmt_ts1_math_t2_1", studentId: "stu_s3", value: 5.0 },
    { assessmentId: "asmt_ts1_math_t2_2", studentId: "stu_s3", value: 4.5 },
    { assessmentId: "asmt_ts1_pc_t1_1",   studentId: "stu_s3", value: 6.0 },
    { assessmentId: "asmt_ts1_pc_t1_2",   studentId: "stu_s3", value: 5.5,  comment: "Lacunes importantes" },
    { assessmentId: "asmt_ts1_pc_t2_1",   studentId: "stu_s3", value: 6.5 },
    { assessmentId: "asmt_ts1_svt_t1_1",  studentId: "stu_s3", value: 7.0 },
    { assessmentId: "asmt_ts1_svt_t2_1",  studentId: "stu_s3", value: 6.0 },
    { assessmentId: "asmt_ts1_fr_t1_1",   studentId: "stu_s3", value: 8.0 },
    { assessmentId: "asmt_ts1_fr_t1_2",   studentId: "stu_s3", value: 7.5 },
    { assessmentId: "asmt_ts1_fr_t2_1",   studentId: "stu_s3", value: 8.5 },
    { assessmentId: "asmt_ts1_ang_t1_1",  studentId: "stu_s3", value: 5.0 },
    { assessmentId: "asmt_ts1_ang_t2_1",  studentId: "stu_s3", value: 6.0 },
    { assessmentId: "asmt_ts1_hg_t1_1",   studentId: "stu_s3", value: 7.5 },
    { assessmentId: "asmt_ts1_hg_t2_1",   studentId: "stu_s3", value: 7.0 },
    { assessmentId: "asmt_ts1_phi_t1_1",  studentId: "stu_s3", value: 8.0 },
    { assessmentId: "asmt_ts1_phi_t2_1",  studentId: "stu_s3", value: 7.5 },

    // Fatou Ba — bonne, forte en sciences
    { assessmentId: "asmt_ts1_math_t1_1", studentId: "stu_s4", value: 15.0 },
    { assessmentId: "asmt_ts1_math_t1_2", studentId: "stu_s4", value: 14.5 },
    { assessmentId: "asmt_ts1_math_t2_1", studentId: "stu_s4", value: 15.5 },
    { assessmentId: "asmt_ts1_math_t2_2", studentId: "stu_s4", value: 16.0 },
    { assessmentId: "asmt_ts1_pc_t1_1",   studentId: "stu_s4", value: 16.5 },
    { assessmentId: "asmt_ts1_pc_t1_2",   studentId: "stu_s4", value: 15.5 },
    { assessmentId: "asmt_ts1_pc_t2_1",   studentId: "stu_s4", value: 16.0 },
    { assessmentId: "asmt_ts1_svt_t1_1",  studentId: "stu_s4", value: 17.0 },
    { assessmentId: "asmt_ts1_svt_t2_1",  studentId: "stu_s4", value: 16.5 },
    { assessmentId: "asmt_ts1_fr_t1_1",   studentId: "stu_s4", value: 13.0 },
    { assessmentId: "asmt_ts1_fr_t1_2",   studentId: "stu_s4", value: 12.5 },
    { assessmentId: "asmt_ts1_fr_t2_1",   studentId: "stu_s4", value: 13.5 },
    { assessmentId: "asmt_ts1_ang_t1_1",  studentId: "stu_s4", value: 14.0 },
    { assessmentId: "asmt_ts1_ang_t2_1",  studentId: "stu_s4", value: 13.5 },
    { assessmentId: "asmt_ts1_hg_t1_1",   studentId: "stu_s4", value: 13.0 },
    { assessmentId: "asmt_ts1_hg_t2_1",   studentId: "stu_s4", value: 13.5 },
    { assessmentId: "asmt_ts1_phi_t1_1",  studentId: "stu_s4", value: 12.0 },
    { assessmentId: "asmt_ts1_phi_t2_1",  studentId: "stu_s4", value: 12.5 },

    // Cheikh Mbaye — moyen, faible anglais, absent souvent
    { assessmentId: "asmt_ts1_math_t1_1", studentId: "stu_s5", value: 11.0 },
    { assessmentId: "asmt_ts1_math_t1_2", studentId: "stu_s5", value: 10.5 },
    { assessmentId: "asmt_ts1_math_t2_1", studentId: "stu_s5", value: 11.5 },
    { assessmentId: "asmt_ts1_math_t2_2", studentId: "stu_s5", value: 10.0 },
    { assessmentId: "asmt_ts1_pc_t1_1",   studentId: "stu_s5", value: 10.0 },
    { assessmentId: "asmt_ts1_pc_t1_2",   studentId: "stu_s5", value: 9.5 },
    { assessmentId: "asmt_ts1_pc_t2_1",   studentId: "stu_s5", value: 10.5 },
    { assessmentId: "asmt_ts1_svt_t1_1",  studentId: "stu_s5", value: 12.0 },
    { assessmentId: "asmt_ts1_svt_t2_1",  studentId: "stu_s5", value: 11.0 },
    { assessmentId: "asmt_ts1_fr_t1_1",   studentId: "stu_s5", value: 12.5 },
    { assessmentId: "asmt_ts1_fr_t1_2",   studentId: "stu_s5", value: 11.5 },
    { assessmentId: "asmt_ts1_fr_t2_1",   studentId: "stu_s5", value: 12.0 },
    { assessmentId: "asmt_ts1_ang_t1_1",  studentId: "stu_s5", value: 6.5,  comment: "Niveau très insuffisant" },
    { assessmentId: "asmt_ts1_ang_t2_1",  studentId: "stu_s5", value: 7.0 },
    { assessmentId: "asmt_ts1_hg_t1_1",   studentId: "stu_s5", value: 11.0 },
    { assessmentId: "asmt_ts1_hg_t2_1",   studentId: "stu_s5", value: 10.5 },
    { assessmentId: "asmt_ts1_phi_t1_1",  studentId: "stu_s5", value: 11.5 },
    { assessmentId: "asmt_ts1_phi_t2_1",  studentId: "stu_s5", value: 11.0 },
  ];

  // TS2 : Aminata (bonne), Omar (faible maths), Rokhaya (excellente), Pape (moyen), Mariama (absences)
  const gradesTS2: Array<{ assessmentId: string; studentId: string; value: number; comment?: string }> = [
    // Aminata — bonne
    { assessmentId: "asmt_ts2_math_t1_1", studentId: "stu_s6", value: 14.5 },
    { assessmentId: "asmt_ts2_math_t1_2", studentId: "stu_s6", value: 13.5 },
    { assessmentId: "asmt_ts2_math_t2_1", studentId: "stu_s6", value: 15.0 },
    { assessmentId: "asmt_ts2_pc_t1_1",   studentId: "stu_s6", value: 15.0 },
    { assessmentId: "asmt_ts2_pc_t1_2",   studentId: "stu_s6", value: 14.0 },
    { assessmentId: "asmt_ts2_svt_t1_1",  studentId: "stu_s6", value: 15.5 },
    { assessmentId: "asmt_ts2_fr_t1_1",   studentId: "stu_s6", value: 14.0 },
    { assessmentId: "asmt_ts2_fr_t1_2",   studentId: "stu_s6", value: 13.5 },
    { assessmentId: "asmt_ts2_ang_t1_1",  studentId: "stu_s6", value: 16.0 },
    { assessmentId: "asmt_ts2_hg_t1_1",   studentId: "stu_s6", value: 14.5 },
    { assessmentId: "asmt_ts2_phi_t1_1",  studentId: "stu_s6", value: 13.5 },

    // Omar — faible en maths
    { assessmentId: "asmt_ts2_math_t1_1", studentId: "stu_s7", value: 5.5,  comment: "Bases insuffisantes" },
    { assessmentId: "asmt_ts2_math_t1_2", studentId: "stu_s7", value: 4.0,  comment: "Difficultés majeures" },
    { assessmentId: "asmt_ts2_math_t2_1", studentId: "stu_s7", value: 6.0 },
    { assessmentId: "asmt_ts2_pc_t1_1",   studentId: "stu_s7", value: 9.0 },
    { assessmentId: "asmt_ts2_pc_t1_2",   studentId: "stu_s7", value: 8.5 },
    { assessmentId: "asmt_ts2_svt_t1_1",  studentId: "stu_s7", value: 11.0 },
    { assessmentId: "asmt_ts2_fr_t1_1",   studentId: "stu_s7", value: 13.0 },
    { assessmentId: "asmt_ts2_fr_t1_2",   studentId: "stu_s7", value: 12.5 },
    { assessmentId: "asmt_ts2_ang_t1_1",  studentId: "stu_s7", value: 12.0 },
    { assessmentId: "asmt_ts2_hg_t1_1",   studentId: "stu_s7", value: 12.5 },
    { assessmentId: "asmt_ts2_phi_t1_1",  studentId: "stu_s7", value: 11.5 },

    // Rokhaya — excellente
    { assessmentId: "asmt_ts2_math_t1_1", studentId: "stu_s8", value: 19.5 },
    { assessmentId: "asmt_ts2_math_t1_2", studentId: "stu_s8", value: 18.5 },
    { assessmentId: "asmt_ts2_math_t2_1", studentId: "stu_s8", value: 19.0 },
    { assessmentId: "asmt_ts2_pc_t1_1",   studentId: "stu_s8", value: 18.0 },
    { assessmentId: "asmt_ts2_pc_t1_2",   studentId: "stu_s8", value: 17.5 },
    { assessmentId: "asmt_ts2_svt_t1_1",  studentId: "stu_s8", value: 18.5 },
    { assessmentId: "asmt_ts2_fr_t1_1",   studentId: "stu_s8", value: 16.5 },
    { assessmentId: "asmt_ts2_fr_t1_2",   studentId: "stu_s8", value: 17.0 },
    { assessmentId: "asmt_ts2_ang_t1_1",  studentId: "stu_s8", value: 18.0 },
    { assessmentId: "asmt_ts2_hg_t1_1",   studentId: "stu_s8", value: 17.0 },
    { assessmentId: "asmt_ts2_phi_t1_1",  studentId: "stu_s8", value: 16.0 },

    // Pape — moyen
    { assessmentId: "asmt_ts2_math_t1_1", studentId: "stu_s9", value: 11.5 },
    { assessmentId: "asmt_ts2_math_t1_2", studentId: "stu_s9", value: 10.5 },
    { assessmentId: "asmt_ts2_math_t2_1", studentId: "stu_s9", value: 12.0 },
    { assessmentId: "asmt_ts2_pc_t1_1",   studentId: "stu_s9", value: 11.0 },
    { assessmentId: "asmt_ts2_pc_t1_2",   studentId: "stu_s9", value: 10.0 },
    { assessmentId: "asmt_ts2_svt_t1_1",  studentId: "stu_s9", value: 12.5 },
    { assessmentId: "asmt_ts2_fr_t1_1",   studentId: "stu_s9", value: 13.0 },
    { assessmentId: "asmt_ts2_fr_t1_2",   studentId: "stu_s9", value: 12.5 },
    { assessmentId: "asmt_ts2_ang_t1_1",  studentId: "stu_s9", value: 11.0 },
    { assessmentId: "asmt_ts2_hg_t1_1",   studentId: "stu_s9", value: 12.0 },
    { assessmentId: "asmt_ts2_phi_t1_1",  studentId: "stu_s9", value: 11.5 },

    // Mariama Fall — moyen avec absences (peu de notes)
    { assessmentId: "asmt_ts2_math_t1_1", studentId: "stu_s10", value: 10.0 },
    { assessmentId: "asmt_ts2_math_t1_2", studentId: "stu_s10", value: 9.5 },
    { assessmentId: "asmt_ts2_pc_t1_1",   studentId: "stu_s10", value: 10.5 },
    { assessmentId: "asmt_ts2_fr_t1_1",   studentId: "stu_s10", value: 12.0 },
    { assessmentId: "asmt_ts2_fr_t1_2",   studentId: "stu_s10", value: 11.5 },
    { assessmentId: "asmt_ts2_ang_t1_1",  studentId: "stu_s10", value: 10.0 },
    { assessmentId: "asmt_ts2_hg_t1_1",   studentId: "stu_s10", value: 11.0 },
  ];

  // PL1 : Sokhna (excellente lettres), Abdou (moyen), Binta (faible), Thierno (bon)
  const gradesPL1: Array<{ assessmentId: string; studentId: string; value: number; comment?: string }> = [
    // Sokhna — excellente
    { assessmentId: "asmt_pl1_fr_t1_1",  studentId: "stu_s11", value: 18.0 },
    { assessmentId: "asmt_pl1_fr_t1_2",  studentId: "stu_s11", value: 17.5 },
    { assessmentId: "asmt_pl1_fr_t2_1",  studentId: "stu_s11", value: 18.5 },
    { assessmentId: "asmt_pl1_ang_t1_1", studentId: "stu_s11", value: 16.5 },
    { assessmentId: "asmt_pl1_ang_t1_2", studentId: "stu_s11", value: 16.0 },
    { assessmentId: "asmt_pl1_hg_t1_1",  studentId: "stu_s11", value: 17.0 },
    { assessmentId: "asmt_pl1_hg_t1_2",  studentId: "stu_s11", value: 16.5 },
    { assessmentId: "asmt_pl1_phi_t1_1", studentId: "stu_s11", value: 17.0 },
    { assessmentId: "asmt_pl1_eps_t1_1", studentId: "stu_s11", value: 15.0 },

    // Abdou — moyen
    { assessmentId: "asmt_pl1_fr_t1_1",  studentId: "stu_s12", value: 12.0 },
    { assessmentId: "asmt_pl1_fr_t1_2",  studentId: "stu_s12", value: 11.5 },
    { assessmentId: "asmt_pl1_fr_t2_1",  studentId: "stu_s12", value: 12.5 },
    { assessmentId: "asmt_pl1_ang_t1_1", studentId: "stu_s12", value: 11.0 },
    { assessmentId: "asmt_pl1_ang_t1_2", studentId: "stu_s12", value: 10.5 },
    { assessmentId: "asmt_pl1_hg_t1_1",  studentId: "stu_s12", value: 12.5 },
    { assessmentId: "asmt_pl1_hg_t1_2",  studentId: "stu_s12", value: 11.5 },
    { assessmentId: "asmt_pl1_phi_t1_1", studentId: "stu_s12", value: 12.0 },
    { assessmentId: "asmt_pl1_eps_t1_1", studentId: "stu_s12", value: 14.0 },

    // Binta — faible, difficultés en philo et anglais
    { assessmentId: "asmt_pl1_fr_t1_1",  studentId: "stu_s13", value: 9.0,  comment: "Expression à améliorer" },
    { assessmentId: "asmt_pl1_fr_t1_2",  studentId: "stu_s13", value: 8.5,  comment: "Hors sujet partiellement" },
    { assessmentId: "asmt_pl1_fr_t2_1",  studentId: "stu_s13", value: 9.5 },
    { assessmentId: "asmt_pl1_ang_t1_1", studentId: "stu_s13", value: 6.0,  comment: "Niveau débutant" },
    { assessmentId: "asmt_pl1_ang_t1_2", studentId: "stu_s13", value: 5.5 },
    { assessmentId: "asmt_pl1_hg_t1_1",  studentId: "stu_s13", value: 10.0 },
    { assessmentId: "asmt_pl1_hg_t1_2",  studentId: "stu_s13", value: 9.0 },
    { assessmentId: "asmt_pl1_phi_t1_1", studentId: "stu_s13", value: 7.5,  comment: "Manque d'arguments" },
    { assessmentId: "asmt_pl1_eps_t1_1", studentId: "stu_s13", value: 13.0 },

    // Thierno — bon
    { assessmentId: "asmt_pl1_fr_t1_1",  studentId: "stu_s14", value: 15.5 },
    { assessmentId: "asmt_pl1_fr_t1_2",  studentId: "stu_s14", value: 15.0 },
    { assessmentId: "asmt_pl1_fr_t2_1",  studentId: "stu_s14", value: 16.0 },
    { assessmentId: "asmt_pl1_ang_t1_1", studentId: "stu_s14", value: 14.5 },
    { assessmentId: "asmt_pl1_ang_t1_2", studentId: "stu_s14", value: 14.0 },
    { assessmentId: "asmt_pl1_hg_t1_1",  studentId: "stu_s14", value: 15.0 },
    { assessmentId: "asmt_pl1_hg_t1_2",  studentId: "stu_s14", value: 14.5 },
    { assessmentId: "asmt_pl1_phi_t1_1", studentId: "stu_s14", value: 14.0 },
    { assessmentId: "asmt_pl1_eps_t1_1", studentId: "stu_s14", value: 16.0 },
  ];

  await prisma.grade.createMany({ data: [...gradesTS1, ...gradesTS2, ...gradesPL1] });

  // ── Présences ────────────────────────────────────────────────────────────
  // Sessions TS1 — 4 sessions (Maths, PC, Français, SVT)
  await prisma.attendanceSession.createMany({
    data: [
      { id: "sess_ts1_math_1",  classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", date: new Date("2026-01-13"), startTime: new Date("2026-01-13T08:00:00"), endTime: new Date("2026-01-13T10:00:00") },
      { id: "sess_ts1_pc_1",    classId: "class_ts1", subjectId: "subj_physchim", teacherId: "teacher_t2", date: new Date("2026-01-13"), startTime: new Date("2026-01-13T10:00:00"), endTime: new Date("2026-01-13T12:00:00") },
      { id: "sess_ts1_fr_1",    classId: "class_ts1", subjectId: "subj_fr",       teacherId: "teacher_t3", date: new Date("2026-01-14"), startTime: new Date("2026-01-14T08:00:00"), endTime: new Date("2026-01-14T10:00:00") },
      { id: "sess_ts1_svt_1",   classId: "class_ts1", subjectId: "subj_svt",      teacherId: "teacher_t2", date: new Date("2026-02-04"), startTime: new Date("2026-02-04T08:00:00"), endTime: new Date("2026-02-04T10:00:00") },
      { id: "sess_ts1_math_2",  classId: "class_ts1", subjectId: "subj_maths",    teacherId: "teacher_t1", date: new Date("2026-02-09"), startTime: new Date("2026-02-09T08:00:00"), endTime: new Date("2026-02-09T10:00:00") },
      { id: "sess_ts1_ang_1",   classId: "class_ts1", subjectId: "subj_ang",      teacherId: "teacher_t4", date: new Date("2026-02-10"), startTime: new Date("2026-02-10T10:00:00"), endTime: new Date("2026-02-10T12:00:00") },
    ],
  });

  await prisma.attendanceRecord.createMany({
    data: [
      // sess_ts1_math_1 : Ibrahima absent, Cheikh en retard
      { sessionId: "sess_ts1_math_1", studentId: "stu_s1", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_math_1", studentId: "stu_s2", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_math_1", studentId: "stu_s3", status: AttendanceStatus.ABSENT },
      { sessionId: "sess_ts1_math_1", studentId: "stu_s4", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_math_1", studentId: "stu_s5", status: AttendanceStatus.LATE, minutesLate: 20 },
      // sess_ts1_pc_1 : Ibrahima absent, Cheikh absent
      { sessionId: "sess_ts1_pc_1",   studentId: "stu_s1", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_pc_1",   studentId: "stu_s2", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_pc_1",   studentId: "stu_s3", status: AttendanceStatus.ABSENT },
      { sessionId: "sess_ts1_pc_1",   studentId: "stu_s4", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_pc_1",   studentId: "stu_s5", status: AttendanceStatus.ABSENT },
      // sess_ts1_fr_1 : tout le monde présent sauf Ibrahima en retard
      { sessionId: "sess_ts1_fr_1",   studentId: "stu_s1", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_fr_1",   studentId: "stu_s2", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_fr_1",   studentId: "stu_s3", status: AttendanceStatus.LATE, minutesLate: 35 },
      { sessionId: "sess_ts1_fr_1",   studentId: "stu_s4", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_fr_1",   studentId: "stu_s5", status: AttendanceStatus.PRESENT },
      // sess_ts1_svt_1 : Cheikh absent
      { sessionId: "sess_ts1_svt_1",  studentId: "stu_s1", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_svt_1",  studentId: "stu_s2", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_svt_1",  studentId: "stu_s3", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_svt_1",  studentId: "stu_s4", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_svt_1",  studentId: "stu_s5", status: AttendanceStatus.ABSENT },
      // sess_ts1_math_2 : Ibrahima absent encore
      { sessionId: "sess_ts1_math_2", studentId: "stu_s1", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_math_2", studentId: "stu_s2", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_math_2", studentId: "stu_s3", status: AttendanceStatus.ABSENT },
      { sessionId: "sess_ts1_math_2", studentId: "stu_s4", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_math_2", studentId: "stu_s5", status: AttendanceStatus.LATE, minutesLate: 15 },
      // sess_ts1_ang_1 : tout présent
      { sessionId: "sess_ts1_ang_1",  studentId: "stu_s1", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_ang_1",  studentId: "stu_s2", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_ang_1",  studentId: "stu_s3", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_ang_1",  studentId: "stu_s4", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts1_ang_1",  studentId: "stu_s5", status: AttendanceStatus.PRESENT },
    ],
  });

  // Sessions TS2
  await prisma.attendanceSession.createMany({
    data: [
      { id: "sess_ts2_math_1", classId: "class_ts2", subjectId: "subj_maths",    teacherId: "teacher_t1", date: new Date("2026-01-12"), startTime: new Date("2026-01-12T14:00:00"), endTime: new Date("2026-01-12T16:00:00") },
      { id: "sess_ts2_fr_1",   classId: "class_ts2", subjectId: "subj_fr",       teacherId: "teacher_t3", date: new Date("2026-01-13"), startTime: new Date("2026-01-13T14:00:00"), endTime: new Date("2026-01-13T16:00:00") },
      { id: "sess_ts2_svt_1",  classId: "class_ts2", subjectId: "subj_svt",      teacherId: "teacher_t2", date: new Date("2026-02-04"), startTime: new Date("2026-02-04T14:00:00"), endTime: new Date("2026-02-04T16:00:00") },
    ],
  });

  await prisma.attendanceRecord.createMany({
    data: [
      // sess_ts2_math_1 : Omar en retard, Mariama absente
      { sessionId: "sess_ts2_math_1", studentId: "stu_s6",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_math_1", studentId: "stu_s7",  status: AttendanceStatus.LATE, minutesLate: 10 },
      { sessionId: "sess_ts2_math_1", studentId: "stu_s8",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_math_1", studentId: "stu_s9",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_math_1", studentId: "stu_s10", status: AttendanceStatus.ABSENT },
      // sess_ts2_fr_1 : Mariama absente encore
      { sessionId: "sess_ts2_fr_1",   studentId: "stu_s6",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_fr_1",   studentId: "stu_s7",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_fr_1",   studentId: "stu_s8",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_fr_1",   studentId: "stu_s9",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_fr_1",   studentId: "stu_s10", status: AttendanceStatus.ABSENT },
      // sess_ts2_svt_1 : tout présent
      { sessionId: "sess_ts2_svt_1",  studentId: "stu_s6",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_svt_1",  studentId: "stu_s7",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_svt_1",  studentId: "stu_s8",  status: AttendanceStatus.PRESENT },
      { sessionId: "sess_ts2_svt_1",  studentId: "stu_s9",  status: AttendanceStatus.LATE, minutesLate: 5 },
      { sessionId: "sess_ts2_svt_1",  studentId: "stu_s10", status: AttendanceStatus.ABSENT },
    ],
  });

  // Sessions PL1
  await prisma.attendanceSession.createMany({
    data: [
      { id: "sess_pl1_fr_1",  classId: "class_pl1", subjectId: "subj_fr",  teacherId: "teacher_t3", date: new Date("2026-01-12"), startTime: new Date("2026-01-12T08:00:00"), endTime: new Date("2026-01-12T10:00:00") },
      { id: "sess_pl1_ang_1", classId: "class_pl1", subjectId: "subj_ang", teacherId: "teacher_t4", date: new Date("2026-01-15"), startTime: new Date("2026-01-15T08:00:00"), endTime: new Date("2026-01-15T10:00:00") },
    ],
  });

  await prisma.attendanceRecord.createMany({
    data: [
      { sessionId: "sess_pl1_fr_1",  studentId: "stu_s11", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_pl1_fr_1",  studentId: "stu_s12", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_pl1_fr_1",  studentId: "stu_s13", status: AttendanceStatus.LATE, minutesLate: 25 },
      { sessionId: "sess_pl1_fr_1",  studentId: "stu_s14", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_pl1_ang_1", studentId: "stu_s11", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_pl1_ang_1", studentId: "stu_s12", status: AttendanceStatus.PRESENT },
      { sessionId: "sess_pl1_ang_1", studentId: "stu_s13", status: AttendanceStatus.ABSENT },
      { sessionId: "sess_pl1_ang_1", studentId: "stu_s14", status: AttendanceStatus.PRESENT },
    ],
  });

  console.log("✓ Seed terminé !");
  console.log("");
  console.log("  COMPTES :");
  console.log("  admin@xelal.ai      / admin123");
  console.log("  teacher@xelal.ai    / teacher123  (Mamadou Sow — Maths TS1+TS2)");
  console.log("  diallo@xelal.ai     / teacher123  (Aissatou Diallo — PC+SVT TS1+TS2)");
  console.log("  fall@xelal.ai       / teacher123  (Ousmane Fall — Français+Philo toutes classes)");
  console.log("  ndiaye@xelal.ai     / teacher123  (Mariama Ndiaye — Anglais+HG toutes classes)");
  console.log("  student@xelal.ai    / student123  (Moussa Diop — TS1, profil moyen)");
  console.log("  student2@xelal.ai   / student123  (Awa Ndiaye — TS1, excellente)");
  console.log("");
  console.log("  CLASSES : Terminale S1 (5 élèves), Terminale S2 (5 élèves), Première L1 (4 élèves)");
  console.log("  PROFILS IA : élèves en danger, en progrès, excellents — idéaux pour tester l'analyse");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
