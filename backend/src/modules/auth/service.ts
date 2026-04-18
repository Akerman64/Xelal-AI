import {
  publicInvitation,
  publicUser,
} from "../core/dev-store";
import { authAdminRepository } from "../core/auth-admin-repository";
import { hashPassword, verifyPassword } from "../core/password";
import { createAccessToken, verifyAccessToken } from "./token";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const authService = {
  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await authAdminRepository.findUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw new AuthError("Identifiants invalides.");
    }

    if (user.status === "PENDING") {
      throw new AuthError("Compte non active. Utilisez votre code d'invitation.", 403);
    }

    if (user.status === "SUSPENDED") {
      throw new AuthError("Compte suspendu. Contactez l'administration.", 403);
    }

    const token = createAccessToken(user.id);

    return {
      accessToken: token,
      tokenType: "Bearer",
      user: publicUser(user),
    };
  },

  async getCurrentUser(token: string) {
    let payload: { sub: string };
    try {
      payload = verifyAccessToken(token) as { sub: string };
    } catch {
      throw new AuthError("Session invalide ou expiree.");
    }

    const user = await authAdminRepository.findUserById(payload.sub);
    if (!user) {
      throw new AuthError("Utilisateur introuvable.", 404);
    }

    return publicUser(user);
  },

  async activateInvitation(email: string, code: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const invitation = await authAdminRepository.findPendingInvitation(
      normalizedEmail,
      code,
    );

    if (!invitation) {
      throw new AuthError("Invitation invalide ou deja utilisee.", 400);
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      invitation.status = "EXPIRED";
      throw new AuthError("Invitation expiree.", 400);
    }

    const user = await authAdminRepository.findUserById(invitation.userId);
    if (!user) {
      throw new AuthError("Utilisateur d'invitation introuvable.", 404);
    }

    const updatedUser = await authAdminRepository.updateUserPasswordAndStatus(
      user.id,
      hashPassword(password),
      "ACTIVE",
    );
    const updatedInvitation = await authAdminRepository.updateInvitationStatus(
      invitation.id,
      "ACCEPTED",
    );

    return {
      user: publicUser(updatedUser),
      invitation: publicInvitation(updatedInvitation),
    };
  },
};
