/**
 * Skema database RHEA (rhea.db) — DDL SQLite.
 * Spec: docs 03 §Dual-Storage Architecture — data dinamis & riwayat besar
 * disimpan di SQLite, konfigurasi statis di JSON.
 *
 * DDL ini siap dieksekusi via Capacitor-SQLite di Android. Di web dev, adapter
 * localStorage memakai struktur tabel ini sebagai namespace key.
 */

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
-- Sesi fokus mendalam (start/end/durasi/task lengkap)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  task_name TEXT NOT NULL,
  started_at TEXT NOT NULL,          -- ISO 8601
  ended_at TEXT,                     -- ISO 8601, NULL kalau masih berjalan
  planned_minutes INTEGER NOT NULL,
  elapsed_minutes REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,  -- 0 = cancelled/paused, 1 = selesai
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON focus_sessions(started_at);

-- Tugas harian
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal',
  tag TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Memori hubungan (importance 1-10, kategori CORE/LEARNED/TEMPORARY)
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,             -- CORE | LEARNED | TEMPORARY
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 5,
  relevance REAL NOT NULL DEFAULT 0.5,
  recency REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Percakapan & pesan AI
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  mode TEXT,                          -- casual|technical|focus|supportive|planning|reflective
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                 -- user | rhea
  content TEXT NOT NULL,
  provider TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- Jadwal berulang (mirror Daily_Routine JSON, siap jadi sumber kebenaran)
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,                  -- monday..sunday
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'activity',
  location TEXT,
  description TEXT
);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day, start_time);

-- Catatan & jurnal
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,                          -- comma-separated
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Aktivitas GitHub (Fase 3)
CREATE TABLE IF NOT EXISTS github_activity (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'commit',
  created_at TEXT NOT NULL
);
`;

/**
 * Personal DNA — konfigurasi statis user (docs 03 §Personal DNA).
 * Disimpan sebagai JSON config (bukan di tabel dinamis).
 */
export interface PersonalDNA {
  version: number;
  identity: {
    userName: string;
    userNickname: string;
    companionName: string;
    language: 'id';
    englishMix: boolean;
  };
  voiceDNA: {
    tone: string[];
    punctuation: string;
    vowelExtension: boolean;
    doubleLetters: boolean;
    capsLockEmphasis: boolean;
    emoticons: string[];
    slangTerms: string[];
  };
  preferences: {
    sleepTarget: string;       // "22:00"
    focusWindow: string;       // "19:00-21:00"
    reminderStyle: 'gentle' | 'firm';
    notifyOnFallback: boolean;
  };
  geofences: Array<{
    name: string;
    type: 'home' | 'work' | 'gym' | 'school';
    enabled: boolean;
  }>;
}

export const DEFAULT_DNA: PersonalDNA = {
  version: 1,
  identity: {
    userName: 'Zennrch',
    userNickname: 'Zen',
    companionName: 'Renatha',
    language: 'id',
    englishMix: true,
  },
  voiceDNA: {
    tone: ['warm', 'affectionate', 'playful', 'expressive'],
    punctuation: 'Natural, expressive (huruf ganda, emoticon klasik)',
    vowelExtension: true,
    doubleLetters: true,
    capsLockEmphasis: true,
    emoticons: ['T____T', ':(', ':3'],
    slangTerms: ['gak', 'ga', 'aja', 'udah', 'ngga', 'tau', 'banget'],
  },
  preferences: {
    sleepTarget: '22:00',
    focusWindow: '19:00-21:00',
    reminderStyle: 'gentle',
    notifyOnFallback: true,
  },
  geofences: [
    { name: 'Rumah', type: 'home', enabled: true },
  ],
};
