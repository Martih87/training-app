import express from "express";
import path from "path";
import {
  getAllSessions,
  getSession,
  createSession,
  deleteSession,
  ExerciseEntry,
} from "./db";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Types ---

interface ExerciseSet {
  weight: number;
  reps: number;
}

interface ExercisePreset {
  name: string;
  sets: ExerciseSet[];
}

const coreExercises: ExercisePreset[] = [
  {
    name: "Benchpress",
    sets: [
      { weight: 60, reps: 12 },
      { weight: 65, reps: 12 },
      { weight: 70, reps: 12 },
    ],
  },
  {
    name: "Bicep Curls",
    sets: [
      { weight: 32, reps: 10 },
      { weight: 32, reps: 10 },
      { weight: 32, reps: 10 },
    ],
  },
  {
    name: "Lateral Raises",
    sets: [
      { weight: 10, reps: 12 },
      { weight: 10, reps: 12 },
      { weight: 10, reps: 12 },
    ],
  },
  {
    name: "Ab Crunches",
    sets: [
      { weight: 0, reps: 15 },
      { weight: 0, reps: 15 },
      { weight: 0, reps: 15 },
    ],
  },
];

const optionalExercises: ExercisePreset[] = [
  {
    name: "Leg Extension",
    sets: [
      { weight: 50, reps: 15 },
      { weight: 50, reps: 15 },
      { weight: 50, reps: 15 },
    ],
  },
  {
    name: "Incline Bench",
    sets: [
      { weight: 48, reps: 10 },
      { weight: 48, reps: 10 },
      { weight: 48, reps: 10 },
    ],
  },
  {
    name: "Overhead Press",
    sets: [
      { weight: 40, reps: 10 },
      { weight: 40, reps: 10 },
      { weight: 40, reps: 10 },
    ],
  },
  {
    name: "Deadlift",
    sets: [
      { weight: 48, reps: 10 },
      { weight: 48, reps: 10 },
      { weight: 48, reps: 10 },
    ],
  },
];

// Get exercise presets
app.get("/api/exercises", (_req, res) => {
  res.json({ core: coreExercises, optional: optionalExercises });
});

// Get all sessions (most recent first)
app.get("/api/sessions", (_req, res) => {
  const sessions = getAllSessions();
  res.json(sessions);
});

// Get a single session by ID
app.get("/api/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// Create a new session
app.post("/api/sessions", (req, res) => {
  const { date, exercises } = req.body as { date: string; exercises: ExerciseEntry[] };

  if (!date || !exercises || !Array.isArray(exercises)) {
    res.status(400).json({ error: "date and exercises[] are required" });
    return;
  }

  const session = createSession(date, exercises);
  res.status(201).json(session);
});

// Delete a session
app.delete("/api/sessions/:id", (req, res) => {
  const deleted = deleteSession(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.status(204).send();
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`🏋️  Training app running at http://localhost:${PORT}`);
});
