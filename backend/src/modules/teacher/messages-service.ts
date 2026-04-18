import { createId, devStore, DevMessage } from "../core/dev-store";
import { isPrismaEnabled } from "../../lib/prisma";

export class MessagesError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Construit la liste des contacts (parents des élèves du professeur)
 * avec le dernier message de chaque fil.
 */
export const messagesService = {
  async listContacts(teacherId: string) {
    if (isPrismaEnabled()) {
      // Prisma: à implémenter quand le modèle Message sera dans le schema
      return [];
    }

    // Pour chaque élève des classes de l'enseignant, on trouve le parent lié
    const teacherClasses = devStore.classes.filter((c) => c.teacherIds.includes(teacherId));
    const studentIds = teacherClasses.flatMap((c) => c.studentIds);

    // parent_1 est lié à student_1 via le store (simplification dev)
    // On construit un mapping studentId → parentUserId à partir des messages existants
    const parentStudentMap = new Map<string, string>(); // parentUserId → studentId (premier élève lié)
    for (const msg of devStore.messages) {
      if (msg.teacherId === teacherId && !parentStudentMap.has(msg.parentUserId)) {
        parentStudentMap.set(msg.parentUserId, msg.studentId);
      }
    }

    // Pour chaque étudiant sans parent dans les messages, on cherche un parent
    // (Dans la démo: parent_1 est parent de student_1)
    for (const studentId of studentIds) {
      // Heuristique dev: parent_1 → student_1 est la seule liaison connue
      if (studentId === "student_1" && !parentStudentMap.has("parent_1")) {
        parentStudentMap.set("parent_1", "student_1");
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
        unreadCount: thread.filter((m) => m.senderRole === "PARENT").length,
      });
    }

    return contacts.sort((a, b) =>
      (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
    );
  },

  async getThread(teacherId: string, studentId: string) {
    if (isPrismaEnabled()) return [];

    const student = devStore.users.find((u) => u.id === studentId);
    if (!student) throw new MessagesError("Élève introuvable.", 404);

    // Trouver le parent lié à cet élève dans les messages existants
    const existingMsg = devStore.messages.find(
      (m) => m.teacherId === teacherId && m.studentId === studentId,
    );
    const parentUserId = existingMsg?.parentUserId ?? (studentId === "student_1" ? "parent_1" : null);
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
      throw new MessagesError("Messagerie non disponible en mode Prisma pour l'instant.", 501);
    }

    const student = devStore.users.find((u) => u.id === studentId);
    if (!student) throw new MessagesError("Élève introuvable.", 404);

    // Trouver le parent associé
    const existingMsg = devStore.messages.find(
      (m) => m.teacherId === teacherId && m.studentId === studentId,
    );
    const parentUserId = existingMsg?.parentUserId ?? (studentId === "student_1" ? "parent_1" : null);
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
};
