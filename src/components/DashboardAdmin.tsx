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
  Sparkles,
  X,
  ChevronRight,
  Mail,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthSession } from '../types';
import { adminService, type AdminAssignmentRecord, type AdminClassRecord, type AdminClassReport, type AdminInvitationRecord, type AdminOverview, type AdminParentStudentLinkRecord, type AdminRecommendationStats, type AdminSubjectRecord, type AdminTimeSlotRecord, type AdminUserRecord, type WeekDay } from '../services/adminService';

interface DashboardAdminProps {
  session?: AuthSession;
}

interface HeaderActionState {
  exportLabel?: string;
  quickActionLabel?: string;
  onExport?: () => void;
  onQuickAction?: () => void;
}

const downloadJson = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function DashboardAdmin({ session }: DashboardAdminProps) {
  const [selectedTab, setSelectedTab] = useState('établissement');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewVersion, setOverviewVersion] = useState(0);
  const [headerActions, setHeaderActions] = useState<HeaderActionState>({});

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

  useEffect(() => {
    if (selectedTab !== 'établissement') {
      setHeaderActions({});
    }
  }, [selectedTab]);

  const navItems = [
    { id: 'établissement', icon: Building2, label: 'Établissement' },
    { id: 'statistiques', icon: BarChart3, label: 'Statistiques' },
    { id: 'utilisateurs', icon: Users, label: 'Utilisateurs' },
    { id: 'affectations', icon: BookOpen, label: 'Affectations' },
    { id: 'emploi-du-temps', icon: Clock, label: 'Emploi du temps' },
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
                <button
                  onClick={() => headerActions.onExport?.()}
                  disabled={!headerActions.onExport}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-border text-text-main rounded-xl font-bold hover:bg-bg transition-all text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <Download size={18} /> {headerActions.exportLabel ?? 'Exporter'}
                </button>
                <button
                  onClick={() => headerActions.onQuickAction?.()}
                  disabled={!headerActions.onQuickAction}
                  className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} /> {headerActions.quickActionLabel ?? (selectedTab === 'utilisateurs' ? 'Nouvel Utilisateur' : selectedTab === 'affectations' ? 'Nouvelle Affectation' : 'Action Rapide')}
                </button>
              </div>
            </div>

            {/* Dynamic Content Switching */}
            {selectedTab === 'établissement' && (
              <EstablishmentView
                overview={overview}
                error={overviewError}
                session={session}
                onRegisterHeaderActions={setHeaderActions}
                onNavigateTab={setSelectedTab}
              />
            )}
            {selectedTab === 'statistiques' && (
              <StatisticsView
                session={session}
                onRegisterHeaderActions={setHeaderActions}
                onNavigateTab={setSelectedTab}
              />
            )}
            {selectedTab === 'utilisateurs' && (
              <UsersManagementView
                session={session}
                onDataChanged={() => setOverviewVersion((current) => current + 1)}
                onRegisterHeaderActions={setHeaderActions}
              />
            )}
            {selectedTab === 'affectations' && (
              <AssignmentsView session={session} onRegisterHeaderActions={setHeaderActions} />
            )}
            {selectedTab === 'emploi-du-temps' && (
              <ScheduleView session={session} onRegisterHeaderActions={setHeaderActions} />
            )}
            {selectedTab === 'rapports' && (
              <ReportsView
                session={session}
                onRegisterHeaderActions={setHeaderActions}
              />
            )}
            {selectedTab === 'alertes' && (
              <AlertsView
                session={session}
                onRegisterHeaderActions={setHeaderActions}
                onNavigateTab={setSelectedTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-views for better organization
function EstablishmentView({
  overview,
  error,
  session,
  onRegisterHeaderActions,
  onNavigateTab,
}: {
  overview: AdminOverview | null;
  error: string | null;
  session?: AuthSession;
  onRegisterHeaderActions?: (actions: HeaderActionState) => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const [subTab, setSubTab] = useState<'overview' | 'classes' | 'matieres'>('overview');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [classes, setClasses] = useState<AdminClassRecord[]>([]);
  const [recommendationStats, setRecommendationStats] = useState<AdminRecommendationStats | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [detailPanel, setDetailPanel] = useState<{
    title: string;
    subtitle?: string;
    rows: Array<{ title: string; meta?: string; badge?: string }>;
  } | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const totalUsers = overview?.totals.users ?? 0;
  const activeUsers = overview?.totals.activeUsers ?? 0;
  const pendingUsers = overview?.totals.pendingUsers ?? 0;
  const suspendedUsers = overview?.totals.suspendedUsers ?? 0;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!session) return;

      try {
        const [nextUsers, nextInvitations, nextClasses, nextRecommendationStats] = await Promise.all([
          adminService.fetchUsers(session),
          adminService.fetchInvitations(session),
          adminService.fetchClasses(session),
          adminService.fetchRecommendationStats(session),
        ]);

        if (!isMounted) return;
        setUsers(nextUsers);
        setInvitations(nextInvitations);
        setClasses(nextClasses);
        setRecommendationStats(nextRecommendationStats);
        setLocalError(null);
      } catch (currentError) {
        if (!isMounted) return;
        setLocalError(currentError instanceof Error ? currentError.message : 'Chargement établissement indisponible.');
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const exportSnapshot = useMemo(
    () => ({
      exportedAt: new Date().toISOString(),
      overview,
      users,
      invitations,
      classes,
      recommendationStats,
    }),
    [overview, users, invitations, classes, recommendationStats],
  );

  useEffect(() => {
    onRegisterHeaderActions?.({
      exportLabel: 'Exporter établissement',
      quickActionLabel: 'Action Rapide',
      onExport: () => {
        downloadJson(`xelal-etablissement-${new Date().toISOString().slice(0, 10)}.json`, exportSnapshot);
      },
      onQuickAction: () => setQuickActionsOpen(true),
    });

    return () => onRegisterHeaderActions?.({});
  }, [exportSnapshot, onRegisterHeaderActions]);

  const classInsights = useMemo(() => {
    const topClassesMap = new Map((recommendationStats?.topClasses ?? []).map((item) => [item.classId, item]));
    return classes.map((item) => {
      const aiInfo = topClassesMap.get(item.id);
      return {
        ...item,
        aiRecommendations: aiInfo?.recommendationsCount ?? 0,
        averageRiskScore: aiInfo?.averageRiskScore ?? 0,
      };
    });
  }, [classes, recommendationStats]);

  const openUserPanel = (title: string, subtitle: string, predicate: (user: AdminUserRecord) => boolean) => {
    const rows = users
      .filter(predicate)
      .map((user) => ({
        title: `${user.firstName} ${user.lastName}`,
        meta: `${user.email} • ${user.role} • ${user.status}`,
        badge: user.status,
      }));

    setDetailPanel({
      title,
      subtitle,
      rows,
    });
  };

  const openInvitationPanel = () => {
    const rows = invitations
      .filter((item) => item.status === 'PENDING')
      .map((item) => ({
        title: item.email,
        meta: `${item.role} • expire le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(item.expiresAt))}`,
        badge: item.status,
      }));

    setDetailPanel({
      title: 'Invitations en attente',
      subtitle: 'Suivi des accès non encore activés',
      rows,
    });
  };

  const openRolePanel = (label: string, role: AdminUserRecord['role']) => {
    openUserPanel(`Répartition ${label}`, `Utilisateurs avec le rôle ${label.toLowerCase()}`, (user) => user.role === role);
  };

  const openReportPanel = () => {
    setDetailPanel({
      title: 'Rapport complet établissement',
      subtitle: 'Vue consolidée de la base école',
      rows: [
        { title: `${totalUsers} utilisateurs`, meta: `${activeUsers} actifs • ${suspendedUsers} suspendus` },
        { title: `${classes.length} classes`, meta: `${classes.reduce((sum, item) => sum + item.studentsCount, 0)} élèves inscrits` },
        { title: `${invitations.filter((item) => item.status === 'PENDING').length} invitations en attente`, meta: `${overview?.byRole.parents ?? 0} comptes parent recensés` },
        { title: `${recommendationStats?.totals.total ?? 0} recommandations IA`, meta: `${recommendationStats?.totals.followThroughRate ?? 0}% avec suivi WhatsApp` },
      ],
    });
  };

  const metricCards = [
    {
      label: 'Utilisateurs',
      value: String(totalUsers),
      icon: Users,
      color: '#3b82f6',
      onClick: () => openUserPanel('Tous les utilisateurs', 'Liste complète des comptes de l’établissement', () => true),
    },
    {
      label: 'Comptes Actifs',
      value: String(activeUsers),
      icon: CheckCircle2,
      color: '#1e3a8a',
      onClick: () => openUserPanel('Comptes actifs', 'Accès opérationnels actuellement', (user) => user.status === 'ACTIVE'),
    },
    {
      label: 'Invitations En Attente',
      value: String(overview?.totals.invitationsPending ?? 0),
      icon: Mail,
      color: '#ef4444',
      onClick: openInvitationPanel,
    },
    {
      label: 'Comptes Suspendus',
      value: String(suspendedUsers),
      icon: Building2,
      color: '#22c55e',
      onClick: () => openUserPanel('Comptes suspendus', 'Utilisateurs temporairement bloqués', (user) => user.status === 'SUSPENDED'),
    },
  ];

  return (
    <>
      {(error || localError) && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger mb-6">
          {error || localError}
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
            {metricCards.map((stat) => (
              <button key={stat.label} type="button" onClick={stat.onClick} className="polished-card p-6 text-left transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg border border-border" style={{ color: stat.color }}>
                    <stat.icon size={20} />
                  </div>
                  <ArrowUpRight className="text-text-muted opacity-50" size={18} />
                </div>
                <h3 className="text-3xl font-bold text-text-main mb-1 tracking-tight">{stat.value}</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{stat.label}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 polished-card p-8 bg-white">
              <h3 className="text-lg font-bold text-text-main mb-10">Vue réelle des classes</h3>
              <div className="space-y-8">
                {(classInsights.length ? classInsights : [{ id: 'empty', name: 'Aucune classe', studentsCount: 0, teachersCount: 0, aiRecommendations: 0, averageRiskScore: 0 }]).map((cls) => (
                  <div key={cls.id} className="flex items-center gap-8">
                    <span className="w-28 text-xs font-bold text-text-main truncate text-left">{cls.name}</span>
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(8, cls.studentsCount * 10))}%` }} />
                    </div>
                    <span className="w-24 font-mono font-bold text-right text-sm text-text-main">
                      {cls.studentsCount} él. / {cls.teachersCount} prof.
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-text-muted">
                Les barres reflètent l’effectif réel de chaque classe. Le suivi IA est alimenté par les recommandations enregistrées.
              </p>
            </div>
            <div className="bg-primary rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
              <h3 className="text-lg font-bold mb-8">Alertes Critiques</h3>
              <div className="space-y-4 mb-10">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-xs font-bold leading-tight">Comptes en attente d'activation</p>
                  <p className="text-[10px] text-white/50">{pendingUsers} utilisateur(s) doivent encore activer leur accès</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-xs font-bold leading-tight">Suivi IA établissement</p>
                  <p className="text-[10px] text-white/50">{recommendationStats?.totals.total ?? 0} recommandation(s), {recommendationStats?.totals.followThroughRate ?? 0}% avec envoi WhatsApp</p>
                </div>
              </div>
              <button onClick={openReportPanel} className="w-full py-4 bg-white text-primary font-bold rounded-xl text-sm shadow-xl">
                Rapport complet
              </button>
            </div>
          </div>

          {overview && (
            <div className="polished-card p-8 mt-8">
              <h3 className="text-lg font-bold text-text-main mb-6">Répartition des accès</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Admins', value: overview.byRole.admins, tone: 'bg-slate-100 text-slate-700', role: 'admin' as const },
                  { label: 'Enseignants', value: overview.byRole.teachers, tone: 'bg-blue-100 text-blue-700', role: 'teacher' as const },
                  { label: 'Élèves', value: overview.byRole.students, tone: 'bg-green-100 text-green-700', role: 'student' as const },
                  { label: 'Parents', value: overview.byRole.parents, tone: 'bg-amber-100 text-amber-700', role: 'parent' as const },
                ].map((item) => (
                  <button key={item.label} type="button" onClick={() => openRolePanel(item.label, item.role)} className="rounded-2xl border border-border bg-white px-5 py-4 text-left transition-transform hover:-translate-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{item.label}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-3xl font-extrabold tracking-tight text-text-main">{item.value}</p>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${item.tone}`}>
                        Accès
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {detailPanel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm px-6 py-10"
              >
                <div className="mx-auto max-w-3xl rounded-[2rem] bg-white shadow-2xl border border-border overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b border-border px-8 py-6">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight text-text-main">{detailPanel.title}</h3>
                      {detailPanel.subtitle && <p className="mt-2 text-sm text-text-muted">{detailPanel.subtitle}</p>}
                    </div>
                    <button onClick={() => setDetailPanel(null)} className="rounded-xl border border-border p-2 text-text-muted hover:bg-bg">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto px-8 py-6 space-y-3">
                    {detailPanel.rows.length ? detailPanel.rows.map((row, index) => (
                      <div key={`${row.title}-${index}`} className="rounded-2xl border border-border bg-bg px-4 py-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-text-main">{row.title}</p>
                          {row.meta && <p className="mt-1 text-xs text-text-muted">{row.meta}</p>}
                        </div>
                        {row.badge && (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">
                            {row.badge}
                          </span>
                        )}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-border bg-bg px-4 py-6 text-sm text-text-muted">
                        Aucune donnée à afficher pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {quickActionsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm px-6 py-10"
              >
                <div className="mx-auto max-w-xl rounded-[2rem] bg-white shadow-2xl border border-border overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b border-border px-8 py-6">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight text-text-main">Actions rapides</h3>
                      <p className="mt-2 text-sm text-text-muted">Raccourcis administrateur les plus utiles depuis la vue établissement.</p>
                    </div>
                    <button onClick={() => setQuickActionsOpen(false)} className="rounded-xl border border-border p-2 text-text-muted hover:bg-bg">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="px-8 py-6 space-y-3">
                    {[
                      { label: 'Gérer les utilisateurs', description: 'Inviter, activer ou suspendre des comptes.', tab: 'utilisateurs' },
                      { label: 'Gérer les affectations', description: 'Affecter les enseignants aux classes et matières.', tab: 'affectations' },
                      { label: 'Voir les classes', description: 'Revenir sur le sous-onglet classes de l’établissement.', action: () => setSubTab('classes') },
                      { label: 'Voir les matières', description: 'Revenir sur le sous-onglet matières de l’établissement.', action: () => setSubTab('matieres') },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          if (item.tab) {
                            onNavigateTab?.(item.tab);
                            return;
                          }
                          item.action?.();
                        }}
                        className="w-full rounded-2xl border border-border bg-bg px-4 py-4 text-left hover:bg-white transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-text-main">{item.label}</p>
                            <p className="mt-1 text-xs text-text-muted">{item.description}</p>
                          </div>
                          <ChevronRight size={18} className="text-text-muted" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {subTab === 'classes' && <ClassesManagerView session={session} />}
      {subTab === 'matieres' && <SubjectsManagerView session={session} />}
    </>
  );
}

function StatisticsView({
  session,
  onRegisterHeaderActions,
  onNavigateTab,
}: {
  session?: AuthSession;
  onRegisterHeaderActions?: (actions: HeaderActionState) => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const [stats, setStats] = useState<AdminRecommendationStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!session) {
        setError('Session admin absente.');
        return;
      }

      try {
        const nextStats = await adminService.fetchRecommendationStats(session);
        if (!isMounted) return;
        setStats(nextStats);
        setError(null);
      } catch (currentError) {
        if (!isMounted) return;
        setError(currentError instanceof Error ? currentError.message : 'Statistiques indisponibles.');
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const timeline = stats?.timeline ?? [];
  const maxTimeline = Math.max(...timeline.map((item) => item.total), 1);
  const riskValues = stats
    ? [
        { label: 'Critique', value: stats.byRiskLevel.critical, color: 'bg-danger', text: 'text-danger' },
        { label: 'Élevé', value: stats.byRiskLevel.high, color: 'bg-warning', text: 'text-warning' },
        { label: 'Moyen', value: stats.byRiskLevel.medium, color: 'bg-accent', text: 'text-accent' },
        { label: 'Faible', value: stats.byRiskLevel.low, color: 'bg-success', text: 'text-success' },
      ]
    : [];
  const maxRiskValue = Math.max(...riskValues.map((item) => item.value), 1);

  useEffect(() => {
    onRegisterHeaderActions?.({
      exportLabel: 'Exporter statistiques',
      quickActionLabel: 'Voir les rapports',
      onExport: () => downloadJson(`xelal-statistiques-${new Date().toISOString().slice(0, 10)}.json`, stats),
      onQuickAction: () => onNavigateTab?.('rapports'),
    });

    return () => onRegisterHeaderActions?.({});
  }, [stats, onRegisterHeaderActions, onNavigateTab]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Recommandations', value: stats.totals.total, tone: 'text-primary' },
            { label: 'WhatsApp envoyés', value: stats.totals.whatsappSent, tone: 'text-success' },
            { label: 'Taux de suivi', value: `${stats.totals.followThroughRate}%`, tone: 'text-accent' },
            { label: 'Rapports de classe', value: stats.totals.classRecommendations, tone: 'text-warning' },
          ].map((item) => (
            <div key={item.label} className="polished-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{item.label}</p>
              <p className={`mt-4 text-3xl font-extrabold tracking-tight ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="polished-card p-8">
          <h3 className="text-lg font-bold text-text-main mb-6">Évolution des recommandations</h3>
          <div className="h-64 flex items-end gap-2 px-4 border-b border-border pb-4">
             {(timeline.length ? timeline : [{ date: new Date().toISOString().slice(0, 10), total: 0, whatsappSent: 0 }]).map((item) => (
               <div key={item.date} className="flex-1 bg-accent rounded-t-lg transition-all hover:bg-primary cursor-pointer relative group" style={{ height: `${Math.max((item.total / maxTimeline) * 100, 8)}%` }}>
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                   {item.date}: {item.total} reco / {item.whatsappSent} envoyés
                 </div>
               </div>
             ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold text-text-muted px-4">
            {(timeline.length ? timeline : [{ date: new Date().toISOString().slice(0, 10), total: 0, whatsappSent: 0 }]).slice(0, 5).map((item) => (
              <span key={item.date}>{item.date.slice(5)}</span>
            ))}
          </div>
        </div>

        <div className="polished-card p-8">
          <h3 className="text-lg font-bold text-text-main mb-6">Répartition par niveau de risque</h3>
          <div className="space-y-6">
            {riskValues.map((sub) => (
              <div key={sub.label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{sub.label}</span>
                  <span className={sub.text}>{sub.value}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className={`h-full ${sub.color}`} style={{ width: `${Math.max((sub.value / maxRiskValue) * 100, 8)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="polished-card p-8">
        <h3 className="text-lg font-bold text-text-main mb-6">Classes les plus suivies par l’IA</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(stats?.topClasses.length ? stats.topClasses : [
            { classId: 'placeholder', className: 'Aucune donnée pour le moment', recommendationsCount: 0, averageRiskScore: 0 },
          ]).map((item) => (
           <div key={item.classId} className="bg-primary/5 border border-primary/10 p-6 rounded-2xl border-l-[6px] border-l-primary">
              <h4 className="text-sm font-bold text-primary mb-2">{item.className}</h4>
              <p className="text-3xl font-extrabold text-primary mb-2">{item.recommendationsCount}</p>
              <p className="text-xs text-text-muted font-medium">
                Score de risque moyen: {item.averageRiskScore}
              </p>
           </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersManagementView({
  session,
  onDataChanged,
  onRegisterHeaderActions,
}: {
  session?: AuthSession;
  onDataChanged?: () => void;
  onRegisterHeaderActions?: (actions: HeaderActionState) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [parentLinks, setParentLinks] = useState<AdminParentStudentLinkRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN'>('TEACHER');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<'MOTHER' | 'FATHER' | 'TUTOR'>('MOTHER');
  const [isPrimaryLink, setIsPrimaryLink] = useState(true);

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
        const [nextUsers, nextInvitations, nextLinks] = await Promise.all([
          adminService.fetchUsers(session),
          adminService.fetchInvitations(session),
          adminService.fetchParentStudentLinks(session),
        ]);

        if (!isMounted) return;

        setUsers(nextUsers);
        setInvitations(nextInvitations.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
        setParentLinks(nextLinks);
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

  useEffect(() => {
    onRegisterHeaderActions?.({
      exportLabel: 'Exporter utilisateurs',
      quickActionLabel: 'Nouvel utilisateur',
      onExport: () => downloadJson(`xelal-utilisateurs-${new Date().toISOString().slice(0, 10)}.json`, { users, invitations, parentLinks }),
      onQuickAction: () => {
        const section = document.getElementById('admin-users-invite');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    return () => onRegisterHeaderActions?.({});
  }, [users, invitations, parentLinks, onRegisterHeaderActions]);

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

  const parentUsers = useMemo(() => users.filter((user) => user.role === 'parent'), [users]);
  const studentUsers = useMemo(() => users.filter((user) => user.role === 'student'), [users]);
  const parentFamilies = useMemo(() => {
    return parentUsers.map((parent) => ({
      parent,
      children: parentLinks.filter((link) => link.parentUserId === parent.id),
    }));
  }, [parentUsers, parentLinks]);

  const handleInvite = async () => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    try {
      if (inviteRole === 'PARENT') {
        const result = await adminService.registerParent(session, {
          schoolId: 'school_xelal_1',
          firstName: inviteFirstName,
          lastName: inviteLastName,
          email: inviteEmail || undefined,
          phone: invitePhone,
        });

        setUsers((prev) => [...prev, result.user]);
        setSuccess(`Parent enregistré: ${result.user.firstName} ${result.user.lastName}. Rattachez-le maintenant à un élève pour activer WhatsApp.`);
        setInviteEmail('');
        setInvitePhone('');
        setInviteFirstName('');
        setInviteLastName('');
        setInviteRole('TEACHER');
        onDataChanged?.();
        return;
      }

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

  const handleCreateParentLink = async () => {
    if (!session || !selectedParentId || !selectedStudentId) return;
    setError(null);
    setSuccess(null);

    try {
      const created = await adminService.createParentStudentLink(session, {
        parentUserId: selectedParentId,
        studentId: selectedStudentId,
        relationship: selectedRelationship,
        isPrimary: isPrimaryLink,
      });
      setParentLinks((prev) => {
        const next = isPrimaryLink
          ? prev.map((item) =>
              item.studentId === created.studentId ? { ...item, isPrimary: false } : item,
            )
          : prev;
        return [...next, created];
      });
      setSuccess(
        created.welcomeDelivery?.delivered
          ? `Lien créé : ${created.parentName} → ${created.studentName}. Le parent a reçu un message WhatsApp de bienvenue.`
          : `Lien créé : ${created.parentName} → ${created.studentName}. ${created.parentPhone ? "Le parent n'a pas encore reçu de confirmation WhatsApp." : "Ajoutez un numéro WhatsApp pour permettre les messages automatiques."}`,
      );
      setSelectedStudentId('');
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Liaison impossible.');
    }
  };

  const handleDeleteParentLink = async (linkId: string) => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    try {
      await adminService.deleteParentStudentLink(session, linkId);
      setParentLinks((prev) => prev.filter((item) => item.id !== linkId));
      setSuccess('Lien parent-élève supprimé.');
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div id="admin-users-invite" className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <h3 className="text-sm font-bold text-text-main mb-4">
            {inviteRole === 'PARENT' ? 'Enregistrer un parent WhatsApp' : 'Inviter un utilisateur'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder="Prénom" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
            <input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder="Nom" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={inviteRole === 'PARENT' ? 'Email (optionnel)' : 'email@ecole.com'} className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none md:col-span-2" />
            <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+221 77 000 00 00" className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN')} className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none">
              <option value="TEACHER">Enseignant</option>
              <option value="STUDENT">Élève</option>
              <option value="PARENT">Parent</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button onClick={handleInvite} className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100">
              {inviteRole === 'PARENT' ? 'Enregistrer le parent' : "Créer l'invitation"}
            </button>
          </div>
          {inviteRole === 'PARENT' && (
            <p className="mt-4 text-xs text-text-muted">
              Le parent n’a pas besoin d’un dashboard pour l’instant. Son numéro WhatsApp est enregistré ici, puis l’école le relie à un ou plusieurs élèves pour activer les messages automatiques.
            </p>
          )}
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <h3 className="text-sm font-bold text-text-main mb-4">Lier un parent à un ou plusieurs élèves</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none">
              <option value="">— Parent —</option>
              {parentUsers.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.firstName} {parent.lastName} {parent.phone ? `• ${parent.phone}` : ''}
                </option>
              ))}
            </select>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none">
              <option value="">— Élève —</option>
              {studentUsers.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
            <select value={selectedRelationship} onChange={(e) => setSelectedRelationship(e.target.value as 'MOTHER' | 'FATHER' | 'TUTOR')} className="px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none">
              <option value="MOTHER">Mère</option>
              <option value="FATHER">Père</option>
              <option value="TUTOR">Tuteur</option>
            </select>
            <label className="flex items-center gap-3 px-4 py-3 bg-bg border border-border rounded-xl text-sm font-medium text-text-main">
              <input type="checkbox" checked={isPrimaryLink} onChange={(e) => setIsPrimaryLink(e.target.checked)} />
              Contact principal pour cet élève
            </label>
            <button onClick={handleCreateParentLink} className="px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-sm md:col-span-2">
              Ajouter le parent à l’élève
            </button>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Une fois le lien créé, le parent pourra recevoir les messages WhatsApp et poser des questions sur ses enfants liés.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <h3 className="text-sm font-bold text-text-main mb-4">Familles enregistrées</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {parentFamilies.map(({ parent, children }) => (
              <div key={parent.id} className="rounded-2xl border border-border bg-bg/50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-text-main">{parent.firstName} {parent.lastName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-1">
                      {parent.phone || 'Téléphone manquant'}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">
                    {children.length} enfant(s)
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {children.length ? children.map((link) => (
                    <div key={link.id} className="rounded-xl border border-border bg-white px-3 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-main">{link.studentName}</p>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted">
                          {link.relationshipLabel} {link.isPrimary ? '• principal' : ''}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteParentLink(link.id)} className="rounded-xl bg-danger/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-danger">
                        Retirer
                      </button>
                    </div>
                  )) : (
                    <p className="text-xs text-text-muted">Aucun élève lié pour l’instant.</p>
                  )}
                </div>
              </div>
            ))}
            {!parentFamilies.length && <p className="text-sm text-text-muted">Aucun parent enregistré.</p>}
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

function AssignmentsView({
  session,
  onRegisterHeaderActions,
}: {
  session?: AuthSession;
  onRegisterHeaderActions?: (actions: HeaderActionState) => void;
}) {
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

  useEffect(() => {
    onRegisterHeaderActions?.({
      exportLabel: 'Exporter affectations',
      quickActionLabel: 'Nouvelle affectation',
      onExport: () => downloadJson(`xelal-affectations-${new Date().toISOString().slice(0, 10)}.json`, { assignments, classes, subjects, teachers }),
      onQuickAction: () => {
        const section = document.getElementById('admin-assignments-form');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    return () => onRegisterHeaderActions?.({});
  }, [assignments, classes, subjects, teachers, onRegisterHeaderActions]);

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
      <div id="admin-assignments-form" className="bg-white p-6 rounded-2xl border border-border shadow-sm">
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

function ReportsView({
  session,
  onRegisterHeaderActions,
}: {
  session?: AuthSession;
  onRegisterHeaderActions?: (actions: HeaderActionState) => void;
}) {
  const [classes, setClasses] = useState<AdminClassRecord[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [stats, setStats] = useState<AdminRecommendationStats | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [report, setReport] = useState<AdminClassReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadClasses = async () => {
      if (!session) {
        setError('Session admin absente.');
        return;
      }

      try {
        const [nextClasses, nextOverview, nextStats] = await Promise.all([
          adminService.fetchClasses(session),
          adminService.fetchOverview(session),
          adminService.fetchRecommendationStats(session),
        ]);
        if (!isMounted) return;
        setClasses(nextClasses);
        setOverview(nextOverview);
        setStats(nextStats);
        setSelectedClassId((current) => current || nextClasses[0]?.id || '');
        setError(null);
      } catch (currentError) {
        if (!isMounted) return;
        setError(currentError instanceof Error ? currentError.message : 'Classes indisponibles.');
      }
    };

    void loadClasses();
    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    onRegisterHeaderActions?.({
      exportLabel: 'Exporter rapports',
      quickActionLabel: 'Générer un rapport',
      onExport: () =>
        downloadJson(`xelal-rapports-${new Date().toISOString().slice(0, 10)}.json`, {
          overview,
          stats,
          classes,
          currentReport: report,
        }),
      onQuickAction: () => {
        if (!isGenerating && selectedClassId) {
          void handleGenerate();
        }
      },
    });

    return () => onRegisterHeaderActions?.({});
  }, [overview, stats, classes, report, selectedClassId, isGenerating, onRegisterHeaderActions]);

  const handleGenerate = async () => {
    if (!session || !selectedClassId) return;
    setIsGenerating(true);
    setError(null);

    try {
      const nextReport = await adminService.generateClassReport(session, selectedClassId);
      setReport(nextReport);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Rapport indisponible.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Suivi des invitations',
            desc: `${overview?.totals.invitationsPending ?? 0} invitation(s) en attente d’activation.`,
            date: `${overview?.totals.pendingUsers ?? 0} compte(s) encore en attente`,
            icon: Mail,
          },
          {
            title: 'Couverture IA',
            desc: `${stats?.totals.total ?? 0} recommandation(s) générées dans l’école.`,
            date: `${stats?.totals.followThroughRate ?? 0}% avec envoi WhatsApp`,
            icon: TrendingUp,
          },
          {
            title: 'Vue des classes',
            desc: `${classes.length} classe(s) suivies dans la base active.`,
            date: `${classes.reduce((sum, item) => sum + item.studentsCount, 0)} élève(s) recensés`,
            icon: FileText,
          },
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
                <button onClick={handleGenerate} className="text-xs font-bold text-accent hover:underline">Voir</button>
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
           <div className="flex flex-col md:flex-row gap-4">
             <select
               value={selectedClassId}
               onChange={(event) => setSelectedClassId(event.target.value)}
               className="px-4 py-3 rounded-xl text-sm text-primary font-semibold bg-white/95"
             >
               <option value="">Sélectionner une classe</option>
               {classes.map((item) => (
                 <option key={item.id} value={item.id}>
                   {item.name}
                 </option>
               ))}
             </select>
             <button
               onClick={handleGenerate}
               disabled={!selectedClassId || isGenerating}
               className="px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-2xl hover:bg-blue-50 transition-all text-sm disabled:opacity-60"
             >
               {isGenerating ? 'Génération...' : "Lancer l'IA Analytics"}
             </button>
           </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {report && (
        <div className="polished-card p-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                <Sparkles size={16} />
                Rapport IA classe
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-text-main">{report.className}</h3>
              <p className="text-sm text-text-muted mt-2">{report.summary}</p>
            </div>
            <span className="rounded-full bg-primary/10 text-primary px-4 py-2 text-xs font-bold uppercase">
              Risque {report.riskLevel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Moyenne classe', value: report.classSignals.classAverage ?? 'N/A' },
              { label: 'Taux absence', value: `${report.classSignals.absenceRate}%` },
              { label: 'Élèves à risque', value: report.classSignals.studentsAtRisk },
              { label: 'Score IA', value: report.classSignals.riskScore },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-white px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{item.label}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-text-main">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text-main">Élèves à suivre en priorité</h4>
              {report.studentsAtRisk.map((student) => (
                <div key={student.studentId} className="rounded-2xl border border-border bg-bg px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-text-main">{student.studentName}</p>
                      <p className="text-xs text-text-muted">
                        Moyenne {student.averageGrade ?? 'N/A'} / Absences {student.absenceRate}% / Evolution {student.gradeEvolution}
                      </p>
                    </div>
                    <span className="rounded-full bg-danger/10 px-3 py-1 text-[10px] font-bold uppercase text-danger">
                      {student.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text-main">Recommandations admin</h4>
              {report.recommendations.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-4 text-sm text-text-main">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsView({
  session,
  onRegisterHeaderActions,
  onNavigateTab,
}: {
  session?: AuthSession;
  onRegisterHeaderActions?: (actions: HeaderActionState) => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const [alerts, setAlerts] = useState<Array<{ type: 'critical' | 'warning' | 'info'; title: string; time: string; desc: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!session) {
        setError('Session admin absente.');
        return;
      }

      try {
        const [overview, classes, stats] = await Promise.all([
          adminService.fetchOverview(session),
          adminService.fetchClasses(session),
          adminService.fetchRecommendationStats(session),
        ]);

        if (!isMounted) return;

        const nextAlerts: Array<{ type: 'critical' | 'warning' | 'info'; title: string; time: string; desc: string }> = [];

        if (overview.totals.invitationsPending > 0) {
          nextAlerts.push({
            type: 'critical',
            title: 'Invitations en attente d’activation',
            time: 'Mise à jour immédiate',
            desc: `${overview.totals.invitationsPending} invitation(s) sont encore en attente. Un suivi admin est recommandé.`,
          });
        }

        if (stats.totals.followThroughRate < 50 && stats.totals.total > 0) {
          nextAlerts.push({
            type: 'warning',
            title: 'Faible taux de suivi des recommandations',
            time: 'Calculé aujourd’hui',
            desc: `Seulement ${stats.totals.followThroughRate}% des recommandations ont donné lieu à un envoi WhatsApp.`,
          });
        }

        const underAssignedClasses = classes.filter((item) => item.teachersCount === 0);
        if (underAssignedClasses.length > 0) {
          nextAlerts.push({
            type: 'warning',
            title: 'Classes sans enseignant affecté',
            time: 'Contrôle base de données',
            desc: `${underAssignedClasses.length} classe(s) n’ont encore aucun enseignant rattaché.`,
          });
        }

        nextAlerts.push({
          type: 'info',
          title: 'Synchronisation établissement disponible',
          time: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
          desc: `${classes.length} classes et ${overview.totals.users} comptes sont actuellement chargés depuis la base active.`,
        });

        setAlerts(nextAlerts);
        setError(null);
      } catch (currentError) {
        if (!isMounted) return;
        setError(currentError instanceof Error ? currentError.message : 'Alertes indisponibles.');
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    onRegisterHeaderActions?.({
      exportLabel: 'Exporter alertes',
      quickActionLabel: 'Traiter les alertes',
      onExport: () => downloadJson(`xelal-alertes-${new Date().toISOString().slice(0, 10)}.json`, alerts),
      onQuickAction: () => onNavigateTab?.('utilisateurs'),
    });

    return () => onRegisterHeaderActions?.({});
  }, [alerts, onRegisterHeaderActions, onNavigateTab]);

  return (
    <div className="space-y-4 max-w-4xl">
      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {alerts.map((alert, i) => (
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

// ─── Emploi du temps ─────────────────────────────────────────────────────────

const WEEK_DAYS: WeekDay[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const SLOT_COLORS: Record<string, string> = {
  'Mathématiques':  'bg-blue-50   border-blue-200   text-blue-800',
  'Français':       'bg-violet-50 border-violet-200 text-violet-800',
  'Physique-Chimie':'bg-emerald-50 border-emerald-200 text-emerald-800',
  'Anglais':        'bg-amber-50  border-amber-200  text-amber-800',
  'Histoire-Géo':   'bg-rose-50   border-rose-200   text-rose-800',
  'SVT':            'bg-teal-50   border-teal-200   text-teal-800',
  'Philosophie':    'bg-purple-50 border-purple-200 text-purple-800',
  'EPS':            'bg-orange-50 border-orange-200 text-orange-800',
};
const defaultSlotColor = 'bg-gray-50 border-gray-200 text-gray-800';

function slotColor(subjectName: string) {
  return SLOT_COLORS[subjectName] ?? defaultSlotColor;
}

function ScheduleView({
  session,
  onRegisterHeaderActions,
}: {
  session?: AuthSession;
  onRegisterHeaderActions: (actions: HeaderActionState) => void;
}) {
  const [slots, setSlots] = useState<AdminTimeSlotRecord[]>([]);
  const [classes, setClasses] = useState<AdminClassRecord[]>([]);
  const [subjects, setSubjects] = useState<AdminSubjectRecord[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignmentRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDay, setFormDay] = useState<WeekDay>('Lundi');
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    onRegisterHeaderActions({
      quickActionLabel: 'Nouveau créneau',
      onQuickAction: () => setShowForm(true),
    });
  }, [onRegisterHeaderActions]);

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    setLoading(true);

    Promise.all([
      adminService.fetchClasses(session),
      adminService.fetchSubjects(session),
      adminService.fetchAssignments(session),
    ])
      .then(([cls, sub, asgn]) => {
        if (!mounted) return;
        setClasses(cls);
        setSubjects(sub);
        setAssignments(asgn);
        const firstId = cls[0]?.id ?? '';
        setSelectedClassId(firstId);
        setFormSubjectId(sub[0]?.id ?? '');
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Chargement impossible.');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [session]);

  useEffect(() => {
    if (!session || !selectedClassId) return;
    let mounted = true;
    adminService.fetchTimeSlots(session, selectedClassId)
      .then((data) => { if (mounted) setSlots(data); })
      .catch(() => { if (mounted) setSlots([]); });
    return () => { mounted = false; };
  }, [session, selectedClassId]);

  // Teachers that have an assignment for the selected class
  const eligibleTeachers = useMemo(() => {
    const teacherIds = Array.from(new Set(
      assignments.filter((a) => a.classId === selectedClassId).map((a) => a.teacherId),
    ));
    return assignments
      .filter((a) => teacherIds.includes(a.teacherId))
      .reduce<{ id: string; name: string }[]>((acc, a) => {
        if (!acc.find((t) => t.id === a.teacherId)) {
          acc.push({ id: a.teacherId, name: a.teacherName });
        }
        return acc;
      }, []);
  }, [assignments, selectedClassId]);

  // Subjects assigned for the selected class
  const eligibleSubjects = useMemo(() =>
    assignments.filter((a) => a.classId === selectedClassId).map((a) => ({
      id: a.subjectId,
      name: a.subjectName,
    })),
  [assignments, selectedClassId]);

  useEffect(() => {
    setFormSubjectId(eligibleSubjects[0]?.id ?? '');
    setFormTeacherId(eligibleTeachers[0]?.id ?? '');
  }, [eligibleSubjects, eligibleTeachers]);

  const slotsByDay = useMemo(() => {
    const map: Record<WeekDay, AdminTimeSlotRecord[]> = {
      Lundi: [], Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [], Samedi: [],
    };
    for (const slot of slots) {
      if (map[slot.day]) map[slot.day].push(slot);
    }
    for (const day of WEEK_DAYS) {
      map[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [slots]);

  const handleDelete = async (slotId: string) => {
    if (!session) return;
    try {
      await adminService.deleteTimeSlot(session, slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const handleCreate = async () => {
    if (!session || !selectedClassId || !formSubjectId || !formTeacherId) {
      setFormError('Tous les champs sont obligatoires.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await adminService.createTimeSlot(session, {
        classId: selectedClassId,
        subjectId: formSubjectId,
        teacherId: formTeacherId,
        day: formDay,
        startTime: formStart,
        endTime: formEnd,
        room: formRoom.trim() || undefined,
      });
      setSlots((prev) => [...prev, created]);
      setShowForm(false);
      setFormRoom('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm font-medium">
        Chargement de l'emploi du temps…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Class selector */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Classe</label>
        <div className="flex gap-2 flex-wrap">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedClassId === cls.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white border border-border text-text-muted hover:bg-bg'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>

      {classes.length === 0 && (
        <div className="rounded-2xl border border-border bg-white px-6 py-8 text-center">
          <Clock className="mx-auto mb-3 text-text-muted" size={32} strokeWidth={1.5} />
          <p className="text-sm font-semibold text-text-main">Aucune classe créée</p>
          <p className="mt-1 text-xs text-text-muted">Créez d'abord des classes dans l'onglet Établissement.</p>
        </div>
      )}

      {selectedClass && (
        <>
          {/* Add slot form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-text-main">Nouveau créneau — {selectedClass.name}</h3>
                  <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-main transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {formError && (
                  <p className="mb-3 text-xs font-semibold text-red-600">{formError}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Jour</label>
                    <select
                      value={formDay}
                      onChange={(e) => setFormDay(e.target.value as WeekDay)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-bg focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Salle (optionnel)</label>
                    <input
                      type="text"
                      placeholder="ex. Salle A1"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-bg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Début</label>
                    <input
                      type="time"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-bg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Fin</label>
                    <input
                      type="time"
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-bg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Matière</label>
                    <select
                      value={formSubjectId}
                      onChange={(e) => setFormSubjectId(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-bg focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {eligibleSubjects.length === 0 && (
                        <option value="">Aucune matière affectée à cette classe</option>
                      )}
                      {eligibleSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Enseignant</label>
                    <select
                      value={formTeacherId}
                      onChange={(e) => setFormTeacherId(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-bg focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {eligibleTeachers.length === 0 && (
                        <option value="">Aucun enseignant affecté à cette classe</option>
                      )}
                      {eligibleTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-border text-text-muted hover:bg-bg transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || eligibleSubjects.length === 0 || eligibleTeachers.length === 0}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {saving ? 'Enregistrement…' : <><Plus size={13} /> Ajouter le créneau</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weekly grid */}
          <div className="grid grid-cols-6 gap-3">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="flex flex-col gap-2">
                <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest text-center py-2 border-b border-border">
                  {day}
                </div>

                {slotsByDay[day].length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-bg h-16 flex items-center justify-center">
                    <span className="text-[9px] text-text-muted font-medium">—</span>
                  </div>
                )}

                {slotsByDay[day].map((slot) => (
                  <div
                    key={slot.id}
                    className={`rounded-xl border p-2.5 relative group ${slotColor(slot.subjectName)}`}
                  >
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-current/40 hover:text-red-500"
                    >
                      <X size={11} />
                    </button>
                    <p className="text-[11px] font-extrabold leading-tight pr-4">{slot.subjectName}</p>
                    <p className="text-[10px] font-semibold mt-1 opacity-70">{slot.startTime} – {slot.endTime}</p>
                    {slot.room && (
                      <p className="text-[9px] font-bold mt-0.5 opacity-60 uppercase tracking-wide">{slot.room}</p>
                    )}
                    <p className="text-[9px] font-semibold mt-1 opacity-50 truncate">{slot.teacherName}</p>
                  </div>
                ))}

                <button
                  onClick={() => { setFormDay(day); setShowForm(true); }}
                  className="rounded-xl border border-dashed border-border bg-bg hover:bg-white hover:border-primary/30 transition-all h-8 flex items-center justify-center text-text-muted hover:text-primary"
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>

          {slots.length === 0 && (
            <div className="rounded-2xl border border-border bg-white px-6 py-6 text-center mt-2">
              <p className="text-xs font-semibold text-text-muted">
                Aucun créneau pour {selectedClass.name}. Cliquez sur <strong>+</strong> dans une colonne ou sur "Nouveau créneau" en haut.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
