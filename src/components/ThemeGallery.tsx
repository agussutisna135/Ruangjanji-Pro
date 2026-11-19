import React, { useMemo, useState } from 'react';
import { Check, Eye, Search, X } from 'lucide-react';
import { THEME_CATEGORIES, THEMES } from '../shared/themes.ts';
import { ThemeItem } from '../shared/types.ts';

interface ThemeGalleryProps {
  selectedThemeId?: number;
  onSelectTheme?: (theme: ThemeItem) => void;
  couplePreviewTitle?: string;
  readOnly?: boolean;
  themes?: ThemeItem[];
}

export function ThemeGallery({
  selectedThemeId,
  onSelectTheme,
  couplePreviewTitle,
  readOnly = false,
  themes,
}: ThemeGalleryProps) {
  const [category, setCategory] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [previewTheme, setPreviewTheme] = useState<ThemeItem | null>(null);

  const sourceThemes = themes && themes.length > 0 ? themes : THEMES;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceThemes.filter((t) => {
      const catOk = category === 'Semua' || t.category === category;
      const searchOk = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [category, search, sourceThemes]);

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif-display text-xl font-semibold text-[#0F2C23] sm:text-2xl">
            {readOnly ? `Contoh ${sourceThemes.length} Tema Foto Premium` : `Galeri ${sourceThemes.length} Tema Foto Premium`}
          </h3>
          <p className="text-xs text-[#5F6B65] tabular-nums">
            Menampilkan {filtered.length} dari {sourceThemes.length} tema fotografi resolusi tinggi
            {readOnly ? ' · Mode Pratinjau Pengunjung' : ''}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B65]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tema (mis. Danau Como, Pendopo)..."
            className="h-10 w-full rounded-xl border border-[#0F2C23]/15 bg-white pl-9 pr-3 text-sm text-[#17201C] placeholder:text-[#5F6B65]/70 focus:border-[#C6A259] focus:outline-none"
          />
        </div>
      </div>

      {/* Interactive Category Filter Buttons */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#F3EFE6] p-1.5">
        {THEME_CATEGORIES.map((cat) => {
          const active = category === cat;
          const count =
            cat === 'Semua'
              ? sourceThemes.length
              : sourceThemes.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors tabular-nums ${
                active
                  ? 'bg-[#0F2C23] text-[#FAF8F4]'
                  : 'text-[#5F6B65] hover:bg-white/70 hover:text-[#0F2C23]'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* 100-Theme Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#0F2C23]/10 bg-white p-10 text-center">
          <p className="text-sm text-[#5F6B65]">Tidak ada tema yang cocok dengan pencarian &ldquo;{search}&rdquo;.</p>
          <button
            type="button"
            onClick={() => {
              setCategory('Semua');
              setSearch('');
            }}
            className="mt-3 rounded-lg border border-[#0F2C23]/20 px-4 py-2 text-xs font-medium text-[#0F2C23] hover:bg-[#F3EFE6]"
          >
            Tampilkan Semua {sourceThemes.length} Tema
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((theme) => {
            const isSelected = !readOnly && selectedThemeId === theme.id;
            return (
              <div
                key={theme.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all ${
                  isSelected
                    ? 'border-[#C6A259] ring-2 ring-[#C6A259]/35'
                    : 'border-[#0F2C23]/10 hover:border-[#C6A259]/60'
                }`}
              >
                {/* Full-bleed real photographic thumbnail */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EAE4D7]">
                  <img
                    src={theme.imageUrl}
                    alt={theme.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  <span className="absolute bottom-2.5 left-3 text-[11px] font-medium tabular-nums text-white/90">
                    #{String(theme.id).padStart(3, '0')}
                  </span>
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#C6A259] text-[#0F2C23] shadow-sm">
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    </span>
                  )}
                </div>

                {/* Clean metadata + action buttons */}
                <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
                  <div>
                    <h4 className="truncate text-sm font-semibold text-[#17201C]">{theme.name}</h4>
                    <p className="mt-0.5 truncate text-[11px] text-[#5F6B65]">{theme.category}</p>
                  </div>

                  {readOnly ? (
                    <button
                      type="button"
                      onClick={() => setPreviewTheme(theme)}
                      className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#0F2C23]/15 bg-[#FAF8F4] px-2.5 text-xs font-medium text-[#0F2C23] transition-colors hover:border-[#C6A259] hover:bg-[#F3EFE6]"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#9E7C38]" />
                      <span>Preview Sampul</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme(theme)}
                        className="flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-lg border border-[#0F2C23]/15 px-2 text-xs font-medium text-[#0F2C23] transition-colors hover:bg-[#F3EFE6]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectTheme?.(theme)}
                        className={`min-h-[38px] flex-1 rounded-lg px-2 text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#C6A259] text-[#0F2C23]'
                            : 'bg-[#0F2C23] text-[#FAF8F4] hover:bg-[#1A4336]'
                        }`}
                      >
                        {isSelected ? 'Terpilih' : 'Pilih Tema'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Cover Preview Modal */}
      {previewTheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPreviewTheme(null)}
        >
          <div
            className="relative w-full max-w-[380px] overflow-hidden rounded-[36px] border-4 border-[#222] bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewTheme(null)}
              aria-label="Tutup preview"
              className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative aspect-[9/16] w-full">
              <img
                src={previewTheme.imageUrl}
                alt={previewTheme.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/75" />
              <div className="absolute inset-0 flex flex-col items-center justify-between px-6 py-12 text-center text-white">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3E5C8]">The Wedding Of</p>
                  <h4 className="mt-2 font-serif-display text-3xl font-semibold">
                    {couplePreviewTitle || 'Aditya & Kirana'}
                  </h4>
                  <p className="mt-2 text-xs text-white/80">
                    #{String(previewTheme.id).padStart(3, '0')} · {previewTheme.name} · {previewTheme.category}
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <div className="rounded-2xl border border-white/25 bg-[#0F2C23]/45 px-4 py-3 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-widest text-white/75">Kepada Yth.</p>
                    <p className="mt-0.5 text-sm font-medium">Bapak Ahmad &amp; Keluarga</p>
                  </div>
                  {readOnly ? (
                    <button
                      type="button"
                      onClick={() => setPreviewTheme(null)}
                      className="min-h-[44px] w-full rounded-full border border-white/30 bg-black/45 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-black/65"
                    >
                      Tutup Preview Tema
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTheme?.(previewTheme);
                        setPreviewTheme(null);
                      }}
                      className="min-h-[44px] w-full rounded-full bg-[#C6A259] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0F2C23] transition-transform active:scale-[0.98]"
                    >
                      Gunakan Tema Ini
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
