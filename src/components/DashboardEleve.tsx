/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_STUDENTS } from '../constants';

export default function DashboardEleve() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const student = MOCK_STUDENTS[0];

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Accueil' },
    { id: 'notes', icon: TrendingUp, label: 'Notes' },
    { id: 'cours', icon: GraduationCap, label: 'Cours' },
    { id: 'agenda', icon: CalendarDays, label: 'Agenda' },
    { id: 'ia', icon: BrainCircuit, label: 'IA Tutor' },
  ];

  return (
    <div className="min-h-screen bg-bg pb-24 font-sans">
      <header className="bg-white px-8 py-6 border-b border-border flex justify-between items-center sticky top-0 z-10 shadow-sm shadow-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold ring-2 ring-blue-50 leading-none">M.D.</div>
          <div>
            <h1 className="font-bold text-text-main text-sm tracking-tight capitalize">{selectedTab === 'dashboard' ? `Bonjour, ${student.name.split(' ')[0]} !` : selectedTab}</h1>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Session Étudiant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 bg-bg border border-border rounded-xl hover:bg-gray-100 transition-all text-text-muted">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
          </button>
          <div className="w-10 h-10 bg-primary-light rounded-2xl border-2 border-white shadow-sm flex items-center justify-center text-primary font-bold">
            {student.name[0]}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedTab === 'dashboard' && <HomeView student={student} />}
            {selectedTab === 'notes' && <GradesView student={student} />}
            {selectedTab === 'cours' && <CoursesView />}
            {selectedTab === 'agenda' && <AgendaView />}
            {selectedTab === 'ia' && <IATutorView />}
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

function HomeView({ student }: any) {
  return (
    <div className="space-y-8">
      {/* Weekly Progress Card */}
      <div className="bg-primary p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[60px] rounded-full -mr-24 -mt-24" />
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Moyenne Générale</p>
            <h2 className="text-5xl font-mono font-bold tracking-tighter italic">13.4 <span className="text-lg opacity-40">/20</span></h2>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl ring-1 ring-white/20 backdrop-blur-md">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold bg-white/10 py-2 px-4 rounded-xl inline-flex self-start border border-white/10">
          <Zap size={16} className="text-amber-400" />
          <span>+1.5pts cette semaine !</span>
        </div>
      </div>

      {/* IA Tips */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Conseils Personnalisés IA</h3>
        </div>
        <div className="polished-card p-6 border-l-4 border-l-ai-glow bg-white">
          <div className="flex gap-4">
             <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
               <BrainCircuit size={24} />
             </div>
             <div>
               <p className="text-sm font-bold text-text-main mb-1">Focus en Mathématiques</p>
               <p className="text-xs text-text-muted leading-relaxed font-medium italic">
                 "Tu as eu 8/20 au dernier contrôle. Révise les <b>équations du second degré</b> pour le test de demain."
               </p>
             </div>
          </div>
        </div>
      </section>

      {/* Subjects Grid (Small preview) */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Mes Matières</h3>
          <button className="text-[10px] font-bold text-accent uppercase tracking-widest">Tout voir</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "Mathématiques", score: 11.5, icon: GraduationCap },
            { name: "Français", score: 14.0, icon: BookMarked },
          ].map((sub, i) => (
            <div key={i} className="polished-card p-5 bg-white">
              <sub.icon size={20} className="text-primary mb-4" />
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">{sub.name}</p>
              <p className="text-2xl font-mono font-extrabold text-text-main tracking-tighter">{sub.score.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Immediate Tasks */}
      <section>
        <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-4">À faire aujourd'hui</h3>
        <div className="space-y-3">
           <div className="polished-card p-4 flex items-center gap-4 bg-white border-l-4 border-l-amber-400">
             <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
               <Clock size={18} />
             </div>
             <div className="flex-1">
               <p className="text-sm font-bold text-text-main">Dissertation Français</p>
               <p className="text-[10px] text-text-muted font-bold uppercase">Échéance : 18:00</p>
             </div>
             <ChevronRight size={18} className="text-text-muted" />
           </div>
        </div>
      </section>
    </div>
  );
}

function GradesView({ student }: any) {
  return (
    <div className="space-y-6">
      <div className="polished-card p-6 bg-white overflow-hidden">
        <h3 className="text-sm font-bold text-text-main uppercase tracking-wider mb-6">Relevé de Notes</h3>
        <div className="space-y-4">
          {student.grades.map((grade: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border">
               <div className="flex items-center gap-4">
                 <div className={`p-2 rounded-lg ${grade.value >= 12 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                   {grade.value >= 12 ? <CheckCircle2 size={16} /> : <TrendingUp size={16} className="rotate-180" />}
                 </div>
                 <div>
                   <p className="text-sm font-bold text-text-main">{grade.subject}</p>
                   <p className="text-[10px] text-text-muted font-bold font-mono">{grade.date}</p>
                 </div>
               </div>
               <div className="text-right">
                  <p className="text-lg font-mono font-extrabold text-text-main">{grade.value}<span className="text-xs opacity-40">/20</span></p>
                  <p className="text-[9px] font-bold text-text-muted uppercase">Coef. {grade.coefficient}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="polished-card p-6 bg-gradient-to-br from-primary to-primary/90 text-white shadow-xl">
        <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Target size={16} className="text-accent" />
          Objectif de fin d'année
        </h4>
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <p className="text-sm font-semibold opacity-80">Atteindre la mention Bien (14+)</p>
            <p className="text-xs font-bold">13.4 / 14.0</p>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-accent" style={{ width: '92%' }} />
          </div>
          <p className="text-[11px] font-medium leading-relaxed opacity-70">
            Augmentez votre moyenne de 0.6 points pour décrocher la mention !
          </p>
        </div>
      </div>
    </div>
  );
}

function CoursesView() {
  const courses = [
    { title: "Dérivées et Continuité", subject: "Mathématiques", chapter: "Chapitre 3", progress: 85 },
    { title: "Romantisme XIXe", subject: "Français", chapter: "Chapitre 1", progress: 40 },
    { title: "Optique Géométrique", subject: "Physique", chapter: "Chapitre 2", progress: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="relative mb-8">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input 
          type="text" 
          placeholder="Rechercher un cours ou un sujet..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-border rounded-[1.5rem] text-sm font-medium focus:ring-1 focus:ring-accent outline-none shadow-sm shadow-blue-50"
        />
      </div>

      <div className="space-y-4">
        {courses.map((course, i) => (
          <div key={i} className="polished-card p-6 bg-white hover:border-accent group cursor-pointer transition-all">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{course.subject}</p>
                  <h4 className="text-base font-bold text-text-main group-hover:text-primary transition-colors">{course.title}</h4>
               </div>
               <div className="p-2 bg-bg rounded-lg">
                 <BookOpen size={18} className="text-text-muted" />
               </div>
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
                 <span>Progression</span>
                 <span>{course.progress}%</span>
               </div>
               <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                 <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${course.progress}%` }} />
               </div>
            </div>
            
            <button className="w-full mt-6 py-3 bg-bg group-hover:bg-primary group-hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
              Continuer le cours <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaView() {
  const events = [
    { title: "Dissertation Français", type: "Devoir", date: "Demain, 08:00", urgent: true },
    { title: "Contrôle SVT", type: "Examen", date: "22 Avr, 10:30", urgent: false },
    { title: "Rendu Projet Histoire", type: "Projet", date: "25 Avr, 12:00", urgent: false },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-6">Événements à venir</h3>
        <div className="space-y-3">
          {events.map((event, i) => (
            <div key={i} className={`polished-card p-5 bg-white border-l-4 flex gap-5 ${event.urgent ? 'border-l-danger bg-danger/[0.02]' : 'border-l-accent'}`}>
               <div className="flex flex-col items-center justify-center min-w-[60px] h-14 bg-bg rounded-2xl border border-border">
                  <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-tighter">{event.date.split(' ')[0]}</span>
                  <span className="text-sm font-extrabold text-text-main">{event.date.split(' ')[1]}</span>
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${event.urgent ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                      {event.type}
                    </span>
                    {event.urgent && <span className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse" />}
                  </div>
                  <p className="text-sm font-bold text-text-main">{event.title}</p>
                  <p className="text-[10px] text-text-muted font-bold font-mono uppercase mt-1">🕒 {event.date.includes(',') ? event.date.split(',')[1] : event.date.split(' ')[1]}</p>
               </div>
            </div>
          ))}
        </div>
      </section>

      <div className="polished-card p-6 bg-white">
        <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-6">Absences & Retards</h3>
        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-danger/5 rounded-2xl border border-danger/10">
              <p className="text-[9px] font-bold text-danger uppercase tracking-widest mb-1">Absences Justice.</p>
              <p className="text-2xl font-mono font-extrabold text-danger">01</p>
           </div>
           <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Retards</p>
              <p className="text-2xl font-mono font-extrabold text-amber-600">03</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function IATutorView() {
  return (
    <div className="space-y-8 h-full">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32" />
        <BrainCircuit size={40} className="text-white/30 mb-6" />
        <h3 className="text-2xl font-extrabold mb-3 tracking-tight">IA Tutor Pro</h3>
        <p className="text-sm text-indigo-100 font-medium leading-relaxed mb-8">
          Je suis votre assistant pédagogique personnel. Posez-moi une question sur vos cours ou demandez des exercices d'entraînement !
        </p>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/10">MATHS</span>
           <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/10">SVT</span>
           <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/10">PHYSIQUE</span>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">Suggestions de discussion</h4>
        <div className="grid gap-3">
          {[
            "Explique-moi les fonctions affines",
            "Génère un QCM en Français",
            "Aide-moi pour mon projet d'Histoire",
          ].map((prompt, i) => (
            <button key={i} className="polished-card p-4 bg-white text-left text-sm font-semibold text-text-muted hover:text-primary hover:border-accent transition-all flex justify-between items-center group">
              {prompt}
              <ChevronRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-28 left-6 right-6">
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
