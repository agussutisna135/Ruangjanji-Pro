import React, { useEffect, useState } from 'react';
import { ArrowRight, Download, ExternalLink, Lock } from 'lucide-react';
import { api, formatIndonesianDate } from '../lib/api.ts';
import { getTemplateStyleSpec } from '../shared/templateStyles.ts';
import { getThemeById, THEMES } from '../shared/themes.ts';
import { InvitationRecord, ThemeItem } from '../shared/types.ts';
import { getFontClass } from './Ornaments.tsx';
import { ThemeGallery } from './ThemeGallery.tsx';

interface LandingPageProps {
  onOpenAdmin: () => void;
  onOpenInvitation: (slug: string) => void;
}

export function LandingPage({ onOpenAdmin, onOpenInvitation }: LandingPageProps) {
  const [published, setPublished] = useState<InvitationRecord[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [themes, setThemes] = useState<ThemeItem[]>(THEMES.slice(0, 100));
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  useEffect(() => {
    setLoadingInvitations(true);
    api.publicInvitations
      .list()
      .then((rows) => setPublished(rows.slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoadingInvitations(false));

    api.publicInvitations
      .themes()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setThemes(rows.slice(0, 100));
        }
      })
      .catch(() => {});
  }, []);

  const featuredInv = published[0];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadSampleHtml = async (inv: InvitationRecord) => {
    setDownloadingSlug(inv.slug);
    try {
      await api.publicInvitations.exportHtml(inv.slug);
      setDownloadToast(`File "contoh-undangan.html" (${inv.title}) berhasil diunduh.`);
    } catch (err: any) {
      setDownloadToast(err?.message || 'Gagal mengunduh file HTML undangan.');
    } finally {
      setDownloadingSlug(null);
      setTimeout(() => setDownloadToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#17201C]">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#0F2C23]/10 bg-[#FAF8F4]/95 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8">
          <a href="/" className="shrink-0 whitespace-nowrap font-serif-display text-lg font-semibold text-[#0F2C23]">
            RUANGJANJI PRO
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#5F6B65] md:flex">
            <a href="#undangan" className="whitespace-nowrap transition-colors hover:text-[#0F2C23]">
              10 Contoh Undangan
            </a>
            <a href="#tema" className="whitespace-nowrap transition-colors hover:text-[#0F2C23]">
              100 Contoh Tema
            </a>
            <a href="#keunggulan" className="whitespace-nowrap transition-colors hover:text-[#0F2C23]">
              Pengalaman Tamu
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('undangan')}
              className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl bg-[#0F2C23] px-4 py-2 text-xs font-semibold text-[#FAF8F4] transition-colors hover:bg-[#1A4336]"
            >
              <span>Jelajahi Contoh</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#C6A259]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Split */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9E7C38]">
            Create Your Beautiful Moments
          </p>
          <h1 className="text-balance font-serif-display text-4xl font-semibold leading-[1.12] text-[#0F2C23] sm:text-5xl lg:text-[52px]">
            Galeri 100 Tema Foto &amp; 10 Gaya Undangan Pernikahan
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[#5F6B65]">
            Etalase resmi RUANGJANJI PRO bagi pengunjung untuk melihat pratinjau langsung 100 tema fotografi premium
            serta mencoba 10 contoh undangan pernikahan dengan tampilan tata letak, warna, dan tipografi berbeda.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[#5F6B65] tabular-nums">
            <span className="text-[#0F2C23]">100 Tema Foto Asli</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#0F2C23]">10 Gaya Desain Berbeda</span>
            <span aria-hidden="true">·</span>
            <span>Mode Pratinjau Pengunjung</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => scrollToSection('undangan')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#0F2C23] px-7 py-3 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#1A4336]"
            >
              <span>Lihat 10 Contoh Undangan</span>
              <ArrowRight className="h-4 w-4 text-[#C6A259]" />
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('tema')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[#0F2C23]/20 bg-white px-6 py-3 text-sm font-semibold text-[#0F2C23] transition-colors hover:border-[#C6A259] hover:bg-[#F3EFE6]"
            >
              <span>Jelajahi 100 Tema</span>
            </button>
            {featuredInv && (
              <button
                type="button"
                disabled={downloadingSlug === featuredInv.slug}
                onClick={() => handleDownloadSampleHtml(featuredInv)}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[#C6A259] bg-[#FAF8F4] px-6 py-3 text-sm font-semibold text-[#0F2C23] transition-colors hover:bg-[#F3EFE6] disabled:opacity-60"
              >
                <Download className="h-4 w-4 text-[#9E7C38]" />
                <span>
                  {downloadingSlug === featuredInv.slug ? 'Mengunduh...' : 'Download HTML Contoh Undangan'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Authentic iPhone Showcase Frame */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-[340px] overflow-hidden rounded-[44px] border-[8px] border-[#17201C] bg-black shadow-2xl">
            <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
            <div className="relative aspect-[9/16] w-full">
              <img
                src={
                  featuredInv
                    ? getThemeById(featuredInv.themeId).imageUrl
                    : themes[20]?.imageUrl || THEMES[20].imageUrl
                }
                alt="Contoh Tampilan Undangan iPhone"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
              <div className="absolute inset-0 flex flex-col items-center justify-between px-6 py-12 text-center text-white">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#F5E8CE]">The Wedding Of</p>
                  <h2 className="mt-2 font-serif-display text-3xl font-semibold">
                    {featuredInv
                      ? `${featuredInv.data.couple.groomNickname} & ${featuredInv.data.couple.brideNickname}`
                      : 'Aditya & Kirana'}
                  </h2>
                  <p className="mt-1.5 text-xs text-white/85">
                    {featuredInv ? formatIndonesianDate(featuredInv.data.couple.weddingDate) : 'Sabtu, 19 Juni 2027'}
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <div className="rounded-2xl border border-white/25 bg-[#0F2C23]/55 px-4 py-3 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-widest text-white/75">Kepada Yth.</p>
                    <p className="mt-0.5 text-sm font-medium">Bapak Ahmad &amp; Keluarga</p>
                  </div>
                  {featuredInv && (
                    <button
                      type="button"
                      onClick={() => onOpenInvitation(featuredInv.slug)}
                      className="min-h-[44px] w-full rounded-full bg-[#C6A259] text-xs font-semibold uppercase tracking-widest text-[#0F2C23] transition-transform active:scale-[0.98]"
                    >
                      Buka Undangan
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Published Wedding Invitation Examples — Each with Unique Aesthetic */}
      <section id="undangan" className="border-t border-[#0F2C23]/10 bg-white py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9E7C38]">
                Contoh Undangan Langsung
              </p>
              <h2 className="mt-1 font-serif-display text-3xl font-semibold text-[#0F2C23]">
                10 Gaya Tampilan Undangan Pernikahan
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#5F6B65]">
                Setiap contoh undangan dirancang dengan identitas visual berbeda — dari Emerald Sanctuary hingga
                Obsidian Gold, Château Rose Silk, Editorial Noir, Keraton Heritage, dan Santorini Azure.
              </p>
            </div>
            <p className="text-xs font-medium text-[#5F6B65] tabular-nums">
              Menampilkan {published.length} dari 10 gaya undangan
            </p>
          </div>

          {loadingInvitations ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-80 animate-pulse rounded-2xl border border-[#0F2C23]/10 bg-[#FAF8F4]"
                />
              ))}
            </div>
          ) : published.length === 0 ? (
            <p className="mt-6 text-sm text-[#5F6B65]">Belum ada contoh undangan yang diterbitkan.</p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {published.slice(0, 10).map((inv, index) => {
                const theme = getThemeById(inv.themeId);
                const mainEvent = inv.data.events?.[0];
                const tpl = getTemplateStyleSpec(inv.data.design?.templatePreset);
                const headingFontClass = getFontClass(inv.data.design?.headingFont || tpl.defaultHeadingFont);
                return (
                  <article
                    key={inv.id}
                    className={`group flex flex-col overflow-hidden border transition-transform duration-300 hover:-translate-y-0.5 ${
                      tpl.id === 'editorial-monochrome' ? 'rounded-none' : 'rounded-2xl'
                    }`}
                    style={{
                      backgroundColor: tpl.canvasBg,
                      borderColor: tpl.cardBorder,
                    }}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <img
                        src={theme.imageUrl || inv.data.couple.couplePhoto}
                        alt={inv.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs text-white">
                        <span className="truncate font-medium tabular-nums">
                          Gaya #{String(index + 1).padStart(2, '0')} · {tpl.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                          <span
                            className="h-3 w-3 rounded-full border border-white/60"
                            style={{ backgroundColor: tpl.primaryBg }}
                          />
                          <span
                            className="h-3 w-3 rounded-full border border-white/60"
                            style={{ backgroundColor: tpl.accentColor }}
                          />
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                      <div>
                        <p className="text-[11px] font-medium tabular-nums" style={{ color: tpl.accentColor }}>
                          {formatIndonesianDate(inv.data.couple.weddingDate)}
                          {mainEvent?.venueName ? ` · ${mainEvent.venueName}` : ''}
                        </p>
                        <h3 className={`mt-1.5 text-xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                          {inv.title}
                        </h3>
                        <p className="mt-1 text-xs" style={{ color: tpl.mutedColor }}>
                          {tpl.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenInvitation(inv.slug)}
                          style={{
                            backgroundColor: tpl.primaryBg,
                            color: tpl.primaryText,
                          }}
                          className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 text-xs font-semibold transition-opacity hover:opacity-90 ${
                            tpl.id === 'editorial-monochrome' ? 'rounded-none' : 'rounded-xl'
                          }`}
                        >
                          <span>Buka Undangan</span>
                          <ExternalLink className="h-3.5 w-3.5" style={{ color: tpl.isDark ? tpl.primaryText : tpl.accentColor }} />
                        </button>

                        <button
                          type="button"
                          disabled={downloadingSlug === inv.slug}
                          onClick={() => handleDownloadSampleHtml(inv)}
                          title="Download HTML Contoh Undangan"
                          style={{
                            borderColor: tpl.cardBorder,
                            color: tpl.headingColor,
                            backgroundColor: tpl.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
                          }}
                          className={`inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border px-3.5 text-xs font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 ${
                            tpl.id === 'editorial-monochrome' ? 'rounded-none' : 'rounded-xl'
                          }`}
                        >
                          <Download className="h-3.5 w-3.5" style={{ color: tpl.accentColor }} />
                          <span>{downloadingSlug === inv.slug ? 'Mengunduh...' : 'Download HTML'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 100 Read-Only Theme Examples */}
      <section id="tema" className="border-t border-[#0F2C23]/10 py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <ThemeGallery readOnly themes={themes} />
        </div>
      </section>

      {/* Capabilities / Visitor Scope */}
      <section id="keunggulan" className="border-t border-[#0F2C23]/10 bg-white py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9E7C38]">Pengalaman Pengunjung</p>
          <h2 className="mt-2 font-serif-display text-3xl font-semibold text-[#0F2C23]">
            Dirancang Khusus untuk Standar Undangan Butik
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="space-y-2 border-t border-[#0F2C23]/15 pt-5">
              <h3 className="font-serif-display text-xl font-semibold text-[#0F2C23]">
                01. Pratinjau 100 Tema Fotografi
              </h3>
              <p className="text-sm leading-relaxed text-[#5F6B65]">
                Pengunjung dapat menyaring, mencari, dan melihat pratinjau sampul iPhone dari 100 tema foto asli di 5
                kategori tanpa akses pengeditan.
              </p>
            </div>
            <div className="space-y-2 border-t border-[#0F2C23]/15 pt-5">
              <h3 className="font-serif-display text-xl font-semibold text-[#0F2C23]">
                02. 10 Contoh Undangan Interaktif
              </h3>
              <p className="text-sm leading-relaxed text-[#5F6B65]">
                Tersedia 10 undangan pernikahan lengkap dengan musik latar, hitung mundur, detail acara, galeri foto,
                amplop digital, dan buku tamu RSVP.
              </p>
            </div>
            <div className="space-y-2 border-t border-[#0F2C23]/15 pt-5">
              <h3 className="font-serif-display text-xl font-semibold text-[#0F2C23]">
                03. Hak Editor Eksklusif Pemilik
              </h3>
              <p className="text-sm leading-relaxed text-[#5F6B65]">
                Seluruh pengelolaan desain, pengunggahan media, daftar tamu Excel, dan moderasi RSVP dilindungi sesi
                autentikasi administrator server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer with discreet Administrator link */}
      <footer className="border-t border-[#0F2C23]/10 py-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 text-xs text-[#5F6B65] sm:flex-row">
          <span>RUANGJANJI PRO — Create Your Beautiful Moments</span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5F6B65] underline-offset-4 transition-colors hover:text-[#0F2C23] hover:underline"
          >
            <Lock className="h-3 w-3" />
            <span>Portal Administrator</span>
          </button>
        </div>
      </footer>

      {downloadToast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0F2C23] px-5 py-2.5 text-xs font-medium text-[#FAF8F4] shadow-xl">
          {downloadToast}
        </div>
      )}
    </div>
  );
}
