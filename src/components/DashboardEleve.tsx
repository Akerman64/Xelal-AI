/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Award,
  BookMarked,
  Zap,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  Bell,
  BrainCircuit,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ArrowRight,
  Search,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthSession } from '../types';
import {
  studentService,
  type StudentGradesData,
  type StudentAttendanceData,
  type StudentRecommendation,
} from '../services/studentService';

interface DashboardEleveProps {
  session?: AuthSession;
}

export default function DashboardEleve({ session }: DashboardEleveProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [gradesData, setGradesData] = useState<StudentGradesData | null>(null);
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceData | null>(null);
  const [recommendations, setRecommendations] = useState<StudentRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const studentName = session
    ? `${session.user.firstName} ${session.user.lastName}`
    : 'Élève';
  const studentInitials = session
    ? `${session.user.firstName[0]}${session.user.lastName[0]}`
    : '?';

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!session) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const [grades, attendance, recs] = await Promise.all([
          studentService.fetchGrades(session, session.user.id),
          studentService.fetchAttendance(session, session.user.id),
          studentService.fetchRecommendations(session, session.user.id).catch(() => []),
        ]);
        if (!isMounted) return;
        setGradesData(grades);
        setAttendanceData(attendance);
        setRecommendations(recs);
        setLoadError(null);
      } catch (e) {
        if (!isMounted) return;
        setLoadError(e instanceof Error ? e.message : 'Données indisponibles.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [session]);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Accueil' },
    { id: 'notes', icon: TrendingUp, label: 'Notes' },
    { id: 'agenda', icon: CalendarDays, label: 'Agenda' },
    { id: 'ia', icon: BrainCircuit, label: 'IA Tutor' },
  ];

  return (
    <div className="min-h-screen bg-bg pb-24 font-sans">
      <header className="bg-white px-8 py-6 border-b border-border flex justify-between items-center sticky top-0 z-10 shadow-sm shadow-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold ring-2 ring-blue-50 leading-none">
            {studentInitials}
          </div>
          <div>
            <h1 className="font-bold text-text-main text-sm tracking-tight capitalize">
              {selectedTab === 'dashboard' ? `Bonjour, ${session?.user.firstName ?? 'Élève'} !` : selectedTab}
            </h1>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Session Étudiant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 bg-bg border border-border rounded-xl hover:bg-gray-100 transition-all text-text-muted">
            <Bell size={18} />
            {(attendanceData?.summary.absent ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
            )}
          </button>
          <div className="w-10 h-10 bg-primary-light rounded-2xl border-2 border-white shadow-sm flex items-center justify-center text-primary font-bold">
            {studentInitials}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6">
        {loadError && (
          <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
            {loadError}
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
              <HomeView gradesData={gradesData} attendanceData={attendanceData} isLoading={isLoading} latestRec={recommendations[0]} />
            )}
            {selectedTab === 'notes' && (
              <GradesView gradesData={gradesData} isLoading={isLoading} />
            )}
            {selectedTab === 'agenda' && (
              <AgendaView attendanceData={attendanceData} isLoading={isLoading} />
            )}
            {selectedTab === 'ia' && <IATutorView studentName={studentName} recommendations={recommendations} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-border px-6 py-4 flex justify-between items-center z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] backdrop-blur-md">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all outline-none ${selectedTab === item.id ? 'text-primary' : 'text-text-muted'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${selectedTab === item.id ? 'bg-primary-light' : 'hover:bg-bg'}`}>
              <item.icon size={20} strokeWidth={selectedTab === item.id ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedTab === item.id ? 'opacity-100' : 'opacity-0 scale-75'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeView({ gradesData, attendanceData, isLoading, latestRec }: { gradesData: StudentGradesData | null; attendanceData: StudentAttendanceData | null; isLoading: boolean; latestRec?: StudentRecommendation }) {
  const average = gradesData?.summary.generalAverage;
  const topSubjects = gradesData?.subjectSummaries.slice(0, 2) ?? [];
  const absentCount = attendanceData?.summary.absent ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Moyenne Générale */}
      <div className="bg-primary p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[60px] rounded-full -mr-24 -mt-24" />
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Moyenne Générale</p>
            <h2 className="text-5xl font-mono font-bold tracking-tighter italic">
              {average !== null && average !== undefined ? average.toFixed(1) : '—'}
              <span className="text-lg opacity-40"> /20</span>
            </h2>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl ring-1 ring-white/20 backdrop-blur-md">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold bg-white/10 py-2 px-4 rounded-xl inline-flex self-start border border-white/10">
          <Zap size={16} className="text-amber-400" />
          <span>{gradesData?.summary.gradesCount ?? 0} note(s) enregistrée(s)</span>
        </div>
      </div>

      {/* Conseil IA */}
      {latestRec && (
        <section>
          <div className="polished-card p-6 border-l-4 border-l-ai-glow bg-white">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
                <BrainCircuit size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-text-main">Conseil IA personnalisé</p>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${latestRec.riskLevel === 'high' ? 'bg-danger/10 text-danger' : latestRec.riskLevel === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-success/10 text-success'}`}>
                    Risque {latestRec.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed font-medium italic">
                  "{latestRec.summary}"
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Matières */}
      {topSubjects.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Mes Matières</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {topSubjects.map((sub) => (
              <div key={sub.subjectId} className="polished-card p-5 bg-white">
                <GraduationCap size={20} className="text-primary mb-4" />
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">{sub.subject}</p>
                <p className="text-2xl font-mono font-extrabold text-text-main tracking-tighter">
                  {sub.average !== null ? sub.average.toFixed(1) : '—'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Absences */}
      {absentCount > 0 && (
        <section>
          <div className="polished-card p-5 bg-white border-l-4 border-l-danger flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-danger border border-danger/10">
              <XCircle size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-main">{absentCount} absence(s) enregistrée(s)</p>
              <p className="text-[10px] text-text-muted font-bold uppercase">Voir l'onglet Agenda</p>
            </div>
            <ChevronRight size={18} className="ml-auto text-text-muted" />
          </div>
        </section>
      )}

      {!gradesData && !isLoading && (
        <div className="polished-card p-8 text-center">
          <p className="text-sm text-text-muted">Aucune donnée disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}

function GradesView({ gradesData, isLoading }: { gradesData: StudentGradesData | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-2xl border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const grades = gradesData?.grades ?? [];
  const average = gradesData?.summary.generalAverage;

  return (
    <div className="space-y-6">
      <div className="polished-card p-6 bg-white overflow-hidden">
        <h3 className="text-sm font-bold text-text-main uppercase tracking-wider mb-6">Relevé de Notes</h3>
        {grades.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Aucune note enregistrée.</p>
        ) : (
          <div className="space-y-4">
            {grades.map((grade) => (
              <div key={grade.id} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${grade.value >= 10 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {grade.value >= 10 ? <CheckCircle2 size={16} /> : <TrendingUp size={16} className="rotate-180" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">{grade.subject}</p>
                    <p className="text-[10px] text-text-muted font-medium">{grade.assessmentTitle}</p>
                    <p className="text-[10px] text-text-muted font-bold font-mono">{grade.date ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-extrabold text-text-main">
                    {grade.value}<span className="text-xs opacity-40">/20</span>
                  </p>
                  <p className="text-[9px] font-bold text-text-muted uppercase">Coef. {grade.coefficient}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {average !== null && average !== undefined && (
        <div className="polished-card p-6 bg-gradient-to-br from-primary to-primary/90 text-white shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Target size={16} className="text-accent" />
            Progression
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <p className="text-sm font-semibold opacity-80">Moyenne actuelle</p>
              <p className="text-xs font-bold">{average.toFixed(2)} / 20</p>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${(average / 20) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Par matière */}
      {(gradesData?.subjectSummaries.length ?? 0) > 0 && (
        <div className="polished-card p-6 bg-white">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-wider mb-4">Par matière</h3>
          <div className="space-y-3">
            {gradesData!.subjectSummaries.map((sub) => (
              <div key={sub.subjectId} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-main">{sub.subject}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: sub.average !== null ? `${(sub.average / 20) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-mono font-bold text-text-main w-10 text-right">
                    {sub.average !== null ? sub.average.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaView({ attendanceData, isLoading }: { attendanceData: StudentAttendanceData | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const summary = attendanceData?.summary;
  const records = attendanceData?.records ?? [];
  const absences = records.filter((r) => r.status === 'ABSENT' || r.status === 'LATE');

  return (
    <div className="space-y-8">
      {/* Résumé absences */}
      <div className="polished-card p-6 bg-white">
        <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-6">Absences & Retards</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-success/5 rounded-2xl border border-success/10">
            <p className="text-[9px] font-bold text-success uppercase tracking-widest mb-1">Présences</p>
            <p className="text-2xl font-mono font-extrabold text-success">{String(summary?.present ?? 0).padStart(2, '0')}</p>
          </div>
          <div className="p-4 bg-danger/5 rounded-2xl border border-danger/10">
            <p className="text-[9px] font-bold text-danger uppercase tracking-widest mb-1">Absences</p>
            <p className="text-2xl font-mono font-extrabold text-danger">{String(summary?.absent ?? 0).padStart(2, '0')}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Retards</p>
            <p className="text-2xl font-mono font-extrabold text-amber-600">{String(summary?.late ?? 0).padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      {/* Détail des absences / retards */}
      {absences.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-4">Détail</h3>
          <div className="space-y-3">
            {absences.map((record) => (
              <div
                key={record.id}
                className={`polished-card p-5 bg-white border-l-4 flex gap-5 ${record.status === 'ABSENT' ? 'border-l-danger' : 'border-l-amber-400'}`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-bg border border-border">
                  {record.status === 'ABSENT' ? (
                    <XCircle size={18} className="text-danger" />
                  ) : (
                    <Clock size={18} className="text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${record.status === 'ABSENT' ? 'bg-danger/10 text-danger' : 'bg-amber-100 text-amber-600'}`}>
                      {record.status === 'ABSENT' ? 'Absent' : `Retard${record.minutesLate ? ` (${record.minutesLate} min)` : ''}`}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text-main">{record.subject ?? 'Cours'}</p>
                  <p className="text-[10px] text-text-muted font-bold font-mono uppercase mt-1">{record.date ?? '—'}</p>
                  {record.reason && (
                    <p className="text-[10px] text-text-muted mt-1 italic">Motif : {record.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {absences.length === 0 && !isLoading && (
        <div className="polished-card p-8 text-center">
          <CheckCircle2 size={32} className="text-success mx-auto mb-3" />
          <p className="text-sm font-bold text-text-main">Aucune absence enregistrée</p>
        </div>
      )}
    </div>
  );
}

function IATutorView({ studentName, recommendations }: { studentName: string; recommendations: StudentRecommendation[] }) {
  const riskColors: Record<string, string> = {
    high: 'border-l-danger text-danger bg-danger/5',
    medium: 'border-l-amber-400 text-amber-700 bg-amber-50',
    low: 'border-l-success text-success bg-success/5',
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32" />
        <BrainCircuit size={40} className="text-white/30 mb-6" />
        <h3 className="text-2xl font-extrabold mb-3 tracking-tight">IA Tutor Pro</h3>
        <p className="text-sm text-indigo-100 font-medium leading-relaxed mb-4">
          Bonjour {studentName.split(' ')[0]} ! Voici vos recommandations pédagogiques personnalisées générées par votre enseignant.
        </p>
      </div>

      {/* Recommandations réelles */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">Recommandations de votre enseignant</h4>
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`polished-card p-5 bg-white border-l-4 ${riskColors[rec.riskLevel] ?? riskColors.medium}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit size={14} />
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  Risque {rec.riskLevel} • {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(rec.createdAt))}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-main mb-3">{rec.summary}</p>
              {rec.recommendations.length > 0 && (
                <ul className="space-y-1">
                  {rec.recommendations.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text-muted font-medium">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0 text-[8px] font-bold">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="polished-card p-8 text-center bg-white">
          <BrainCircuit size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm font-bold text-text-main mb-1">Aucune recommandation pour l'instant</p>
          <p className="text-xs text-text-muted">Votre enseignant n'a pas encore généré d'analyse IA pour votre profil.</p>
        </div>
      )}

      {/* Suggestions de questions */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">Posez une question à l'IA</h4>
        {[
          'Explique-moi les fonctions affines',
          'Génère un QCM en Français',
          'Aide-moi pour mon devoir de Physique',
        ].map((prompt, i) => (
          <button key={i} className="polished-card p-4 bg-white text-left text-sm font-semibold text-text-muted hover:text-primary hover:border-accent transition-all flex justify-between items-center group w-full">
            {prompt}
            <ChevronRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      <div className="fixed bottom-28 left-6 right-6 max-w-xl mx-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Demander à l'IA..."
            className="w-full pl-6 pr-14 py-5 bg-white border border-border rounded-full text-sm font-bold shadow-2xl shadow-indigo-100/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
