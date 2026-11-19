import React, { useEffect, useState } from 'react';
import { AdminAuth } from './components/AdminAuth.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { InvitationView } from './components/InvitationView.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { api } from './lib/api.ts';
import { InvitationRecord, RsvpWishRecord } from './shared/types.ts';

function getRoute(): { page: 'home' | 'admin' | 'invitation'; slug?: string; guestTo?: string } {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const guestTo = params.get('to') || 'Bapak/Ibu/Saudara/i';

  if (path.startsWith('/admin')) {
    return { page: 'admin' };
  }
  const match = path.match(/^\/undangan\/([^/]+)\/?$/);
  if (match) {
    return { page: 'invitation', slug: decodeURIComponent(match[1]), guestTo };
  }
  return { page: 'home' };
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  // Admin auth state
  const [authLoading, setAuthLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(true);
  const [admin, setAdmin] = useState<{ id: string; username: string; email: string } | null>(null);

  // Public invitation state
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);
  const [pubInvitation, setPubInvitation] = useState<InvitationRecord | null>(null);
  const [pubWishes, setPubWishes] = useState<RsvpWishRecord[]>([]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(getRoute());
  };

  useEffect(() => {
    const onPop = () => setRoute(getRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route.page === 'admin') {
      setAuthLoading(true);
      api.auth
        .status()
        .then((res) => {
          setAuthInitialized(res.initialized);
          setAdmin(res.authenticated ? res.admin : null);
        })
        .catch(() => {
          setAdmin(null);
        })
        .finally(() => setAuthLoading(false));
    } else if (route.page === 'invitation' && route.slug) {
      setPubLoading(true);
      setPubError(null);
      api.publicInvitations
        .getBySlug(route.slug)
        .then((res) => {
          setPubInvitation(res.invitation);
          setPubWishes(res.wishes);
          api.publicInvitations.recordVisit(route.slug!, route.guestTo || 'Pengunjung').catch(() => {});
        })
        .catch((err: any) => {
          setPubError(err?.message || 'Undangan tidak ditemukan.');
        })
        .finally(() => setPubLoading(false));
    }
  }, [route.page, route.slug]);

  if (route.page === 'admin') {
    if (authLoading) {
      return (
        <div className="flex min-h-[100svh] items-center justify-center bg-[#FAF8F4] text-sm text-[#5F6B65]">
          Memverifikasi sesi administrator...
        </div>
      );
    }
    if (!admin) {
      return (
        <AdminAuth
          initialized={authInitialized}
          onSuccess={(loggedIn) => {
            setAuthInitialized(true);
            setAdmin(loggedIn);
          }}
          onGoHome={() => navigate('/')}
        />
      );
    }
    return (
      <AdminDashboard
        admin={admin}
        onLogout={async () => {
          await api.auth.logout();
          setAdmin(null);
        }}
        onGoHome={() => navigate('/')}
      />
    );
  }

  if (route.page === 'invitation') {
    if (pubLoading) {
      return (
        <div className="flex min-h-[100svh] items-center justify-center bg-[#FAF8F4] font-serif-display text-lg text-[#0F2C23]">
          Membuka undangan...
        </div>
      );
    }
    if (pubError || !pubInvitation) {
      return (
        <div className="flex min-h-[100svh] flex-col items-center justify-center bg-[#FAF8F4] px-6 text-center">
          <h1 className="font-serif-display text-2xl font-semibold text-[#0F2C23]">Undangan Tidak Tersedia</h1>
          <p className="mt-2 text-sm text-[#5F6B65]">{pubError || 'Tautan undangan belum dipublikasikan.'}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 rounded-full bg-[#0F2C23] px-6 py-2.5 text-xs font-semibold text-[#FAF8F4]"
          >
            Kembali ke Beranda
          </button>
        </div>
      );
    }
    return (
      <InvitationView
        invitation={pubInvitation}
        initialWishes={pubWishes}
        guestName={route.guestTo}
      />
    );
  }

  return (
    <LandingPage
      onOpenAdmin={() => navigate('/admin')}
      onOpenInvitation={(slug) => navigate(`/undangan/${encodeURIComponent(slug)}`)}
    />
  );
}
