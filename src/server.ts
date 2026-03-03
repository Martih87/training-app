import express from "express";
import path from "path";
import {
  getSessionsByProfile,
  getSession,
  createSession,
  deleteSession,
  getAllProfiles,
  getProfile,
  createProfile,
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

// --- Profile routes ---

// Get all profiles
app.get("/api/profiles", (_req, res) => {
  const profiles = getAllProfiles();
  res.json(profiles);
});

// Get a single profile
app.get("/api/profiles/:profileId", (req, res) => {
  const profile = getProfile(req.params.profileId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

// Create a new profile
app.post("/api/profiles", (req, res) => {
  const { name } = req.body as { name: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const profile = createProfile(name.trim());
    res.status(201).json(profile);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// --- Session routes (scoped to profile) ---

// Get all sessions for a profile
app.get("/api/profiles/:profileId/sessions", (req, res) => {
  const profile = getProfile(req.params.profileId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const sessions = getSessionsByProfile(req.params.profileId);
  res.json(sessions);
});

// Get a single session by ID
app.get("/api/profiles/:profileId/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session || session.profileId !== req.params.profileId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// Create a new session for a profile
app.post("/api/profiles/:profileId/sessions", (req, res) => {
  const profile = getProfile(req.params.profileId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { date, exercises } = req.body as { date: string; exercises: ExerciseEntry[] };

  if (!date || !exercises || !Array.isArray(exercises)) {
    res.status(400).json({ error: "date and exercises[] are required" });
    return;
  }

  const session = createSession(req.params.profileId, date, exercises);
  res.status(201).json(session);
});

// Delete a session
app.delete("/api/profiles/:profileId/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session || session.profileId !== req.params.profileId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  deleteSession(req.params.id);
  res.status(204).send();
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`🏋️  Training app running at http://localhost:${PORT}`);
});
