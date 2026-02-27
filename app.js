"use strict";

const STORAGE_KEY = "tt_v1";

/**
 * Break plan: 15 -> 30 (lunch) -> 15
 * Enforced in order with a single Start Break button.
 */
const BREAK_PLAN = [
  { label: "Break 1", minutes: 15, kind: "break" },
  { label: "Lunch",  minutes: 30, kind: "lunch" },
  { label: "Break 2", minutes: 15, kind: "break" },
];

const els = {
  todayLabel: document.getElementById("todayLabel"),
  statusText: document.getElementById("statusText"),
  runningTimer: document.getElementById("runningTimer"),
  activeSessionText: document.getElementById("activeSessionText"),
  nextBreakText: document.getElementById("nextBreakText"),

  todayGross: document.getElementById("todayGross"),
  todayBreaks: document.getElementById("todayBreaks"),
  todayNet: document.getElementById("todayNet"),

  weekNet: document.getElementById("weekNet"),
  monthNet: document.getElementById("monthNet"),

  log: document.getElementById("log"),

  btnClockIn: document.getElementById("btnClockIn"),
  btnClockOut: document.getElementById("btnClockOut"),
  btnStartBreak: document.getElementById("btnStartBreak"),
  btnEndBreak: document.getElementById("btnEndBreak"),

  btnExport: document.getElementById("btnExport"),
  btnClearAll: document.getElementById("btnClearAll"),
  btnSeed: document.getElementById("btnSeed"),
};

let state = loadState();
let ticker = null;

boot();
render();

/* ----------------------------- Boot / Wiring ----------------------------- */

function boot() {
  // Keep the date label live-ish (it updates on render anyway)
  startTicker();

  els.btnClockIn.addEventListener("click", onClockIn);
  els.btnClockOut.addEventListener("click", onClockOut);

  els.btnStartBreak.addEventListener("click", onStartBreak);
  els.btnEndBreak.addEventListener("click", onEndBreak);

  els.btnExport.addEventListener("click", exportJSON);
  els.btnClearAll.addEventListener("click", clearAll);
  els.btnSeed.addEventListener("click", seedDemoEntries);
}

/* ----------------------------- State model ------------------------------ */
/**
 * state = {
 *   entries: Array<Entry>,
 *   activeSession: { id, startMs } | null,
 *   activeBreak: { id, sessionId, startMs, plannedMinutes, label, kind } | null,
 *   breakIndex: number, // 0..BREAK_PLAN.length
 * }
 *
 * Entry (logged):
 *  - Work entry: {id,type:"work",startMs,endMs,sessionId,label}
 *  - Break entry:{id,type:"break",startMs,endMs,minutes,plannedMinutes,sessionId,label,kind}
 *  - Event entry:{id,type:"event",tsMs,label}
 */

function newDefaultState() {
  return {
    entries: [],
    activeSession: null,
    activeBreak: null,
    breakIndex: 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return newDefaultState();
    const parsed = JSON.parse(raw);

    // Basic hardening
    if (!parsed || typeof parsed !== "object") return newDefaultState();
    parsed.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    parsed.activeSession = parsed.activeSession ?? null;
    parsed.activeBreak = parsed.activeBreak ?? null;
    parsed.breakIndex = Number.isFinite(parsed.breakIndex) ? parsed.breakIndex : 0;

    return parsed;
  } catch {
    return newDefaultState();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ----------------------------- Actions ---------------------------------- */

function onClockIn() {
  if (state.activeSession) return;

  const sessionId = crypto.randomUUID();
  state.activeSession = { id: sessionId, startMs: Date.now() };
  state.activeBreak = null;
  state.breakIndex = 0;

  state.entries.unshift({
    id: crypto.randomUUID(),
    type: "event",
    tsMs: Date.now(),
    label: "Clock In",
  });

  persist();
  render();
}

function onClockOut() {
  if (!state.activeSession) return;

  if (state.activeBreak) {
    alert("End the break first.");
    return;
  }

  const endMs = Date.now();
  const startMs = state.activeSession.startMs;
  const sessionId = state.activeSession.id;

  state.entries.unshift({
    id: crypto.randomUUID(),
    type: "work",
    sessionId,
    startMs,
    endMs,
    label: "Work Session",
  });

  state.entries.unshift({
    id: crypto.randomUUID(),
    type: "event",
    tsMs: Date.now(),
    label: "Clock Out",
  });

  state.activeSession = null;
  state.activeBreak = null;
  state.breakIndex = 0;

  persist();
  render();
}

function onStartBreak() {
  if (!state.activeSession) {
    alert("Clock in first.");
    return;
  }
  if (state.activeBreak) {
    alert("You’re already on a break. End it first.");
    return;
  }
  if (state.breakIndex >= BREAK_PLAN.length) {
    alert("All planned breaks used (15, 30, 15).");
    return;
  }

  const plan = BREAK_PLAN[state.breakIndex];

  state.activeBreak = {
    id: crypto.randomUUID(),
    sessionId: state.activeSession.id,
    startMs: Date.now(),
    plannedMinutes: plan.minutes,
    label: `${plan.label} (${plan.minutes} min)`,
    kind: plan.kind,
  };

  state.entries.unshift({
    id: crypto.randomUUID(),
    type: "event",
    tsMs: Date.now(),
    label: `Start ${state.activeBreak.label}`,
  });

  persist();
  render();
}

function onEndBreak() {
  if (!state.activeBreak) return;

  const endMs = Date.now();
  const startMs = state.activeBreak.startMs;

  const actualMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

  state.entries.unshift({
    id: state.activeBreak.id,
    type: "break",
    sessionId: state.activeBreak.sessionId,
    startMs,
    endMs,
    minutes: actualMinutes,                 // actual
    plannedMinutes: state.activeBreak.plannedMinutes, // planned 15/30/15
    label: state.activeBreak.label,
    kind: state.activeBreak.kind,           // break/lunch
  });

  state.entries.unshift({
    id: crypto.randomUUID(),
    type: "event",
    tsMs: Date.now(),
    label: `End ${state.activeBreak.label} (${actualMinutes} min)`,
  });

  state.activeBreak = null;
  state.breakIndex += 1;

  persist();
  render();
}

/* ----------------------------- Rendering -------------------------------- */

function render() {
  // Header date label
  els.todayLabel.textContent = `<${formatLongDate(new Date())}>`;

  // Status + Active session text + Next break text
  const status = getStatus();
  els.statusText.textContent = status;

  if (state.activeSession) {
    els.activeSessionText.textContent = `${formatDateTime(new Date(state.activeSession.startMs))}`;
  } else {
    els.activeSessionText.textContent = "—";
  }

  els.nextBreakText.textContent = getNextBreakText();

  // Buttons
  const working = !!state.activeSession;
  const onBreak = !!state.activeBreak;

  els.btnClockIn.disabled = working;
  els.btnClockOut.disabled = !working || onBreak;

  els.btnStartBreak.disabled = !working || onBreak || state.breakIndex >= BREAK_PLAN.length;
  els.btnEndBreak.disabled = !onBreak;

  // Live timer update now (ticker updates every second too)
  updateRunningTimer();

  // Totals
  const now = Date.now();

  const today = new Date();
  const todayStart = startOfDayMs(today);
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const weekStart = startOfWeekMondayMs(today);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

  const monthStart = startOfMonthMs(today);
  const monthEnd = startOfNextMonthMs(today);

  const todayTotals = calcTotalsBetween(todayStart, todayEnd, now);
  els.todayGross.textContent = todayTotals.grossHours.toFixed(2);
  els.todayBreaks.textContent = todayTotals.breakHours.toFixed(2);
  els.todayNet.textContent = todayTotals.netHours.toFixed(2);

  const weekTotals = calcTotalsBetween(weekStart, weekEnd, now);
  els.weekNet.textContent = weekTotals.netHours.toFixed(2);

  const monthTotals = calcTotalsBetween(monthStart, monthEnd, now);
  els.monthNet.textContent = monthTotals.netHours.toFixed(2);

  // Log
  renderLog();
}

function renderLog() {
  els.log.innerHTML = "";

  if (!state.entries.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No entries yet.";
    els.log.appendChild(empty);
    return;
  }

  for (const e of state.entries.slice(0, 80)) {
    const item = document.createElement("div");
    item.className = "logItem";

    const left = document.createElement("div");
    left.className = "logLeft";

    const title = document.createElement("p");
    title.className = "logTitle";
    title.textContent = logTitle(e);

    const sub = document.createElement("p");
    sub.className = "logSub";
    sub.textContent = logSubtitle(e);

    left.appendChild(title);
    left.appendChild(sub);

    const id = document.createElement("div");
    id.className = "logId";
    id.textContent = e.id;

    item.appendChild(left);
    item.appendChild(id);

    els.log.appendChild(item);
  }
}

function logTitle(e) {
  if (e.type === "break") return e.label;
  if (e.type === "work") return "Work";
  if (e.type === "event") return e.label;
  return e.type;
}

function logSubtitle(e) {
  if (e.type === "event") {
    return formatDateTime(new Date(e.tsMs));
  }

  if (e.type === "work") {
    const start = formatDateTime(new Date(e.startMs));
    const end = formatDateTime(new Date(e.endMs));
    const mins = Math.max(0, Math.round((e.endMs - e.startMs) / 60000));
    return `${start} → ${end} (${mins} min)`;
  }

  if (e.type === "break") {
    const start = formatDateTime(new Date(e.startMs));
    const end = formatDateTime(new Date(e.endMs));
    return `${start} → ${end} (planned ${e.plannedMinutes} min, actual ${e.minutes} min)`;
  }

  return "";
}

function getStatus() {
  if (!state.activeSession) return "Off";
  if (state.activeBreak) return "On Break";
  return "Working";
}

function getNextBreakText() {
  if (!state.activeSession) return "Next break: —";
  if (state.activeBreak) return `On break: ${state.activeBreak.label}`;
  if (state.breakIndex >= BREAK_PLAN.length) return "Next break: none (plan complete)";

  const b = BREAK_PLAN[state.breakIndex];
  return `Next break: ${b.label} (${b.minutes} min) — plan: 15 / 30 / 15`;
}

/* ----------------------------- Timer ticker ------------------------------ */

function startTicker() {
  if (ticker) return;
  ticker = setInterval(() => updateRunningTimer(), 1000);
}

function updateRunningTimer() {
  let seconds = 0;

  if (state.activeBreak) {
    seconds = (Date.now() - state.activeBreak.startMs) / 1000;
  } else if (state.activeSession) {
    seconds = (Date.now() - state.activeSession.startMs) / 1000;
  } else {
    seconds = 0;
  }

  els.runningTimer.textContent = fmtHMS(seconds);
}

function fmtHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/* ----------------------------- Totals ----------------------------------- */

function calcTotalsBetween(rangeStartMs, rangeEndMs, nowMs) {
  // Work entries (completed sessions)
  let workMs = 0;
  for (const e of state.entries) {
    if (e.type !== "work") continue;
    const overlap = overlapMs(e.startMs, e.endMs, rangeStartMs, rangeEndMs);
    workMs += overlap;
  }

  // Add live session time if active and overlaps range
  if (state.activeSession) {
    const overlap = overlapMs(state.activeSession.startMs, nowMs, rangeStartMs, rangeEndMs);
    workMs += overlap;
  }

  // Break entries
  let breakMs = 0;
  for (const e of state.entries) {
    if (e.type !== "break") continue;
    const overlap = overlapMs(e.startMs, e.endMs, rangeStartMs, rangeEndMs);
    breakMs += overlap;
  }

  // Add live break if active and overlaps range
  if (state.activeBreak) {
    const overlap = overlapMs(state.activeBreak.startMs, nowMs, rangeStartMs, rangeEndMs);
    breakMs += overlap;
  }

  // Gross is work time, but if you’re on break, the live work timer still runs.
  // Net is work minus breaks (this matches your UI expectations).
  const grossHours = workMs / 3600000;
  const breakHours = breakMs / 3600000;
  const netHours = Math.max(0, grossHours - breakHours);

  return { grossHours, breakHours, netHours };
}

function overlapMs(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

/* ----------------------------- Date helpers ------------------------------ */

function startOfDayMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

// Week starts Monday (your preference)
function startOfWeekMondayMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day === 0) ? 6 : (day - 1); // Sun -> 6, Mon -> 0
  x.setDate(x.getDate() - diffToMonday);
  return x.getTime();
}

function startOfMonthMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  return x.getTime();
}

function startOfNextMonthMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  x.setMonth(x.getMonth() + 1);
  return x.getTime();
}

function formatLongDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(d) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ----------------------------- Utilities -------------------------------- */

function exportJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `time-tracker-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function clearAll() {
  const ok = confirm("Clear all local data for this Time Tracker?");
  if (!ok) return;

  state = newDefaultState();
  persist();
  render();
}

function seedDemoEntries() {
  if (state.entries.length) {
    const ok = confirm("This will add demo entries. Continue?");
    if (!ok) return;
  }

  const now = Date.now();
  const sessionId = crypto.randomUUID();

  // Demo: clock in 2h 20m ago, break 15m, back to work
  const clockInMs = now - (2 * 60 + 20) * 60000;
  const breakStart = now - (1 * 60 + 5) * 60000;
  const breakEnd = breakStart + 15 * 60000;

  state.entries.unshift({ id: crypto.randomUUID(), type: "event", tsMs: clockInMs, label: "Clock In" });
  state.entries.unshift({
    id: crypto.randomUUID(),
    type: "break",
    sessionId,
    startMs: breakStart,
    endMs: breakEnd,
    minutes: 15,
    plannedMinutes: 15,
    label: "Break 1 (15 min)",
    kind: "break",
  });
  state.entries.unshift({ id: crypto.randomUUID(), type: "event", tsMs: breakStart, label: "Start Break 1 (15 min)" });
  state.entries.unshift({ id: crypto.randomUUID(), type: "event", tsMs: breakEnd, label: "End Break 1 (15 min) (15 min)" });

  state.activeSession = { id: sessionId, startMs: clockInMs };
  state.activeBreak = null;
  state.breakIndex = 1; // next is Lunch (30)

  persist();
  render();
}
