import { Role } from "@prisma/client";
import { env } from "../../config/env";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { schoolRepository } from "../core/school-repository";
import { devStore } from "../core/dev-store";
import { messagesService } from "../teacher/messages-service";
import { callAiText, callAiJson, isAiAvailable } from "../../lib/ai";

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

// ── Historique conversationnel en mémoire ────────────────────────────────────
// Garde les N derniers échanges par numéro de téléphone.
// Expire après 30 min d'inactivité pour éviter les confusions inter-sessions.

type ConversationMessage = { role: "user" | "assistant"; content: string };
type ConversationEntry = { messages: ConversationMessage[]; lastActivity: number };

const CONVERSATION_MAX_TURNS = 8; // 8 messages (4 échanges) max dans le contexte
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 min

const conversationStore = new Map<string, ConversationEntry>();

function getConversationHistory(phone: string): ConversationMessage[] {
  const entry = conversationStore.get(phone);
  if (!entry) return [];
  if (Date.now() - entry.lastActivity > CONVERSATION_TTL_MS) {
    conversationStore.delete(phone);
    return [];
  }
  return entry.messages;
}

function appendConversationTurn(phone: string, userText: string, assistantText: string) {
  const existing = getConversationHistory(phone);
  const updated: ConversationMessage[] = [
    ...existing,
    { role: "user" as const, content: userText },
    { role: "assistant" as const, content: assistantText },
  ].slice(-CONVERSATION_MAX_TURNS);
  conversationStore.set(phone, { messages: updated, lastActivity: Date.now() });
}

const formatAverage = (value: number | null | undefined) =>
  value === null || value === undefined ? "N/A" : `${value.toFixed(2)}/20`;

const getDeliveryMessage = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return null;
  const messages = (payload as { messages?: Array<{ id?: string; message_status?: string }> }).messages;
  return messages?.[0] ?? null;
};

const menuMessage = (parentFirstName: string, studentNames: string[]) => {
  const studentLine =
    studentNames.length === 1
      ? `Enfant suivi: ${studentNames[0]}`
      : `Enfants suivis: ${studentNames.join(", ")}`;

  return [
    `Bonjour ${parentFirstName}, je suis là pour vous aider à suivre la scolarité de votre enfant.`,
    studentLine,
    "",
    "Vous pouvez me demander naturellement les notes, les absences, l'emploi du temps, ou des conseils pour l'aider à progresser.",
  ].join("\n");
};

const includesAny = (text: string, candidates: string[]) =>
  candidates.some((candidate) => text.includes(candidate));

const isGreetingOnly = (text: string) => {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .trim();
  if (!normalized) return true;
  return [
    "bonjour",
    "salut",
    "hello",
    "coucou",
    "bonsoir",
    "bjr",
    "slt",
  ].includes(normalized);
};

const greetingReply = (context: ParentStudentContext, incomingText: string) => {
  const childrenNames = context.students.map((student) => student.firstName);
  const lower = incomingText.toLowerCase();
  const greeting = lower.includes("bonsoir") ? "Bonsoir" : "Bonjour";
  return [
    `${greeting} ${context.parent.firstName}, ravi de vous retrouver.`,
    context.students.length > 1
      ? `De quel enfant souhaitez-vous parler aujourd'hui: ${childrenNames.join(", ")} ?`
      : `Vous pouvez me poser votre question sur ${childrenNames[0]} quand vous voulez.`,
  ].join("\n");
};

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

async function askStudentSelection(context: ParentStudentContext, incomingText: string) {
  const childrenNames = context.students.map((student) => `${student.firstName} ${student.lastName}`);
  const fallback = [
    `Bonjour ${context.parent.firstName}, je veux bien vous aider.`,
    `J’ai trouvé plusieurs enfants rattachés à votre numéro: ${childrenNames.join(", ")}.`,
    "Dites-moi simplement de quel enfant vous parlez, avec son prénom, et je vous réponds tout de suite.",
  ].join("\n");

  if (!isAiAvailable()) {
    return fallback;
  }

  const reply = await callAiText(
    [{ role: "user", content: incomingText.trim() || "Je pose une question sur mon enfant." }],
    [
      "Tu réponds à un parent sur WhatsApp.",
      "Plusieurs enfants sont rattachés à son numéro, donc tu dois lui demander naturellement lequel est concerné.",
      "Ton chaleureux, humain, bref, pas administratif.",
      `Parent: ${context.parent.firstName} ${context.parent.lastName}`,
      `Enfants disponibles: ${childrenNames.join(", ")}`,
      "Ne réponds pas à la question de fond tant que l'enfant n'est pas identifié.",
    ].join("\n"),
  ).catch(() => null);

  return reply?.trim() || fallback;
}

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
  const parentCandidates = await prisma!.user.findMany({
    where: {
      role: Role.PARENT,
      phone: { not: null },
    },
  });
  const parent = parentCandidates.find((candidate) => {
    const candidateDigits = digitsOnly(candidate.phone ?? "");
    return (
      normalizePhone(candidate.phone ?? "") === raw ||
      candidateDigits === digits ||
      candidateDigits.endsWith(digits) ||
      digits.endsWith(candidateDigits)
    );
  });

  if (!parent) {
    console.log("[whatsapp] parent phone not found", {
      fromPhone,
      raw,
      digits,
      candidatePhones: parentCandidates.map((candidate) => candidate.phone),
    });
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

  if (!report.grades.length) {
    return `Aucune note enregistrée en base pour ${report.student.firstName} ${report.student.lastName}.`;
  }

  const allGrades = report.grades.map(
    (grade) => `${grade.subject}: ${grade.value}/20 (${grade.assessmentTitle})`,
  );

  const subjectSummaries = report.subjectSummaries
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => `${s.subject}: moyenne ${formatAverage(s.average)}`);

  return [
    `Élève: ${report.student.firstName} ${report.student.lastName}`,
    `Moyenne générale: ${formatAverage(report.summary.generalAverage)}`,
    subjectSummaries.length ? `Moyennes par matière: ${subjectSummaries.join("; ")}` : "",
    allGrades.length ? `Toutes les notes enregistrées: ${allGrades.join("; ")}` : "Aucune note détaillée enregistrée.",
  ].filter(Boolean).join("\n");
}

async function buildAttendanceMessage(studentId: string) {
  const report = await schoolRepository.getStudentAttendance(studentId);
  if (!report) {
    return "Aucune donnée d'absence disponible pour cet élève.";
  }

  return [
    `Pour ${report.student.firstName} ${report.student.lastName}, la base indique ${report.summary.present} présence(s), ${report.summary.absent} absence(s) et ${report.summary.late} retard(s).`,
    ...report.records.slice(0, 3).map((record) => {
      const details =
        record.status === "LATE" && record.minutesLate
          ? `retard de ${record.minutesLate} min`
          : record.status.toLowerCase();
      return `Dernier point: ${record.date}: ${details}${record.subject ? ` (${record.subject})` : ""}.`;
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

  const slots = await prisma!.timeSlot.findMany({
    where: { classId: enrollment.classId },
    include: { subject: true },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return [
    `Emploi du temps simplifié de ${student.firstName}`,
    `Classe: ${enrollment.class.name}`,
    ...slots.slice(0, 8).map(
      (slot) => `- ${slot.day} ${slot.startTime}-${slot.endTime}: ${slot.subject.name}${slot.room ? `, salle ${slot.room}` : ""}`,
    ),
  ].join("\n");
}

async function buildAdviceMessage(studentId: string) {
  const grades = await schoolRepository.getStudentGrades(studentId);
  const attendance = await schoolRepository.getStudentAttendance(studentId);

  if (!grades || !attendance) {
    return "Les conseils IA seront disponibles dès que les données de l'élève seront complètes.";
  }

  if (!grades.grades.length) {
    return `Aucune note enregistrée en base pour ${grades.student.firstName}. Les conseils peuvent seulement se baser sur l'assiduité pour le moment.`;
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

type AiIntent =
  | "greeting"
  | "justification"
  | "notes"
  | "attendance"
  | "schedule"
  | "advice"
  | "question"
  | "other";

type IntentAnalysis = {
  intent: AiIntent;
  studentName: string | null;
  confident: boolean;
};

// Fallback rapide sans IA
function detectIntentFallback(text: string): AiIntent {
  if (isGreetingOnly(text)) return "greeting";
  if (text.includes("?")) return "question";
  const lower = text.toLowerCase();
  if (includesAny(lower, ["note", "moyenne", "résultat", "bulletin", "devoir", "évaluation", "composition"])) return "notes";
  if (includesAny(lower, ["absence", "absent", "retard", "présence", "manqué"])) return "attendance";
  if (includesAny(lower, ["emploi du temps", "horaire", "planning", "cours", "salle"])) return "schedule";
  if (includesAny(lower, ["conseil", "recommandation", "améliorer", "progresser", "révision"])) return "advice";
  return "other";
}

async function analyzeMessageIntent(
  incomingText: string,
  context: ParentStudentContext,
  hasPendingAbsence: boolean,
): Promise<IntentAnalysis> {
  if (!isAiAvailable()) {
    return { intent: detectIntentFallback(incomingText), studentName: null, confident: false };
  }

  const childrenNames = context.students.map((s) => s.firstName).join(", ");

  const prompt = `
Tu analyses un message WhatsApp envoyé par un parent à l'assistant de l'école.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.

Message du parent: "${incomingText}"
Prénoms des enfants rattachés à ce parent: ${childrenNames}
Une absence/retard sans justification est en attente pour cet élève: ${hasPendingAbsence ? "OUI" : "NON"}

Détermine:
1. "intent": l'intention principale du message parmi ces valeurs exactes:
   - "greeting": salutation, bonjour, bonsoir, slt, etc.
   - "justification": le parent explique pourquoi son enfant était absent ou en retard (maladie, rdv médecin, voyage, décès dans la famille, etc.) — SURTOUT si hasPendingAbsence est OUI
   - "notes": question sur les notes, moyennes, résultats, devoirs, évaluations
   - "attendance": question sur les absences, retards, présences
   - "schedule": question sur l'emploi du temps, horaires, cours, salles
   - "advice": demande de conseil pour aider l'enfant à progresser
   - "question": autre question qui ne rentre pas dans les catégories ci-dessus
   - "other": message qui n'est ni une question ni une justification (remerciement, ok, etc.)

2. "studentName": si le parent mentionne un prénom d'enfant dans le message, retourne ce prénom. Sinon null.

3. "confident": true si tu es sûr de l'intention, false si ambigu.

Exemples:
- "il est malade" avec hasPendingAbsence=OUI → {"intent":"justification","studentName":null,"confident":true}
- "rendez-vous chez le médecin pour Aminata" → {"intent":"justification","studentName":"Aminata","confident":true}
- "quelles sont ses notes en maths" → {"intent":"notes","studentName":null,"confident":true}
- "bonjour" → {"intent":"greeting","studentName":null,"confident":true}
- "merci" → {"intent":"other","studentName":null,"confident":true}
`.trim();

  const result = await callAiJson<IntentAnalysis>(prompt).catch(() => null);

  if (
    result &&
    typeof result.intent === "string" &&
    ["greeting", "justification", "notes", "attendance", "schedule", "advice", "question", "other"].includes(result.intent)
  ) {
    return result;
  }

  // Fallback si la réponse IA est invalide
  return { intent: detectIntentFallback(incomingText), studentName: null, confident: false };
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

  // Chercher d'abord par l'enfant sélectionné, sinon par nom dans le texte,
  // sinon prendre le premier enregistrement en attente.
  const lower = incomingText.toLowerCase();
  const target =
    (selectedStudent && pending.find((item) => item.studentId === selectedStudent.id)) ??
    pending.find((item) =>
      lower.includes(item.studentFirstName.toLowerCase()) ||
      lower.includes(item.studentLastName.toLowerCase()),
    ) ??
    pending[0];

  if (!target) {
    return null;
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

async function buildParentAiReply(input: {
  context: ParentStudentContext;
  student: ParentStudentContext["students"][number];
  incomingText: string;
  history: ConversationMessage[];
  intent: AiIntent;
}) {
  if (!isAiAvailable()) {
    return null;
  }

  // Ne charger que le contexte pertinent à l'intention détectée
  const notesData =
    input.intent === "notes" || input.intent === "advice" || input.intent === "other" || input.intent === "question"
      ? await buildNotesMessage(input.student.id).catch(() => "Notes indisponibles.")
      : null;

  const attendanceData =
    input.intent === "attendance" || input.intent === "advice" || input.intent === "other" || input.intent === "question"
      ? await buildAttendanceMessage(input.student.id).catch(() => "Absences indisponibles.")
      : null;

  const scheduleData =
    input.intent === "schedule" || input.intent === "other" || input.intent === "question"
      ? await buildScheduleMessage(input.student).catch(() => "Emploi du temps indisponible.")
      : null;

  const adviceData =
    input.intent === "advice"
      ? await buildAdviceMessage(input.student.id).catch(() => "Conseils indisponibles.")
      : null;

  const contextBlocks: string[] = [];
  if (notesData) contextBlocks.push(`Contexte notes:\n${notesData}`);
  if (attendanceData) contextBlocks.push(`Contexte absences et retards:\n${attendanceData}`);
  if (scheduleData) contextBlocks.push(`Contexte emploi du temps:\n${scheduleData}`);
  if (adviceData) contextBlocks.push(`Conseils pédagogiques:\n${adviceData}`);

  const allChildren = input.context.students.map((s) => `${s.firstName} ${s.lastName}`).join(", ");

  const systemPrompt = `
Tu es l'assistant WhatsApp de l'école Xelal AI.
Tu parles au parent comme un humain: naturel, chaleureux, rassurant, jamais robotique.
Tu réponds en français, en 2 à 4 phrases courtes maximum, adaptées à WhatsApp.
Tu dois tenir compte de tout l'historique de la conversation pour répondre: ne dis jamais "Bonjour" si la conversation est déjà en cours.

RÈGLE 1 — RÉPONDS UNIQUEMENT À LA QUESTION POSÉE.
Tu n'ajoutes aucune information non demandée, même si tu l'as dans le contexte. Tu ne proposes pas d'autres sujets spontanément.

RÈGLE 2 — NE JAMAIS INVENTER UNE INFORMATION.
Si une donnée n'est pas explicitement présente dans le contexte ci-dessous, tu dois le dire clairement avec une formulation naturelle comme:
- "Je n'ai pas encore de notes de français pour ${input.student.firstName} dans le système."
- "Cette information n'est pas encore disponible dans le dossier de ${input.student.firstName}."
- "Il n'y a pas encore de devoir enregistré pour cette matière. Je vous invite à contacter l'école directement."
Tu n'as pas le droit d'inventer une note, une moyenne, une absence, un retard, un horaire, une salle, un enseignant, une matière, une tendance ou un statut.

RÈGLE 3 — SI LA QUESTION N'EST PAS CLAIRE, demande une clarification en une phrase simple.

RÈGLE 4 — SÉLECTION D'ENFANT.
Si plusieurs enfants sont rattachés au parent et que l'on ne sait pas de quel enfant il parle, demande-lui de préciser: "${allChildren}".
Si l'historique montre que le parent vient de donner le prénom d'un enfant en réponse à ta question, traite ce prénom comme la sélection et demande ce qu'il souhaite savoir sur cet enfant.

Parent: ${input.context.parent.firstName} ${input.context.parent.lastName}
Enfant(s) rattaché(s): ${allChildren}
Élève actuellement sélectionné: ${input.student.firstName} ${input.student.lastName}
Classe: ${input.student.className ?? "non renseignée"}

${contextBlocks.length ? contextBlocks.join("\n\n") : "Aucune donnée disponible pour cet élève dans le système."}
  `.trim();

  const messages: Array<{ role: string; content: string }> = [
    ...input.history,
    { role: "user", content: input.incomingText.trim() },
  ];

  const aiReply = await callAiText(messages, systemPrompt);

  return aiReply?.trim() || null;
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

  if (isGreetingOnly(incomingText)) {
    const reply = greetingReply(context, incomingText);
    appendConversationTurn(fromPhone, incomingText.trim(), reply);
    return {
      resolved: true,
      parentId: context.parent.id,
      studentId: selectedStudent?.id,
      reply,
      generatedAt: now(),
    };
  }

  if (!selectedStudent && context.students.length > 1) {
    const history = getConversationHistory(fromPhone);
    // Si l'historique montre que l'IA attendait déjà une sélection d'enfant,
    // laisser l'IA gérer la suite avec le contexte plutôt que de redemander.
    const wasAskingForChild = history.length > 0 &&
      history[history.length - 1].role === "assistant";

    if (!wasAskingForChild || history.length === 0) {
      const reply = await askStudentSelection(context, incomingText);
      appendConversationTurn(fromPhone, incomingText.trim(), reply);
      return {
        resolved: true,
        parentId: context.parent.id,
        reply,
        generatedAt: now(),
      };
    }
    // Sinon on laisse passer vers l'IA avec le premier enfant par défaut
    // et l'historique comme contexte pour qu'elle comprenne la situation.
  }

  const student = selectedStudent ?? context.students[0];

  if (isAiAvailable()) {
    try {
      const history = getConversationHistory(fromPhone);

      // 1er appel IA : analyser l'intention du message
      const pendingAbsences = await schoolRepository.findPendingAttendanceJustificationsByParentPhone(fromPhone);
      const analysis = await analyzeMessageIntent(incomingText, context, pendingAbsences.length > 0);

      // Si l'IA détecte une justification d'absence, on l'enregistre directement
      if (analysis.intent === "justification") {
        const justificationReply = await tryHandleAttendanceJustification(
          fromPhone,
          context,
          incomingText,
          student,
        );
        if (justificationReply) {
          return justificationReply;
        }
      }

      // Résoudre l'enfant depuis le nom détecté par l'IA si nécessaire
      const resolvedStudent =
        analysis.studentName
          ? (context.students.find((s) =>
              s.firstName.toLowerCase() === analysis.studentName!.toLowerCase()
            ) ?? student)
          : student;

      // 2ème appel IA : formuler la réponse
      const aiReply = await buildParentAiReply({
        context,
        student: resolvedStudent,
        incomingText: incomingText.trim() || "Bonjour",
        history,
        intent: analysis.intent,
      });

      if (aiReply && aiReply.trim()) {
        appendConversationTurn(fromPhone, incomingText.trim(), aiReply.trim());
        return {
          resolved: true,
          parentId: context.parent.id,
          studentId: student.id,
          reply: aiReply.trim(),
          generatedAt: now(),
        };
      }
    } catch (error) {
      console.log("[whatsapp] ai reply failed", {
        parentId: context.parent.id,
        studentId: student.id,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    resolved: true,
    parentId: context.parent.id,
    studentId: student.id,
    reply: [
      `Bonjour ${context.parent.firstName}, je suis là.`,
      `Je peux vous aider sur ${student.firstName}, uniquement avec les informations déjà enregistrées par l'école.`,
      `Pouvez-vous reformuler votre question en une phrase simple ?`,
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
    console.log("[whatsapp] text delivery failed", {
      to,
      status: response.status,
      reason: errorPayload,
    });
    return {
      delivered: false,
      reason: errorPayload,
    };
  }

  const payload = await response.json().catch(() => null);
  const deliveryMessage = getDeliveryMessage(payload);
  console.log("[whatsapp] text delivery accepted", {
    to,
    messageId: deliveryMessage?.id,
    status: deliveryMessage?.message_status,
  });

  return {
    delivered: true,
    messageId: deliveryMessage?.id,
  };
}

async function sendWhatsAppTemplate(to: string, templateName: string, languageCode = "en_US") {
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
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorPayload = await response.text();
    console.log("[whatsapp] template delivery failed", {
      to,
      templateName,
      status: response.status,
      reason: errorPayload,
    });
    return {
      delivered: false,
      reason: errorPayload,
    };
  }

  const payload = await response.json().catch(() => null);
  const deliveryMessage = getDeliveryMessage(payload);
  console.log("[whatsapp] template delivery accepted", {
    to,
    templateName,
    messageId: deliveryMessage?.id,
    status: deliveryMessage?.message_status,
  });

  return {
    delivered: true,
    messageId: deliveryMessage?.id,
  };
}

export const whatsappService = {
  async sendText(to: string, body: string) {
    return sendWhatsAppText(to, body);
  },

  async sendTemplate(to: string, templateName: string, languageCode?: string) {
    return sendWhatsAppTemplate(to, templateName, languageCode);
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

  async previewReply(input: { message: string; studentName?: string }) {
    if (!isAiAvailable()) {
      return `Bonjour, j'ai bien reçu votre message concernant ${input.studentName ?? "votre enfant"}. Je peux vous aider sur les notes, absences, retards, emploi du temps et recommandations.`;
    }

    const reply = await callAiText(
      [{ role: "user", content: input.message }],
      [
        "Tu es l'assistant WhatsApp de l'école Xelal AI.",
        "Réponds comme un humain: chaleureux, clair, naturel, sans ton robotique.",
        "Tu réponds en français, en 2 à 4 phrases courtes maximum.",
        `Élève concerné: ${input.studentName ?? "l'enfant du parent"}.`,
        "Tu n'as PAS les notes, absences, performances ni emploi du temps réel dans cette prévisualisation.",
        "Tu dois donc dire clairement que tu ne peux pas confirmer l'information sans les données du dossier.",
        "N'invente jamais une note, une moyenne, une absence, un retard, un horaire, une salle, un enseignant, une matière, une tendance, ou le fait que l'élève soit bon, en baisse, sérieux, absent ou performant.",
        "Propose simplement de consulter les notes, absences, retards, recommandations ou emploi du temps.",
      ].join("\n"),
    );

    return reply?.trim() || "Je peux vous aider à suivre les notes, absences, retards, emploi du temps et recommandations de votre enfant.";
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
