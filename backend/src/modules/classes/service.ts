import { schoolRepository } from "../core/school-repository";

export class ClassesError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const classesService = {
  async listClasses() {
    return schoolRepository.listClasses();
  },

  async getClassStudents(classId: string) {
    const classRecord = await schoolRepository.getClassStudents(classId);
    if (!classRecord) {
      throw new ClassesError("Classe introuvable.");
    }
    return classRecord;
  },
};
