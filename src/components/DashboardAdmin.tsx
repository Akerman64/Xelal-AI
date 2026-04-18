/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  Filter,
  Download,
  CheckCircle2,
  MoreVertical,
  BookOpen,
  Trash2,
  GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthSession } from '../types';
import { adminService, type AdminAssignmentRecord, type AdminClassRecord, type AdminInvitationRecord, type AdminOverview, type AdminSubjectRecord, type AdminUserRecord } from '../services/adminService';

interface DashboardAdminProps {
  session?: AuthSession;
}

export default function DashboardAdmin({ session }: DashboardAdminProps) {
  const [selectedTab, setSelectedTab] = useState('établissement');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewVersion, setOverviewVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      if (!session) {
        setOverview(null);
        setOverviewError('Session admin absente.');
        return;
      }

      try {
        const data = await adminService.fetchOverview(session);
        if (!isMounted) return;
        setOverview(data);
        setOverviewError(null);
      } catch (error) {
        if (!isMounted) return;
        setOverviewError(error instanceof Error ? error.message : 'Vue d’ensemble indisponible.');
      }
    };

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, [session, overviewVersion]);

  const navItems = [
    { id: 'établissement', icon: Building2, label: 'Établissement' },
    { id: 'statistiques', icon: BarChart3, label: 'Statistiques' },
    { id: 'utilisateurs', icon: Users, label: 'Utilisateurs' },
    { id: 'affectations', icon: BookOpen, label: 'Affectations' },
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
                <p className="text-text-muted font-medium text-sm">
                  Gestion du système Xelal AI — {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}
                </p>
              </div>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-border text-text-main rounded-xl font-bold hover:bg-bg transition-all text-sm shadow-sm">
                   <Download size={18} /> Exporter
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all text-sm">
                  <Plus size={18} /> {selectedTab === 'utilisateurs' ? 'Nouvel Utilisateur' : selectedTab === 'affectations' ? 'Nouvelle Affectation' : 'Action Rapide'}
                </button>
              </div>
            </div>

            {/* Dynamic Content Switching */}
            {selectedTab === 'établissement' && <EstablishmentView overview={overview} error={overviewError} session={session} />}
            {selectedTab === 'statistiques' && <StatisticsView />}
            {selectedTab === 'utilisateurs' && (
              <UsersManagementView
                session={session}
                onDataChanged={() => setOverviewVersion((current) => current + 1)}
              />
            )}
            {selectedTab === 'affectations' && <AssignmentsView session={session} />}
            {selectedTab === 'rapports' && <ReportsView />}
            {selectedTab === 'alertes' && <AlertsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-views for better organization
function EstablishmentView({ overview, error, session }: { overview: AdminOverview | null; error: string | null; session?: AuthSession }) {
  const [subTab, setSubTab] = useState<'overview' | 'classes' | 'matieres'>('overview');
  const totalUsers = overview?.totals.users ?? 0;
  const activeUsers = overview?.totals.activeUsers ?? 0;
  const pendingUsers = overview?.totals.pendingUsers ?? 0;
  const suspendedUsers = overview?.totals.suspendedUsers ?? 0;

  return (
    <>
      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger mb-6">
          {error}
        </div>
      )}

      {/* Sub-tab switcher */}
      <div className="flex gap-2 mb-8">
        {([
          { id: 'overview', label: 'Vue globale' },
          { id: 'classes', label: 'Classes' },
          { id: 'matieres', label: 'Matières' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${subTab === t.id ? 'bg-primary text-white shadow-md' : 'bg-white border border-border text-text-muted hover:bg-bg'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Utilisateurs", value: String(totalUsers), icon: Users, color: "#3b82f6" },
              { label: "Comptes Actifs", value: String(activeUsers), icon: CheckCircle2, color: "#1e3a8a" },
              { label: "Invitations En Attente", value: String(overview?.totals.invitationsPending ?? 0), icon: ShieldAlert, color: "#ef4444" },
              { label: "Comptes Suspendus", value: String(suspendedUsers), icon: Building2, color: "#22c55e" },
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
                  <p className="text-xs font-bold leading-tight">Comptes en attente d'activation</p>
                  <p className="text-[10px] text-white/50">{pendingUsers} utilisateur(s) doivent encore activer leur accès</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-xs font-bold leading-tight">Parents à onboarder</p>
                  <p className="text-[10px] text-white/50">{overview?.byRole.parents ?? 0} compte(s) parent actuellement recensés</p>
                </div>
              </div>
              <button className="w-full py-4 bg-white text-primary font-bold rounded-xl text-sm shadow-xl">
                Rapport complet
              </button>
            </div>
          </div>

          {overview && (
            <div className="polished-card p-8 mt-8">
              <h3 className="text-lg font-bold text-text-main mb-6">Répartition des accès</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Admins', value: overview.byRole.admins, tone: 'bg-slate-100 text-slate-700' },
                  { label: 'Enseignants', value: overview.byRole.teachers, tone: 'bg-blue-100 text-blue-700' },
                  { label: 'Élèves', value: overview.byRole.students, tone: 'bg-green-100 text-green-700' },
                  { label: 'Parents', value: overview.byRole.parents, tone: 'bg-amber-100 text-amber-700' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border bg-white px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{item.label}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-3xl font-extrabold tracking-tight text-text-main">{item.value}</p>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${item.tone}`}>
                        Accès
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {subTab === 'classes' && <ClassesManagerView session={session} />}
      {subTab === 'matieres' && <SubjectsManagerView session={session} />}
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

function UsersManagementView({ session, onDataChanged }: { session?: AuthSession; onDataChanged?: () => void }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN'>('TEACHER');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!session) {
        setError('Session admin absente.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [nextUsers, nextInvitations] = await Promise.all([
          adminService.fetchUsers(session),
          adminService.fetchInvitations(session),
        ]);

        if (!isMounted) return;

        setUsers(nextUsers);
        setInvitations(nextInvitations.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
        setError(null);
      } catch (currentError) {
        if (!isMounted) return;
        setError(currentError instanceof Error ? currentError.message : 'Chargement impossible.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const roleMatches =
        filter === 'all' ||
        (filter === 'teacher' && user.role === 'teacher') ||
        (filter === 'student' && user.role === 'student') ||
        (filter === 'admin' && user.role === 'admin');
      const searchMatches =
        !query ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase());
      return roleMatches && searchMatches;
    });
  }, [filter, query, users]);

  const handleInvite = async () => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    try {
      const result = await adminService.inviteUser(session, {
        schoolId: 'school_xelal_1',
        firstName: inviteFirstName,
        lastName: inviteLastName,
        email: inviteEmail,
        phone: invitePhone || undefined,
        role: inviteRole,
      });

      setUsers((prev) => [...prev, result.user]);
      setInvitations((prev) => [result.invitation, ...prev]);
      setSuccess(`Invitation créée. Code provisoire: ${result.invitation.code}`);
      setInviteEmail('');
      setInvitePhone('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('TEACHER');
      onDataChanged?.();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Invitation impossible.");
    }
  };

  const handleStatusChange = async (userId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    try {
      const updated = await adminService.updateUserStatus(session, userId, status);
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
      setSuccess(`Statut mis à jour: ${updated.firstName} ${updated.lastName} -> ${updated.status}`);
      onDataChanged?.();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Mise à jour impossible.');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    try {
      const refreshed = await adminService.resendInvitation(session, invitationId);
      setInvitations((prev) =>
        prev.map((item) => (item.id === invitationId ? refreshed : item)).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      );
      setSuccess(`Invitation relancée. Nouveau code: ${refreshed.code}`);
      onDataChanged?.();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Relance impossible.");
    }
  };

  const handleExpireInvitation = async (invitationId: string) => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    try {
      const expired = await adminService.expireInvitation(session, invitationId);
      setInvitations((prev) => prev.map((item) => (item.id === invitationId ? expired : item)));
      setSuccess(`Invitation marquée comme expirée pour ${expired.email}.`);
      onDataChanged?.();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Mise à jour impossible.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <h3 className="text-sm font-bold text-text-main mb-4">Inviter un utilisateur</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder="Prénom" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
            <input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder="Nom" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@ecole.com" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none md:col-span-2" />
            <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+221 77 000 00 00" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN')} className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none">
              <option value="TEACHER">Enseignant</option>
              <option value="STUDENT">Élève</option>
              <option value="PARENT">Parent</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button onClick={handleInvite} className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100">
              Créer l'invitation
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <h3 className="text-sm font-bold text-text-main mb-4">Invitations récentes</h3>
          <div className="space-y-3">
            {invitations.slice(0, 4).map((invitation) => (
              <div key={invitation.id} className="rounded-2xl border border-border bg-bg/50 px-4 py-3">
                <p className="text-sm font-bold text-text-main">{invitation.email}</p>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-1">
                  {invitation.role} • {invitation.status}
                </p>
                <p className="mt-2 text-[10px] text-text-muted">
                  Expire le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}
                </p>
                <div className="mt-3 flex gap-2">
                  {invitation.status !== 'ACCEPTED' && (
                    <button onClick={() => handleResendInvitation(invitation.id)} className="rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Relancer
                    </button>
                  )}
                  {invitation.status === 'PENDING' && (
                    <button onClick={() => handleExpireInvitation(invitation.id)} className="rounded-xl bg-danger/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-danger">
                      Expirer
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!invitations.length && <p className="text-sm text-text-muted">Aucune invitation.</p>}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          {success}
        </div>
      )}

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
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Rechercher un utilisateur..." className="pl-10 pr-4 py-2 bg-bg border border-border rounded-xl text-xs w-64 focus:ring-1 focus:ring-accent outline-none" />
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
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-bg/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                      {user.firstName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-text-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : user.role === 'admin' ? 'bg-slate-100 text-slate-700' : 'bg-green-100 text-green-700'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-text-muted">
                  {user.phone || 'Non renseigné'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-success' : user.status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
                    <span className="text-xs font-semibold text-text-main">{user.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.status !== 'ACTIVE' && (
                      <button onClick={() => handleStatusChange(user.id, 'ACTIVE')} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-success/10 text-success">
                        Activer
                      </button>
                    )}
                    {user.status !== 'SUSPENDED' && (
                      <button onClick={() => handleStatusChange(user.id, 'SUSPENDED')} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-danger/10 text-danger">
                        Suspendre
                      </button>
                    )}
                    <button className="p-2 hover:bg-bg rounded-lg transition-colors text-text-muted">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredUsers.length && !isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassesManagerView({ session }: { session?: AuthSession }) {
  const [classes, setClasses] = useState<AdminClassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!session) { setIsLoading(false); return; }
      try {
        const data = await adminService.fetchClasses(session);
        if (isMounted) { setClasses(data); setError(null); }
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : 'Chargement impossible.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [session]);

  const handleCreate = async () => {
    if (!session || !newName.trim()) return;
    setIsSubmitting(true); setError(null); setSuccess(null);
    try {
      const created = await adminService.createClass(session, { schoolId: 'school_xelal_1', name: newName.trim(), level: newLevel.trim() || undefined });
      setClasses((prev) => [...prev, created]);
      setSuccess(`Classe "${created.name}" créée.`);
      setNewName(''); setNewLevel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (classId: string, className: string) => {
    if (!session) return;
    setError(null); setSuccess(null);
    try {
      await adminService.deleteClass(session, classId);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      setSuccess(`Classe "${className}" supprimée.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
        <h3 className="text-sm font-bold text-text-main mb-4">Créer une classe</h3>
        <div className="flex gap-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom (ex: Terminale S2)" className="flex-1 px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
          <input value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="Niveau (optionnel)" className="w-48 px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
          <button onClick={handleCreate} disabled={!newName.trim() || isSubmitting} className="px-5 py-3 bg-accent text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {isSubmitting ? '...' : 'Créer'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">{error}</div>}
      {success && <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-semibold text-success">{success}</div>}

      <div className="polished-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg/50 border-b border-border">
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Classe</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Niveau</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Élèves</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Enseignants</th>
              <th className="px-6 py-4 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-bg/20 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-text-main">{cls.name}</td>
                <td className="px-6 py-4 text-xs text-text-muted font-medium">{cls.level || '—'}</td>
                <td className="px-6 py-4 text-sm font-mono font-bold text-text-main">{cls.studentsCount}</td>
                <td className="px-6 py-4 text-sm font-mono font-bold text-text-main">{cls.teachersCount}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(cls.id, cls.name)} className="p-2 hover:bg-danger/10 rounded-xl transition-colors text-danger/50 hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && classes.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">Aucune classe créée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectsManagerView({ session }: { session?: AuthSession }) {
  const [subjects, setSubjects] = useState<AdminSubjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCoef, setNewCoef] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!session) { setIsLoading(false); return; }
      try {
        const data = await adminService.fetchSubjects(session);
        if (isMounted) { setSubjects(data); setError(null); }
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : 'Chargement impossible.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [session]);

  const handleCreate = async () => {
    if (!session || !newName.trim()) return;
    setIsSubmitting(true); setError(null); setSuccess(null);
    try {
      const coef = parseFloat(newCoef);
      const created = await adminService.createSubject(session, {
        schoolId: 'school_xelal_1',
        name: newName.trim(),
        coefficientDefault: Number.isFinite(coef) && coef > 0 ? coef : 1,
      });
      setSubjects((prev) => [...prev, created]);
      setSuccess(`Matière "${created.name}" créée (coef. ${created.coefficientDefault}).`);
      setNewName(''); setNewCoef('1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (subjectId: string, name: string) => {
    if (!session) return;
    setError(null); setSuccess(null);
    try {
      await adminService.deleteSubject(session, subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setSuccess(`Matière "${name}" supprimée.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
        <h3 className="text-sm font-bold text-text-main mb-4">Créer une matière</h3>
        <div className="flex gap-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom (ex: SVT)" className="flex-1 px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
          <input value={newCoef} onChange={(e) => setNewCoef(e.target.value)} type="number" min="0.5" max="10" step="0.5" placeholder="Coef." className="w-28 px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
          <button onClick={handleCreate} disabled={!newName.trim() || isSubmitting} className="px-5 py-3 bg-accent text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {isSubmitting ? '...' : 'Créer'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">{error}</div>}
      {success && <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-semibold text-success">{success}</div>}

      <div className="polished-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg/50 border-b border-border">
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Matière</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Coefficient par défaut</th>
              <th className="px-6 py-4 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subjects.map((s) => (
              <tr key={s.id} className="hover:bg-bg/20 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-text-main">{s.name}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">{s.coefficientDefault}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(s.id, s.name)} className="p-2 hover:bg-danger/10 rounded-xl transition-colors text-danger/50 hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && subjects.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-text-muted">Aucune matière créée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignmentsView({ session }: { session?: AuthSession }) {
  const [assignments, setAssignments] = useState<AdminAssignmentRecord[]>([]);
  const [classes, setClasses] = useState<AdminClassRecord[]>([]);
  const [subjects, setSubjects] = useState<AdminSubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selTeacher, setSelTeacher] = useState('');
  const [selClass, setSelClass] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!session) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const [nextAssignments, nextClasses, nextSubjects, nextUsers] = await Promise.all([
          adminService.fetchAssignments(session),
          adminService.fetchClasses(session),
          adminService.fetchSubjects(session),
          adminService.fetchUsers(session),
        ]);
        if (!isMounted) return;
        setAssignments(nextAssignments);
        setClasses(nextClasses);
        setSubjects(nextSubjects);
        setTeachers(nextUsers.filter((u) => u.role === 'teacher'));
        setError(null);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Chargement impossible.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [session]);

  const handleCreate = async () => {
    if (!session || !selTeacher || !selClass || !selSubject) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await adminService.createAssignment(session, {
        teacherId: selTeacher,
        classId: selClass,
        subjectId: selSubject,
      });
      setAssignments((prev) => [...prev, created]);
      setSuccess(`Affectation créée : ${created.teacherName} → ${created.className} / ${created.subjectName}`);
      setSelTeacher('');
      setSelClass('');
      setSelSubject('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Affectation impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!session) return;
    setError(null);
    setSuccess(null);
    try {
      await adminService.deleteAssignment(session, assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      setSuccess('Affectation supprimée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  };

  // Group assignments by teacher for the summary view
  const byTeacher = useMemo(() => {
    const map = new Map<string, { teacherName: string; items: AdminAssignmentRecord[] }>();
    for (const a of assignments) {
      const existing = map.get(a.teacherId) ?? { teacherName: a.teacherName, items: [] };
      existing.items.push(a);
      map.set(a.teacherId, existing);
    }
    return Array.from(map.values()).sort((x, y) => x.teacherName.localeCompare(y.teacherName));
  }, [assignments]);

  return (
    <div className="space-y-8">
      {/* Formulaire d'ajout */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-sm font-bold text-text-main mb-5">Affecter un enseignant</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selTeacher}
            onChange={(e) => setSelTeacher(e.target.value)}
            className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none"
          >
            <option value="">— Enseignant —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
          <select
            value={selClass}
            onChange={(e) => setSelClass(e.target.value)}
            className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none"
          >
            <option value="">— Classe —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={selSubject}
            onChange={(e) => setSelSubject(e.target.value)}
            className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none"
          >
            <option value="">— Matière —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (coef. {s.coefficientDefault})</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!selTeacher || !selClass || !selSubject || isSubmitting}
            className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Création...' : 'Affecter'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          {success}
        </div>
      )}

      {/* Vue résumé par enseignant */}
      {!isLoading && byTeacher.length > 0 && (
        <div className="space-y-4">
          {byTeacher.map(({ teacherName, items }) => (
            <div key={teacherName} className="polished-card overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-bg/50 border-b border-border">
                <div className="w-9 h-9 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main">{teacherName}</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                    {items.length} affectation{items.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Classe</th>
                    <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Matière</th>
                    <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((a) => (
                    <tr key={a.id} className="hover:bg-bg/20 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-sm font-semibold text-text-main">{a.className}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {a.subjectName}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-2 hover:bg-danger/10 rounded-xl transition-colors text-danger/60 hover:text-danger"
                          title="Supprimer cette affectation"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {!isLoading && assignments.length === 0 && (
        <div className="polished-card p-12 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-bg rounded-2xl flex items-center justify-center border border-border">
            <BookOpen size={24} className="text-text-muted" />
          </div>
          <p className="text-sm font-bold text-text-main">Aucune affectation pour le moment</p>
          <p className="text-xs text-text-muted max-w-xs">
            Utilisez le formulaire ci-dessus pour affecter un enseignant à une classe et une matière.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="polished-card p-12 flex items-center justify-center">
          <p className="text-sm text-text-muted">Chargement des affectations...</p>
        </div>
      )}
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
