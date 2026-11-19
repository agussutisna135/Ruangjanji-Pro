import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Disc3,
  Download,
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Music2,
  Pause,
  Play,
  QrCode,
  Send,
  Shirt,
  Sparkles,
  Users,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { api, formatIndonesianDate } from '../lib/api.ts';
import { getTemplateStyleSpec } from '../shared/templateStyles.ts';
import { getThemeById } from '../shared/themes.ts';
import { InvitationRecord, RsvpWishRecord } from '../shared/types.ts';
import {
  FloralCornerOrnament,
  getFontClass,
  getPhotoFrameClass,
  SectionDividerOrnament,
} from './Ornaments.tsx';

interface InvitationViewProps {
  invitation: InvitationRecord;
  initialWishes?: RsvpWishRecord[];
  guestName?: string;
  embeddedPreview?: boolean;
  isMobileViewport?: boolean;
}

type NavSectionId = 'beranda' | 'mempelai' | 'acara' | 'galeri' | 'amplop' | 'rsvp';

const NAV_TABS: Array<{ id: NavSectionId; label: string }> = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'mempelai', label: 'Mempelai' },
  { id: 'acara', label: 'Acara' },
  { id: 'galeri', label: 'Galeri' },
  { id: 'amplop', label: 'Amplop' },
  { id: 'rsvp', label: 'RSVP' },
];

function getTimezoneOffsetIso(tz: string): string {
  switch (tz) {
    case 'Asia/Jakarta':
      return '+07:00';
    case 'Asia/Makassar':
      return '+08:00';
    case 'Asia/Jayapura':
      return '+09:00';
    case 'UTC':
      return 'Z';
    default:
      return '+07:00';
  }
}

function getTimezoneLabel(tz: string): string {
  switch (tz) {
    case 'Asia/Makassar':
      return 'WITA';
    case 'Asia/Jayapura':
      return 'WIT';
    case 'UTC':
      return 'UTC';
    default:
      return 'WIB';
  }
}

function parseScheduleEntries(note: string, defaultTz: string): Array<{ time: string; activity: string }> {
  if (!note) return [];
  return note
    .split(/·|\||\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\d{1,2}[:.]\d{2}(?:\s*(?:WIB|WITA|WIT))?)\s*[-–]?\s*(.+)$/i);
      if (m) {
        const rawTime = m[1].replace('.', ':').trim();
        const hasTz = /(WIB|WITA|WIT)/i.test(rawTime);
        return {
          time: hasTz ? rawTime.toUpperCase() : `${rawTime} ${defaultTz}`,
          activity: m[2].trim(),
        };
      }
      return { time: '', activity: chunk };
    });
}

export function InvitationView({
  invitation,
  initialWishes = [],
  guestName = 'Bapak/Ibu/Saudara/i',
  embeddedPreview = false,
  isMobileViewport = false,
}: InvitationViewProps) {
  const { data } = invitation;
  const { couple, turutMengundang, countdown, events, gallery, gifts, music, design } = data;
  const theme = useMemo(() => getThemeById(invitation.themeId), [invitation.themeId]);
  const bgImage = design.backgroundImageOverride || theme.imageUrl;

  const tpl = useMemo(() => getTemplateStyleSpec(design.templatePreset), [design.templatePreset]);
  const accent = design.accentColor || tpl.accentColor;
  const tzLabel = getTimezoneLabel(countdown.timezone);

  const [isOpened, setIsOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicToast, setMusicToast] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSectionId>('beranda');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<NavSectionId, HTMLElement | null>>>({});

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  // Gallery state
  const [galleryMode, setGalleryMode] = useState<'grid' | 'slideshow'>('grid');
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Gifts & QRIS state
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [qrisModalOpen, setQrisModalOpen] = useState(false);

  // RSVP & Wishes state
  const [wishes, setWishes] = useState<RsvpWishRecord[]>(initialWishes);
  const [rsvpName, setRsvpName] = useState(guestName !== 'Bapak/Ibu/Saudara/i' ? guestName : '');
  const [rsvpAttendance, setRsvpAttendance] = useState<'hadir' | 'tidak_hadir' | 'ragu'>('hadir');
  const [rsvpCount, setRsvpCount] = useState(2);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpFeedback, setRsvpFeedback] = useState<string | null>(null);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  useEffect(() => {
    setWishes(initialWishes);
  }, [initialWishes]);

  useEffect(() => {
    setIsOpened(false);
    setIsPlaying(false);
    setActiveNav('beranda');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [invitation.id]);

  // Countdown tick
  useEffect(() => {
    const offset = getTimezoneOffsetIso(countdown.timezone);
    const targetIso = `${countdown.targetDate}T${countdown.targetTime || '09:00'}:00${offset}`;
    const targetMs = new Date(targetIso).getTime();

    const update = () => {
      if (Number.isNaN(targetMs)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
        return;
      }
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [countdown.targetDate, countdown.targetTime, countdown.timezone]);

  // Active nav highlight based on scroll position
  useEffect(() => {
    if (!isOpened) return;
    const rootEl = embeddedPreview ? scrollContainerRef.current : null;
    const onScroll = () => {
      const ids: NavSectionId[] = ['beranda', 'mempelai', 'acara', 'galeri', 'amplop', 'rsvp'];
      let current: NavSectionId = 'beranda';
      const viewportTop = rootEl ? rootEl.getBoundingClientRect().top + 140 : 140;
      for (const id of ids) {
        const node = sectionRefs.current[id];
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (rect.top <= viewportTop) {
          current = id;
        }
      }
      setActiveNav(current);
    };

    const target = rootEl || window;
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [isOpened, embeddedPreview]);

  // Sync audio element volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, music.volume ?? 0.75));
    }
  }, [music.volume, music.url]);

  const sortedGallery = useMemo(() => [...gallery].sort((a, b) => a.order - b.order), [gallery]);
  const imageGallery = useMemo(() => sortedGallery.filter((g) => g.type === 'image'), [sortedGallery]);

  const handleOpenInvitation = async () => {
    setIsOpened(true);
    if (music.enabled && music.url && audioRef.current && music.autoplay) {
      try {
        audioRef.current.volume = Math.max(0, Math.min(1, music.volume ?? 0.75));
        await audioRef.current.play();
        setIsPlaying(true);
        setMusicToast(true);
        setTimeout(() => setMusicToast(false), 3000);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleDownloadHtml = async () => {
    setDownloadingHtml(true);
    setDownloadFeedback(null);
    try {
      await api.publicInvitations.exportHtml(invitation.slug);
      setDownloadFeedback('File "contoh-undangan.html" berhasil diunduh.');
    } catch (err: any) {
      setDownloadFeedback(err?.message || 'Gagal mengunduh file HTML undangan.');
    } finally {
      setDownloadingHtml(false);
      setTimeout(() => setDownloadFeedback(null), 3200);
    }
  };

  const toggleMusic = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const scrollToSection = (id: NavSectionId) => {
    setActiveNav(id);
    const node = sectionRefs.current[id];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyAccount = (id: string, accNum: string) => {
    navigator.clipboard.writeText(accNum).then(() => {
      setCopiedBankId(id);
      setTimeout(() => setCopiedBankId(null), 2000);
    });
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || !rsvpMessage.trim()) return;
    setRsvpSubmitting(true);
    setRsvpFeedback(null);

    if (embeddedPreview) {
      const previewWish: RsvpWishRecord = {
        id: `preview-${Date.now()}`,
        invitationId: invitation.id,
        guestName: rsvpName.trim(),
        attendance: rsvpAttendance,
        guestCount: rsvpCount,
        message: rsvpMessage.trim(),
        isApproved: true,
        whatsappConfirmed: false,
        createdAt: new Date().toISOString(),
      };
      setWishes((prev) => [previewWish, ...prev]);
      setRsvpMessage('');
      setRsvpSubmitting(false);
      setRsvpFeedback('Ucapan ditambahkan ke pratinjau.');
      return;
    }

    try {
      const res = await api.publicInvitations.submitRsvp(invitation.slug, {
        guestName: rsvpName.trim(),
        attendance: rsvpAttendance,
        guestCount: rsvpCount,
        message: rsvpMessage.trim(),
      });
      setWishes((prev) => [res.wish, ...prev]);
      setRsvpMessage('');
      setRsvpFeedback('Terima kasih! Konfirmasi & doa restu Anda telah tersimpan.');
    } catch (err: any) {
      setRsvpFeedback(err?.message || 'Gagal mengirim ucapan.');
    } finally {
      setRsvpSubmitting(false);
    }
  };

  const headingFontClass = getFontClass(design.headingFont || tpl.defaultHeadingFont);
  const bodyFontClass = getFontClass(design.bodyFont || tpl.defaultBodyFont);
  const frameClass = getPhotoFrameClass(design.photoFrame || tpl.defaultFrame);

  const spacingClass =
    design.spacing === 'compact' ? 'py-6 px-4' : design.spacing === 'airy' ? 'py-12 px-5' : 'py-8 px-4';

  const textSizeClass =
    design.textSize === 'sm' ? 'text-[13px]' : design.textSize === 'lg' ? 'text-[15.5px]' : 'text-[14px]';

  const textAlignClass =
    design.textAlign === 'left' ? 'text-left' : design.textAlign === 'right' ? 'text-right' : 'text-center';

  const nameScaleClass =
    couple.nameScale === 'compact'
      ? 'text-[1.85rem] sm:text-[2.25rem]'
      : couple.nameScale === 'grand'
      ? 'text-[2.5rem] sm:text-[3.35rem]'
      : 'text-[2.15rem] sm:text-[2.75rem]';

  const nameStyleClass =
    couple.nameStyle === 'italic' ? 'italic' : couple.nameStyle === 'uppercase' ? 'uppercase tracking-wider' : '';

  const buttonPrimaryStyle: React.CSSProperties =
    design.buttonStyle === 'outline'
      ? {
          backgroundColor: 'transparent',
          color: accent,
          borderColor: accent,
          borderWidth: '1.5px',
        }
      : design.buttonStyle === 'glass'
      ? {
          backgroundColor: 'rgba(15, 32, 26, 0.60)',
          color: '#FAF8F4',
          borderColor: accent,
          borderWidth: '1px',
          backdropFilter: 'blur(12px)',
        }
      : {
          backgroundColor: accent,
          color: '#121815',
          borderColor: accent,
          borderWidth: '1px',
        };

  const coverPositionClass =
    couple.textPosition === 'top'
      ? 'justify-start pt-16 gap-8'
      : couple.textPosition === 'bottom'
      ? 'justify-end pb-14 gap-6'
      : 'justify-between py-14';

  const transitionClass =
    design.pageTransition === 'fade'
      ? isOpened
        ? 'opacity-0 pointer-events-none'
        : 'opacity-100'
      : design.pageTransition === 'slide'
      ? isOpened
        ? '-translate-x-full opacity-0 pointer-events-none'
        : 'translate-x-0 opacity-100'
      : isOpened
      ? '-translate-y-full opacity-0 pointer-events-none'
      : 'translate-y-0 opacity-100';

  const cardSurfaceStyle: React.CSSProperties = {
    backgroundColor: tpl.cardBg,
    borderColor: tpl.cardBorder,
    boxShadow: tpl.cardShadow,
    color: tpl.bodyColor,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const floatingTextStyle: React.CSSProperties = {
    textShadow: tpl.isDark
      ? '0 1px 14px rgba(0, 0, 0, 0.90)'
      : '0 1px 14px rgba(255, 253, 249, 0.95), 0 0 3px rgba(255, 253, 249, 0.95)',
  };

  const primaryCtaStyle: React.CSSProperties = {
    backgroundColor: tpl.primaryBg,
    color: tpl.primaryText,
  };

  const secondaryOutlineStyle: React.CSSProperties = {
    borderColor: accent,
    color: tpl.headingColor,
    backgroundColor: tpl.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)',
  };

  const heroPortraitUrl = couple.couplePhoto || bgImage;

  const whatsappConfirmUrl = gifts.whatsappNumber
    ? `https://wa.me/${gifts.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Halo ${couple.groomNickname} & ${couple.brideNickname}, saya ${
          rsvpName || guestName
        } ingin mengonfirmasi kehadiran (${rsvpAttendance.replace('_', ' ')}) untuk acara pernikahan Anda.`
      )}`
    : '';

  const containerRootClass = embeddedPreview
    ? 'relative w-full h-full overflow-y-auto overflow-x-clip thin-scrollbar'
    : 'relative min-h-[100svh] w-full overflow-x-clip';

  const columnWidthClass =
    embeddedPreview && isMobileViewport
      ? 'w-full'
      : design.layoutMode === 'split'
      ? 'w-full max-w-[460px] lg:max-w-[920px]'
      : 'w-full max-w-[460px]';

  const contentColumnClass = `mx-auto ${columnWidthClass}`;

  // Renders hero portrait frame styled distinctly for each of the 10 templates
  const renderHeroPortrait = () => {
    switch (tpl.heroVariant) {
      case 'royal-monogram':
        return (
          <div className="mx-auto mt-5 w-full max-w-[330px] p-1.5 border" style={{ borderColor: `${accent}70` }}>
            <div className="relative overflow-hidden border p-1.5" style={{ borderColor: `${accent}45` }}>
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
                style={{ background: 'linear-gradient(180deg, transparent, rgba(13,16,15,0.8))' }}
              />
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 border px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]"
                style={{ borderColor: accent, backgroundColor: 'rgba(13,16,15,0.85)', color: accent }}
              >
                {couple.groomNickname[0]} &amp; {couple.brideNickname[0]}
              </div>
            </div>
          </div>
        );

      case 'editorial-poster':
        return (
          <div className="mx-auto mt-5 w-full">
            <div className="border-y py-2 text-[10px] font-semibold uppercase tracking-[0.26em] tabular-nums" style={{ borderColor: tpl.cardBorder, color: tpl.mutedColor }}>
              Edisi Eksklusif · {formatIndonesianDate(couple.weddingDate)}
            </div>
            <div className="mt-4 overflow-hidden border" style={{ borderColor: tpl.headingColor }}>
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[4/5] w-full object-cover grayscale-[15%]"
              />
            </div>
          </div>
        );

      case 'cameo-oval':
        return (
          <div className="mx-auto mt-5 flex justify-center">
            <div
              className="relative w-[280px] overflow-hidden rounded-[999px] border-2 p-2 shadow-xl sm:w-[300px]"
              style={{ borderColor: accent, backgroundColor: tpl.cardBg }}
            >
              <div className="overflow-hidden rounded-[999px]">
                <img
                  src={heroPortraitUrl}
                  alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                  referrerPolicy="no-referrer"
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
            </div>
          </div>
        );

      case 'mediterranean-circle':
        return (
          <div className="mx-auto mt-6 flex flex-col items-center">
            <div
              className="w-[270px] overflow-hidden rounded-full border-[3px] p-2 shadow-lg sm:w-[295px]"
              style={{ borderColor: accent, backgroundColor: tpl.cardBg }}
            >
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-square w-full rounded-full object-cover"
              />
            </div>
          </div>
        );

      case 'keraton-heritage':
        return (
          <div className="mx-auto mt-5 w-full max-w-[330px]">
            <div
              className="relative overflow-hidden rounded-t-full rounded-b-2xl border-2 p-2 shadow-lg"
              style={{ borderColor: accent, backgroundColor: tpl.cardBg }}
            >
              <FloralCornerOrnament
                color={accent}
                styleType="floral-gold"
                className="pointer-events-none absolute bottom-1 left-1 z-10 h-14 w-14 scale-y-[-1]"
              />
              <FloralCornerOrnament
                color={accent}
                styleType="floral-gold"
                className="pointer-events-none absolute bottom-1 right-1 z-10 h-14 w-14 scale-[-1]"
              />
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full rounded-t-full rounded-b-xl object-cover"
              />
            </div>
          </div>
        );

      case 'botanical-window':
        return (
          <div className="mx-auto mt-5 w-full max-w-[340px]">
            <div
              className="overflow-hidden rounded-[36px] border p-1.5 shadow-md"
              style={{ borderColor: `${accent}55`, backgroundColor: tpl.cardBg }}
            >
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[4/5] w-full rounded-[30px] object-cover"
              />
            </div>
          </div>
        );

      case 'imperial-crest':
        return (
          <div className="mx-auto mt-5 w-full max-w-[335px]">
            <div
              className="overflow-hidden rounded-t-full rounded-b-xl border-[3px] shadow-xl"
              style={{ borderColor: tpl.primaryBg }}
            >
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
        );

      case 'andalusian-courtyard':
        return (
          <div className="mx-auto mt-5 w-full max-w-[330px]">
            <div
              className="overflow-hidden rounded-t-[180px] rounded-b-xl border-2 p-1.5 shadow-lg"
              style={{ borderColor: accent, backgroundColor: tpl.cardBg }}
            >
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full rounded-t-[174px] rounded-b-lg object-cover"
              />
            </div>
          </div>
        );

      case 'velvet-spotlight':
        return (
          <div className="mx-auto mt-5 w-full max-w-[330px] relative">
            <div
              className="overflow-hidden rounded-t-full rounded-b-3xl border shadow-2xl"
              style={{ borderColor: `${accent}88` }}
            >
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
        );

      case 'signature-arch':
      default:
        return (
          <div className="mx-auto mt-5 w-full max-w-[340px]">
            <div
              className="overflow-hidden rounded-t-full rounded-b-3xl border-2 shadow-xl"
              style={{ borderColor: accent }}
            >
              <img
                src={heroPortraitUrl}
                alt={`${couple.groomNickname} & ${couple.brideNickname}`}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className={`${containerRootClass} ${bodyFontClass}`}
      style={{ backgroundColor: tpl.canvasBg, color: tpl.bodyColor }}
    >
      {/* Hidden Audio Element */}
      {music.enabled && music.url && (
        <audio
          ref={audioRef}
          src={music.url}
          loop={music.loop}
          preload="auto"
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* ==================== OPENING COVER (100svh iPhone Screen) ==================== */}
      <div
        className={`${
          embeddedPreview ? 'absolute inset-0 z-30' : 'fixed inset-0 z-40'
        } flex flex-col items-center overflow-hidden text-center text-white transition-all duration-700 ease-out safe-top safe-bottom ${coverPositionClass} ${transitionClass}`}
      >
        <img
          src={bgImage}
          alt={theme.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(10,18,15,${Math.max(
              0.25,
              design.overlayOpacity - 0.1
            )}) 0%, rgba(10,18,15,${Math.min(0.88, design.overlayOpacity + 0.25)}) 100%)`,
          }}
        />

        {/* Corner Ornaments */}
        <FloralCornerOrnament
          color={accent}
          styleType={design.ornamentStyle || tpl.defaultOrnament}
          className="pointer-events-none absolute left-3 top-3 h-24 w-24"
        />
        <FloralCornerOrnament
          color={accent}
          styleType={design.ornamentStyle || tpl.defaultOrnament}
          className="pointer-events-none absolute right-3 top-3 h-24 w-24 scale-x-[-1]"
        />
        <FloralCornerOrnament
          color={accent}
          styleType={design.ornamentStyle || tpl.defaultOrnament}
          className="pointer-events-none absolute bottom-3 left-3 h-24 w-24 scale-y-[-1]"
        />
        <FloralCornerOrnament
          color={accent}
          styleType={design.ornamentStyle || tpl.defaultOrnament}
          className="pointer-events-none absolute bottom-3 right-3 h-24 w-24 scale-[-1]"
        />

        <div className="relative z-10 max-w-sm px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em]" style={{ color: '#F5E8CE' }}>
            The Wedding Of
          </p>
          <h1 className={`mt-3 text-balance leading-[1.12] ${headingFontClass} ${nameScaleClass} ${nameStyleClass}`}>
            {couple.groomNickname} <span style={{ color: accent }}>&amp;</span> {couple.brideNickname}
          </h1>
          <SectionDividerOrnament color={accent} styleType={design.ornamentStyle || tpl.defaultOrnament} />
          <p className="text-sm font-medium text-white/90">{formatIndonesianDate(couple.weddingDate)}</p>
        </div>

        <div className="relative z-10 w-full max-w-[330px] space-y-4 px-5">
          <div className="rounded-2xl border border-white/25 bg-black/45 px-4 py-3.5 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/75">Kepada Yth. Bapak/Ibu/Saudara/i</p>
            <p className="mt-1 truncate text-base font-semibold text-white">{guestName}</p>
          </div>

          <button
            type="button"
            onClick={handleOpenInvitation}
            style={buttonPrimaryStyle}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] shadow-lg transition-transform active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Buka Undangan</span>
          </button>

          {!embeddedPreview && invitation.status === 'published' && (
            <button
              type="button"
              disabled={downloadingHtml}
              onClick={handleDownloadHtml}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-black/35 px-4 py-2 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md transition-opacity hover:bg-black/50 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5 text-[#F5E8CE]" />
              <span>{downloadingHtml ? 'Mengunduh HTML...' : 'Download HTML Contoh Undangan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== DESKTOP AMBIENT BACKDROP (Outside Mobile Column) ==================== */}
      {!embeddedPreview && (
        <div className="pointer-events-none fixed inset-0 -z-10 hidden lg:block">
          <img
            src={bgImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-105 object-cover opacity-25 blur-2xl"
          />
          <div className="absolute inset-0" style={{ backgroundColor: `${tpl.canvasBg}CC` }} />
        </div>
      )}

      {/* ==================== MAIN INVITATION CONTENT COLUMN ==================== */}
      <main className={`${contentColumnClass} relative min-h-[100svh] bg-transparent shadow-2xl`}>
        {/* Persistent Full-Height Transparent Theme Photo Backdrop (Matches Screenshot Aesthetic) */}
        <div
          className={
            embeddedPreview
              ? 'pointer-events-none sticky top-0 z-0 h-[820px] -mb-[820px] w-full overflow-hidden'
              : `pointer-events-none fixed inset-y-0 left-1/2 z-0 -translate-x-1/2 overflow-hidden ${columnWidthClass}`
          }
        >
          <img
            src={bgImage}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0" style={{ backgroundColor: tpl.backdropWash }} />
        </div>

        {/* All Scrollable Foreground Sections */}
        <div className="relative z-10">
          {/* 1. BERANDA: OPENING GREETING + TITLE + HERO PORTRAIT + QUOTE + COUNTDOWN */}
          <section
            ref={(el) => {
              sectionRefs.current.beranda = el;
            }}
            className={`${spacingClass} pt-7 text-center`}
          >
            <SectionDividerOrnament color={accent} styleType={design.ornamentStyle || tpl.defaultOrnament} />

            <p
              className="mt-2 px-2 text-[11px] font-semibold uppercase tracking-[0.26em]"
              style={{ color: accent, ...floatingTextStyle }}
            >
              Assalamu&apos;alaikum Warahmatullahi Wabarakatuh
            </p>

            <h2
              className={`mt-2 text-balance leading-[1.12] ${headingFontClass} ${nameScaleClass} ${nameStyleClass}`}
              style={{ color: tpl.headingColor, ...floatingTextStyle }}
            >
              {couple.groomNickname} <span style={{ color: accent }}>&amp;</span> {couple.brideNickname}
            </h2>

            {renderHeroPortrait()}

            {/* Opening Quote */}
            <div className={`mx-auto mt-7 max-w-md px-2 ${textAlignClass}`} style={floatingTextStyle}>
              <p className={`font-medium leading-relaxed ${textSizeClass}`} style={{ color: tpl.headingColor }}>
                {couple.openingQuote}
              </p>
              <SectionDividerOrnament color={accent} styleType={design.ornamentStyle || tpl.defaultOrnament} />
            </div>

            {/* Menuju Hari Bahagia Countdown Card */}
            <div className={`${tpl.cardRadius} mt-5 border px-4 py-6`} style={cardSurfaceStyle}>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.26em]"
                style={{ color: accent }}
              >
                Menuju Hari Bahagia
              </p>
              <p className="mt-1.5 text-sm font-medium tabular-nums" style={{ color: tpl.mutedColor }}>
                {formatIndonesianDate(couple.weddingDate)} · {countdown.targetTime || '09:00'} {tzLabel}
              </p>

              {timeLeft.expired ? (
                <div
                  className="mx-auto mt-4 max-w-xs rounded-2xl border px-4 py-3 text-sm font-semibold tracking-widest"
                  style={{ borderColor: accent, backgroundColor: tpl.countdownBg, color: tpl.countdownText }}
                >
                  HARI BAHAGIA TELAH TIBA
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Hari', val: timeLeft.days },
                    { label: 'Jam', val: timeLeft.hours },
                    { label: 'Menit', val: timeLeft.minutes },
                    { label: 'Detik', val: timeLeft.seconds },
                  ].map((box) => (
                    <div
                      key={box.label}
                      className={`${tpl.countdownRadius} px-1 py-3.5`}
                      style={{
                        backgroundColor: tpl.countdownBg,
                        border: tpl.countdownBorder,
                      }}
                    >
                      <div
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: tpl.countdownText }}
                      >
                        {String(box.val).padStart(2, '0')}
                      </div>
                      <div
                        className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em]"
                        style={{ color: tpl.countdownLabelColor }}
                      >
                        {box.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 2. MEMPELAI & PERJALANAN KAMI */}
          <section
            ref={(el) => {
              sectionRefs.current.mempelai = el;
            }}
            className={`${spacingClass} pt-3`}
          >
            <div className="text-center" style={floatingTextStyle}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                Mempelai
              </p>
              <h2 className={`mt-1 text-2xl font-semibold sm:text-3xl ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                Pasangan Pengantin
              </h2>
            </div>

            <div
              className={`mt-5 grid gap-4 ${
                design.layoutMode === 'split' && !isMobileViewport ? 'md:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {/* Mempelai Pria */}
              <div className={`${tpl.cardRadius} border p-6 text-center`} style={cardSurfaceStyle}>
                {couple.groomPhoto && (
                  <div
                    className={`mx-auto mb-5 w-44 overflow-hidden border-2 p-1 ${frameClass}`}
                    style={{ borderColor: accent }}
                  >
                    <img
                      src={couple.groomPhoto}
                      alt={couple.groomFullName}
                      referrerPolicy="no-referrer"
                      className={`aspect-square w-full object-cover ${frameClass}`}
                    />
                  </div>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
                  Mempelai Pria
                </p>
                <h3 className={`mt-1.5 text-2xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                  {couple.groomFullName}
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed" style={{ color: tpl.mutedColor }}>
                  Putra dari
                </p>
                <p className={`mt-0.5 font-medium ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                  {couple.groomFather} &amp; {couple.groomMother}
                </p>
              </div>

              {/* Mempelai Wanita */}
              <div className={`${tpl.cardRadius} border p-6 text-center`} style={cardSurfaceStyle}>
                {couple.bridePhoto && (
                  <div
                    className={`mx-auto mb-5 w-44 overflow-hidden border-2 p-1 ${frameClass}`}
                    style={{ borderColor: accent }}
                  >
                    <img
                      src={couple.bridePhoto}
                      alt={couple.brideFullName}
                      referrerPolicy="no-referrer"
                      className={`aspect-square w-full object-cover ${frameClass}`}
                    />
                  </div>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
                  Mempelai Wanita
                </p>
                <h3 className={`mt-1.5 text-2xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                  {couple.brideFullName}
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed" style={{ color: tpl.mutedColor }}>
                  Putri dari
                </p>
                <p className={`mt-0.5 font-medium ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                  {couple.brideFather} &amp; {couple.brideMother}
                </p>
              </div>
            </div>

            {/* Kisah Cinta / Perjalanan Kami */}
            {couple.loveStory.length > 0 && (
              <div className="mt-6">
                {tpl.timelineStyle === 'narrative-card' ? (
                  <div className={`${tpl.cardRadius} border px-6 py-7 text-center`} style={cardSurfaceStyle}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                      Kisah Cinta
                    </p>
                    <h3
                      className={`mt-1 text-2xl font-semibold sm:text-3xl ${headingFontClass}`}
                      style={{ color: tpl.headingColor }}
                    >
                      Perjalanan Kami
                    </h3>
                    <SectionDividerOrnament color={accent} styleType={design.ornamentStyle || tpl.defaultOrnament} />
                    <div className="mt-4 space-y-4">
                      {couple.loveStory.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <p className="text-xs font-semibold tracking-wider tabular-nums" style={{ color: accent }}>
                            {item.year} · {item.title}
                          </p>
                          <p className={`leading-relaxed ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : tpl.timelineStyle === 'editorial-columns' ? (
                  <div className={`${tpl.cardRadius} border p-6`} style={cardSurfaceStyle}>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                        Kisah Cinta
                      </p>
                      <h3 className={`mt-1 text-2xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                        Jejak Langkah Kami
                      </h3>
                    </div>
                    <div className="mt-5 divide-y" style={{ borderColor: tpl.cardBorder }}>
                      {couple.loveStory.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[64px_1fr] gap-4 py-4 first:pt-2 last:pb-0"
                          style={{ borderColor: tpl.cardBorder }}
                        >
                          <div className={`text-lg font-semibold tabular-nums ${headingFontClass}`} style={{ color: accent }}>
                            {item.year}
                          </div>
                          <div>
                            <h4 className={`text-base font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                              {item.title}
                            </h4>
                            <p className={`mt-1 leading-relaxed ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center" style={floatingTextStyle}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                        Kisah Cinta
                      </p>
                      <h3 className={`mt-1 text-2xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                        Perjalanan Kami
                      </h3>
                    </div>
                    {couple.loveStory.map((item, idx) => (
                      <div key={idx} className={`${tpl.cardRadius} border p-5`} style={cardSurfaceStyle}>
                        <div className="flex items-center gap-2 text-xs font-semibold tabular-nums" style={{ color: accent }}>
                          <Heart className="h-3.5 w-3.5" />
                          <span>{item.year}</span>
                        </div>
                        <h4 className={`mt-1 text-base font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                          {item.title}
                        </h4>
                        <p className={`mt-1 leading-relaxed ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. ACARA: RANGKAIAN ACARA & TURUT MENGUNDANG */}
          <section
            ref={(el) => {
              sectionRefs.current.acara = el;
            }}
            className={`${spacingClass} pt-4`}
          >
            {events.length > 0 && (
              <div>
                <div className="text-center" style={floatingTextStyle}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                    Rangkaian Acara
                  </p>
                  <h2
                    className={`mt-1 text-2xl font-semibold sm:text-3xl ${headingFontClass}`}
                    style={{ color: tpl.headingColor }}
                  >
                    Waktu &amp; Lokasi
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {events.map((ev) => {
                    const scheduleEntries = parseScheduleEntries(ev.scheduleNote, tzLabel);
                    return (
                      <div key={ev.id} className={`${tpl.cardRadius} border p-6 text-center`} style={cardSurfaceStyle}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                          {ev.type}
                        </p>
                        <h3
                          className={`mt-2 text-balance text-2xl font-semibold leading-snug ${headingFontClass}`}
                          style={{ color: tpl.headingColor }}
                        >
                          {ev.venueName}
                        </h3>

                        <p className="mt-2 text-sm font-medium tabular-nums" style={{ color: tpl.mutedColor }}>
                          {formatIndonesianDate(ev.date)} · {ev.startTime} – {ev.endTime} {tzLabel}
                        </p>

                        <p className={`mt-2 leading-relaxed ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                          {ev.address}
                        </p>

                        {(ev.directions || ev.dressCode || ev.parkingInfo) && (
                          <div className="mt-3 space-y-1 text-xs leading-relaxed" style={{ color: tpl.mutedColor }}>
                            {ev.directions && <p>Petunjuk: {ev.directions}</p>}
                            {ev.dressCode && <p>Dress Code: {ev.dressCode}</p>}
                            {ev.parkingInfo && <p>Parkir: {ev.parkingInfo}</p>}
                          </div>
                        )}

                        {scheduleEntries.length > 0 && (
                          <div className="mt-5 border-t pt-4 text-left" style={{ borderColor: tpl.cardBorder }}>
                            <p
                              className="text-center text-[11px] font-semibold uppercase tracking-[0.24em]"
                              style={{ color: tpl.mutedColor }}
                            >
                              Jadwal Acara
                            </p>
                            <div className="mt-3 space-y-2">
                              {scheduleEntries.map((entry, idx) => (
                                <div key={idx} className="grid grid-cols-[84px_1fr] items-baseline gap-2 text-xs">
                                  <span className="font-semibold tabular-nums" style={{ color: accent }}>
                                    {entry.time || 'Jadwal'}
                                  </span>
                                  <span style={{ color: tpl.bodyColor }}>{entry.activity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                          {ev.mapsUrl && (
                            <a
                              href={ev.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={primaryCtaStyle}
                              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Petunjuk Lokasi</span>
                            </a>
                          )}
                          {ev.liveStreamingEnabled && ev.videoLink && (
                            <a
                              href={ev.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={secondaryOutlineStyle}
                              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-85"
                            >
                              <Video className="h-3.5 w-3.5" style={{ color: accent }} />
                              <span>Live Streaming</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Turut Mengundang */}
            {turutMengundang.length > 0 && (
              <div className={`${tpl.cardRadius} mt-6 border p-6 text-center`} style={cardSurfaceStyle}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                  Kehormatan Kami
                </p>
                <h3 className={`mt-1 text-2xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                  Turut Mengundang
                </h3>
                <SectionDividerOrnament color={accent} styleType={design.ornamentStyle || tpl.defaultOrnament} />
                <ul className="mt-2 divide-y text-center" style={{ borderColor: tpl.cardBorder }}>
                  {turutMengundang.map((person, i) => (
                    <li
                      key={i}
                      className={`py-3 ${textSizeClass}`}
                      style={{ borderColor: tpl.cardBorder, color: tpl.bodyColor }}
                    >
                      {person}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 4. GALERI FOTO & VIDEO */}
          {sortedGallery.length > 0 && (
            <section
              ref={(el) => {
                sectionRefs.current.galeri = el;
              }}
              className={`${spacingClass} pt-4`}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div style={floatingTextStyle}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                    Momen Bahagia
                  </p>
                  <h2
                    className={`mt-1 text-2xl font-semibold sm:text-3xl ${headingFontClass}`}
                    style={{ color: tpl.headingColor }}
                  >
                    Galeri Foto
                  </h2>
                </div>

                <div
                  className="inline-flex rounded-xl border p-1 backdrop-blur-md"
                  style={{ backgroundColor: tpl.cardBg, borderColor: tpl.cardBorder }}
                >
                  <button
                    type="button"
                    onClick={() => setGalleryMode('grid')}
                    className="min-h-[34px] rounded-lg px-3.5 text-xs font-medium transition-colors"
                    style={
                      galleryMode === 'grid'
                        ? { backgroundColor: tpl.primaryBg, color: tpl.primaryText }
                        : { color: tpl.mutedColor }
                    }
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryMode('slideshow')}
                    className="min-h-[34px] rounded-lg px-3.5 text-xs font-medium transition-colors"
                    style={
                      galleryMode === 'slideshow'
                        ? { backgroundColor: tpl.primaryBg, color: tpl.primaryText }
                        : { color: tpl.mutedColor }
                    }
                  >
                    Slideshow
                  </button>
                </div>
              </div>

              {galleryMode === 'grid' ? (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {sortedGallery.map((item) => {
                    const imgIndex = imageGallery.findIndex((x) => x.id === item.id);
                    const galleryRadius =
                      tpl.id === 'editorial-monochrome'
                        ? 'rounded-none'
                        : tpl.id === 'sage-botanical'
                        ? 'rounded-3xl'
                        : 'rounded-2xl';
                    return (
                      <div
                        key={item.id}
                        className={`overflow-hidden border ${galleryRadius}`}
                        style={{ backgroundColor: tpl.cardBg, borderColor: tpl.cardBorder }}
                      >
                        {item.type === 'video' ? (
                          <video src={item.url} controls playsInline className="aspect-[3/4] w-full bg-black object-cover" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxIdx(imgIndex >= 0 ? imgIndex : 0);
                              setZoomScale(1);
                            }}
                            className="block w-full overflow-hidden focus:outline-none"
                          >
                            <img
                              src={item.url}
                              alt={item.caption || 'Foto galeri'}
                              referrerPolicy="no-referrer"
                              className="aspect-[3/4] w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`${tpl.cardRadius} mt-5 overflow-hidden border`} style={cardSurfaceStyle}>
                  {sortedGallery[slideIdx] && (
                    <div className="relative">
                      {sortedGallery[slideIdx].type === 'video' ? (
                        <video
                          src={sortedGallery[slideIdx].url}
                          controls
                          playsInline
                          className="aspect-[3/4] w-full bg-black object-cover"
                        />
                      ) : (
                        <img
                          src={sortedGallery[slideIdx].url}
                          alt={sortedGallery[slideIdx].caption || 'Slideshow'}
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            const imgIndex = imageGallery.findIndex((x) => x.id === sortedGallery[slideIdx].id);
                            setLightboxIdx(imgIndex >= 0 ? imgIndex : 0);
                            setZoomScale(1);
                          }}
                          className="aspect-[3/4] w-full cursor-pointer object-cover"
                        />
                      )}
                      <button
                        type="button"
                        aria-label="Foto sebelumnya"
                        onClick={() => setSlideIdx((p) => (p - 1 + sortedGallery.length) % sortedGallery.length)}
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Foto berikutnya"
                        onClick={() => setSlideIdx((p) => (p + 1) % sortedGallery.length)}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3 text-xs">
                    <span className="truncate font-medium" style={{ color: tpl.headingColor }}>
                      {sortedGallery[slideIdx]?.caption || 'Momen Spesial'}
                    </span>
                    <span className="tabular-nums" style={{ color: tpl.mutedColor }}>
                      {slideIdx + 1} / {sortedGallery.length}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5. AMPLOP DIGITAL */}
          {gifts.enabled && (
            <section
              ref={(el) => {
                sectionRefs.current.amplop = el;
              }}
              className={`${spacingClass} pt-4`}
            >
              <div className={`${tpl.cardRadius} border p-6`} style={cardSurfaceStyle}>
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                    Tanda Kasih
                  </p>
                  <h2 className={`mt-1 text-2xl font-semibold sm:text-3xl ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                    Amplop Digital
                  </h2>
                  <p className={`mx-auto mt-3 max-w-md leading-relaxed ${textSizeClass}`} style={{ color: tpl.bodyColor }}>
                    {gifts.message}
                  </p>
                </div>

                {/* Horizontal Inline Bank Cards */}
                <div className="mt-5 space-y-3">
                  {gifts.banks.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5"
                      style={{ borderColor: tpl.cardBorder, backgroundColor: tpl.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.46)' }}
                    >
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                          {bank.bankName}
                        </p>
                        <p
                          className="mt-0.5 text-lg font-semibold tracking-wider tabular-nums"
                          style={{ color: tpl.headingColor }}
                        >
                          {bank.accountNumber}
                        </p>
                        <p className="truncate text-xs" style={{ color: tpl.mutedColor }}>
                          a.n. {bank.accountHolder}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyAccount(bank.id, bank.accountNumber)}
                        style={copiedBankId === bank.id ? primaryCtaStyle : secondaryOutlineStyle}
                        className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors"
                      >
                        {copiedBankId === bank.id ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}

                  {gifts.qrisImageUrl && (
                    <div
                      className="rounded-2xl border p-4 text-center"
                      style={{ borderColor: tpl.cardBorder }}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
                        {gifts.qrisLabel || 'QRIS Digital'}
                      </p>
                      <img
                        src={gifts.qrisImageUrl}
                        alt="Kode QRIS"
                        className="mx-auto mt-3 h-40 w-40 rounded-xl border bg-white object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={() => setQrisModalOpen(true)}
                        style={secondaryOutlineStyle}
                        className="mt-3 inline-flex min-h-[38px] items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Perbesar QRIS</span>
                      </button>
                    </div>
                  )}

                  {gifts.physicalGiftEnabled && gifts.recipientAddress && (
                    <div
                      className="rounded-2xl border p-4 text-center"
                      style={{ borderColor: tpl.cardBorder }}
                    >
                      <Gift className="mx-auto h-5 w-5" style={{ color: accent }} />
                      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: tpl.headingColor }}>
                        Kirim Kado Fisik
                      </p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: tpl.headingColor }}>
                        {gifts.recipientName}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: tpl.mutedColor }}>
                        {gifts.recipientAddress}
                      </p>
                    </div>
                  )}

                  {gifts.whatsappNumber && (
                    <a
                      href={`https://wa.me/${gifts.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Halo ${couple.groomNickname} & ${couple.brideNickname}, saya ingin mengonfirmasi pengiriman tanda kasih/hadiah.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={primaryCtaStyle}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Konfirmasi Hadiah via WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 6. RSVP & BUKU TAMU */}
          <section
            ref={(el) => {
              sectionRefs.current.rsvp = el;
            }}
            className={`${spacingClass} pt-4`}
          >
            <div className="text-center" style={floatingTextStyle}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: accent }}>
                Kehadiran &amp; Doa
              </p>
              <h2 className={`mt-1 text-2xl font-semibold sm:text-3xl ${headingFontClass}`} style={{ color: tpl.headingColor }}>
                RSVP &amp; Buku Tamu
              </h2>
            </div>

            <form
              onSubmit={handleSubmitRsvp}
              className={`${tpl.cardRadius} mt-5 space-y-3 border p-5`}
              style={cardSurfaceStyle}
            >
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: tpl.mutedColor }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  placeholder="Tulis nama Anda..."
                  style={{
                    backgroundColor: tpl.inputBg,
                    borderColor: tpl.inputBorder,
                    color: tpl.inputText,
                  }}
                  className="min-h-[44px] w-full rounded-xl border px-3.5 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: tpl.mutedColor }}>
                    Konfirmasi
                  </label>
                  <select
                    value={rsvpAttendance}
                    onChange={(e) => setRsvpAttendance(e.target.value as any)}
                    style={{
                      backgroundColor: tpl.inputBg,
                      borderColor: tpl.inputBorder,
                      color: tpl.inputText,
                    }}
                    className="min-h-[44px] w-full rounded-xl border px-3 text-sm focus:outline-none"
                  >
                    <option value="hadir" className="bg-white text-[#17201C]">
                      Hadir
                    </option>
                    <option value="tidak_hadir" className="bg-white text-[#17201C]">
                      Tidak Hadir
                    </option>
                    <option value="ragu" className="bg-white text-[#17201C]">
                      Masih Ragu
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: tpl.mutedColor }}>
                    Jumlah Tamu
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvpCount}
                    onChange={(e) => setRsvpCount(Number(e.target.value || 1))}
                    style={{
                      backgroundColor: tpl.inputBg,
                      borderColor: tpl.inputBorder,
                      color: tpl.inputText,
                    }}
                    className="min-h-[44px] w-full rounded-xl border px-3.5 text-sm tabular-nums focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: tpl.mutedColor }}>
                  Ucapan &amp; Doa Restu
                </label>
                <textarea
                  required
                  rows={3}
                  value={rsvpMessage}
                  onChange={(e) => setRsvpMessage(e.target.value)}
                  placeholder="Tuliskan doa dan ucapan hangat untuk mempelai..."
                  style={{
                    backgroundColor: tpl.inputBg,
                    borderColor: tpl.inputBorder,
                    color: tpl.inputText,
                  }}
                  className="w-full rounded-xl border p-3.5 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={rsvpSubmitting}
                style={primaryCtaStyle}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-opacity disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{rsvpSubmitting ? 'Mengirim...' : 'Kirim Ucapan & RSVP'}</span>
              </button>

              {whatsappConfirmUrl && (
                <a
                  href={whatsappConfirmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={secondaryOutlineStyle}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Konfirmasi via WhatsApp</span>
                </a>
              )}

              {rsvpFeedback && (
                <p
                  className="rounded-xl border px-3 py-2 text-center text-xs font-medium"
                  style={{ borderColor: accent, color: tpl.headingColor }}
                >
                  {rsvpFeedback}
                </p>
              )}
            </form>

            {/* Wishes Feed */}
            <div
              className={`${tpl.cardRadius} mt-4 max-h-[380px] space-y-2.5 overflow-y-auto border p-4 thin-scrollbar`}
              style={cardSurfaceStyle}
            >
              <div
                className="flex items-center justify-between border-b pb-2.5 text-xs font-semibold"
                style={{ borderColor: tpl.cardBorder, color: tpl.headingColor }}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" style={{ color: accent }} />
                  Ucapan Tamu
                </span>
                <span className="tabular-nums" style={{ color: tpl.mutedColor }}>
                  {wishes.length} Doa
                </span>
              </div>

              {wishes.length === 0 ? (
                <p className="py-6 text-center text-xs" style={{ color: tpl.mutedColor }}>
                  Jadilah yang pertama memberikan ucapan &amp; doa restu.
                </p>
              ) : (
                wishes.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border p-3.5"
                    style={{
                      borderColor: tpl.cardBorder,
                      backgroundColor: tpl.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.44)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <strong className="truncate text-sm font-semibold" style={{ color: tpl.headingColor }}>
                        {w.guestName}
                      </strong>
                      <span className="shrink-0 font-medium tabular-nums" style={{ color: tpl.mutedColor }}>
                        {w.attendance === 'hadir'
                          ? `Hadir · ${w.guestCount} org`
                          : w.attendance === 'tidak_hadir'
                          ? 'Tidak Hadir'
                          : 'Masih Ragu'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: tpl.bodyColor }}>
                      {w.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 7. CLOSING & FOOTER */}
          <footer className={`${spacingClass} pb-24 text-center`} style={floatingTextStyle}>
            <SectionDividerOrnament color={accent} styleType={design.ornamentStyle || tpl.defaultOrnament} />
            <p className={`mx-auto max-w-md font-medium leading-relaxed ${textSizeClass}`} style={{ color: tpl.headingColor }}>
              {couple.closingQuote}
            </p>
            <p className={`mt-5 text-2xl font-semibold ${headingFontClass}`} style={{ color: tpl.headingColor }}>
              {couple.groomNickname} <span style={{ color: accent }}>&amp;</span> {couple.brideNickname}
            </p>
            <p className="mt-5 text-[11px] font-medium" style={{ color: tpl.mutedColor }}>
              RUANGJANJI PRO · {tpl.name}
            </p>
            {!embeddedPreview && invitation.status === 'published' && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingHtml}
                  onClick={handleDownloadHtml}
                  style={{
                    borderColor: tpl.cardBorder,
                    color: tpl.headingColor,
                    backgroundColor: tpl.cardBg,
                    backdropFilter: 'blur(10px)',
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition-opacity hover:opacity-85 disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" style={{ color: accent }} />
                  <span>{downloadingHtml ? 'Mengunduh HTML...' : 'Download HTML Contoh Undangan'}</span>
                </button>
                {downloadFeedback && (
                  <p className="text-[11px] font-medium" style={{ color: tpl.headingColor }}>
                    {downloadFeedback}
                  </p>
                )}
              </div>
            )}
          </footer>
        </div>

        {/* ==================== FLOATING MUSIC TOGGLE + 6-TAB BOTTOM NAV ==================== */}
        {isOpened && (
          <div
            className={`${
              embeddedPreview
                ? 'sticky bottom-2.5 z-30 mx-3 mt-auto pb-1'
                : 'fixed bottom-3 left-1/2 z-30 w-[calc(100%-24px)] max-w-[436px] -translate-x-1/2 safe-bottom'
            } pointer-events-none flex flex-col items-end gap-2`}
          >
            {/* Floating Music Button neatly stacked above right side of nav bar */}
            {music.enabled && music.url && (
              <div className="pointer-events-auto flex items-center gap-2 pr-1">
                {musicToast && (
                  <div
                    className="hidden rounded-full border px-3 py-1 text-[11px] font-medium shadow-md backdrop-blur-md sm:block"
                    style={{
                      backgroundColor: tpl.navBg,
                      borderColor: accent,
                      color: tpl.headingColor,
                    }}
                  >
                    {music.title}
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleMusic}
                  aria-label={isPlaying ? 'Jeda musik' : 'Putar musik'}
                  className="flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-transform active:scale-95"
                  style={{
                    backgroundColor: tpl.primaryBg,
                    color: tpl.primaryText,
                    borderColor: accent,
                  }}
                >
                  {isPlaying ? (
                    <div className="relative flex items-center justify-center">
                      <Disc3 className="h-5 w-5 animate-spin-slow" style={{ color: tpl.isDark ? '#0F1F18' : accent }} />
                      <Pause className="absolute h-2.5 w-2.5" />
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <Music2 className="h-4 w-4" />
                      <Play className="ml-0.5 h-2.5 w-2.5 fill-current" />
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Compact 6-Tab Bottom Dock (Matches Reference Screenshots) */}
            <nav
              aria-label="Navigasi Bagian Undangan"
              className={`pointer-events-auto grid w-full grid-cols-6 items-center gap-0.5 border p-1 shadow-xl backdrop-blur-md ${tpl.navRadius}`}
              style={{
                backgroundColor: tpl.navBg,
                borderColor: tpl.navBorder,
              }}
            >
              {NAV_TABS.map((tab) => {
                const active = activeNav === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => scrollToSection(tab.id)}
                    className={`min-h-[38px] whitespace-nowrap px-1 text-[11px] font-medium transition-colors ${tpl.navRadius}`}
                    style={
                      active
                        ? { backgroundColor: tpl.navActiveBg, color: tpl.navActiveText }
                        : { color: tpl.navInactiveText }
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </main>

      {/* ==================== LIGHTBOX WITH ZOOM & PREV/NEXT ==================== */}
      {lightboxIdx !== null && imageGallery[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 text-white"
          onClick={() => setLightboxIdx(null)}
        >
          <div className="flex w-full max-w-2xl items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs tabular-nums text-white/75">
              {lightboxIdx + 1} / {imageGallery.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Perkecil foto"
                onClick={() => setZoomScale((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Perbesar foto"
                onClick={() => setZoomScale((z) => Math.min(2.5, Number((z + 0.5).toFixed(1))))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Tutup galeri"
                onClick={() => setLightboxIdx(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className="relative flex max-h-[75vh] w-full max-w-3xl flex-1 items-center justify-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageGallery[lightboxIdx].url}
              alt={imageGallery[lightboxIdx].caption || 'Preview'}
              style={{ transform: `scale(${zoomScale})` }}
              className="max-h-[72vh] rounded-xl object-contain transition-transform duration-200"
            />
            {imageGallery.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Sebelumnya"
                  onClick={() => {
                    setZoomScale(1);
                    setLightboxIdx((p) => ((p ?? 0) - 1 + imageGallery.length) % imageGallery.length);
                  }}
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Berikutnya"
                  onClick={() => {
                    setZoomScale(1);
                    setLightboxIdx((p) => ((p ?? 0) + 1) % imageGallery.length);
                  }}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-white/80">{imageGallery[lightboxIdx].caption}</p>
        </div>
      )}

      {/* ==================== QRIS ZOOM MODAL ==================== */}
      {qrisModalOpen && gifts.qrisImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setQrisModalOpen(false)}
        >
          <div className="max-w-xs rounded-3xl bg-white p-6 text-center text-[#17201C]" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-serif-display text-lg font-semibold">{gifts.qrisLabel || 'QRIS'}</h4>
            <img src={gifts.qrisImageUrl} alt="QRIS" className="mx-auto mt-4 h-64 w-64 object-contain" />
            <button
              type="button"
              onClick={() => setQrisModalOpen(false)}
              className="mt-4 min-h-[42px] w-full rounded-full bg-[#0F2C23] text-xs font-semibold text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
