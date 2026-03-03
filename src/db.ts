import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// --- Types ---

export interface ExerciseSet {
  weight: number;
  reps: number;
}

export interface ExerciseEntry {
  name: string;
  sets: ExerciseSet[];
}

export interface Session {
  id: string;
  profileId: string;
  date: string;
  exercises: ExerciseEntry[];
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

// --- Database setup ---

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "training.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Schema ---

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    date       TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_exercises (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL,
    exercise    TEXT    NOT NULL,
    set_number  INTEGER NOT NULL,
    weight      REAL    NOT NULL DEFAULT 0,
    reps        INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_exercises_session
    ON session_exercises(session_id);

  CREATE INDEX IF NOT EXISTS idx_sessions_profile
    ON sessions(profile_id);
`);

// --- Seed default profile ---

const defaultProfileId = "martin";
const ensureDefaultProfile = db.prepare(
  `INSERT OR IGNORE INTO profiles (id, name) VALUES (?, ?)`
);
ensureDefaultProfile.run(defaultProfileId, "Martin");

// --- Migration: add profile_id to existing sessions ---

// Check if sessions table has profile_id column
const columns = db.pragma("table_info(sessions)") as { name: string }[];
const hasProfileId = columns.some((c) => c.name === "profile_id");

if (!hasProfileId) {
  db.exec(`ALTER TABLE sessions ADD COLUMN profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE`);
  db.exec(`UPDATE sessions SET profile_id = '${defaultProfileId}' WHERE profile_id IS NULL`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id)`);
}

// --- Prepared statements ---

// Profiles
const insertProfile = db.prepare(
  `INSERT INTO profiles (id, name) VALUES (?, ?)`
);

const selectAllProfiles = db.prepare(
  `SELECT id, name, created_at FROM profiles ORDER BY created_at`
);

const selectProfileById = db.prepare(
  `SELECT id, name, created_at FROM profiles WHERE id = ?`
);

// Sessions
const insertSession = db.prepare(
  `INSERT INTO sessions (id, profile_id, date) VALUES (?, ?, ?)`
);

const insertSet = db.prepare(
  `INSERT INTO session_exercises (session_id, exercise, set_number, weight, reps)
   VALUES (?, ?, ?, ?, ?)`
);

const selectSessionsByProfile = db.prepare(
  `SELECT id, profile_id, date FROM sessions WHERE profile_id = ? ORDER BY date DESC`
);

const selectSessionById = db.prepare(
  `SELECT id, profile_id, date FROM sessions WHERE id = ?`
);

const selectExercisesForSession = db.prepare(
  `SELECT exercise, set_number, weight, reps
   FROM session_exercises
   WHERE session_id = ?
   ORDER BY id`
);

const deleteSessionStmt = db.prepare(
  `DELETE FROM sessions WHERE id = ?`
);

// --- Public API: Profiles ---

export function getAllProfiles(): Profile[] {
  return selectAllProfiles.all() as Profile[];
}

export function getProfile(id: string): Profile | undefined {
  const row = selectProfileById.get(id) as { id: string; name: string; created_at: string } | undefined;
  if (!row) return undefined;
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function createProfile(name: string): Profile {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = selectProfileById.get(id);
  if (existing) throw new Error(`Profile "${name}" already exists`);
  insertProfile.run(id, name);
  return getProfile(id)!;
}

// --- Public API: Sessions ---

export function getSessionsByProfile(profileId: string): Session[] {
  const rows = selectSessionsByProfile.all(profileId) as { id: string; profile_id: string; date: string }[];
  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    date: row.date,
    exercises: getExercisesForSession(row.id),
  }));
}

export function getSession(id: string): Session | undefined {
  const row = selectSessionById.get(id) as { id: string; profile_id: string; date: string } | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    profileId: row.profile_id,
    date: row.date,
    exercises: getExercisesForSession(row.id),
  };
}

export const createSession = db.transaction(
  (profileId: string, date: string, exercises: ExerciseEntry[]): Session => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    insertSession.run(id, profileId, date);

    for (const ex of exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        insertSet.run(id, ex.name, i + 1, ex.sets[i].weight, ex.sets[i].reps);
      }
    }

    return { id, profileId, date, exercises };
  }
);

export function deleteSession(id: string): boolean {
  const result = deleteSessionStmt.run(id);
  return result.changes > 0;
}

// --- Helpers ---

function getExercisesForSession(sessionId: string): ExerciseEntry[] {
  const rows = selectExercisesForSession.all(sessionId) as {
    exercise: string;
    set_number: number;
    weight: number;
    reps: number;
  }[];

  // Group rows by exercise name, preserving order
  const map = new Map<string, ExerciseSet[]>();
  for (const row of rows) {
    if (!map.has(row.exercise)) {
      map.set(row.exercise, []);
    }
    map.get(row.exercise)!.push({ weight: row.weight, reps: row.reps });
  }

  return Array.from(map.entries()).map(([name, sets]) => ({ name, sets }));
}

export function closeDb(): void {
  db.close();
}
