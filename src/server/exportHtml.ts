import fs from 'fs';
import path from 'path';
import { getTemplateStyleSpec, TemplateStyleSpec } from '../shared/templateStyles.ts';
import { getThemeById } from '../shared/themes.ts';
import { InvitationRecord } from '../shared/types.ts';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIndoDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
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

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
  };
  return map[ext] || 'application/octet-stream';
}

function resolveLocalAssetAsDataUri(urlPath: string, originUrl: string): string {
  if (!urlPath) return '';
  if (urlPath.startsWith('data:') || urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath;
  }

  const cleanRel = urlPath.replace(/^\/+/, '');
  const candidates = [
    path.resolve(process.cwd(), cleanRel),
    path.resolve(process.cwd(), 'public', cleanRel),
    path.resolve(process.cwd(), 'dist', cleanRel),
  ];

  for (const full of candidates) {
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const size = fs.statSync(full).size;
      if (size <= 6 * 1024 * 1024) {
        const mime = getMimeType(full);
        const b64 = fs.readFileSync(full).toString('base64');
        return `data:${mime};base64,${b64}`;
      }
      break;
    }
  }

  return originUrl ? `${originUrl.replace(/\/$/, '')}${urlPath.startsWith('/') ? '' : '/'}${urlPath}` : urlPath;
}

function mapCardRadiusCss(radiusToken: string): string {
  if (radiusToken.includes('rounded-none')) return '0px';
  if (radiusToken.includes('rounded-t-[32px]')) return '32px 32px 16px 16px';
  if (radiusToken.includes('rounded-[32px]')) return '32px';
  if (radiusToken.includes('rounded-[30px]')) return '30px';
  if (radiusToken.includes('rounded-[28px]')) return '28px';
  if (radiusToken.includes('rounded-[26px]')) return '26px';
  return '18px';
}

function mapCountdownRadiusCss(radiusToken: string): string {
  if (radiusToken.includes('rounded-none')) return '0px';
  if (radiusToken.includes('rounded-t-2xl')) return '16px 16px 8px 8px';
  if (radiusToken.includes('rounded-[20px]')) return '20px';
  if (radiusToken.includes('rounded-2xl')) return '16px';
  return '12px';
}

function mapNavRadiusCss(radiusToken: string): string {
  if (radiusToken.includes('rounded-none')) return '0px';
  if (radiusToken.includes('rounded-full')) return '999px';
  if (radiusToken.includes('rounded-2xl')) return '16px';
  return '12px';
}

function mapPhotoFrameCss(frame: string): string {
  switch (frame) {
    case 'circle':
      return '999px';
    case 'oval':
      return '999px';
    case 'square':
      return '2px';
    case 'rounded':
      return '26px';
    case 'arch':
    default:
      return '999px 999px 24px 24px';
  }
}

function renderHeroPortraitHtml(
  tpl: TemplateStyleSpec,
  heroPortraitUrl: string,
  groomNick: string,
  brideNick: string,
  weddingDate: string,
  accent: string
): string {
  const safeUrl = escapeHtml(heroPortraitUrl);
  const safeAlt = escapeHtml(`${groomNick} & ${brideNick}`);

  switch (tpl.heroVariant) {
    case 'royal-monogram':
      return `
        <div class="hero-frame hero-royal" style="border-color:${escapeHtml(accent)}70">
          <div class="hero-royal-inner" style="border-color:${escapeHtml(accent)}45">
            <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-3-4"/>
            <div class="hero-monogram-fade"></div>
            <div class="hero-monogram-tag" style="border-color:${escapeHtml(accent)};color:${escapeHtml(accent)}">${escapeHtml(groomNick[0] || 'A')} &amp; ${escapeHtml(brideNick[0] || 'K')}</div>
          </div>
        </div>`;
    case 'editorial-poster':
      return `
        <div class="hero-frame hero-editorial">
          <div class="editorial-bar" style="border-color:${escapeHtml(tpl.cardBorder)};color:${escapeHtml(tpl.mutedColor)}">
            Edisi Eksklusif &middot; ${escapeHtml(formatIndoDate(weddingDate))}
          </div>
          <div class="editorial-img-wrap" style="border-color:${escapeHtml(tpl.headingColor)}">
            <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-4-5 grayscale-15"/>
          </div>
        </div>`;
    case 'cameo-oval':
      return `
        <div class="hero-frame hero-oval" style="border-color:${escapeHtml(accent)};background:${escapeHtml(tpl.cardBg)}">
          <div class="hero-oval-clip"><img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-3-4"/></div>
        </div>`;
    case 'mediterranean-circle':
      return `
        <div class="hero-frame hero-circle" style="border-color:${escapeHtml(accent)};background:${escapeHtml(tpl.cardBg)}">
          <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-1-1 round-full"/>
        </div>`;
    case 'botanical-window':
      return `
        <div class="hero-frame hero-botanical" style="border-color:${escapeHtml(accent)}55;background:${escapeHtml(tpl.cardBg)}">
          <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-4-5" style="border-radius:30px"/>
        </div>`;
    case 'imperial-crest':
      return `
        <div class="hero-frame hero-arch" style="border-color:${escapeHtml(tpl.primaryBg)};border-width:3px">
          <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-3-4"/>
        </div>`;
    case 'andalusian-courtyard':
      return `
        <div class="hero-frame hero-andalusian" style="border-color:${escapeHtml(accent)};background:${escapeHtml(tpl.cardBg)}">
          <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-3-4" style="border-radius:174px 174px 8px 8px"/>
        </div>`;
    case 'velvet-spotlight':
      return `
        <div class="hero-frame hero-arch" style="border-color:${escapeHtml(accent)}88;border-width:1px">
          <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-3-4"/>
        </div>`;
    case 'keraton-heritage':
    case 'signature-arch':
    default:
      return `
        <div class="hero-frame hero-arch" style="border-color:${escapeHtml(accent)};border-width:2px">
          <img src="${safeUrl}" alt="${safeAlt}" class="hero-img ratio-3-4"/>
        </div>`;
  }
}

export function buildStandaloneInvitationHtml(
  invitation: InvitationRecord,
  originUrl: string,
  wishes: Array<{ guestName: string; attendance: string; guestCount?: number; message: string; createdAt: string }>
): string {
  const { data } = invitation;
  const tpl = getTemplateStyleSpec(data.design.templatePreset);
  const theme = getThemeById(invitation.themeId);
  const accent = data.design.accentColor || tpl.accentColor;
  const tzLabel = getTimezoneLabel(data.countdown.timezone);
  const tzOffset = getTimezoneOffsetIso(data.countdown.timezone);

  const bgUrl = resolveLocalAssetAsDataUri(
    data.design.backgroundImageOverride || theme.imageUrl,
    originUrl
  );
  const groomPhoto = resolveLocalAssetAsDataUri(data.couple.groomPhoto, originUrl);
  const bridePhoto = resolveLocalAssetAsDataUri(data.couple.bridePhoto, originUrl);
  const couplePhoto = resolveLocalAssetAsDataUri(data.couple.couplePhoto, originUrl) || bgUrl;
  const qrisImg = resolveLocalAssetAsDataUri(data.gifts.qrisImageUrl, originUrl);
  const musicUrl = data.music.enabled ? resolveLocalAssetAsDataUri(data.music.url, originUrl) : '';

  const cardRadius = mapCardRadiusCss(tpl.cardRadius);
  const countdownRadius = mapCountdownRadiusCss(tpl.countdownRadius);
  const navRadius = mapNavRadiusCss(tpl.navRadius);
  const photoFrameRadius = mapPhotoFrameCss(data.design.photoFrame || tpl.defaultFrame);

  const headingFont = data.design.headingFont || tpl.defaultHeadingFont;
  const bodyFont = data.design.bodyFont || tpl.defaultBodyFont;
  const apiBase = originUrl ? originUrl.replace(/\/$/, '') : '';

  const textShadowCss = tpl.isDark
    ? '0 1px 14px rgba(0, 0, 0, 0.90)'
    : '0 1px 14px rgba(255, 253, 249, 0.95), 0 0 3px rgba(255, 253, 249, 0.95)';

  const secondaryBtnBg = tpl.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.50)';
  const wishSubCardBg = tpl.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.48)';

  const galleryHtml = data.gallery
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const resolved = resolveLocalAssetAsDataUri(item.url, originUrl);
      if (item.type === 'video') {
        return `<div class="gal-card"><video src="${escapeHtml(resolved)}" controls playsinline class="gal-media"></video>${item.caption ? `<p class="gal-cap">${escapeHtml(item.caption)}</p>` : ''}</div>`;
      }
      return `<div class="gal-card" onclick="openLightbox(this.querySelector('img').src, this.getAttribute('data-cap'))" data-cap="${escapeHtml(item.caption)}"><img src="${escapeHtml(resolved)}" alt="${escapeHtml(item.caption || 'Foto Galeri')}" class="gal-media"/>${item.caption ? `<p class="gal-cap">${escapeHtml(item.caption)}</p>` : ''}</div>`;
    })
    .join('\n');

  const eventsHtml = data.events
    .map((ev) => {
      const scheduleEntries = parseScheduleEntries(ev.scheduleNote, tzLabel);
      const scheduleBlock = scheduleEntries.length
        ? `<div class="sched-wrap">
            <p class="sched-head">Jadwal Acara</p>
            <div class="sched-list">
              ${scheduleEntries
                .map(
                  (entry) => `
                <div class="sched-row">
                  <span class="sched-time">${escapeHtml(entry.time || 'Jadwal')}</span>
                  <span class="sched-act">${escapeHtml(entry.activity)}</span>
                </div>`
                )
                .join('')}
            </div>
          </div>`
        : '';

      return `
      <div class="glass-card center">
        <p class="eyebrow">${escapeHtml(ev.type)}</p>
        <h3 class="venue">${escapeHtml(ev.venueName)}</h3>
        <p class="ev-meta">${escapeHtml(formatIndoDate(ev.date))} &middot; ${escapeHtml(ev.startTime)} &ndash; ${escapeHtml(ev.endTime)} ${escapeHtml(tzLabel)}</p>
        <p class="body-copy">${escapeHtml(ev.address)}</p>
        ${(ev.directions || ev.dressCode || ev.parkingInfo)
          ? `<div class="ev-notes">
              ${ev.directions ? `<p>Petunjuk: ${escapeHtml(ev.directions)}</p>` : ''}
              ${ev.dressCode ? `<p>Dress Code: ${escapeHtml(ev.dressCode)}</p>` : ''}
              ${ev.parkingInfo ? `<p>Parkir: ${escapeHtml(ev.parkingInfo)}</p>` : ''}
            </div>`
          : ''}
        ${scheduleBlock}
        <div class="btn-row">
          ${ev.mapsUrl ? `<a class="btn-primary" href="${escapeHtml(ev.mapsUrl)}" target="_blank" rel="noopener noreferrer">Petunjuk Lokasi</a>` : ''}
          ${ev.liveStreamingEnabled && ev.videoLink ? `<a class="btn-outline" href="${escapeHtml(ev.videoLink)}" target="_blank" rel="noopener noreferrer">Live Streaming</a>` : ''}
        </div>
      </div>`;
    })
    .join('\n');

  const loveStoryHtml = data.couple.loveStory.length
    ? tpl.timelineStyle === 'narrative-card'
      ? `<div class="glass-card center" style="margin-top:1rem">
          <p class="eyebrow">Kisah Cinta</p>
          <h3 class="sec-sub-title">Perjalanan Kami</h3>
          <div class="orn-line"></div>
          <div class="story-stack">
            ${data.couple.loveStory
              .map(
                (item) => `
              <div class="story-item">
                <p class="story-year">${escapeHtml(item.year)} &middot; ${escapeHtml(item.title)}</p>
                <p class="body-copy">${escapeHtml(item.description)}</p>
              </div>`
              )
              .join('')}
          </div>
        </div>`
      : tpl.timelineStyle === 'editorial-columns'
      ? `<div class="glass-card" style="margin-top:1rem">
          <div class="center">
            <p class="eyebrow">Kisah Cinta</p>
            <h3 class="sec-sub-title">Jejak Langkah Kami</h3>
          </div>
          <div class="ed-story-list">
            ${data.couple.loveStory
              .map(
                (item) => `
              <div class="ed-story-row">
                <div class="ed-year">${escapeHtml(item.year)}</div>
                <div>
                  <h4 class="ed-title">${escapeHtml(item.title)}</h4>
                  <p class="body-copy">${escapeHtml(item.description)}</p>
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>`
      : `<div style="margin-top:1.25rem">
          <div class="floating-head">
            <p class="eyebrow">Kisah Cinta</p>
            <h3 class="sec-sub-title">Perjalanan Kami</h3>
          </div>
          ${data.couple.loveStory
            .map(
              (item) => `
            <div class="glass-card">
              <p class="story-year">&#9825; ${escapeHtml(item.year)}</p>
              <h4 class="ed-title" style="margin-top:4px">${escapeHtml(item.title)}</h4>
              <p class="body-copy" style="margin-top:4px">${escapeHtml(item.description)}</p>
            </div>`
            )
            .join('')}
        </div>`
    : '';

  const turutHtml = data.turutMengundang.length
    ? `<div style="margin-top:2rem">
        <div class="floating-head">
          <p class="eyebrow">Kehormatan Kami</p>
          <h3 class="sec-sub-title">Turut Mengundang</h3>
        </div>
        <div class="glass-card center">
          <ul class="turut-list">
            ${data.turutMengundang.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      </div>`
    : '';

  const banksHtml = data.gifts.enabled
    ? `<section id="sec-amplop" class="section">
        <div class="glass-card center">
          <p class="eyebrow">Tanda Kasih</p>
          <h2 class="sec-title">Amplop Digital</h2>
          <p class="body-copy">${escapeHtml(data.gifts.message)}</p>
          <div class="bank-stack">
            ${data.gifts.banks
              .map(
                (b) => `
              <div class="bank-row">
                <div class="bank-info">
                  <p class="bank-name">${escapeHtml(b.bankName)}</p>
                  <p class="acc-num">${escapeHtml(b.accountNumber)}</p>
                  <p class="acc-holder">a.n. ${escapeHtml(b.accountHolder)}</p>
                </div>
                <button type="button" class="btn-copy" onclick="copyText('${escapeHtml(b.accountNumber)}', this)">Salin</button>
              </div>`
              )
              .join('')}
          </div>
          ${
            qrisImg
              ? `<div class="qris-box">
                  <p class="eyebrow">${escapeHtml(data.gifts.qrisLabel || 'QRIS')}</p>
                  <img src="${escapeHtml(qrisImg)}" alt="QRIS" class="qris-img" onclick="openLightbox('${escapeHtml(qrisImg)}','${escapeHtml(data.gifts.qrisLabel || 'QRIS')}')"/>
                </div>`
              : ''
          }
          ${
            data.gifts.physicalGiftEnabled && data.gifts.recipientAddress
              ? `<div class="gift-box">
                  <p class="eyebrow">Alamat Pengiriman Hadiah</p>
                  <p class="body-copy"><strong>${escapeHtml(data.gifts.recipientName)}</strong><br/>${escapeHtml(data.gifts.recipientAddress)}</p>
                </div>`
              : ''
          }
          ${
            data.gifts.whatsappNumber
              ? `<a class="btn-primary" style="margin-top:1rem" href="https://wa.me/${escapeHtml(data.gifts.whatsappNumber.replace(/\D/g, ''))}?text=${encodeURIComponent(`Halo ${data.couple.groomNickname} & ${data.couple.brideNickname}, saya ingin mengonfirmasi tanda kasih untuk pernikahan Anda.`)}" target="_blank" rel="noopener noreferrer">Konfirmasi Hadiah via WhatsApp</a>`
              : ''
          }
        </div>
      </section>`
    : '';

  const wishesHtml = wishes
    .map(
      (w) => `
      <div class="wish-card">
        <div class="wish-head">
          <strong>${escapeHtml(w.guestName)}</strong>
          <span>${w.attendance === 'hadir' ? `Hadir &middot; ${w.guestCount || 1} org` : w.attendance === 'tidak_hadir' ? 'Tidak Hadir' : 'Masih Ragu'}</span>
        </div>
        <p class="wish-msg">${escapeHtml(w.message)}</p>
      </div>`
    )
    .join('\n');

  const coverBtnStyle =
    data.design.buttonStyle === 'outline'
      ? `background:transparent;color:${accent};border:1.5px solid ${accent};`
      : data.design.buttonStyle === 'glass'
      ? `background:rgba(15,32,26,.62);color:#FAF8F4;border:1px solid ${accent};backdrop-filter:blur(12px);`
      : `background:${accent};color:#121815;border:1px solid ${accent};`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>The Wedding of ${escapeHtml(data.couple.groomNickname)} &amp; ${escapeHtml(data.couple.brideNickname)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;1,6..96,500&family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Lora:ital,wght@0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --canvas-bg: ${escapeHtml(tpl.canvasBg)};
      --backdrop-wash: ${escapeHtml(tpl.backdropWash)};
      --card-bg: ${escapeHtml(tpl.cardBg)};
      --card-border: ${escapeHtml(tpl.cardBorder)};
      --card-shadow: ${escapeHtml(tpl.cardShadow)};
      --heading: ${escapeHtml(tpl.headingColor)};
      --body: ${escapeHtml(tpl.bodyColor)};
      --muted: ${escapeHtml(tpl.mutedColor)};
      --accent: ${escapeHtml(accent)};
      --primary-bg: ${escapeHtml(tpl.primaryBg)};
      --primary-text: ${escapeHtml(tpl.primaryText)};
      --cd-bg: ${escapeHtml(tpl.countdownBg)};
      --cd-text: ${escapeHtml(tpl.countdownText)};
      --cd-label: ${escapeHtml(tpl.countdownLabelColor)};
      --nav-bg: ${escapeHtml(tpl.navBg)};
      --nav-border: ${escapeHtml(tpl.navBorder)};
      --nav-active-bg: ${escapeHtml(tpl.navActiveBg)};
      --nav-active-text: ${escapeHtml(tpl.navActiveText)};
      --nav-inactive: ${escapeHtml(tpl.navInactiveText)};
      --input-bg: ${escapeHtml(tpl.inputBg)};
      --input-border: ${escapeHtml(tpl.inputBorder)};
      --input-text: ${escapeHtml(tpl.inputText)};
      --font-head: '${escapeHtml(headingFont)}', Georgia, serif;
      --font-body: '${escapeHtml(bodyFont)}', system-ui, sans-serif;
      --bg-img: url('${escapeHtml(bgUrl)}');
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      overflow-x: clip;
      background: var(--canvas-bg);
      color: var(--body);
      font-family: var(--font-body);
      line-height: 1.6;
      scroll-behavior: smooth;
    }
    /* Desktop Ambient Blur Outside 460px Phone Column */
    .desktop-ambient {
      display: none;
    }
    @media (min-width: 1024px) {
      .desktop-ambient {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .desktop-ambient-img {
        width: 100%;
        height: 100%;
        background-image: var(--bg-img);
        background-size: cover;
        background-position: center;
        transform: scale(1.06);
        opacity: 0.25;
        filter: blur(28px);
      }
      .desktop-ambient-veil {
        position: absolute;
        inset: 0;
        background: var(--canvas-bg);
        opacity: 0.8;
      }
    }
    /* Opening Cover */
    .cover {
      position: fixed;
      inset: 0;
      z-index: 50;
      min-height: 100svh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: max(3rem, env(safe-area-inset-top)) 1.5rem max(2.75rem, env(safe-area-inset-bottom));
      color: #fff;
      background-image: var(--bg-img);
      background-size: cover;
      background-position: center;
      transition: transform .7s cubic-bezier(.16,1,.3,1), opacity .6s ease;
    }
    .cover.opened { transform: translateY(-100%); opacity: 0; pointer-events: none; }
    .cover-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(10,18,15,${Math.max(0.25, data.design.overlayOpacity - 0.1)}) 0%, rgba(10,18,15,${Math.min(0.88, data.design.overlayOpacity + 0.25)}) 100%);
    }
    .cover-inner { position: relative; z-index: 2; max-width: 360px; width: 100%; }
    .cover-kicker { font-size: 11px; letter-spacing: .32em; text-transform: uppercase; color: #F5E8CE; font-weight: 500; }
    .cover-names { font-family: var(--font-head); font-size: clamp(2.15rem, 8vw, 3.1rem); line-height: 1.12; margin: .65rem 0; font-weight: 600; }
    .cover-date { font-size: 14px; color: rgba(255,255,255,.9); font-weight: 500; }
    .guest-box {
      border: 1px solid rgba(255,255,255,.25);
      background: rgba(0,0,0,.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: .9rem 1.25rem;
      margin-bottom: 1rem;
    }
    .btn-open {
      width: 100%;
      min-height: 48px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: .18em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 10px 26px rgba(0,0,0,.28);
    }

    /* Main Column & Pinned Transparent Backdrop */
    .main-col {
      position: relative;
      z-index: 1;
      max-width: 460px;
      width: 100%;
      margin: 0 auto;
      min-height: 100svh;
      box-shadow: 0 24px 60px rgba(0,0,0,.25);
    }
    .pinned-bg {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 460px;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .pinned-bg-img { width: 100%; height: 100%; background-image: var(--bg-img); background-size: cover; background-position: center; }
    .pinned-wash { position: absolute; inset: 0; background: var(--backdrop-wash); }

    .fg { position: relative; z-index: 2; padding-bottom: 6.5rem; }
    .section { padding: 1.5rem 1rem; }
    .floating-head { text-align: center; text-shadow: ${textShadowCss}; margin-bottom: .5rem; }
    .eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .26em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .hero-title {
      font-family: var(--font-head);
      font-size: clamp(2.15rem, 8vw, 2.85rem);
      line-height: 1.12;
      color: var(--heading);
      font-weight: 600;
      margin-top: .45rem;
      text-shadow: ${textShadowCss};
    }
    .sec-title {
      font-family: var(--font-head);
      font-size: 1.75rem;
      line-height: 1.2;
      color: var(--heading);
      font-weight: 600;
      margin-top: .25rem;
    }
    .sec-sub-title {
      font-family: var(--font-head);
      font-size: 1.5rem;
      line-height: 1.25;
      color: var(--heading);
      font-weight: 600;
      margin-top: .2rem;
    }
    .orn-line {
      width: 72px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      margin: .9rem auto;
    }
    .quote-wrap {
      max-width: 410px;
      margin: 1.75rem auto 0;
      padding: 0 .5rem;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.68;
      color: var(--heading);
      text-shadow: ${textShadowCss};
    }

    /* Hero Portrait Variants */
    .hero-frame { margin: 1.25rem auto 0; width: 100%; max-width: 335px; overflow: hidden; }
    .hero-img { width: 100%; display: block; object-fit: cover; }
    .ratio-3-4 { aspect-ratio: 3 / 4; }
    .ratio-4-5 { aspect-ratio: 4 / 5; }
    .ratio-1-1 { aspect-ratio: 1 / 1; }
    .round-full { border-radius: 999px; }
    .grayscale-15 { filter: grayscale(15%); }
    .hero-arch { border-radius: 999px 999px 24px 24px; border-style: solid; box-shadow: 0 20px 44px -16px rgba(0,0,0,.35); }
    .hero-royal { padding: 6px; border: 1px solid; }
    .hero-royal-inner { position: relative; padding: 6px; border: 1px solid; }
    .hero-monogram-fade { position: absolute; inset: auto 0 0 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(13,16,15,.82)); pointer-events: none; }
    .hero-monogram-tag { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); padding: 4px 16px; border: 1px solid; background: rgba(13,16,15,.86); font-size: 11px; font-weight: 600; letter-spacing: .28em; text-transform: uppercase; white-space: nowrap; }
    .hero-editorial { max-width: 360px; }
    .editorial-bar { border-top: 1px solid; border-bottom: 1px solid; padding: 8px 0; font-size: 10px; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; margin-bottom: 14px; }
    .editorial-img-wrap { border: 1px solid; overflow: hidden; }
    .hero-oval { max-width: 290px; border-radius: 999px; border: 2px solid; padding: 8px; box-shadow: 0 18px 40px -14px rgba(0,0,0,.25); }
    .hero-oval-clip { overflow: hidden; border-radius: 999px; }
    .hero-circle { max-width: 280px; border-radius: 999px; border: 3px solid; padding: 8px; box-shadow: 0 16px 36px -14px rgba(0,0,0,.22); }
    .hero-botanical { border-radius: 36px; border: 1px solid; padding: 6px; box-shadow: 0 14px 32px -12px rgba(0,0,0,.18); }
    .hero-andalusian { border-radius: 180px 180px 12px 12px; border: 2px solid; padding: 6px; box-shadow: 0 18px 36px -14px rgba(0,0,0,.24); }

    /* Frosted Glass Cards */
    .glass-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-shadow);
      border-radius: ${cardRadius};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 1.5rem 1.25rem;
      margin-top: 1rem;
      color: var(--body);
    }
    .center { text-align: center; }
    .body-copy { font-size: 14px; line-height: 1.65; color: var(--body); }
    .muted-copy { font-size: 12px; color: var(--muted); }

    /* Countdown */
    .cd-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 1.15rem; }
    .cd-box {
      background: var(--cd-bg);
      border: ${escapeHtml(tpl.countdownBorder)};
      border-radius: ${countdownRadius};
      padding: 12px 4px;
      text-align: center;
    }
    .cd-num { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--cd-text); line-height: 1.1; }
    .cd-lbl { margin-top: 4px; font-size: 10px; font-weight: 500; letter-spacing: .18em; text-transform: uppercase; color: var(--cd-label); }

    /* Couple Portraits */
    .portrait-wrap {
      width: 170px;
      margin: 0 auto 1.15rem;
      padding: 4px;
      border: 2px solid var(--accent);
      border-radius: ${photoFrameRadius};
      overflow: hidden;
    }
    .portrait-img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; border-radius: ${photoFrameRadius}; }
    .couple-name { font-family: var(--font-head); font-size: 1.45rem; font-weight: 600; color: var(--heading); margin-top: 6px; line-height: 1.25; }

    /* Love Story */
    .story-stack { margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .story-year { font-size: 12px; font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums; margin-bottom: 4px; }
    .ed-story-list { margin-top: 1rem; }
    .ed-story-row { display: grid; grid-template-columns: 60px 1fr; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--card-border); }
    .ed-story-row:last-child { border-bottom: none; padding-bottom: 0; }
    .ed-year { font-family: var(--font-head); font-size: 1.1rem; font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums; }
    .ed-title { font-family: var(--font-head); font-size: 1rem; font-weight: 600; color: var(--heading); margin-bottom: 4px; }

    /* Events & Jadwal Acara */
    .venue { font-family: var(--font-head); font-size: 1.45rem; font-weight: 600; color: var(--heading); margin-top: 8px; line-height: 1.25; }
    .ev-meta { font-size: 13px; font-weight: 500; color: var(--muted); margin: 8px 0; font-variant-numeric: tabular-nums; }
    .ev-notes { margin-top: 12px; font-size: 12px; color: var(--muted); line-height: 1.55; }
    .ev-notes p + p { margin-top: 4px; }
    .sched-wrap { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--card-border); text-align: left; }
    .sched-head { text-align: center; font-size: 11px; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
    .sched-list { display: flex; flex-direction: column; gap: 8px; }
    .sched-row { display: grid; grid-template-columns: 84px 1fr; gap: 8px; align-items: baseline; font-size: 12px; }
    .sched-time { font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums; }
    .sched-act { color: var(--body); }

    .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .btn-primary {
      flex: 1;
      min-width: 140px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--primary-bg);
      color: var(--primary-text);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
    .btn-outline {
      flex: 1;
      min-width: 140px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 18px;
      border-radius: 999px;
      border: 1px solid var(--accent);
      background: ${secondaryBtnBg};
      color: var(--heading);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }

    /* Turut Mengundang */
    .turut-list { list-style: none; }
    .turut-list li { padding: 9px 0; border-bottom: 1px solid var(--card-border); font-size: 14px; color: var(--body); }
    .turut-list li:last-child { border-bottom: none; padding-bottom: 0; }

    /* Gallery */
    .gal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 1rem; }
    .gal-card { border-radius: 16px; overflow: hidden; border: 1px solid var(--card-border); background: var(--card-bg); cursor: pointer; }
    .gal-media { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
    .gal-cap { font-size: 11px; padding: 7px 8px; text-align: center; color: var(--muted); }

    /* Amplop Digital */
    .bank-stack { display: flex; flex-direction: column; gap: 10px; margin-top: 1.25rem; text-align: left; }
    .bank-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--card-border);
      background: ${wishSubCardBg};
    }
    .bank-name { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
    .acc-num { font-size: 1.15rem; font-weight: 700; color: var(--heading); font-variant-numeric: tabular-nums; margin-top: 2px; }
    .acc-holder { font-size: 12px; color: var(--muted); }
    .btn-copy {
      min-height: 38px;
      padding: 6px 16px;
      border-radius: 999px;
      border: 1px solid var(--accent);
      background: transparent;
      color: var(--heading);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .qris-box, .gift-box { margin-top: 1rem; padding: 1rem; border-radius: 16px; border: 1px solid var(--card-border); background: ${wishSubCardBg}; }
    .qris-img { width: 180px; height: 180px; object-fit: contain; display: block; margin: 10px auto 0; border-radius: 12px; cursor: pointer; }

    /* RSVP & Wishes */
    .field-lbl { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 4px; text-align: left; }
    .form-input {
      width: 100%;
      min-height: 44px;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid var(--input-border);
      background: var(--input-bg);
      color: var(--input-text);
      font: inherit;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .wish-card {
      border: 1px solid var(--card-border);
      background: ${wishSubCardBg};
      border-radius: 14px;
      padding: 12px 14px;
      margin-top: 10px;
      text-align: left;
    }
    .wish-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
    .wish-head strong { color: var(--heading); }
    .wish-head span { font-size: 11px; color: var(--muted); font-weight: 500; }
    .wish-msg { font-size: 13px; color: var(--body); margin-top: 6px; line-height: 1.55; }

    /* Bottom Dock & Music FAB */
    .bottom-dock {
      position: fixed;
      bottom: max(12px, env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 24px);
      max-width: 436px;
      z-index: 30;
      display: none;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      pointer-events: none;
    }
    .bottom-dock.visible { display: flex; }
    .music-fab {
      pointer-events: auto;
      width: 44px;
      height: 44px;
      border-radius: 999px;
      background: var(--primary-bg);
      color: var(--primary-text);
      border: 1px solid var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba(0,0,0,.28);
    }
    .nav-bar {
      pointer-events: auto;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 2px;
      padding: 4px;
      border-radius: ${navRadius};
      background: var(--nav-bg);
      border: 1px solid var(--nav-border);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 12px 32px rgba(0,0,0,.22);
    }
    .nav-btn {
      min-height: 38px;
      border: none;
      background: transparent;
      color: var(--nav-inactive);
      border-radius: ${navRadius};
      font: inherit;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      padding: 0 4px;
      transition: background-color .18s ease, color .18s ease;
    }
    .nav-btn.active {
      background: var(--nav-active-bg);
      color: var(--nav-active-text);
      font-weight: 600;
    }

    /* Lightbox */
    .lightbox { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.92); display: none; align-items: center; justify-content: center; flex-direction: column; padding: 1.5rem; }
    .lightbox.open { display: flex; }
    .lightbox img { max-width: 100%; max-height: 82vh; border-radius: 12px; object-fit: contain; }
  </style>
</head>
<body>
  <div class="desktop-ambient">
    <div class="desktop-ambient-img" aria-hidden="true"></div>
    <div class="desktop-ambient-veil"></div>
  </div>

  <div id="cover" class="cover">
    <div class="cover-scrim"></div>
    <div class="cover-inner">
      <p class="cover-kicker">The Wedding Of</p>
      <h1 class="cover-names">${escapeHtml(data.couple.groomNickname)} <span style="color:${escapeHtml(accent)}">&amp;</span> ${escapeHtml(data.couple.brideNickname)}</h1>
      <p class="cover-date">${escapeHtml(formatIndoDate(data.couple.weddingDate))}</p>
    </div>
    <div class="cover-inner">
      <div class="guest-box">
        <p style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.78)">Kepada Yth. Bapak/Ibu/Saudara/i</p>
        <p id="guestTo" style="font-size:16px;font-weight:600;margin-top:4px;color:#fff">Bapak/Ibu/Saudara/i</p>
      </div>
      <button type="button" class="btn-open" style="${escapeHtml(coverBtnStyle)}" onclick="openInvitation()">Buka Undangan</button>
    </div>
  </div>

  ${musicUrl ? `<audio id="bgMusic" src="${escapeHtml(musicUrl)}" ${data.music.loop ? 'loop' : ''} preload="auto"></audio>` : ''}

  <main class="main-col">
    <div class="pinned-bg">
      <div class="pinned-bg-img" aria-hidden="true"></div>
      <div class="pinned-wash"></div>
    </div>

    <div class="fg">
      <section id="sec-beranda" class="section center" style="padding-top:1.75rem">
        <div class="orn-line"></div>
        <p class="eyebrow" style="text-shadow:${textShadowCss}">Assalamu&#39;alaikum Warahmatullahi Wabarakatuh</p>
        <h2 class="hero-title">${escapeHtml(data.couple.groomNickname)} <span style="color:${escapeHtml(accent)}">&amp;</span> ${escapeHtml(data.couple.brideNickname)}</h2>

        ${renderHeroPortraitHtml(tpl, couplePhoto, data.couple.groomNickname, data.couple.brideNickname, data.couple.weddingDate, accent)}

        <p class="quote-wrap">${escapeHtml(data.couple.openingQuote)}</p>
        <div class="orn-line"></div>

        <div class="glass-card center">
          <p class="eyebrow">Menuju Hari Bahagia</p>
          <p class="ev-meta">${escapeHtml(formatIndoDate(data.couple.weddingDate))} &middot; ${escapeHtml(data.countdown.targetTime || '09:00')} ${escapeHtml(tzLabel)}</p>
          <div id="countdown" class="cd-grid">
            <div class="cd-box"><div id="cd-d" class="cd-num">00</div><div class="cd-lbl">Hari</div></div>
            <div class="cd-box"><div id="cd-h" class="cd-num">00</div><div class="cd-lbl">Jam</div></div>
            <div class="cd-box"><div id="cd-m" class="cd-num">00</div><div class="cd-lbl">Menit</div></div>
            <div class="cd-box"><div id="cd-s" class="cd-num">00</div><div class="cd-lbl">Detik</div></div>
          </div>
          <p id="cd-done" style="display:none;margin-top:1rem;font-weight:700;letter-spacing:.18em;color:var(--accent)">HARI BAHAGIA TELAH TIBA</p>
        </div>
      </section>

      <section id="sec-mempelai" class="section">
        <div class="floating-head">
          <p class="eyebrow">Mempelai</p>
          <h2 class="sec-title">Pasangan Pengantin</h2>
        </div>

        <div class="glass-card center">
          ${groomPhoto ? `<div class="portrait-wrap"><img src="${escapeHtml(groomPhoto)}" alt="${escapeHtml(data.couple.groomFullName)}" class="portrait-img"/></div>` : ''}
          <p class="eyebrow">Mempelai Pria</p>
          <h3 class="couple-name">${escapeHtml(data.couple.groomFullName)}</h3>
          <p class="muted-copy" style="margin-top:8px">Putra dari</p>
          <p class="body-copy"><strong>${escapeHtml(data.couple.groomFather)} &amp; ${escapeHtml(data.couple.groomMother)}</strong></p>
        </div>

        <div class="glass-card center">
          ${bridePhoto ? `<div class="portrait-wrap"><img src="${escapeHtml(bridePhoto)}" alt="${escapeHtml(data.couple.brideFullName)}" class="portrait-img"/></div>` : ''}
          <p class="eyebrow">Mempelai Wanita</p>
          <h3 class="couple-name">${escapeHtml(data.couple.brideFullName)}</h3>
          <p class="muted-copy" style="margin-top:8px">Putri dari</p>
          <p class="body-copy"><strong>${escapeHtml(data.couple.brideFather)} &amp; ${escapeHtml(data.couple.brideMother)}</strong></p>
        </div>

        ${loveStoryHtml}
      </section>

      <section id="sec-acara" class="section">
        <div class="floating-head">
          <p class="eyebrow">Rangkaian Acara</p>
          <h2 class="sec-title">Waktu &amp; Lokasi</h2>
        </div>
        ${eventsHtml}
        ${turutHtml}
      </section>

      <section id="sec-galeri" class="section">
        <div class="floating-head">
          <p class="eyebrow">Momen Bahagia</p>
          <h2 class="sec-title">Galeri Foto</h2>
        </div>
        <div class="gal-grid">${galleryHtml}</div>
      </section>

      ${banksHtml}

      <section id="sec-rsvp" class="section">
        <div class="floating-head">
          <p class="eyebrow">Kehadiran &amp; Doa</p>
          <h2 class="sec-title">RSVP &amp; Buku Tamu</h2>
        </div>
        <form class="glass-card" onsubmit="submitRsvp(event)">
          <label class="field-lbl">Nama Lengkap</label>
          <input id="rsvpName" class="form-input" placeholder="Nama Anda" required />
          <label class="field-lbl">Konfirmasi Kehadiran</label>
          <select id="rsvpAtt" class="form-input">
            <option value="hadir">InsyaAllah Hadir</option>
            <option value="tidak_hadir">Mohon Maaf Tidak Hadir</option>
            <option value="ragu">Masih Ragu</option>
          </select>
          <label class="field-lbl">Jumlah Tamu</label>
          <input id="rsvpCount" type="number" min="1" max="10" value="2" class="form-input" />
          <label class="field-lbl">Ucapan &amp; Doa Restu</label>
          <textarea id="rsvpMsg" rows="3" class="form-input" placeholder="Tulis ucapan &amp; doa hangat untuk mempelai..." required></textarea>
          <button type="submit" class="btn-primary" style="width:100%">Kirim Ucapan &amp; RSVP</button>
          <p id="rsvpStatus" style="display:none;margin-top:10px;text-align:center;font-size:12px;font-weight:600;color:var(--heading)"></p>
        </form>
        <div id="wishList" class="glass-card">
          <p class="eyebrow" style="text-align:left;margin-bottom:8px">Ucapan Tamu (${wishes.length})</p>
          <div id="wishItems">${wishesHtml || '<p class="muted-copy center">Jadilah yang pertama memberikan doa restu.</p>'}</div>
        </div>
      </section>

      <footer class="section center" style="text-shadow:${textShadowCss}">
        <div class="orn-line"></div>
        <p class="body-copy" style="color:var(--heading);font-weight:500">${escapeHtml(data.couple.closingQuote)}</p>
        <p class="couple-name" style="margin-top:16px">${escapeHtml(data.couple.groomNickname)} <span style="color:${escapeHtml(accent)}">&amp;</span> ${escapeHtml(data.couple.brideNickname)}</p>
        <p class="muted-copy" style="margin-top:14px">RUANGJANJI PRO &middot; ${escapeHtml(tpl.name)}</p>
      </footer>
    </div>
  </main>

  <div id="bottomDock" class="bottom-dock">
    ${musicUrl ? `<button id="musicBtn" type="button" class="music-fab" onclick="toggleMusic()" aria-label="Putar/Jeda Musik">&#9835;</button>` : ''}
    <nav class="nav-bar" aria-label="Navigasi Undangan">
      <button type="button" class="nav-btn active" data-sec="sec-beranda" onclick="goSec('sec-beranda', this)">Beranda</button>
      <button type="button" class="nav-btn" data-sec="sec-mempelai" onclick="goSec('sec-mempelai', this)">Mempelai</button>
      <button type="button" class="nav-btn" data-sec="sec-acara" onclick="goSec('sec-acara', this)">Acara</button>
      <button type="button" class="nav-btn" data-sec="sec-galeri" onclick="goSec('sec-galeri', this)">Galeri</button>
      <button type="button" class="nav-btn" data-sec="sec-amplop" onclick="goSec('sec-amplop', this)">Amplop</button>
      <button type="button" class="nav-btn" data-sec="sec-rsvp" onclick="goSec('sec-rsvp', this)">RSVP</button>
    </nav>
  </div>

  <div id="lightbox" class="lightbox" onclick="this.classList.remove('open')">
    <img id="lbImg" src="" alt="Preview" />
    <p id="lbCap" style="color:#fff;margin-top:.75rem;font-size:13px;text-align:center"></p>
  </div>

  <script>
    (function(){
      var params = new URLSearchParams(window.location.search);
      var to = params.get('to');
      if (to) {
        document.getElementById('guestTo').textContent = to;
        var inp = document.getElementById('rsvpName');
        if (inp && !inp.value) inp.value = to;
      }
    })();
    var audio = document.getElementById('bgMusic');
    if (audio) audio.volume = ${Number(data.music.volume ?? 0.75)};
    function openInvitation(){
      document.getElementById('cover').classList.add('opened');
      document.getElementById('bottomDock').classList.add('visible');
      if (audio) { audio.play().catch(function(){}); }
    }
    function toggleMusic(){
      if (!audio) return;
      if (audio.paused) { audio.play().catch(function(){}); } else { audio.pause(); }
    }
    function goSec(id, btn){
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var btns = document.querySelectorAll('.nav-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
      if (btn) btn.classList.add('active');
    }
    window.addEventListener('scroll', function(){
      var ids = ['sec-beranda','sec-mempelai','sec-acara','sec-galeri','sec-amplop','sec-rsvp'];
      var current = 'sec-beranda';
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el && el.getBoundingClientRect().top <= 160) current = ids[i];
      }
      var btns = document.querySelectorAll('.nav-btn');
      for (var j = 0; j < btns.length; j++) {
        btns[j].classList.toggle('active', btns[j].getAttribute('data-sec') === current);
      }
    }, { passive: true });
    function copyText(txt, btn){
      navigator.clipboard.writeText(txt).then(function(){
        var prev = btn.textContent; btn.textContent = 'Tersalin!';
        setTimeout(function(){ btn.textContent = prev; }, 1800);
      });
    }
    function openLightbox(src, cap){
      if (!src) return;
      document.getElementById('lbImg').src = src;
      document.getElementById('lbCap').textContent = cap || '';
      document.getElementById('lightbox').classList.add('open');
    }
    var targetTs = new Date('${escapeHtml(data.countdown.targetDate)}T${escapeHtml(data.countdown.targetTime || '09:00')}:00${escapeHtml(tzOffset)}').getTime();
    function updateCountdown(){
      if (isNaN(targetTs)) return;
      var diff = targetTs - Date.now();
      if (diff <= 0) {
        document.getElementById('countdown').style.display = 'none';
        document.getElementById('cd-done').style.display = 'block';
        return;
      }
      document.getElementById('cd-d').textContent = String(Math.floor(diff / 86400000)).padStart(2,'0');
      document.getElementById('cd-h').textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
      document.getElementById('cd-m').textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
      document.getElementById('cd-s').textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
    function submitRsvp(e){
      e.preventDefault();
      var name = document.getElementById('rsvpName').value.trim();
      var att = document.getElementById('rsvpAtt').value;
      var cnt = Number(document.getElementById('rsvpCount').value || 1);
      var msg = document.getElementById('rsvpMsg').value.trim();
      if (!name || !msg) return;
      var endpoint = '${escapeHtml(apiBase)}/api/public/invitations/${escapeHtml(invitation.slug)}/rsvp';
      var appendWish = function(notice){
        var list = document.getElementById('wishItems');
        var div = document.createElement('div');
        div.className = 'wish-card';
        div.innerHTML = '<div class="wish-head"><strong></strong><span></span></div><p class="wish-msg"></p>';
        div.querySelector('strong').textContent = name;
        div.querySelector('span').textContent = att === 'hadir' ? ('Hadir · ' + cnt + ' org') : att === 'tidak_hadir' ? 'Tidak Hadir' : 'Masih Ragu';
        div.querySelector('p').textContent = msg;
        list.prepend(div);
        var st = document.getElementById('rsvpStatus');
        st.textContent = notice;
        st.style.display = 'block';
        e.target.reset();
      };
      if ('${escapeHtml(apiBase)}' && location.protocol.indexOf('http') === 0){
        fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ guestName:name, attendance:att, guestCount:cnt, message:msg }) })
          .then(function(){ appendWish('Terima kasih! Ucapan & RSVP Anda telah tersimpan.'); })
          .catch(function(){ appendWish('Ucapan ditambahkan ke tampilan lokal.'); });
      } else {
        appendWish('Ucapan ditambahkan ke tampilan lokal.');
      }
    }
  </script>
</body>
</html>`;
}
