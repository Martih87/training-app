"use strict";
// ── State ────────────────────────────────────────
let weekOffset = 0;
// ── Init ─────────────────────────────────────────
async function init() {
    try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
            window.location.replace("/");
            return;
        }
        const profile = await authRes.json();
        const userInfo = document.getElementById("user-info");
        if (userInfo) {
            userInfo.textContent = profile.name;
        }
        // Wire up week navigation
        document.getElementById("btn-prev-week").addEventListener("click", () => {
            weekOffset--;
            loadWeek();
        });
        document.getElementById("btn-next-week").addEventListener("click", () => {
            if (weekOffset < 0) {
                weekOffset++;
                loadWeek();
            }
        });
        await loadWeek();
    }
    catch {
        window.location.replace("/");
    }
}
async function loadWeek() {
    // Disable "Next" if at current week
    const nextBtn = document.getElementById("btn-next-week");
    nextBtn.disabled = weekOffset >= 0;
    // Update title
    const title = document.getElementById("week-title");
    if (weekOffset === 0)
        title.textContent = "This Week";
    else if (weekOffset === -1)
        title.textContent = "Last Week";
    else
        title.textContent = `${Math.abs(weekOffset)} Weeks Ago`;
    const res = await fetch(`/api/recommendations?week=${weekOffset}`);
    if (!res.ok)
        return;
    const data = await res.json();
    render(data);
}
// ── Render ───────────────────────────────────────
function render(data) {
    // Week range
    const weekRange = document.getElementById("week-range");
    const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    weekRange.textContent = `${fmtDate(data.weekStart)} — ${fmtDate(data.weekEnd)}`;
    // Muscle group bars
    const list = document.getElementById("muscle-group-list");
    list.innerHTML = data.muscleGroups
        .map((mg) => {
        const maxTarget = mg.targets.pro;
        const pct = Math.min(100, (mg.actualSets / maxTarget) * 100);
        const levelClass = mg.level.replace(" ", "-");
        // Build target markers
        const beginnerPct = (mg.targets.beginner / maxTarget) * 100;
        const intermediatePct = (mg.targets.intermediate / maxTarget) * 100;
        return `
        <div class="mg-row">
          <div class="mg-header">
            <span class="mg-name">${mg.group}</span>
            <span class="mg-level level-badge-${levelClass}">${mg.level}</span>
          </div>
          <div class="mg-bar-container">
            <div class="mg-bar mg-bar-${levelClass}" style="width:${pct}%"></div>
            <div class="mg-marker" style="left:${beginnerPct}%" title="Beginner: ${mg.targets.beginner} sets"></div>
            <div class="mg-marker mg-marker-int" style="left:${intermediatePct}%" title="Intermediate: ${mg.targets.intermediate} sets"></div>
            <div class="mg-marker mg-marker-pro" style="left:100%" title="Pro: ${mg.targets.pro} sets"></div>
          </div>
          <div class="mg-stats">
            <span>${mg.actualSets} / ${maxTarget} sets</span>
          </div>
          <div class="mg-examples">e.g. ${mg.examples.join(", ")}</div>
        </div>`;
    })
        .join("");
    // Suggestions
    const suggestionsCard = document.getElementById("suggestions-card");
    const improvementList = document.getElementById("improvement-list");
    if (data.suggestions.length === 0) {
        improvementList.innerHTML = `<div class="empty-state">Looking great — keep it up! 💪</div>`;
    }
    else {
        improvementList.innerHTML = data.suggestions
            .map((s) => `<div class="improvement-item">⚠️ ${s}</div>`)
            .join("");
    }
}
// ── Sign out ─────────────────────────────────────
async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
}
window.signOut = signOut;
// ── Boot ─────────────────────────────────────────
init();
