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
  date: string;
  exercises: ExerciseEntry[];
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
  CREATE TABLE IF NOT EXISTS sessions (
    id   TEXT PRIMARY KEY,
    date TEXT NOT NULL
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
`);

// --- Prepared statements ---

const insertSession = db.prepare(
  `INSERT INTO sessions (id, date) VALUES (?, ?)`
);

const insertSet = db.prepare(
  `INSERT INTO session_exercises (session_id, exercise, set_number, weight, reps)
   VALUES (?, ?, ?, ?, ?)`
);

const selectAllSessions = db.prepare(
  `SELECT id, date FROM sessions ORDER BY date DESC`
);

const selectSessionById = db.prepare(
  `SELECT id, date FROM sessions WHERE id = ?`
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

// --- Public API ---

export function getAllSessions(): Session[] {
  const rows = selectAllSessions.all() as { id: string; date: string }[];
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    exercises: getExercisesForSession(row.id),
  }));
}

export function getSession(id: string): Session | undefined {
  const row = selectSessionById.get(id) as { id: string; date: string } | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    date: row.date,
    exercises: getExercisesForSession(row.id),
  };
}

export const createSession = db.transaction(
  (date: string, exercises: ExerciseEntry[]): Session => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    insertSession.run(id, date);

    for (const ex of exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        insertSet.run(id, ex.name, i + 1, ex.sets[i].weight, ex.sets[i].reps);
      }
    }

    return { id, date, exercises };
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
