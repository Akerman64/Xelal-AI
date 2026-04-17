/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  BookOpen, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Plus, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  BrainCircuit,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Send,
  MoreVertical,
  ChevronRight,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_STUDENTS, SUBJECTS, MOCK_TEACHER, MOCK_CLASSES } from '../constants';
import { Student, Grade } from '../types';
import { analyzeStudentPerformance } from '../services/geminiService';

export default function DashboardEnseignant() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState('Terminale S1');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (student: Student) => {
    setIsAnalyzing(true);
    const analysis = await analyzeStudentPerformance(student);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
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
              <p className="text-sm font-bold truncate">{MOCK_TEACHER.name}</p>
              <p className="text-[10px] text-white/50 truncate">Mathématiques</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[72px] bg-white border-b border-border flex items-center justify-between px-8 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-text-main capitalize tracking-tight">{selectedTab}</h2>
            <p className="text-[11px] text-text-muted font-medium">Aujourd'hui, 14 Octobre 2023</p>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedTab === 'dashboard' && <TeacherDashboardView handleAnalyze={handleAnalyze} setSelectedStudent={setSelectedStudent} />}
              {selectedTab === 'classes' && <ClassesView setSelectedClass={setSelectedClass} />}
              {selectedTab === 'notes' && <GradebookView selectedClass={selectedClass} handleAnalyze={handleAnalyze} setSelectedStudent={setSelectedStudent} isAnalyzing={isAnalyzing} />}
              {selectedTab === 'absences' && <AttendanceView selectedClass={selectedClass} />}
              {selectedTab === 'messages' && <MessagesView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Detail Panel Overlay */}
      <AnimatePresence>
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
              </div>

              <div className="p-8 border-t border-border flex gap-4">
                <button className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm">
                   <Send size={18} />
                   Message via WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherDashboardView({ handleAnalyze, setSelectedStudent }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Moyenne Générale", value: "14.2/20", trend: "+0.5 ce mois", trendColor: "text-success", icon: BarChart3 },
            { label: "Taux d'Absence", value: "4.8%", trend: "Hausse (2nde B)", trendColor: "text-danger", icon: Calendar },
            { label: "Alertes IA At-Risk", value: "03", trend: "Action requise", trendColor: "text-text-muted", icon: BrainCircuit, valColor: "text-danger" },
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
                {MOCK_STUDENTS.map((student) => (
                  <tr key={student.id} className="hover:bg-bg/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-light text-primary rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-blue-100">
                          {student.name[0]}
                        </div>
                        <span className="font-semibold text-text-main">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-text-muted">3ème A</td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                         <span className="font-bold text-danger">08/20</span>
                         <span className="text-[9px] font-bold text-danger opacity-80">↘ -15%</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSelectedStudent(student); handleAnalyze(student); }}
                        className="text-[11px] font-bold text-accent hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Détails IA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        <div className="polished-card border-l-4 border-l-accent bg-primary-light p-5">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Recommandation IA</h4>
            <p className="text-xs text-text-main leading-relaxed font-semibold">
              La classe <b>3ème A</b> présente une baisse de performance. Suggéré : Module de remédiation en Trigonométrie.
            </p>
        </div>

        <div className="bg-[#e7f3ef] border border-[#c5d9d1] rounded-2xl p-5 shadow-sm">
          <h4 className="text-[10px] font-bold text-[#075e54] uppercase tracking-wider mb-4 border-b border-[#c5d9d1] pb-2">WhatsApp Direct</h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-xl text-[11px] leading-relaxed border-b-2 border-black/5 shadow-sm">
              <p className="font-bold text-[#075e54] mb-1">Mme Mensah</p>
              Besoin d'un rdv pour Koffi.
              <p className="text-[9px] text-[#999] text-right mt-1">10:42</p>
            </div>
            <div className="bg-[#dcf8c6] p-3 rounded-xl text-[11px] leading-relaxed border-b-2 border-black/5 shadow-sm">
              <p className="font-bold text-[#075e54] mb-1">Bot IA</p>
              Rdv possible Mardi 16h.
              <p className="text-[9px] text-[#999] text-right mt-1">10:43</p>
            </div>
          </div>
        </div>

        <div className="polished-card p-5">
          <h4 className="text-[10px] font-bold text-text-main uppercase tracking-widest mb-4">Prochains Cours</h4>
          <div className="space-y-4">
             {[
               { time: "08:00 - 10:00", subject: "Terminale S2" },
               { time: "10:30 - 12:30", subject: "3ème C (Maths)" },
             ].map((item, i) => (
               <div key={i} className="flex justify-between items-center text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                 <span className="text-text-muted font-bold font-mono">{item.time}</span>
                 <span className="font-bold text-text-main">{item.subject}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassesView({ setSelectedClass }: any) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_CLASSES.map((cls, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={cls.id} 
            className="polished-card p-6 flex flex-col group cursor-pointer hover:border-accent"
            onClick={() => setSelectedClass(cls.name)}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-primary-light text-primary rounded-2xl flex items-center justify-center font-bold text-lg">
                <Users size={24} />
              </div>
              <div className="flex flex-col items-end">
                 <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-full">
                    <CheckCircle2 size={12} /> Actif
                 </span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-1">{cls.name}</h3>
            <p className="text-xs text-text-muted font-bold mb-6">32 Élèves • Salle 204</p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
               <div>
                 <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Moyenne Classe</p>
                 <p className="text-lg font-bold text-text-main">13.8 <span className="text-[10px] text-success">↗</span></p>
               </div>
               <div>
                 <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Absences</p>
                 <p className="text-lg font-bold text-text-main">04 <span className="text-[10px] text-danger">↑</span></p>
               </div>
            </div>
          </motion.div>
        ))}
        <button className="polished-card p-6 border-dashed border-2 flex flex-col items-center justify-center gap-3 text-text-muted hover:text-accent hover:border-accent transition-all grayscale opacity-60 hover:grayscale-0 hover:opacity-100">
           <Plus size={32} />
           <span className="font-bold text-sm tracking-tight">Ajouter une classe</span>
        </button>
      </div>
    </div>
  );
}

function GradebookView({ selectedClass, setSelectedStudent, handleAnalyze, isAnalyzing }: any) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-text-main capitalize">Carnet : {selectedClass}</h3>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Mathématiques • Trimestre 1</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-bg transition-all">
            <Filter size={16} /> Filtres
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-100 hover:scale-[1.02] transition-all">
            <Plus size={16} /> Nouveau Devoir
          </button>
        </div>
      </div>

      <div className="polished-card overflow-hidden">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-bg/50 border-b border-border">
            <tr className="text-[10px] font-bold text-text-muted uppercase">
              <th className="px-6 py-4">Élève</th>
              <th className="px-6 py-4 text-center">Interrogation 1</th>
              <th className="px-6 py-4 text-center">Devoir 1</th>
              <th className="px-6 py-4 text-center">Moyenne</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_STUDENTS.map((student) => (
              <tr key={student.id} className="hover:bg-bg transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                      {student.name[0]}
                    </div>
                    <span className="font-bold text-text-main">{student.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-mono font-bold">14</td>
                <td className="px-6 py-4 text-center font-mono font-bold">12</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-lg font-mono font-extrabold text-sm ${student.grades[0].value >= 12 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    13.0
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                     <button 
                       onClick={() => { setSelectedStudent(student); handleAnalyze(student); }}
                       className="p-2 text-ai-glow hover:bg-ai-glow/10 rounded-xl transition-all"
                     >
                       <BrainCircuit size={18} />
                     </button>
                     <button className="p-2 text-text-muted hover:text-text-main hover:bg-bg rounded-xl transition-all">
                       <MoreVertical size={18} />
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceView({ selectedClass }: any) {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-text-main">Pointage : {selectedClass}</h3>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Séance : 08:00 - 10:00</p>
        </div>
        <div className="flex gap-4">
          <input 
            type="date" 
            value={currentDate} 
            onChange={(e) => setCurrentDate(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl text-xs font-bold outline-none"
          />
          <button className="flex items-center gap-2 px-6 py-2 bg-success text-white rounded-xl text-xs font-bold shadow-lg shadow-green-100 hover:scale-[1.02] transition-all">
            <CheckCircle2 size={16} /> Valider l'appel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_STUDENTS.map((student) => {
          const isAbsent = student.attendance.some(a => a.date === currentDate && a.status === 'absent');
          return (
            <div key={student.id} className={`polished-card p-5 flex items-center justify-between border-2 transition-all ${isAbsent ? 'border-danger/30 bg-danger/5' : 'border-transparent bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center font-bold text-text-muted border border-border">
                  {student.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main">{student.name}</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{isAbsent ? 'Absent' : 'Présent'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <button className={`p-2 rounded-xl transition-all ${!isAbsent ? 'bg-success text-white shadow-lg shadow-green-100' : 'bg-bg text-text-muted hover:bg-gray-200'}`}>
                   <UserCheck size={18} />
                 </button>
                 <button className={`p-2 rounded-xl transition-all ${isAbsent ? 'bg-danger text-white shadow-lg shadow-red-100' : 'bg-bg text-text-muted hover:bg-gray-200'}`}>
                   <UserX size={18} />
                 </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessagesView() {
  return (
    <div className="h-[600px] flex gap-6">
      <div className="w-80 polished-card flex flex-col shrink-0 overflow-hidden bg-white">
        <div className="p-5 border-b border-border">
          <h3 className="text-xs font-bold text-text-main uppercase tracking-widest mb-4">Messages Parents</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-xl text-[11px] font-medium outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
           {[
             { name: "Mme Diakité (Moussa)", msg: "Bonjour M. Sow, Moussa a été malade ce matin...", time: "08:45", unread: 1 },
             { name: "M. Ndiaye (Awa)", msg: "Merci pour l'alerte IA sur les maths.", time: "Hier", unread: 0 },
             { name: "Mme Ba (Kofi)", msg: "Est-il possible de se voir mardi ?", time: "Hier", unread: 0 },
           ].map((chat, i) => (
             <div key={i} className={`p-4 hover:bg-bg cursor-pointer transition-all ${chat.unread ? 'bg-primary-light/30 border-l-4 border-l-primary' : ''}`}>
               <div className="flex justify-between items-start mb-1">
                 <p className="text-xs font-bold text-text-main truncate">{chat.name}</p>
                 <span className="text-[9px] font-bold text-text-muted">{chat.time}</span>
               </div>
               <p className="text-[11px] text-text-muted truncate font-medium">{chat.msg}</p>
             </div>
           ))}
        </div>
      </div>
      
      <div className="flex-1 polished-card flex flex-col overflow-hidden bg-white">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold">MD</div>
             <div>
               <p className="text-xs font-bold text-text-main leading-none mb-1">Mme Diakité (Parent de Moussa)</p>
               <p className="text-[10px] text-success font-bold uppercase tracking-wider">En ligne</p>
             </div>
          </div>
          <div className="flex gap-4 text-text-muted">
             <Clock size={18} />
             <MoreVertical size={18} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 wa-container">
           <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none text-[11px] max-w-[70%] shadow-sm font-medium border border-border/50">
                Bonjour M. Sow, Moussa a été malade ce matin. Je vous envoie le certificat médical par l'élève demain. Merci de votre compréhension.
                <p className="text-[9px] text-text-muted mt-1 text-right">08:45</p>
              </div>
           </div>
           <div className="flex justify-end">
              <div className="bg-primary text-white p-3 rounded-2xl rounded-tr-none text-[11px] max-w-[70%] shadow-lg font-medium">
                Bonjour Mme Diakité. J'en prends note. J'ai partagé les cours de ce matin sur l'espace élève pour qu'il ne prenne pas de retard. Bon rétablissement à lui !
                <p className="text-[9px] text-white/60 mt-1 text-right">09:12</p>
              </div>
           </div>
        </div>
        
        <div className="p-4 border-t border-border bg-bg/20">
           <div className="flex gap-3">
              <input type="text" placeholder="Répondre..." className="flex-1 px-5 py-3 bg-white border border-border rounded-2xl text-[11px] font-medium focus:ring-1 focus:ring-accent outline-none shadow-sm" />
              <button className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-100 hover:scale-105 transition-all">
                <Send size={20} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
