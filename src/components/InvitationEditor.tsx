import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  CopyPlus,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Heart,
  Image as ImageIcon,
  Monitor,
  Music,
  Palette,
  Plus,
  QrCode,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { BUILTIN_MUSIC_TRACKS, DEFAULT_INVITATION_DATA } from '../shared/defaultInvitation.ts';
import { TEMPLATE_PRESET_LIST, TemplateStyleSpec } from '../shared/templateStyles.ts';
import { getThemeById } from '../shared/themes.ts';
import { DesignConfig, GuestRecord, InvitationData, InvitationRecord, RsvpWishRecord } from '../shared/types.ts';
import { InvitationView } from './InvitationView.tsx';
import { ThemeGallery } from './ThemeGallery.tsx';

interface InvitationEditorProps {
  invitation: InvitationRecord;
  onBack: () => void;
  onSaved: (updated: InvitationRecord) => void;
  onDuplicated: (created: InvitationRecord) => void;
}

type EditorTab =
  | 'tema'
  | 'pengantin'
  | 'turut'
  | 'acara'
  | 'musik'
  | 'galeri'
  | 'amplop'
  | 'desain'
  | 'tamu';

type PreviewDevice = 'iphone-390' | 'iphone-393' | 'android-360' | 'android-412' | 'tablet' | 'desktop';

const DEVICE_DIMENSIONS: Record<PreviewDevice, { label: string; width: string; height: string; isMobile: boolean }> = {
  'iphone-390': { label: 'iPhone 390×844', width: '390px', height: '760px', isMobile: true },
  'iphone-393': { label: 'iPhone 393×852', width: '393px', height: '770px', isMobile: true },
  'android-360': { label: 'Android 360×800', width: '360px', height: '740px', isMobile: true },
  'android-412': { label: 'Android 412×915', width: '412px', height: '780px', isMobile: true },
  tablet: { label: 'Tablet', width: '100%', height: '760px', isMobile: false },
  desktop: { label: 'Desktop', width: '100%', height: '760px', isMobile: false },
};

export function InvitationEditor({ invitation, onBack, onSaved, onDuplicated }: InvitationEditorProps) {
  const [title, setTitle] = useState(invitation.title);
  const [slug, setSlug] = useState(invitation.slug);
  const [status, setStatus] = useState<'draft' | 'published'>(invitation.status);
  const [themeId, setThemeId] = useState(invitation.themeId);
  const [data, setData] = useState<InvitationData>(invitation.data);

  // Undo / Redo history for Design + Data
  const [history, setHistory] = useState<DesignConfig[]>([invitation.data.design]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const [activeTab, setActiveTab] = useState<EditorTab>('tema');
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('iphone-390');
  const [saving, setSaving] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Guests & Wishes state
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [wishes, setWishes] = useState<RsvpWishRecord[]>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestGroup, setNewGuestGroup] = useState('Tamu Undangan');
  const [newGuestPax, setNewGuestPax] = useState(2);
  const [newTurut, setNewTurut] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    api.admin.listGuests(invitation.id).then(setGuests).catch(() => {});
    api.admin.listWishes(invitation.id).then(setWishes).catch(() => {});
  }, [invitation.id]);

  const liveRecord: InvitationRecord = useMemo(
    () => ({
      ...invitation,
      title,
      slug,
      status,
      themeId,
      data,
    }),
    [invitation, title, slug, status, themeId, data]
  );

  const publicUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/undangan/${slug}`;
  }, [slug]);

  const updateDesign = (patch: Partial<DesignConfig>) => {
    const nextDesign = { ...data.design, ...patch };
    setData((prev) => ({ ...prev, design: nextDesign }));
    const nextHistory = history.slice(0, historyIdx + 1);
    nextHistory.push(nextDesign);
    setHistory(nextHistory);
    setHistoryIdx(nextHistory.length - 1);
  };

  const handleUndoDesign = () => {
    if (historyIdx <= 0) return;
    const prevIdx = historyIdx - 1;
    setHistoryIdx(prevIdx);
    setData((prev) => ({ ...prev, design: history[prevIdx] }));
  };

  const handleRedoDesign = () => {
    if (historyIdx >= history.length - 1) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    setData((prev) => ({ ...prev, design: history[nextIdx] }));
  };

  const handleResetDesign = () => {
    updateDesign(DEFAULT_INVITATION_DATA.design);
    showToast('Desain dikembalikan ke pengaturan awal.');
  };

  const handleSave = async (overrideStatus?: 'draft' | 'published') => {
    setSaving(true);
    try {
      const nextStatus = overrideStatus ?? status;
      const updated = await api.admin.updateInvitation(invitation.id, {
        title,
        slug,
        status: nextStatus,
        themeId,
        data,
      });
      setStatus(updated.status);
      setSlug(updated.slug);
      onSaved(updated);
      showToast(
        nextStatus === 'published'
          ? 'Undangan disimpan & dipublikasikan!'
          : 'Perubahan tersimpan ke database.'
      );
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan undangan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const created = await api.admin.duplicateInvitation(invitation.id);
      showToast('Undangan berhasil diduplikasi.');
      onDuplicated(created);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menduplikasi.');
    }
  };

  const handleDownloadHtml = async () => {
    setDownloadingHtml(true);
    try {
      await api.admin.exportInvitationHtml(invitation.id, slug || invitation.slug, {
        title,
        slug,
        status,
        themeId,
        data,
      });
      showToast('File HTML undangan berhasil diunduh.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunduh file HTML undangan.');
    } finally {
      setDownloadingHtml(false);
    }
  };

  const handleExportExcel = async () => {
    setDownloadingExcel(true);
    try {
      await api.admin.exportGuestsExcel(invitation.id, slug || invitation.slug);
      showToast('Daftar tamu Excel berhasil diunduh.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengekspor daftar tamu Excel.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleUploadSingle = async (field: string, file: File | undefined, onDone: (url: string, name: string) => void) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const res = await api.admin.uploadFile(file);
      onDone(res.url, res.filename);
      showToast('File berhasil diunggah ke server.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunggah file.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleUploadGalleryBatch = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingField('gallery');
    try {
      const added: InvitationData['gallery'] = [];
      let orderBase = data.gallery.length + 1;
      for (const file of Array.from(files)) {
        const res = await api.admin.uploadFile(file);
        added.push({
          id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: res.url,
          caption: file.name.replace(/\.[^.]+$/, ''),
          order: orderBase++,
        });
      }
      setData((prev) => ({ ...prev, gallery: [...prev.gallery, ...added] }));
      showToast(`${added.length} media ditambahkan ke galeri.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunggah media galeri.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    try {
      const created = await api.admin.addGuest(invitation.id, {
        name: newGuestName.trim(),
        phone: newGuestPhone.trim(),
        groupName: newGuestGroup.trim(),
        pax: newGuestPax,
      });
      setGuests((prev) => [created, ...prev]);
      setNewGuestName('');
      setNewGuestPhone('');
      showToast('Tamu ditambahkan.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menambah tamu.');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.admin.importGuests(invitation.id, file);
      const list = await api.admin.listGuests(invitation.id);
      setGuests(list);
      showToast(`${res.imported} tamu berhasil diimpor dari Excel.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengimpor Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const currentTheme = getThemeById(themeId);
  const qrUrl = `/api/public/qrcode?text=${encodeURIComponent(publicUrl)}`;

  const TABS: Array<{ id: EditorTab; label: string; icon: React.ReactNode }> = [
    { id: 'tema', label: 'Tema (100)', icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: 'pengantin', label: 'Pengantin', icon: <Heart className="h-3.5 w-3.5" /> },
    { id: 'turut', label: 'Turut Mengundang', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'acara', label: 'Acara & Waktu', icon: <Check className="h-3.5 w-3.5" /> },
    { id: 'musik', label: 'Musik', icon: <Music className="h-3.5 w-3.5" /> },
    { id: 'galeri', label: 'Galeri', icon: <Video className="h-3.5 w-3.5" /> },
    { id: 'amplop', label: 'Amplop', icon: <Download className="h-3.5 w-3.5" /> },
    { id: 'desain', label: 'Desain Visual', icon: <Palette className="h-3.5 w-3.5" /> },
    { id: 'tamu', label: 'Tamu, QR & RSVP', icon: <QrCode className="h-3.5 w-3.5" /> },
  ];

  const devSpec = DEVICE_DIMENSIONS[previewDevice];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] text-[#17201C]">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#0F2C23]/10 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0F2C23]/15 text-[#0F2C23] hover:bg-[#F3EFE6]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full max-w-xs truncate bg-transparent font-serif-display text-base font-semibold text-[#0F2C23] focus:outline-none sm:text-lg"
              />
              <div className="flex items-center gap-2 text-[11px] text-[#5F6B65]">
                <span>/undangan/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-36 rounded border border-[#0F2C23]/15 bg-[#FAF8F4] px-1.5 py-0.5 font-mono text-[11px] text-[#0F2C23]"
                />
                <span>·</span>
                <span>{status === 'published' ? 'Aktif Publik' : 'Draft'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicate}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#0F2C23]/15 bg-white px-3 text-xs font-medium text-[#0F2C23] hover:bg-[#F3EFE6]"
            >
              <CopyPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Duplikat</span>
            </button>

            <button
              type="button"
              disabled={downloadingHtml}
              onClick={handleDownloadHtml}
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#0F2C23]/15 bg-white px-3 text-xs font-medium text-[#0F2C23] hover:bg-[#F3EFE6] disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{downloadingHtml ? 'Mengunduh...' : 'Download HTML'}</span>
            </button>

            {status === 'published' && (
              <a
                href={`/undangan/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#C6A259] bg-[#FAF8F4] px-3 text-xs font-medium text-[#0F2C23] hover:bg-[#F3EFE6]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Buka Publik</span>
              </a>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('draft')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#0F2C23]/20 bg-white px-3.5 text-xs font-semibold text-[#0F2C23] hover:bg-[#F3EFE6] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('published')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#0F2C23] px-4 text-xs font-semibold text-[#FAF8F4] hover:bg-[#1A4336] disabled:opacity-50"
            >
              <span>{saving ? 'Menyimpan...' : status === 'published' ? 'Update Publikasi' : 'Publikasikan'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher */}
        <div className="mt-2.5 flex gap-1.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePane('editor')}
            className={`min-h-[38px] flex-1 rounded-lg text-xs font-semibold ${
              mobilePane === 'editor' ? 'bg-[#0F2C23] text-white' : 'bg-[#F3EFE6] text-[#0F2C23]'
            }`}
          >
            Panel Editor
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('preview')}
            className={`min-h-[38px] flex-1 rounded-lg text-xs font-semibold ${
              mobilePane === 'preview' ? 'bg-[#0F2C23] text-white' : 'bg-[#F3EFE6] text-[#0F2C23]'
            }`}
          >
            Preview Layar HP
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0F2C23] px-5 py-2.5 text-xs font-medium text-[#FAF8F4] shadow-xl">
          {toast}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="mx-auto grid w-full max-w-[1480px] flex-1 grid-cols-1 lg:grid-cols-[1fr_450px]">
        {/* LEFT: EDITOR CONTROLS */}
        <div className={`border-r border-[#0F2C23]/10 p-4 sm:p-6 ${mobilePane === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Horizontal Section Tabs */}
          <div className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-[#0F2C23]/10 bg-white p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#0F2C23] text-[#FAF8F4]'
                    : 'text-[#5F6B65] hover:bg-[#F3EFE6] hover:text-[#0F2C23]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: 100 TEMA FOTO */}
          {activeTab === 'tema' && (
            <ThemeGallery
              selectedThemeId={themeId}
              couplePreviewTitle={`${data.couple.groomNickname} & ${data.couple.brideNickname}`}
              onSelectTheme={(theme) => {
                setThemeId(theme.id);
                updateDesign({
                  accentColor: theme.accentHex,
                  backgroundColor: theme.surfaceTint,
                  backgroundImageOverride: '',
                });
                showToast(`Tema "${theme.name}" diterapkan.`);
              }}
            />
          )}

          {/* TAB 2: DATA PENGANTIN & CERITA */}
          {activeTab === 'pengantin' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Mempelai Pria</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Panggilan</label>
                    <input
                      type="text"
                      value={data.couple.groomNickname}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, groomNickname: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Lengkap &amp; Gelar</label>
                    <input
                      type="text"
                      value={data.couple.groomFullName}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, groomFullName: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Ayah</label>
                    <input
                      type="text"
                      value={data.couple.groomFather}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, groomFather: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Ibu</label>
                    <input
                      type="text"
                      value={data.couple.groomMother}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, groomMother: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <img
                    src={data.couple.groomPhoto}
                    alt="Foto Pria"
                    className="h-16 w-16 rounded-xl border object-cover"
                  />
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#0F2C23]/20 px-4 text-xs font-medium hover:bg-[#F3EFE6]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingField === 'groom' ? 'Mengunggah...' : 'Upload Foto Mempelai Pria'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadSingle('groom', e.target.files?.[0], (url) =>
                          setData((p) => ({ ...p, couple: { ...p.couple, groomPhoto: url } }))
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Mempelai Wanita</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Panggilan</label>
                    <input
                      type="text"
                      value={data.couple.brideNickname}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, brideNickname: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Lengkap &amp; Gelar</label>
                    <input
                      type="text"
                      value={data.couple.brideFullName}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, brideFullName: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Ayah</label>
                    <input
                      type="text"
                      value={data.couple.brideFather}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, brideFather: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Ibu</label>
                    <input
                      type="text"
                      value={data.couple.brideMother}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, brideMother: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <img
                    src={data.couple.bridePhoto}
                    alt="Foto Wanita"
                    className="h-16 w-16 rounded-xl border object-cover"
                  />
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#0F2C23]/20 px-4 text-xs font-medium hover:bg-[#F3EFE6]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingField === 'bride' ? 'Mengunggah...' : 'Upload Foto Mempelai Wanita'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadSingle('bride', e.target.files?.[0], (url) =>
                          setData((p) => ({ ...p, couple: { ...p.couple, bridePhoto: url } }))
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Couple Photo, Quotes & Typography Style */}
              <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5 space-y-4">
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">
                  Foto Pasangan, Tanggal &amp; Pengaturan Teks
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  {data.couple.couplePhoto && (
                    <img
                      src={data.couple.couplePhoto}
                      alt="Foto Pasangan"
                      className="h-20 w-28 rounded-xl border object-cover"
                    />
                  )}
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#0F2C23]/20 px-4 text-xs font-medium hover:bg-[#F3EFE6]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingField === 'couple' ? 'Mengunggah...' : 'Upload Foto Pasangan'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadSingle('couple', e.target.files?.[0], (url) =>
                          setData((p) => ({ ...p, couple: { ...p.couple, couplePhoto: url } }))
                        )
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Tanggal Nikah</label>
                    <input
                      type="date"
                      value={data.couple.weddingDate}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, weddingDate: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Posisi Teks Sampul</label>
                    <select
                      value={data.couple.textPosition}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, textPosition: e.target.value as any } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    >
                      <option value="top">Atas</option>
                      <option value="center">Tengah</option>
                      <option value="bottom">Bawah</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Ukuran Nama</label>
                    <select
                      value={data.couple.nameScale}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, nameScale: e.target.value as any } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    >
                      <option value="compact">Ringkas</option>
                      <option value="normal">Normal</option>
                      <option value="grand">Besar (Grand)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Gaya Nama</label>
                    <select
                      value={data.couple.nameStyle}
                      onChange={(e) =>
                        setData((p) => ({ ...p, couple: { ...p.couple, nameStyle: e.target.value as any } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    >
                      <option value="serif">Klasik Serif</option>
                      <option value="italic">Miring Elegan</option>
                      <option value="uppercase">Kapital Mewah</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Kata-kata Pembuka</label>
                  <textarea
                    rows={2}
                    value={data.couple.openingQuote}
                    onChange={(e) =>
                      setData((p) => ({ ...p, couple: { ...p.couple, openingQuote: e.target.value } }))
                    }
                    className="w-full rounded-xl border border-[#0F2C23]/15 p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Kata-kata Penutup</label>
                  <textarea
                    rows={2}
                    value={data.couple.closingQuote}
                    onChange={(e) =>
                      setData((p) => ({ ...p, couple: { ...p.couple, closingQuote: e.target.value } }))
                    }
                    className="w-full rounded-xl border border-[#0F2C23]/15 p-3 text-sm"
                  />
                </div>
              </div>

              {/* Love Story */}
              <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Cerita Perjalanan Cinta</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        couple: {
                          ...p.couple,
                          loveStory: [
                            ...p.couple.loveStory,
                            { year: '2026', title: 'Babak Baru', description: 'Momen spesial bersama.' },
                          ],
                        },
                      }))
                    }
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#0F2C23] px-3 text-xs font-medium text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Cerita</span>
                  </button>
                </div>

                {data.couple.loveStory.map((story, idx) => (
                  <div key={idx} className="grid gap-2 rounded-xl border border-[#0F2C23]/10 p-3 sm:grid-cols-[90px_1fr_auto]">
                    <input
                      type="text"
                      value={story.year}
                      onChange={(e) => {
                        const next = [...data.couple.loveStory];
                        next[idx] = { ...next[idx], year: e.target.value };
                        setData((p) => ({ ...p, couple: { ...p.couple, loveStory: next } }));
                      }}
                      placeholder="Tahun"
                      className="h-9 rounded-lg border border-[#0F2C23]/15 px-2.5 text-sm"
                    />
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={story.title}
                        onChange={(e) => {
                          const next = [...data.couple.loveStory];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setData((p) => ({ ...p, couple: { ...p.couple, loveStory: next } }));
                        }}
                        placeholder="Judul momen"
                        className="h-9 w-full rounded-lg border border-[#0F2C23]/15 px-2.5 text-sm font-medium"
                      />
                      <textarea
                        rows={2}
                        value={story.description}
                        onChange={(e) => {
                          const next = [...data.couple.loveStory];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setData((p) => ({ ...p, couple: { ...p.couple, loveStory: next } }));
                        }}
                        className="w-full rounded-lg border border-[#0F2C23]/15 p-2 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = data.couple.loveStory.filter((_, i) => i !== idx);
                        setData((p) => ({ ...p, couple: { ...p.couple, loveStory: next } }));
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TURUT MENGUNDANG */}
          {activeTab === 'turut' && (
            <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5 space-y-4">
              <div>
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Daftar Turut Mengundang</h3>
                <p className="text-xs text-[#5F6B65]">Tambah, ubah, hapus, dan atur urutan keluarga/kerabat yang turut mengundang.</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTurut}
                  onChange={(e) => setNewTurut(e.target.value)}
                  placeholder="Contoh: Keluarga Besar Bpk. H. Sulaiman"
                  className="h-10 flex-1 rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTurut.trim()) return;
                    setData((p) => ({ ...p, turutMengundang: [...p.turutMengundang, newTurut.trim()] }));
                    setNewTurut('');
                  }}
                  className="min-h-[40px] rounded-xl bg-[#0F2C23] px-4 text-xs font-semibold text-white"
                >
                  Tambah
                </button>
              </div>

              <div className="space-y-2">
                {data.turutMengundang.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-[#0F2C23]/10 p-2.5">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const next = [...data.turutMengundang];
                        next[idx] = e.target.value;
                        setData((p) => ({ ...p, turutMengundang: next }));
                      }}
                      className="h-9 flex-1 rounded-lg border border-transparent px-2 text-sm focus:border-[#0F2C23]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...data.turutMengundang];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setData((p) => ({ ...p, turutMengundang: next }));
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#0F2C23]/10 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === data.turutMengundang.length - 1}
                      onClick={() => {
                        const next = [...data.turutMengundang];
                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                        setData((p) => ({ ...p, turutMengundang: next }));
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#0F2C23]/10 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setData((p) => ({ ...p, turutMengundang: p.turutMengundang.filter((_, i) => i !== idx) }))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACARA & COUNTDOWN */}
          {activeTab === 'acara' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Hitung Mundur Real-Time</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Tanggal Target</label>
                    <input
                      type="date"
                      value={data.countdown.targetDate}
                      onChange={(e) =>
                        setData((p) => ({ ...p, countdown: { ...p.countdown, targetDate: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Jam Target</label>
                    <input
                      type="time"
                      value={data.countdown.targetTime}
                      onChange={(e) =>
                        setData((p) => ({ ...p, countdown: { ...p.countdown, targetTime: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Zona Waktu</label>
                    <select
                      value={data.countdown.timezone}
                      onChange={(e) =>
                        setData((p) => ({ ...p, countdown: { ...p.countdown, timezone: e.target.value } }))
                      }
                      className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                    >
                      <option value="Asia/Jakarta">WIB (Jakarta)</option>
                      <option value="Asia/Makassar">WITA (Makassar / Bali)</option>
                      <option value="Asia/Jayapura">WIT (Jayapura)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Rangkaian Acara</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        events: [
                          ...p.events,
                          {
                            id: `evt-${Date.now()}`,
                            type: 'Syukuran / Ngunduh Mantu',
                            date: data.countdown.targetDate,
                            startTime: '11:00',
                            endTime: '14:00',
                            venueName: 'Nama Gedung / Lokasi',
                            address: 'Alamat lengkap acara',
                            mapsUrl: 'https://maps.google.com',
                            directions: '',
                            dressCode: '',
                            liveStreamingEnabled: false,
                            videoLink: '',
                            scheduleNote: '',
                            parkingInfo: '',
                          },
                        ],
                      }))
                    }
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#0F2C23] px-4 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Acara</span>
                  </button>
                </div>

                {data.events.map((ev, idx) => (
                  <div key={ev.id} className="space-y-3 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#C6A259]">
                        Acara #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({ ...p, events: p.events.filter((item) => item.id !== ev.id) }))
                        }
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Acara (Akad/Resepsi)</label>
                        <input
                          type="text"
                          value={ev.type}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], type: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Tanggal Acara</label>
                        <input
                          type="date"
                          value={ev.date}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], date: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Jam Mulai</label>
                        <input
                          type="time"
                          value={ev.startTime}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], startTime: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Jam Selesai</label>
                        <input
                          type="time"
                          value={ev.endTime}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], endTime: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Nama Gedung</label>
                        <input
                          type="text"
                          value={ev.venueName}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], venueName: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Link Google Maps</label>
                        <input
                          type="url"
                          value={ev.mapsUrl}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], mapsUrl: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Alamat Lengkap</label>
                      <textarea
                        rows={2}
                        value={ev.address}
                        onChange={(e) => {
                          const next = [...data.events];
                          next[idx] = { ...next[idx], address: e.target.value };
                          setData((p) => ({ ...p, events: next }));
                        }}
                        className="w-full rounded-xl border border-[#0F2C23]/15 p-2.5 text-sm"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Petunjuk lokasi"
                        value={ev.directions}
                        onChange={(e) => {
                          const next = [...data.events];
                          next[idx] = { ...next[idx], directions: e.target.value };
                          setData((p) => ({ ...p, events: next }));
                        }}
                        className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Dress code"
                        value={ev.dressCode}
                        onChange={(e) => {
                          const next = [...data.events];
                          next[idx] = { ...next[idx], dressCode: e.target.value };
                          setData((p) => ({ ...p, events: next }));
                        }}
                        className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Jadwal acara / rundown"
                        value={ev.scheduleNote}
                        onChange={(e) => {
                          const next = [...data.events];
                          next[idx] = { ...next[idx], scheduleNote: e.target.value };
                          setData((p) => ({ ...p, events: next }));
                        }}
                        className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Informasi parkir"
                        value={ev.parkingInfo}
                        onChange={(e) => {
                          const next = [...data.events];
                          next[idx] = { ...next[idx], parkingInfo: e.target.value };
                          setData((p) => ({ ...p, events: next }));
                        }}
                        className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={ev.liveStreamingEnabled}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], liveStreamingEnabled: e.target.checked };
                            setData((p) => ({ ...p, events: next }));
                          }}
                        />
                        Aktifkan Live Streaming
                      </label>
                      {ev.liveStreamingEnabled && (
                        <input
                          type="url"
                          placeholder="Link Video Live Streaming (YouTube/Zoom)"
                          value={ev.videoLink}
                          onChange={(e) => {
                            const next = [...data.events];
                            next[idx] = { ...next[idx], videoLink: e.target.value };
                            setData((p) => ({ ...p, events: next }));
                          }}
                          className="h-9 flex-1 rounded-lg border border-[#0F2C23]/15 px-3 text-xs"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: MUSIK */}
          {activeTab === 'musik' && (
            <div className="space-y-5 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Musik Latar Undangan</h3>
                  <p className="text-xs text-[#5F6B65]">Upload MP3/WAV/OGG/M4A dari galeri HP Anda atau pilih musik bawaan.</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={data.music.enabled}
                    onChange={(e) => setData((p) => ({ ...p, music: { ...p.music, enabled: e.target.checked } }))}
                  />
                  Aktifkan Musik
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#0F2C23] px-4 text-xs font-semibold text-white hover:bg-[#1A4336]">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingField === 'music' ? 'Mengunggah Audio...' : 'Upload MP3 / Audio dari HP'}</span>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    className="hidden"
                    onChange={(e) =>
                      handleUploadSingle('music', e.target.files?.[0], (url, name) =>
                        setData((p) => ({
                          ...p,
                          music: { ...p.music, enabled: true, url, title: name.replace(/\.[^.]+$/, ''), artist: 'Custom Upload' },
                        }))
                      )
                    }
                  />
                </label>

                {data.music.url && (
                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({ ...p, music: { ...p.music, enabled: false, url: '', title: 'Tanpa Musik' } }))
                    }
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Lagu</span>
                  </button>
                )}
              </div>

              {data.music.url && (
                <div className="rounded-xl border border-[#0F2C23]/10 bg-[#FAF8F4] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F2C23]">{data.music.title}</span>
                    <span className="text-[#5F6B65]">{data.music.artist}</span>
                  </div>
                  <audio controls src={data.music.url} className="w-full" />
                  <div className="grid gap-4 pt-2 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#5F6B65]">
                        Volume ({Math.round(data.music.volume * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={data.music.volume}
                        onChange={(e) =>
                          setData((p) => ({ ...p, music: { ...p.music, volume: Number(e.target.value) } }))
                        }
                        className="w-full accent-[#0F2C23]"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={data.music.autoplay}
                        onChange={(e) =>
                          setData((p) => ({ ...p, music: { ...p.music, autoplay: e.target.checked } }))
                        }
                      />
                      Autoplay Saat Dibuka
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={data.music.loop}
                        onChange={(e) => setData((p) => ({ ...p, music: { ...p.music, loop: e.target.checked } }))}
                      />
                      Putar Berulang (Loop)
                    </label>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5F6B65]">
                  Pilihan Musik Bawaan RuangJanji
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {BUILTIN_MUSIC_TRACKS.map((trk) => {
                    const active = data.music.url === trk.url;
                    return (
                      <button
                        key={trk.id}
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            music: { ...p.music, enabled: true, url: trk.url, title: trk.title, artist: trk.artist },
                          }))
                        }
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          active ? 'border-[#C6A259] bg-[#FAF8F4]' : 'border-[#0F2C23]/10 hover:bg-[#F3EFE6]/50'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#0F2C23]">{trk.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#5F6B65]">{trk.artist}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GALERI FOTO & VIDEO */}
          {activeTab === 'galeri' && (
            <div className="space-y-5 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Galeri Foto &amp; Video</h3>
                  <p className="text-xs text-[#5F6B65]">Upload banyak foto sekaligus (otomatis dioptimasi) atau video MP4/WEBM.</p>
                </div>

                <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-[#0F2C23] px-4 text-xs font-semibold text-white hover:bg-[#1A4336]">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingField === 'gallery' ? 'Mengunggah...' : 'Upload Foto / Video'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => handleUploadGalleryBatch(e.target.files)}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="Atau tempel URL video MP4 langsung..."
                  className="h-10 flex-1 rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!videoUrlInput.trim()) return;
                    setData((p) => ({
                      ...p,
                      gallery: [
                        ...p.gallery,
                        {
                          id: `gal-${Date.now()}`,
                          type: 'video',
                          url: videoUrlInput.trim(),
                          caption: 'Video Prewedding',
                          order: p.gallery.length + 1,
                        },
                      ],
                    }));
                    setVideoUrlInput('');
                  }}
                  className="min-h-[40px] rounded-xl border border-[#0F2C23]/20 px-4 text-xs font-semibold"
                >
                  Tambah Video
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {data.gallery
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((item, idx, arr) => (
                    <div key={item.id} className="overflow-hidden rounded-2xl border border-[#0F2C23]/10 bg-[#FAF8F4]">
                      {item.type === 'video' ? (
                        <video src={item.url} controls className="aspect-[4/3] w-full bg-black object-cover" />
                      ) : (
                        <img src={item.url} alt={item.caption} className="aspect-[4/3] w-full object-cover" />
                      )}
                      <div className="space-y-2 p-3">
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => {
                            const next = data.gallery.map((g) =>
                              g.id === item.id ? { ...g, caption: e.target.value } : g
                            );
                            setData((p) => ({ ...p, gallery: next }));
                          }}
                          placeholder="Keterangan foto..."
                          className="h-8 w-full rounded-lg border border-[#0F2C23]/15 bg-white px-2.5 text-xs"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const sorted = [...arr];
                                [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
                                setData((p) => ({
                                  ...p,
                                  gallery: sorted.map((s, i) => ({ ...s, order: i + 1 })),
                                }));
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === arr.length - 1}
                              onClick={() => {
                                const sorted = [...arr];
                                [sorted[idx + 1], sorted[idx]] = [sorted[idx], sorted[idx + 1]];
                                setData((p) => ({
                                  ...p,
                                  gallery: sorted.map((s, i) => ({ ...s, order: i + 1 })),
                                }));
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setData((p) => ({ ...p, gallery: p.gallery.filter((g) => g.id !== item.id) }))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 7: AMPLOP DIGITAL & TRANSFER */}
          {activeTab === 'amplop' && (
            <div className="space-y-5 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Amplop Digital &amp; Hadiah</h3>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={data.gifts.enabled}
                    onChange={(e) => setData((p) => ({ ...p, gifts: { ...p.gifts, enabled: e.target.checked } }))}
                  />
                  Tampilkan Bagian Hadiah
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Pesan Hadiah</label>
                <textarea
                  rows={2}
                  value={data.gifts.message}
                  onChange={(e) => setData((p) => ({ ...p, gifts: { ...p.gifts, message: e.target.value } }))}
                  className="w-full rounded-xl border border-[#0F2C23]/15 p-3 text-sm"
                />
              </div>

              {/* Bank Accounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#5F6B65]">Daftar Rekening Bank</span>
                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        gifts: {
                          ...p.gifts,
                          banks: [
                            ...p.gifts.banks,
                            { id: `bank-${Date.now()}`, bankName: 'BRI', accountNumber: '', accountHolder: '' },
                          ],
                        },
                      }))
                    }
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-[#0F2C23] px-3 text-xs font-medium text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Bank
                  </button>
                </div>

                {data.gifts.banks.map((bank, idx) => (
                  <div key={bank.id} className="grid gap-2 rounded-xl border border-[#0F2C23]/10 p-3 sm:grid-cols-4">
                    <select
                      value={['BCA', 'BRI', 'BNI', 'Mandiri', 'BSI'].includes(bank.bankName) ? bank.bankName : 'Lainnya'}
                      onChange={(e) => {
                        const val = e.target.value === 'Lainnya' ? 'Bank Lainnya' : e.target.value;
                        const next = [...data.gifts.banks];
                        next[idx] = { ...next[idx], bankName: val };
                        setData((p) => ({ ...p, gifts: { ...p.gifts, banks: next } }));
                      }}
                      className="h-9 rounded-lg border border-[#0F2C23]/15 px-2 text-xs"
                    >
                      <option value="BCA">BCA</option>
                      <option value="BRI">BRI</option>
                      <option value="BNI">BNI</option>
                      <option value="Mandiri">Mandiri</option>
                      <option value="BSI">BSI</option>
                      <option value="Lainnya">Bank Lainnya</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Nama Bank"
                      value={bank.bankName}
                      onChange={(e) => {
                        const next = [...data.gifts.banks];
                        next[idx] = { ...next[idx], bankName: e.target.value };
                        setData((p) => ({ ...p, gifts: { ...p.gifts, banks: next } }));
                      }}
                      className="h-9 rounded-lg border border-[#0F2C23]/15 px-2.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Nomor Rekening"
                      value={bank.accountNumber}
                      onChange={(e) => {
                        const next = [...data.gifts.banks];
                        next[idx] = { ...next[idx], accountNumber: e.target.value };
                        setData((p) => ({ ...p, gifts: { ...p.gifts, banks: next } }));
                      }}
                      className="h-9 rounded-lg border border-[#0F2C23]/15 px-2.5 text-xs tabular-nums"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Atas Nama"
                        value={bank.accountHolder}
                        onChange={(e) => {
                          const next = [...data.gifts.banks];
                          next[idx] = { ...next[idx], accountHolder: e.target.value };
                          setData((p) => ({ ...p, gifts: { ...p.gifts, banks: next } }));
                        }}
                        className="h-9 flex-1 rounded-lg border border-[#0F2C23]/15 px-2.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            gifts: { ...p.gifts, banks: p.gifts.banks.filter((b) => b.id !== bank.id) },
                          }))
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* QRIS & Physical Gift */}
              <div className="grid gap-4 border-t border-[#0F2C23]/10 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#5F6B65]">Gambar QRIS</label>
                  <div className="flex items-center gap-3">
                    {data.gifts.qrisImageUrl && (
                      <img src={data.gifts.qrisImageUrl} alt="QRIS" className="h-16 w-16 rounded-lg border object-contain" />
                    )}
                    <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-3 text-xs font-medium">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingField === 'qris' ? 'Mengunggah...' : 'Upload QRIS'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleUploadSingle('qris', e.target.files?.[0], (url) =>
                            setData((p) => ({ ...p, gifts: { ...p.gifts, qrisImageUrl: url } }))
                          )
                        }
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Label QRIS"
                    value={data.gifts.qrisLabel}
                    onChange={(e) => setData((p) => ({ ...p, gifts: { ...p.gifts, qrisLabel: e.target.value } }))}
                    className="h-9 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#5F6B65]">Nomor WhatsApp Konfirmasi (628...)</label>
                  <input
                    type="text"
                    value={data.gifts.whatsappNumber}
                    onChange={(e) => setData((p) => ({ ...p, gifts: { ...p.gifts, whatsappNumber: e.target.value } }))}
                    className="h-9 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-xs"
                  />
                  <label className="block text-xs font-medium text-[#5F6B65]">Nama Penerima Kado Fisik</label>
                  <input
                    type="text"
                    value={data.gifts.recipientName}
                    onChange={(e) => setData((p) => ({ ...p, gifts: { ...p.gifts, recipientName: e.target.value } }))}
                    className="h-9 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-xs"
                  />
                  <textarea
                    rows={2}
                    placeholder="Alamat penerima kado"
                    value={data.gifts.recipientAddress}
                    onChange={(e) =>
                      setData((p) => ({ ...p, gifts: { ...p.gifts, recipientAddress: e.target.value } }))
                    }
                    className="w-full rounded-xl border border-[#0F2C23]/15 p-2.5 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: EDITOR DESAIN VISUAL */}
          {activeTab === 'desain' && (
            <div className="space-y-5 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">Editor Desain Visual</h3>
                  <p className="text-xs text-[#5F6B65]">Ubah tipografi, warna, bingkai, ornamen, animasi, dan tata letak secara langsung.</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={historyIdx <= 0}
                    onClick={handleUndoDesign}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#0F2C23]/15 px-2.5 text-xs font-medium disabled:opacity-40"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </button>
                  <button
                    type="button"
                    disabled={historyIdx >= history.length - 1}
                    onClick={handleRedoDesign}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#0F2C23]/15 px-2.5 text-xs font-medium disabled:opacity-40"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                    Redo
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDesign}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#0F2C23]/15 px-2.5 text-xs font-medium hover:bg-[#F3EFE6]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              {/* 10 Template Gaya Desain Eksklusif */}
              <div className="space-y-2 border-b border-[#0F2C23]/10 pb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5F6B65]">
                  Pilih 10 Gaya Tampilan Undangan
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {TEMPLATE_PRESET_LIST.map((preset: TemplateStyleSpec) => {
                    const isSelected = (data.design.templatePreset || 'emerald-ivory') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          updateDesign({
                            templatePreset: preset.id,
                            backgroundColor: preset.canvasBg,
                            fontColor: preset.headingColor,
                            accentColor: preset.accentColor,
                            headingFont: preset.defaultHeadingFont,
                            bodyFont: preset.defaultBodyFont,
                            ornamentStyle: preset.defaultOrnament,
                            photoFrame: preset.defaultFrame,
                          })
                        }
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-[#0F2C23] bg-[#FAF8F4] ring-1 ring-[#C6A259]'
                            : 'border-[#0F2C23]/15 hover:border-[#C6A259]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#0F2C23]">{preset.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[#5F6B65]">{preset.subtitle}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span
                            className="h-4 w-4 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.canvasBg }}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.primaryBg }}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Warna Latar</label>
                  <input
                    type="color"
                    value={data.design.backgroundColor}
                    onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-xl border border-[#0F2C23]/15 p-1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Warna Teks</label>
                  <input
                    type="color"
                    value={data.design.fontColor}
                    onChange={(e) => updateDesign({ fontColor: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-xl border border-[#0F2C23]/15 p-1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Warna Aksen (Gold/Emerald)</label>
                  <input
                    type="color"
                    value={data.design.accentColor}
                    onChange={(e) => updateDesign({ accentColor: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-xl border border-[#0F2C23]/15 p-1"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Jenis Font Judul (Serif)</label>
                  <select
                    value={data.design.headingFont}
                    onChange={(e) => updateDesign({ headingFont: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                    <option value="Bodoni Moda">Bodoni Moda</option>
                    <option value="Cinzel">Cinzel</option>
                    <option value="Fraunces">Fraunces</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Jenis Font Isi</label>
                  <select
                    value={data.design.bodyFont}
                    onChange={(e) => updateDesign({ bodyFont: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="DM Sans">DM Sans</option>
                    <option value="Lora">Lora Serif</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Ukuran Teks</label>
                  <select
                    value={data.design.textSize}
                    onChange={(e) => updateDesign({ textSize: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="sm">Kecil</option>
                    <option value="md">Sedang</option>
                    <option value="lg">Besar</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Perataan Teks</label>
                  <select
                    value={data.design.textAlign}
                    onChange={(e) => updateDesign({ textAlign: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="center">Tengah</option>
                    <option value="left">Kiri</option>
                    <option value="right">Kanan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Jarak Elemen</label>
                  <select
                    value={data.design.spacing}
                    onChange={(e) => updateDesign({ spacing: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="compact">Rapat</option>
                    <option value="normal">Standar</option>
                    <option value="airy">Lega (Airy)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Ornamen</label>
                  <select
                    value={data.design.ornamentStyle}
                    onChange={(e) => updateDesign({ ornamentStyle: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="floral-gold">Floral &amp; Emas</option>
                    <option value="botanical">Botanical</option>
                    <option value="classic-frame">Bingkai Klasik</option>
                    <option value="minimal">Minimalis</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Bingkai Foto</label>
                  <select
                    value={data.design.photoFrame}
                    onChange={(e) => updateDesign({ photoFrame: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="arch">Arch / Kubah</option>
                    <option value="oval">Oval</option>
                    <option value="circle">Lingkaran</option>
                    <option value="rounded">Rounded</option>
                    <option value="square">Kotak Tegas</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Transisi Pembuka</label>
                  <select
                    value={data.design.pageTransition}
                    onChange={(e) => updateDesign({ pageTransition: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="curtain">Tirai Ke Atas</option>
                    <option value="slide">Geser Samping</option>
                    <option value="fade">Fade Halus</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Gaya Tombol</label>
                  <select
                    value={data.design.buttonStyle}
                    onChange={(e) => updateDesign({ buttonStyle: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="solid">Solid Champagne</option>
                    <option value="glass">Glass Blur</option>
                    <option value="outline">Garis Tepi</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Efek Animasi Foto</label>
                  <select
                    value={data.design.animationEffect}
                    onChange={(e) => updateDesign({ animationEffect: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="fade-up">Fade Halus</option>
                    <option value="gentle-zoom">Zoom Sinematik</option>
                    <option value="silk-reveal">Silk Reveal</option>
                    <option value="none">Tanpa Animasi</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">Layout Desktop/Tablet</label>
                  <select
                    value={data.design.layoutMode}
                    onChange={(e) => updateDesign({ layoutMode: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-[#0F2C23]/15 px-3 text-sm"
                  >
                    <option value="editorial">Editorial Mobile</option>
                    <option value="centered">Centered Classic</option>
                    <option value="split">Split 2-Kolom</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 border-t border-[#0F2C23]/10 pt-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5F6B65]">
                    Transparansi Overlay Foto ({Math.round(data.design.overlayOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.15}
                    max={0.85}
                    step={0.05}
                    value={data.design.overlayOpacity}
                    onChange={(e) => updateDesign({ overlayOpacity: Number(e.target.value) })}
                    className="w-full accent-[#0F2C23]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-3 text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Ganti Foto Latar Kustom</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadSingle('bgOverride', e.target.files?.[0], (url) =>
                          updateDesign({ backgroundImageOverride: url })
                        )
                      }
                    />
                  </label>
                  {data.design.backgroundImageOverride && (
                    <button
                      type="button"
                      onClick={() => updateDesign({ backgroundImageOverride: '' })}
                      className="text-xs text-red-600 underline"
                    >
                      Gunakan Foto Tema ({currentTheme.name})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: DAFTAR TAMU, QR CODE, BAGIKAN & MODERASI RSVP */}
          {activeTab === 'tamu' && (
            <div className="space-y-6">
              {/* QR Code, Share & Downloads */}
              <div className="grid gap-5 rounded-2xl border border-[#0F2C23]/10 bg-white p-5 sm:grid-cols-[170px_1fr]">
                <div className="text-center">
                  <img src={qrUrl} alt="QR Code Undangan" className="mx-auto h-40 w-40 rounded-xl border p-1.5" />
                  <a
                    href={`${qrUrl}&download=1`}
                    download={`qr-${slug || invitation.slug}.png`}
                    className="mt-2 inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#0F2C23]/20 text-xs font-medium hover:bg-[#F3EFE6]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </a>
                </div>

                <div className="space-y-3">
                  <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">
                    Publikasi, Download &amp; Bagikan
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="h-10 flex-1 rounded-xl border border-[#0F2C23]/15 bg-[#FAF8F4] px-3 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(publicUrl);
                        showToast('Link undangan disalin!');
                      }}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#0F2C23] px-3.5 text-xs font-semibold text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Salin
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i ke acara pernikahan ${data.couple.groomNickname} & ${data.couple.brideNickname}. Buka undangan: ${publicUrl}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#1A4336] px-3.5 text-xs font-medium text-white"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(
                        `Undangan Pernikahan ${data.couple.groomNickname} & ${data.couple.brideNickname}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-3.5 text-xs font-medium"
                    >
                      Telegram
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-3.5 text-xs font-medium"
                    >
                      Facebook
                    </a>
                    <a
                      href={data.couple.couplePhoto || currentTheme.imageUrl}
                      download={`foto-undangan-${slug}.jpg`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-3.5 text-xs font-medium"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Foto
                    </a>
                    <button
                      type="button"
                      disabled={downloadingHtml}
                      onClick={handleDownloadHtml}
                      className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C6A259] bg-[#FAF8F4] px-3.5 text-xs font-semibold text-[#0F2C23] hover:bg-[#F3EFE6] disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{downloadingHtml ? 'Mengunduh HTML...' : 'Download HTML Mandiri'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Personalized Guest List & Excel Import/Export */}
              <div className="space-y-4 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">
                      Daftar Tamu Personal ({guests.length})
                    </h3>
                    <p className="text-xs text-[#5F6B65]">Setiap tamu mendapat link khusus ?to=NamaTamu</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleImportExcel}
                    />
                    <button
                      type="button"
                      onClick={() => excelInputRef.current?.click()}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0F2C23]/20 px-3 text-xs font-medium hover:bg-[#F3EFE6]"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Import Excel
                    </button>
                    <button
                      type="button"
                      disabled={downloadingExcel}
                      onClick={handleExportExcel}
                      className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#0F2C23]/20 px-3 text-xs font-medium hover:bg-[#F3EFE6] disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{downloadingExcel ? 'Menyiapkan...' : 'Export Excel'}</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddGuest} className="grid gap-2 sm:grid-cols-5">
                  <input
                    type="text"
                    required
                    placeholder="Nama tamu (mis. Bapak Ahmad)"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-xs sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="No. WhatsApp"
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                    className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Grup"
                    value={newGuestGroup}
                    onChange={(e) => setNewGuestGroup(e.target.value)}
                    className="h-10 rounded-xl border border-[#0F2C23]/15 px-3 text-xs"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] rounded-xl bg-[#0F2C23] px-3 text-xs font-semibold text-white"
                  >
                    + Tambah Tamu
                  </button>
                </form>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#0F2C23]/10 rounded-xl border border-[#0F2C23]/10 thin-scrollbar">
                  {guests.length === 0 ? (
                    <p className="p-6 text-center text-xs text-[#5F6B65]">Belum ada tamu di daftar.</p>
                  ) : (
                    guests.map((g) => {
                      const personalUrl = `${publicUrl}?to=${encodeURIComponent(g.name)}`;
                      return (
                        <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#17201C]">{g.name}</p>
                            <p className="text-[11px] text-[#5F6B65]">
                              {g.groupName} · {g.pax} orang {g.phone ? `· ${g.phone}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(personalUrl);
                                showToast(`Link personal untuk ${g.name} disalin.`);
                              }}
                              className="rounded-lg border border-[#0F2C23]/15 px-2.5 py-1.5 font-medium hover:bg-[#F3EFE6]"
                            >
                              Salin Link
                            </button>
                            <a
                              href={`https://wa.me/${g.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Kepada Yth. ${g.name},\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk menghadiri acara pernikahan ${data.couple.groomNickname} & ${data.couple.brideNickname}.\n\nBuka undangan digital:\n${personalUrl}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#1A4336] px-2.5 py-1.5 font-medium text-white"
                            >
                              Kirim WA
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                await api.admin.deleteGuest(g.id);
                                setGuests((prev) => prev.filter((x) => x.id !== g.id));
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RSVP & Wish Moderation */}
              <div className="space-y-3 rounded-2xl border border-[#0F2C23]/10 bg-white p-5">
                <h3 className="font-serif-display text-lg font-semibold text-[#0F2C23]">
                  Moderasi RSVP &amp; Ucapan Tamu ({wishes.length})
                </h3>
                <div className="divide-y divide-[#0F2C23]/10 rounded-xl border border-[#0F2C23]/10">
                  {wishes.length === 0 ? (
                    <p className="p-6 text-center text-xs text-[#5F6B65]">Belum ada ucapan dari tamu.</p>
                  ) : (
                    wishes.map((w) => (
                      <div key={w.id} className="flex flex-wrap items-start justify-between gap-3 p-3.5 text-xs">
                        <div className="max-w-lg space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-[#17201C]">{w.guestName}</strong>
                            <span className="text-[11px] text-[#9E7C38]">
                              · {w.attendance.replace('_', ' ')} ({w.guestCount} org)
                            </span>
                            <span className="text-[11px] text-[#5F6B65]">
                              · {w.isApproved ? 'Ditampilkan' : 'Disembunyikan'}
                            </span>
                          </div>
                          <p className="text-[#5F6B65]">{w.message}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.admin.moderateWish(w.id, !w.isApproved);
                              setWishes((prev) =>
                                prev.map((x) => (x.id === w.id ? { ...x, isApproved: !w.isApproved } : x))
                              );
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#0F2C23]/15 px-2.5 hover:bg-[#F3EFE6]"
                          >
                            {w.isApproved ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            <span>{w.isApproved ? 'Sembunyikan' : 'Tampilkan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.admin.deleteWish(w.id);
                              setWishes((prev) => prev.filter((x) => x.id !== w.id));
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: LIVE IPHONE / ANDROID / TABLET / DESKTOP PREVIEW */}
        <aside
          className={`flex flex-col items-center bg-[#EFEAE0] p-4 ${
            mobilePane === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="mb-3 flex w-full flex-wrap items-center justify-center gap-1 rounded-xl bg-white/80 p-1">
            {(
              [
                { id: 'iphone-390', icon: <Smartphone className="h-3 w-3" />, label: '390×844' },
                { id: 'iphone-393', icon: <Smartphone className="h-3 w-3" />, label: '393×852' },
                { id: 'android-360', icon: <Smartphone className="h-3 w-3" />, label: '360×800' },
                { id: 'android-412', icon: <Smartphone className="h-3 w-3" />, label: '412×915' },
                { id: 'tablet', icon: <Tablet className="h-3 w-3" />, label: 'Tablet' },
                { id: 'desktop', icon: <Monitor className="h-3 w-3" />, label: 'Desktop' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setPreviewDevice(d.id)}
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors ${
                  previewDevice === d.id ? 'bg-[#0F2C23] text-white' : 'text-[#5F6B65] hover:bg-[#F3EFE6]'
                }`}
              >
                {d.icon}
                <span className="tabular-nums">{d.label}</span>
              </button>
            ))}
          </div>

          <div
            style={{ width: devSpec.width, height: devSpec.height, maxWidth: '100%' }}
            className={`relative overflow-hidden bg-white shadow-2xl transition-all duration-300 ${
              devSpec.isMobile ? 'rounded-[42px] border-[8px] border-[#1A1D1B]' : 'rounded-2xl border border-[#0F2C23]/15'
            }`}
          >
            {devSpec.isMobile && (
              <div className="pointer-events-none absolute left-1/2 top-2 z-40 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
            )}
            <InvitationView
              invitation={liveRecord}
              initialWishes={wishes}
              guestName="Bapak Ahmad"
              embeddedPreview
              isMobileViewport={devSpec.isMobile}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
