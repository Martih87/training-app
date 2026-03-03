/**
 * Seed script: generates 6 workouts/week from Jan 1 2026 to today.
 * Each session includes all 4 core exercises + 1-3 random optional ones.
 * Adds small weight variation to keep data realistic.
 *
 * Usage:  npx ts-node src/seed.ts
 *         (or: node dist/seed.js  after build)
 */

import { createSession, getSessionsByProfile, ExerciseEntry } from "./db";

// --- Presets (same as server.ts) ---

interface Preset {
  name: string;
  sets: { weight: number; reps: number }[];
}

const core: Preset[] = [
  { name: "Benchpress",     sets: [{ weight: 60, reps: 12 }, { weight: 65, reps: 12 }, { weight: 70, reps: 12 }] },
  { name: "Bicep Curls",    sets: [{ weight: 32, reps: 10 }, { weight: 32, reps: 10 }, { weight: 32, reps: 10 }] },
  { name: "Lateral Raises", sets: [{ weight: 10, reps: 12 }, { weight: 10, reps: 12 }, { weight: 10, reps: 12 }] },
  { name: "Ab Crunches",    sets: [{ weight: 0,  reps: 15 }, { weight: 0,  reps: 15 }, { weight: 0,  reps: 15 }] },
];

const optional: Preset[] = [
  { name: "Leg Extension",  sets: [{ weight: 50, reps: 15 }, { weight: 50, reps: 15 }, { weight: 50, reps: 15 }] },
  { name: "Incline Bench",  sets: [{ weight: 48, reps: 10 }, { weight: 48, reps: 10 }, { weight: 48, reps: 10 }] },
  { name: "Overhead Press",  sets: [{ weight: 40, reps: 10 }, { weight: 40, reps: 10 }, { weight: 40, reps: 10 }] },
  { name: "Deadlift",       sets: [{ weight: 48, reps: 10 }, { weight: 48, reps: 10 }, { weight: 48, reps: 10 }] },
];

// --- Helpers ---

/** Small random weight jitter: ±2.5 kg in 2.5 kg increments */
function jitter(base: number): number {
  if (base === 0) return 0; // bodyweight stays 0
  const delta = (Math.floor(Math.random() * 3) - 1) * 2.5; // -2.5, 0, or +2.5
  return Math.max(0, base + delta);
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildExercises(): ExerciseEntry[] {
  const exercises: ExerciseEntry[] = [];

  // All 4 core exercises every session
  for (const p of core) {
    exercises.push({
      name: p.name,
      sets: p.sets.map((s) => ({ weight: jitter(s.weight), reps: s.reps })),
    });
  }

  // 1-3 random optional exercises
  const optCount = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
  const picked = pickRandom(optional, optCount);
  for (const p of picked) {
    exercises.push({
      name: p.name,
      sets: p.sets.map((s) => ({ weight: jitter(s.weight), reps: s.reps })),
    });
  }

  return exercises;
}

// --- Generate dates: 6 days/week from Jan 1 to today ---

function generateWorkoutDates(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);

  let weekDay = 0; // count within the week (0-6)

  while (current <= end) {
    const dow = current.getDay(); // 0=Sun, 6=Sat

    // Rest day = Sunday (take 1 day off per week)
    if (dow !== 0) {
      dates.push(current.toISOString().slice(0, 10));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// --- Main ---

function main(): void {
  const profileId = "martin";
  const existing = getSessionsByProfile(profileId);
  if (existing.length > 1) {
    console.log(`⚠️  Database already has ${existing.length} sessions for Martin. Skipping seed.`);
    console.log("   Delete data/training.db first if you want to re-seed.");
    return;
  }

  const start = new Date("2026-01-01");
  const end = new Date("2026-03-02");
  const dates = generateWorkoutDates(start, end);

  console.log(`🌱 Seeding ${dates.length} workout sessions for Martin (Jan 1 → Mar 2)...`);

  for (const date of dates) {
    const exercises = buildExercises();
    createSession(profileId, date, exercises);
  }

  const total = getSessionsByProfile(profileId).length;
  console.log(`✅ Done! ${total} sessions in the database for Martin.`);
}

main();
