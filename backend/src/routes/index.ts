import { Router } from "express";
import { adminRouter } from "../modules/admin/routes";
import { academicsRouter } from "../modules/academics/routes";
import { attendanceRouter } from "../modules/attendance/routes";
import { authRouter } from "../modules/auth/routes";
import { classesRouter } from "../modules/classes/routes";
import { teacherRouter } from "../modules/teacher/routes";
import { usersRouter } from "../modules/users/routes";
import { whatsappRouter } from "../modules/whatsapp/routes";
import { healthRouter } from "./health";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/teacher", teacherRouter);
apiRouter.use("/classes", classesRouter);
apiRouter.use("/academics", academicsRouter);
apiRouter.use("/attendance", attendanceRouter);
apiRouter.use("/whatsapp", whatsappRouter);
