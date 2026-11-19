import { DEFAULT_INVITATION_DATA } from '../shared/defaultInvitation.ts';
import { TEMPLATE_PRESET_LIST } from '../shared/templateStyles.ts';
import { THEMES } from '../shared/themes.ts';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function buildStandaloneAdminHtml(originUrl: string): string {
  const cleanOrigin = (originUrl || '').replace(/\/$/, '');
  const compactPresets = TEMPLATE_PRESET_LIST.map((p) => ({
    id: p.id,
    name: p.name,
    subtitle: p.subtitle,
    isDark: p.isDark,
    canvasBg: p.canvasBg,
    backdropWash: p.backdropWash,
    cardBg: p.cardBg,
    cardBorder: p.cardBorder,
    headingColor: p.headingColor,
    bodyColor: p.bodyColor,
    mutedColor: p.mutedColor,
    accentColor: p.accentColor,
    primaryBg: p.primaryBg,
    primaryText: p.primaryText,
    countdownBg: p.countdownBg,
    countdownText: p.countdownText,
    countdownLabelColor: p.countdownLabelColor,
    navBg: p.navBg,
    navActiveBg: p.navActiveBg,
    navActiveText: p.navActiveText,
    navInactiveText: p.navInactiveText,
    defaultHeadingFont: p.defaultHeadingFont,
    defaultBodyFont: p.defaultBodyFont,
    defaultFrame: p.defaultFrame,
    heroVariant: p.heroVariant,
  }));

  const compactThemes = THEMES.slice(0, 100).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    imageUrl: t.imageUrl.startsWith('http') ? t.imageUrl : `${cleanOrigin}${t.imageUrl}`,
    accentHex: t.accentHex,
  }));

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RUANGJANJI PRO — Portal Administrator Standalone</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #FAF8F4;
      --surface: #FFFFFF;
      --sand: #F3EFE6;
      --emerald: #0F2C23;
      --emerald-hover: #1A4336;
      --gold: #C6A259;
      --gold-dark: #9E7C38;
      --ink: #17201C;
      --muted: #5F6B65;
      --border: rgba(15, 44, 35, 0.12);
      --danger: #B91C1C;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      min-height: 100vh;
      background: var(--bg);
      color: var(--ink);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      line-height: 1.5;
    }
    .serif { font-family: 'Playfair Display', Georgia, serif; }
    .tabular { font-variant-numeric: tabular-nums; }
    .hidden { display: none !important; }

    /* Top Bar */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      background: rgba(255, 255, 255, 0.96);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(10px);
      padding: 14px 24px;
    }
    .topbar-inner {
      max-width: 1320px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--emerald);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .nav-link {
      border: none;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }
    .nav-link:hover { color: var(--emerald); }
    .top-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 40px;
      padding: 8px 16px;
      border-radius: 12px;
      border: 1px solid transparent;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      text-decoration: none;
      transition: background-color .16s ease, opacity .16s ease;
    }
    .btn-primary { background: var(--emerald); color: var(--bg); }
    .btn-primary:hover { background: var(--emerald-hover); }
    .btn-outline { background: var(--surface); color: var(--emerald); border-color: rgba(15, 44, 35, 0.2); }
    .btn-outline:hover { background: var(--sand); }
    .btn-gold { background: var(--gold); color: var(--emerald); }
    .btn-danger { background: #FEF2F2; color: var(--danger); border-color: #FECACA; }
    .btn-sm { min-height: 36px; padding: 6px 12px; border-radius: 10px; }

    /* Containers & Grids */
    .container { max-width: 1320px; margin: 0 auto; padding: 28px 24px 64px; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
    }
    .auth-shell {
      min-height: calc(100vh - 68px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .auth-card { width: 100%; max-width: 440px; padding: 32px; border-radius: 24px; }
    .eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: var(--gold-dark); }
    .page-title { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 600; color: var(--emerald); margin-top: 4px; }

    /* Forms */
    .field { margin-top: 14px; }
    .field label { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 5px; }
    .input, .select, .textarea {
      width: 100%;
      min-height: 42px;
      padding: 9px 12px;
      border-radius: 12px;
      border: 1px solid rgba(15, 44, 35, 0.18);
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 13.5px;
    }
    .textarea { min-height: 84px; resize: vertical; }
    .input:focus, .select:focus, .textarea:focus { outline: none; border-color: var(--gold); }

    /* KPI & Charts */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px; }
    .kpi-label { font-size: 12px; color: var(--muted); }
    .kpi-val { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 600; color: var(--emerald); margin-top: 4px; }
    .stats-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin-top: 18px; }
    .bars { display: flex; align-items: flex-end; gap: 10px; height: 155px; margin-top: 18px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .bar-track { width: 100%; height: 105px; background: var(--sand); border-radius: 8px; padding: 4px; display: flex; align-items: flex-end; }
    .bar-fill { width: 100%; background: var(--emerald); border-radius: 6px; min-height: 6px; }
    .act-list { margin-top: 12px; max-height: 175px; overflow-y: auto; }
    .act-item { padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
    .act-item:last-child { border-bottom: none; }

    /* Filter & Cards */
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 28px; }
    .seg { display: inline-flex; gap: 4px; background: var(--sand); padding: 4px; border-radius: 12px; }
    .seg-btn { border: none; background: transparent; padding: 7px 14px; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; }
    .seg-btn.active { background: #fff; color: var(--emerald); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .inv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
    .inv-card { overflow: hidden; padding: 0; display: flex; flex-direction: column; }
    .inv-cover { position: relative; aspect-ratio: 16 / 9; background: #EAE4D7; overflow: hidden; }
    .inv-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .inv-cover-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 20%, rgba(0,0,0,.78) 100%); }
    .inv-cover-info { position: absolute; left: 14px; right: 14px; bottom: 10px; color: #fff; }
    .inv-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; flex: 1; justify-content: space-between; }
    .inv-meta { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); }
    .inv-actions { display: flex; flex-wrap: wrap; gap: 6px; }

    /* Editor Split */
    .editor-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 22px; align-items: start; margin-top: 18px; }
    .editor-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .tab-btn { border: 1px solid var(--border); background: #fff; padding: 8px 13px; border-radius: 10px; font: inherit; font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer; }
    .tab-btn.active { background: var(--emerald); color: var(--bg); border-color: var(--emerald); }
    .preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px; }
    .preset-card { border: 1.5px solid var(--border); border-radius: 14px; padding: 11px; text-align: left; cursor: pointer; background: #fff; }
    .preset-card.active { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(198,162,89,.25); }
    .theme-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 290px; overflow-y: auto; margin-top: 10px; padding-right: 4px; }
    .theme-mini { border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; cursor: pointer; background: #fff; text-align: left; }
    .theme-mini.active { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(198,162,89,.28); }
    .theme-mini img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; }
    .theme-mini span { display: block; padding: 5px 6px; font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .phone-frame {
      position: sticky;
      top: 84px;
      width: 100%;
      max-width: 390px;
      margin: 0 auto;
      border-radius: 38px;
      border: 8px solid #17201C;
      background: #000;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(0,0,0,.18);
    }
    .phone-frame iframe { width: 100%; height: 700px; border: none; display: block; background: var(--bg); }

    /* Alert & Modal */
    .alert { padding: 10px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 500; margin-top: 12px; }
    .alert-err { background: #FEF2F2; color: var(--danger); border: 1px solid #FECACA; }
    .alert-ok { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
    .modal-box { width: 100%; max-width: 480px; background: #fff; border-radius: 22px; padding: 24px; max-height: 90vh; overflow-y: auto; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    @media (max-width: 1024px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .stats-row, .editor-grid { grid-template-columns: 1fr; }
      .inv-grid { grid-template-columns: repeat(2, 1fr); }
      .phone-frame { position: static; }
    }
    @media (max-width: 640px) {
      .nav-links { display: none; }
      .inv-grid, .two-col, .preset-grid { grid-template-columns: 1fr; }
      .topbar { padding: 12px 16px; }
      .container { padding: 20px 16px 48px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">RUANGJANJI PRO</div>
      <nav class="nav-links" id="navLinks">
        <button type="button" class="nav-link" onclick="showServerSettings()">Koneksi Server</button>
        <button type="button" class="nav-link" onclick="switchMode('offline')">Mode Studio Offline</button>
        <button type="button" class="nav-link hidden" id="navSecurityBtn" onclick="openSecurityModal()">Keamanan &amp; Backup</button>
        <button type="button" class="nav-link hidden" id="navLogoutBtn" onclick="logoutAdmin()">Logout</button>
      </nav>
      <div class="top-actions">
        <button type="button" class="btn btn-outline btn-sm" id="btnModeSwitch" onclick="toggleOperatingMode()">Mode Offline</button>
        <button type="button" class="btn btn-primary btn-sm hidden" id="btnCreateTop" onclick="openCreateModal()">+ Buat Undangan</button>
      </div>
    </div>
  </header>

  <!-- AUTH VIEW (SERVER MODE) -->
  <section id="authView" class="auth-shell">
    <div class="card auth-card">
      <p class="eyebrow">Portal Administrator Standalone</p>
      <h1 class="page-title" style="font-size:24px" id="authTitle">Login Administrator</h1>
      <p style="font-size:12.5px;color:var(--muted);margin-top:6px" id="authSub">
        Masuk menggunakan akun administrator server Anda, atau gunakan Mode Studio Offline untuk mengedit &amp; mengekspor HTML undangan tanpa server.
      </p>

      <div id="authAlert" class="alert hidden"></div>

      <form id="authForm" onsubmit="submitAuth(event)">
        <div class="field">
          <label>Username Administrator</label>
          <input id="authUser" class="input" required placeholder="Mis. admin" />
        </div>
        <div class="field hidden" id="authEmailWrap">
          <label>Email Pemilik</label>
          <input id="authEmail" type="email" class="input" placeholder="nama@domain.com" />
        </div>
        <div class="field" id="authPassWrap">
          <label>Password</label>
          <input id="authPass" type="password" class="input" placeholder="Minimal 6 karakter" />
        </div>
        <div class="field hidden" id="authRecoveryWrap">
          <label>Kode Pemulihan (Recovery Key)</label>
          <input id="authRecovery" class="input" placeholder="Masukkan Recovery Key" />
        </div>
        <div class="field hidden" id="authNewPassWrap">
          <label>Password Baru</label>
          <input id="authNewPass" type="password" class="input" placeholder="Password baru minimal 6 karakter" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:18px" id="authSubmitBtn">Masuk ke Studio</button>
      </form>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <button type="button" class="nav-link" id="toggleForgotBtn" onclick="toggleForgotMode()">Lupa Password?</button>
        <button type="button" class="nav-link" style="color:var(--gold-dark);font-weight:600" onclick="switchMode('offline')">Gunakan Studio Offline &rarr;</button>
      </div>
    </div>
  </section>

  <!-- DASHBOARD VIEW -->
  <main id="dashboardView" class="container hidden">
    <div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px">
      <div>
        <p class="eyebrow" id="dashModeEyebrow">Dashboard Administrator · Mode Server Live</p>
        <h1 class="page-title">Ringkasan &amp; Kelola Undangan</h1>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-outline" onclick="exportAllBackupJson()">Backup JSON</button>
        <button type="button" class="btn btn-outline" onclick="triggerImportBackup()">Pulihkan JSON</button>
        <input id="restoreFileInput" type="file" accept=".json,application/json" class="hidden" onchange="handleImportBackup(event)" />
        <button type="button" class="btn btn-primary" onclick="openCreateModal()">+ Buat Undangan</button>
      </div>
    </div>

    <div id="dashAlert" class="alert hidden"></div>

    <div id="kpiGrid" class="kpi-grid"></div>

    <div id="statsRow" class="stats-row">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2 class="serif" style="font-size:18px;color:var(--emerald)">Statistik Kunjungan (7 Hari Terakhir)</h2>
          <span class="tabular" style="font-size:12px;color:var(--muted)" id="totalVisitLbl">0 kunjungan</span>
        </div>
        <div id="visitBars" class="bars"></div>
      </div>
      <div class="card">
        <h2 class="serif" style="font-size:18px;color:var(--emerald)">Aktivitas Terbaru</h2>
        <div id="activityFeed" class="act-list"></div>
      </div>
    </div>

    <div class="toolbar">
      <div class="seg">
        <button type="button" class="seg-btn active" onclick="setStatusFilter('all', this)">Semua</button>
        <button type="button" class="seg-btn" onclick="setStatusFilter('published', this)">Aktif</button>
        <button type="button" class="seg-btn" onclick="setStatusFilter('draft', this)">Draft</button>
      </div>
      <input id="searchInv" class="input" style="max-width:300px" placeholder="Cari judul, nama mempelai, slug..." oninput="renderInvitations()" />
    </div>

    <div id="invGrid" class="inv-grid"></div>
  </main>

  <!-- EDITOR VIEW -->
  <section id="editorView" class="container hidden">
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px">
      <div>
        <button type="button" class="btn btn-outline btn-sm" onclick="closeEditor()">&larr; Kembali ke Daftar</button>
        <h1 class="page-title" style="font-size:24px;margin-top:8px" id="editorHeading">Edit Studio Undangan</h1>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-outline" onclick="downloadCurrentInvitationHtml()">Download HTML Undangan</button>
        <button type="button" class="btn btn-gold" id="btnTogglePublish" onclick="togglePublishStatus()">Terbitkan</button>
        <button type="button" class="btn btn-primary" onclick="saveCurrentInvitation()">Simpan Perubahan</button>
      </div>
    </div>

    <div id="editorAlert" class="alert hidden"></div>

    <div class="editor-grid">
      <div class="card">
        <div class="editor-tabs">
          <button type="button" class="tab-btn active" onclick="switchEditorTab('couple', this)">Mempelai &amp; Judul</button>
          <button type="button" class="tab-btn" onclick="switchEditorTab('design', this)">Gaya &amp; Tema</button>
          <button type="button" class="tab-btn" onclick="switchEditorTab('events', this)">Acara</button>
          <button type="button" class="tab-btn" onclick="switchEditorTab('gifts', this)">Amplop &amp; Musik</button>
        </div>

        <div id="tab-couple">
          <div class="field"><label>Judul Undangan</label><input id="edTitle" class="input" oninput="syncEditorToState()" /></div>
          <div class="two-col">
            <div class="field"><label>Slug URL</label><input id="edSlug" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Tanggal Pernikahan</label><input id="edDate" type="date" class="input" oninput="syncEditorToState()" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label>Panggilan Pria</label><input id="edGroomNick" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Panggilan Wanita</label><input id="edBrideNick" class="input" oninput="syncEditorToState()" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label>Nama Lengkap Pria</label><input id="edGroomFull" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Nama Lengkap Wanita</label><input id="edBrideFull" class="input" oninput="syncEditorToState()" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label>Orang Tua Pria</label><input id="edGroomParents" class="input" placeholder="Ayah &amp; Ibu" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Orang Tua Wanita</label><input id="edBrideParents" class="input" placeholder="Ayah &amp; Ibu" oninput="syncEditorToState()" /></div>
          </div>
          <div class="field"><label>Foto Pasangan Utama (URL)</label><input id="edCouplePhoto" class="input" oninput="syncEditorToState()" /></div>
          <div class="field"><label>Kutipan Pembuka</label><textarea id="edOpeningQuote" class="textarea" oninput="syncEditorToState()"></textarea></div>
          <div class="field"><label>Kutipan Penutup</label><textarea id="edClosingQuote" class="textarea" oninput="syncEditorToState()"></textarea></div>
        </div>

        <div id="tab-design" class="hidden">
          <p class="eyebrow">10 Gaya Tampilan Undangan</p>
          <div id="presetList" class="preset-grid"></div>
          <p class="eyebrow" style="margin-top:18px">100 Tema Foto Background</p>
          <input id="themeSearch" class="input" style="margin-top:6px" placeholder="Cari tema pemandangan, arsitektur, taman..." oninput="renderThemeMiniGrid()" />
          <div id="themeMiniGrid" class="theme-mini-grid"></div>
        </div>

        <div id="tab-events" class="hidden">
          <p class="eyebrow">Acara Utama Pertama (Akad / Pemberkatan)</p>
          <div class="two-col">
            <div class="field"><label>Jenis Acara</label><input id="ev1Type" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Nama Venue</label><input id="ev1Venue" class="input" oninput="syncEditorToState()" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label>Tanggal</label><input id="ev1Date" type="date" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Waktu (Mulai - Selesai)</label><input id="ev1Time" class="input" placeholder="08:00 - 10:00" oninput="syncEditorToState()" /></div>
          </div>
          <div class="field"><label>Alamat Lengkap</label><textarea id="ev1Addr" class="textarea" oninput="syncEditorToState()"></textarea></div>
          <div class="field"><label>Link Google Maps</label><input id="ev1Maps" class="input" oninput="syncEditorToState()" /></div>

          <p class="eyebrow" style="margin-top:18px">Acara Kedua (Resepsi)</p>
          <div class="two-col">
            <div class="field"><label>Jenis Acara</label><input id="ev2Type" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Nama Venue</label><input id="ev2Venue" class="input" oninput="syncEditorToState()" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label>Tanggal</label><input id="ev2Date" type="date" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Waktu (Mulai - Selesai)</label><input id="ev2Time" class="input" placeholder="11:00 - 14:00" oninput="syncEditorToState()" /></div>
          </div>
          <div class="field"><label>Alamat Lengkap</label><textarea id="ev2Addr" class="textarea" oninput="syncEditorToState()"></textarea></div>
        </div>

        <div id="tab-gifts" class="hidden">
          <p class="eyebrow">Amplop Digital (Rekening Utama)</p>
          <div class="two-col">
            <div class="field"><label>Nama Bank / E-Wallet</label><input id="bank1Name" class="input" oninput="syncEditorToState()" /></div>
            <div class="field"><label>Nomor Rekening</label><input id="bank1Num" class="input" oninput="syncEditorToState()" /></div>
          </div>
          <div class="field"><label>Atas Nama</label><input id="bank1Holder" class="input" oninput="syncEditorToState()" /></div>
          <div class="field"><label>Pesan Amplop Digital</label><textarea id="giftMsg" class="textarea" oninput="syncEditorToState()"></textarea></div>
          <div class="field"><label>Nomor WhatsApp Konfirmasi</label><input id="giftWa" class="input" placeholder="6281234567890" oninput="syncEditorToState()" /></div>
          <div class="field"><label>URL Musik Latar (MP3/Audio)</label><input id="musicUrl" class="input" oninput="syncEditorToState()" /></div>
        </div>
      </div>

      <div>
        <div class="phone-frame">
          <iframe id="livePreviewFrame" title="Pratinjau iPhone"></iframe>
        </div>
      </div>
    </div>
  </section>

  <!-- MODAL: CREATE -->
  <div id="createModal" class="modal-backdrop hidden" onclick="closeModal('createModal')">
    <form class="modal-box" onclick="event.stopPropagation()" onsubmit="createInvitationSubmit(event)">
      <h3 class="serif" style="font-size:20px;color:var(--emerald)">Buat Undangan Baru</h3>
      <div id="createAlert" class="alert hidden"></div>
      <div class="field"><label>Judul Undangan</label><input id="newTitle" class="input" required placeholder="Mis. Pernikahan Raka &amp; Tania" /></div>
      <div class="two-col">
        <div class="field"><label>Panggilan Pria</label><input id="newGroom" class="input" required placeholder="Raka" /></div>
        <div class="field"><label>Panggilan Wanita</label><input id="newBride" class="input" required placeholder="Tania" /></div>
      </div>
      <div class="field"><label>Tanggal Pernikahan</label><input id="newDate" type="date" class="input" value="2027-07-18" required /></div>
      <div style="display:flex;gap:8px;margin-top:18px">
        <button type="button" class="btn btn-outline" style="flex:1" onclick="closeModal('createModal')">Batal</button>
        <button type="submit" class="btn btn-primary" style="flex:1">Buat &amp; Edit</button>
      </div>
    </form>
  </div>

  <!-- MODAL: SERVER SETTINGS -->
  <div id="serverModal" class="modal-backdrop hidden" onclick="closeModal('serverModal')">
    <div class="modal-box" onclick="event.stopPropagation()">
      <h3 class="serif" style="font-size:20px;color:var(--emerald)">Pengaturan Koneksi Server</h3>
      <p style="font-size:12.5px;color:var(--muted);margin-top:6px">
        Arahkan ke URL aplikasi RUANGJANJI PRO yang aktif untuk sinkronisasi database server, atau jalankan Mode Studio Offline saat dibuka langsung sebagai file HTML lokal.
      </p>
      <div class="field">
        <label>URL Server API</label>
        <input id="serverUrlInput" class="input" placeholder="https://domain-anda.com" />
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button type="button" class="btn btn-outline" style="flex:1" onclick="closeModal('serverModal')">Tutup</button>
        <button type="button" class="btn btn-primary" style="flex:1" onclick="saveServerUrl()">Simpan &amp; Uji</button>
      </div>
    </div>
  </div>

  <!-- MODAL: SECURITY -->
  <div id="securityModal" class="modal-backdrop hidden" onclick="closeModal('securityModal')">
    <div class="modal-box" onclick="event.stopPropagation()">
      <h3 class="serif" style="font-size:20px;color:var(--emerald)">Ubah Password Administrator</h3>
      <div id="secAlert" class="alert hidden"></div>
      <form onsubmit="changePasswordSubmit(event)">
        <div class="field"><label>Password Saat Ini</label><input id="secCurrPass" type="password" class="input" required /></div>
        <div class="field"><label>Password Baru (min 6 karakter)</label><input id="secNewPass" type="password" class="input" required /></div>
        <div class="field"><label>Recovery Key Baru (opsional)</label><input id="secNewKey" class="input" /></div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button type="button" class="btn btn-outline" style="flex:1" onclick="closeModal('securityModal')">Tutup</button>
          <button type="submit" class="btn btn-primary" style="flex:1">Simpan Password</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    var PRESETS = ${safeJsonForScript(compactPresets)};
    var THEMES = ${safeJsonForScript(compactThemes)};
    var DEFAULT_DATA = ${safeJsonForScript(DEFAULT_INVITATION_DATA)};
    var SERVER_URL = localStorage.getItem('rj_admin_server_url') || ${safeJsonForScript(cleanOrigin)};
    var MODE = location.protocol === 'file:' ? 'offline' : 'server';
    var AUTH_MODE = 'login';
    var AUTH_TOKEN = '';
    try { AUTH_TOKEN = sessionStorage.getItem('rj_admin_offline_token') || ''; } catch(e) {}
    var SUMMARY = null;
    var INVITATIONS = [];
    var STATUS_FILTER = 'all';
    var EDITING = null;

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function getOfflineStore() {
      try {
        var raw = localStorage.getItem('rj_offline_invitations');
        if (raw) {
          var arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length) return arr;
        }
      } catch(e) {}
      var starter = [{
        id: 'offline-1',
        slug: 'aditya-kirana',
        title: 'Pernikahan Aditya & Kirana',
        status: 'published',
        themeId: 21,
        data: JSON.parse(JSON.stringify(DEFAULT_DATA)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: { views: 0, rsvpCount: 0, attendingGuests: 0, wishesCount: 0 }
      }];
      localStorage.setItem('rj_offline_invitations', JSON.stringify(starter));
      return starter;
    }

    function saveOfflineStore(list) {
      localStorage.setItem('rj_offline_invitations', JSON.stringify(list));
    }

    async function apiFetch(path, opts) {
      var base = (SERVER_URL || '').replace(/\\/$/, '');
      var headers = Object.assign({}, (opts && opts.headers) || {});
      if (AUTH_TOKEN && !headers['Authorization']) {
        headers['Authorization'] = 'Bearer ' + AUTH_TOKEN;
      }
      var res = await fetch(base + path, Object.assign({ credentials: 'include' }, opts || {}, { headers: headers }));
      var json = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(json.error || 'Permintaan gagal');
      return json;
    }

    function saveAuthToken(tok) {
      AUTH_TOKEN = tok || '';
      try {
        if (AUTH_TOKEN) sessionStorage.setItem('rj_admin_offline_token', AUTH_TOKEN);
        else sessionStorage.removeItem('rj_admin_offline_token');
      } catch(e) {}
    }

    function showAuthAlert(msg, isOk) {
      var el = document.getElementById('authAlert');
      el.textContent = msg;
      el.className = 'alert ' + (isOk ? 'alert-ok' : 'alert-err');
    }

    function showDashAlert(msg, isOk) {
      var el = document.getElementById('dashAlert');
      if (!el) return;
      el.textContent = msg;
      el.className = 'alert ' + (isOk ? 'alert-ok' : 'alert-err');
      setTimeout(function(){ el.className = 'alert hidden'; }, 3200);
    }

    function showEditorAlert(msg, isOk) {
      var el = document.getElementById('editorAlert');
      el.textContent = msg;
      el.className = 'alert ' + (isOk ? 'alert-ok' : 'alert-err');
      setTimeout(function(){ el.className = 'alert hidden'; }, 2800);
    }

    async function initApp() {
      if (MODE === 'offline') {
        enterOfflineDashboard();
        return;
      }
      try {
        var st = await apiFetch('/api/auth/status');
        if (!st.initialized) {
          AUTH_MODE = 'setup';
          document.getElementById('authTitle').textContent = 'Aktivasi Akun Administrator';
          document.getElementById('authEmailWrap').classList.remove('hidden');
          document.getElementById('authRecoveryWrap').classList.remove('hidden');
          document.getElementById('authSubmitBtn').textContent = 'Aktifkan Akun';
        }
        if (st.authenticated) {
          await loadServerDashboard();
        } else {
          showOnly('authView');
        }
      } catch(err) {
        showOnly('authView');
        showAuthAlert('Server belum terhubung. Anda dapat mengatur URL Server atau gunakan Mode Studio Offline.', false);
      }
    }

    function showOnly(viewId) {
      ['authView', 'dashboardView', 'editorView'].forEach(function(id){
        document.getElementById(id).classList.toggle('hidden', id !== viewId);
      });
      var inDash = viewId !== 'authView';
      document.getElementById('btnCreateTop').classList.toggle('hidden', !inDash);
      document.getElementById('navLogoutBtn').classList.toggle('hidden', !inDash || MODE === 'offline');
      document.getElementById('navSecurityBtn').classList.toggle('hidden', !inDash || MODE === 'offline');
      document.getElementById('btnModeSwitch').textContent = MODE === 'offline' ? 'Mode Server Live' : 'Mode Offline';
    }

    function toggleOperatingMode() {
      switchMode(MODE === 'offline' ? 'server' : 'offline');
    }

    function switchMode(target) {
      MODE = target;
      EDITING = null;
      if (MODE === 'offline') {
        enterOfflineDashboard();
      } else {
        initApp();
      }
    }

    function toggleForgotMode() {
      AUTH_MODE = AUTH_MODE === 'forgot' ? 'login' : 'forgot';
      var isForgot = AUTH_MODE === 'forgot';
      document.getElementById('authTitle').textContent = isForgot ? 'Reset Password' : 'Login Administrator';
      document.getElementById('authPassWrap').classList.toggle('hidden', isForgot);
      document.getElementById('authRecoveryWrap').classList.toggle('hidden', !isForgot);
      document.getElementById('authNewPassWrap').classList.toggle('hidden', !isForgot);
      document.getElementById('authEmailWrap').classList.add('hidden');
      document.getElementById('authSubmitBtn').textContent = isForgot ? 'Reset Password' : 'Masuk ke Studio';
      document.getElementById('toggleForgotBtn').textContent = isForgot ? 'Kembali ke Login' : 'Lupa Password?';
    }

    async function submitAuth(e) {
      e.preventDefault();
      var username = document.getElementById('authUser').value.trim();
      var email = document.getElementById('authEmail').value.trim();
      var password = document.getElementById('authPass').value;
      var recoveryKey = document.getElementById('authRecovery').value.trim();
      var newPassword = document.getElementById('authNewPass').value;
      try {
        if (AUTH_MODE === 'setup') {
          var setupRes = await apiFetch('/api/auth/setup', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, email, password, recoveryKey }) });
          if (setupRes.token) saveAuthToken(setupRes.token);
          await loadServerDashboard();
        } else if (AUTH_MODE === 'forgot') {
          var res = await apiFetch('/api/auth/forgot-password', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, recoveryKey, newPassword }) });
          showAuthAlert(res.message || 'Password berhasil direset.', true);
          toggleForgotMode();
        } else {
          var loginRes = await apiFetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
          if (loginRes.token) saveAuthToken(loginRes.token);
          await loadServerDashboard();
        }
      } catch(err) {
        showAuthAlert(err.message || 'Autentikasi gagal.', false);
      }
    }

    async function logoutAdmin() {
      try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
      saveAuthToken('');
      showOnly('authView');
    }

    async function loadServerDashboard() {
      var data = await Promise.all([apiFetch('/api/admin/dashboard'), apiFetch('/api/admin/invitations')]);
      SUMMARY = data[0];
      INVITATIONS = data[1];
      document.getElementById('dashModeEyebrow').textContent = 'Dashboard Administrator · Mode Server Live';
      showOnly('dashboardView');
      renderDashboardStats();
      renderInvitations();
    }

    function enterOfflineDashboard() {
      MODE = 'offline';
      INVITATIONS = getOfflineStore();
      var pub = INVITATIONS.filter(function(i){ return i.status === 'published'; }).length;
      SUMMARY = {
        totalInvitations: INVITATIONS.length,
        publishedInvitations: pub,
        draftInvitations: INVITATIONS.length - pub,
        totalVisitors: 0,
        totalRsvp: 0,
        attendingCount: 0,
        notAttendingCount: 0,
        totalWishes: 0,
        visitSeries: [0,0,0,0,0,0,0].map(function(_, idx){
          var d = new Date(Date.now() - (6 - idx) * 86400000);
          return { date: d.toISOString().slice(0,10), count: 0 };
        }),
        recentActivities: [{ description: 'Mode Studio Offline aktif (penyimpanan lokal browser).', createdAt: new Date().toISOString() }]
      };
      document.getElementById('dashModeEyebrow').textContent = 'Dashboard Administrator · Mode Studio Offline (LocalStorage)';
      showOnly('dashboardView');
      renderDashboardStats();
      renderInvitations();
    }

    function renderDashboardStats() {
      if (!SUMMARY) return;
      var kpis = [
        ['Total Undangan', SUMMARY.totalInvitations],
        ['Undangan Aktif', SUMMARY.publishedInvitations],
        ['Draft', SUMMARY.draftInvitations],
        ['Total Pengunjung', SUMMARY.totalVisitors],
        ['Total RSVP', SUMMARY.totalRsvp],
        ['Tamu Hadir', SUMMARY.attendingCount],
        ['Tidak Hadir', SUMMARY.notAttendingCount],
        ['Total Ucapan', SUMMARY.totalWishes]
      ];
      document.getElementById('kpiGrid').innerHTML = kpis.map(function(k){
        return '<div class="card"><div class="kpi-label">' + esc(k[0]) + '</div><div class="kpi-val tabular">' + esc(k[1]) + '</div></div>';
      }).join('');

      document.getElementById('totalVisitLbl').textContent = 'Total ' + SUMMARY.totalVisitors + ' kunjungan';
      var maxV = Math.max.apply(null, [1].concat(SUMMARY.visitSeries.map(function(d){ return d.count; })));
      document.getElementById('visitBars').innerHTML = SUMMARY.visitSeries.map(function(d){
        var pct = Math.max(8, Math.round((d.count / maxV) * 100));
        return '<div class="bar-col"><span class="tabular" style="font-size:11px;font-weight:600">' + d.count + '</span><div class="bar-track"><div class="bar-fill" style="height:' + pct + '%"></div></div><span class="tabular" style="font-size:10.5px;color:var(--muted)">' + esc(d.date.slice(5)) + '</span></div>';
      }).join('');

      document.getElementById('activityFeed').innerHTML = (SUMMARY.recentActivities || []).map(function(a){
        return '<div class="act-item"><div>' + esc(a.description) + '</div><div class="tabular" style="font-size:10.5px;color:var(--muted)">' + esc(new Date(a.createdAt).toLocaleString('id-ID')) + '</div></div>';
      }).join('') || '<p style="font-size:12px;color:var(--muted)">Belum ada aktivitas.</p>';
    }

    function setStatusFilter(st, btn) {
      STATUS_FILTER = st;
      document.querySelectorAll('.seg-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      renderInvitations();
    }

    function getTheme(id) {
      return THEMES.find(function(t){ return t.id === Number(id); }) || THEMES[0];
    }

    function renderInvitations() {
      var q = (document.getElementById('searchInv').value || '').trim().toLowerCase();
      var list = INVITATIONS.filter(function(inv){
        var stOk = STATUS_FILTER === 'all' || inv.status === STATUS_FILTER;
        var qOk = !q || inv.title.toLowerCase().includes(q) || inv.slug.toLowerCase().includes(q) ||
          (inv.data.couple.groomNickname || '').toLowerCase().includes(q) ||
          (inv.data.couple.brideNickname || '').toLowerCase().includes(q);
        return stOk && qOk;
      });
      if (!list.length) {
        document.getElementById('invGrid').innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:36px"><p style="font-size:13px;color:var(--muted)">Belum ada undangan yang sesuai filter.</p></div>';
        return;
      }
      document.getElementById('invGrid').innerHTML = list.map(function(inv){
        var theme = getTheme(inv.themeId);
        var img = inv.data.design.backgroundImageOverride || theme.imageUrl;
        return '<div class="card inv-card">' +
          '<div class="inv-cover"><img src="' + esc(img) + '" alt="' + esc(inv.title) + '"/><div class="inv-cover-scrim"></div>' +
          '<div class="inv-cover-info"><div style="font-size:11px;color:#F5E8CE">' + (inv.status === 'published' ? 'Publik Aktif' : 'Draft') + ' &middot; ' + esc(theme.name) + '</div>' +
          '<div class="serif" style="font-size:17px;font-weight:600">' + esc(inv.title) + '</div></div></div>' +
          '<div class="inv-body"><div class="inv-meta tabular"><span>/undangan/' + esc(inv.slug) + '</span><span>' + ((inv.stats && inv.stats.views) || 0) + ' dilihat</span></div>' +
          '<div class="inv-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" style="flex:1" onclick="openEditor(\\'' + esc(inv.id) + '\\')">Edit Studio</button>' +
          '<button type="button" class="btn btn-outline btn-sm" onclick="downloadInvById(\\'' + esc(inv.id) + '\\')">HTML</button>' +
          '<button type="button" class="btn btn-outline btn-sm" onclick="duplicateInv(\\'' + esc(inv.id) + '\\')">Duplikat</button>' +
          '<button type="button" class="btn btn-danger btn-sm" onclick="deleteInv(\\'' + esc(inv.id) + '\\')">Hapus</button>' +
          '</div></div></div>';
      }).join('');
    }

    function openCreateModal() { document.getElementById('createModal').classList.remove('hidden'); }
    function showServerSettings() {
      document.getElementById('serverUrlInput').value = SERVER_URL || '';
      document.getElementById('serverModal').classList.remove('hidden');
    }
    function openSecurityModal() { document.getElementById('securityModal').classList.remove('hidden'); }
    function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

    function saveServerUrl() {
      SERVER_URL = (document.getElementById('serverUrlInput').value || '').trim().replace(/\\/$/, '');
      localStorage.setItem('rj_admin_server_url', SERVER_URL);
      closeModal('serverModal');
      switchMode('server');
    }

    async function createInvitationSubmit(e) {
      e.preventDefault();
      var ca = document.getElementById('createAlert');
      if (ca) ca.className = 'alert hidden';
      var title = document.getElementById('newTitle').value.trim();
      var groom = document.getElementById('newGroom').value.trim() || 'Putra';
      var bride = document.getElementById('newBride').value.trim() || 'Putri';
      var date = document.getElementById('newDate').value;
      var baseData = JSON.parse(JSON.stringify(DEFAULT_DATA));
      baseData.couple = Object.assign({}, baseData.couple, {
        groomNickname: groom, groomName: groom, groomFullName: groom,
        brideNickname: bride, brideName: bride, brideFullName: bride,
        weddingDate: date
      });
      baseData.events = (baseData.events || []).map(function(ev){ return Object.assign({}, ev, { date: date }); });
      baseData.countdown = Object.assign({}, baseData.countdown, { targetDate: date });
      var payload = {
        title: title,
        status: 'draft',
        themeId: 42,
        data: baseData
      };
      if (MODE === 'server') {
        try {
          var created = await apiFetch('/api/admin/invitations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          INVITATIONS.unshift(created);
          closeModal('createModal');
          e.target.reset();
          openEditor(created.id);
        } catch(err) {
          if (ca) {
            ca.textContent = err.message || 'Gagal membuat undangan.';
            ca.className = 'alert alert-err';
          }
        }
      } else {
        var slug = title.toLowerCase().replace(/[^a-z0-9\\s-]/g,'').trim().replace(/\\s+/g,'-') || ('undangan-' + Date.now());
        var localInv = Object.assign({ id: 'off-' + Date.now(), slug: slug, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), stats: { views: 0 } }, payload);
        INVITATIONS.unshift(localInv);
        saveOfflineStore(INVITATIONS);
        closeModal('createModal');
        e.target.reset();
        enterOfflineDashboard();
        openEditor(localInv.id);
      }
    }

    async function duplicateInv(id) {
      if (MODE === 'server') {
        await apiFetch('/api/admin/invitations/' + id + '/duplicate', { method:'POST' });
        await loadServerDashboard();
      } else {
        var src = INVITATIONS.find(function(i){ return i.id === id; });
        if (!src) return;
        var copy = JSON.parse(JSON.stringify(src));
        copy.id = 'off-' + Date.now();
        copy.title += ' (Salinan)';
        copy.slug += '-salinan';
        copy.status = 'draft';
        INVITATIONS.unshift(copy);
        saveOfflineStore(INVITATIONS);
        enterOfflineDashboard();
      }
    }

    async function deleteInv(id) {
      if (MODE === 'server') {
        await apiFetch('/api/admin/invitations/' + id, { method:'DELETE' });
        await loadServerDashboard();
      } else {
        INVITATIONS = INVITATIONS.filter(function(i){ return i.id !== id; });
        saveOfflineStore(INVITATIONS);
        enterOfflineDashboard();
      }
    }

    function openEditor(id) {
      var found = INVITATIONS.find(function(i){ return i.id === id; });
      if (!found) return;
      EDITING = JSON.parse(JSON.stringify(found));
      showOnly('editorView');
      populateEditorFields();
      renderPresetList();
      renderThemeMiniGrid();
      refreshLivePreview();
    }

    function closeEditor() {
      EDITING = null;
      showOnly('dashboardView');
      if (MODE === 'server') loadServerDashboard(); else enterOfflineDashboard();
    }

    function switchEditorTab(tab, btn) {
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      ['couple','design','events','gifts'].forEach(function(t){
        document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
      });
    }

    function populateEditorFields() {
      var d = EDITING.data;
      document.getElementById('editorHeading').textContent = EDITING.title;
      document.getElementById('btnTogglePublish').textContent = EDITING.status === 'published' ? 'Ubah ke Draft' : 'Terbitkan';
      document.getElementById('edTitle').value = EDITING.title || '';
      document.getElementById('edSlug').value = EDITING.slug || '';
      document.getElementById('edDate').value = d.couple.weddingDate || '';
      document.getElementById('edGroomNick').value = d.couple.groomNickname || '';
      document.getElementById('edBrideNick').value = d.couple.brideNickname || '';
      document.getElementById('edGroomFull').value = d.couple.groomFullName || '';
      document.getElementById('edBrideFull').value = d.couple.brideFullName || '';
      document.getElementById('edGroomParents').value = (d.couple.groomFather || '') + ' & ' + (d.couple.groomMother || '');
      document.getElementById('edBrideParents').value = (d.couple.brideFather || '') + ' & ' + (d.couple.brideMother || '');
      document.getElementById('edCouplePhoto').value = d.couple.couplePhoto || '';
      document.getElementById('edOpeningQuote').value = d.couple.openingQuote || '';
      document.getElementById('edClosingQuote').value = d.couple.closingQuote || '';

      var ev1 = d.events[0] || {};
      document.getElementById('ev1Type').value = ev1.type || 'Akad Nikah';
      document.getElementById('ev1Venue').value = ev1.venueName || '';
      document.getElementById('ev1Date').value = ev1.date || '';
      document.getElementById('ev1Time').value = (ev1.startTime || '08:00') + ' - ' + (ev1.endTime || '10:00');
      document.getElementById('ev1Addr').value = ev1.address || '';
      document.getElementById('ev1Maps').value = ev1.mapsUrl || '';

      var ev2 = d.events[1] || {};
      document.getElementById('ev2Type').value = ev2.type || 'Resepsi';
      document.getElementById('ev2Venue').value = ev2.venueName || '';
      document.getElementById('ev2Date').value = ev2.date || '';
      document.getElementById('ev2Time').value = (ev2.startTime || '11:00') + ' - ' + (ev2.endTime || '14:00');
      document.getElementById('ev2Addr').value = ev2.address || '';

      var b1 = (d.gifts.banks && d.gifts.banks[0]) || {};
      document.getElementById('bank1Name').value = b1.bankName || '';
      document.getElementById('bank1Num').value = b1.accountNumber || '';
      document.getElementById('bank1Holder').value = b1.accountHolder || '';
      document.getElementById('giftMsg').value = d.gifts.message || '';
      document.getElementById('giftWa').value = d.gifts.whatsappNumber || '';
      document.getElementById('musicUrl').value = (d.music && d.music.url) || '';
    }

    function syncEditorToState() {
      if (!EDITING) return;
      EDITING.title = document.getElementById('edTitle').value;
      EDITING.slug = document.getElementById('edSlug').value;
      var d = EDITING.data;
      d.couple.weddingDate = document.getElementById('edDate').value;
      d.countdown.targetDate = d.couple.weddingDate;
      d.couple.groomNickname = document.getElementById('edGroomNick').value;
      d.couple.brideNickname = document.getElementById('edBrideNick').value;
      d.couple.groomFullName = document.getElementById('edGroomFull').value;
      d.couple.brideFullName = document.getElementById('edBrideFull').value;
      var gp = document.getElementById('edGroomParents').value.split('&');
      d.couple.groomFather = (gp[0] || '').trim();
      d.couple.groomMother = (gp[1] || '').trim();
      var bp = document.getElementById('edBrideParents').value.split('&');
      d.couple.brideFather = (bp[0] || '').trim();
      d.couple.brideMother = (bp[1] || '').trim();
      d.couple.couplePhoto = document.getElementById('edCouplePhoto').value;
      d.couple.openingQuote = document.getElementById('edOpeningQuote').value;
      d.couple.closingQuote = document.getElementById('edClosingQuote').value;

      if (d.events[0]) {
        d.events[0].type = document.getElementById('ev1Type').value;
        d.events[0].venueName = document.getElementById('ev1Venue').value;
        d.events[0].date = document.getElementById('ev1Date').value;
        var t1 = document.getElementById('ev1Time').value.split('-');
        d.events[0].startTime = (t1[0] || '').trim();
        d.events[0].endTime = (t1[1] || '').trim();
        d.events[0].address = document.getElementById('ev1Addr').value;
        d.events[0].mapsUrl = document.getElementById('ev1Maps').value;
      }
      if (d.events[1]) {
        d.events[1].type = document.getElementById('ev2Type').value;
        d.events[1].venueName = document.getElementById('ev2Venue').value;
        d.events[1].date = document.getElementById('ev2Date').value;
        var t2 = document.getElementById('ev2Time').value.split('-');
        d.events[1].startTime = (t2[0] || '').trim();
        d.events[1].endTime = (t2[1] || '').trim();
        d.events[1].address = document.getElementById('ev2Addr').value;
      }
      if (!d.gifts.banks.length) d.gifts.banks.push({ id: 'b1', bankName: 'BCA', accountNumber: '', accountHolder: '' });
      d.gifts.banks[0].bankName = document.getElementById('bank1Name').value;
      d.gifts.banks[0].accountNumber = document.getElementById('bank1Num').value;
      d.gifts.banks[0].accountHolder = document.getElementById('bank1Holder').value;
      d.gifts.message = document.getElementById('giftMsg').value;
      d.gifts.whatsappNumber = document.getElementById('giftWa').value;
      d.music.url = document.getElementById('musicUrl').value;
      refreshLivePreview();
    }

    function renderPresetList() {
      var cur = (EDITING.data.design && EDITING.data.design.templatePreset) || 'emerald-ivory';
      document.getElementById('presetList').innerHTML = PRESETS.map(function(p){
        return '<button type="button" class="preset-card ' + (cur === p.id ? 'active' : '') + '" onclick="selectPreset(\\'' + p.id + '\\')">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<strong style="font-size:12px;color:var(--emerald)">' + esc(p.name) + '</strong>' +
          '<span style="display:inline-flex;gap:3px"><i style="width:10px;height:10px;border-radius:99px;background:' + p.primaryBg + '"></i><i style="width:10px;height:10px;border-radius:99px;background:' + p.accentColor + '"></i></span>' +
          '</div><div style="font-size:11px;color:var(--muted);margin-top:3px">' + esc(p.subtitle) + '</div></button>';
      }).join('');
    }

    function selectPreset(pid) {
      EDITING.data.design.templatePreset = pid;
      renderPresetList();
      refreshLivePreview();
    }

    function renderThemeMiniGrid() {
      var q = (document.getElementById('themeSearch').value || '').trim().toLowerCase();
      var list = THEMES.filter(function(t){ return !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q); });
      document.getElementById('themeMiniGrid').innerHTML = list.map(function(t){
        var act = Number(EDITING.themeId) === t.id;
        return '<button type="button" class="theme-mini ' + (act ? 'active' : '') + '" onclick="selectTheme(' + t.id + ')">' +
          '<img src="' + esc(t.imageUrl) + '" alt="' + esc(t.name) + '" loading="lazy"/><span>' + esc(t.name) + '</span></button>';
      }).join('');
    }

    function selectTheme(tid) {
      EDITING.themeId = tid;
      renderThemeMiniGrid();
      refreshLivePreview();
    }

    function togglePublishStatus() {
      EDITING.status = EDITING.status === 'published' ? 'draft' : 'published';
      document.getElementById('btnTogglePublish').textContent = EDITING.status === 'published' ? 'Ubah ke Draft' : 'Terbitkan';
      saveCurrentInvitation();
    }

    async function saveCurrentInvitation() {
      if (!EDITING) return;
      EDITING.updatedAt = new Date().toISOString();
      if (MODE === 'server') {
        try {
          var saved = await apiFetch('/api/admin/invitations/' + EDITING.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: EDITING.title, slug: EDITING.slug, status: EDITING.status, themeId: EDITING.themeId, data: EDITING.data })
          });
          EDITING = saved;
          showEditorAlert('Perubahan tersimpan ke database server.', true);
        } catch(err) {
          showEditorAlert(err.message || 'Gagal menyimpan perubahan.', false);
        }
      } else {
        var idx = INVITATIONS.findIndex(function(i){ return i.id === EDITING.id; });
        if (idx >= 0) INVITATIONS[idx] = EDITING; else INVITATIONS.unshift(EDITING);
        saveOfflineStore(INVITATIONS);
        showEditorAlert('Perubahan tersimpan di browser lokal.', true);
      }
    }

    function buildClientInvitationHtml(inv) {
      var d = inv.data;
      var preset = PRESETS.find(function(p){ return p.id === (d.design && d.design.templatePreset); }) || PRESETS[0];
      var theme = getTheme(inv.themeId);
      var bg = (d.design && d.design.backgroundImageOverride) || theme.imageUrl;
      var groomPhoto = (d.couple.groomPhoto && !d.couple.groomPhoto.startsWith('/')) ? d.couple.groomPhoto : ((SERVER_URL || '') + (d.couple.groomPhoto || ''));
      var bridePhoto = (d.couple.bridePhoto && !d.couple.bridePhoto.startsWith('/')) ? d.couple.bridePhoto : ((SERVER_URL || '') + (d.couple.bridePhoto || ''));
      var couplePhoto = (d.couple.couplePhoto && !d.couple.couplePhoto.startsWith('/')) ? d.couple.couplePhoto : ((SERVER_URL || '') + (d.couple.couplePhoto || '')) || bg;
      var eventsHtml = (d.events || []).map(function(ev){
        return '<div class="card"><p class="eyebrow">' + esc(ev.type) + '</p><h3 class="venue">' + esc(ev.venueName) + '</h3>' +
          '<p class="meta">' + esc(ev.date) + ' &middot; ' + esc(ev.startTime) + ' - ' + esc(ev.endTime) + '</p>' +
          '<p class="body">' + esc(ev.address) + '</p>' +
          (ev.mapsUrl ? '<a class="btn-pri" href="' + esc(ev.mapsUrl) + '" target="_blank">Petunjuk Lokasi</a>' : '') + '</div>';
      }).join('');
      var banksHtml = d.gifts && d.gifts.enabled ? (d.gifts.banks || []).map(function(b){
        return '<div class="bank-row"><div><div class="eyebrow">' + esc(b.bankName) + '</div><div class="acc">' + esc(b.accountNumber) + '</div><div class="meta">a.n. ' + esc(b.accountHolder) + '</div></div><button class="btn-copy" onclick="navigator.clipboard.writeText(\\'' + esc(b.accountNumber) + '\\');this.textContent=\\'Tersalin\\'">Salin</button></div>';
      }).join('') : '';

      return '<!doctype html><html lang="id"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
        '<title>' + esc(inv.title) + '</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>' +
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:\\'Plus Jakarta Sans\\',sans-serif;background:' + preset.canvasBg + ';color:' + preset.bodyColor + ';overflow-x:clip}' +
        '.bg-pin{position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:460px;z-index:0;pointer-events:none}' +
        '.bg-pin img{width:100%;height:100%;object-fit:cover}.bg-wash{position:absolute;inset:0;background:' + preset.backdropWash + '}' +
        '.col{position:relative;z-index:1;max-width:460px;margin:0 auto;padding:28px 16px 88px;text-align:center}' +
        '.eyebrow{font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:' + preset.accentColor + '}' +
        '.title{font-family:\\'Playfair Display\\',serif;font-size:34px;color:' + preset.headingColor + ';margin:8px 0 18px}' +
        '.hero{width:100%;max-width:320px;aspect-ratio:3/4;object-fit:cover;border-radius:999px 999px 24px 24px;border:2px solid ' + preset.accentColor + ';display:block;margin:0 auto 20px}' +
        '.card{background:' + preset.cardBg + ';border:1px solid ' + preset.cardBorder + ';backdrop-filter:blur(12px);border-radius:24px;padding:22px 18px;margin-top:16px}' +
        '.venue{font-family:\\'Playfair Display\\',serif;font-size:21px;color:' + preset.headingColor + ';margin-top:6px}' +
        '.meta{font-size:12px;color:' + preset.mutedColor + ';margin:6px 0}' +
        '.body{font-size:13.5px;line-height:1.6}' +
        '.btn-pri{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 20px;border-radius:999px;background:' + preset.primaryBg + ';color:' + preset.primaryText + ';font-size:12px;font-weight:600;text-decoration:none;margin-top:14px}' +
        '.bank-row{display:flex;justify-content:space-between;align-items:center;text-align:left;padding:12px 14px;border:1px solid ' + preset.cardBorder + ';border-radius:14px;margin-top:10px}' +
        '.acc{font-size:16px;font-weight:700;color:' + preset.headingColor + '}' +
        '.btn-copy{min-height:36px;padding:4px 14px;border-radius:999px;border:1px solid ' + preset.accentColor + ';background:transparent;color:' + preset.headingColor + ';font-size:12px;font-weight:600;cursor:pointer}' +
        '.portrait{width:140px;height:140px;object-fit:cover;border-radius:999px;border:2px solid ' + preset.accentColor + ';margin-bottom:10px}' +
        '</style></head><body>' +
        '<div class="bg-pin"><img src="' + esc(bg) + '" alt=""/><div class="bg-wash"></div></div>' +
        '<div class="col">' +
        '<p class="eyebrow">The Wedding Of</p><h1 class="title">' + esc(d.couple.groomNickname) + ' &amp; ' + esc(d.couple.brideNickname) + '</h1>' +
        '<img src="' + esc(couplePhoto) + '" class="hero" alt="Couple"/>' +
        '<p class="body" style="font-weight:500;color:' + preset.headingColor + '">' + esc(d.couple.openingQuote) + '</p>' +
        '<div class="card">' + (groomPhoto ? '<img src="' + esc(groomPhoto) + '" class="portrait"/>' : '') + '<p class="eyebrow">Mempelai Pria</p><h3 class="venue">' + esc(d.couple.groomFullName) + '</h3><p class="meta">Putra dari ' + esc(d.couple.groomFather) + ' &amp; ' + esc(d.couple.groomMother) + '</p></div>' +
        '<div class="card">' + (bridePhoto ? '<img src="' + esc(bridePhoto) + '" class="portrait"/>' : '') + '<p class="eyebrow">Mempelai Wanita</p><h3 class="venue">' + esc(d.couple.brideFullName) + '</h3><p class="meta">Putri dari ' + esc(d.couple.brideFather) + ' &amp; ' + esc(d.couple.brideMother) + '</p></div>' +
        eventsHtml +
        (banksHtml ? '<div class="card"><p class="eyebrow">Tanda Kasih</p><h3 class="venue">Amplop Digital</h3><p class="meta">' + esc(d.gifts.message) + '</p>' + banksHtml + '</div>' : '') +
        '<div style="margin-top:26px"><p class="body">' + esc(d.couple.closingQuote) + '</p><p class="venue" style="margin-top:10px">' + esc(d.couple.groomNickname) + ' &amp; ' + esc(d.couple.brideNickname) + '</p></div>' +
        '</div></body></html>';
    }

    function refreshLivePreview() {
      if (!EDITING) return;
      document.getElementById('livePreviewFrame').srcdoc = buildClientInvitationHtml(EDITING);
    }

    function triggerDownloadBlob(filename, content, mime) {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    }

    async function downloadFromServer(path, fallbackFilename, postPayload) {
      var base = (SERVER_URL || '').replace(/\\/$/, '');
      var headers = {};
      if (AUTH_TOKEN) headers['Authorization'] = 'Bearer ' + AUTH_TOKEN;
      var fetchOpts = { method: postPayload ? 'POST' : 'GET', credentials: 'include', headers: headers };
      if (postPayload) {
        headers['Content-Type'] = 'application/json';
        fetchOpts.body = JSON.stringify(postPayload);
      }
      var res = await fetch(base + path, fetchOpts);
      if (!res.ok) {
        var err = await res.json().catch(function(){ return {}; });
        throw new Error(err.error || ('Gagal mengunduh (' + res.status + ')'));
      }
      var blob = await res.blob();
      var disp = res.headers.get('content-disposition') || '';
      var m = disp.match(/filename="?([^";\\n]+)"?/i);
      var filename = (m && m[1]) || fallbackFilename;
      triggerDownloadBlob(filename, blob);
    }

    async function downloadInvById(id) {
      var inv = INVITATIONS.find(function(i){ return i.id === id; });
      if (!inv) return;
      if (MODE === 'server') {
        try {
          await downloadFromServer('/api/admin/invitations/' + inv.id + '/export-html', 'undangan-' + inv.slug + '.html');
          showDashAlert('File HTML undangan berhasil diunduh.', true);
        } catch(err) {
          showDashAlert(err.message || 'Gagal mengunduh HTML undangan.', false);
        }
        return;
      }
      triggerDownloadBlob('undangan-' + inv.slug + '.html', buildClientInvitationHtml(inv), 'text/html;charset=utf-8');
    }

    async function downloadCurrentInvitationHtml() {
      if (!EDITING) return;
      if (MODE === 'server') {
        try {
          await downloadFromServer('/api/admin/invitations/' + EDITING.id + '/export-html', 'undangan-' + EDITING.slug + '.html', {
            title: EDITING.title,
            slug: EDITING.slug,
            status: EDITING.status,
            themeId: EDITING.themeId,
            data: EDITING.data
          });
          showEditorAlert('File HTML undangan berhasil diunduh.', true);
        } catch(err) {
          showEditorAlert(err.message || 'Gagal mengunduh HTML undangan.', false);
        }
        return;
      }
      triggerDownloadBlob('undangan-' + EDITING.slug + '.html', buildClientInvitationHtml(EDITING), 'text/html;charset=utf-8');
    }

    async function exportAllBackupJson() {
      if (MODE === 'server') {
        try {
          await downloadFromServer('/api/admin/backup', 'ruangjanji-backup.json');
          showDashAlert('Backup JSON berhasil diunduh.', true);
        } catch(err) {
          showDashAlert(err.message || 'Gagal mengunduh backup JSON.', false);
        }
        return;
      }
      triggerDownloadBlob('ruangjanji-offline-backup.json', JSON.stringify({ exportedAt: new Date().toISOString(), app: 'RUANGJANJI PRO', invitations: INVITATIONS }, null, 2), 'application/json');
    }

    function triggerImportBackup() { document.getElementById('restoreFileInput').click(); }

    async function handleImportBackup(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        var parsed = JSON.parse(await file.text());
        if (MODE === 'server') {
          await apiFetch('/api/admin/restore', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(parsed) });
          await loadServerDashboard();
        } else if (Array.isArray(parsed.invitations)) {
          INVITATIONS = parsed.invitations.map(function(inv){
            return inv.data ? inv : Object.assign({}, inv, { data: JSON.parse(inv.data_json || '{}') });
          });
          saveOfflineStore(INVITATIONS);
          enterOfflineDashboard();
        }
      } catch(err) {
        showAuthAlert('File JSON backup tidak valid.', false);
      } finally {
        e.target.value = '';
      }
    }

    async function changePasswordSubmit(e) {
      e.preventDefault();
      var el = document.getElementById('secAlert');
      try {
        await apiFetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: document.getElementById('secCurrPass').value,
            newPassword: document.getElementById('secNewPass').value,
            newRecoveryKey: document.getElementById('secNewKey').value.trim() || undefined
          })
        });
        el.textContent = 'Password administrator berhasil diperbarui.';
        el.className = 'alert alert-ok';
        e.target.reset();
      } catch(err) {
        el.textContent = err.message || 'Gagal mengubah password.';
        el.className = 'alert alert-err';
      }
    }

    initApp();
  </script>
</body>
</html>`;
}
