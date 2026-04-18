/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCircle, 
  MessageCircle,
  School,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DashboardEnseignant from './components/DashboardEnseignant';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardEleve from './components/DashboardEleve';
import WhatsAppParent from './components/WhatsAppParent';
import AuthPortal from './components/AuthPortal';
import { authService } from './services/authService';
import { AuthSession, Role } from './types';

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [session, setSession] = useState<AuthSession | null>(() => authService.getStoredSession());

  const canAccessSelectedPortal = useMemo(() => {
    if (!role || !session) return false;
    return session.user.role === role;
  }, [role, session]);

  if (!role) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-5xl w-full"
        >
          <div className="text-center mb-16 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-accent rounded-full font-bold text-[10px] mb-8 border border-border uppercase tracking-[0.2em] shadow-sm">
               <School size={14} strokeWidth={3} />
               Xelal AI Enterprise v1.2
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-text-main mb-8 leading-[0.9]">
              Gestion Scolaire <br/>
              <span className="text-primary opacity-90">Intelligente.</span>
            </h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto font-medium leading-relaxed">
              Connectez parents, enseignants et élèves grâce à notre plateforme propulsée par l'IA. 
              Choisissez votre portail d'accès sécurisé pour commencer.
            </p>
          </div>

          {session && (
            <div className="mb-8 flex items-center justify-center">
              <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-main shadow-sm">
                <span className="font-semibold">
                  Session active:
                </span>{' '}
                {session.user.firstName} {session.user.lastName} ({session.user.role})
                <button
                  onClick={() => {
                    authService.clearSession();
                    setSession(null);
                  }}
                  className="ml-3 rounded-xl bg-bg px-3 py-2 text-xs font-bold text-text-main hover:bg-border/40"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'admin', label: 'Administration', desc: 'Gestion globale & Analytics IA', icon: ShieldCheck },
              { id: 'teacher', label: 'Enseignant', desc: 'Suivi pédagogique & Notes', icon: Users },
              { id: 'student', label: 'Élève', desc: 'Performance & Recommandations', icon: UserCircle },
              { id: 'parent', label: 'Parent', desc: 'Simulateur WhatsApp AI Parent', icon: MessageCircle, isSpecial: true },
            ].map((portail, i) => (
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={portail.id}
                onClick={() => setRole(portail.id as Role)}
                className={`group relative text-left p-8 rounded-[1.5rem] border border-border bg-white hover:border-accent hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-2 transition-all overflow-hidden active:scale-95 ${portail.isSpecial ? 'ring-2 ring-accent ring-offset-4 ring-offset-bg' : ''}`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                   <ArrowRight className="text-accent" size={20} />
                </div>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-8 transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm ${portail.isSpecial ? 'bg-accent text-white' : 'bg-bg text-primary border border-border'}`}>
                  <portail.icon size={26} strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-2 tracking-tight">{portail.label}</h3>
                <p className="text-xs text-text-muted font-semibold leading-relaxed mb-4">{portail.desc}</p>
                <div className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Accéder <ArrowRight size={12} />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <footer className="mt-24 flex flex-col items-center gap-4 text-[9px] font-bold uppercase tracking-[0.3em] text-text-muted opacity-60">
           <div className="h-px w-20 bg-border" />
           <p>Propulsé par Google Gemini Pro AI & Xelal.ai</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-white">
      {session && (
        <div className="fixed left-6 top-6 z-[110] flex items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Session</p>
            <p className="text-sm font-bold text-text-main">
              {session.user.firstName} {session.user.lastName}
            </p>
          </div>
          <button
            onClick={() => {
              authService.clearSession();
              setSession(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2 text-xs font-bold text-text-main hover:bg-border/40"
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      )}

      {/* Mini Role Switcher FAB for demo purposes */}
      <button 
        onClick={() => setRole(null)}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
      >
        <div className="relative">
          <School size={24} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900" />
        </div>
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${role}-${session?.user.role ?? 'guest'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="h-full w-full"
        >
          {role && role !== 'parent' && !canAccessSelectedPortal && (
            <AuthPortal
              role={role}
              onBack={() => setRole(null)}
              onAuthenticated={(nextSession) => setSession(nextSession)}
            />
          )}
          {role === 'teacher' && canAccessSelectedPortal && <DashboardEnseignant session={session || undefined} />}
          {role === 'admin' && canAccessSelectedPortal && <DashboardAdmin session={session || undefined} />}
          {role === 'student' && canAccessSelectedPortal && <DashboardEleve session={session || undefined} />}
          {role === 'parent' && (
            <div className="flex items-center justify-center h-full bg-gray-100 p-4">
              <div className="w-full max-w-md h-[800px] border-[12px] border-gray-800 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                <WhatsAppParent />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
