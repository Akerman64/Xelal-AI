import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { UsersError, usersService } from "./service";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", (_req, res) => {
  return res.status(200).json({ data: usersService.listUsers() });
});

usersRouter.get("/:id", (req, res) => {
  try {
    return res.status(200).json({ data: usersService.getUserById(req.params.id) });
  } catch (error) {
    const statusCode = error instanceof UsersError ? error.statusCode : 404;
    const message =
      error instanceof Error ? error.message : "Utilisateur introuvable.";
    return res.status(statusCode).json({ error: message });
  }
});
