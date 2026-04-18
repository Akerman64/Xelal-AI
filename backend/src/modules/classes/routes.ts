import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { ClassesError, classesService } from "./service";

export const classesRouter = Router();

classesRouter.use(requireAuth);

classesRouter.get("/", (_req, res) => {
  Promise.resolve()
    .then(async () => {
      return res.status(200).json({ data: await classesService.listClasses() });
    })
    .catch((error) => {
      const statusCode = error instanceof ClassesError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Classe introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});

classesRouter.get("/:id/students", (req, res) => {
  Promise.resolve()
    .then(async () => {
      return res
        .status(200)
        .json({ data: await classesService.getClassStudents(req.params.id) });
    })
    .catch((error) => {
      const statusCode = error instanceof ClassesError ? error.statusCode : 404;
      const message = error instanceof Error ? error.message : "Classe introuvable.";
      return res.status(statusCode).json({ error: message });
    });
});
