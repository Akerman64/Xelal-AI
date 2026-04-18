import { schoolRepository } from "../core/school-repository";
import { notificationsService } from "../notifications/service";
import { teacherService } from "../teacher/service";

export class AcademicsError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const academicsService = {
  async listSubjects() {
    return schoolRepository.listSubjects();
  },

  async listAssessmentsByClass(classId: string) {
    const assessments = await schoolRepository.listAssessmentsByClass(classId);
    if (!assessments) {
      throw new AcademicsError("Classe introuvable.");
    }
    return assessments;
  },

  async getStudentGrades(studentId: string) {
    const studentGrades = await schoolRepository.getStudentGrades(studentId);
    if (!studentGrades) {
      throw new AcademicsError("Eleve introuvable.");
    }
    return studentGrades;
  },

  async getClassGradebook(classId: string) {
    const gradebook = await schoolRepository.getClassGradebook(classId);
    if (!gradebook) {
      throw new AcademicsError("Classe introuvable.");
    }
    return gradebook;
  },

  async updateGrade(gradeId: string, value: number, comment?: string) {
    const grade = await schoolRepository.updateGrade(gradeId, value, comment);
    if (!grade) {
      throw new AcademicsError("Note introuvable.");
    }

    await notificationsService.notifyGradeUpdated({
      studentId: grade.studentId,
      gradeId: grade.id,
    });

    return grade;
  },

  async createAssessment(input: {
    classId: string;
    subjectId: string;
    teacherId: string;
    title: string;
    type: "QUIZ" | "HOMEWORK" | "EXAM" | "PROJECT";
    coefficient: number;
    date: string;
  }) {
    try {
      const assessment = await schoolRepository.createAssessment(input);
      if (!assessment) {
        throw new AcademicsError("Classe ou matiere introuvable.");
      }
      return assessment;
    } catch (error) {
      if (error instanceof AcademicsError) {
        throw error;
      }
      throw new AcademicsError(
        error instanceof Error ? error.message : "Creation impossible.",
        400,
      );
    }
  },

  async listStudentRecommendations(studentId: string) {
    return teacherService.listStudentRecommendations(studentId);
  },

  async bulkUpsertGrades(
    assessmentId: string,
    entries: Array<{ studentId: string; value: number; comment?: string }>,
  ) {
    const result = await schoolRepository.bulkUpsertGrades(assessmentId, entries);
    if (!result) {
      throw new AcademicsError("Evaluation introuvable.");
    }

    for (const grade of result.grades) {
      await notificationsService.notifyGradeUpdated({
        studentId: grade.studentId,
        gradeId: grade.id,
      });
    }

    return result;
  },
};
