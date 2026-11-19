import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { ensureBuiltinAudioTracks } from './src/server/audioSeed.ts';
import { db, hashPassword, initDatabase, logActivity, verifyPassword } from './src/server/db.ts';
import { buildStandaloneAdminHtml } from './src/server/exportAdminHtml.ts';
import { buildStandaloneInvitationHtml } from './src/server/exportHtml.ts';
import { DEFAULT_INVITATION_DATA } from './src/shared/defaultInvitation.ts';
import { THEMES } from './src/shared/themes.ts';
import { InvitationData, InvitationRecord } from './src/shared/types.ts';

const PORT = 3000;
const SESSION_COOKIE = 'rj_admin_session';
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PUBLIC_AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');

for (const dir of [
  UPLOADS_DIR,
  path.join(UPLOADS_DIR, 'images'),
  path.join(UPLOADS_DIR, 'audio'),
  path.join(UPLOADS_DIR, 'video'),
]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureBuiltinAudioTracks(PUBLIC_AUDIO_DIR);
initDatabase();

interface AuthenticatedRequest extends Request {
  admin?: { id: string; username: string; email: string };
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (cookieToken && typeof cookieToken === 'string') return cookieToken;
  return null;
}

function getSessionAdmin(req: Request): { id: string; username: string; email: string } | null {
  const token = extractSessionToken(req);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.expires_at, a.id, a.username, a.email
       FROM sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token = ?`
    )
    .get(token) as { expires_at: string; id: string; username: string; email: string } | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: row.id, username: row.username, email: row.email };
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const admin = getSessionAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Sesi administrator tidak valid atau telah berakhir. Silakan login kembali.' });
    return;
  }
  req.admin = admin;
  next();
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: Boolean(isHttps),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function createSlug(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return base || `undangan-${Date.now()}`;
}

function ensureUniqueSlug(desired: string, excludeId?: string): string {
  let slug = createSlug(desired);
  let suffix = 1;
  while (true) {
    const existing = db
      .prepare('SELECT id FROM invitations WHERE slug = ?')
      .get(slug) as { id: string } | undefined;
    if (!existing || existing.id === excludeId) return slug;
    slug = `${createSlug(desired)}-${suffix++}`;
  }
}

function hydrateInvitation(row: {
  id: string;
  slug: string;
  title: string;
  status: string;
  theme_id: number;
  data_json: string;
  created_at: string;
  updated_at: string;
}): InvitationRecord {
  const views = (db.prepare('SELECT COUNT(*) as c FROM visits WHERE invitation_id = ?').get(row.id) as { c: number }).c;
  const rsvpCount = (db.prepare('SELECT COUNT(*) as c FROM rsvp_wishes WHERE invitation_id = ?').get(row.id) as { c: number }).c;
  const attendingGuests = (
    db
      .prepare("SELECT COALESCE(SUM(guest_count), 0) as c FROM rsvp_wishes WHERE invitation_id = ? AND attendance = 'hadir'")
      .get(row.id) as { c: number }
  ).c;
  const wishesCount = (
    db.prepare('SELECT COUNT(*) as c FROM rsvp_wishes WHERE invitation_id = ? AND is_approved = 1').get(row.id) as { c: number }
  ).c;

  let parsed: InvitationData = DEFAULT_INVITATION_DATA;
  try {
    parsed = JSON.parse(row.data_json);
  } catch {
    parsed = DEFAULT_INVITATION_DATA;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status === 'published' ? 'published' : 'draft',
    themeId: row.theme_id,
    data: parsed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stats: { views, rsvpCount, attendingGuests, wishesCount },
  };
}

// Multer storage for media uploads
const mediaStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, path.join(UPLOADS_DIR, 'audio'));
    } else if (file.mimetype.startsWith('video/')) {
      cb(null, path.join(UPLOADS_DIR, 'video'));
    } else {
      cb(null, path.join(UPLOADS_DIR, 'images'));
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/');
    if (!allowed) {
      cb(new Error('Format file tidak didukung. Gunakan gambar, audio (MP3/WAV/OGG/M4A), atau video (MP4/WEBM).'));
      return;
    }
    cb(null, true);
  },
});

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(express.json({ limit: '25mb' }));

  // Serve uploaded media & built-in audio
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/audio', express.static(PUBLIC_AUDIO_DIR));

  // ==================== AUTH ROUTES ====================

  app.get('/api/auth/status', (req, res) => {
    const count = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c;
    const admin = getSessionAdmin(req);
    res.json({
      initialized: count > 0,
      authenticated: Boolean(admin),
      admin,
    });
  });

  app.post('/api/auth/setup', (req, res) => {
    const count = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c;
    if (count > 0) {
      res.status(403).json({ error: 'Akun administrator sudah diaktifkan.' });
      return;
    }
    const { username, email, password, recoveryKey } = req.body || {};
    if (!username || String(username).trim().length < 3) {
      res.status(400).json({ error: 'Username minimal 3 karakter.' });
      return;
    }
    if (!password || String(password).length < 6) {
      res.status(400).json({ error: 'Password minimal 6 karakter.' });
      return;
    }
    if (!recoveryKey || String(recoveryKey).trim().length < 4) {
      res.status(400).json({ error: 'Kode pemulihan (Recovery Key) minimal 4 karakter.' });
      return;
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const pwd = hashPassword(String(password));
    const rec = hashPassword(String(recoveryKey).trim());

    db.prepare(
      `INSERT INTO admins (id, username, email, password_hash, salt, recovery_hash, recovery_salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      String(username).trim().toLowerCase(),
      String(email || 'owner@ruangjanji.pro').trim(),
      pwd.hash,
      pwd.salt,
      rec.hash,
      rec.salt,
      now,
      now
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      token,
      id,
      expiresAt,
      now
    );
    setSessionCookie(req, res, token);
    logActivity('auth', `Akun administrator "${String(username).trim().toLowerCase()}" diaktifkan.`);
    res.json({
      ok: true,
      token,
      admin: { id, username: String(username).trim().toLowerCase(), email: String(email || '') },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi.' });
      return;
    }
    const admin = db
      .prepare('SELECT * FROM admins WHERE username = ?')
      .get(String(username).trim().toLowerCase()) as
      | { id: string; username: string; email: string; password_hash: string; salt: string }
      | undefined;

    if (!admin || !verifyPassword(String(password), admin.salt, admin.password_hash)) {
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }

    const now = new Date().toISOString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      token,
      admin.id,
      expiresAt,
      now
    );
    setSessionCookie(req, res, token);
    logActivity('auth', `Administrator "${admin.username}" masuk ke sistem.`);
    res.json({ ok: true, token, admin: { id: admin.id, username: admin.username, email: admin.email } });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractSessionToken(req);
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(SESSION_COOKIE, { path: '/', sameSite: isHttps ? 'none' : 'lax', secure: Boolean(isHttps) });
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { username, recoveryKey, newPassword } = req.body || {};
    if (!username || !recoveryKey || !newPassword) {
      res.status(400).json({ error: 'Username, Kode Pemulihan, dan Password baru wajib diisi.' });
      return;
    }
    if (String(newPassword).length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      return;
    }
    const admin = db
      .prepare('SELECT * FROM admins WHERE username = ?')
      .get(String(username).trim().toLowerCase()) as
      | { id: string; recovery_hash: string; recovery_salt: string }
      | undefined;

    if (!admin || !verifyPassword(String(recoveryKey).trim(), admin.recovery_salt, admin.recovery_hash)) {
      res.status(403).json({ error: 'Username atau Kode Pemulihan tidak cocok.' });
      return;
    }

    const pwd = hashPassword(String(newPassword));
    const now = new Date().toISOString();
    db.prepare('UPDATE admins SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(
      pwd.hash,
      pwd.salt,
      now,
      admin.id
    );
    db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(admin.id);
    logActivity('auth', 'Password administrator berhasil direset menggunakan Kode Pemulihan.');
    res.json({ ok: true, message: 'Password berhasil diperbarui. Silakan login kembali.' });
  });

  app.post('/api/auth/change-password', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword, newRecoveryKey } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Password saat ini dan password baru (minimal 6 karakter) wajib diisi.' });
      return;
    }
    const admin = db
      .prepare('SELECT * FROM admins WHERE id = ?')
      .get(req.admin!.id) as { id: string; password_hash: string; salt: string } | undefined;

    if (!admin || !verifyPassword(String(currentPassword), admin.salt, admin.password_hash)) {
      res.status(403).json({ error: 'Password saat ini tidak sesuai.' });
      return;
    }

    const pwd = hashPassword(String(newPassword));
    const now = new Date().toISOString();
    if (newRecoveryKey && String(newRecoveryKey).trim().length >= 4) {
      const rec = hashPassword(String(newRecoveryKey).trim());
      db.prepare(
        'UPDATE admins SET password_hash = ?, salt = ?, recovery_hash = ?, recovery_salt = ?, updated_at = ? WHERE id = ?'
      ).run(pwd.hash, pwd.salt, rec.hash, rec.salt, now, admin.id);
    } else {
      db.prepare('UPDATE admins SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(
        pwd.hash,
        pwd.salt,
        now,
        admin.id
      );
    }

    logActivity('auth', 'Password administrator diubah.');
    res.json({ ok: true });
  });

  // ==================== PUBLIC SHOWCASE & INVITATION ROUTES ====================

  app.get('/api/public/themes', (_req, res) => {
    res.json(THEMES.slice(0, 100));
  });

  app.get('/api/public/invitations', (_req, res) => {
    const rows = db
      .prepare("SELECT * FROM invitations WHERE status = 'published' ORDER BY created_at ASC LIMIT 10")
      .all() as any[];
    res.json(rows.map(hydrateInvitation));
  });

  app.get('/api/public/invitations/:slug', (req, res) => {
    const row = db
      .prepare("SELECT * FROM invitations WHERE slug = ? AND status = 'published'")
      .get(req.params.slug) as any;

    if (!row) {
      res.status(404).json({ error: 'Undangan tidak ditemukan atau belum dipublikasikan.' });
      return;
    }

    const wishes = db
      .prepare(
        `SELECT id, invitation_id as invitationId, guest_name as guestName, attendance, guest_count as guestCount,
                message, is_approved as isApproved, whatsapp_confirmed as whatsappConfirmed, created_at as createdAt
         FROM rsvp_wishes WHERE invitation_id = ? AND is_approved = 1 ORDER BY created_at DESC`
      )
      .all(row.id);

    res.json({
      invitation: hydrateInvitation(row),
      wishes,
    });
  });

  app.get('/api/public/invitations/:slug/export-html', (req, res) => {
    const row = db
      .prepare("SELECT * FROM invitations WHERE slug = ? AND status = 'published'")
      .get(req.params.slug) as any;

    if (!row) {
      res.status(404).json({ error: 'Contoh undangan tidak ditemukan atau belum dipublikasikan.' });
      return;
    }

    const invitation = hydrateInvitation(row);
    const wishes = db
      .prepare(
        `SELECT guest_name as guestName, attendance, guest_count as guestCount, message, created_at as createdAt
         FROM rsvp_wishes WHERE invitation_id = ? AND is_approved = 1 ORDER BY created_at DESC`
      )
      .all(row.id) as any[];

    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const html = buildStandaloneInvitationHtml(invitation, origin, wishes);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contoh-undangan.html"');
    res.send(html);
  });

  app.post('/api/public/invitations/:slug/visit', (req, res) => {
    const row = db
      .prepare("SELECT id FROM invitations WHERE slug = ? AND status = 'published'")
      .get(req.params.slug) as { id: string } | undefined;
    if (!row) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    const guestName = String(req.body?.guestName || 'Pengunjung').slice(0, 120);
    const ua = String(req.headers['user-agent'] || '').slice(0, 200);
    db.prepare('INSERT INTO visits (id, invitation_id, guest_name, user_agent, created_at) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(),
      row.id,
      guestName,
      ua,
      new Date().toISOString()
    );
    res.json({ ok: true });
  });

  app.post('/api/public/invitations/:slug/rsvp', (req, res) => {
    const row = db
      .prepare("SELECT id, title FROM invitations WHERE slug = ? AND status = 'published'")
      .get(req.params.slug) as { id: string; title: string } | undefined;
    if (!row) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }

    const guestName = String(req.body?.guestName || '').trim().slice(0, 120);
    const attendanceRaw = String(req.body?.attendance || 'hadir');
    const attendance = ['hadir', 'tidak_hadir', 'ragu'].includes(attendanceRaw) ? attendanceRaw : 'hadir';
    const guestCount = Math.max(1, Math.min(20, Number(req.body?.guestCount || 1)));
    const message = String(req.body?.message || '').trim().slice(0, 1000);
    const whatsappConfirmed = req.body?.whatsappConfirmed ? 1 : 0;

    if (!guestName || !message) {
      res.status(400).json({ error: 'Nama tamu dan ucapan wajib diisi.' });
      return;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO rsvp_wishes (id, invitation_id, guest_name, attendance, guest_count, message, is_approved, whatsapp_confirmed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(id, row.id, guestName, attendance, guestCount, message, whatsappConfirmed, now);

    logActivity('rsvp', `${guestName} mengirim RSVP (${attendance.replace('_', ' ')}) pada ${row.title}.`, row.id);

    res.json({
      ok: true,
      wish: {
        id,
        invitationId: row.id,
        guestName,
        attendance,
        guestCount,
        message,
        isApproved: true,
        whatsappConfirmed: Boolean(whatsappConfirmed),
        createdAt: now,
      },
    });
  });

  app.get('/api/public/qrcode', async (req, res) => {
    const text = String(req.query.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'Parameter text wajib diisi.' });
      return;
    }
    try {
      const pngBuffer = await QRCode.toBuffer(text, {
        width: 512,
        margin: 2,
        color: { dark: '#0F2C23', light: '#FAF8F4' },
      });
      res.setHeader('Content-Type', 'image/png');
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', 'attachment; filename="qrcode-ruangjanji.png"');
      }
      res.send(pngBuffer);
    } catch {
      res.status(500).json({ error: 'Gagal membuat QR Code.' });
    }
  });

  // ==================== PROTECTED ADMIN ROUTES ====================

  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const totalInvitations = (db.prepare('SELECT COUNT(*) as c FROM invitations').get() as { c: number }).c;
    const publishedInvitations = (
      db.prepare("SELECT COUNT(*) as c FROM invitations WHERE status = 'published'").get() as { c: number }
    ).c;
    const draftInvitations = totalInvitations - publishedInvitations;
    const totalVisitors = (db.prepare('SELECT COUNT(*) as c FROM visits').get() as { c: number }).c;
    const totalRsvp = (db.prepare('SELECT COUNT(*) as c FROM rsvp_wishes').get() as { c: number }).c;
    const attendingCount = (
      db.prepare("SELECT COALESCE(SUM(guest_count), 0) as c FROM rsvp_wishes WHERE attendance = 'hadir'").get() as {
        c: number;
      }
    ).c;
    const notAttendingCount = (
      db.prepare("SELECT COUNT(*) as c FROM rsvp_wishes WHERE attendance = 'tidak_hadir'").get() as { c: number }
    ).c;
    const maybeCount = (
      db.prepare("SELECT COUNT(*) as c FROM rsvp_wishes WHERE attendance = 'ragu'").get() as { c: number }
    ).c;
    const totalWishes = (
      db.prepare('SELECT COUNT(*) as c FROM rsvp_wishes WHERE is_approved = 1').get() as { c: number }
    ).c;

    // Last 7 days visit series
    const visitSeries: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayStr = d.toISOString().slice(0, 10);
      const count = (
        db.prepare('SELECT COUNT(*) as c FROM visits WHERE substr(created_at, 1, 10) = ?').get(dayStr) as { c: number }
      ).c;
      visitSeries.push({ date: dayStr, count });
    }

    const recentActivities = db
      .prepare('SELECT id, type, description, created_at as createdAt FROM activities ORDER BY created_at DESC LIMIT 12')
      .all();

    res.json({
      totalInvitations,
      publishedInvitations,
      draftInvitations,
      totalVisitors,
      totalRsvp,
      attendingCount,
      notAttendingCount,
      maybeCount,
      totalWishes,
      visitSeries,
      recentActivities,
    });
  });

  app.get('/api/admin/invitations', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM invitations ORDER BY updated_at DESC').all() as any[];
    res.json(rows.map(hydrateInvitation));
  });

  app.get('/api/admin/invitations/:id', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    res.json(hydrateInvitation(row));
  });

  app.post('/api/admin/invitations', requireAdmin, (req, res) => {
    const { title, slug, status, themeId, data } = req.body || {};
    const finalTitle = String(title || 'Undangan Pernikahan Baru').trim();
    const finalSlug = ensureUniqueSlug(String(slug || finalTitle));
    const finalStatus = status === 'published' ? 'published' : 'draft';
    const finalThemeId = Number(themeId || 42);
    const finalData: InvitationData = data || DEFAULT_INVITATION_DATA;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO invitations (id, slug, title, status, theme_id, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, finalSlug, finalTitle, finalStatus, finalThemeId, JSON.stringify(finalData), now, now);

    logActivity('create', `Membuat undangan baru "${finalTitle}".`, id);
    const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(id) as any;
    res.status(201).json(hydrateInvitation(row));
  });

  app.put('/api/admin/invitations/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    const { title, slug, status, themeId, data } = req.body || {};
    const finalTitle = String(title ?? existing.title).trim() || existing.title;
    const finalSlug = ensureUniqueSlug(String(slug ?? existing.slug), existing.id);
    const finalStatus = status === 'published' ? 'published' : status === 'draft' ? 'draft' : existing.status;
    const finalThemeId = Number(themeId ?? existing.theme_id);
    const finalData = data ? JSON.stringify(data) : existing.data_json;
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE invitations SET title = ?, slug = ?, status = ?, theme_id = ?, data_json = ?, updated_at = ? WHERE id = ?`
    ).run(finalTitle, finalSlug, finalStatus, finalThemeId, finalData, now, existing.id);

    if (existing.status !== finalStatus && finalStatus === 'published') {
      logActivity('publish', `Undangan "${finalTitle}" diterbitkan (/undangan/${finalSlug}).`, existing.id);
    } else {
      logActivity('update', `Memperbarui undangan "${finalTitle}".`, existing.id);
    }

    const updated = db.prepare('SELECT * FROM invitations WHERE id = ?').get(existing.id) as any;
    res.json(hydrateInvitation(updated));
  });

  app.delete('/api/admin/invitations/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT id, title FROM invitations WHERE id = ?').get(req.params.id) as
      | { id: string; title: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    db.prepare('DELETE FROM invitations WHERE id = ?').run(existing.id);
    logActivity('delete', `Menghapus undangan "${existing.title}".`);
    res.json({ ok: true });
  });

  app.post('/api/admin/invitations/:id/duplicate', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    const newId = crypto.randomUUID();
    const newTitle = `${existing.title} (Salinan)`;
    const newSlug = ensureUniqueSlug(`${existing.slug}-salinan`);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO invitations (id, slug, title, status, theme_id, data_json, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`
    ).run(newId, newSlug, newTitle, existing.theme_id, existing.data_json, now, now);

    logActivity('create', `Menduplikasi undangan "${existing.title}".`, newId);
    const created = db.prepare('SELECT * FROM invitations WHERE id = ?').get(newId) as any;
    res.status(201).json(hydrateInvitation(created));
  });

  // ==================== GUEST LIST & EXCEL ROUTES ====================

  app.get('/api/admin/invitations/:id/guests', requireAdmin, (req, res) => {
    const guests = db
      .prepare(
        `SELECT id, invitation_id as invitationId, name, phone, group_name as groupName, pax, rsvp_status as rsvpStatus, created_at as createdAt
         FROM guests WHERE invitation_id = ? ORDER BY created_at DESC`
      )
      .all(req.params.id);
    res.json(guests);
  });

  app.post('/api/admin/invitations/:id/guests', requireAdmin, (req, res) => {
    const { name, phone, groupName, pax } = req.body || {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Nama tamu wajib diisi.' });
      return;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO guests (id, invitation_id, name, phone, group_name, pax, rsvp_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).run(id, req.params.id, String(name).trim(), String(phone || '').trim(), String(groupName || 'Tamu').trim(), Number(pax || 2), now);

    res.status(201).json({
      id,
      invitationId: req.params.id,
      name: String(name).trim(),
      phone: String(phone || '').trim(),
      groupName: String(groupName || 'Tamu').trim(),
      pax: Number(pax || 2),
      rsvpStatus: 'pending',
      createdAt: now,
    });
  });

  app.delete('/api/admin/guests/:guestId', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM guests WHERE id = ?').run(req.params.guestId);
    res.json({ ok: true });
  });

  app.post('/api/admin/invitations/:id/guests/import', requireAdmin, uploadMemory.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'File Excel/CSV tidak ditemukan.' });
      return;
    }
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName]);
      const insert = db.prepare(
        `INSERT INTO guests (id, invitation_id, name, phone, group_name, pax, rsvp_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
      );
      const now = new Date().toISOString();
      let imported = 0;

      const trx = db.transaction((items: Record<string, any>[]) => {
        for (const r of items) {
          const name = String(r.Nama || r.nama || r.Name || r.name || '').trim();
          if (!name) continue;
          const phone = String(r.WhatsApp || r.whatsapp || r.HP || r.Phone || r.phone || '').trim();
          const groupName = String(r.Grup || r.grup || r.Group || r.group || 'Tamu').trim();
          const pax = Math.max(1, Number(r.Jumlah || r.Pax || r.pax || 2) || 2);
          insert.run(crypto.randomUUID(), req.params.id, name, phone, groupName, pax, now);
          imported++;
        }
      });

      trx(rows);
      logActivity('guest', `Mengimpor ${imported} tamu dari file Excel.`, req.params.id);
      res.json({ ok: true, imported });
    } catch {
      res.status(400).json({ error: 'Format file Excel tidak dapat dibaca. Pastikan kolom Nama tersedia.' });
    }
  });

  app.get('/api/admin/invitations/:id/guests/export', requireAdmin, (req, res) => {
    const inv = db.prepare('SELECT slug, title FROM invitations WHERE id = ?').get(req.params.id) as
      | { slug: string; title: string }
      | undefined;
    if (!inv) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    const guests = db
      .prepare('SELECT name, phone, group_name, pax, rsvp_status FROM guests WHERE invitation_id = ? ORDER BY name ASC')
      .all(req.params.id) as Array<{ name: string; phone: string; group_name: string; pax: number; rsvp_status: string }>;

    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const exportRows = guests.map((g, idx) => ({
      No: idx + 1,
      Nama: g.name,
      WhatsApp: g.phone,
      Grup: g.group_name,
      Jumlah: g.pax,
      Status: g.rsvp_status,
      LinkUndangan: `${origin.replace(/\/$/, '')}/undangan/${inv.slug}?to=${encodeURIComponent(g.name)}`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Tamu');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="daftar-tamu-${inv.slug}.xlsx"`);
    res.send(buf);
  });

  // ==================== WISHES MODERATION ROUTES ====================

  app.get('/api/admin/invitations/:id/wishes', requireAdmin, (req, res) => {
    const rows = db
      .prepare(
        `SELECT id, invitation_id as invitationId, guest_name as guestName, attendance, guest_count as guestCount,
                message, is_approved as isApproved, whatsapp_confirmed as whatsappConfirmed, created_at as createdAt
         FROM rsvp_wishes WHERE invitation_id = ? ORDER BY created_at DESC`
      )
      .all(req.params.id)
      .map((w: any) => ({ ...w, isApproved: Boolean(w.isApproved), whatsappConfirmed: Boolean(w.whatsappConfirmed) }));
    res.json(rows);
  });

  app.patch('/api/admin/wishes/:wishId', requireAdmin, (req, res) => {
    const isApproved = req.body?.isApproved ? 1 : 0;
    db.prepare('UPDATE rsvp_wishes SET is_approved = ? WHERE id = ?').run(isApproved, req.params.wishId);
    res.json({ ok: true });
  });

  app.delete('/api/admin/wishes/:wishId', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM rsvp_wishes WHERE id = ?').run(req.params.wishId);
    res.json({ ok: true });
  });

  // ==================== FILE UPLOAD ROUTE ====================

  app.post('/api/admin/upload', requireAdmin, uploadMedia.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
      return;
    }
    const sub = req.file.mimetype.startsWith('audio/')
      ? 'audio'
      : req.file.mimetype.startsWith('video/')
      ? 'video'
      : 'images';
    const url = `/uploads/${sub}/${req.file.filename}`;
    res.json({
      url,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  });

  // ==================== EXPORT HTML & BACKUP ROUTES ====================

  app.get('/api/admin/invitations/:id/export-html', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    const invitation = hydrateInvitation(row);
    const wishes = db
      .prepare(
        `SELECT guest_name as guestName, attendance, guest_count as guestCount, message, created_at as createdAt
         FROM rsvp_wishes WHERE invitation_id = ? AND is_approved = 1 ORDER BY created_at DESC`
      )
      .all(row.id) as any[];

    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const html = buildStandaloneInvitationHtml(invitation, origin, wishes);
    const reqFilename = typeof req.query.filename === 'string' ? req.query.filename.replace(/[^a-zA-Z0-9._-]/g, '') : '';
    const outFilename = reqFilename && reqFilename.endsWith('.html') ? reqFilename : `undangan-${invitation.slug}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${outFilename}"`);
    res.send(html);
  });

  app.post('/api/admin/invitations/:id/export-html', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ error: 'Undangan tidak ditemukan.' });
      return;
    }
    const baseInvitation = hydrateInvitation(row);
    const body = req.body || {};
    const liveInvitation: InvitationRecord = {
      ...baseInvitation,
      title: String(body.title ?? baseInvitation.title),
      slug: String(body.slug ?? baseInvitation.slug),
      status: body.status === 'published' ? 'published' : body.status === 'draft' ? 'draft' : baseInvitation.status,
      themeId: Number(body.themeId ?? baseInvitation.themeId),
      data: body.data || baseInvitation.data,
    };
    const wishes = db
      .prepare(
        `SELECT guest_name as guestName, attendance, guest_count as guestCount, message, created_at as createdAt
         FROM rsvp_wishes WHERE invitation_id = ? AND is_approved = 1 ORDER BY created_at DESC`
      )
      .all(row.id) as any[];

    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const html = buildStandaloneInvitationHtml(liveInvitation, origin, wishes);
    const reqFilename = typeof req.query.filename === 'string' ? req.query.filename.replace(/[^a-zA-Z0-9._-]/g, '') : '';
    const outFilename = reqFilename && reqFilename.endsWith('.html') ? reqFilename : `undangan-${liveInvitation.slug || baseInvitation.slug}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${outFilename}"`);
    res.send(html);
  });

  app.get('/api/admin/export-html', requireAdmin, (req, res) => {
    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const html = buildStandaloneAdminHtml(origin);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-undangan.html"');
    res.send(html);
  });

  app.get('/api/admin/backup', requireAdmin, (_req, res) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'RUANGJANJI PRO',
      invitations: db.prepare('SELECT * FROM invitations').all(),
      guests: db.prepare('SELECT * FROM guests').all(),
      rsvp_wishes: db.prepare('SELECT * FROM rsvp_wishes').all(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ruangjanji-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  });

  app.post('/api/admin/restore', requireAdmin, (req, res) => {
    const { invitations, guests, rsvp_wishes } = req.body || {};
    if (!Array.isArray(invitations)) {
      res.status(400).json({ error: 'Format file backup tidak valid.' });
      return;
    }
    const trx = db.transaction(() => {
      for (const inv of invitations) {
        db.prepare(
          `INSERT OR REPLACE INTO invitations (id, slug, title, status, theme_id, data_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(inv.id, inv.slug, inv.title, inv.status, inv.theme_id, inv.data_json, inv.created_at, inv.updated_at);
      }
      if (Array.isArray(guests)) {
        for (const g of guests) {
          db.prepare(
            `INSERT OR REPLACE INTO guests (id, invitation_id, name, phone, group_name, pax, rsvp_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(g.id, g.invitation_id, g.name, g.phone, g.group_name, g.pax, g.rsvp_status, g.created_at);
        }
      }
      if (Array.isArray(rsvp_wishes)) {
        for (const w of rsvp_wishes) {
          db.prepare(
            `INSERT OR REPLACE INTO rsvp_wishes (id, invitation_id, guest_name, attendance, guest_count, message, is_approved, whatsapp_confirmed, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            w.id,
            w.invitation_id,
            w.guest_name,
            w.attendance,
            w.guest_count,
            w.message,
            w.is_approved,
            w.whatsapp_confirmed,
            w.created_at
          );
        }
      }
    });
    trx();
    logActivity('backup', `Memulihkan ${invitations.length} undangan dari file backup.`);
    res.json({ ok: true, restoredInvitations: invitations.length });
  });

  // Error handler for multer / body issues
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: err?.message || 'Terjadi kesalahan pada permintaan server.' });
  });

  // ==================== VITE / STATIC SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const distAssets = path.join(distDir, 'src', 'assets');
    if (fs.existsSync(distAssets)) {
      app.use('/src/assets', express.static(distAssets));
    }
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RUANGJANJI PRO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
