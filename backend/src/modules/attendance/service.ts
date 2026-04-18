import { schoolRepository } from "../core/school-repository";
import { notificationsService } from "../notifications/service";

export class AttendanceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const attendanceService = {
  async getStudentAttendance(studentId: string) {
    const attendance = await schoolRepository.getStudentAttendance(studentId);
    if (!attendance) {
      throw new AttendanceError("Eleve introuvable.");
    }
    return attendance;
  },

  async getClassAttendance(classId: string) {
    const attendance = await schoolRepository.getClassAttendance(classId);
    if (!attendance) {
      throw new AttendanceError("Classe introuvable.");
    }
    return attendance;
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
    const result = await schoolRepository.bulkUpsertAttendance(input);
    if (!result) {
      throw new AttendanceError("Classe introuvable.");
    }

    for (const entry of input.entries) {
      const student = await schoolRepository.getStudentGrades(entry.studentId);
      if (!student) {
        continue;
      }

      await notificationsService.notifyAttendanceRecorded({
        studentId: entry.studentId,
        studentFirstName: student.student.firstName,
        studentLastName: student.student.lastName,
        date: input.date,
        status: entry.status,
        minutesLate: entry.minutesLate,
        reason: entry.reason,
      });
    }

    return result;
  },
};
