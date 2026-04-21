import React, { useState } from 'react';
import { KeyRound, Mail, School, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { authService } from '../services/authService';
import { AuthSession, Role } from '../types';

const roleLabels: Record<Role, string> = {
  admin: 'Administration',
  teacher: 'Enseignant',
  student: 'Élève',
  parent: 'Parent',
};

const portalColors: Record<Role, string> = {
  admin: 'from-slate-900 to-slate-700',
  teacher: 'from-blue-900 to-blue-700',
  student: 'from-emerald-700 to-emerald-500',
  parent: 'from-teal-700 to-cyan-600',
};

interface AuthPortalProps {
  role: Role;
  onBack: () => void;
  onAuthenticated: (session: AuthSession) => void;
}

export default function AuthPortal({ role, onBack, onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const session = await authService.login(email, password);
      if (session.user.role !== role) {
        throw new Error(`Ce compte est de type ${roleLabels[session.user.role]}.`);
      }

      onAuthenticated(session);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await authService.activateInvitation(email, code, password);
      setMessage('Compte activé. Vous pouvez maintenant vous connecter.');
      setMode('login');
      setCode('');
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Activation impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className={`rounded-[2rem] bg-gradient-to-br ${portalColors[role]} text-white p-8 shadow-2xl mb-6`}>
          <div className="flex items-center justify-between mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <School size={24} />
            </div>
            <button
              onClick={onBack}
              className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white"
            >
              Retour
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold mb-3">
            Portail {roleLabels[role]}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">Connexion sécurisée</h1>
          <p className="text-sm text-white/75 leading-relaxed">
            Connectez-vous avec votre compte école, ou activez votre invitation si c’est votre premier accès.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] border border-border shadow-xl p-6">
          <div className="flex gap-2 mb-6 bg-bg rounded-2xl p-1">
            {[
              { id: 'login', label: 'Connexion' },
              { id: 'activate', label: 'Activation' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMode(item.id as 'login' | 'activate');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  mode === item.id ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Email</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3">
                <Mail size={16} className="text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@ecole.com"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>

            {mode === 'activate' && (
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Code d'activation</span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3">
                  <ShieldCheck size={16} className="text-text-muted" />
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {mode === 'activate' ? 'Nouveau mot de passe' : 'Mot de passe'}
              </span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3">
                <KeyRound size={16} className="text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
              {message}
            </div>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : handleActivate}
            disabled={isSubmitting}
            className="mt-6 w-full rounded-2xl bg-primary text-white py-4 text-sm font-bold shadow-xl shadow-blue-100 hover:scale-[1.01] transition-all disabled:opacity-60 disabled:hover:scale-100"
          >
            {isSubmitting ? 'Traitement...' : mode === 'login' ? 'Se connecter' : 'Activer le compte'}
          </button>

          {mode === 'login' && role === 'admin' && (
            <p className="mt-4 text-xs text-text-muted leading-relaxed">
              Compte de test admin: <span className="font-bold">admin@xelal.ai</span> / <span className="font-bold">admin123</span>
            </p>
          )}

          {mode === 'login' && role === 'teacher' && (
            <p className="mt-4 text-xs text-text-muted leading-relaxed">
              Utilisez le compte enseignant créé par l'administration, puis activez-le avec le code reçu si nécessaire.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
