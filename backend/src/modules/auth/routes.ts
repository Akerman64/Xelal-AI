import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "./middleware";
import { AuthError, authService } from "./service";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Les champs email et password sont obligatoires." });
  }

  Promise.resolve()
    .then(async () => {
      const result = await authService.login(email, password);
      return res.status(200).json(result);
    })
    .catch((error) => {
      const statusCode = error instanceof AuthError ? error.statusCode : 401;
      const message =
        error instanceof Error ? error.message : "Connexion impossible.";
      return res.status(statusCode).json({ error: message });
    });
});

authRouter.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  return res.status(200).json({ user: req.currentUser });
});

authRouter.post("/activate-invitation", (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !code || !password) {
    return res.status(400).json({
      error: "Les champs email, code et password sont obligatoires.",
    });
  }

  Promise.resolve()
    .then(async () => {
      const result = await authService.activateInvitation(email, code, password);
      return res.status(200).json(result);
    })
    .catch((error) => {
      const statusCode = error instanceof AuthError ? error.statusCode : 400;
      const message =
        error instanceof Error ? error.message : "Activation impossible.";
      return res.status(statusCode).json({ error: message });
    });
});
