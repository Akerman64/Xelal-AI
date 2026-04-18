import { Role } from "@prisma/client";
import { getPrismaClient, isPrismaEnabled } from "../../lib/prisma";
import { devStore } from "../core/dev-store";
import { schoolRepository } from "../core/school-repository";
import { whatsappService } from "../whatsapp/service";

type ParentRecipient = {
  parentId: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

const normalizePhone = (value?: string) => (value ? value.replace(/\s+/g, "") : undefined);

async function findParentRecipientsByStudentId(studentId: string): Promise<ParentRecipient[]> {
  if (!isPrismaEnabled()) {
    const student = devStore.users.find((user) => user.id === studentId && user.role === "STUDENT");
    if (!student) {
      return [];
    }

    return devStore.users
      .filter((user) => user.role === "PARENT" && user.lastName === student.lastName)
      .map((parent) => ({
        parentId: parent.id,
        firstName: parent.firstName,
        lastName: parent.lastName,
        phone: normalizePhone(parent.phone),
      }))
      .filter((parent) => Boolean(parent.phone));
  }

  const prisma = getPrismaClient();
  const links = await prisma!.parentStudent.findMany({
    where: { studentId },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!links.length) {
    return [];
  }

  const parentIds = links.map((link) => link.parentUserId);
  const parents = await prisma!.user.findMany({
    where: {
      id: { in: parentIds },
      role: Role.PARENT,
    },
  });

  return parents
    .map((parent) => ({
      parentId: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: normalizePhone(parent.phone ?? undefined),
    }))
    .filter((parent) => Boolean(parent.phone));
}

async function buildGradeMessage(studentId: string, gradeId: string) {
  const report = await schoolRepository.getStudentGrades(studentId);
  if (!report) {
    return null;
  }

  const grade = report.grades.find((item) => item.id === gradeId);
  if (!grade) {
    return null;
  }

  return [
    `Nouvelle mise à jour de note pour ${report.student.firstName} ${report.student.lastName}.`,
    `${grade.subject} : ${grade.value}/20`,
    `Évaluation : ${grade.assessmentTitle}`,
    `Moyenne actuelle : ${report.summary.generalAverage?.toFixed(2) ?? "N/A"}/20`,
  ].join("\n");
}

function buildAttendanceMessage(input: {
  studentFirstName: string;
  studentLastName: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  minutesLate?: number;
  reason?: string;
}) {
  if (input.reason?.trim()) {
    return null;
  }

  if (input.status === "PRESENT") {
    return null;
  }

  if (input.status === "ABSENT") {
    return [
      `Alerte absence: ${input.studentFirstName} ${input.studentLastName} a été marqué absent(e) le ${input.date}.`,
      "Aucun motif n'a encore été renseigné. Merci de contacter l'école si nécessaire.",
      "Vous pouvez répondre directement à ce message avec le motif afin qu'il soit enregistré.",
    ].join("\n");
  }

  return [
    `Alerte retard: ${input.studentFirstName} ${input.studentLastName} a été marqué en retard le ${input.date}.`,
    input.minutesLate ? `Retard estimé: ${input.minutesLate} minute(s).` : "Retard signalé par l'enseignant.",
    "Vous pouvez répondre directement à ce message avec le motif afin qu'il soit enregistré.",
  ].join("\n");
}

async function deliverToParents(studentId: string, message: string) {
  const parents = await findParentRecipientsByStudentId(studentId);

  const deliveries = [];
  for (const parent of parents) {
    if (!parent.phone) {
      deliveries.push({
        parentId: parent.parentId,
        delivered: false,
        reason: "missing_phone",
      });
      continue;
    }

    const delivery = await whatsappService.sendText(parent.phone, message);
    deliveries.push({
      parentId: parent.parentId,
      phone: parent.phone,
      ...delivery,
    });
  }

  return deliveries;
}

export const notificationsService = {
  async deliverCustomMessageToStudentParents(studentId: string, message: string) {
    const deliveries = await deliverToParents(studentId, message);
    return {
      sent: deliveries.filter((item) => item.delivered).length,
      deliveries,
      preview: message,
    };
  },

  async notifyGradeUpdated(input: { studentId: string; gradeId: string }) {
    const message = await buildGradeMessage(input.studentId, input.gradeId);
    if (!message) {
      return {
        sent: 0,
        deliveries: [],
      };
    }

    const deliveries = await deliverToParents(input.studentId, message);
    return {
      sent: deliveries.filter((item) => item.delivered).length,
      deliveries,
      preview: message,
    };
  },

  async notifyAttendanceRecorded(input: {
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE";
    minutesLate?: number;
    reason?: string;
  }) {
    const message = buildAttendanceMessage(input);
    if (!message) {
      return {
        sent: 0,
        deliveries: [],
      };
    }

    const deliveries = await deliverToParents(input.studentId, message);
    return {
      sent: deliveries.filter((item) => item.delivered).length,
      deliveries,
      preview: message,
    };
  },
};
