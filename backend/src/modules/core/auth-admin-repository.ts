import { InvitationStatus, Role, UserStatus } from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import {
  AppRole,
  AppUserStatus,
  DevInvitation,
  DevUser,
  createId,
  createInvitationCode,
  devStore,
} from "./dev-store";

const roleMapToApp = (role: Role): AppRole => role as AppRole;
const statusMapToApp = (status: UserStatus): AppUserStatus => status as AppUserStatus;

const invitationStatusToMemory = (
  status: InvitationStatus,
): DevInvitation["status"] => status as DevInvitation["status"];

const toAppUser = (user: {
  id: string;
  schoolId: string;
  classId?: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  passwordHash?: string | null;
  mustChangePassword?: boolean;
}) => ({
  id: user.id,
  schoolId: user.schoolId,
  classId: user.classId ?? undefined,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email ?? "",
  phone: user.phone ?? undefined,
  role: roleMapToApp(user.role),
  status: statusMapToApp(user.status),
  passwordHash: user.passwordHash ?? undefined,
  mustChangePassword: Boolean(user.mustChangePassword),
});

const toAppInvitation = (invitation: {
  id: string;
  schoolId: string;
  userId: string;
  email: string;
  role: Role;
  code: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date | null;
}): DevInvitation => ({
  id: invitation.id,
  schoolId: invitation.schoolId,
  userId: invitation.userId,
  email: invitation.email,
  role: roleMapToApp(invitation.role),
  code: invitation.code,
  status: invitationStatusToMemory(invitation.status),
  expiresAt: invitation.expiresAt.toISOString(),
  createdAt: invitation.createdAt.toISOString(),
  acceptedAt: invitation.acceptedAt?.toISOString(),
});

export const authAdminRepository = {
  async findUserByEmail(email: string): Promise<DevUser | null> {
    if (!isPrismaEnabled()) {
      return (
        devStore.users.find((item) => item.email.toLowerCase() === email.toLowerCase()) ??
        null
      );
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    return user ? toAppUser(user) : null;
  },

  async findUserById(userId: string): Promise<DevUser | null> {
    if (!isPrismaEnabled()) {
      return devStore.users.find((item) => item.id === userId) ?? null;
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.findUnique({ where: { id: userId } });
    return user ? toAppUser(user) : null;
  },

  async listUsers(): Promise<DevUser[]> {
    if (!isPrismaEnabled()) {
      return [...devStore.users];
    }

    const prisma = getPrismaClient();
    const users = await prisma!.user.findMany({ orderBy: { createdAt: "asc" } });
    return users.map(toAppUser);
  },

  async listInvitations(): Promise<DevInvitation[]> {
    if (!isPrismaEnabled()) {
      return [...devStore.invitations];
    }

    const prisma = getPrismaClient();
    const invitations = await prisma!.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(toAppInvitation);
  },

  async findInvitationById(invitationId: string): Promise<DevInvitation | null> {
    if (!isPrismaEnabled()) {
      return devStore.invitations.find((item) => item.id === invitationId) ?? null;
    }

    const prisma = getPrismaClient();
    const invitation = await prisma!.invitation.findUnique({
      where: { id: invitationId },
    });
    return invitation ? toAppInvitation(invitation) : null;
  },

  async createPendingUser(input: {
    schoolId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: AppRole;
    classId?: string;
  }): Promise<DevUser> {
    if (!isPrismaEnabled()) {
      const user: DevUser = {
        id: createId("user"),
        schoolId: input.schoolId,
        classId: input.classId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        role: input.role,
        status: "PENDING",
      };
      devStore.users.push(user);
      return user;
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.create({
      data: {
        schoolId: input.schoolId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        role: input.role as Role,
        status: UserStatus.PENDING,
        mustChangePassword: false,
      },
    });
    return toAppUser(user);
  },

  async createUser(input: {
    schoolId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role: AppRole;
    status?: AppUserStatus;
  }): Promise<DevUser> {
    if (!isPrismaEnabled()) {
      const user: DevUser = {
        id: createId("user"),
        schoolId: input.schoolId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email?.toLowerCase() ?? "",
        phone: input.phone,
        role: input.role,
        status: input.status ?? "ACTIVE",
      };
      devStore.users.push(user);
      return user;
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.create({
      data: {
        schoolId: input.schoolId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email?.toLowerCase() || null,
        phone: input.phone,
        role: input.role as Role,
        status: (input.status ?? "ACTIVE") as UserStatus,
        mustChangePassword: false,
      },
    });
    return toAppUser(user);
  },

  async createInvitation(input: {
    schoolId: string;
    userId: string;
    email: string;
    role: AppRole;
    expiresAt: string;
  }): Promise<DevInvitation> {
    const code = createInvitationCode();

    if (!isPrismaEnabled()) {
      const invitation: DevInvitation = {
        id: createId("invite"),
        schoolId: input.schoolId,
        userId: input.userId,
        email: input.email.toLowerCase(),
        role: input.role,
        code,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        expiresAt: input.expiresAt,
      };
      devStore.invitations.push(invitation);
      return invitation;
    }

    const prisma = getPrismaClient();
    const invitation = await prisma!.invitation.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        email: input.email.toLowerCase(),
        role: input.role as Role,
        code,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(input.expiresAt),
      },
    });
    return toAppInvitation(invitation);
  },

  async findPendingInvitation(email: string, code: string): Promise<DevInvitation | null> {
    if (!isPrismaEnabled()) {
      return (
        devStore.invitations.find(
          (item) =>
            item.email.toLowerCase() === email.toLowerCase() &&
            item.code === code &&
            item.status === "PENDING",
        ) ?? null
      );
    }

    const prisma = getPrismaClient();
    const invitation = await prisma!.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        status: InvitationStatus.PENDING,
      },
    });
    return invitation ? toAppInvitation(invitation) : null;
  },

  async updateUserPasswordAndStatus(
    userId: string,
    passwordHash: string,
    status: AppUserStatus,
  ): Promise<DevUser> {
    if (!isPrismaEnabled()) {
      const user = devStore.users.find((item) => item.id === userId);
      if (!user) {
        throw new Error("Utilisateur introuvable.");
      }
      user.passwordHash = passwordHash;
      user.status = status;
      user.mustChangePassword = false;
      return user;
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: status as UserStatus,
        mustChangePassword: false,
      },
    });
    return toAppUser(user);
  },

  async updateInvitationStatus(
    invitationId: string,
    status: DevInvitation["status"],
  ): Promise<DevInvitation> {
    if (!isPrismaEnabled()) {
      const invitation = devStore.invitations.find((item) => item.id === invitationId);
      if (!invitation) {
        throw new Error("Invitation introuvable.");
      }
      invitation.status = status;
      invitation.acceptedAt =
        status === "ACCEPTED" ? new Date().toISOString() : invitation.acceptedAt;
      return invitation;
    }

    const prisma = getPrismaClient();
    const invitation = await prisma!.invitation.update({
      where: { id: invitationId },
      data: {
        status: status as InvitationStatus,
        acceptedAt: status === "ACCEPTED" ? new Date() : null,
      },
    });
    return toAppInvitation(invitation);
  },

  async refreshInvitation(
    invitationId: string,
    input: { code: string; expiresAt: string; status: DevInvitation["status"] },
  ): Promise<DevInvitation> {
    if (!isPrismaEnabled()) {
      const invitation = devStore.invitations.find((item) => item.id === invitationId);
      if (!invitation) {
        throw new Error("Invitation introuvable.");
      }
      invitation.code = input.code;
      invitation.expiresAt = input.expiresAt;
      invitation.status = input.status;
      invitation.acceptedAt = undefined;
      return invitation;
    }

    const prisma = getPrismaClient();
    const invitation = await prisma!.invitation.update({
      where: { id: invitationId },
      data: {
        code: input.code,
        expiresAt: new Date(input.expiresAt),
        status: input.status as InvitationStatus,
        acceptedAt: null,
      },
    });
    return toAppInvitation(invitation);
  },

  async updateUserStatus(userId: string, status: AppUserStatus): Promise<DevUser> {
    if (!isPrismaEnabled()) {
      const user = devStore.users.find((item) => item.id === userId);
      if (!user) {
        throw new Error("Utilisateur introuvable.");
      }
      user.status = status;
      return user;
    }

    const prisma = getPrismaClient();
    const user = await prisma!.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
    });
    return toAppUser(user);
  },
};
