import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SEED_INVITATIONS } from './seedInvitations.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'ruangjanji.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string, salt?: string) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, useSalt, 64).toString('hex');
  return { salt: useSalt, hash };
}

export function verifyPassword(password: string, salt: string, storedHash: string) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      recovery_hash TEXT NOT NULL,
      recovery_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      theme_id INTEGER NOT NULL DEFAULT 42,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      group_name TEXT DEFAULT 'Tamu Undangan',
      pax INTEGER DEFAULT 2,
      rsvp_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rsvp_wishes (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      attendance TEXT NOT NULL,
      guest_count INTEGER NOT NULL DEFAULT 1,
      message TEXT NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 1,
      whatsapp_confirmed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      guest_name TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      invitation_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Optional env-based initial admin seeding (never hardcoded in JS)
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c;
  if (adminCount === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const now = new Date().toISOString();
    const { salt, hash } = hashPassword(process.env.ADMIN_PASSWORD);
    const rec = hashPassword(process.env.ADMIN_RECOVERY_KEY || crypto.randomBytes(12).toString('hex'));
    db.prepare(
      `INSERT INTO admins (id, username, email, password_hash, salt, recovery_hash, recovery_salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      process.env.ADMIN_USERNAME.trim().toLowerCase(),
      process.env.ADMIN_EMAIL || 'admin@ruangjanji.pro',
      hash,
      salt,
      rec.hash,
      rec.salt,
      now,
      now
    );
  }

  // Seed 10 curated published showcase wedding invitations
  const invCount = (db.prepare('SELECT COUNT(*) as c FROM invitations').get() as { c: number }).c;
  const checkExisting = db.prepare('SELECT id, data_json FROM invitations WHERE id = ? OR slug = ?');
  const insertInv = db.prepare(
    `INSERT INTO invitations (id, slug, title, status, theme_id, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const updateSeedInv = db.prepare(
    `UPDATE invitations SET data_json = ?, theme_id = ? WHERE id = ?`
  );
  const insertGuest = db.prepare(
    `INSERT OR IGNORE INTO guests (id, invitation_id, name, phone, group_name, pax, rsvp_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertWish = db.prepare(
    `INSERT OR IGNORE INTO rsvp_wishes (id, invitation_id, guest_name, attendance, guest_count, message, is_approved, whatsapp_confirmed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`
  );

  // Seed missing showcase examples and upgrade showcase examples that haven't received a templatePreset yet
  const baseTime = Date.now();
  SEED_INVITATIONS.forEach((spec, idx) => {
    const existingRow = checkExisting.get(spec.id, spec.slug) as { id: string; data_json: string } | undefined;
    if (existingRow) {
      try {
        const parsed = JSON.parse(existingRow.data_json);
        if (!parsed?.design?.templatePreset && existingRow.id === spec.id) {
          updateSeedInv.run(JSON.stringify(spec.data), spec.themeId, spec.id);
        }
      } catch {
        // leave unparseable rows untouched
      }
      return;
    }

    if (invCount <= 10) {
      const created = new Date(baseTime - (SEED_INVITATIONS.length - idx) * 60000).toISOString();
      insertInv.run(spec.id, spec.slug, spec.title, 'published', spec.themeId, JSON.stringify(spec.data), created, created);

      if (spec.id === 'inv-aditya-kirana') {
        const sampleGuests = [
          { id: 'gst-1', name: 'Bapak Ahmad Darmawan', phone: '6281288990011', groupName: 'VIP Keluarga', pax: 2, status: 'hadir' },
          { id: 'gst-2', name: 'Ibu Ratih Prameswari', phone: '6281377665544', groupName: 'Rekan Arsitektur', pax: 2, status: 'hadir' },
          { id: 'gst-3', name: 'Dimas & Nadia Kusuma', phone: '6281199887766', groupName: 'Sahabat Kampus', pax: 2, status: 'pending' },
        ];
        for (const g of sampleGuests) {
          insertGuest.run(g.id, spec.id, g.name, g.phone, g.groupName, g.pax, g.status, created);
        }
      }

      spec.wishes.forEach((w, wIdx) => {
        const dt = new Date(baseTime - (wIdx + 1) * 3600 * 1000 * 6).toISOString();
        insertWish.run(w.id, spec.id, w.name, w.attendance, w.count, w.message, dt);
      });
    }
  });

  if (invCount === 0) {
    const insertVisit = db.prepare(
      `INSERT INTO visits (id, invitation_id, guest_name, user_agent, created_at) VALUES (?, ?, ?, ?, ?)`
    );
    for (let d = 6; d >= 0; d--) {
      const visitsOnDay = 6 + ((6 - d) * 3);
      for (let v = 0; v < visitsOnDay; v++) {
        const dt = new Date(Date.now() - d * 86400000 - v * 1800000).toISOString();
        insertVisit.run(crypto.randomUUID(), 'inv-aditya-kirana', 'Pengunjung', 'Mobile Safari', dt);
      }
    }

    db.prepare(
      `INSERT INTO activities (id, type, description, invitation_id, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      'publish',
      '10 contoh undangan pernikahan & 100 tema foto siap ditinjau pengunjung.',
      'inv-aditya-kirana',
      new Date().toISOString()
    );
  }
}

export function logActivity(type: string, description: string, invitationId?: string) {
  db.prepare(
    `INSERT INTO activities (id, type, description, invitation_id, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), type, description, invitationId || null, new Date().toISOString());
}
