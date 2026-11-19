import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CopyPlus,
  Database,
  Download,
  Edit3,
  ExternalLink,
  KeyRound,
  LogOut,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { DEFAULT_INVITATION_DATA } from '../shared/defaultInvitation.ts';
import { getTemplateStyleSpec, TEMPLATE_PRESET_LIST } from '../shared/templateStyles.ts';
import { getThemeById } from '../shared/themes.ts';
import { DashboardSummary, InvitationRecord, InvitationTemplatePreset } from '../shared/types.ts';
import { InvitationEditor } from './InvitationEditor.tsx';

interface AdminDashboardProps {
  admin: { id: string; username: string; email: string };
  onLogout: () => void;
  onGoHome: () => void;
}

export function AdminDashboard({ admin, onLogout, onGoHome }: AdminDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<InvitationRecord | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modals: New Invitation & Account Settings
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGroom, setNewGroom] = useState('');
  const [newBride, setNewBride] = useState('');
  const [newDate, setNewDate] = useState('2027-07-18');
  const [newPreset, setNewPreset] = useState<InvitationTemplatePreset>('emerald-ivory');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRecoveryKey, setNewRecoveryKey] = useState('');
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, list] = await Promise.all([api.admin.dashboard(), api.admin.listInvitations()]);
      setSummary(dash);
      setInvitations(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvitations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter((inv) => {
      const statusOk = statusFilter === 'all' || inv.status === statusFilter;
      const searchOk =
        !q ||
        inv.title.toLowerCase().includes(q) ||
        inv.slug.toLowerCase().includes(q) ||
        inv.data.couple.groomNickname.toLowerCase().includes(q) ||
        inv.data.couple.brideNickname.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [invitations, search, statusFilter]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError('Judul undangan wajib diisi.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const groomNick = newGroom.trim() || 'Putra';
      const brideNick = newBride.trim() || 'Putri';
      const tpl = getTemplateStyleSpec(newPreset);
      const created = await api.admin.createInvitation({
        title: newTitle.trim(),
        status: 'draft',
        themeId: 42,
        data: {
          ...DEFAULT_INVITATION_DATA,
          couple: {
            ...DEFAULT_INVITATION_DATA.couple,
            groomNickname: groomNick,
            groomName: groomNick,
            groomFullName: groomNick,
            brideNickname: brideNick,
            brideName: brideNick,
            brideFullName: brideNick,
            weddingDate: newDate,
          },
          events: DEFAULT_INVITATION_DATA.events.map((ev) => ({ ...ev, date: newDate })),
          countdown: {
            ...DEFAULT_INVITATION_DATA.countdown,
            targetDate: newDate,
          },
          design: {
            ...DEFAULT_INVITATION_DATA.design,
            templatePreset: tpl.id,
            backgroundColor: tpl.canvasBg,
            fontColor: tpl.headingColor,
            accentColor: tpl.accentColor,
            headingFont: tpl.defaultHeadingFont,
            bodyFont: tpl.defaultBodyFont,
            ornamentStyle: tpl.defaultOrnament,
            photoFrame: tpl.defaultFrame,
          },
        },
      });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewGroom('');
      setNewBride('');
      setInvitations((prev) => [created, ...prev]);
      setEditing(created);
    } catch (err: any) {
      setCreateError(err?.message || 'Gagal membuat undangan. Pastikan sesi login masih aktif.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadAdminHtml = async () => {
    setDownloadingKey('admin');
    try {
      await api.admin.exportAdminHtml();
      showToast('File "admin-undangan.html" berhasil diunduh.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunduh HTML Admin.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadSampleInvHtml = async () => {
    const sampleInv = invitations.find((i) => i.status === 'published') || invitations[0];
    if (!sampleInv) {
      showToast('Belum ada undangan untuk diunduh.');
      return;
    }
    setDownloadingKey('sample');
    try {
      await api.admin.exportInvitationHtml(sampleInv.id, sampleInv.slug, undefined, 'contoh-undangan.html');
      showToast(`File "contoh-undangan.html" (${sampleInv.title}) berhasil diunduh.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunduh HTML Contoh Undangan.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadInvHtml = async (inv: InvitationRecord) => {
    setDownloadingKey(inv.id);
    try {
      await api.admin.exportInvitationHtml(inv.id, inv.slug);
      showToast(`HTML "${inv.title}" berhasil diunduh.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunduh HTML undangan.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadBackup = async () => {
    setDownloadingKey('backup');
    try {
      await api.admin.downloadBackup();
      showToast('Backup JSON berhasil diunduh.');
    } catch (err: any) {
      setSettingsFeedback(err?.message || 'Gagal mengunduh backup JSON.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDelete = async (inv: InvitationRecord) => {
    await api.admin.deleteInvitation(inv.id);
    await loadData();
  };

  const handleDuplicate = async (inv: InvitationRecord) => {
    await api.admin.duplicateInvitation(inv.id);
    await loadData();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback(null);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
        newRecoveryKey: newRecoveryKey.trim() || undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewRecoveryKey('');
      setSettingsFeedback('Password administrator berhasil diperbarui.');
    } catch (err: any) {
      setSettingsFeedback(err?.message || 'Gagal mengubah password.');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.admin.restoreBackup(parsed);
      setSettingsFeedback(`${res.restoredInvitations} undangan berhasil dipulihkan.`);
      await loadData();
    } catch {
      setSettingsFeedback('File backup JSON tidak valid.');
    } finally {
      e.target.value = '';
    }
  };

  if (editing) {
    return (
      <InvitationEditor
        invitation={editing}
        onBack={() => {
          setEditing(null);
          loadData();
        }}
        onSaved={(updated) => {
          setEditing(updated);
          setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }}
        onDuplicated={(created) => {
          setEditing(created);
          loadData();
        }}
      />
    );
  }

  const maxVisit = Math.max(1, ...(summary?.visitSeries.map((d) => d.count) || [1]));

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#17201C]">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-20 border-b border-[#0F2C23]/10 bg-white/95 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8">
          <button
            type="button"
            onClick={onGoHome}
            className="shrink-0 whitespace-nowrap font-serif-display text-lg font-semibold text-[#0F2C23]"
          >
            RUANGJANJI PRO
          </button>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5F6B65] md:flex">
            <button type="button" onClick={onGoHome} className="whitespace-nowrap hover:text-[#0F2C23]">
              Beranda Publik
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} className="whitespace-nowrap hover:text-[#0F2C23]">
              Keamanan &amp; Backup
            </button>
            <button type="button" onClick={onLogout} className="whitespace-nowrap hover:text-red-700">
              Logout ({admin.username})
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Pengaturan Akun"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#0F2C23]/15 text-[#0F2C23] md:hidden"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#0F2C23] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#1A4336]"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Undangan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] space-y-8 px-4 py-8 sm:px-6">
        {/* Page Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#9E7C38]">Dashboard Administrator</p>
            <h1 className="mt-1 font-serif-display text-2xl font-semibold text-[#0F2C23] sm:text-3xl">
              Ringkasan &amp; Kelola Undangan
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {invitations.length > 0 && (
              <button
                type="button"
                disabled={downloadingKey === 'sample'}
                onClick={handleDownloadSampleInvHtml}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C6A259] bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-[#0F2C23] transition-colors hover:bg-[#F3EFE6] disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5 text-[#9E7C38]" />
                <span>{downloadingKey === 'sample' ? 'Mengunduh...' : 'Download HTML Contoh Undangan'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={downloadingKey === 'admin'}
              onClick={handleDownloadAdminHtml}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#0F2C23]/20 bg-white px-4 py-2 text-xs font-semibold text-[#0F2C23] transition-colors hover:bg-[#F3EFE6] disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5 text-[#9E7C38]" />
              <span>{downloadingKey === 'admin' ? 'Mengunduh...' : 'Download HTML Admin'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#0F2C23]/15 bg-white px-3 text-xs font-medium text-[#0F2C23] md:hidden"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0F2C23] px-5 py-2.5 text-xs font-medium text-[#FAF8F4] shadow-xl">
            {toast}
          </div>
        )}

        {/* KPI Grid */}
        {loading || !summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[#0F2C23]/10 bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Undangan', value: summary.totalInvitations },
              { label: 'Undangan Aktif', value: summary.publishedInvitations },
              { label: 'Draft', value: summary.draftInvitations },
              { label: 'Total Pengunjung', value: summary.totalVisitors },
              { label: 'Total RSVP', value: summary.totalRsvp },
              { label: 'Tamu Hadir', value: summary.attendingCount },
              { label: 'Tidak Hadir', value: summary.notAttendingCount },
              { label: 'Total Ucapan', value: summary.totalWishes },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[#0F2C23]/10 bg-white p-4">
                <p className="text-xs text-[#5F6B65]">{stat.label}</p>
                <p className="mt-1.5 font-serif-display text-2xl font-semibold tabular-nums text-[#0F2C23]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Visit Statistics & Activity Feed */}
        {summary && (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-lg font-semibold text-[#0F2C23]">
                  Statistik Kunjungan (7 Hari Terakhir)
                </h2>
                <span className="text-xs tabular-nums text-[#5F6B65]">Total {summary.totalVisitors} kunjungan</span>
              </div>
              <div className="mt-6 flex h-44 items-end gap-3">
                {summary.visitSeries.map((day) => {
                  const pct = Math.max(8, Math.round((day.count / maxVisit) * 100));
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums text-[#0F2C23]">{day.count}</span>
                      <div className="flex h-28 w-full items-end rounded-lg bg-[#F3EFE6] p-1">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full rounded-md bg-[#0F2C23] transition-all"
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-[#5F6B65]">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
              <h2 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Aktivitas Terbaru</h2>
              <div className="mt-4 max-h-48 space-y-2.5 overflow-y-auto divide-y divide-[#0F2C23]/10 thin-scrollbar">
                {summary.recentActivities.length === 0 ? (
                  <p className="text-xs text-[#5F6B65]">Belum ada aktivitas tercatat.</p>
                ) : (
                  summary.recentActivities.map((act) => (
                    <div key={act.id} className="pt-2.5 first:pt-0">
                      <p className="text-xs text-[#17201C]">{act.description}</p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-[#5F6B65]">
                        {new Date(act.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invitation List + Search + Filter */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-xl bg-[#F3EFE6] p-1">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'published', label: 'Aktif' },
                  { id: 'draft', label: 'Draft' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`min-h-[36px] rounded-lg px-3.5 text-xs font-medium transition-colors ${
                    statusFilter === tab.id ? 'bg-white text-[#0F2C23] shadow-sm' : 'text-[#5F6B65]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B65]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul, nama mempelai, slug..."
                className="h-10 w-full rounded-xl border border-[#0F2C23]/15 bg-white pl-9 pr-3 text-sm focus:border-[#C6A259] focus:outline-none"
              />
            </div>
          </div>

          {filteredInvitations.length === 0 ? (
            <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-12 text-center">
              <p className="text-sm text-[#5F6B65]">Belum ada undangan yang sesuai filter.</p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#0F2C23] px-5 text-xs font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Buat Undangan Pertama
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInvitations.map((inv) => {
                const theme = getThemeById(inv.themeId);
                return (
                  <div
                    key={inv.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-[#0F2C23]/10 bg-white"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#EAE4D7]">
                      <img
                        src={inv.data.design.backgroundImageOverride || theme.imageUrl}
                        alt={inv.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-[11px] text-[#F5E8CE]">
                          {inv.status === 'published' ? 'Publik Aktif' : 'Draft'} · {theme.name}
                        </p>
                        <h3 className="truncate font-serif-display text-lg font-semibold">{inv.title}</h3>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                      <div className="flex items-center justify-between text-xs text-[#5F6B65] tabular-nums">
                        <span>/undangan/{inv.slug}</span>
                        <span>
                          {inv.stats?.views ?? 0} dilihat · {inv.stats?.rsvpCount ?? 0} RSVP
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing(inv)}
                          className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F2C23] px-3 text-xs font-semibold text-[#FAF8F4] hover:bg-[#1A4336]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Studio</span>
                        </button>

                        {inv.status === 'published' && (
                          <a
                            href={`/undangan/${inv.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Buka Halaman Publik"
                            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#0F2C23]/15 text-[#0F2C23] hover:bg-[#F3EFE6]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={downloadingKey === inv.id}
                          onClick={() => handleDownloadInvHtml(inv)}
                          title="Download HTML"
                          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#0F2C23]/15 text-[#0F2C23] hover:bg-[#F3EFE6] disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(inv)}
                          title="Duplikat"
                          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#0F2C23]/15 text-[#0F2C23] hover:bg-[#F3EFE6]"
                        >
                          <CopyPlus className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(inv)}
                          title="Hapus"
                          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* MODAL: CREATE NEW INVITATION */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateInvitation}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl font-semibold text-[#0F2C23]">Buat Undangan Baru</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F3EFE6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                {createError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Judul Undangan</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Mis. Pernikahan Raka & Tania"
                className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Panggilan Pria</label>
                <input
                  type="text"
                  required
                  value={newGroom}
                  onChange={(e) => setNewGroom(e.target.value)}
                  placeholder="Raka"
                  className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Panggilan Wanita</label>
                <input
                  type="text"
                  required
                  value={newBride}
                  onChange={(e) => setNewBride(e.target.value)}
                  placeholder="Tania"
                  className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Tanggal Pernikahan</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Gaya Awal</label>
                <select
                  value={newPreset}
                  onChange={(e) => setNewPreset(e.target.value as InvitationTemplatePreset)}
                  className="h-10 w-full rounded-xl border border-[#0F2C23]/15 bg-white px-2.5 text-sm"
                >
                  {TEMPLATE_PRESET_LIST.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="min-h-[44px] w-full rounded-xl bg-[#0F2C23] text-xs font-semibold text-white hover:bg-[#1A4336] disabled:opacity-60"
            >
              {creating ? 'Membuka Studio...' : 'Lanjut ke Studio Desain'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ACCOUNT SECURITY & BACKUP */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl font-semibold text-[#0F2C23]">Keamanan &amp; Backup Data</h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F3EFE6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {settingsFeedback && (
              <div className="rounded-xl bg-[#F3EFE6] px-3.5 py-2.5 text-xs font-medium text-[#0F2C23]">
                {settingsFeedback}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 border-b border-[#0F2C23]/10 pb-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E7C38]">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Ubah Password Administrator</span>
              </div>
              <input
                type="password"
                required
                placeholder="Password saat ini"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
              />
              <input
                type="password"
                required
                placeholder="Password baru (minimal 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
              />
              <input
                type="text"
                placeholder="Kode Pemulihan baru (opsional)"
                value={newRecoveryKey}
                onChange={(e) => setNewRecoveryKey(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
              />
              <button
                type="submit"
                className="min-h-[42px] w-full rounded-xl bg-[#0F2C23] text-xs font-semibold text-white"
              >
                Simpan Password Baru
              </button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E7C38]">
                <Database className="h-3.5 w-3.5" />
                <span>Backup &amp; Pulihkan Database</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={downloadingKey === 'admin'}
                  onClick={handleDownloadAdminHtml}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F2C23] px-4 text-xs font-semibold text-[#FAF8F4] hover:bg-[#1A4336] disabled:opacity-60"
                >
                  <Download className="h-4 w-4 text-[#C6A259]" />
                  <span>{downloadingKey === 'admin' ? 'Mengunduh...' : 'Download HTML Portal Admin'}</span>
                </button>
                <button
                  type="button"
                  disabled={downloadingKey === 'backup'}
                  onClick={handleDownloadBackup}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-4 text-xs font-semibold hover:bg-[#F3EFE6] disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  <span>{downloadingKey === 'backup' ? 'Mengunduh...' : 'Download Backup JSON'}</span>
                </button>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
                <button
                  type="button"
                  onClick={() => restoreInputRef.current?.click()}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-4 text-xs font-semibold hover:bg-[#F3EFE6]"
                >
                  <Upload className="h-4 w-4" />
                  Pulihkan Backup JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
