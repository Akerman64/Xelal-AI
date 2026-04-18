/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Search,
  BarChart3,
  Calendar,
  Send,
  MoreVertical,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_STUDENTS, MOCK_TEACHER, MOCK_CLASSES } from '../constants';
import { messageService, type MessageContact, type MessageThread } from '../services/messageService';
import { Attendance, AuthSession, Student } from '../types';
import { analyzeClassPerformance, analyzeStudentPerformance } from '../services/geminiService';
import {
  fetchTeacherDashboardData,
  fetchTeacherClassRecommendations,
  fetchTeacherRecommendations,
  fetchTeacherWorkspaceData,
  saveTeacherAttendance,
  saveTeacherClassRecommendation,
  saveTeacherRecommendation,
  sendTeacherWhatsAppMessage,
  type TeacherDashboardData,
  type TeacherLesson,
  type TeacherQuickContact,
  type TeacherRecommendationRecord,
  type TeacherWorkspaceData,
  updateTeacherGrade,
} from '../services/backendService';

const formatToday = () =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

const average = (values: number[]) =>
  values.length
    ? Number((values.reduce((sum, current) => sum + current, 0) / values.length).toFixed(1))
    : null;

interface DashboardEnseignantProps {
  session?: AuthSession;
}

export default function DashboardEnseignant({ session }: DashboardEnseignantProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(MOCK_CLASSES[0]?.name || 'Terminale S1');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [teacherName, setTeacherName] = useState(MOCK_TEACHER.name);
  const [teacherId, setTeacherId] = useState('teacher_1');
  const [selectedClassId, setSelectedClassId] = useState(MOCK_CLASSES[0]?.id || 'c1');
  const [classesData, setClassesData] = useState(MOCK_CLASSES);
  const [studentsData, setStudentsData] = useState(MOCK_STUDENTS);
  const [assessmentTitles, setAssessmentTitles] = useState<string[]>(['Interrogation 1', 'Devoir 1']);
  const [assessmentsByClass, setAssessmentsByClass] = useState<Record<string, any[]>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataSourceLabel, setDataSourceLabel] = useState<'api' | 'mock'>('mock');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [contextStudent, setContextStudent] = useState<Student | null>(null);
  const [workspace, setWorkspace] = useState<TeacherWorkspaceData>({
    upcomingLessons: [],
    weeklySchedule: [],
    quickContacts: [],
  });
  const [recommendationHistory, setRecommendationHistory] = useState<TeacherRecommendationRecord[]>([]);
  const [recommendationPrompt, setRecommendationPrompt] = useState('');
  const [isRefreshingRecommendation, setIsRefreshingRecommendation] = useState(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | null>(null);
  const [whatsAppDraft, setWhatsAppDraft] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<TeacherLesson | null>(null);
  const [selectedClassCardId, setSelectedClassCardId] = useState(MOCK_CLASSES[0]?.id || 'c1');
  const [classAiAnalysis, setClassAiAnalysis] = useState<any>(null);
  const [classRecommendationHistory, setClassRecommendationHistory] = useState<TeacherRecommendationRecord[]>([]);
  const [classRecommendationPrompt, setClassRecommendationPrompt] = useState('');
  const [isAnalyzingClass, setIsAnalyzingClass] = useState(false);
  const [gradebookClassId, setGradebookClassId] = useState(MOCK_CLASSES[0]?.id || 'c1');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('all');
  const [attendanceClassId, setAttendanceClassId] = useState(MOCK_CLASSES[0]?.id || 'c1');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        if (!session) {
          throw new Error('Session enseignant absente.');
        }

        const [dashboardData, workspaceData] = await Promise.all([
          fetchTeacherDashboardData(session),
          fetchTeacherWorkspaceData(session),
        ]);
        if (!isMounted) {
          return;
        }

        setTeacherId(dashboardData.teacherId);
        setSelectedClassId(dashboardData.selectedClassId);
        setSelectedClassCardId(dashboardData.selectedClassId);
        setGradebookClassId(dashboardData.selectedClassId);
        setAttendanceClassId(dashboardData.selectedClassId);
        setTeacherName(dashboardData.teacherName);
        setSelectedClass(dashboardData.selectedClassName);
        setClassesData(
          dashboardData.classes.map((item) => ({
            id: item.id,
            name: item.name,
            teacherId: 'teacher_1',
            students: dashboardData.students
              .filter((student) => student.classId === item.id)
              .map((student) => student.id),
          })),
        );
        setStudentsData(dashboardData.students);
        setAssessmentsByClass(dashboardData.assessmentsByClass);
        setAssessmentTitles(
          dashboardData.assessments.slice(0, 2).map((assessment) => assessment.title),
        );
        setWorkspace(workspaceData);
        setDataSourceLabel('api');
        setLoadError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTeacherName(MOCK_TEACHER.name);
        setTeacherId('teacher_1');
        setSelectedClassId(MOCK_CLASSES[0]?.id || 'c1');
        setSelectedClassCardId(MOCK_CLASSES[0]?.id || 'c1');
        setGradebookClassId(MOCK_CLASSES[0]?.id || 'c1');
        setAttendanceClassId(MOCK_CLASSES[0]?.id || 'c1');
        setClassesData(MOCK_CLASSES);
        setStudentsData(MOCK_STUDENTS);
        setAssessmentsByClass({
          c1: [
            { id: 'g1a', title: 'Interrogation 1', subject: 'Mathématiques', date: '2026-04-10' },
            { id: 'g1b', title: 'Devoir 1', subject: 'Français', date: '2026-04-12' },
          ],
        });
        setAssessmentTitles(['Interrogation 1', 'Devoir 1']);
        setWorkspace({
          upcomingLessons: [
            { id: 'mock-1', classId: 'c1', className: 'Terminale S1', subjectId: 'math', subjectName: 'Mathématiques', day: 'Lundi', startTime: '08:00', endTime: '10:00', room: 'Salle A1' },
            { id: 'mock-2', classId: 'c1', className: 'Terminale S1', subjectId: 'pc', subjectName: 'Physique-Chimie', day: 'Lundi', startTime: '10:30', endTime: '12:30', room: 'Salle B2' },
          ],
          weeklySchedule: [
            { id: 'mock-1', classId: 'c1', className: 'Terminale S1', subjectId: 'math', subjectName: 'Mathématiques', day: 'Lundi', startTime: '08:00', endTime: '10:00', room: 'Salle A1' },
            { id: 'mock-2', classId: 'c1', className: 'Terminale S1', subjectId: 'pc', subjectName: 'Physique-Chimie', day: 'Lundi', startTime: '10:30', endTime: '12:30', room: 'Salle B2' },
            { id: 'mock-3', classId: 'c1', className: 'Terminale S1', subjectId: 'fr', subjectName: 'Français', day: 'Mercredi', startTime: '14:00', endTime: '16:00', room: 'Salle C1' },
          ],
          quickContacts: [
            { parentName: 'Fatou Diop', studentName: 'Moussa Diop', phone: '+33748407869', lastMessage: 'Suivi de progression demandé.' },
          ],
        });
        setDataSourceLabel('mock');
        setLoadError("Backend indisponible, affichage des donnees de demonstration.");
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const activeClass = useMemo(
    () => classesData.find((item) => item.name === selectedClass) ?? classesData[0] ?? null,
    [classesData, selectedClass],
  );

  useEffect(() => {
    if (activeClass) {
      setSelectedClassId(activeClass.id);
      setSelectedClassCardId(activeClass.id);
    }
  }, [activeClass]);

  useEffect(() => {
    const currentAssessments = assessmentsByClass[gradebookClassId] ?? [];
    setAssessmentTitles(currentAssessments.slice(0, 2).map((assessment: any) => assessment.title));
    setSelectedSubjectFilter('all');
    setSelectedPeriodFilter('all');
  }, [assessmentsByClass, gradebookClassId]);

  const filteredStudents = useMemo(
    () =>
      activeClass
        ? studentsData.filter((student) => activeClass.students.includes(student.id))
        : studentsData,
    [activeClass, studentsData],
  );

  const selectedClassCard = useMemo(
    () => classesData.find((item) => item.id === selectedClassCardId) ?? activeClass,
    [activeClass, classesData, selectedClassCardId],
  );

  const selectedClassStudents = useMemo(
    () =>
      selectedClassCard
        ? studentsData.filter((student) => selectedClassCard.students.includes(student.id))
        : [],
    [selectedClassCard, studentsData],
  );

  useEffect(() => {
    if (!selectedClassCard) {
      setClassRecommendationHistory([]);
      return;
    }

    void loadClassRecommendationHistory(selectedClassCard.id);
  }, [dataSourceLabel, selectedClassCard]);

  const classAverage = useMemo(
    () => average(filteredStudents.flatMap((student) => student.grades.map((grade) => grade.value))),
    [filteredStudents],
  );

  const gradebookClass = useMemo(
    () => classesData.find((item) => item.id === gradebookClassId) ?? classesData[0] ?? null,
    [classesData, gradebookClassId],
  );

  const gradebookStudents = useMemo(
    () =>
      gradebookClass
        ? studentsData.filter((student) => gradebookClass.students.includes(student.id))
        : studentsData,
    [gradebookClass, studentsData],
  );

  const gradebookAssessments = useMemo(
    () => assessmentsByClass[gradebookClassId] ?? [],
    [assessmentsByClass, gradebookClassId],
  );

  const subjectOptions = useMemo(() => {
    const fromAssessments = gradebookAssessments
      .map((assessment: any) => assessment.subject)
      .filter(Boolean);
    const fromGrades = Array.from(
      new Set(gradebookStudents.flatMap((student) => student.grades.map((grade) => grade.subject))),
    );
    return Array.from(new Set([...fromAssessments, ...fromGrades]));
  }, [gradebookAssessments, gradebookStudents]);

  const applyPeriodFilter = (date: string, period: string) => {
    if (!date || period === 'all') return true;
    const month = new Date(date).getMonth() + 1;
    if (period === 't1') return month >= 10 || month <= 12;
    if (period === 't2') return month >= 1 && month <= 3;
    if (period === 't3') return month >= 4 && month <= 7;
    if (period === 's1') return month >= 10 || month <= 3;
    if (period === 's2') return month >= 4 && month <= 7;
    return true;
  };

  const filteredGradebookStudents = useMemo(
    () =>
      gradebookStudents.map((student) => {
        const scopedGrades = student.grades.filter((grade) => {
          const subjectMatches =
            selectedSubjectFilter === 'all' || grade.subject === selectedSubjectFilter;
          const periodMatches = applyPeriodFilter(grade.date, selectedPeriodFilter);
          return subjectMatches && periodMatches;
        });

        return {
          ...student,
          grades: scopedGrades,
        };
      }),
    [gradebookStudents, selectedPeriodFilter, selectedSubjectFilter],
  );

  const attendanceClass = useMemo(
    () => classesData.find((item) => item.id === attendanceClassId) ?? classesData[0] ?? null,
    [attendanceClassId, classesData],
  );

  const attendanceStudents = useMemo(
    () =>
      attendanceClass
        ? studentsData.filter((student) => attendanceClass.students.includes(student.id))
        : studentsData,
    [attendanceClass, studentsData],
  );

  const totalAbsences = useMemo(
    () =>
      filteredStudents.flatMap((student) => student.attendance).filter((item) => item.status === 'absent').length,
    [filteredStudents],
  );

  const atRiskStudents = useMemo(
    () =>
      filteredStudents.filter((student) => {
        const studentAverage = average(student.grades.map((grade) => grade.value));
        const hasAbsence = student.attendance.some((item) => item.status !== 'present');
        return (studentAverage !== null && studentAverage < 12) || hasAbsence;
      }),
    [filteredStudents],
  );

  const handleAnalyze = async (student: Student) => {
    setSelectedStudent(student);
    setAiAnalysis(null);
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeStudentPerformance(student, recommendationPrompt.trim() || undefined);
      setAiAnalysis(analysis);

      if (dataSourceLabel === 'api') {
        await saveTeacherRecommendation(student.id, {
          summary: analysis.summary,
          riskLevel: analysis.riskLevel,
          recommendations: analysis.recommendations || [],
          explanation: analysis.explanation,
          prompt: recommendationPrompt.trim() || undefined,
        });
        const history = await fetchTeacherRecommendations(student.id);
        setRecommendationHistory(history);
      } else {
        setRecommendationHistory((prev) => [
          {
            id: `mock_${Date.now()}`,
            studentId: student.id,
            summary: analysis.summary,
            riskLevel: analysis.riskLevel,
            recommendations: analysis.recommendations || [],
            explanation: analysis.explanation,
            prompt: recommendationPrompt.trim() || '',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setRecommendationPrompt('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openStudentDetails = async (student: Student) => {
    setSelectedStudent(student);
    setContextStudent(student);
    setWhatsAppTargetStudent(student);
    if (dataSourceLabel === 'api') {
      try {
        const history = await fetchTeacherRecommendations(student.id);
        setRecommendationHistory(history);
      } catch {
        setRecommendationHistory([]);
      }
    } else {
      setRecommendationHistory([]);
    }
  };

  const loadClassRecommendationHistory = async (classId: string) => {
    if (dataSourceLabel === 'api') {
      try {
        const history = await fetchTeacherClassRecommendations(classId);
        setClassRecommendationHistory(history);
      } catch {
        setClassRecommendationHistory([]);
      }
      return;
    }

    setClassRecommendationHistory([]);
  };

  const handleAnalyzeClass = async () => {
    if (!selectedClassCard) {
      return;
    }

    setClassAiAnalysis(null);
    setIsAnalyzingClass(true);
    try {
      const analysis = await analyzeClassPerformance(
        selectedClassCard.name,
        selectedClassStudents,
        classRecommendationPrompt.trim() || undefined,
      );
      setClassAiAnalysis(analysis);

      if (dataSourceLabel === 'api') {
        await saveTeacherClassRecommendation(selectedClassCard.id, {
          summary: analysis.summary,
          riskLevel: analysis.riskLevel,
          recommendations: analysis.recommendations || [],
          explanation: analysis.explanation,
          prompt: classRecommendationPrompt.trim() || undefined,
        });
        await loadClassRecommendationHistory(selectedClassCard.id);
      } else {
        setClassRecommendationHistory((prev) => [
          {
            id: `mock_class_${Date.now()}`,
            classId: selectedClassCard.id,
            scope: 'class',
            summary: analysis.summary,
            riskLevel: analysis.riskLevel,
            recommendations: analysis.recommendations || [],
            explanation: analysis.explanation,
            prompt: classRecommendationPrompt.trim() || '',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setClassRecommendationPrompt('');
    } finally {
      setIsAnalyzingClass(false);
    }
  };

  const handleWhatsAppSend = async () => {
    if (!whatsAppTargetStudent || !whatsAppDraft.trim()) {
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      if (dataSourceLabel === 'api') {
        const result = await sendTeacherWhatsAppMessage(whatsAppTargetStudent.id, whatsAppDraft.trim());
        setSaveMessage(result.sent > 0 ? 'Message WhatsApp envoyé au parent.' : "Message préparé mais non délivré.");
      } else {
        setSaveMessage('Message WhatsApp simulé en mode démo.');
      }
      setWhatsAppDraft('');
    } catch {
      setSaveMessage("Impossible d'envoyer le message WhatsApp.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleGradeUpdate = async (studentId: string, gradeId: string, nextValue: number) => {
    setStudentsData((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              grades: student.grades.map((grade) =>
                grade.id === gradeId ? { ...grade, value: nextValue } : grade,
              ),
            }
          : student,
      ),
    );

    if (dataSourceLabel !== 'api') {
      setSaveMessage('Modification en mode demo local.');
      return;
    }

    try {
      await updateTeacherGrade(gradeId, nextValue);
      setSaveMessage('Note enregistree.');
    } catch {
      setSaveMessage("Impossible d'enregistrer la note.");
    }
  };

  const handleAttendanceValidation = async (
    date: string,
    entries: Array<{
      studentId: string;
      status: Attendance['status'];
      reason?: string;
      minutesLate?: number;
    }>,
  ) => {
    setStudentsData((prev) =>
      prev.map((student) => {
        const draftEntry = entries.find((entry) => entry.studentId === student.id);
        if (!draftEntry) {
          return student;
        }

        const existing = student.attendance.find((item) => item.date === date);
        const nextAttendance = existing
          ? student.attendance.map((item) =>
              item.date === date
                ? { ...item, status: draftEntry.status, reason: draftEntry.reason }
                : item,
            )
          : [
              ...student.attendance,
              {
                id: `local_${student.id}_${date}`,
                studentId: student.id,
                date,
                status: draftEntry.status,
                reason: draftEntry.reason,
              },
            ];

        return {
          ...student,
          attendance: nextAttendance,
        };
      }),
    );

    if (dataSourceLabel !== 'api') {
      setSaveMessage("Appel validé en mode démo local.");
      return;
    }

    try {
      await saveTeacherAttendance({
        classId: attendanceClassId,
        teacherId,
        date,
        entries: entries.map((entry) => ({
          studentId: entry.studentId,
          status:
            entry.status === 'present'
              ? 'PRESENT'
              : entry.status === 'absent'
                ? 'ABSENT'
                : 'LATE',
          reason: entry.reason,
          minutesLate: entry.status === 'late' ? entry.minutesLate ?? 10 : undefined,
        })),
      });
      setSaveMessage("Appel validé et notifications envoyées pour les absences/retards non justifiés.");
    } catch {
      setSaveMessage("Impossible de valider l'appel.");
    }
  };

  return (
    <div className="flex h-screen bg-bg font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] bg-primary text-white flex flex-col h-full shrink-0">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tighter">Xelal.</h1>
          </div>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Enseignant</p>
        </div>

        <nav className="flex-1 py-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'classes', label: 'Mes Classes', icon: Users },
            { id: 'notes', label: 'Carnet de Notes', icon: BookOpen },
            { id: 'absences', label: 'Absences', icon: Calendar },
            { id: 'messages', label: 'Messages Parents', icon: MessageSquare },
            { id: 'schedule', label: 'Emploi du temps', icon: Clock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-all relative ${
                selectedTab === item.id 
                  ? 'bg-white/10 text-white opacity-100 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-accent' 
                  : 'text-white/70 hover:text-white hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <item.icon size={18} strokeWidth={selectedTab === item.id ? 2.5 : 2} />
              <span className={selectedTab === item.id ? 'font-semibold' : 'font-medium'}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white/10">JD</div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{teacherName}</p>
              <p className="text-[10px] text-white/50 truncate">{dataSourceLabel === 'api' ? 'Connecte au backend' : 'Mode demo local'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[72px] bg-white border-b border-border flex items-center justify-between px-8 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-text-main capitalize tracking-tight">{selectedTab}</h2>
            <p className="text-[11px] text-text-muted font-medium">Aujourd'hui, {formatToday()}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent w-60 transition-all font-medium"
              />
            </div>
            <div className="h-8 w-px bg-border" />
            <button className="text-text-muted hover:text-text-main transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {loadError && (
            <div className="mb-6 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-xs font-semibold text-text-main">
              {loadError}
            </div>
          )}
          {saveMessage && (
            <div className="mb-6 rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-xs font-semibold text-text-main">
              {saveMessage}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedTab === 'dashboard' && (
                <TeacherDashboardView
                  handleAnalyze={handleAnalyze}
                  openStudentDetails={openStudentDetails}
                  students={filteredStudents}
                  selectedClass={selectedClass}
                  classAverage={classAverage}
                  totalAbsences={totalAbsences}
                  atRiskStudents={atRiskStudents}
                  isLoadingData={isLoadingData}
                  recommendationHistory={recommendationHistory}
                  setSelectedStudent={setSelectedStudent}
                  setWhatsAppTargetStudent={setWhatsAppTargetStudent}
                  whatsAppTargetStudent={whatsAppTargetStudent}
                  whatsAppDraft={whatsAppDraft}
                  setWhatsAppDraft={setWhatsAppDraft}
                  handleWhatsAppSend={handleWhatsAppSend}
                  isSendingWhatsApp={isSendingWhatsApp}
                  upcomingLessons={workspace.upcomingLessons}
                  onLessonClick={setSelectedLesson}
                />
              )}
              {selectedTab === 'classes' && (
                <ClassesView
                  classes={classesData}
                  students={studentsData}
                  selectedClassId={selectedClassCardId}
                  setSelectedClass={setSelectedClass}
                  setSelectedClassId={setSelectedClassCardId}
                  openStudentDetails={openStudentDetails}
                  classRecommendationHistory={classRecommendationHistory}
                  classAiAnalysis={classAiAnalysis}
                  classRecommendationPrompt={classRecommendationPrompt}
                  setClassRecommendationPrompt={setClassRecommendationPrompt}
                  handleAnalyzeClass={handleAnalyzeClass}
                  isAnalyzingClass={isAnalyzingClass}
                />
              )}
              {selectedTab === 'notes' && (
                <GradebookView
                  selectedClass={gradebookClass?.name ?? selectedClass}
                  selectedClassId={gradebookClassId}
                  classes={classesData}
                  students={filteredGradebookStudents}
                  assessmentTitles={assessmentTitles}
                  subjectOptions={subjectOptions}
                  selectedSubjectFilter={selectedSubjectFilter}
                  setSelectedSubjectFilter={setSelectedSubjectFilter}
                  selectedPeriodFilter={selectedPeriodFilter}
                  setSelectedPeriodFilter={setSelectedPeriodFilter}
                  setSelectedClass={setSelectedClass}
                  setSelectedClassId={setGradebookClassId}
                  openStudentDetails={openStudentDetails}
                  handleAnalyze={handleAnalyze}
                  onGradeUpdate={handleGradeUpdate}
                />
              )}
              {selectedTab === 'absences' && (
                <AttendanceView
                  selectedClass={attendanceClass?.name ?? selectedClass}
                  selectedClassId={attendanceClassId}
                  classes={classesData}
                  students={attendanceStudents}
                  setSelectedClass={setSelectedClass}
                  setSelectedClassId={setAttendanceClassId}
                  onAttendanceValidate={handleAttendanceValidation}
                  openStudentDetails={openStudentDetails}
                />
              )}
              {selectedTab === 'messages' && <MessagesView session={session} />}
              {selectedTab === 'schedule' && (
                <ScheduleView
                  lessons={workspace.weeklySchedule}
                  onLessonClick={setSelectedLesson}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Detail Panel Overlay */}
      <AnimatePresence>
        {contextStudent && selectedTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-[280px] z-40 w-[360px] rounded-[2rem] border border-border bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Élève ciblé</p>
                <h3 className="mt-1 text-lg font-bold text-text-main">{contextStudent.name}</h3>
                <p className="text-xs font-medium text-text-muted">{selectedClass}</p>
              </div>
              <button onClick={() => setContextStudent(null)} className="rounded-xl bg-bg px-3 py-2 text-xs font-bold text-text-main">
                Fermer
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat label="Moyenne" value={`${average(contextStudent.grades.map((grade) => grade.value)) ?? '--'}/20`} />
              <MiniStat label="Absences" value={String(contextStudent.attendance.filter((item) => item.status === 'absent').length)} />
              <MiniStat label="Retards" value={String(contextStudent.attendance.filter((item) => item.status === 'late').length)} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => handleAnalyze(contextStudent)} className="rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white">
                Analyser
              </button>
              <button onClick={() => { setSelectedStudent(contextStudent); setWhatsAppTargetStudent(contextStudent); }} className="rounded-xl bg-[#e7f3ef] px-4 py-3 text-xs font-bold text-[#075e54]">
                WhatsApp
              </button>
              <button onClick={() => setSelectedStudent(contextStudent)} className="rounded-xl bg-bg px-4 py-3 text-xs font-bold text-text-main">
                Voir le profil
              </button>
            </div>
          </motion.div>
        )}
        {selectedStudent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-[500px] h-full bg-white shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-primary-light rounded-3xl flex items-center justify-center text-primary text-2xl font-bold border border-blue-100">
                     {selectedStudent.name[0]}
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-text-main">{selectedStudent.name}</h2>
                     <p className="text-text-muted font-medium">Élève en {selectedClass}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-bg rounded-full transition-all">
                  <XCircle size={24} className="text-text-muted" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left">
                {/* AI Analysis Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-ai-glow">
                      <BrainCircuit size={20} />
                      Analyse Pédagogique IA
                    </h3>
                    {isAnalyzing && <span className="text-xs text-text-muted animate-pulse font-mono uppercase tracking-widest font-bold">En cours...</span>}
                  </div>
                  
                  {aiAnalysis ? (
                    <div className={`p-6 rounded-3xl border-2 ${aiAnalysis.riskLevel === 'high' ? 'border-danger/20 bg-danger/5' : 'border-ai-glow/20 bg-ai-glow/5'}`}>
                      <div className="flex items-center gap-2 mb-3">
                         <div className={`w-3 h-3 rounded-full ${aiAnalysis.riskLevel === 'high' ? 'bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`} />
                         <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Risque: {aiAnalysis.riskLevel}</span>
                      </div>
                      <p className="text-sm font-semibold text-text-main leading-relaxed italic mb-4">
                        "{aiAnalysis.summary}"
                      </p>
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-text-main uppercase tracking-widest">Recommandations Strategiques :</p>
                        <ul className="space-y-2">
                          {aiAnalysis.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="flex gap-2 text-xs text-text-muted font-medium">
                              <span className="text-ai-glow font-bold">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 bg-bg border border-border rounded-3xl flex items-center justify-center flex-col gap-4 p-8 text-center">
                      <p className="text-xs text-text-muted font-semibold">Générez des insights personnalisés basés sur les données réelles de l'élève.</p>
                      <textarea
                        value={recommendationPrompt}
                        onChange={(event) => setRecommendationPrompt(event.target.value)}
                        placeholder="Ex: proposer une stratégie centrée sur la régularité des devoirs"
                        className="h-20 w-full rounded-2xl border border-border bg-white px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-accent"
                      />
                      {!isAnalyzing && (
                        <button 
                          onClick={() => handleAnalyze(selectedStudent)}
                          className="px-6 py-2 bg-ai-glow text-white font-bold rounded-full text-xs shadow-lg shadow-purple-100 hover:scale-105 transition-all"
                        >
                          Lancer l'Analyse
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-text-main text-sm uppercase tracking-wider">Historique Récent</h3>
                  <div className="space-y-3">
                    {selectedStudent.grades.slice(0, 3).map((grade, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border">
                        <div>
                          <p className="font-bold text-xs text-text-main">{grade.subject}</p>
                          <p className="text-[10px] text-text-muted font-bold font-mono uppercase">{grade.date}</p>
                        </div>
                        <span className={`font-mono font-extrabold text-lg ${grade.value >= 10 ? 'text-success' : 'text-danger'}`}>
                          {grade.value}/20
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-text-main text-sm uppercase tracking-wider">Historique des recommandations</h3>
                    <button
                      onClick={() => handleAnalyze(selectedStudent)}
                      className="rounded-xl bg-primary-light px-3 py-2 text-[11px] font-bold text-primary"
                    >
                      Demander une autre recommandation
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recommendationHistory.length ? recommendationHistory.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-bg/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.riskLevel === 'high' ? 'bg-danger/10 text-danger' : item.riskLevel === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                            {item.riskLevel}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-text-main">{item.summary}</p>
                        {!!item.prompt && <p className="mt-2 text-[11px] text-text-muted">Demande: {item.prompt}</p>}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-border bg-bg/30 p-4 text-xs font-medium text-text-muted">
                        Aucune recommandation enregistrée pour cet élève pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border flex gap-4">
                <button
                  onClick={() => {
                    setWhatsAppTargetStudent(selectedStudent);
                    setSelectedTab('dashboard');
                  }}
                  className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm"
                >
                   <Send size={18} />
                   Message via WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {selectedLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
            onClick={() => setSelectedLesson(null)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Prochain cours</p>
              <h3 className="mt-2 text-2xl font-bold text-text-main">{selectedLesson.subjectName}</h3>
              <p className="mt-1 text-sm font-medium text-text-muted">{selectedLesson.className}</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <MiniStat label="Jour" value={selectedLesson.day} />
                <MiniStat label="Horaire" value={`${selectedLesson.startTime}-${selectedLesson.endTime}`} />
                <MiniStat label="Salle" value={selectedLesson.room} />
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedLesson(null)} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherDashboardView({
  handleAnalyze,
  openStudentDetails,
  students,
  selectedClass,
  classAverage,
  totalAbsences,
  atRiskStudents,
  isLoadingData,
  recommendationHistory,
  setSelectedStudent,
  setWhatsAppTargetStudent,
  whatsAppTargetStudent,
  whatsAppDraft,
  setWhatsAppDraft,
  handleWhatsAppSend,
  isSendingWhatsApp,
  upcomingLessons,
  onLessonClick,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Moyenne Générale", value: classAverage ? `${classAverage}/20` : '--', trend: selectedClass, trendColor: "text-success", icon: BarChart3 },
            { label: "Absences Signalees", value: String(totalAbsences).padStart(2, '0'), trend: "Suivi de la classe", trendColor: totalAbsences > 0 ? "text-danger" : "text-success", icon: Calendar },
            { label: "Alertes IA At-Risk", value: String(atRiskStudents.length).padStart(2, '0'), trend: "Action requise", trendColor: "text-text-muted", icon: BrainCircuit, valColor: atRiskStudents.length ? "text-danger" : "text-success" },
          ].map((stat, i) => (
            <div key={i} className="polished-card p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-bg text-primary rounded-lg border border-border">
                  <stat.icon size={20} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.valColor || 'text-primary'}`}>{stat.value}</h3>
                <p className={`text-[11px] font-semibold ${stat.trendColor}`}>{stat.trend}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Action Panel */}
        <div className="polished-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between bg-bg/50">
            <h3 className="text-sm font-bold text-text-main">Élèves nécessitant une attention</h3>
            <span className="bg-ai-glow text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Analysé par IA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg/30 text-[10px] font-bold text-text-muted uppercase">
                <tr>
                  <th className="px-6 py-3">Nom de l'élève</th>
                  <th className="px-6 py-3">Classe</th>
                  <th className="px-6 py-3">Note / Trend</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student: Student) => {
                  const studentAverage = average(student.grades.map((grade) => grade.value));
                  const latestGrade = student.grades.at(-1)?.value ?? studentAverage ?? 0;
                  const firstGrade = student.grades[0]?.value ?? latestGrade;
                  const delta = latestGrade - firstGrade;
                  const needsAttention = atRiskStudents.some((item: Student) => item.id === student.id);

                  return (
                  <tr key={student.id} className={`transition-colors group ${needsAttention ? 'bg-danger/5 hover:bg-danger/10' : 'hover:bg-bg/50'}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => openStudentDetails(student)} className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 bg-primary-light text-primary rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-blue-100">
                          {student.name[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-text-main">{student.name}</span>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                            {needsAttention ? 'Suivi renforcé' : 'Stable'}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-text-muted">{selectedClass}</td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                         <span className={`font-bold ${latestGrade >= 12 ? 'text-success' : 'text-danger'}`}>{latestGrade}/20</span>
                         <span className={`text-[9px] font-bold opacity-80 ${delta < 0 ? 'text-danger' : 'text-success'}`}>{delta < 0 ? '↘' : '↗'} {delta.toFixed(1)} pts</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openStudentDetails(student)}
                          className="rounded-xl bg-bg px-3 py-2 text-[11px] font-bold text-text-main"
                        >
                          Profil
                        </button>
                        <button
                          onClick={() => { setSelectedStudent(student); handleAnalyze(student); }}
                          className="rounded-xl bg-primary-light px-3 py-2 text-[11px] font-bold text-primary"
                        >
                          IA
                        </button>
                        <button
                          onClick={() => { setWhatsAppTargetStudent(student); setSelectedStudent(student); }}
                          className="rounded-xl bg-[#e7f3ef] px-3 py-2 text-[11px] font-bold text-[#075e54]"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
                {!students.length && !isLoadingData && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-text-muted">
                      Aucune donnee eleve disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        <button
          onClick={() => atRiskStudents[0] && setSelectedStudent(atRiskStudents[0])}
          className="polished-card w-full border-l-4 border-l-accent bg-primary-light p-5 text-left transition hover:-translate-y-0.5"
        >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Recommandations IA</h4>
                <p className="text-xs text-text-main leading-relaxed font-semibold">
                  {recommendationHistory.length
                    ? `${recommendationHistory.length} recommandation(s) enregistrée(s) pour consultation et rapport.`
                    : `La classe ${selectedClass} présente ${atRiskStudents.length} élève(s) nécessitant un suivi renforcé.`}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
                Ouvrir
              </span>
            </div>
        </button>

        <div className="bg-[#e7f3ef] border border-[#c5d9d1] rounded-2xl p-5 shadow-sm">
          <h4 className="text-[10px] font-bold text-[#075e54] uppercase tracking-wider mb-4 border-b border-[#c5d9d1] pb-2">WhatsApp Direct</h4>
          <div className="space-y-3">
            <div className="rounded-2xl bg-white/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#075e54]">Cible actuelle</p>
              <p className="mt-1 text-sm font-bold text-[#075e54]">
                {whatsAppTargetStudent ? whatsAppTargetStudent.name : 'Choisir un élève'}
              </p>
            </div>
            <textarea
              value={whatsAppDraft}
              onChange={(event) => setWhatsAppDraft(event.target.value)}
              placeholder="Écrire un message direct au parent..."
              className="h-24 w-full rounded-2xl border border-[#c5d9d1] bg-white px-4 py-3 text-[11px] outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {students.slice(0, 3).map((student: Student) => (
                <button
                  key={student.id}
                  onClick={() => setWhatsAppTargetStudent(student)}
                  className={`rounded-full px-3 py-2 text-[10px] font-bold ${whatsAppTargetStudent?.id === student.id ? 'bg-[#075e54] text-white' : 'bg-white text-[#075e54]'}`}
                >
                  {student.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <button
              onClick={handleWhatsAppSend}
              disabled={!whatsAppTargetStudent || !whatsAppDraft.trim() || isSendingWhatsApp}
              className="w-full rounded-2xl bg-[#075e54] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {isSendingWhatsApp ? 'Envoi...' : 'Envoyer au parent'}
            </button>
            {!!upcomingLessons.length && (
              <div className="rounded-2xl bg-white p-3 text-[11px] text-[#075e54] shadow-sm">
                <p className="font-bold">{upcomingLessons[0].className}</p>
                <p>{upcomingLessons[0].subjectName} • {upcomingLessons[0].day} {upcomingLessons[0].startTime}</p>
              </div>
            )}
            <div className="space-y-2">
              {students.slice(0, 2).map((student: Student) => (
                <button
                  key={`wa-${student.id}`}
                  onClick={() => {
                    setWhatsAppTargetStudent(student);
                    setWhatsAppDraft(`Bonjour, je souhaite faire un point rapide concernant ${student.name}.`);
                  }}
                  className="w-full rounded-xl bg-white p-3 text-left text-[11px] shadow-sm"
                >
                  <p className="font-bold text-[#075e54]">{student.name}</p>
                  <p className="text-[#4a6b63]">Préremplir un message parent</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="polished-card p-5">
          <h4 className="text-[10px] font-bold text-text-main uppercase tracking-widest mb-4">Prochains Cours</h4>
          <div className="space-y-4">
             {upcomingLessons.map((item: TeacherLesson) => (
               <button
                 key={item.id}
                 onClick={() => onLessonClick(item)}
                 className="flex w-full justify-between items-center text-left text-xs border-b border-border pb-2 last:border-0 last:pb-0 hover:text-primary"
               >
                 <div>
                   <span className="text-text-muted font-bold font-mono">{item.startTime} - {item.endTime}</span>
                   <p className="mt-1 font-bold text-text-main">{item.className}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-text-main">{item.subjectName}</p>
                   <p className="text-[10px] font-semibold text-text-muted">{item.day}</p>
                 </div>
               </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg/40 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-bold text-text-main">{value}</p>
    </div>
  );
}

function ScheduleView({ lessons, onLessonClick }: { lessons: TeacherLesson[]; onLessonClick: (lesson: TeacherLesson) => void }) {
  const grouped = lessons.reduce<Record<string, TeacherLesson[]>>((acc, lesson) => {
    acc[lesson.day] = [...(acc[lesson.day] || []), lesson];
    return acc;
  }, {});

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-text-main">Emploi du temps enseignant</h3>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Vue hebdomadaire</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {days.map((day) => (
          <div key={day} className="polished-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{day}</p>
            <div className="mt-4 space-y-3">
              {(grouped[day] || []).length ? grouped[day].map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => onLessonClick(lesson)}
                  className="w-full rounded-2xl border border-border bg-bg/40 p-4 text-left transition hover:border-accent hover:bg-primary-light/40"
                >
                  <p className="text-xs font-bold text-text-main">{lesson.subjectName}</p>
                  <p className="mt-1 text-[11px] font-medium text-text-muted">{lesson.className}</p>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {lesson.startTime} - {lesson.endTime} • {lesson.room}
                  </p>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-bg/20 p-4 text-xs font-medium text-text-muted">
                  Aucun cours prévu.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassesView({
  classes,
  students,
  selectedClassId,
  setSelectedClass,
  setSelectedClassId,
  openStudentDetails,
  classRecommendationHistory,
  classAiAnalysis,
  classRecommendationPrompt,
  setClassRecommendationPrompt,
  handleAnalyzeClass,
  isAnalyzingClass,
}: any) {
  const focusedClass = classes.find((item: any) => item.id === selectedClassId) ?? classes[0] ?? null;
  const classStudents = focusedClass
    ? students.filter((student: Student) => focusedClass.students.includes(student.id))
    : [];
  const classAverage = average(
    classStudents.flatMap((student: Student) => student.grades.map((grade) => grade.value)),
  );
  const totalAbsences = classStudents.flatMap((student: Student) => student.attendance).filter((item: Attendance) => item.status === 'absent').length;
  const totalLate = classStudents.flatMap((student: Student) => student.attendance).filter((item: Attendance) => item.status === 'late').length;
  const studentsNeedingSupport = classStudents.filter((student: Student) => {
    const studentAverage = average(student.grades.map((grade) => grade.value));
    return (studentAverage !== null && studentAverage < 12) || student.attendance.some((item) => item.status !== 'present');
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-main">Classes affectées par l'administration</h3>
            <p className="text-[11px] font-medium text-text-muted">
              L'enseignant ne crée pas ses classes ici. Il consulte les classes qui lui sont déjà attribuées par l'école.
            </p>
          </div>
          <div className="rounded-2xl bg-bg px-4 py-3 text-[11px] font-semibold text-text-main">
            {classes.length} classe(s) attribuée(s)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {classes.map((cls: any, i: number) => {
            const clsStudents = students.filter((student: Student) => cls.students.includes(student.id));
            const clsAverage = average(clsStudents.flatMap((student: Student) => student.grades.map((grade) => grade.value)));
            const clsAbsences = clsStudents.flatMap((student: Student) => student.attendance).filter((item: Attendance) => item.status === 'absent').length;
            const isActive = focusedClass?.id === cls.id;

            return (
              <motion.button
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                key={cls.id}
                onClick={() => {
                  setSelectedClass(cls.name);
                  setSelectedClassId(cls.id);
                }}
                className={`polished-card p-6 text-left transition ${isActive ? 'border-accent bg-primary-light/30' : 'hover:border-accent'}`}
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Users size={24} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
                    <CheckCircle2 size={12} /> Affectée
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-main">{cls.name}</h3>
                <p className="mt-1 text-xs font-bold text-text-muted">
                  {clsStudents.length} élèves • Suivi enseignant actif
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-text-muted">Moyenne</p>
                    <p className="text-lg font-bold text-text-main">{clsAverage ?? '--'}/20</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-text-muted">Absences</p>
                    <p className="text-lg font-bold text-text-main">{clsAbsences}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="polished-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Classe sélectionnée</p>
                <h3 className="mt-2 text-2xl font-bold text-text-main">{focusedClass?.name ?? 'Aucune classe'}</h3>
                <p className="mt-1 text-sm font-medium text-text-muted">
                  Vue détaillée de la classe et des élèves affectés.
                </p>
              </div>
              <button
                onClick={handleAnalyzeClass}
                disabled={!focusedClass || isAnalyzingClass}
                className="rounded-2xl bg-primary px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {isAnalyzingClass ? 'Analyse...' : 'Analyser la classe'}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Effectif" value={String(classStudents.length)} />
              <MiniStat label="Moyenne" value={`${classAverage ?? '--'}/20`} />
              <MiniStat label="Absences" value={String(totalAbsences)} />
              <MiniStat label="Retards" value={String(totalLate)} />
            </div>

            <div className="mt-5 rounded-2xl bg-bg/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Alerte pédagogique</p>
              <p className="mt-2 text-sm font-semibold text-text-main">
                {studentsNeedingSupport.length
                  ? `${studentsNeedingSupport.length} élève(s) de cette classe nécessitent un suivi renforcé.`
                  : 'Aucun élève critique détecté pour le moment sur cette classe.'}
              </p>
            </div>
          </div>

          <div className="polished-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-text-main">IA classe</h4>
                <p className="text-[11px] font-medium text-text-muted">
                  Recommandations globales enregistrées pour le reporting enseignant.
                </p>
              </div>
              <span className="rounded-full bg-primary-light px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                Historisé
              </span>
            </div>
            <textarea
              value={classRecommendationPrompt}
              onChange={(event) => setClassRecommendationPrompt(event.target.value)}
              placeholder="Ex: propose un plan d'action sur 2 semaines pour les élèves fragiles en mathématiques."
              className="mt-4 h-24 w-full rounded-2xl border border-border bg-white px-4 py-3 text-[11px] outline-none"
            />
            <div className="mt-4 space-y-3">
              {classAiAnalysis && (
                <div className="rounded-2xl border border-primary/15 bg-primary-light/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Dernière analyse</p>
                  <p className="mt-2 text-sm font-bold text-text-main">{classAiAnalysis.summary}</p>
                  {classAiAnalysis.explanation && (
                    <p className="mt-2 text-xs text-text-muted">{classAiAnalysis.explanation}</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {(classAiAnalysis.recommendations || []).map((item: string, index: number) => (
                      <div key={`${item}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-text-main">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(classRecommendationHistory || []).map((item: TeacherRecommendationRecord) => (
                <div key={item.id} className="rounded-2xl border border-border bg-bg/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-text-main">{item.summary}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {item.explanation && (
                    <p className="mt-2 text-xs text-text-muted">{item.explanation}</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {(item.recommendations || []).slice(0, 3).map((recommendation: string, index: number) => (
                      <div key={`${item.id}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-text-main">
                        {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {!classAiAnalysis && !(classRecommendationHistory || []).length && (
                <div className="rounded-2xl border border-dashed border-border bg-bg/20 p-4 text-xs font-medium text-text-muted">
                  Lance une première analyse de classe pour générer des recommandations enregistrées.
                </div>
              )}
            </div>
          </div>

          <div className="polished-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-text-main">Élèves de la classe</h4>
                <p className="text-[11px] font-medium text-text-muted">Clique sur un élève pour ouvrir sa fiche contextuelle.</p>
              </div>
            </div>
            <div className="space-y-3">
              {classStudents.map((student: Student) => {
                const studentAverage = average(student.grades.map((grade) => grade.value));
                const absenceCount = student.attendance.filter((item) => item.status === 'absent').length;

                return (
                  <button
                    key={student.id}
                    onClick={() => openStudentDetails(student)}
                    className="flex w-full items-center justify-between rounded-2xl border border-border bg-bg/20 px-4 py-3 text-left transition hover:border-accent hover:bg-primary-light/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                        {student.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main">{student.name}</p>
                        <p className="text-[11px] font-medium text-text-muted">{absenceCount} absence(s) • moyenne {studentAverage ?? '--'}/20</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Voir
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradebookView({
  selectedClass,
  selectedClassId,
  classes,
  students,
  assessmentTitles,
  subjectOptions,
  selectedSubjectFilter,
  setSelectedSubjectFilter,
  selectedPeriodFilter,
  setSelectedPeriodFilter,
  setSelectedClass,
  setSelectedClassId,
  openStudentDetails,
  handleAnalyze,
  onGradeUpdate,
}: any) {
  const multipleSubjects = subjectOptions.length > 1;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-main capitalize">Carnet : {selectedClass}</h3>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              {multipleSubjects
                ? 'Vue multi-matières'
                : `${subjectOptions[0] || 'Matière affectée'} • Suivi pédagogique`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedClassId}
              onChange={(event) => {
                const nextClassId = event.target.value;
                const nextClass = classes.find((item: any) => item.id === nextClassId);
                setSelectedClassId(nextClassId);
                if (nextClass) {
                  setSelectedClass(nextClass.name);
                }
              }}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold outline-none"
            >
              {classes.map((classItem: any) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>

            <select
              value={selectedSubjectFilter}
              onChange={(event) => setSelectedSubjectFilter(event.target.value)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold outline-none"
            >
              <option value="all">Toutes les matières</option>
              {subjectOptions.map((subject: string) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <select
              value={selectedPeriodFilter}
              onChange={(event) => setSelectedPeriodFilter(event.target.value)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold outline-none"
            >
              <option value="all">Toute l'année</option>
              <option value="t1">Trimestre 1</option>
              <option value="t2">Trimestre 2</option>
              <option value="t3">Trimestre 3</option>
              <option value="s1">Semestre 1</option>
              <option value="s2">Semestre 2</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="rounded-2xl bg-bg px-4 py-3 text-[11px] font-semibold text-text-main">
            {classes.length > 1
              ? `Cet enseignant suit ${classes.length} classes.`
              : `Cet enseignant suit actuellement une seule classe.`}
          </div>
          <div className="rounded-2xl bg-bg px-4 py-3 text-[11px] font-semibold text-text-main">
            {multipleSubjects
              ? `${subjectOptions.length} matières visibles selon ses affectations.`
              : `Une matière dominante pour ce niveau d'enseignement.`}
          </div>
        </div>
      </div>

      <div className="polished-card overflow-hidden">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-bg/50 border-b border-border">
            <tr className="text-[10px] font-bold text-text-muted uppercase">
              <th className="px-6 py-4">Élève</th>
              <th className="px-6 py-4 text-center">{assessmentTitles[0] || 'Evaluation 1'}</th>
              <th className="px-6 py-4 text-center">{assessmentTitles[1] || 'Evaluation 2'}</th>
              <th className="px-6 py-4 text-center">Moyenne</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student: Student) => {
              const firstGrade = student.grades[0];
              const secondGrade = student.grades[1];
              const studentAverage = average(student.grades.map((grade) => grade.value));
              const latestGrade = student.grades.at(-1)?.value ?? null;
              const oldestGrade = student.grades[0]?.value ?? latestGrade ?? null;
              const trend =
                latestGrade !== null && oldestGrade !== null
                  ? Number((latestGrade - oldestGrade).toFixed(1))
                  : null;
              const absenceCount = student.attendance.filter((item) => item.status === 'absent').length;
              const lateCount = student.attendance.filter((item) => item.status === 'late').length;
              return (
              <tr key={student.id} className="hover:bg-bg transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                      {student.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-text-main">{student.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {student.grades.length} note(s)
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {absenceCount} absence(s)
                        </span>
                        {lateCount > 0 && (
                          <span className="rounded-full bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-warning">
                            {lateCount} retard(s)
                          </span>
                        )}
                        {trend !== null && (
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${trend < 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                            {trend < 0 ? 'Baisse' : 'Progression'} {Math.abs(trend)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-mono font-bold">
                  {firstGrade ? (
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      defaultValue={firstGrade.value}
                      onBlur={(event) => onGradeUpdate(student.id, firstGrade.id, Number(event.target.value))}
                      className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-center outline-none focus:ring-1 focus:ring-accent"
                    />
                  ) : '--'}
                </td>
                <td className="px-6 py-4 text-center font-mono font-bold">
                  {secondGrade ? (
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      defaultValue={secondGrade.value}
                      onBlur={(event) => onGradeUpdate(student.id, secondGrade.id, Number(event.target.value))}
                      className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-center outline-none focus:ring-1 focus:ring-accent"
                    />
                  ) : '--'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-lg font-mono font-extrabold text-sm ${(studentAverage ?? 0) >= 12 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {studentAverage ?? '--'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openStudentDetails(student)}
                      className="rounded-xl bg-bg px-3 py-2 text-[11px] font-bold text-text-main"
                    >
                      Profil
                    </button>
                    <button
                      onClick={() => handleAnalyze(student)}
                      className="rounded-xl bg-primary-light px-3 py-2 text-[11px] font-bold text-primary"
                    >
                      IA
                    </button>
                  </div>
                </td>
              </tr>
            )})}
            {!students.length && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm font-medium text-text-muted">
                  Aucun élève ni aucune note pour cette combinaison classe / matière / période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceView({
  selectedClass,
  selectedClassId,
  classes,
  students,
  setSelectedClass,
  setSelectedClassId,
  onAttendanceValidate,
  openStudentDetails,
}: any) {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [draftEntries, setDraftEntries] = useState<Record<string, { status: Attendance['status']; reason: string }>>({});

  useEffect(() => {
    setDraftEntries({});
  }, [currentDate, selectedClassId]);

  const currentEntry = (student: Student) => {
    const draft = draftEntries[student.id];
    if (draft) return draft;

    const existing = student.attendance.find((a) => a.date === currentDate);
    return {
      status: existing?.status ?? 'present',
      reason: existing?.reason ?? '',
    };
  };

  const stagedStudents = students.map((student: Student) => {
    const entry = currentEntry(student);
    return { student, entry };
  });

  const hasPendingChanges = Object.keys(draftEntries).length > 0;
  const presentCount = stagedStudents.filter(({ entry }) => entry.status === 'present').length;
  const absentCount = stagedStudents.filter(({ entry }) => entry.status === 'absent').length;
  const lateCount = stagedStudents.filter(({ entry }) => entry.status === 'late').length;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-main">Pointage : {selectedClass}</h3>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Appel du jour • présent / absent / retard</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedClassId}
              onChange={(event) => {
                const nextClassId = event.target.value;
                const nextClass = classes.find((item: any) => item.id === nextClassId);
                setSelectedClassId(nextClassId);
                if (nextClass) {
                  setSelectedClass(nextClass.name);
                }
              }}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold outline-none"
            >
              {classes.map((classItem: any) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)}
              className="px-4 py-2 border border-border rounded-xl text-xs font-bold outline-none"
            />
          </div>
        </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="Effectif" value={String(students.length)} />
            <MiniStat label="Présents" value={String(presentCount)} />
            <MiniStat label="Absents" value={String(absentCount)} />
            <MiniStat label="Retards" value={String(lateCount)} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-[11px] font-medium text-text-muted">
              {hasPendingChanges
                ? "Des modifications sont en attente. Valide l'appel pour enregistrer et notifier si nécessaire."
                : "Les parents sont notifiés uniquement après validation de l'appel, et seulement pour les absences/retards non justifiés."}
            </p>
            <button
              onClick={() =>
                onAttendanceValidate(
                  currentDate,
                  stagedStudents.map(({ student, entry }) => ({
                    studentId: student.id,
                    status: entry.status,
                    reason: entry.reason.trim() || undefined,
                    minutesLate: entry.status === 'late' ? 10 : undefined,
                  })),
                )
              }
              disabled={!students.length}
              className="rounded-xl bg-success px-5 py-3 text-xs font-bold text-white shadow-lg shadow-green-100 disabled:opacity-50"
            >
              Valider l'appel
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stagedStudents.map(({ student, entry }: { student: Student; entry: { status: Attendance['status']; reason: string } }) => {
          const isAbsent = entry.status === 'absent';
          const isLate = entry.status === 'late';
          return (
            <div key={student.id} className={`polished-card p-5 border-2 transition-all ${isAbsent ? 'border-danger/30 bg-danger/5' : isLate ? 'border-warning/30 bg-warning/5' : 'border-transparent bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center font-bold text-text-muted border border-border">
                    {student.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">{student.name}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{isAbsent ? 'Absent' : isLate ? 'En retard' : 'Présent'}</p>
                  </div>
                </div>
                <button
                  onClick={() => openStudentDetails(student)}
                  className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary"
                >
                  Profil
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] font-medium text-text-muted">
                  {student.attendance.filter((item) => item.status === 'absent').length} absences au total • {student.attendance.filter((item) => item.status === 'late').length} retards
                </div>
              </div>
              {(isAbsent || isLate) && (
                <textarea
                  value={entry.reason}
                  onChange={(event) =>
                    setDraftEntries((prev) => ({
                      ...prev,
                      [student.id]: {
                        ...entry,
                        reason: event.target.value,
                      },
                    }))
                  }
                  placeholder={isAbsent ? "Motif si l'absence est justifiée..." : "Motif si le retard est justifié..."}
                  className="mt-4 h-20 w-full rounded-xl border border-border bg-white px-3 py-3 text-[11px] outline-none"
                />
              )}
              <div className="mt-4 flex gap-2">
                 <button onClick={() => setDraftEntries((prev) => ({ ...prev, [student.id]: { status: 'present', reason: '' } }))} className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold transition-all ${!isAbsent && !isLate ? 'bg-success text-white shadow-lg shadow-green-100' : 'bg-bg text-text-muted hover:bg-gray-200'}`}>
                   Présent
                 </button>
                 <button onClick={() => setDraftEntries((prev) => ({ ...prev, [student.id]: { status: 'late', reason: prev[student.id]?.reason ?? '' } }))} className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold transition-all ${isLate ? 'bg-warning text-white shadow-lg' : 'bg-bg text-text-muted hover:bg-gray-200'}`}>
                   Retard
                 </button>
                 <button onClick={() => setDraftEntries((prev) => ({ ...prev, [student.id]: { status: 'absent', reason: prev[student.id]?.reason ?? '' } }))} className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold transition-all ${isAbsent ? 'bg-danger text-white shadow-lg shadow-red-100' : 'bg-bg text-text-muted hover:bg-gray-200'}`}>
                   Absent
                 </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessagesView({ session }: { session?: AuthSession }) {
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    messageService.fetchContacts(session)
      .then((data) => {
        setContacts(data);
        // Ouvre automatiquement le premier contact
        if (data.length > 0 && !activeStudentId) {
          setActiveStudentId(data[0].studentId);
        }
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session || !activeStudentId) return;
    setIsLoadingThread(true);
    messageService.fetchThread(session, activeStudentId)
      .then((data) => { setThread(data); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setIsLoadingThread(false));
  }, [session, activeStudentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const handleSend = async () => {
    if (!session || !activeStudentId || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      const sent = await messageService.sendMessage(session, activeStudentId, draft.trim());
      setThread((prev) => prev ? { ...prev, thread: [...prev.thread, sent] } : prev);
      setContacts((prev) => prev.map((c) =>
        c.studentId === activeStudentId
          ? { ...c, lastMessage: sent.content, lastMessageAt: sent.createdAt, lastSenderRole: 'TEACHER' }
          : c,
      ));
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return 'Hier';
  };

  return (
    <div className="h-[600px] flex gap-6">
      {/* Liste contacts */}
      <div className="w-80 polished-card flex flex-col shrink-0 overflow-hidden bg-white">
        <div className="p-5 border-b border-border">
          <h3 className="text-xs font-bold text-text-main uppercase tracking-widest mb-4">Messages Parents</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-xl text-[11px] font-medium outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {contacts.length === 0 && (
            <p className="p-5 text-xs text-text-muted">Aucune conversation.</p>
          )}
          {contacts.map((contact) => (
            <button
              key={contact.studentId}
              onClick={() => setActiveStudentId(contact.studentId)}
              className={`w-full text-left p-4 hover:bg-bg cursor-pointer transition-all ${activeStudentId === contact.studentId ? 'bg-primary-light/30 border-l-4 border-l-primary' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs font-bold text-text-main truncate">
                  {contact.parentName} <span className="text-text-muted font-medium">({contact.studentName})</span>
                </p>
                <span className="text-[9px] font-bold text-text-muted shrink-0 ml-1">
                  {contact.lastMessageAt ? formatTime(contact.lastMessageAt) : ''}
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate font-medium">
                {contact.lastSenderRole === 'TEACHER' ? 'Vous : ' : ''}{contact.lastMessage ?? '—'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Fil de conversation */}
      <div className="flex-1 polished-card flex flex-col overflow-hidden bg-white">
        {thread ? (
          <>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                  {thread.parent ? thread.parent.firstName[0] : '?'}
                </div>
                <div>
                  <p className="text-xs font-bold text-text-main leading-none mb-1">
                    {thread.parent ? `${thread.parent.firstName} ${thread.parent.lastName}` : 'Parent'}
                    <span className="font-normal text-text-muted"> — parent de {thread.student.firstName}</span>
                  </p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                    Élève : {thread.student.firstName} {thread.student.lastName}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-text-muted">
                <MoreVertical size={18} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {isLoadingThread && <p className="text-xs text-text-muted text-center">Chargement...</p>}
              {thread.thread.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderRole === 'TEACHER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl text-[11px] max-w-[72%] font-medium ${
                    msg.senderRole === 'TEACHER'
                      ? 'bg-primary text-white rounded-tr-none shadow-lg'
                      : 'bg-white border border-border/50 shadow-sm rounded-tl-none text-text-main'
                  }`}>
                    {msg.content}
                    <p className={`text-[9px] mt-1 text-right ${msg.senderRole === 'TEACHER' ? 'text-white/60' : 'text-text-muted'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {thread.thread.length === 0 && !isLoadingThread && (
                <p className="text-xs text-text-muted text-center">Aucun message. Soyez le premier à écrire.</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && <p className="px-5 pb-2 text-xs text-danger font-semibold">{error}</p>}

            <div className="p-4 border-t border-border bg-bg/20">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Écrire un message..."
                  className="flex-1 px-5 py-3 bg-white border border-border rounded-2xl text-[11px] font-medium focus:ring-1 focus:ring-accent outline-none shadow-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || isSending}
                  className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-100 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
