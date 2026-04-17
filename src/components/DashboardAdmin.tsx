/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Building2, 
  ShieldAlert, 
  ArrowUpRight, 
  FileText,
  Plus,
  TrendingUp,
  Search,
  Settings,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_STUDENTS, MOCK_ADMIN, MOCK_TEACHER, MOCK_CLASSES } from '../constants';

export default function DashboardAdmin() {
  const [selectedTab, setSelectedTab] = useState('établissement');

  const navItems = [
    { id: 'établissement', icon: Building2, label: 'Établissement' },
    { id: 'statistiques', icon: BarChart3, label: 'Statistiques' },
    { id: 'utilisateurs', icon: Users, label: 'Utilisateurs' },
    { id: 'rapports', icon: FileText, label: 'Rapports' },
    { id: 'alertes', icon: ShieldAlert, label: 'Alertes' },
  ];

  return (
    <div className="flex h-screen bg-bg font-sans">
      {/* Sidebar - Compact for Admin */}
      <aside className="w-20 bg-primary flex flex-col items-center py-8 gap-10 shrink-0 border-r border-white/10 shadow-2xl">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white font-bold text-xl ring-1 ring-white/20">E.</div>
        <nav className="flex-1 flex flex-col gap-6">
          {navItems.map((item, i) => (
            <button 
              key={item.id} 
              onClick={() => setSelectedTab(item.id)}
              className={`p-4 rounded-2xl transition-all relative group ${selectedTab === item.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon size={22} strokeWidth={selectedTab === item.id ? 2.5 : 2} />
              {selectedTab === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded-full" 
                />
              )}
              <div className="absolute left-full ml-4 px-2 py-1 bg-ink text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-bold">
                {item.label}
              </div>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header Content */}
            <div className="flex justify-between items-end mb-12">
              <div>
                <h1 className="text-4xl font-extrabold text-text-main mb-2 tracking-tighter capitalize">{selectedTab}.</h1>
                <p className="text-text-muted font-medium text-sm">Gestion du système Xelal AI — Octobre 2023</p>
              </div>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-border text-text-main rounded-xl font-bold hover:bg-bg transition-all text-sm shadow-sm">
                   <Download size={18} /> Exporter
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all text-sm">
                  <Plus size={18} /> {selectedTab === 'utilisateurs' ? 'Nouvel Utilisateur' : 'Action Rapide'}
                </button>
              </div>
            </div>

            {/* Dynamic Content Switching */}
            {selectedTab === 'établissement' && <EstablishmentView />}
            {selectedTab === 'statistiques' && <StatisticsView />}
            {selectedTab === 'utilisateurs' && <UsersManagementView />}
            {selectedTab === 'rapports' && <ReportsView />}
            {selectedTab === 'alertes' && <AlertsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-views for better organization
function EstablishmentView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Effectif Total", value: "1,248", icon: Users, color: "#3b82f6" },
          { label: "Moyenne École", value: "11.2", icon: BarChart3, color: "#1e3a8a" },
          { label: "Absentéisme", value: "8.5%", icon: ShieldAlert, color: "#ef4444" },
          { label: "Cours du Jour", value: "42", icon: Building2, color: "#22c55e" },
        ].map((stat, i) => (
          <div key={i} className="polished-card p-6">
            <div className="flex justify-between items-start mb-6">
               <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg border border-border" style={{ color: stat.color }}>
                 <stat.icon size={20} />
               </div>
               <ArrowUpRight className="text-text-muted opacity-50" size={18} />
            </div>
            <h3 className="text-3xl font-bold text-text-main mb-1 tracking-tight">{stat.value}</h3>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 polished-card p-8 bg-white">
           <h3 className="text-lg font-bold text-text-main mb-10">Performance par Classe</h3>
           <div className="space-y-8">
              {['Terminale S1', 'Terminale L1', 'Seconde S1', 'Troisième A'].map((cls, i) => (
                <div key={i} className="flex items-center gap-8">
                  <span className="w-28 text-xs font-bold text-text-main truncate text-left">{cls}</span>
                  <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${85 - i * 15}%`, opacity: 1 - i * 0.15 }} />
                  </div>
                  <span className="w-14 font-mono font-bold text-right text-sm text-text-main">{(14.5 - i * 1.5).toFixed(1)}</span>
                </div>
              ))}
           </div>
         </div>
         <div className="bg-primary rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold mb-8">Alertes Critiques</h3>
            <div className="space-y-4 mb-10">
               <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                 <p className="text-xs font-bold leading-tight">Baisse globale (Maths)</p>
                 <p className="text-[10px] text-white/50">-1.2pts par rapport au T1</p>
               </div>
               <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                 <p className="text-xs font-bold leading-tight">Taux d'absence Seconde S2</p>
                 <p className="text-[10px] text-white/50">15% de hausse</p>
               </div>
            </div>
            <button className="w-full py-4 bg-white text-primary font-bold rounded-xl text-sm shadow-xl">
              Rapport complet
            </button>
         </div>
      </div>
    </>
  );
}

function StatisticsView() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="polished-card p-8">
          <h3 className="text-lg font-bold text-text-main mb-6">Évolution des Résultats</h3>
          <div className="h-64 flex items-end gap-2 px-4 border-b border-border pb-4">
             {[45, 60, 55, 75, 85, 80, 95].map((h, i) => (
               <div key={i} className="flex-1 bg-accent rounded-t-lg transition-all hover:bg-primary cursor-pointer relative group" style={{ height: `${h}%` }}>
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                   Trim {i+1}: {h}%
                 </div>
               </div>
             ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold text-text-muted px-4">
            <span>SEPTIEMBRE</span>
            <span>OCTOBRE</span>
            <span>NOVEMBRE</span>
            <span>DÉCEMBRE</span>
          </div>
        </div>

        <div className="polished-card p-8">
          <h3 className="text-lg font-bold text-text-main mb-6">Répartition par Matière</h3>
          <div className="space-y-6">
            {['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie'].map((sub, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{sub}</span>
                  <span className="text-accent">{12 + i * 1.5}/20</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${60 + i * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="polished-card p-8">
        <h3 className="text-lg font-bold text-text-main mb-6">Analyses Prédictives IA</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl border-l-[6px] border-l-primary">
              <h4 className="text-sm font-bold text-primary mb-2">Taux de Réussite Bac</h4>
              <p className="text-3xl font-extrabold text-primary mb-2">84.2%</p>
              <p className="text-xs text-text-muted font-medium">Projection basée sur les notes actuelles du T1.</p>
           </div>
           <div className="bg-danger/5 border border-danger/10 p-6 rounded-2xl border-l-[6px] border-l-danger">
              <h4 className="text-sm font-bold text-danger mb-2">Décrochage Scolaire</h4>
              <p className="text-3xl font-extrabold text-danger mb-2">3.1%</p>
              <p className="text-xs text-text-muted font-medium">Baisse de 0.5% par rapport à l'année dernière.</p>
           </div>
           <div className="bg-success/5 border border-success/10 p-6 rounded-2xl border-l-[6px] border-l-success">
              <h4 className="text-sm font-bold text-success mb-2">Performance Professeurs</h4>
              <p className="text-3xl font-extrabold text-success mb-2">92%</p>
              <p className="text-xs text-text-muted font-medium">Score de satisfaction et progression des élèves.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function UsersManagementView() {
  const [filter, setFilter] = useState('all');
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex gap-4">
           {['all', 'teacher', 'student', 'admin'].map((f) => (
             <button 
               key={f}
               onClick={() => setFilter(f)}
               className={`px-4 py-2 text-xs font-bold rounded-xl transition-all capitalize ${filter === f ? 'bg-primary text-white' : 'text-text-muted hover:bg-bg'}`}
             >
               {f === 'all' ? 'Tous' : f === 'teacher' ? 'Enseignants' : f === 'student' ? 'Élèves' : 'Staff Admin'}
             </button>
           ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Rechercher un utilisateur..." className="pl-10 pr-4 py-2 bg-bg border border-border rounded-xl text-xs w-64 focus:ring-1 focus:ring-accent outline-none" />
        </div>
      </div>

      <div className="polished-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg/50 border-b border-border">
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...MOCK_STUDENTS, MOCK_TEACHER].map((user, i) => (
              <tr key={user.id} className="hover:bg-bg/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">{user.name}</p>
                      <p className="text-[10px] text-text-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-text-muted">
                  +221 77 450 12 34
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs font-semibold text-text-main">Actif</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-bg rounded-lg transition-colors text-text-muted">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Rapport de Fréquentation", desc: "Analyse mensuelle des absences par classe.", date: "Généré il y a 2h", icon: FileText },
          { title: "Performance Scolaire", desc: "Comparatif des moyennes trimestrielles.", date: "Généré hier", icon: TrendingUp },
          { title: "Audit de Sécurité", desc: "Logs de connexion et accès admin.", date: "12 Oct 2023", icon: FileText },
        ].map((report, i) => (
          <div key={i} className="polished-card p-6 flex flex-col justify-between">
             <div>
                <div className="p-3 bg-bg rounded-2xl w-fit mb-4 border border-border">
                  <report.icon size={20} className="text-primary" />
                </div>
                <h4 className="text-sm font-bold text-text-main mb-2 tracking-tight">{report.title}</h4>
                <p className="text-xs text-text-muted font-medium mb-6 leading-relaxed">{report.desc}</p>
             </div>
             <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{report.date}</span>
                <button className="text-xs font-bold text-accent hover:underline">Voir</button>
             </div>
          </div>
        ))}
      </div>

      <div className="polished-card p-8 bg-gradient-to-br from-primary to-primary/90 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full" />
        <div className="relative z-10 max-w-2xl">
           <h3 className="text-2xl font-extrabold mb-4 tracking-tight">Générer un Rapport d'Analyse IA Global</h3>
           <p className="text-sm text-white/70 mb-8 leading-relaxed font-medium">
             Obtenez une analyse complète de la santé pédagogique de votre établissement. Notre IA croise les notes, 
             les absences et les feedbacks pour proposer des axes d'amélioration stratégiques.
           </p>
           <button className="px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-2xl hover:bg-blue-50 transition-all text-sm">
             Lancer l'IA Analytics
           </button>
        </div>
      </div>
    </div>
  );
}

function AlertsView() {
  return (
    <div className="space-y-4 max-w-4xl">
      {[
        { type: 'critical', title: "Espace stockage saturé (Rapports)", time: "Il y a 10 min", desc: "Le serveur de stockage des rapports PDF atteint 95% de sa capacité. Une purge est recommandée." },
        { type: 'warning', title: "Baisse de performance (Maths - 3ème A)", time: "Il y a 1h", desc: "Une baisse moyenne de 12% est détectée sur le dernier contrôle de Mathématiques pour la classe de 3ème A." },
        { type: 'info', title: "Mise à jour système effectuée", time: "Hier, 22:00", desc: "La version v1.2.4 a été déployée avec succès. Nouveaux filtres disponibles dans le module Utilisateurs." },
        { type: 'warning', title: "Taux d'absentéisme élevé (2nde L)", time: "14 Oct 2023", desc: "Le taux d'absence a dépassé le seuil de 15% pour la classe de 2nde L cette semaine." },
      ].map((alert, i) => (
        <div key={i} className={`p-6 rounded-2xl border flex gap-4 transition-all hover:translate-x-1 cursor-pointer ${
          alert.type === 'critical' ? 'bg-danger/5 border-danger/10 text-danger' : 
          alert.type === 'warning' ? 'bg-warning/5 border-warning/10 text-warning' : 
          'bg-primary/5 border-primary/10 text-primary'
        }`}>
          <div className="flex-shrink-0 mt-1">
             {alert.type === 'critical' ? <ShieldAlert size={20} /> : alert.type === 'warning' ? <Filter size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-sm font-bold tracking-tight">{alert.title}</h4>
              <span className="text-[10px] font-bold uppercase opacity-60">{alert.time}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed font-medium">{alert.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
