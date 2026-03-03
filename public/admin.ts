// ── Types ────────────────────────────────────────
interface ExerciseSet {
  weight: number;
  reps: number;
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

// ── DOM refs ─────────────────────────────────────
const statsRow = document.getElementById("stats-row") as HTMLDivElement;
const filterFrom = document.getElementById("filter-from") as HTMLInputElement;
const filterTo = document.getElementById("filter-to") as HTMLInputElement;
const filterExercise = document.getElementById("filter-exercise") as HTMLSelectElement;
const btnFilter = document.getElementById("btn-filter") as HTMLButtonElement;
const calendarDiv = document.getElementById("calendar-heatmap") as HTMLDivElement;
const volumeChart = document.getElementById("volume-chart") as HTMLDivElement;
const sessionListDiv = document.getElementById("session-list") as HTMLDivElement;

// ── State ────────────────────────────────────────
let allSessions: Session[] = [];
let filteredSessions: Session[] = [];
// ── Profile ──────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const profileId = params.get("profile");

if (!profileId) {
  window.location.href = "/";
}

// Update log link to pass profile
const logLink = document.getElementById("log-link") as HTMLAnchorElement;
if (logLink) {
  logLink.href = `/log.html?profile=${profileId}`;
}
// ── Init ─────────────────────────────────────────
async function init(): Promise<void> {
  const res = await fetch(`/api/profiles/${profileId}/sessions`);
  allSessions = await res.json();
  filteredSessions = allSessions;

  // Set default filter range
  if (allSessions.length > 0) {
    filterFrom.value = allSessions[allSessions.length - 1].date;
    filterTo.value = allSessions[0].date;
  }

  // Populate exercise filter dropdown
  const exerciseNames = new Set<string>();
  allSessions.forEach((s) => s.exercises.forEach((e) => exerciseNames.add(e.name)));
  Array.from(exerciseNames)
    .sort()
    .forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      filterExercise.appendChild(opt);
    });

  render();
}

btnFilter.addEventListener("click", () => {
  applyFilters();
  render();
});

function applyFilters(): void {
  const from = filterFrom.value;
  const to = filterTo.value;
  const exercise = filterExercise.value;

  filteredSessions = allSessions.filter((s) => {
    if (from && s.date < from) return false;
    if (to && s.date > to) return false;
    if (exercise && !s.exercises.some((e) => e.name === exercise)) return false;
    return true;
  });
}

// ── Render ───────────────────────────────────────
function render(): void {
  renderStats();
  renderCalendar();
  renderVolumeChart();
  renderSessionList();
}

// ── Stats ────────────────────────────────────────
function renderStats(): void {
  const totalSessions = filteredSessions.length;
  const totalSets = filteredSessions.reduce(
    (sum, s) => sum + s.exercises.reduce((es, e) => es + e.sets.length, 0),
    0
  );
  const totalVolume = filteredSessions.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (es, e) => es + e.sets.reduce((ss, st) => ss + st.weight * st.reps, 0),
        0
      ),
    0
  );
  const uniqueExercises = new Set<string>();
  filteredSessions.forEach((s) => s.exercises.forEach((e) => uniqueExercises.add(e.name)));

  statsRow.innerHTML = `
    <div class="stat-box"><div class="stat-value">${totalSessions}</div><div class="stat-label">Sessions</div></div>
    <div class="stat-box"><div class="stat-value">${totalSets}</div><div class="stat-label">Total Sets</div></div>
    <div class="stat-box"><div class="stat-value">${(totalVolume / 1000).toFixed(1)}t</div><div class="stat-label">Volume Lifted</div></div>
    <div class="stat-box"><div class="stat-value">${uniqueExercises.size}</div><div class="stat-label">Exercises</div></div>
  `;
}

// ── Calendar Heatmap ─────────────────────────────
function renderCalendar(): void {
  // Build a date→exercise-count map
  const dateCounts = new Map<string, number>();
  filteredSessions.forEach((s) => {
    dateCounts.set(s.date, (dateCounts.get(s.date) || 0) + s.exercises.length);
  });

  // Determine range
  const from = filterFrom.value || "2026-01-01";
  const to = filterTo.value || new Date().toISOString().slice(0, 10);

  const startDate = new Date(from);
  // Align to start of week (Monday)
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const endDate = new Date(to);

  calendarDiv.innerHTML = "";

  const current = new Date(startDate);
  let weekDiv: HTMLDivElement | null = null;

  while (current <= endDate) {
    const dow = current.getDay();
    // Monday = start of new week column
    if (dow === 1 || weekDiv === null) {
      weekDiv = document.createElement("div");
      weekDiv.className = "heatmap-week";
      calendarDiv.appendChild(weekDiv);

      // Pad the first column if it doesn't start on Monday
      if (dow !== 1) {
        const padDays = dow === 0 ? 6 : dow - 1;
        for (let p = 0; p < padDays; p++) {
          const pad = document.createElement("div");
          pad.className = "heatmap-cell level-0";
          weekDiv.appendChild(pad);
        }
      }
    }

    const dateStr = current.toISOString().slice(0, 10);
    const count = dateCounts.get(dateStr) || 0;
    const level = count === 0 ? 0 : count <= 4 ? 1 : count <= 5 ? 2 : count <= 6 ? 3 : 4;

    const cell = document.createElement("div");
    cell.className = `heatmap-cell level-${level}`;
    cell.dataset.tooltip = `${dateStr}: ${count} exercises`;
    weekDiv!.appendChild(cell);

    current.setDate(current.getDate() + 1);
  }
}

// ── Volume Chart ─────────────────────────────────
function renderVolumeChart(): void {
  // Aggregate total volume per exercise
  const volumeMap = new Map<string, number>();
  filteredSessions.forEach((s) => {
    s.exercises.forEach((e) => {
      const vol = e.sets.reduce((sum, st) => sum + st.weight * st.reps, 0);
      volumeMap.set(e.name, (volumeMap.get(e.name) || 0) + vol);
    });
  });

  const sorted = Array.from(volumeMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxVol = sorted.length > 0 ? sorted[0][1] : 1;

  volumeChart.innerHTML = sorted
    .map(([name, vol]) => {
      const pct = (vol / maxVol) * 100;
      const display = vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${vol}kg`;
      return `
        <div class="vol-row">
          <div class="vol-name">${name}</div>
          <div class="vol-bar-bg">
            <div class="vol-bar" style="width:${pct}%"></div>
            <span class="vol-value">${display}</span>
          </div>
        </div>`;
    })
    .join("");
}

// ── Session List ─────────────────────────────────
function renderSessionList(): void {
  if (filteredSessions.length === 0) {
    sessionListDiv.innerHTML = `<div class="empty-state">No sessions found for this range.</div>`;
    return;
  }

  sessionListDiv.innerHTML = filteredSessions
    .map((s) => {
      const dateStr = new Date(s.date).toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const exerciseNames = s.exercises.map((e) => e.name).join(", ");
      const totalSets = s.exercises.reduce((sum, e) => sum + e.sets.length, 0);

      const detailHtml = s.exercises
        .map((ex) => {
          const setsStr = ex.sets.map((st) => `${st.weight}kg × ${st.reps}`).join(", ");
          return `<div class="exercise-summary"><strong>${ex.name}</strong>: ${setsStr}</div>`;
        })
        .join("");

      return `
        <div class="session-item" onclick="this.querySelector('.session-detail').classList.toggle('open')">
          <div class="si-header">
            <span class="si-date">${dateStr}</span>
            <span class="si-count">${totalSets} sets</span>
          </div>
          <div class="si-exercises">${exerciseNames}</div>
          <div class="session-detail">
            ${detailHtml}
            <button class="btn btn-danger" style="margin-top:0.5rem" onclick="event.stopPropagation(); deleteSession('${s.id}')">Delete</button>
          </div>
        </div>`;
    })
    .join("");
}

async function deleteSession(id: string): Promise<void> {
  if (!confirm("Delete this session?")) return;
  const res = await fetch(`/api/profiles/${profileId}/sessions/${id}`, { method: "DELETE" });
  if (res.ok) {
    allSessions = allSessions.filter((s) => s.id !== id);
    applyFilters();
    render();
  }
}

// Make available globally for onclick
(window as any).deleteSession = deleteSession;

// ── Boot ─────────────────────────────────────────
init();
