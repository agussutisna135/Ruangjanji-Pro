export type ThemeCategory =
  | 'Pemandangan Alam'
  | 'Bangunan & Arsitektur'
  | 'Taman & Romantis'
  | 'Tema Mewah & Eksklusif'
  | 'Pemandangan & Destinasi Dunia';

export interface ThemeItem {
  id: number;
  name: string;
  category: ThemeCategory;
  imageUrl: string;
  accentHex: string;
  surfaceTint: string;
  isDarkBackdrop: boolean;
}

export interface CoupleData {
  groomName: string;
  groomNickname: string;
  groomFullName: string;
  groomPhoto: string;
  groomFather: string;
  groomMother: string;
  brideName: string;
  brideNickname: string;
  brideFullName: string;
  bridePhoto: string;
  brideFather: string;
  brideMother: string;
  couplePhoto: string;
  weddingDate: string;
  loveStory: Array<{
    year: string;
    title: string;
    description: string;
  }>;
  openingQuote: string;
  closingQuote: string;
  textPosition: 'top' | 'center' | 'bottom';
  nameScale: 'compact' | 'normal' | 'grand';
  nameStyle: 'serif' | 'italic' | 'uppercase';
}

export interface EventItem {
  id: string;
  type: string; // e.g., 'Akad Nikah', 'Resepsi', 'Unduh Mantu'
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  venueName: string;
  address: string;
  mapsUrl: string;
  directions: string;
  dressCode: string;
  liveStreamingEnabled: boolean;
  videoLink: string;
  scheduleNote: string;
  parkingInfo: string;
}

export interface GalleryMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  order: number;
}

export interface BankAccountItem {
  id: string;
  bankName: string; // BCA, BRI, BNI, Mandiri, BSI, or custom
  accountNumber: string;
  accountHolder: string;
}

export interface GiftsConfig {
  enabled: boolean;
  message: string;
  banks: BankAccountItem[];
  qrisImageUrl: string;
  qrisLabel: string;
  physicalGiftEnabled: boolean;
  recipientName: string;
  recipientAddress: string;
  whatsappNumber: string;
}

export interface MusicConfig {
  enabled: boolean;
  url: string;
  title: string;
  artist: string;
  volume: number; // 0 to 1
  autoplay: boolean;
  loop: boolean;
}

export interface CountdownConfig {
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // HH:mm
  timezone: string; // e.g. 'Asia/Jakarta'
}

export type InvitationTemplatePreset =
  | 'emerald-ivory'
  | 'midnight-gold'
  | 'sage-botanical'
  | 'blush-champagne'
  | 'editorial-monochrome'
  | 'sapphire-imperial'
  | 'javanese-royal'
  | 'aegean-white'
  | 'andalusian-arch'
  | 'velvet-noir';

export interface DesignConfig {
  templatePreset?: InvitationTemplatePreset;
  backgroundColor: string;
  backgroundImageOverride: string;
  textSize: 'sm' | 'md' | 'lg';
  headingFont: 'Playfair Display' | 'Cormorant Garamond' | 'Bodoni Moda' | 'Cinzel' | 'Fraunces';
  bodyFont: 'Plus Jakarta Sans' | 'DM Sans' | 'Lora';
  fontColor: string;
  accentColor: string;
  textAlign: 'left' | 'center' | 'right';
  spacing: 'compact' | 'normal' | 'airy';
  ornamentStyle: 'floral-gold' | 'botanical' | 'classic-frame' | 'minimal';
  photoFrame: 'arch' | 'circle' | 'rounded' | 'square' | 'oval';
  animationEffect: 'fade-up' | 'gentle-zoom' | 'silk-reveal' | 'none';
  pageTransition: 'curtain' | 'slide' | 'fade';
  buttonStyle: 'solid' | 'outline' | 'glass';
  iconStyle: 'classic' | 'minimal' | 'ornate';
  overlayOpacity: number; // 0.1 to 0.85
  layoutMode: 'editorial' | 'centered' | 'split';
}

export interface InvitationData {
  couple: CoupleData;
  turutMengundang: string[];
  countdown: CountdownConfig;
  events: EventItem[];
  gallery: GalleryMediaItem[];
  gifts: GiftsConfig;
  music: MusicConfig;
  design: DesignConfig;
}

export interface InvitationRecord {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  themeId: number;
  data: InvitationData;
  createdAt: string;
  updatedAt: string;
  stats?: {
    views: number;
    rsvpCount: number;
    attendingGuests: number;
    wishesCount: number;
  };
}

export interface GuestRecord {
  id: string;
  invitationId: string;
  name: string;
  phone: string;
  groupName: string;
  pax: number;
  rsvpStatus: string;
  createdAt: string;
}

export interface RsvpWishRecord {
  id: string;
  invitationId: string;
  guestName: string;
  attendance: 'hadir' | 'tidak_hadir' | 'ragu';
  guestCount: number;
  message: string;
  isApproved: boolean;
  whatsappConfirmed: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  totalInvitations: number;
  publishedInvitations: number;
  draftInvitations: number;
  totalVisitors: number;
  totalRsvp: number;
  attendingCount: number;
  notAttendingCount: number;
  maybeCount: number;
  totalWishes: number;
  visitSeries: Array<{ date: string; count: number }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
}
