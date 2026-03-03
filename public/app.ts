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

// ── Profile ──────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const profileId = params.get("profile");

if (!profileId) {
  window.location.href = "/";
}

// Update admin link to pass profile
const historyLink = document.getElementById("history-link") as HTMLAnchorElement;
if (historyLink) {
  historyLink.href = `/admin.html?profile=${profileId}`;
}

// ── DOM refs ─────────────────────────────────────
const sessionDateInput = document.getElementById("session-date") as HTMLInputElement;
const exerciseListDiv = document.getElementById("exercise-list") as HTMLDivElement;
const optionalListDiv = document.getElementById("optional-exercise-list") as HTMLDivElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const historyListDiv = document.getElementById("history-list") as HTMLDivElement;

// ── Init ─────────────────────────────────────────
async function init(): Promise<void> {
  // Set today as default date
  sessionDateInput.value = new Date().toISOString().slice(0, 10);

  // Fetch exercise presets
  const res = await fetch("/api/exercises");
  const data = await res.json();
  corePresets = data.core;
  optionalPresets = data.optional;

  // Pre-populate core exercises (checked by default)
  corePresets.forEach((preset) => addExerciseBlock(preset, exerciseListDiv, true));

  // Pre-populate optional exercises (unchecked by default)
  optionalPresets.forEach((preset) => addExerciseBlock(preset, optionalListDiv, false));

  // Load history
  await loadHistory();
}

// ── Exercise Block Builder ───────────────────────
function addExerciseBlock(preset: ExercisePreset, container: HTMLDivElement, checked: boolean): void {
  const block = document.createElement("div");
  block.className = "exercise-block";
  block.dataset.exercise = preset.name;

  const checkedAttr = checked ? "checked" : "";

  const setsHtml = preset.sets
    .map((s, i) => {
      return `
        <tr>
          <td>${i + 1}</td>
          <td><input type="number" class="input-weight" min="0" step="0.5" value="${s.weight}" /></td>
          <td class="set-reps">${s.reps} reps</td>
          <td>
            <label class="check-container">
              <input type="checkbox" class="set-done" ${checkedAttr} />
              <span class="checkmark"></span>
            </label>
          </td>
        </tr>`;
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
    <table class="sets-table">
      <thead>
        <tr><th>#</th><th>Weight</th><th>Reps</th><th>Done</th></tr>
      </thead>
      <tbody>${setsHtml}</tbody>
    </table>
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

  container.appendChild(block);
}

// ── Save Session ─────────────────────────────────
btnSave.addEventListener("click", async () => {
  const date = sessionDateInput.value;
  if (!date) {
    showToast("Pick a date first!", "#e74c3c");
    return;
  }

  const coreBlocks = exerciseListDiv.querySelectorAll(".exercise-block");
  const optBlocks = optionalListDiv.querySelectorAll(".exercise-block");
  const allBlocks = [...Array.from(coreBlocks), ...Array.from(optBlocks)];

  const exercises: ExerciseEntry[] = [];

  allBlocks.forEach((block) => {
    const name = (block as HTMLElement).dataset.exercise || "Unknown";
    const allPresets = [...corePresets, ...optionalPresets];
    const preset = allPresets.find((p) => p.name === name);
    if (!preset) return;

    const sets: ExerciseSet[] = [];
    block.querySelectorAll("tbody tr").forEach((row, i) => {
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

  const res = await fetch(`/api/profiles/${profileId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, exercises }),
  });

  if (res.ok) {
    showToast("Session saved! 💪");
    resetForm();
    await loadHistory();
  } else {
    showToast("Failed to save session", "#e74c3c");
  }
});

// Exercises are fixed presets — no add button needed

// ── History ──────────────────────────────────────
async function loadHistory(): Promise<void> {
  const res = await fetch(`/api/profiles/${profileId}/sessions`);
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
            <button class="btn btn-danger" onclick="deleteSession('${s.id}')">Delete</button>
          </div>
          ${exercisesHtml}
        </div>
      `;
    })
    .join("");
}

async function deleteSession(id: string): Promise<void> {
  if (!confirm("Delete this session?")) return;

  const res = await fetch(`/api/profiles/${profileId}/sessions/${id}`, { method: "DELETE" });
  if (res.ok) {
    showToast("Session deleted");
    await loadHistory();
  }
}

// Make deleteSession available globally for inline onclick
(window as any).deleteSession = deleteSession;

// ── Helpers ──────────────────────────────────────
function resetForm(): void {
  sessionDateInput.value = new Date().toISOString().slice(0, 10);
  exerciseListDiv.innerHTML = "";
  optionalListDiv.innerHTML = "";
  corePresets.forEach((preset) => addExerciseBlock(preset, exerciseListDiv, true));
  optionalPresets.forEach((preset) => addExerciseBlock(preset, optionalListDiv, false));
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
