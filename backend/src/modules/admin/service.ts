import {
  AppRole,
  AppUserStatus,
  createInvitationCode,
  publicInvitation,
  publicUser,
} from "../core/dev-store";
import { authAdminRepository } from "../core/auth-admin-repository";
import { schoolRepository } from "../core/school-repository";

export class AdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const inSevenDays = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export const adminService = {
  async getOverview() {
    const [users, invitations] = await Promise.all([
      authAdminRepository.listUsers(),
      authAdminRepository.listInvitations(),
    ]);

    const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
    const pendingUsers = users.filter((user) => user.status === "PENDING").length;
    const suspendedUsers = users.filter((user) => user.status === "SUSPENDED").length;

    return {
      totals: {
        users: users.length,
        activeUsers,
        pendingUsers,
        suspendedUsers,
        invitationsPending: invitations.filter((item) => item.status === "PENDING").length,
      },
      byRole: {
        admins: users.filter((user) => user.role === "ADMIN").length,
        teachers: users.filter((user) => user.role === "TEACHER").length,
        students: users.filter((user) => user.role === "STUDENT").length,
        parents: users.filter((user) => user.role === "PARENT").length,
      },
      recentInvitations: invitations
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
        .map(publicInvitation),
    };
  },

  async listUsers() {
    const users = await authAdminRepository.listUsers();
    return users.map(publicUser);
  },

  async listInvitations() {
    const invitations = await authAdminRepository.listInvitations();
    return invitations.map(publicInvitation);
  },

  async inviteUser(input: {
    schoolId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: AppRole;
    classId?: string;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingUser = await authAdminRepository.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AdminError("Un utilisateur avec cet email existe deja.", 409);
    }

    const user = await authAdminRepository.createPendingUser({
      schoolId: input.schoolId,
      classId: input.classId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone,
      role: input.role,
    });
    const invitation = await authAdminRepository.createInvitation({
      schoolId: input.schoolId,
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: inSevenDays(),
    });

    return {
      user: publicUser(user),
      invitation: {
        ...publicInvitation(invitation),
        code: invitation.code,
      },
    };
  },

  async updateUserStatus(userId: string, status: AppUserStatus) {
    try {
      const user = await authAdminRepository.updateUserStatus(userId, status);
      return publicUser(user);
    } catch {
      throw new AdminError("Utilisateur introuvable.", 404);
    }
  },

  async resendInvitation(invitationId: string) {
    const invitation = await authAdminRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new AdminError("Invitation introuvable.", 404);
    }

    const refreshed = await authAdminRepository.refreshInvitation(invitationId, {
      code: createInvitationCode(),
      expiresAt: inSevenDays(),
      status: "PENDING",
    });

    return {
      ...publicInvitation(refreshed),
      code: refreshed.code,
    };
  },

  async expireInvitation(invitationId: string) {
    const invitation = await authAdminRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new AdminError("Invitation introuvable.", 404);
    }

    const updated = await authAdminRepository.updateInvitationStatus(invitationId, "EXPIRED");
    return publicInvitation(updated);
  },

  async listClasses() {
    return schoolRepository.listClasses();
  },

  async createClass(input: { schoolId: string; academicYearId: string; name: string; level?: string }) {
    try {
      return await schoolRepository.createClass(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Création impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteClass(classId: string) {
    try {
      return await schoolRepository.deleteClass(classId);
    } catch {
      throw new AdminError("Classe introuvable.", 404);
    }
  },

  async listSubjects() {
    return schoolRepository.listSubjects();
  },

  async createSubject(input: { schoolId: string; name: string; coefficientDefault?: number }) {
    try {
      return await schoolRepository.createSubject(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Création impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteSubject(subjectId: string) {
    try {
      return await schoolRepository.deleteSubject(subjectId);
    } catch {
      throw new AdminError("Matière introuvable.", 404);
    }
  },

  async listAssignments() {
    return schoolRepository.listAssignments();
  },

  async createAssignment(input: { teacherId: string; classId: string; subjectId: string }) {
    try {
      return await schoolRepository.createAssignment(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Affectation impossible.";
      throw new AdminError(message, 409);
    }
  },

  async deleteAssignment(assignmentId: string) {
    try {
      return await schoolRepository.deleteAssignment(assignmentId);
    } catch {
      throw new AdminError("Affectation introuvable.", 404);
    }
  },
};
