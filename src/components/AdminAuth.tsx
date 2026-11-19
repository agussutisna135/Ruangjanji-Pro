import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { api } from '../lib/api.ts';

interface AdminAuthProps {
  initialized: boolean;
  onSuccess: (admin: { id: string; username: string; email: string }) => void;
  onGoHome: () => void;
}

export function AdminAuth({ initialized, onSuccess, onGoHome }: AdminAuthProps) {
  const [mode, setMode] = useState<'login' | 'setup' | 'forgot'>(initialized ? 'login' : 'setup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'setup') {
        const res = await api.auth.setup({ username, email, password, recoveryKey });
        onSuccess(res.admin);
      } else if (mode === 'login') {
        const res = await api.auth.login({ username, password });
        onSuccess(res.admin);
      } else {
        const res = await api.auth.forgotPassword({ username, recoveryKey, newPassword });
        setInfo(res.message);
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err?.message || 'Autentikasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[#FAF8F4] px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#0F2C23]/12 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5F6B65] hover:text-[#0F2C23]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Beranda</span>
          </button>
          <span className="text-xs font-medium text-[#9E7C38]">Akses Terproteksi</span>
        </div>

        <div>
          <p className="font-serif-display text-2xl font-semibold text-[#0F2C23]">RUANGJANJI PRO</p>
          <h1 className="mt-1 text-base font-medium text-[#17201C]">
            {mode === 'setup'
              ? 'Aktivasi Akun Pemilik Administrator'
              : mode === 'forgot'
              ? 'Pulihkan Password Administrator'
              : 'Login Administrator'}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B65]">
            {mode === 'setup'
              ? 'Buat kredensial pemilik pertama untuk mengamankan studio dan seluruh undangan Anda.'
              : mode === 'forgot'
              ? 'Masukkan Username dan Kode Pemulihan (Recovery Key) yang Anda simpan saat aktivasi.'
              : 'Masuk untuk mengelola undangan, tema, galeri, tamu, dan statistik pengunjung.'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Username Administrator</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B65]" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Mis. admin"
                className="h-11 w-full rounded-xl border border-[#0F2C23]/15 pl-9 pr-3 text-sm focus:border-[#C6A259] focus:outline-none"
              />
            </div>
          </div>

          {mode === 'setup' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Email Pemilik</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@domain.com"
                className="h-11 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm focus:border-[#C6A259] focus:outline-none"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B65]" />
                <input
                  type="password"
                  required
                  autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="h-11 w-full rounded-xl border border-[#0F2C23]/15 pl-9 pr-3 text-sm focus:border-[#C6A259] focus:outline-none"
                />
              </div>
            </div>
          )}

          {(mode === 'setup' || mode === 'forgot') && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5F6B65]">
                Kode Pemulihan (Recovery Key)
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B65]" />
                <input
                  type="text"
                  required
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder={mode === 'setup' ? 'Simpan kode rahasia untuk reset password' : 'Masukkan Kode Pemulihan'}
                  className="h-11 w-full rounded-xl border border-[#0F2C23]/15 pl-9 pr-3 text-sm focus:border-[#C6A259] focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'forgot' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Password Baru</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B65]" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password baru minimal 6 karakter"
                  className="h-11 w-full rounded-xl border border-[#0F2C23]/15 pl-9 pr-3 text-sm focus:border-[#C6A259] focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F2C23] px-5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#1A4336] disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 text-[#C6A259]" />
            <span>
              {loading
                ? 'Memproses...'
                : mode === 'setup'
                ? 'Aktifkan Akun Administrator'
                : mode === 'forgot'
                ? 'Reset Password'
                : 'Masuk ke Studio'}
            </span>
          </button>
        </form>

        {initialized && (
          <div className="border-t border-[#0F2C23]/10 pt-4 text-center">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('forgot');
                }}
                className="text-xs font-medium text-[#9E7C38] hover:underline"
              >
                Lupa password? Reset dengan Kode Pemulihan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="text-xs font-medium text-[#0F2C23] hover:underline"
              >
                Kembali ke Login
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
