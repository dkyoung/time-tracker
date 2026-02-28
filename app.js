"use strict";

const STORAGE_KEY = "tt_v1";

const els = {
  // header
  todayLabel: document.getElementById("todayLabel"),

  // tabs
  tabDashboard: document.getElementById("tabDashboard"),
  tabLogs: document.getElementById("tabLogs"),
  dashboardPanel: document.getElementById("dashboardPanel"),
  logsPanel: document.getElementById("logsPanel"),

  // dashboard
  bigTimer: document.getElementById("bigTimer"),
  statusText: document.getElementById("statusText"),
  activeSessionText: document.getElementById("activeSessionText"),

  todayGross: document.getElementById("todayGross"),
  todayBreaks: document.getElementById("todayBreaks"),
  todayNet: document.getElementById("todayNet"),
  weekNet: document.getElementById("weekNet"),
  monthNet: document.getElementById("monthNet"),

  // logs (now in Logs tab)
  log: document.getElementById("log"),

  // controls
  btnClockIn: document.getElementById("btnClockIn"),
  btnClockOut: document.getElementById("btnClockOut"),
};

// ---------------------------
// State
// ---------------------------
function defaultState() {
  return {
    sessions: [], // { id, startMs, endMs|null }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sessions)) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let state = loadState();

// ---------------------------
// Utilities
// ---------------------------
function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtHMS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function fmtHM(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${pad2(m)}`;
}

function startOfDayMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDayMs(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function startOfWeekMs(d) {
  // Monday -> Sunday (as you prefer)
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const deltaToMonday = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + deltaToMonday);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function startOfMonthMs(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function isSameDay(msA, msB) {
  const a = new Date(msA);
  const b = new Date(msB);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function nowMs() {
  return Date.now();
}

function getActiveSession() {
  return state.sessions.find(s => s.endMs == null) || null;
}

function clampToRange(msStart, msEnd, rangeStart, rangeEnd) {
  const s = Math.max(msStart, rangeStart);
  const e = Math.min(msEnd, rangeEnd);
  return Math.max(0, e - s);
}

function sessionDurationMs(session) {
  const end = session.endMs == null ? nowMs() : session.endMs;
  return Math.max(0, end - session.startMs);
}

// ---------------------------
// Tabs
// ---------------------------
function setTab(name) {
  const isDash = name === "dashboard";

  els.tabDashboard.classList.toggle("is-active", isDash);
  els.tabLogs.classList.toggle("is-active", !isDash);

  els.tabDashboard.setAttribute("aria-selected", isDash ? "true" : "false");
  els.tabLogs.setAttribute("aria-selected", !isDash ? "true" : "false");

  els.dashboardPanel.classList.toggle("is-active", isDash);
  els.logsPanel.classList.toggle("is-active", !isDash);
}

els.tabDashboard.addEventListener("click", () => setTab("dashboard"));
els.tabLogs.addEventListener("click", () => setTab("logs"));

// ---------------------------
// Core actions
// ---------------------------
function clockIn() {
  const active = getActiveSession();
  if (active) return;

  state.sessions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2),
    startMs: nowMs(),
    endMs: null,
  });

  saveState(state);
  renderAll();
}

function clockOut() {
  const active = getActiveSession();
  if (!active) return;

  active.endMs = nowMs();
  saveState(state);
  renderAll();
}

els.btnClockIn.addEventListener("click", clockIn);
els.btnClockOut.addEventListener("click", clockOut);

// ---------------------------
// Metrics (gross only for now)
// ---------------------------
function grossInRangeMs(rangeStart, rangeEnd) {
  let total = 0;
  for (const s of state.sessions) {
    const sStart = s.startMs;
    const sEnd = (s.endMs == null ? nowMs() : s.endMs);
    if (sEnd < rangeStart || sStart > rangeEnd) continue;
    total += clampToRange(sStart, sEnd, rangeStart, rangeEnd);
  }
  return total;
}

// Placeholder until your break logic is plugged in.
function breaksInRangeMs(_rangeStart, _rangeEnd) {
  return 0;
}

function netInRangeMs(rangeStart, rangeEnd) {
  const gross = grossInRangeMs(rangeStart, rangeEnd);
  const brk = breaksInRangeMs(rangeStart, rangeEnd);
  return Math.max(0, gross - brk);
}

// ---------------------------
// Rendering
// ---------------------------
function renderHeader() {
  const d = new Date();
  const opts = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
  els.todayLabel.textContent = d.toLocaleDateString(undefined, opts);
}

function renderButtons() {
  const active = getActiveSession();
  els.btnClockIn.disabled = !!active;
  els.btnClockOut.disabled = !active;
}

function renderStatus() {
  const active = getActiveSession();
  if (!active) {
    els.statusText.textContent = "Not clocked in";
    els.activeSessionText.textContent = "—";
    return;
  }

  els.statusText.textContent = "Clocked in";
  const started = new Date(active.startMs);
  els.activeSessionText.textContent = `Started: ${started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderBigTimer() {
  const active = getActiveSession();
  if (!active) {
    els.bigTimer.textContent = "00:00:00";
    return;
  }
  const elapsed = sessionDurationMs(active);
  els.bigTimer.textContent = fmtHMS(elapsed);
}

function renderTotals() {
  const now = new Date();

  const dayStart = startOfDayMs(now);
  const dayEnd = endOfDayMs(now);

  const weekStart = startOfWeekMs(now);
  const weekEnd = dayEnd;

  const monthStart = startOfMonthMs(now);
  const monthEnd = dayEnd;

  const todayGrossMs = grossInRangeMs(dayStart, dayEnd);
  const todayBreaksMs = breaksInRangeMs(dayStart, dayEnd);
  const todayNetMs = Math.max(0, todayGrossMs - todayBreaksMs);

  els.todayGross.textContent = fmtHM(todayGrossMs);
  els.todayBreaks.textContent = fmtHM(todayBreaksMs);
  els.todayNet.textContent = fmtHM(todayNetMs);

  els.weekNet.textContent = fmtHM(netInRangeMs(weekStart, weekEnd));
  els.monthNet.textContent = fmtHM(netInRangeMs(monthStart, monthEnd));
}

function renderLogs() {
  // Show newest first
  const items = [...state.sessions].sort((a, b) => (b.startMs - a.startMs));

  if (items.length === 0) {
    els.log.innerHTML = `<div class="muted">No sessions yet.</div>`;
    return;
  }

  const html = items.map(s => {
    const start = new Date(s.startMs);
    const end = s.endMs == null ? null : new Date(s.endMs);
    const dur = sessionDurationMs(s);

    const startStr = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const endStr = end
      ? `${end.toLocaleDateString()} ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Active";

    return `
      <div class="log-item">
        <div class="row">
          <div>
            <div class="k">Start</div>
            <div class="v">${startStr}</div>
          </div>
          <div>
            <div class="k">End</div>
            <div class="v">${endStr}</div>
          </div>
          <div>
            <div class="k">Duration</div>
            <div class="v">${fmtHMS(dur)}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  els.log.innerHTML = html;
}

function renderAll() {
  renderHeader();
  renderButtons();
  renderStatus();
  renderBigTimer();
  renderTotals();
  renderLogs();
}

// Big timer should always be live, even if user stays on Logs tab.
setInterval(() => {
  renderBigTimer();
  renderTotals();
  // If an active session is running, the "End: Active" duration should tick in logs too.
  // This is cheap enough for small lists.
  renderLogs();
}, 1000);

// Init
renderAll();
setTab("dashboard");
