import { DEFAULT_INVITATION_DATA } from '../shared/defaultInvitation.ts';
import { getTemplateStyleSpec } from '../shared/templateStyles.ts';
import { getThemeById } from '../shared/themes.ts';
import { InvitationData, InvitationTemplatePreset } from '../shared/types.ts';

export interface SeedInvitationSpec {
  id: string;
  slug: string;
  title: string;
  themeId: number;
  data: InvitationData;
  wishes: Array<{
    id: string;
    name: string;
    attendance: 'hadir' | 'tidak_hadir' | 'ragu';
    count: number;
    message: string;
  }>;
}

function makeInvitationData(overrides: {
  templatePreset: InvitationTemplatePreset;
  groomName: string;
  groomNickname: string;
  groomFullName: string;
  groomFather: string;
  groomMother: string;
  brideName: string;
  brideNickname: string;
  brideFullName: string;
  brideFather: string;
  brideMother: string;
  weddingDate: string;
  targetTime?: string;
  city: string;
  akadTitle?: string;
  akadVenue: string;
  akadAddress: string;
  resepsiVenue: string;
  resepsiAddress: string;
  themeImage: string;
  secondaryThemeImage?: string;
  musicUrl?: string;
  musicTitle?: string;
  headingFont?: InvitationData['design']['headingFont'];
  bodyFont?: InvitationData['design']['bodyFont'];
  ornamentStyle?: InvitationData['design']['ornamentStyle'];
  photoFrame?: InvitationData['design']['photoFrame'];
  layoutMode?: InvitationData['design']['layoutMode'];
  nameStyle?: InvitationData['couple']['nameStyle'];
  buttonStyle?: InvitationData['design']['buttonStyle'];
  pageTransition?: InvitationData['design']['pageTransition'];
  openingQuote?: string;
  closingQuote?: string;
  turutMengundang: string[];
  storyCity: string;
  heroPhoto?: string;
}): InvitationData {
  const tpl = getTemplateStyleSpec(overrides.templatePreset);

  return {
    ...DEFAULT_INVITATION_DATA,
    couple: {
      ...DEFAULT_INVITATION_DATA.couple,
      groomName: overrides.groomName,
      groomNickname: overrides.groomNickname,
      groomFullName: overrides.groomFullName,
      groomFather: overrides.groomFather,
      groomMother: overrides.groomMother,
      brideName: overrides.brideName,
      brideNickname: overrides.brideNickname,
      brideFullName: overrides.brideFullName,
      brideFather: overrides.brideFather,
      brideMother: overrides.brideMother,
      couplePhoto: overrides.heroPhoto || DEFAULT_INVITATION_DATA.couple.couplePhoto,
      weddingDate: overrides.weddingDate,
      openingQuote: overrides.openingQuote || DEFAULT_INVITATION_DATA.couple.openingQuote,
      closingQuote: overrides.closingQuote || DEFAULT_INVITATION_DATA.couple.closingQuote,
      nameStyle: overrides.nameStyle || 'serif',
      loveStory: [
        {
          year: '2023',
          title: `Awal Kisah di ${overrides.storyCity}`,
          description: `Pertemuan hangat di ${overrides.storyCity} menjadi awal percakapan panjang yang menyatukan dua hati dan cita-cita.`,
        },
        {
          year: '2025',
          title: 'Keyakinan & Komitmen',
          description:
            'Melalui doa, dukungan sahabat, serta restu keluarga besar, kami mantap melangkah menuju ikatan suci pernikahan.',
        },
        {
          year: '2026',
          title: 'Ikatan Keluarga',
          description: `Kini kami siap merayakan hari bahagia bersama seluruh keluarga dan sahabat tercinta di ${overrides.city}.`,
        },
      ],
    },
    turutMengundang: overrides.turutMengundang,
    countdown: {
      targetDate: overrides.weddingDate,
      targetTime: overrides.targetTime || '09:00',
      timezone: 'Asia/Jakarta',
    },
    events: [
      {
        id: 'evt-akad',
        type: overrides.akadTitle || 'Akad Nikah',
        date: overrides.weddingDate,
        startTime: '08:00',
        endTime: '10:00',
        venueName: overrides.akadVenue,
        address: overrides.akadAddress,
        mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(overrides.akadVenue + ' ' + overrides.city)}`,
        directions: `Akses gerbang utama ${overrides.akadVenue}, tersedia petugas penerima tamu.`,
        dressCode: 'Ivory, Champagne, atau Emerald Formal',
        liveStreamingEnabled: true,
        videoLink: 'https://youtube.com',
        scheduleNote: '08:00 Pembukaan · 08:30 Prosesi Sakral · 09:30 Sungkeman',
        parkingInfo: `Tersedia area parkir luas & layanan valet di ${overrides.akadVenue}.`,
      },
      {
        id: 'evt-resepsi',
        type: 'Resepsi Pernikahan',
        date: overrides.weddingDate,
        startTime: '11:30',
        endTime: '14:30',
        venueName: overrides.resepsiVenue,
        address: overrides.resepsiAddress,
        mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(overrides.resepsiVenue + ' ' + overrides.city)}`,
        directions: `Area ballroom utama ${overrides.resepsiVenue}, ikuti papan petunjuk tamu VIP.`,
        dressCode: 'Busana Batik Formal / Gaun Malam Elegan',
        liveStreamingEnabled: false,
        videoLink: '',
        scheduleNote: '11:30 Kirab Pengantin · 12:15 Jamuan & Ramah Tamah · 14:00 Sesi Foto',
        parkingInfo: `Tersedia area parkir terpadu di ${overrides.resepsiVenue}.`,
      },
    ],
    gallery: [
      {
        id: 'gal-1',
        type: 'image',
        url: overrides.heroPhoto || '/src/assets/images/sample_couple_portrait_1795010782620.jpg',
        caption: `${overrides.groomNickname} & ${overrides.brideNickname}`,
        order: 1,
      },
      {
        id: 'gal-2',
        type: 'image',
        url: overrides.themeImage,
        caption: `Nuansa ${overrides.city}`,
        order: 2,
      },
      {
        id: 'gal-3',
        type: 'image',
        url: overrides.secondaryThemeImage || '/src/assets/images/sample_groom_portrait_1795010781221.jpg',
        caption: `${overrides.akadVenue}`,
        order: 3,
      },
      {
        id: 'gal-4',
        type: 'image',
        url: '/src/assets/images/sample_bride_portrait_1795010782090.jpg',
        caption: overrides.brideFullName,
        order: 4,
      },
    ],
    gifts: {
      ...DEFAULT_INVITATION_DATA.gifts,
      banks: [
        {
          id: 'bank-bca',
          bankName: 'BCA',
          accountNumber: '5270841920',
          accountHolder: overrides.groomFullName,
        },
        {
          id: 'bank-mandiri',
          bankName: 'Mandiri',
          accountNumber: '1240008914521',
          accountHolder: overrides.brideFullName,
        },
      ],
      qrisLabel: `QRIS Pernikahan ${overrides.groomNickname} & ${overrides.brideNickname}`,
      recipientName: `${overrides.groomNickname} & ${overrides.brideNickname}`,
      recipientAddress: overrides.resepsiAddress,
    },
    music: {
      ...DEFAULT_INVITATION_DATA.music,
      url: overrides.musicUrl || '/audio/eternal-vow.wav',
      title: overrides.musicTitle || 'Eternal Vow — Piano Nocturne',
    },
    design: {
      ...DEFAULT_INVITATION_DATA.design,
      templatePreset: overrides.templatePreset,
      headingFont: overrides.headingFont || tpl.defaultHeadingFont,
      bodyFont: overrides.bodyFont || tpl.defaultBodyFont,
      ornamentStyle: overrides.ornamentStyle || tpl.defaultOrnament,
      photoFrame: overrides.photoFrame || tpl.defaultFrame,
      accentColor: tpl.accentColor,
      backgroundColor: tpl.canvasBg,
      fontColor: tpl.headingColor,
      layoutMode: overrides.layoutMode || 'editorial',
      buttonStyle: overrides.buttonStyle || 'solid',
      pageTransition: overrides.pageTransition || 'curtain',
    },
  };
}

export const SEED_INVITATIONS: SeedInvitationSpec[] = [
  // 1. EMERALD SANCTUARY GLASSHOUSE (Signature Ivory & Deep Emerald Arch)
  {
    id: 'inv-aditya-kirana',
    slug: 'aditya-kirana',
    title: 'Pernikahan Aditya & Kirana',
    themeId: 21,
    data: {
      ...DEFAULT_INVITATION_DATA,
      design: {
        ...DEFAULT_INVITATION_DATA.design,
        templatePreset: 'emerald-ivory',
      },
    },
    wishes: [
      {
        id: 'wsh-1',
        name: 'Bapak Ahmad Darmawan',
        attendance: 'hadir',
        count: 2,
        message: 'Selamat menempuh hidup baru Aditya & Kirana. Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.',
      },
      {
        id: 'wsh-2',
        name: 'Nadia Kusuma',
        attendance: 'hadir',
        count: 2,
        message: 'Bahagia selalu sampai maut memisahkan! Tidak sabar menghadiri Akad dan Resepsi di Menteng.',
      },
      {
        id: 'wsh-3',
        name: 'Raka Mahendra',
        attendance: 'ragu',
        count: 1,
        message: 'Selamat untuk keduanya, semoga dilancarkan segala persiapannya menuju hari H.',
      },
    ],
  },

  // 2. OBSIDIAN ROYAL GOLD (Dark Evening Architecture & Double Gold Border)
  {
    id: 'inv-rafi-aisyah',
    slug: 'rafi-aisyah',
    title: 'Pernikahan Rafi & Aisyah',
    themeId: 23,
    data: makeInvitationData({
      templatePreset: 'midnight-gold',
      groomName: 'Rafi Pratama',
      groomNickname: 'Rafi',
      groomFullName: 'dr. Rafi Pratama Hakim',
      groomFather: 'Bpk. Prof. H. Lukman Hakim',
      groomMother: 'Ibu Hj. Nurul Hidayah',
      brideName: 'Aisyah Azzahra',
      brideNickname: 'Aisyah',
      brideFullName: 'Aisyah Azzahra, S.Psi.',
      brideFather: 'Bpk. H. Ridwan Kamiluddin',
      brideMother: 'Ibu Hj. Fatimah Zahra',
      weddingDate: '2027-07-10',
      city: 'Yogyakarta',
      storyCity: 'Yogyakarta',
      akadVenue: 'Masjid Gedhe Kauman',
      akadAddress: 'Alun-Alun Keraton, Ngupasan, Gondomanan, Yogyakarta',
      resepsiVenue: 'Royal Ambarrukmo Grand Ballroom',
      resepsiAddress: 'Jl. Laksda Adisucipto No. 81, Sleman, Yogyakarta',
      themeImage: getThemeById(23).imageUrl,
      secondaryThemeImage: getThemeById(87).imageUrl,
      musicUrl: '/audio/ivory-morning.wav',
      musicTitle: 'Ivory Morning — Harp & Strings',
      pageTransition: 'fade',
      openingQuote:
        'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup agar kamu merasa tenteram dan menumbuhkan kasih sayang. (QS. Ar-Rum: 21)',
      turutMengundang: [
        'Keluarga Besar Trah Hakim (Yogyakarta)',
        'Keluarga Besar H. Ridwan Kamiluddin (Solo)',
        'Ikatan Dokter Muda RSUP Dr. Sardjito',
      ],
    }),
    wishes: [
      {
        id: 'wsh-rafi-1',
        name: 'dr. Farhan Akbar',
        attendance: 'hadir',
        count: 2,
        message: 'Barakallahu lakuma wa baraka alaikuma dokter Rafi dan Mbak Aisyah!',
      },
      {
        id: 'wsh-rafi-2',
        name: 'Salma Khairunnisa',
        attendance: 'hadir',
        count: 1,
        message: 'MasyaAllah, lancar sampai hari akad di Yogyakarta nanti.',
      },
    ],
  },

  // 3. UBUD SAGE & TERRACOTTA (Botanical Tropical Cliffside)
  {
    id: 'inv-bagas-nadia',
    slug: 'bagas-nadia',
    title: 'Pernikahan Bagas & Nadia',
    themeId: 100,
    data: makeInvitationData({
      templatePreset: 'sage-botanical',
      groomName: 'Bagas Wicaksono',
      groomNickname: 'Bagas',
      groomFullName: 'Bagas Wicaksono, B.Sc.',
      groomFather: 'Bpk. Agung Wicaksono',
      groomMother: 'Ibu Dewi Lestari',
      brideName: 'Nadia Pramesti',
      brideNickname: 'Nadia',
      brideFullName: 'Nadia Pramesti, S.Ds.',
      brideFather: 'Bpk. Made Suardana',
      brideMother: 'Ibu Luh Putu Ayu',
      weddingDate: '2027-08-14',
      city: 'Ubud, Bali',
      storyCity: 'Bali',
      akadTitle: 'Pemberkatan & Janji Suci',
      akadVenue: 'Chapel Lembah Ayung, Ubud',
      akadAddress: 'Jl. Raya Sayan, Ubud, Gianyar, Bali',
      resepsiVenue: 'Resort Cliffside Ubud Pavilion',
      resepsiAddress: 'Desa Kedewatan, Ubud, Gianyar, Bali 80571',
      themeImage: getThemeById(100).imageUrl,
      secondaryThemeImage: getThemeById(63).imageUrl,
      heroPhoto: getThemeById(100).imageUrl,
      musicUrl: '/audio/emerald-garden.wav',
      musicTitle: 'Emerald Garden — Acoustic Waltz',
      layoutMode: 'split',
      pageTransition: 'slide',
      openingQuote:
        'Di tengah keteduhan lembah Ubud, kami mengundang Bapak/Ibu/Saudara/i untuk menjadi saksi awal perjalanan hidup baru kami berdua.',
      turutMengundang: [
        'Keluarga Besar Wicaksono (Jakarta)',
        'Keluarga Besar Made Suardana (Denpasar)',
      ],
    }),
    wishes: [
      {
        id: 'wsh-bagas-1',
        name: 'Reza & Clara',
        attendance: 'hadir',
        count: 2,
        message: 'See you in Ubud! Tidak sabar merayakan hari spesial Bagas & Nadia.',
      },
    ],
  },

  // 4. CHÂTEAU ROSE SILK (Blush Silk & Burgundy Cameo Oval)
  {
    id: 'inv-dimas-calista',
    slug: 'dimas-calista',
    title: 'Pernikahan Dimas & Calista',
    themeId: 32,
    data: makeInvitationData({
      templatePreset: 'blush-champagne',
      groomName: 'Dimas Mahendra',
      groomNickname: 'Dimas',
      groomFullName: 'Dimas Mahendra Putra, S.E.',
      groomFather: 'Bpk. Bambang Mahendra',
      groomMother: 'Ibu Sri Wahyuni',
      brideName: 'Calista Evelina',
      brideNickname: 'Calista',
      brideFullName: 'Calista Evelina Tan, M.B.A.',
      brideFather: 'Bpk. Hendra Gunawan',
      brideMother: 'Ibu Meliana Kusuma',
      weddingDate: '2027-09-04',
      city: 'Bandung',
      storyCity: 'Bandung',
      akadTitle: 'Pemberkatan Nikah',
      akadVenue: 'Taman Mawar Padma Hotel',
      akadAddress: 'Jl. Ranca Bentang No. 56-58, Ciumbuleuit, Bandung',
      resepsiVenue: 'Grand Garden Ballroom Padma Bandung',
      resepsiAddress: 'Jl. Ranca Bentang No. 56-58, Ciumbuleuit, Bandung 40142',
      themeImage: getThemeById(32).imageUrl,
      secondaryThemeImage: getThemeById(72).imageUrl,
      nameStyle: 'italic',
      openingQuote:
        'Cinta bukan sekadar saling memandang, melainkan bersama-sama menatap masa depan ke arah yang sama penuh kasih karunia.',
      turutMengundang: [
        'Keluarga Besar Mahendra (Bandung)',
        'Keluarga Besar Gunawan (Jakarta)',
      ],
    }),
    wishes: [
      {
        id: 'wsh-dimas-1',
        name: 'Jessica Wijaya',
        attendance: 'hadir',
        count: 2,
        message: 'Happy wedding Dimas & Calista! Semoga penuh berkat dan kebahagiaan selamanya.',
      },
    ],
  },

  // 5. ALPINE EDITORIAL NOIR (Sharp Vogue Minimalism & Monolith Rules)
  {
    id: 'inv-farel-aurora',
    slug: 'farel-aurora',
    title: 'Pernikahan Farel & Aurora',
    themeId: 1,
    data: makeInvitationData({
      templatePreset: 'editorial-monochrome',
      groomName: 'Farel Dirgantara',
      groomNickname: 'Farel',
      groomFullName: 'Farel Dirgantara, M.Sc.',
      groomFather: 'Bpk. Surya Dirgantara',
      groomMother: 'Ibu Anita Permata',
      brideName: 'Aurora Mahardika',
      brideNickname: 'Aurora',
      brideFullName: 'Aurora Mahardika, S.H.',
      brideFather: 'Bpk. Gunadi Mahardika',
      brideMother: 'Ibu Ratna Juwita',
      weddingDate: '2027-10-09',
      city: 'Lembang & Interlaken',
      storyCity: 'Zurich',
      akadVenue: 'Chalet Pegunungan Lembang Glass Hall',
      akadAddress: 'Jl. Maribaya Timur Km. 6, Lembang, Jawa Barat',
      resepsiVenue: 'The Alpine Conservatory Hall',
      resepsiAddress: 'Jl. Maribaya Timur Km. 6, Lembang, Bandung Barat',
      themeImage: getThemeById(1).imageUrl,
      secondaryThemeImage: getThemeById(97).imageUrl,
      heroPhoto: getThemeById(1).imageUrl,
      musicUrl: '/audio/ivory-morning.wav',
      musicTitle: 'Ivory Morning — Harp & Strings',
      layoutMode: 'centered',
      nameStyle: 'uppercase',
      openingQuote:
        'Dua perjalanan yang dipertemukan di antara puncak pegunungan kini melangkah menuju satu ikrar seumur hidup.',
      turutMengundang: [
        'Keluarga Besar Dirgantara',
        'Keluarga Besar Mahardika',
      ],
    }),
    wishes: [
      {
        id: 'wsh-farel-1',
        name: 'Kevin Tanuwijaya',
        attendance: 'hadir',
        count: 2,
        message: 'Selamat Farel & Aurora! Temanya sangat elegan dan berkelas.',
      },
    ],
  },

  // 6. PARISIAN SAPPHIRE & GOLD (Imperial Midnight Navy & Roman Cinzel)
  {
    id: 'inv-kevin-aurelia',
    slug: 'kevin-aurelia',
    title: 'Pernikahan Kevin & Aurelia',
    themeId: 91,
    data: makeInvitationData({
      templatePreset: 'sapphire-imperial',
      groomName: 'Kevin Hartono',
      groomNickname: 'Kevin',
      groomFullName: 'Kevin Hartono, B.Arch.',
      groomFather: 'Bpk. Rudi Hartono',
      groomMother: 'Ibu Lydia Salim',
      brideName: 'Aurelia Nathania',
      brideNickname: 'Aurelia',
      brideFullName: 'Aurelia Nathania, S.I.Kom.',
      brideFather: 'Bpk. Victor Santoso',
      brideMother: 'Ibu Catherine Halim',
      weddingDate: '2027-11-06',
      city: 'Jakarta Selatan',
      storyCity: 'Paris',
      akadTitle: 'Holy Matrimony',
      akadVenue: 'Katedral & Kapel St. Theresia Menteng',
      akadAddress: 'Jl. Gereja Theresia No. 2, Menteng, Jakarta Pusat',
      resepsiVenue: 'The Ritz-Carlton Pacific Place Ballroom',
      resepsiAddress: 'SCBD Sudirman Kav. 52-53, Jakarta Selatan 12190',
      themeImage: getThemeById(91).imageUrl,
      secondaryThemeImage: getThemeById(83).imageUrl,
      heroPhoto: getThemeById(91).imageUrl,
      openingQuote:
        'Oleh kasih karunia Tuhan yang mempersatukan dua hati, dengan sukacita kami mengundang Bapak/Ibu/Saudara/i menghadiri perayaan pernikahan kami.',
      turutMengundang: [
        'Keluarga Besar Rudi Hartono',
        'Keluarga Besar Victor Santoso',
      ],
    }),
    wishes: [
      {
        id: 'wsh-kevin-1',
        name: 'Michelle Halim',
        attendance: 'hadir',
        count: 2,
        message: 'Congrats Kevin & Aurelia! Cannot wait for the celebration at Pacific Place.',
      },
    ],
  },

  // 7. KERATON SOGAN HERITAGE (Sandalwood Cream, Coklat Sogan & Classic Filigree)
  {
    id: 'inv-bima-saraswati',
    slug: 'bima-saraswati',
    title: 'Pernikahan Bima & Saraswati',
    themeId: 66,
    data: makeInvitationData({
      templatePreset: 'javanese-royal',
      groomName: 'Bima Sena',
      groomNickname: 'Bima',
      groomFullName: 'R. Bima Sena Adiningrat, S.T.',
      groomFather: 'Bpk. K.R.T. Prabu Adiningrat',
      groomMother: 'Ibu R.Ay. Sekar Tanjung',
      brideName: 'Saraswati Kusuma',
      brideNickname: 'Saraswati',
      brideFullName: 'Dyah Saraswati Kusuma, M.Pd.',
      brideFather: 'Bpk. H. Nugroho Kusumo',
      brideMother: 'Ibu Hj. Endang Larasati',
      weddingDate: '2027-11-20',
      city: 'Surakarta (Solo)',
      storyCity: 'Surakarta',
      akadVenue: 'Pendopo Agung Dalem Keraton',
      akadAddress: 'Jl. Slamet Riyadi No. 210, Laweyan, Surakarta',
      resepsiVenue: 'Pendopo Sasana Purnama Heritage',
      resepsiAddress: 'Jl. Brigjen Slamet Riyadi No. 212, Surakarta 57141',
      themeImage: getThemeById(66).imageUrl,
      secondaryThemeImage: getThemeById(67).imageUrl,
      heroPhoto: getThemeById(66).imageUrl,
      musicUrl: '/audio/emerald-garden.wav',
      musicTitle: 'Emerald Garden — Acoustic Waltz',
      openingQuote:
        'Mugi tansah pinaringan berkah lan karahayon. Dengan penuh rasa hormat kami mengundang Bapak/Ibu/Saudara/i menghadiri tasyakuran pernikahan putra-putri kami.',
      turutMengundang: [
        'Keluarga Besar Trah Adiningrat Surakarta',
        'Keluarga Besar H. Nugroho Kusumo',
      ],
    }),
    wishes: [
      {
        id: 'wsh-bima-1',
        name: 'Raden Mas Bagus',
        attendance: 'hadir',
        count: 2,
        message: 'Sugeng tanggap warsa lan sugeng menempuh gesang bebrayan enggal kagem Mas Bima saha Mbak Saras.',
      },
    ],
  },

  // 8. SANTORINI AEGEAN AZURE (Sunlit Whitewash, Cobalt Blue & Circular Portal)
  {
    id: 'inv-erlangga-meisya',
    slug: 'erlangga-meisya',
    title: 'Pernikahan Erlangga & Meisya',
    themeId: 51,
    data: makeInvitationData({
      templatePreset: 'aegean-white',
      groomName: 'Erlangga Yudhistira',
      groomNickname: 'Erlangga',
      groomFullName: 'Erlangga Yudhistira, S.H.',
      groomFather: 'Bpk. Ir. Teguh Yudhistira',
      groomMother: 'Ibu Maya Puspita',
      brideName: 'Meisya Maharani',
      brideNickname: 'Meisya',
      brideFullName: 'Meisya Maharani, S.Farm.',
      brideFather: 'Bpk. Drs. Wahyu Hidayat',
      brideMother: 'Ibu Nina Oktavia',
      weddingDate: '2027-12-04',
      city: 'Lombok & Bali',
      storyCity: 'Santorini',
      akadVenue: 'Oceanfront White Terrace, Jimbaran',
      akadAddress: 'Jl. Karang Mas Sejahtera, Jimbaran, Bali',
      resepsiVenue: 'Ayana Sunset Cliffside Ballroom',
      resepsiAddress: 'Jl. Karang Mas Sejahtera, Jimbaran, Badung, Bali 80364',
      themeImage: getThemeById(51).imageUrl,
      secondaryThemeImage: getThemeById(92).imageUrl,
      heroPhoto: getThemeById(51).imageUrl,
      openingQuote:
        'Bagai cakrawala biru yang bertemu di garis senja, kami merayakan janji setia yang menyatukan langkah kami menuju masa depan.',
      turutMengundang: [
        'Keluarga Besar Yudhistira (Jakarta)',
        'Keluarga Besar Hidayat (Semarang)',
      ],
    }),
    wishes: [
      {
        id: 'wsh-erlangga-1',
        name: 'Dinda & Ilham',
        attendance: 'hadir',
        count: 2,
        message: 'Selamat berbahagia Erlangga & Meisya! Pemandangan lautnya indah sekali.',
      },
    ],
  },

  // 9. ANDALUSIAN SAND & CEDAR (Warm Sandstone, Cedar Emerald & Moorish Dome Arch)
  {
    id: 'inv-hafiz-zahra',
    slug: 'hafiz-zahra',
    title: 'Pernikahan Hafiz & Zahra',
    themeId: 24,
    data: makeInvitationData({
      templatePreset: 'andalusian-arch',
      groomName: 'Hafiz Al-Faruq',
      groomNickname: 'Hafiz',
      groomFullName: 'Muhammad Hafiz Al-Faruq, Lc., M.A.',
      groomFather: 'Bpk. KH. Ahmad Fauzi',
      groomMother: 'Ibu Hj. Aminah Salsabila',
      brideName: 'Zahra Humaira',
      brideNickname: 'Zahra',
      brideFullName: 'Zahra Humaira Putri, S.Keb.',
      brideFather: 'Bpk. H. Zulkifli Rahman',
      brideMother: 'Ibu Hj. Maryam',
      weddingDate: '2027-12-18',
      city: 'Medan',
      storyCity: 'Istanbul',
      akadVenue: 'Masjid Raya Al-Mashun Heritage',
      akadAddress: 'Jl. Sisingamangaraja, Medan Kota, Sumatera Utara',
      resepsiVenue: 'Grand Aston City Hall Medan',
      resepsiAddress: 'Jl. Balai Kota No. 1, Kesawan, Medan Barat 20112',
      themeImage: getThemeById(24).imageUrl,
      secondaryThemeImage: getThemeById(94).imageUrl,
      heroPhoto: getThemeById(24).imageUrl,
      musicUrl: '/audio/ivory-morning.wav',
      musicTitle: 'Ivory Morning — Harp & Strings',
      openingQuote:
        'Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Dengan penuh syukur kami mengundang hadirin dalam walimatul ursy putra-putri kami.',
      turutMengundang: [
        'Keluarga Besar KH. Ahmad Fauzi (Medan)',
        'Keluarga Besar H. Zulkifli Rahman (Padang)',
      ],
    }),
    wishes: [
      {
        id: 'wsh-hafiz-1',
        name: 'Ustadz Salman',
        attendance: 'hadir',
        count: 2,
        message: 'Barakallah Ustadz Hafiz & Ukhti Zahra. Semoga menjadi keluarga penuh keberkahan.',
      },
    ],
  },

  // 10. VELVET EMERALD GALA (Deep Smoked Emerald & Luminous Champagne)
  {
    id: 'inv-hendra-putri',
    slug: 'hendra-putri',
    title: 'Pernikahan Hendra & Putri',
    themeId: 82,
    data: makeInvitationData({
      templatePreset: 'velvet-noir',
      groomName: 'Hendra Wijaya',
      groomNickname: 'Hendra',
      groomFullName: 'Hendra Wijaya Kusuma, M.M.',
      groomFather: 'Bpk. H. Eko Kusuma',
      groomMother: 'Ibu Hj. Sulastri',
      brideName: 'Putri Anggraini',
      brideNickname: 'Putri',
      brideFullName: 'Putri Anggraini, S.Ak.',
      brideFather: 'Bpk. Ir. Slamet Riyadi',
      brideMother: 'Ibu Indah Permatasari',
      weddingDate: '2028-01-15',
      city: 'Surabaya',
      storyCity: 'Surabaya',
      akadVenue: 'Ballroom Shangri-La Velvet Emerald',
      akadAddress: 'Jl. Mayjen Sungkono No. 120, Surabaya',
      resepsiVenue: 'Grand Emerald Ballroom JW Marriott Surabaya',
      resepsiAddress: 'Jl. Embong Malang No. 85-89, Genteng, Surabaya 60261',
      themeImage: getThemeById(82).imageUrl,
      secondaryThemeImage: getThemeById(85).imageUrl,
      layoutMode: 'centered',
      pageTransition: 'fade',
      openingQuote:
        'Dengan penuh rasa syukur dan kebahagiaan, kami mengundang kehadiran Bapak/Ibu/Saudara/i untuk merayakan malam penuh cinta dan doa restu.',
      turutMengundang: [
        'Keluarga Besar H. Eko Kusuma (Surabaya)',
        'Keluarga Besar Ir. Slamet Riyadi (Malang)',
      ],
    }),
    wishes: [
      {
        id: 'wsh-hendra-1',
        name: 'Andi Setiawan',
        attendance: 'hadir',
        count: 2,
        message: 'Selamat Mas Hendra & Mbak Putri! Sampai jumpa di ballroom Surabaya.',
      },
    ],
  },
];
