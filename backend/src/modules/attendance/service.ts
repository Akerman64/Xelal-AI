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
    startTime?: string;
    endTime?: string;
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

    const notifications = [];

    for (const record of result.records) {
      const student = await schoolRepository.getStudentGrades(record.studentId);
      if (!student) {
        continue;
      }

      const notification = await notificationsService.notifyAttendanceRecorded({
        studentId: record.studentId,
        studentFirstName: student.student.firstName,
        studentLastName: student.student.lastName,
        date: input.date,
        status: record.status as "PRESENT" | "ABSENT" | "LATE",
        minutesLate: record.minutesLate,
        reason: record.reason,
      });
      notifications.push({
        studentId: record.studentId,
        studentName: `${student.student.firstName} ${student.student.lastName}`,
        ...notification,
      });
    }

    return {
      ...result,
      notifications,
      notificationsSent: notifications.reduce((sum, item) => sum + item.sent, 0),
    };
  },
};
