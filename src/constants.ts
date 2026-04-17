/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Class, User } from './types';

export const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Moussa Diop',
    email: 'moussa@example.com',
    role: 'student',
    parentPhone: '+221770000001',
    classId: 'c1',
    grades: [
      { id: 'g1', studentId: 's1', subject: 'Mathématiques', value: 14, coefficient: 4, date: '2026-04-10' },
      { id: 'g2', studentId: 's1', subject: 'Français', value: 12, coefficient: 3, date: '2026-04-12' },
      { id: 'g3', studentId: 's1', subject: 'Mathématiques', value: 8, coefficient: 4, date: '2026-04-15' },
    ],
    attendance: [
      { id: 'a1', studentId: 's1', date: '2026-04-16', status: 'absent', reason: 'Maladie' },
    ],
  },
  {
    id: 's2',
    name: 'Awa Ndiaye',
    email: 'awa@example.com',
    role: 'student',
    parentPhone: '+221770000002',
    classId: 'c1',
    grades: [
      { id: 'g4', studentId: 's2', subject: 'Mathématiques', value: 18, coefficient: 4, date: '2026-04-10' },
      { id: 'g5', studentId: 's2', subject: 'Français', value: 16, coefficient: 3, date: '2026-04-12' },
    ],
    attendance: [
      { id: 'a2', studentId: 's2', date: '2026-04-16', status: 'present' },
    ],
  },
];

export const MOCK_CLASSES: Class[] = [
  {
    id: 'c1',
    name: 'Terminale S1',
    teacherId: 't1',
    students: ['s1', 's2'],
  },
];

export const MOCK_TEACHER: User = {
  id: 't1',
  name: 'M. Sow',
  email: 'sow@ecole.edu',
  role: 'teacher',
  classId: 'c1',
};

export const MOCK_ADMIN: User = {
  id: 'adm1',
  name: 'Mme Camara',
  email: 'admin@ecole.edu',
  role: 'admin',
};

export const SUBJECTS = [
  'Mathématiques',
  'Français',
  'Anglais',
  'Histoire-Géo',
  'SVT',
  'Physique-Chimie',
  'Philosophie',
  'EPS',
];
