import { createId, devStore, DevMessage } from "../core/dev-store";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";

export class MessagesError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function resolveStudentProfileId(studentId: string) {
  if (!isPrismaEnabled()) return studentId;

  const prisma = getPrismaClient();
  const student = await prisma!.student.findFirst({
    where: { OR: [{ id: studentId }, { userId: studentId }] },
    select: { id: true },
  });

  return student?.id ?? null;
}

/**
 * Construit la liste des contacts (parents des élèves du professeur)
 * avec le dernier message de chaque fil.
 */
export const messagesService = {
  async listContacts(teacherId: string) {
    if (isPrismaEnabled()) {
      const prisma = getPrismaClient() as any;
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: teacherId },
        select: { id: true },
      });
      const teacherIds = [teacherId, teacherProfile?.id].filter(Boolean);
      const messages = await prisma.message.findMany({
        where: { teacherId: { in: teacherIds } },
        orderBy: { createdAt: "desc" },
      });

      const parentIds = Array.from(new Set(messages.map((item: any) => String(item.parentUserId))));
      const studentIds = Array.from(new Set(messages.map((item: any) => String(item.studentId))));

      const [parents, students] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: parentIds } } }),
        prisma.student.findMany({
          where: { OR: [{ id: { in: studentIds } }, { userId: { in: studentIds } }] },
          include: { user: true },
        }),
      ]);

      const parentMap = new Map<string, any>(parents.map((item: any) => [item.id, item]));
      const studentMap = new Map<string, any>();
      for (const student of students) {
        studentMap.set(student.id, student);
        studentMap.set(student.userId, student);
      }
      const threadMap = new Map<string, typeof messages>();

      for (const message of messages) {
        const key = `${message.parentUserId}:${message.studentId}`;
        const thread = threadMap.get(key) ?? [];
        thread.push(message);
        threadMap.set(key, thread);
      }

      const contacts = Array.from(threadMap.entries())
        .map(([key, thread]) => {
          const [parentUserId, studentId] = key.split(":");
          const parent = parentMap.get(parentUserId);
          const student = studentMap.get(studentId);
          if (!parent || !student) return null;

          const lastMsg = thread[0] ?? null;

          return {
            parentUserId,
            parentName: `${parent.firstName} ${parent.lastName}`,
            studentId,
            studentName: `${student.user.firstName} ${student.user.lastName}`,
            lastMessage: lastMsg?.content ?? null,
            lastMessageAt: lastMsg?.createdAt.toISOString() ?? null,
            lastSenderRole: lastMsg?.senderRole ?? null,
            unreadCount: thread.filter((m) => m.senderRole === "PARENT" && !m.teacherReadAt).length,
          };
        })
        .filter(Boolean);

      return contacts.sort((a, b) =>
        (b!.lastMessageAt ?? "").localeCompare(a!.lastMessageAt ?? ""),
      );
    }

    // Pour chaque élève des classes de l'enseignant, on trouve le parent lié
    const teacherClasses = devStore.classes.filter((c) => c.teacherIds.includes(teacherId));
    const studentIds = teacherClasses.flatMap((c) => c.studentIds);

    const parentStudentMap = new Map<string, string>(); // parentUserId → studentId (premier élève lié)
    for (const msg of devStore.messages) {
      if (msg.teacherId === teacherId && !parentStudentMap.has(msg.parentUserId)) {
        parentStudentMap.set(msg.parentUserId, msg.studentId);
      }
    }

    for (const studentId of studentIds) {
      const link = devStore.parentStudentLinks.find((item) => item.studentId === studentId);
      if (link && !parentStudentMap.has(link.parentUserId)) {
        parentStudentMap.set(link.parentUserId, studentId);
      }
    }

    const contacts = [];
    for (const [parentUserId, studentId] of parentStudentMap.entries()) {
      const parent = devStore.users.find((u) => u.id === parentUserId);
      const student = devStore.users.find((u) => u.id === studentId);
      if (!parent || !student) continue;

      // Dernier message du fil
      const thread = devStore.messages
        .filter((m) => m.teacherId === teacherId && m.parentUserId === parentUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const lastMsg = thread[0] ?? null;
      contacts.push({
        parentUserId,
        parentName: `${parent.firstName} ${parent.lastName}`,
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt ?? null,
        lastSenderRole: lastMsg?.senderRole ?? null,
        unreadCount: thread.filter((m) => m.senderRole === "PARENT" && !m.teacherReadAt).length,
      });
    }

    return contacts.sort((a, b) =>
      (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
    );
  },

  async getThread(teacherId: string, studentId: string) {
    if (isPrismaEnabled()) {
      const prisma = getPrismaClient();
      const teacherProfile = await prisma!.teacher.findUnique({
        where: { userId: teacherId },
        select: { id: true },
      });
      const teacherIds = [teacherId, teacherProfile?.id].filter(Boolean) as string[];
      const studentProfileId = await resolveStudentProfileId(studentId);
      const studentProfile = studentProfileId ? await prisma!.student.findUnique({
        where: { id: studentProfileId },
        include: { user: true },
      }) : null;
      const [student, parentLink, thread] = await Promise.all([
        Promise.resolve(studentProfile),
        prisma!.parentStudent.findFirst({
          where: { studentId: studentProfile?.id ?? studentId },
          orderBy: [{ isPrimary: "desc" }],
        }),
        prisma!.message.findMany({
          where: {
            teacherId: { in: teacherIds },
            studentId: { in: [studentId, studentProfile?.id, studentProfile?.userId].filter(Boolean) as string[] },
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      if (!student) throw new MessagesError("Élève introuvable.", 404);

      const parent = parentLink
        ? await prisma!.user.findUnique({ where: { id: parentLink.parentUserId } })
        : null;

      return {
        student: { id: student.id, firstName: student.user.firstName, lastName: student.user.lastName },
        parent: parent ? { id: parent.id, firstName: parent.firstName, lastName: parent.lastName } : null,
        thread: thread.map((m) => ({
          id: m.id,
          content: m.content,
          senderRole: m.senderRole,
          createdAt: m.createdAt.toISOString(),
          teacherReadAt: m.teacherReadAt?.toISOString(),
        })),
      };
    }

    const student = devStore.users.find((u) => u.id === studentId);
    if (!student) throw new MessagesError("Élève introuvable.", 404);

    const existingMsg = devStore.messages.find(
      (m) => m.teacherId === teacherId && m.studentId === studentId,
    );
    const parentUserId = existingMsg?.parentUserId
      ?? devStore.parentStudentLinks.find((item) => item.studentId === studentId)?.parentUserId
      ?? null;
    if (!parentUserId) return { student, thread: [] };

    const parent = devStore.users.find((u) => u.id === parentUserId);

    const thread = devStore.messages
      .filter((m) => m.teacherId === teacherId && m.studentId === studentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({
        id: m.id,
        content: m.content,
        senderRole: m.senderRole,
        createdAt: m.createdAt,
      }));

    return {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      parent: parent ? { id: parent.id, firstName: parent.firstName, lastName: parent.lastName } : null,
      thread,
    };
  },

  async sendMessage(teacherId: string, studentId: string, content: string) {
    if (isPrismaEnabled()) {
      const prisma = getPrismaClient();
      const studentProfileId = await resolveStudentProfileId(studentId);
      const student = studentProfileId
        ? await prisma!.student.findUnique({ where: { id: studentProfileId } })
        : null;
      if (!student) throw new MessagesError("Élève introuvable.", 404);

      const parentLink = await prisma!.parentStudent.findFirst({
        where: { studentId: student.id },
        orderBy: [{ isPrimary: "desc" }],
      });
      if (!parentLink) throw new MessagesError("Aucun parent lié à cet élève.", 404);

      const created = await (prisma as any).message.create({
        data: {
          teacherId,
          parentUserId: parentLink.parentUserId,
          studentId,
          content: content.trim(),
          senderRole: "TEACHER",
        },
      });

      return {
        id: created.id,
        content: created.content,
        senderRole: created.senderRole,
        createdAt: created.createdAt.toISOString(),
      };
    }

    const student = devStore.users.find((u) => u.id === studentId);
    if (!student) throw new MessagesError("Élève introuvable.", 404);

    const existingMsg = devStore.messages.find(
      (m) => m.teacherId === teacherId && m.studentId === studentId,
    );
    const parentUserId = existingMsg?.parentUserId
      ?? devStore.parentStudentLinks.find((item) => item.studentId === studentId)?.parentUserId
      ?? null;
    if (!parentUserId) throw new MessagesError("Aucun parent lié à cet élève.", 404);

    const created: DevMessage = {
      id: createId("msg"),
      teacherId,
      parentUserId,
      studentId,
      content: content.trim(),
      senderRole: "TEACHER",
      createdAt: new Date().toISOString(),
    };
    devStore.messages.push(created);
    return created;
  },

  async markThreadAsRead(teacherId: string, studentId: string) {
    if (isPrismaEnabled()) {
      const prisma = getPrismaClient();
      const teacherProfile = await prisma!.teacher.findUnique({
        where: { userId: teacherId },
        select: { id: true },
      });
      const teacherIds = [teacherId, teacherProfile?.id].filter(Boolean) as string[];
      const result = await (prisma as any).message.updateMany({
        where: {
          teacherId: { in: teacherIds },
          studentId: { in: [studentId, await resolveStudentProfileId(studentId)].filter(Boolean) },
          senderRole: "PARENT",
          teacherReadAt: null,
        },
        data: {
          teacherReadAt: new Date(),
        },
      });

      return { updated: result.count };
    }

    let updated = 0;
    for (const message of devStore.messages) {
      if (
        message.teacherId === teacherId &&
        message.studentId === studentId &&
        message.senderRole === "PARENT" &&
        !message.teacherReadAt
      ) {
        message.teacherReadAt = new Date().toISOString();
        updated += 1;
      }
    }

    return { updated };
  },

  async createParentInboundMessage(input: {
    parentUserId: string;
    studentId: string;
    content: string;
  }) {
    if (isPrismaEnabled()) {
      const prisma = getPrismaClient();
      const enrollment = await prisma!.studentEnrollment.findFirst({
        where: {
          studentId: input.studentId,
          status: "ACTIVE",
        },
        include: {
          class: {
            include: {
              assignments: true,
            },
          },
        },
      });

      const teacherId = enrollment?.class.assignments[0]?.teacherId;
      if (!teacherId) {
        throw new MessagesError("Aucun enseignant lié à cet élève.", 404);
      }
      const teacherProfile = await prisma!.teacher.findUnique({
        where: { id: teacherId },
        select: { userId: true },
      });

      const created = await (prisma as any).message.create({
        data: {
          teacherId: teacherProfile?.userId ?? teacherId,
          parentUserId: input.parentUserId,
          studentId: input.studentId,
          content: input.content.trim(),
          senderRole: "PARENT",
        },
      });

      return {
        id: created.id,
        teacherId: created.teacherId,
        parentUserId: created.parentUserId,
        studentId: created.studentId,
        content: created.content,
        senderRole: created.senderRole,
        createdAt: created.createdAt.toISOString(),
      };
    }

    const teacherClass = devStore.classes.find((classRecord) =>
      classRecord.studentIds.includes(input.studentId),
    );
    const teacherId = teacherClass?.teacherIds[0];
    if (!teacherId) {
      throw new MessagesError("Aucun enseignant lié à cet élève.", 404);
    }

    const created: DevMessage = {
      id: createId("msg"),
      teacherId,
      parentUserId: input.parentUserId,
      studentId: input.studentId,
      content: input.content.trim(),
      senderRole: "PARENT",
      createdAt: new Date().toISOString(),
    };
    devStore.messages.push(created);
    return created;
  },
};
