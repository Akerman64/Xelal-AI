import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { AttendanceError, attendanceService } from "./service";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

attendanceRouter.get("/students/:studentId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res
        .status(200)
        .json({ data: await attendanceService.getStudentAttendance(req.params.studentId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AttendanceError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Eleve introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});

attendanceRouter.get("/classes/:classId", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res
        .status(200)
        .json({ data: await attendanceService.getClassAttendance(req.params.classId) });
    })
    .catch((error) => {
      const statusCode = error instanceof AttendanceError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Classe introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});

attendanceRouter.post("/records/bulk", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const { classId, teacherId, date, subjectId, startTime, endTime, entries } = req.body ?? {};

      if (!classId || !teacherId || !date || !Array.isArray(entries) || !entries.length) {
        return res.status(400).json({
          error: "classId, teacherId, date et entries sont obligatoires.",
        });
      }

      return res.status(200).json({
        data: await attendanceService.bulkUpsertAttendance({
          classId,
          teacherId,
          date,
          subjectId,
          startTime: typeof startTime === "string" ? startTime : undefined,
          endTime: typeof endTime === "string" ? endTime : undefined,
          entries: entries.map((entry) => ({
            studentId: String(entry.studentId),
            status: String(entry.status) as "PRESENT" | "ABSENT" | "LATE",
            reason: typeof entry.reason === "string" ? entry.reason : undefined,
            minutesLate:
              entry.minutesLate !== undefined ? Number(entry.minutesLate) : undefined,
          })),
        }),
      });
    })
    .catch((error) => {
      const statusCode = error instanceof AttendanceError ? error.statusCode : 400;
      const message =
        error instanceof Error ? error.message : "Enregistrement impossible.";
      return res.status(statusCode).json({ error: message });
    });
});
