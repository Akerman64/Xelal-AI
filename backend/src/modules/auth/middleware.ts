import { NextFunction, Request, Response } from "express";
import { authService, AuthError } from "./service";
import { AppRole } from "../core/dev-store";

export interface AuthenticatedRequest extends Request {
  currentUser?: Awaited<ReturnType<typeof authService.getCurrentUser>>;
}

const extractBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  Promise.resolve()
    .then(async () => {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
      throw new AuthError("Authorization Bearer token requis.");
    }

    req.currentUser = await authService.getCurrentUser(token);
    next();
    })
    .catch((error) => {
    const statusCode = error instanceof AuthError ? error.statusCode : 401;
    const message =
      error instanceof Error ? error.message : "Acces non autorise.";

    res.status(statusCode).json({ error: message });
    });
};

export const requireRole =
  (...allowedRoles: AppRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const currentUser = req.currentUser;
    if (!currentUser) {
      return res.status(401).json({ error: "Acces non autorise." });
    }

    if (!allowedRoles.includes(currentUser.role)) {
      return res.status(403).json({ error: "Permissions insuffisantes." });
    }

    next();
  };
