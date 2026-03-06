// ── Types ────────────────────────────────────────
interface ExerciseSet {
  weight: number;
  reps: number;
}

interface ExercisePreset {
  name: string;
  sets: ExerciseSet[];
}

interface ExerciseEntry {
  name: string;
  sets: ExerciseSet[];
}

interface Session {
  id: string;
  date: string;
  exercises: ExerciseEntry[];
}

// ── State ────────────────────────────────────────
let corePresets: ExercisePreset[] = [];
let optionalPresets: ExercisePreset[] = [];
let userPresets: ExercisePreset[] = [];
let editingSessionId: string | null = null;

// ── DOM refs ─────────────────────────────────────
const sessionDateInput = document.getElementById("session-date") as HTMLInputElement;
const exerciseListDiv = document.getElementById("exercise-list") as HTMLDivElement;
const optionalListDiv = document.getElementById("optional-exercise-list") as HTMLDivElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const historyListDiv = document.getElementById("history-list") as HTMLDivElement;
const userExerciseListDiv = document.getElementById("user-exercise-list") as HTMLDivElement;
const addExerciseNameInput = document.getElementById("add-exercise-name") as HTMLInputElement;
const addExerciseWeightInput = document.getElementById("add-exercise-weight") as HTMLInputElement;
const addExerciseRepsInput = document.getElementById("add-exercise-reps") as HTMLInputElement;
const addExerciseSetsInput = document.getElementById("add-exercise-sets") as HTMLInputElement;
const btnAddExercise = document.getElementById("btn-add-exercise") as HTMLButtonElement;
const suggestionsDiv = document.getElementById("suggestions-list") as HTMLDivElement;

// ── Init ─────────────────────────────────────────
async function init(): Promise<void> {
  // Check auth — redirect to sign-in if not authenticated
  try {
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      window.location.replace("/");
      return;
    }
    const profile = await authRes.json();

    // Show profile name in header
    const userInfo = document.getElementById("user-info");
    if (userInfo) {
      userInfo.textContent = profile.name;
    }
  } catch {
    window.location.replace("/");
    return;
  }

  // Set today as default date
  sessionDateInput.value = new Date().toISOString().slice(0, 10);

  // Fetch exercise presets
  const res = await fetch("/api/exercises");
  const data = await res.json();
  corePresets = data.core;
  optionalPresets = data.optional;
  userPresets = data.user || [];

  // Pre-populate core exercises (checked by default)
  corePresets.forEach((preset) => addExerciseBlock(preset, exerciseListDiv, true));

  // Pre-populate optional exercises (unchecked by default)
  optionalPresets.forEach((preset) => addExerciseBlock(preset, optionalListDiv, false));

  // Pre-populate user exercises (unchecked by default)
  userPresets.forEach((preset) => addExerciseBlock(preset, userExerciseListDiv, false));

  // Load suggestions
  await loadSuggestions();

  // Load history
  await loadHistory();

  // Check for edit query param (coming from admin page)
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");
  if (editId) {
    await editSession(editId);
    window.history.replaceState({}, "", "/log.html");
  }
}

// ── Exercise Block Builder (touch-optimised) ─────
function addExerciseBlock(preset: ExercisePreset, container: HTMLDivElement, checked: boolean): void {
  const block = document.createElement("div");
  block.className = "exercise-block";
  block.dataset.exercise = preset.name;

  const checkedAttr = checked ? "checked" : "";

  const setsHtml = preset.sets
    .map((s, i) => {
      return `
        <div class="set-row">
          <span class="set-num">${i + 1}</span>
          <div class="stepper">
            <button type="button" class="stepper-btn minus" data-step="-2.5">−</button>
            <input type="number" class="input-weight" min="0" step="2.5" value="${s.weight}" inputmode="decimal" />
            <button type="button" class="stepper-btn plus" data-step="2.5">+</button>
          </div>
          <span class="stepper-unit">kg</span>
          <span class="reps-badge">${s.reps} reps</span>
          <label class="check-container">
            <input type="checkbox" class="set-done" ${checkedAttr} />
            <span class="checkmark"></span>
          </label>
        </div>`;
    })
    .join("");

  block.innerHTML = `
    <div class="exercise-header">
      <span class="exercise-name">${preset.name}</span>
      <label class="check-all-container">
        <input type="checkbox" class="check-all" ${checkedAttr} />
        <span class="check-all-label">All</span>
      </label>
    </div>
    <div class="sets-list">${setsHtml}</div>
  `;

  // Wire up "check all" toggle
  const checkAll = block.querySelector(".check-all") as HTMLInputElement;
  const setCheckboxes = () => block.querySelectorAll(".set-done") as NodeListOf<HTMLInputElement>;

  checkAll.addEventListener("change", () => {
    setCheckboxes().forEach((cb) => (cb.checked = checkAll.checked));
  });

  // Keep "check all" in sync when individual sets are toggled
  block.addEventListener("change", (e) => {
    if ((e.target as HTMLElement).classList.contains("set-done")) {
      const all = setCheckboxes();
      checkAll.checked = Array.from(all).every((cb) => cb.checked);
    }
  });

  // Wire up stepper buttons
  block.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const step = parseFloat((btn as HTMLElement).dataset.step || "0");
      const input = (btn as HTMLElement).closest(".stepper")!.querySelector("input") as HTMLInputElement;
      const current = parseFloat(input.value) || 0;
      const next = Math.max(0, current + step);
      input.value = next % 1 === 0 ? next.toString() : next.toFixed(1);
    });
  });

  container.appendChild(block);
}

// ── Save / Update Session ────────────────────────
btnSave.addEventListener("click", async () => {
  const date = sessionDateInput.value;
  if (!date) {
    showToast("Pick a date first!", "#e74c3c");
    return;
  }

  const coreBlocks = exerciseListDiv.querySelectorAll(".exercise-block");
  const optBlocks = optionalListDiv.querySelectorAll(".exercise-block");
  const userBlocks = userExerciseListDiv.querySelectorAll(".exercise-block");
  const allBlocks = [...Array.from(coreBlocks), ...Array.from(optBlocks), ...Array.from(userBlocks)];

  const exercises: ExerciseEntry[] = [];

  allBlocks.forEach((block) => {
    const name = (block as HTMLElement).dataset.exercise || "Unknown";
    const allPresets = [...corePresets, ...optionalPresets, ...userPresets];
    const preset = allPresets.find((p) => p.name === name);
    if (!preset) return;

    const sets: ExerciseSet[] = [];
    block.querySelectorAll(".set-row").forEach((row, i) => {
      const checked = (row.querySelector(".set-done") as HTMLInputElement).checked;
      if (checked && preset.sets[i]) {
        const weight = parseFloat((row.querySelector(".input-weight") as HTMLInputElement).value) || 0;
        sets.push({ weight, reps: preset.sets[i].reps });
      }
    });

    if (sets.length > 0) {
      exercises.push({ name, sets });
    }
  });

  if (exercises.length === 0) {
    showToast("Check at least one set!", "#e74c3c");
    return;
  }

  let res: Response;
  if (editingSessionId) {
    res = await fetch(`/api/sessions/${editingSessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, exercises }),
    });
  } else {
    res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, exercises }),
    });
  }

  if (res.ok) {
    showToast(editingSessionId ? "Session updated! ✅" : "Session saved! 💪");
    editingSessionId = null;
    btnSave.textContent = "Save Session";
    resetForm();
    await loadHistory();
  } else {
    showToast("Failed to save session", "#e74c3c");
  }
});

// ── History ──────────────────────────────────────
async function loadHistory(): Promise<void> {
  const res = await fetch("/api/sessions");
  const sessions: Session[] = await res.json();

  if (sessions.length === 0) {
    historyListDiv.innerHTML = `<div class="empty-state">No sessions logged yet. Get to work! 💪</div>`;
    return;
  }

  historyListDiv.innerHTML = sessions
    .map((s) => {
      const dateStr = new Date(s.date).toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const exercisesHtml = s.exercises
        .map((ex) => {
          const setsStr = ex.sets.map((st) => `${st.weight}kg × ${st.reps}`).join(", ");
          return `<div class="exercise-summary"><strong>${ex.name}</strong>: ${setsStr}</div>`;
        })
        .join("");

      return `
        <div class="history-session">
          <div class="session-header">
            <span class="session-date">${dateStr}</span>
            <div>
              <button class="btn btn-secondary btn-sm" onclick="editSession('${s.id}')">Edit</button>
              <button class="btn btn-danger" onclick="deleteSession('${s.id}')">Delete</button>
            </div>
          </div>
          ${exercisesHtml}
        </div>
      `;
    })
    .join("");
}

async function deleteSession(id: string): Promise<void> {
  if (!confirm("Delete this session?")) return;

  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  if (res.ok) {
    showToast("Session deleted");
    await loadHistory();
  }
}

// Make deleteSession available globally for inline onclick
(window as any).deleteSession = deleteSession;

// ── Edit Session ─────────────────────────────────
async function editSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) {
    showToast("Failed to load session", "#e74c3c");
    return;
  }
  const session: Session = await res.json();

  editingSessionId = session.id;
  sessionDateInput.value = session.date;
  btnSave.textContent = "Update Session";

  // Reset all exercise blocks
  exerciseListDiv.innerHTML = "";
  optionalListDiv.innerHTML = "";
  userExerciseListDiv.innerHTML = "";

  // Re-add core exercises
  corePresets.forEach((preset) => {
    const sessionEx = session.exercises.find((e) => e.name === preset.name);
    if (sessionEx) {
      const editPreset = { name: preset.name, sets: sessionEx.sets.map((s) => ({ weight: s.weight, reps: s.reps })) };
      addExerciseBlock(editPreset, exerciseListDiv, true);
    } else {
      addExerciseBlock(preset, exerciseListDiv, false);
    }
  });

  // Re-add optional exercises
  optionalPresets.forEach((preset) => {
    const sessionEx = session.exercises.find((e) => e.name === preset.name);
    if (sessionEx) {
      const editPreset = { name: preset.name, sets: sessionEx.sets.map((s) => ({ weight: s.weight, reps: s.reps })) };
      addExerciseBlock(editPreset, optionalListDiv, true);
    } else {
      addExerciseBlock(preset, optionalListDiv, false);
    }
  });

  // Re-add user exercises
  userPresets.forEach((preset) => {
    const sessionEx = session.exercises.find((e) => e.name === preset.name);
    if (sessionEx) {
      const editPreset = { name: preset.name, sets: sessionEx.sets.map((s) => ({ weight: s.weight, reps: s.reps })) };
      addExerciseBlock(editPreset, userExerciseListDiv, true);
    } else {
      addExerciseBlock(preset, userExerciseListDiv, false);
    }
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("Editing session — make changes and click Update");
}
(window as any).editSession = editSession;

// ── Add User Exercise ────────────────────────────
btnAddExercise.addEventListener("click", async () => {
  const name = addExerciseNameInput.value.trim();
  if (!name) {
    showToast("Enter an exercise name", "#e74c3c");
    return;
  }

  const defaultWeight = parseFloat(addExerciseWeightInput.value) || 0;
  const defaultReps = parseInt(addExerciseRepsInput.value, 10) || 10;
  const defaultSets = parseInt(addExerciseSetsInput.value, 10) || 3;

  const res = await fetch("/api/user-exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, defaultWeight, defaultReps, defaultSets }),
  });

  if (res.ok) {
    showToast(`Added "${name}"! 💪`);
    addExerciseNameInput.value = "";

    // Refresh user presets and re-render
    const exRes = await fetch("/api/exercises");
    const data = await exRes.json();
    userPresets = data.user || [];
    userExerciseListDiv.innerHTML = "";
    userPresets.forEach((preset) => addExerciseBlock(preset, userExerciseListDiv, false));
  } else {
    showToast("Failed to add exercise", "#e74c3c");
  }
});

// ── Suggestions ──────────────────────────────────
async function loadSuggestions(): Promise<void> {
  if (!suggestionsDiv) return;
  const res = await fetch("/api/suggestions");
  if (!res.ok) return;
  const suggestions: { name: string; userCount: number; totalUses: number }[] = await res.json();

  if (suggestions.length === 0) {
    suggestionsDiv.innerHTML = `<span class="empty-state">No suggestions yet — be the trendsetter!</span>`;
    return;
  }

  suggestionsDiv.innerHTML = suggestions
    .map(
      (s) =>
        `<button class="suggestion-chip" onclick="addSuggestion('${s.name.replace(/'/g, "\\'")}')">` +
        `${s.name} <span class="suggestion-meta">${s.userCount} user${s.userCount > 1 ? "s" : ""}</span></button>`
    )
    .join("");
}

async function addSuggestion(name: string): Promise<void> {
  addExerciseNameInput.value = name;
  addExerciseNameInput.focus();
  showToast(`"${name}" — set defaults and click Add`);
}
(window as any).addSuggestion = addSuggestion;

// ── Sign out ─────────────────────────────────────
async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
  window.location.href = "/";
}
(window as any).signOut = signOut;

// ── Helpers ──────────────────────────────────────
function resetForm(): void {
  editingSessionId = null;
  btnSave.textContent = "Save Session";
  sessionDateInput.value = new Date().toISOString().slice(0, 10);
  exerciseListDiv.innerHTML = "";
  optionalListDiv.innerHTML = "";
  userExerciseListDiv.innerHTML = "";
  corePresets.forEach((preset) => addExerciseBlock(preset, exerciseListDiv, true));
  optionalPresets.forEach((preset) => addExerciseBlock(preset, optionalListDiv, false));
  userPresets.forEach((preset) => addExerciseBlock(preset, userExerciseListDiv, false));
}

function showToast(message: string, bg: string = "#2ecc71"): void {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.background = bg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── Boot ─────────────────────────────────────────
init();
