import { Role } from "@prisma/client";
import { env } from "../../config/env";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { schoolRepository } from "../core/school-repository";
import { devStore } from "../core/dev-store";
import { messagesService } from "../teacher/messages-service";

type WhatsAppPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

type ParentStudentContext = {
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    className?: string;
  }>;
};

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const now = () => new Date().toISOString();

const formatAverage = (value: number | null | undefined) =>
  value === null || value === undefined ? "N/A" : `${value.toFixed(2)}/20`;

const menuMessage = (parentFirstName: string, studentNames: string[]) => {
  const studentLine =
    studentNames.length === 1
      ? `Enfant suivi: ${studentNames[0]}`
      : `Enfants suivis: ${studentNames.join(", ")}`;

  return [
    `Bonjour ${parentFirstName}, bienvenue sur Xelal AI.`,
    studentLine,
    "",
    "Répondez avec un mot-clé ou un numéro :",
    "1. notes",
    "2. absences",
    "3. emploi du temps",
    "4. conseils IA",
    "5. contacter professeur",
  ].join("\n");
};

const includesAny = (text: string, candidates: string[]) =>
  candidates.some((candidate) => text.includes(candidate));

const pickStudent = (
  context: ParentStudentContext,
  text: string,
) => {
  if (context.students.length === 1) {
    return context.students[0];
  }

  const byName = context.students.find((student) =>
    text.includes(student.firstName.toLowerCase()) ||
    text.includes(student.lastName.toLowerCase()),
  );

  return byName ?? null;
};

const askStudentSelection = (context: ParentStudentContext) =>
  [
    "Plusieurs enfants sont associés à ce numéro.",
    "Merci de répondre avec le prénom de l'élève concerné :",
    ...context.students.map((student) => `- ${student.firstName} ${student.lastName}`),
  ].join("\n");

const getUnknownParentMessage = () =>
  "Votre numéro n'est pas encore rattaché à un parent dans Xelal AI. Merci de contacter l'administration de l'école.";

const reservedKeywords = [
  "bonjour",
  "salut",
  "hello",
  "menu",
  "aide",
  "1",
  "2",
  "3",
  "4",
  "5",
  "note",
  "notes",
  "moyenne",
  "absence",
  "absences",
  "retard",
  "retards",
  "emploi",
  "horaire",
  "planning",
  "conseil",
  "ia",
  "analyse",
  "prof",
  "professeur",
  "enseignant",
  "contact",
];

async function resolveParentContext(fromPhone: string): Promise<ParentStudentContext | null> {
  const raw = normalizePhone(fromPhone);
  const digits = digitsOnly(raw);

  if (!isPrismaEnabled()) {
    const parent = devStore.users.find(
      (user) =>
        user.role === "PARENT" &&
        user.phone &&
        (normalizePhone(user.phone) === raw || digitsOnly(user.phone) === digits),
    );

    if (!parent) {
      return null;
    }

    const students = devStore.users
      .filter((user) => user.role === "STUDENT")
      .filter((student) => student.lastName === parent.lastName)
      .map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: devStore.classes.find((item) => item.id === student.classId)?.name,
      }));

    return {
      parent: {
        id: parent.id,
        firstName: parent.firstName,
        lastName: parent.lastName,
        phone: parent.phone,
      },
      students,
    };
  }

  const prisma = getPrismaClient();
  const parent = await prisma!.user.findFirst({
    where: {
      role: Role.PARENT,
      OR: [
        { phone: raw },
        { phone: `+${digits}` },
        { phone: { endsWith: digits } },
      ],
    },
  });

  if (!parent) {
    return null;
  }

  const links = await prisma!.parentStudent.findMany({
    where: { parentUserId: parent.id },
    include: {
      student: {
        include: {
          user: true,
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              class: true,
            },
          },
        },
      },
    },
  });

  return {
    parent: {
      id: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone ?? undefined,
    },
    students: links.map((link) => ({
      id: link.student.id,
      firstName: link.student.user.firstName,
      lastName: link.student.user.lastName,
      className: link.student.enrollments[0]?.class.name,
    })),
  };
}

async function buildNotesMessage(studentId: string) {
  const report = await schoolRepository.getStudentGrades(studentId);
  if (!report) {
    return "Aucune donnée de notes disponible pour cet élève.";
  }

  const topGrades = report.grades.slice(0, 3);

  return [
    `Notes de ${report.student.firstName} ${report.student.lastName}`,
    `Moyenne générale: ${formatAverage(report.summary.generalAverage)}`,
    ...topGrades.map(
      (grade) =>
        `- ${grade.subject}: ${grade.value}/20 (${grade.assessmentTitle})`,
    ),
  ].join("\n");
}

async function buildAttendanceMessage(studentId: string) {
  const report = await schoolRepository.getStudentAttendance(studentId);
  if (!report) {
    return "Aucune donnée d'absence disponible pour cet élève.";
  }

  return [
    `Absences de ${report.student.firstName} ${report.student.lastName}`,
    `Présences: ${report.summary.present}`,
    `Absences: ${report.summary.absent}`,
    `Retards: ${report.summary.late}`,
    ...report.records.slice(0, 3).map((record) => {
      const details =
        record.status === "LATE" && record.minutesLate
          ? `retard de ${record.minutesLate} min`
          : record.status.toLowerCase();
      return `- ${record.date}: ${details}${record.subject ? ` (${record.subject})` : ""}`;
    }),
  ].join("\n");
}

async function buildScheduleMessage(student: ParentStudentContext["students"][number]) {
  if (!student.className) {
    return "L'emploi du temps texte sera disponible prochainement.";
  }

  if (!isPrismaEnabled()) {
    const classRecord = devStore.classes.find((item) => item.id === "class_term_s1");
    const subjects = classRecord?.teacherIds.length ? devStore.subjects.map((item) => item.name) : [];
    return [
      `Emploi du temps simplifié de ${student.firstName}`,
      `Classe: ${student.className}`,
      `Matières suivies: ${subjects.join(", ") || "à compléter"}`,
    ].join("\n");
  }

  const prisma = getPrismaClient();
  const enrollment = await prisma!.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      status: "ACTIVE",
    },
    include: {
      class: {
        include: {
          assignments: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    return "L'emploi du temps texte sera disponible prochainement.";
  }

  const subjects = Array.from(
    new Set(enrollment.class.assignments.map((assignment) => assignment.subject.name)),
  );

  return [
    `Emploi du temps simplifié de ${student.firstName}`,
    `Classe: ${enrollment.class.name}`,
    `Matières suivies: ${subjects.join(", ") || "à compléter"}`,
  ].join("\n");
}

async function buildAdviceMessage(studentId: string) {
  const grades = await schoolRepository.getStudentGrades(studentId);
  const attendance = await schoolRepository.getStudentAttendance(studentId);

  if (!grades || !attendance) {
    return "Les conseils IA seront disponibles dès que les données de l'élève seront complètes.";
  }

  const weakSubject = grades.subjectSummaries
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => (left.average ?? 0) - (right.average ?? 0))[0];

  const lines = [
    `Conseils IA pour ${grades.student.firstName}`,
    `Moyenne actuelle: ${formatAverage(grades.summary.generalAverage)}`,
  ];

  if (weakSubject) {
    lines.push(`- Priorité: renforcer ${weakSubject.subject} (${formatAverage(weakSubject.average)})`);
  }

  if (attendance.summary.absent > 0 || attendance.summary.late > 0) {
    lines.push("- Point d'attention: améliorer la régularité en classe.");
  } else {
    lines.push("- Point fort: assiduité satisfaisante.");
  }

  lines.push("- Recommandation: 30 minutes de révision ciblée après chaque cours clé.");
  return lines.join("\n");
}

function buildTeacherContactMessage(student: ParentStudentContext["students"][number]) {
  return [
    `Votre demande de contact pour ${student.firstName} ${student.lastName} a bien été notée.`,
    "Dans la prochaine étape, nous connecterons ce bouton à la messagerie enseignant.",
  ].join("\n");
}

function isPotentialJustification(text: string) {
  if (text.length < 4) return false;
  return !includesAny(text, reservedKeywords);
}

async function tryHandleAttendanceJustification(
  fromPhone: string,
  context: ParentStudentContext,
  incomingText: string,
  selectedStudent: ParentStudentContext["students"][number] | null,
) {
  const pending = await schoolRepository.findPendingAttendanceJustificationsByParentPhone(fromPhone);
  if (!pending.length) {
    return null;
  }

  if (!isPotentialJustification(incomingText)) {
    return null;
  }

  const target = selectedStudent
    ? pending.find((item) => item.studentId === selectedStudent.id)
    : pending[0];

  if (!target) {
    return {
      resolved: true,
      parentId: context.parent.id,
      reply: "J'ai bien reçu votre message, mais je n'ai pas trouvé d'absence ou de retard en attente pour cet élève.",
      generatedAt: now(),
    };
  }

  await schoolRepository.updateAttendanceReason(target.recordId, incomingText.trim());

  return {
    resolved: true,
    parentId: context.parent.id,
    studentId: target.studentId,
    reply: [
      `Merci ${context.parent.firstName}, le motif a bien été enregistré.`,
      `${target.studentFirstName} ${target.studentLastName} • ${target.status === "ABSENT" ? "absence" : "retard"} du ${target.date}`,
      `Motif: ${incomingText.trim()}`,
    ].join("\n"),
    generatedAt: now(),
  };
}

export async function buildWhatsAppReply(fromPhone: string, incomingText: string) {
  const text = incomingText.trim().toLowerCase();
  const context = await resolveParentContext(fromPhone);

  if (!context) {
    return {
      resolved: false,
      reply: getUnknownParentMessage(),
      generatedAt: now(),
    };
  }

  const selectedStudent = pickStudent(context, text);

  if (!text || includesAny(text, ["bonjour", "salut", "hello", "menu", "aide"])) {
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: selectedStudent?.id,
      reply: menuMessage(
        context.parent.firstName,
        context.students.map((student) => student.firstName),
      ),
      generatedAt: now(),
    };
  }

  if (!selectedStudent && context.students.length > 1) {
    return {
      resolved: true,
      parentId: context.parent.id,
      reply: askStudentSelection(context),
      generatedAt: now(),
    };
  }

  const student = selectedStudent ?? context.students[0];

  const justificationReply = await tryHandleAttendanceJustification(
    fromPhone,
    context,
    incomingText,
    student,
  );

  if (justificationReply) {
    return justificationReply;
  }

  if (includesAny(text, ["1", "note", "notes", "moyenne"])) {
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: student.id,
      reply: await buildNotesMessage(student.id),
      generatedAt: now(),
    };
  }

  if (includesAny(text, ["2", "absence", "absences", "retard", "retards"])) {
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: student.id,
      reply: await buildAttendanceMessage(student.id),
      generatedAt: now(),
    };
  }

  if (includesAny(text, ["3", "emploi", "horaire", "planning"])) {
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: student.id,
      reply: await buildScheduleMessage(student),
      generatedAt: now(),
    };
  }

  if (includesAny(text, ["4", "conseil", "ia", "analyse", "aide"])) {
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: student.id,
      reply: await buildAdviceMessage(student.id),
      generatedAt: now(),
    };
  }

  if (includesAny(text, ["5", "prof", "professeur", "enseignant", "contact"])) {
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: student.id,
      reply: buildTeacherContactMessage(student),
      generatedAt: now(),
    };
  }

  return {
    resolved: true,
    parentId: context.parent.id,
    studentId: student.id,
    reply: [
      "Je n'ai pas compris votre demande.",
      "",
      menuMessage(context.parent.firstName, context.students.map((item) => item.firstName)),
    ].join("\n"),
    generatedAt: now(),
  };
}

async function sendWhatsAppText(to: string, body: string) {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
    return {
      delivered: false,
      reason: "missing_credentials",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${env.whatsappGraphVersion}/${env.whatsappPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorPayload = await response.text();
    return {
      delivered: false,
      reason: errorPayload,
    };
  }

  return {
    delivered: true,
  };
}

export const whatsappService = {
  async sendText(to: string, body: string) {
    return sendWhatsAppText(to, body);
  },

  verifyWebhook(mode?: string, verifyToken?: string, challenge?: string) {
    if (
      mode === "subscribe" &&
      verifyToken &&
      env.whatsappVerifyToken &&
      verifyToken === env.whatsappVerifyToken &&
      challenge
    ) {
      return challenge;
    }

    return null;
  },

  async simulateMessage(input: { from: string; text: string }) {
    return buildWhatsAppReply(input.from, input.text);
  },

  async processWebhookPayload(payload: WhatsAppPayload) {
    const inboundMessages =
      payload.entry?.flatMap((entry) =>
        entry.changes?.flatMap((change) =>
          (change.value?.messages ?? []).map((message) => ({
            from: message.from ?? "",
            type: message.type ?? "unknown",
            text: message.text?.body ?? "",
          })),
        ) ?? [],
      ) ?? [];

    const results = [];

    for (const message of inboundMessages) {
      if (!message.from || message.type !== "text") {
        results.push({
          from: message.from,
          ignored: true,
          reason: "unsupported_message_type",
        });
        continue;
      }

      console.log("[whatsapp] inbound", {
        from: message.from,
        text: message.text,
      });

      const reply = await buildWhatsAppReply(message.from, message.text);

      if ("parentId" in reply && "studentId" in reply && reply.parentId && reply.studentId && message.text.trim()) {
        try {
          await messagesService.createParentInboundMessage({
            parentUserId: reply.parentId,
            studentId: reply.studentId,
            content: message.text,
          });
        } catch {
          // Le webhook ne doit pas échouer si l'archivage du message échoue.
        }
      }

      const delivery = await sendWhatsAppText(message.from, reply.reply);

      console.log("[whatsapp] outbound", {
        to: message.from,
        delivered: delivery.delivered,
        reason: "reason" in delivery ? delivery.reason : undefined,
      });

      results.push({
        from: message.from,
        receivedText: message.text,
        reply: reply.reply,
        delivery,
      });
    }

    return {
      received: inboundMessages.length,
      processedAt: now(),
      results,
    };
  },
};
