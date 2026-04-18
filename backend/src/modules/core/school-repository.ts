import {
  AssessmentType,
  AttendanceStatus,
  EnrollmentStatus,
} from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import {
  AppRole,
  createId,
  devStore,
  DevAttendanceRecord,
  DevAttendanceSession,
  DevGrade,
  DevTeacherAssignment,
  publicUser,
} from "./dev-store";

const average = (values: number[]) =>
  values.length
    ? Number((values.reduce((sum, current) => sum + current, 0) / values.length).toFixed(2))
    : null;

const findUser = (userId: string) => devStore.users.find((user) => user.id === userId);
const findStudent = (studentId: string) => {
  const user = findUser(studentId);
  return user && user.role === "STUDENT" ? user : null;
};
const findClass = (classId: string) => devStore.classes.find((item) => item.id === classId);
const findSubject = (subjectId: string) =>
  devStore.subjects.find((subject) => subject.id === subjectId);
const findAssessment = (assessmentId: string) =>
  devStore.assessments.find((assessment) => assessment.id === assessmentId);

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");
const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const schoolRepository = {
  async listClasses() {
    if (!isPrismaEnabled()) {
      return devStore.classes.map((item) => ({
        id: item.id,
        schoolId: item.schoolId,
        academicYearId: item.academicYearId,
        name: item.name,
        level: item.level,
        studentsCount: item.studentIds.length,
        teachersCount: item.teacherIds.length,
      }));
    }

    const prisma = getPrismaClient();
    const classes = await prisma!.class.findMany({
      include: {
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
        },
        assignments: true,
      },
      orderBy: { name: "asc" },
    });

    return classes.map((item) => ({
      id: item.id,
      schoolId: item.schoolId,
      academicYearId: item.academicYearId,
      name: item.name,
      level: item.level,
      studentsCount: item.enrollments.length,
      teachersCount: new Set(item.assignments.map((assignment) => assignment.teacherId)).size,
    }));
  },

  async getClassStudents(classId: string) {
    if (!isPrismaEnabled()) {
      const classRecord = findClass(classId);
      if (!classRecord) {
        return null;
      }

      const students = devStore.users
        .filter((user) => classRecord.studentIds.includes(user.id))
        .map(publicUser);

      return {
        id: classRecord.id,
        name: classRecord.name,
        level: classRecord.level,
        students,
      };
    }

    const prisma = getPrismaClient();
    const classRecord = await prisma!.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!classRecord) {
      return null;
    }

    return {
      id: classRecord.id,
      name: classRecord.name,
      level: classRecord.level,
      students: classRecord.enrollments.map((enrollment) =>
        publicUser({
          id: enrollment.student.id,
          schoolId: enrollment.student.user.schoolId,
          classId: classRecord.id,
          firstName: enrollment.student.user.firstName,
          lastName: enrollment.student.user.lastName,
          email: enrollment.student.user.email ?? "",
          phone: enrollment.student.user.phone ?? undefined,
          role: enrollment.student.user.role as AppRole,
          status: enrollment.student.user.status as any,
          mustChangePassword: enrollment.student.user.mustChangePassword,
        }),
      ),
    };
  },

  async listSubjects() {
    if (!isPrismaEnabled()) {
      return devStore.subjects;
    }

    const prisma = getPrismaClient();
    const subjects = await prisma!.subject.findMany({ orderBy: { name: "asc" } });
    return subjects.map((subject) => ({
      id: subject.id,
      schoolId: subject.schoolId,
      name: subject.name,
      coefficientDefault: subject.coefficientDefault,
    }));
  },

  async listAssessmentsByClass(classId: string) {
    if (!isPrismaEnabled()) {
      const classRecord = findClass(classId);
      if (!classRecord) {
        return null;
      }

      return devStore.assessments
        .filter((assessment) => assessment.classId === classId)
        .map((assessment) => ({
          ...assessment,
          subject: findSubject(assessment.subjectId)?.name ?? "Inconnue",
        }));
    }

    const prisma = getPrismaClient();
    const classRecord = await prisma!.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      return null;
    }

    const assessments = await prisma!.assessment.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: { date: "desc" },
    });

    return assessments.map((assessment) => ({
      id: assessment.id,
      classId: assessment.classId,
      subjectId: assessment.subjectId,
      teacherId: assessment.teacherId,
      title: assessment.title,
      type: assessment.type,
      coefficient: assessment.coefficient,
      date: assessment.date.toISOString().slice(0, 10),
      subject: assessment.subject.name,
    }));
  },

  async getStudentGrades(studentId: string) {
    if (!isPrismaEnabled()) {
      const student = findStudent(studentId);
      if (!student) {
        return null;
      }

      const studentGrades = devStore.grades
        .filter((grade) => grade.studentId === studentId)
        .map((grade) => {
          const assessment = findAssessment(grade.assessmentId);
          const subject = assessment ? findSubject(assessment.subjectId) : null;

          return {
            id: grade.id,
            value: grade.value,
            comment: grade.comment,
            assessmentId: grade.assessmentId,
            assessmentTitle: assessment?.title ?? "Evaluation",
            assessmentType: assessment?.type ?? "QUIZ",
            date: assessment?.date ?? null,
            coefficient: assessment?.coefficient ?? 1,
            subjectId: subject?.id ?? null,
            subject: subject?.name ?? "Inconnue",
          };
        });

      return {
        student: publicUser(student),
        summary: {
          generalAverage: average(studentGrades.map((grade) => grade.value)),
          gradesCount: studentGrades.length,
        },
        subjectSummaries: devStore.subjects
          .map((subject) => {
            const subjectGrades = studentGrades.filter((grade) => grade.subjectId === subject.id);
            if (!subjectGrades.length) return null;

            return {
              subjectId: subject.id,
              subject: subject.name,
              average: average(subjectGrades.map((grade) => grade.value)),
              gradesCount: subjectGrades.length,
            };
          })
          .filter(Boolean),
        grades: studentGrades,
      };
    }

    const prisma = getPrismaClient();
    const student = await prisma!.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        grades: {
          include: {
            assessment: {
              include: {
                subject: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      return null;
    }

    const grades = student.grades.map((grade) => ({
      id: grade.id,
      value: grade.value,
      comment: grade.comment ?? undefined,
      assessmentId: grade.assessmentId,
      assessmentTitle: grade.assessment.title,
      assessmentType: grade.assessment.type,
      date: grade.assessment.date.toISOString().slice(0, 10),
      coefficient: grade.assessment.coefficient,
      subjectId: grade.assessment.subject.id,
      subject: grade.assessment.subject.name,
    }));

    const subjectMap = new Map<
      string,
      { subjectId: string; subject: string; values: number[] }
    >();

    for (const grade of grades) {
      const current = subjectMap.get(grade.subjectId) ?? {
        subjectId: grade.subjectId,
        subject: grade.subject,
        values: [],
      };
      current.values.push(grade.value);
      subjectMap.set(grade.subjectId, current);
    }

    return {
      student: publicUser({
        id: student.id,
        schoolId: student.user.schoolId,
        classId: undefined,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email ?? "",
        phone: student.user.phone ?? undefined,
        role: student.user.role as AppRole,
        status: student.user.status as any,
        mustChangePassword: student.user.mustChangePassword,
      }),
      summary: {
        generalAverage: average(grades.map((grade) => grade.value)),
        gradesCount: grades.length,
      },
      subjectSummaries: Array.from(subjectMap.values()).map((item) => ({
        subjectId: item.subjectId,
        subject: item.subject,
        average: average(item.values),
        gradesCount: item.values.length,
      })),
      grades,
    };
  },

  async getClassGradebook(classId: string) {
    if (!isPrismaEnabled()) {
      const classRecord = findClass(classId);
      if (!classRecord) {
        return null;
      }

      const rows = classRecord.studentIds
        .map((studentId) => findStudent(studentId))
        .filter(Boolean)
        .map((student) => {
          const studentGrades = devStore.grades.filter((grade) => grade.studentId === student!.id);
          return {
            student: publicUser(student!),
            average: average(studentGrades.map((grade) => grade.value)),
            gradesCount: studentGrades.length,
          };
        });

      return {
        class: {
          id: classRecord.id,
          name: classRecord.name,
          level: classRecord.level,
        },
        rows,
      };
    }

    const prisma = getPrismaClient();
    const classRecord = await prisma!.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          include: {
            student: {
              include: {
                user: true,
                grades: {
                  include: {
                    assessment: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!classRecord) {
      return null;
    }

    return {
      class: {
        id: classRecord.id,
        name: classRecord.name,
        level: classRecord.level,
      },
      rows: classRecord.enrollments.map((enrollment) => {
        const studentGrades = enrollment.student.grades.filter(
          (grade) => grade.assessment.classId === classId,
        );

        return {
          student: publicUser({
            id: enrollment.student.id,
            schoolId: enrollment.student.user.schoolId,
            classId,
            firstName: enrollment.student.user.firstName,
            lastName: enrollment.student.user.lastName,
            email: enrollment.student.user.email ?? "",
            phone: enrollment.student.user.phone ?? undefined,
            role: enrollment.student.user.role as AppRole,
            status: enrollment.student.user.status as any,
            mustChangePassword: enrollment.student.user.mustChangePassword,
          }),
          average: average(studentGrades.map((grade) => grade.value)),
          gradesCount: studentGrades.length,
        };
      }),
    };
  },

  async updateGrade(gradeId: string, value: number, comment?: string) {
    if (!isPrismaEnabled()) {
      const grade = devStore.grades.find((item) => item.id === gradeId);
      if (!grade) {
        return null;
      }

      grade.value = value;
      grade.comment = comment ?? grade.comment;
      return grade;
    }

    const prisma = getPrismaClient();
    const existing = await prisma!.grade.findUnique({ where: { id: gradeId } });
    if (!existing) {
      return null;
    }

    const grade = await prisma!.grade.update({
      where: { id: gradeId },
      data: {
        value,
        comment: comment ?? existing.comment,
      },
    });

    return {
      id: grade.id,
      assessmentId: grade.assessmentId,
      studentId: grade.studentId,
      value: grade.value,
      comment: grade.comment ?? undefined,
    };
  },

  async createAssessment(input: {
    classId: string;
    subjectId: string;
    teacherId: string;
    title: string;
    type: "QUIZ" | "HOMEWORK" | "EXAM" | "PROJECT";
    coefficient: number;
    date: string;
  }) {
    if (!isPrismaEnabled()) {
      const classRecord = findClass(input.classId);
      const subject = findSubject(input.subjectId);
      if (!classRecord || !subject) {
        return null;
      }

      const assessment = {
        id: createId("assessment"),
        ...input,
      };

      devStore.assessments.unshift(assessment);
      return {
        ...assessment,
        subject: subject.name,
      };
    }

    const prisma = getPrismaClient();
    const classRecord = await prisma!.class.findUnique({
      where: { id: input.classId },
      include: {
        academicYear: {
          include: {
            terms: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });
    const subject = await prisma!.subject.findUnique({ where: { id: input.subjectId } });

    if (!classRecord || !subject) {
      return null;
    }

    const defaultTerm = classRecord.academicYear.terms[0];
    if (!defaultTerm) {
      throw new Error("Aucun trimestre configure pour cette annee scolaire.");
    }

    const assessment = await prisma!.assessment.create({
      data: {
        classId: input.classId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        termId: defaultTerm.id,
        title: input.title,
        type: input.type as AssessmentType,
        coefficient: input.coefficient,
        date: new Date(input.date),
      },
      include: {
        subject: true,
      },
    });

    return {
      id: assessment.id,
      classId: assessment.classId,
      subjectId: assessment.subjectId,
      teacherId: assessment.teacherId,
      title: assessment.title,
      type: assessment.type,
      coefficient: assessment.coefficient,
      date: assessment.date.toISOString().slice(0, 10),
      subject: assessment.subject.name,
    };
  },

  async bulkUpsertGrades(
    assessmentId: string,
    entries: Array<{ studentId: string; value: number; comment?: string }>,
  ) {
    if (!isPrismaEnabled()) {
      const assessment = findAssessment(assessmentId);
      if (!assessment) {
        return null;
      }

      const updated = entries.map((entry) => {
        const existing = devStore.grades.find(
          (grade) => grade.assessmentId === assessmentId && grade.studentId === entry.studentId,
        );

        if (existing) {
          existing.value = entry.value;
          existing.comment = entry.comment ?? existing.comment;
          return existing;
        }

        const created: DevGrade = {
          id: createId("grade"),
          assessmentId,
          studentId: entry.studentId,
          value: entry.value,
          comment: entry.comment,
        };

        devStore.grades.push(created);
        return created;
      });

      return {
        assessmentId,
        count: updated.length,
        grades: updated,
      };
    }

    const prisma = getPrismaClient();
    const assessment = await prisma!.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) {
      return null;
    }

    const grades = [];
    for (const entry of entries) {
      const grade = await prisma!.grade.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId,
            studentId: entry.studentId,
          },
        },
        create: {
          assessmentId,
          studentId: entry.studentId,
          value: entry.value,
          comment: entry.comment,
        },
        update: {
          value: entry.value,
          comment: entry.comment,
        },
      });
      grades.push({
        id: grade.id,
        assessmentId: grade.assessmentId,
        studentId: grade.studentId,
        value: grade.value,
        comment: grade.comment ?? undefined,
      });
    }

    return {
      assessmentId,
      count: grades.length,
      grades,
    };
  },

  async getStudentAttendance(studentId: string) {
    if (!isPrismaEnabled()) {
      const student = findStudent(studentId);
      if (!student) {
        return null;
      }

      const records = devStore.attendanceRecords
        .filter((record) => record.studentId === studentId)
        .map((record) => {
          const session = devStore.attendanceSessions.find((item) => item.id === record.sessionId);
          const subject = session?.subjectId ? findSubject(session.subjectId) : null;

          return {
            id: record.id,
            date: session?.date ?? null,
            status: record.status,
            reason: record.reason,
            minutesLate: record.minutesLate,
            classId: session?.classId ?? null,
            subject: subject?.name ?? null,
          };
        });

      return {
        student: publicUser(student),
        summary: {
          present: records.filter((record) => record.status === "PRESENT").length,
          absent: records.filter((record) => record.status === "ABSENT").length,
          late: records.filter((record) => record.status === "LATE").length,
        },
        records,
      };
    }

    const prisma = getPrismaClient();
    const student = await prisma!.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        attendances: {
          include: {
            session: {
              include: {
                subject: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      return null;
    }

    const records = student.attendances.map((record) => ({
      id: record.id,
      date: record.session.date.toISOString().slice(0, 10),
      status: record.status,
      reason: record.reason ?? undefined,
      minutesLate: record.minutesLate ?? undefined,
      classId: record.session.classId,
      subject: record.session.subject?.name ?? null,
    }));

    return {
      student: publicUser({
        id: student.id,
        schoolId: student.user.schoolId,
        classId: undefined,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email ?? "",
        phone: student.user.phone ?? undefined,
        role: student.user.role as AppRole,
        status: student.user.status as any,
        mustChangePassword: student.user.mustChangePassword,
      }),
      summary: {
        present: records.filter((record) => record.status === "PRESENT").length,
        absent: records.filter((record) => record.status === "ABSENT").length,
        late: records.filter((record) => record.status === "LATE").length,
      },
      records,
    };
  },

  async getClassAttendance(classId: string) {
    if (!isPrismaEnabled()) {
      const classRecord = findClass(classId);
      if (!classRecord) {
        return null;
      }

      const sessions = devStore.attendanceSessions
        .filter((session) => session.classId === classId)
        .map((session) => {
          const records = devStore.attendanceRecords.filter((record) => record.sessionId === session.id);
          return {
            id: session.id,
            date: session.date,
            subject: session.subjectId ? findSubject(session.subjectId)?.name ?? null : null,
            summary: {
              present: records.filter((record) => record.status === "PRESENT").length,
              absent: records.filter((record) => record.status === "ABSENT").length,
              late: records.filter((record) => record.status === "LATE").length,
            },
          };
        });

      return {
        class: {
          id: classRecord.id,
          name: classRecord.name,
          level: classRecord.level,
        },
        sessions,
      };
    }

    const prisma = getPrismaClient();
    const classRecord = await prisma!.class.findUnique({
      where: { id: classId },
      include: {
        attendanceSessions: {
          include: {
            subject: true,
            records: true,
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!classRecord) {
      return null;
    }

    return {
      class: {
        id: classRecord.id,
        name: classRecord.name,
        level: classRecord.level,
      },
      sessions: classRecord.attendanceSessions.map((session) => ({
        id: session.id,
        date: session.date.toISOString().slice(0, 10),
        subject: session.subject?.name ?? null,
        summary: {
          present: session.records.filter((record) => record.status === "PRESENT").length,
          absent: session.records.filter((record) => record.status === "ABSENT").length,
          late: session.records.filter((record) => record.status === "LATE").length,
        },
      })),
    };
  },

  async bulkUpsertAttendance(input: {
    classId: string;
    teacherId: string;
    date: string;
    subjectId?: string;
    entries: Array<{
      studentId: string;
      status: "PRESENT" | "ABSENT" | "LATE";
      reason?: string;
      minutesLate?: number;
    }>;
  }) {
    if (!isPrismaEnabled()) {
      const classRecord = findClass(input.classId);
      if (!classRecord) {
        return null;
      }

      let session = devStore.attendanceSessions.find(
        (item) =>
          item.classId === input.classId &&
          item.date === input.date &&
          item.subjectId === input.subjectId,
      );

      if (!session) {
        session = {
          id: createId("attendance_session"),
          classId: input.classId,
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          date: input.date,
        };
        devStore.attendanceSessions.push(session);
      }

      const records = input.entries.map((entry) => {
        const existing = devStore.attendanceRecords.find(
          (record) => record.sessionId === session!.id && record.studentId === entry.studentId,
        );

        if (existing) {
          existing.status = entry.status;
          existing.reason = entry.reason;
          existing.minutesLate = entry.minutesLate;
          return existing;
        }

        const created: DevAttendanceRecord = {
          id: createId("attendance_record"),
          sessionId: session.id,
          studentId: entry.studentId,
          status: entry.status,
          reason: entry.reason,
          minutesLate: entry.minutesLate,
        };
        devStore.attendanceRecords.push(created);
        return created;
      });

      return {
        session,
        count: records.length,
        records,
      };
    }

    const prisma = getPrismaClient();
    const classRecord = await prisma!.class.findUnique({ where: { id: input.classId } });
    if (!classRecord) {
      return null;
    }

    let session = await prisma!.attendanceSession.findFirst({
      where: {
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        date: new Date(input.date),
      },
    });

    if (!session) {
      session = await prisma!.attendanceSession.create({
        data: {
          classId: input.classId,
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          date: new Date(input.date),
        },
      });
    }

    const records = [];
    for (const entry of input.entries) {
      const record = await prisma!.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: entry.studentId,
          },
        },
        create: {
          sessionId: session.id,
          studentId: entry.studentId,
          status: entry.status as AttendanceStatus,
          reason: entry.reason,
          minutesLate: entry.minutesLate,
        },
        update: {
          status: entry.status as AttendanceStatus,
          reason: entry.reason,
          minutesLate: entry.minutesLate,
        },
      });

      records.push({
        id: record.id,
        sessionId: record.sessionId,
        studentId: record.studentId,
        status: record.status,
        reason: record.reason ?? undefined,
        minutesLate: record.minutesLate ?? undefined,
      });
    }

    return {
      session: {
        id: session.id,
        classId: session.classId,
        teacherId: session.teacherId,
        subjectId: session.subjectId ?? undefined,
        date: session.date.toISOString().slice(0, 10),
      } satisfies DevAttendanceSession,
      count: records.length,
      records,
    };
  },

  async findPendingAttendanceJustificationsByParentPhone(phone: string) {
    const raw = normalizePhone(phone);
    const digits = digitsOnly(raw);

    if (!isPrismaEnabled()) {
      const parent = devStore.users.find(
        (user) =>
          user.role === "PARENT" &&
          user.phone &&
          (normalizePhone(user.phone) === raw || digitsOnly(user.phone) === digits),
      );

      if (!parent) {
        return [];
      }

      const linkedStudents = devStore.users.filter(
        (user) => user.role === "STUDENT" && user.lastName === parent.lastName,
      );

      return devStore.attendanceRecords
        .map((record) => {
          const session = devStore.attendanceSessions.find((item) => item.id === record.sessionId);
          const student = linkedStudents.find((item) => item.id === record.studentId);
          if (!session || !student) return null;
          if (record.reason || record.status === "PRESENT") return null;

          return {
            recordId: record.id,
            studentId: student.id,
            studentFirstName: student.firstName,
            studentLastName: student.lastName,
            date: session.date,
            status: record.status,
          };
        })
        .filter(Boolean)
        .sort((left, right) => String(right!.date).localeCompare(String(left!.date)));
    }

    const prisma = getPrismaClient();
    const parent = await prisma!.user.findFirst({
      where: {
        role: "PARENT",
        OR: [{ phone: raw }, { phone: `+${digits}` }, { phone: { endsWith: digits } }],
      },
    });

    if (!parent) {
      return [];
    }

    const links = await prisma!.parentStudent.findMany({
      where: { parentUserId: parent.id },
      select: { studentId: true },
    });

    const studentIds = links.map((link) => link.studentId);
    if (!studentIds.length) {
      return [];
    }

    const records = await prisma!.attendanceRecord.findMany({
      where: {
        studentId: { in: studentIds },
        reason: null,
        status: { in: ["ABSENT", "LATE"] },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        session: true,
      },
      orderBy: [{ session: { date: "desc" } }, { createdAt: "desc" }],
      take: 20,
    });

    return records.map((record) => ({
      recordId: record.id,
      studentId: record.studentId,
      studentFirstName: record.student.user.firstName,
      studentLastName: record.student.user.lastName,
      date: record.session.date.toISOString().slice(0, 10),
      status: record.status,
    }));
  },

  async updateAttendanceReason(recordId: string, reason: string) {
    if (!isPrismaEnabled()) {
      const record = devStore.attendanceRecords.find((item) => item.id === recordId);
      if (!record) {
        return null;
      }
      record.reason = reason;
      return {
        id: record.id,
        studentId: record.studentId,
        reason: record.reason,
        status: record.status,
      };
    }

    const prisma = getPrismaClient();
    const record = await prisma!.attendanceRecord.update({
      where: { id: recordId },
      data: { reason },
    });

    return {
      id: record.id,
      studentId: record.studentId,
      reason: record.reason ?? undefined,
      status: record.status,
    };
  },

  async createClass(input: { schoolId: string; academicYearId: string; name: string; level?: string }) {
    if (!isPrismaEnabled()) {
      const duplicate = devStore.classes.find(
        (c) => c.schoolId === input.schoolId && c.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
      );
      if (duplicate) throw new Error("Une classe avec ce nom existe déjà.");

      const defaultYear = devStore.academicYears.find((y) => y.schoolId === input.schoolId && y.isActive)
        ?? devStore.academicYears[0];

      const created = {
        id: createId("class"),
        schoolId: input.schoolId,
        academicYearId: input.academicYearId || defaultYear?.id || "ay_2025_2026",
        name: input.name.trim(),
        level: input.level ?? "",
        studentIds: [] as string[],
        teacherIds: [] as string[],
      };
      devStore.classes.push(created);
      return { id: created.id, schoolId: created.schoolId, academicYearId: created.academicYearId, name: created.name, level: created.level, studentsCount: 0, teachersCount: 0 };
    }

    const prisma = getPrismaClient();
    const cls = await prisma!.class.create({
      data: { schoolId: input.schoolId, academicYearId: input.academicYearId, name: input.name.trim(), level: input.level },
    });
    return { id: cls.id, schoolId: cls.schoolId, academicYearId: cls.academicYearId, name: cls.name, level: cls.level ?? undefined, studentsCount: 0, teachersCount: 0 };
  },

  async deleteClass(classId: string) {
    if (!isPrismaEnabled()) {
      const index = devStore.classes.findIndex((c) => c.id === classId);
      if (index === -1) throw new Error("Classe introuvable.");
      devStore.classes.splice(index, 1);
      devStore.teacherAssignments = devStore.teacherAssignments.filter((a) => a.classId !== classId);
      return { id: classId };
    }

    const prisma = getPrismaClient();
    await prisma!.class.delete({ where: { id: classId } });
    return { id: classId };
  },

  async createSubject(input: { schoolId: string; name: string; coefficientDefault?: number }) {
    if (!isPrismaEnabled()) {
      const duplicate = devStore.subjects.find(
        (s) => s.schoolId === input.schoolId && s.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
      );
      if (duplicate) throw new Error("Une matière avec ce nom existe déjà.");

      const created = {
        id: createId("subject"),
        schoolId: input.schoolId,
        name: input.name.trim(),
        coefficientDefault: input.coefficientDefault ?? 1,
      };
      devStore.subjects.push(created);
      return created;
    }

    const prisma = getPrismaClient();
    const subject = await prisma!.subject.create({
      data: { schoolId: input.schoolId, name: input.name.trim(), coefficientDefault: input.coefficientDefault ?? 1 },
    });
    return { id: subject.id, schoolId: subject.schoolId, name: subject.name, coefficientDefault: subject.coefficientDefault };
  },

  async deleteSubject(subjectId: string) {
    if (!isPrismaEnabled()) {
      const index = devStore.subjects.findIndex((s) => s.id === subjectId);
      if (index === -1) throw new Error("Matière introuvable.");
      devStore.subjects.splice(index, 1);
      devStore.teacherAssignments = devStore.teacherAssignments.filter((a) => a.subjectId !== subjectId);
      return { id: subjectId };
    }

    const prisma = getPrismaClient();
    await prisma!.subject.delete({ where: { id: subjectId } });
    return { id: subjectId };
  },

  async listAssignments() {
    if (!isPrismaEnabled()) {
      return devStore.teacherAssignments.map((a) => {
        const teacher = devStore.users.find((u) => u.id === a.teacherId);
        const cls = devStore.classes.find((c) => c.id === a.classId);
        const subject = devStore.subjects.find((s) => s.id === a.subjectId);
        return {
          id: a.id,
          teacherId: a.teacherId,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : a.teacherId,
          classId: a.classId,
          className: cls?.name ?? a.classId,
          subjectId: a.subjectId,
          subjectName: subject?.name ?? a.subjectId,
        };
      });
    }

    const prisma = getPrismaClient();
    const rows = await prisma!.teacherAssignment.findMany({
      include: {
        teacher: { include: { user: true } },
        class: true,
        subject: true,
      },
      orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
    });

    return rows.map((row) => ({
      id: row.id,
      teacherId: row.teacherId,
      teacherName: `${row.teacher.user.firstName} ${row.teacher.user.lastName}`,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
    }));
  },

  async createAssignment(input: { teacherId: string; classId: string; subjectId: string }) {
    if (!isPrismaEnabled()) {
      const duplicate = devStore.teacherAssignments.find(
        (a) =>
          a.teacherId === input.teacherId &&
          a.classId === input.classId &&
          a.subjectId === input.subjectId,
      );
      if (duplicate) {
        throw new Error("Cette affectation existe déjà.");
      }

      const created: DevTeacherAssignment = {
        id: createId("ta"),
        ...input,
      };
      devStore.teacherAssignments.push(created);

      const teacher = devStore.users.find((u) => u.id === input.teacherId);
      const cls = devStore.classes.find((c) => c.id === input.classId);
      const subject = devStore.subjects.find((s) => s.id === input.subjectId);

      if (!cls?.teacherIds.includes(input.teacherId)) {
        cls?.teacherIds.push(input.teacherId);
      }

      return {
        id: created.id,
        teacherId: created.teacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : created.teacherId,
        classId: created.classId,
        className: cls?.name ?? created.classId,
        subjectId: created.subjectId,
        subjectName: subject?.name ?? created.subjectId,
      };
    }

    const prisma = getPrismaClient();
    const row = await prisma!.teacherAssignment.create({
      data: input,
      include: {
        teacher: { include: { user: true } },
        class: true,
        subject: true,
      },
    });

    return {
      id: row.id,
      teacherId: row.teacherId,
      teacherName: `${row.teacher.user.firstName} ${row.teacher.user.lastName}`,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
    };
  },

  async deleteAssignment(assignmentId: string) {
    if (!isPrismaEnabled()) {
      const index = devStore.teacherAssignments.findIndex((a) => a.id === assignmentId);
      if (index === -1) {
        throw new Error("Affectation introuvable.");
      }
      devStore.teacherAssignments.splice(index, 1);
      return { id: assignmentId };
    }

    const prisma = getPrismaClient();
    const row = await prisma!.teacherAssignment.delete({ where: { id: assignmentId } });
    return { id: row.id };
  },

  // ─── Emploi du temps ───────────────────────────────────────────────────────

  async listTimeSlots(filters?: { classId?: string; teacherId?: string }) {
    if (!isPrismaEnabled()) {
      return devStore.timeSlots
        .filter((slot) => {
          if (filters?.classId && slot.classId !== filters.classId) return false;
          if (filters?.teacherId && slot.teacherId !== filters.teacherId) return false;
          return true;
        })
        .map((slot) => {
          const cls = devStore.classes.find((c) => c.id === slot.classId);
          const subject = devStore.subjects.find((s) => s.id === slot.subjectId);
          const teacher = devStore.users.find((u) => u.id === slot.teacherId);
          return {
            id: slot.id,
            classId: slot.classId,
            className: cls?.name ?? slot.classId,
            subjectId: slot.subjectId,
            subjectName: subject?.name ?? slot.subjectId,
            teacherId: slot.teacherId,
            teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : slot.teacherId,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room ?? null,
          };
        });
    }

    // Prisma stub — implémentation à compléter avec la migration TimeSlot
    return [];
  },

  async createTimeSlot(input: {
    classId: string;
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    if (!isPrismaEnabled()) {
      const cls = devStore.classes.find((c) => c.id === input.classId);
      const subject = devStore.subjects.find((s) => s.id === input.subjectId);
      const teacher = devStore.users.find((u) => u.id === input.teacherId);

      if (!cls) throw new Error("Classe introuvable.");
      if (!subject) throw new Error("Matière introuvable.");
      if (!teacher) throw new Error("Enseignant introuvable.");

      const duplicate = devStore.timeSlots.find(
        (s) =>
          s.classId === input.classId &&
          s.day === input.day &&
          s.startTime === input.startTime,
      );
      if (duplicate) throw new Error("Un créneau existe déjà à ce jour et cette heure pour cette classe.");

      const created = {
        id: createId("ts"),
        classId: input.classId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        day: input.day as import("./dev-store").WeekDay,
        startTime: input.startTime,
        endTime: input.endTime,
        room: input.room,
      };

      devStore.timeSlots.push(created);

      return {
        id: created.id,
        classId: cls.id,
        className: cls.name,
        subjectId: subject.id,
        subjectName: subject.name,
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        day: created.day,
        startTime: created.startTime,
        endTime: created.endTime,
        room: created.room ?? null,
      };
    }

    throw new Error("Emploi du temps non disponible en mode Prisma pour l'instant.");
  },

  async deleteTimeSlot(slotId: string) {
    if (!isPrismaEnabled()) {
      const index = devStore.timeSlots.findIndex((s) => s.id === slotId);
      if (index === -1) throw new Error("Créneau introuvable.");
      devStore.timeSlots.splice(index, 1);
      return { id: slotId };
    }

    throw new Error("Emploi du temps non disponible en mode Prisma pour l'instant.");
  },
};
