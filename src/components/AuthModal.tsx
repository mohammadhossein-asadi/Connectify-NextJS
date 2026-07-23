import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, UserPlus, Lock, Sparkles, LogIn } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function AuthModal({ onLoginSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { email, username, password }
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetEmail: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: presetEmail, password: 'password123' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Authentication" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 dark:bg-[#09090b]/90 backdrop-blur-md p-4">
      <div 
        id="auth-modal-card" 
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 shadow-2xl transition-all duration-300"
      >
        {/* Banner */}
        <div className="relative bg-gradient-to-tr from-indigo-950 via-zinc-900 to-black p-8 text-center text-white border-b border-zinc-200 dark:border-zinc-800/50">
          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full text-xs text-white/90 border border-zinc-700/50">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20 animate-pulse" />
            <span className="font-mono text-[10px]">v4.0 Fullstack</span>
          </div>
          <h2 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Connectify</h2>
          <p className="mt-2 text-zinc-300 text-sm font-sans">
            Connect. Share. Spark Ideas with Gemini AI.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 font-sans border border-rose-100 dark:border-rose-900/50">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. dev_wizard"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <hr className="border-zinc-200 dark:border-zinc-800" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#121214] px-3 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider">
              OR QUICK SIGN-IN AS PRESETS
            </span>
          </div>

          {/* Quick Sign-In Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin('sarah@connectify.com')}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-3 text-center transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800"
            >
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80" 
                alt="Sarah" 
                className="h-9 w-9 rounded-full object-cover border border-indigo-200 ring-2 ring-indigo-50/50"
              />
              <span className="mt-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">Sarah Jenkins</span>
              <span className="text-[10px] text-gray-400">Designer (Verified)</span>
            </button>

            <button
              onClick={() => handleQuickLogin('alex@connectify.com')}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-3 text-center transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800"
            >
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80" 
                alt="Alex" 
                className="h-9 w-9 rounded-full object-cover border border-emerald-200 ring-2 ring-emerald-50/50"
              />
              <span className="mt-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">Alex Rivera</span>
              <span className="text-[10px] text-gray-400">Engineer</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {isRegister ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
