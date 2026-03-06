import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import {
  getSessionsByProfile,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getAllProfiles,
  getProfile,
  createProfile,
  upsertGoogleProfile,
  getUserExercises,
  addUserExercise,
  removeUserExercise,
  getExerciseSuggestions,
  exportUserData,
  ExerciseEntry,
  Profile,
} from "./db";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// --- Config ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex");

if (!GOOGLE_CLIENT_ID) {
  console.warn("⚠️  GOOGLE_CLIENT_ID not set — Google Sign-In will not work.");
  console.warn("   Set it via: GOOGLE_CLIENT_ID=your-id npm run dev");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Auth helpers ---

interface SessionPayload {
  profileId: string;
}

function createSessionToken(profileId: string): string {
  const payload = JSON.stringify({ profileId });
  const hmac = crypto.createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64url") + "." + hmac;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  try {
    const payload = Buffer.from(b64, "base64url").toString();
    const expected = crypto.createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(payload) as SessionPayload;
  } catch {
    return null;
  }
}

function getAuthProfile(req: Request): Profile | undefined {
  const token = req.cookies?.session;
  if (!token) return undefined;
  const payload = verifySessionToken(token);
  if (!payload) return undefined;
  return getProfile(payload.profileId);
}

// Auth middleware — attaches profile to req or returns 401
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const profile = getAuthProfile(req);
  if (!profile) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as any).profile = profile;
  next();
}

// --- Auth routes ---

// Return the Google Client ID to the frontend
app.get("/api/auth/config", (_req, res) => {
  res.json({ clientId: GOOGLE_CLIENT_ID });
});

// Google Sign-In callback
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body as { credential: string };
  if (!credential) {
    res.status(400).json({ error: "credential is required" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const profile = upsertGoogleProfile(
      payload.sub,
      payload.name || "Unknown",
      payload.email || "",
      payload.picture || ""
    );

    const token = createSessionToken(profile.id);
    res.cookie("session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });

    res.json(profile);
  } catch (err: any) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ error: "Authentication failed" });
  }
});

// Get current user
app.get("/api/auth/me", (req, res) => {
  const profile = getAuthProfile(req);
  if (!profile) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(profile);
});

// Sign out
app.post("/api/auth/signout", (_req, res) => {
  res.clearCookie("session", { path: "/" });
  res.json({ ok: true });
});

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
      { weight: 20, reps: 12 },
      { weight: 20, reps: 12 },
      { weight: 20, reps: 12 },
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
  {
    name: "Landmine Barbell Rows",
    sets: [
      { weight: 30, reps: 10 },
      { weight: 30, reps: 10 },
      { weight: 30, reps: 10 },
    ],
  },
];

// Get exercise presets
app.get("/api/exercises", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const userExercises = getUserExercises(profile.id);

  // Convert user exercises to preset format
  const userPresets: ExercisePreset[] = userExercises.map((ue) => ({
    name: ue.name,
    sets: Array.from({ length: ue.defaultSets }, () => ({
      weight: ue.defaultWeight,
      reps: ue.defaultReps,
    })),
  }));

  res.json({ core: coreExercises, optional: optionalExercises, user: userPresets });
});

// --- User Exercise routes (auth-protected) ---

app.get("/api/user-exercises", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  res.json(getUserExercises(profile.id));
});

app.post("/api/user-exercises", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const { name, defaultWeight, defaultReps, defaultSets } = req.body as {
    name: string;
    defaultWeight?: number;
    defaultReps?: number;
    defaultSets?: number;
  };
  if (!name || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const exercise = addUserExercise(
    profile.id,
    name.trim(),
    defaultWeight ?? 0,
    defaultReps ?? 10,
    defaultSets ?? 3
  );
  res.status(201).json(exercise);
});

app.delete("/api/user-exercises/:id", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const deleted = removeUserExercise(id, profile.id);
  if (!deleted) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }
  res.status(204).send();
});

// --- Exercise Suggestions ---

app.get("/api/suggestions", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  res.json(getExerciseSuggestions(profile.id));
});

// --- Profile routes ---

// Get all profiles (public — for landing page)
app.get("/api/profiles", (_req, res) => {
  const profiles = getAllProfiles();
  res.json(profiles);
});

// --- Session routes (auth-protected, scoped to signed-in profile) ---

// Get all sessions for the signed-in user
app.get("/api/sessions", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const sessions = getSessionsByProfile(profile.id);
  res.json(sessions);
});

// Get a single session by ID
app.get("/api/sessions/:id", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const id = req.params.id as string;
  const session = getSession(id);
  if (!session || session.profileId !== profile.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// Create a new session
app.post("/api/sessions", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const { date, exercises } = req.body as { date: string; exercises: ExerciseEntry[] };

  if (!date || !exercises || !Array.isArray(exercises)) {
    res.status(400).json({ error: "date and exercises[] are required" });
    return;
  }

  const session = createSession(profile.id, date, exercises);
  res.status(201).json(session);
});

// Update a session
app.put("/api/sessions/:id", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const id = req.params.id as string;
  const existing = getSession(id);
  if (!existing || existing.profileId !== profile.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const { date, exercises } = req.body as { date: string; exercises: ExerciseEntry[] };
  if (!date || !exercises || !Array.isArray(exercises)) {
    res.status(400).json({ error: "date and exercises[] are required" });
    return;
  }
  const updated = updateSession(id, date, exercises);
  res.json(updated);
});

// Delete a session
app.delete("/api/sessions/:id", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const id = req.params.id as string;
  const session = getSession(id);
  if (!session || session.profileId !== profile.id) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  deleteSession(id);
  res.status(204).send();
});

// --- Export ---

app.get("/api/export", requireAuth, (req, res) => {
  const profile = (req as any).profile as Profile;
  const format = (req.query.format as string) || "json";
  const data = exportUserData(profile.id);

  if (format === "csv") {
    const lines = ["date,exercise,set,weight_kg,reps"];
    for (const session of data.sessions) {
      for (const ex of session.exercises) {
        for (let i = 0; i < ex.sets.length; i++) {
          lines.push(
            `${session.date},"${ex.name.replace(/"/g, '""')}",${i + 1},${ex.sets[i].weight},${ex.sets[i].reps}`
          );
        }
      }
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="lightweights-export.csv"`);
    res.send(lines.join("\n"));
  } else {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="lightweights-export.json"`);
    res.json(data);
  }
});

// --- Start ---

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 LightWeight! running at http://0.0.0.0:${PORT}`);
});
