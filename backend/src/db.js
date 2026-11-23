const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'booking.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('faculty','coordinator','incharge','admin')),
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL CHECK(type IN ('lab','seminar_hall','auditorium','classroom')),
    capacity     INTEGER NOT NULL,
    facilities   TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
    needs_approval INTEGER NOT NULL DEFAULT 0, -- 1 = requires incharge approval
    incharge_id  TEXT REFERENCES users(id),
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS timetable (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,  -- 0=Sun, 1=Mon, ... 6=Sat
    start_time  TEXT NOT NULL,     -- "HH:MM"
    end_time    TEXT NOT NULL,     -- "HH:MM"
    subject     TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id           TEXT PRIMARY KEY,
    room_id      TEXT NOT NULL REFERENCES rooms(id),
    user_id      TEXT NOT NULL REFERENCES users(id),
    title        TEXT NOT NULL,
    description  TEXT,
    date         TEXT NOT NULL,    -- "YYYY-MM-DD"
    start_time   TEXT NOT NULL,    -- "HH:MM"
    end_time     TEXT NOT NULL,    -- "HH:MM"
    attendees    INTEGER NOT NULL DEFAULT 1,
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','approved','rejected','cancelled')),
    reject_reason TEXT,
    approved_by  TEXT REFERENCES users(id),
    approved_at  TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    booking_id  TEXT REFERENCES bookings(id),
    message     TEXT NOT NULL,
    is_read     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
