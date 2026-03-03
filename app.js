"use strict";

const STORAGE_KEY = "tt_v1";
const BREAK_PLAN_MINUTES = [15, 30, 15];

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
  breakStatusText: document.getElementById("breakStatusText"),

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
  btnStartBreak: document.getElementById("btnStartBreak"),
  btnEndBreak: document.getElementById("btnEndBreak"),
  btnClearSession: document.getElementById("btnClearSession"),
  btnClearLogs: document.getElementById("btnClearLogs"),
  btnAddManualLog: document.getElementById("btnAddManualLog"),
  btnCancelManual: document.getElementById("btnCancelManual"),
  btnTextWeek: document.getElementById("btnTextWeek"),
  btnToggleFormat: document.getElementById("btnToggleFormat"),

  manualLogFormWrap: document.getElementById("manualLogFormWrap"),
  manualLogForm: document.getElementById("manualLogForm"),
  manualType: document.getElementById("manualType"),
  manualDate: document.getElementById("manualDate"),
  manualStart: document.getElementById("manualStart"),
  manualEnd: document.getElementById("manualEnd"),
  manualNotes: document.getElementById("manualNotes"),
  manualDuration: document.getElementById("manualDuration"),
  manualHint: document.getElementById("manualHint"),
  manualError: document.getElementById("manualError"),
};

// ---------------------------
// State
// ---------------------------
function defaultState() {
  return {
    sessions: [], // { id, startMs, endMs|null }
    breaks: [], // { id, startMs, endMs|null, plannedMinutes, sequence }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sessions)) return defaultState();

    const next = {
      sessions: parsed.sessions.map((session) => ({
        ...session,
        manual: session.manual === true,
        notes: typeof session.notes === "string" ? session.notes : "",
        createdAt: Number.isFinite(session.createdAt) ? session.createdAt : session.startMs,
      })),
      breaks: (Array.isArray(parsed.breaks) ? parsed.breaks : []).map((item) => ({
        ...item,
        manual: item.manual === true,
        notes: typeof item.notes === "string" ? item.notes : "",
        createdAt: Number.isFinite(item.createdAt) ? item.createdAt : item.startMs,
        isPaidBreak: typeof item.isPaidBreak === "boolean"
          ? item.isPaidBreak
          : (item.sequence === 2 ? false : true),
      })),
    };
    return next;
  } catch {
    return defaultState();
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let state = loadState();
let displayMode = "time"; // "time" or "decimal"

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

function formatMinutes(minutes) {
  if (displayMode === "decimal") {
    const decimalHours = minutes / 60;
    return decimalHours.toFixed(2);
  }

  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hrs}:${mins.toString().padStart(2, "0")}`;
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

function makeLogId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `log_${Date.now()}_${suffix}`;
}

function parseDateTimeToMs(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}`).getTime();
}

function expectedMinutesForType(type) {
  if (type === "break_1" || type === "break_3") return 15;
  if (type === "break_2") return 30;
  return null;
}

function getManualTypeMeta(type) {
  if (type === "break_1") return { kind: "break", sequence: 1, plannedMinutes: 15 };
  if (type === "break_2") return { kind: "break", sequence: 2, plannedMinutes: 30 };
  if (type === "break_3") return { kind: "break", sequence: 3, plannedMinutes: 15 };
  return { kind: "work" };
}

function getActiveSession() {
  return state.sessions.find(s => s.endMs == null) || null;
}

function getActiveBreak(sessionId = null) {
  return state.breaks.find((b) => {
    if (b.endMs != null) return false;
    if (sessionId == null) return true;
    return b.sessionId === sessionId || b.sessionId == null;
  }) || null;
}

function getPlannedBreakMinutes(sequence) {
  return BREAK_PLAN_MINUTES[sequence] ?? null;
}

function getBreakLabel(sequence) {
  if (sequence === 1) return "First break (15m)";
  if (sequence === 2) return "Lunch break (30m)";
  if (sequence === 3) return "Last break (15m)";
  return "Break";
}

function countBreaksForDate(d) {
  const dayStart = startOfDayMs(d);
  const dayEnd = endOfDayMs(d);
  return state.breaks.filter((b) => {
    const ms = b.startMs;
    return ms >= dayStart && ms <= dayEnd;
  }).length;
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
    id: makeLogId(),
    startMs: nowMs(),
    endMs: null,
    manual: false,
    notes: "",
    createdAt: nowMs(),
  });

  saveState(state);
  renderAll();
}

function clockOut() {
  const active = getActiveSession();
  if (!active) return;

  const activeBreak = getActiveBreak(active.id);
  if (activeBreak) {
    activeBreak.endMs = nowMs();
  }

  active.endMs = nowMs();
  saveState(state);
  renderAll();
}

function startBreak() {
  const activeSession = getActiveSession();
  if (!activeSession) return;

  const activeBreak = getActiveBreak(activeSession.id);
  if (activeBreak) return;

  const existingTodayBreaks = countBreaksForDate(new Date());
  const sequence = existingTodayBreaks + 1;
  const plannedMinutes = getPlannedBreakMinutes(sequence - 1);
  const isPaidBreak = (sequence === 2 ? false : true);
  if (plannedMinutes == null) return;

  state.breaks.push({
    id: makeLogId(),
    sessionId: activeSession.id,
    startMs: nowMs(),
    endMs: null,
    plannedMinutes,
    sequence,
    isPaidBreak,
    manual: false,
    notes: "",
    createdAt: nowMs(),
  });

  saveState(state);
  renderAll();
}

function endBreak() {
  const activeSession = getActiveSession();
  if (!activeSession) return;

  const activeBreak = getActiveBreak(activeSession.id);
  if (!activeBreak) return;

  activeBreak.endMs = nowMs();
  saveState(state);
  renderAll();
}

function clearCurrentSession() {
  if (!window.confirm("Clear current session? This cannot be undone.")) return;

  const activeSession = getActiveSession();
  if (!activeSession) return;

  state.sessions = state.sessions.filter((s) => s.id !== activeSession.id);
  state.breaks = state.breaks.filter((b) => {
    if (b.sessionId === activeSession.id) return false;
    if (b.sessionId == null && b.endMs == null) return false;
    return true;
  });

  saveState(state);
  renderAll();
}

function clearLogs() {
  state.sessions = [];
  state.breaks = [];
  saveState(state);
  renderAll();
}

function openManualForm() {
  els.manualLogFormWrap.hidden = false;
  const now = new Date();
  els.manualDate.value = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  els.manualStart.value = "09:00";
  els.manualEnd.value = "17:00";
  els.manualNotes.value = "";
  els.manualType.value = "work";
  updateManualFormMeta();
}

function closeManualForm() {
  els.manualLogFormWrap.hidden = true;
  els.manualError.textContent = "";
  els.manualHint.textContent = "";
}

function updateManualFormMeta() {
  const dateValue = els.manualDate.value;
  const startValue = els.manualStart.value;
  const endValue = els.manualEnd.value;
  els.manualError.textContent = "";

  if (!dateValue || !startValue || !endValue) {
    els.manualDuration.textContent = "00:00:00";
    els.manualHint.textContent = "";
    return;
  }

  const startMs = parseDateTimeToMs(dateValue, startValue);
  const endMs = parseDateTimeToMs(dateValue, endValue);

  if (endMs <= startMs) {
    els.manualDuration.textContent = "00:00:00";
    els.manualError.textContent = "End time must be after start time.";
    els.manualHint.textContent = "";
    return;
  }

  const durationMs = endMs - startMs;
  els.manualDuration.textContent = fmtHMS(durationMs);

  const expected = expectedMinutesForType(els.manualType.value);
  if (expected == null) {
    els.manualHint.textContent = "";
    return;
  }

  const actual = Math.round(durationMs / 60000);
  if (actual !== expected) {
    els.manualHint.textContent = `Hint: typical ${expected}m break; current entry is ${actual}m.`;
  } else {
    els.manualHint.textContent = "";
  }
}

function saveManualLog(evt) {
  evt.preventDefault();
  const type = els.manualType.value;
  const dateValue = els.manualDate.value;
  const startValue = els.manualStart.value;
  const endValue = els.manualEnd.value;
  const notes = els.manualNotes.value.trim();

  if (!dateValue || !startValue || !endValue) {
    els.manualError.textContent = "Date, start time, and end time are required.";
    return;
  }

  const startMs = parseDateTimeToMs(dateValue, startValue);
  const endMs = parseDateTimeToMs(dateValue, endValue);

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    els.manualError.textContent = "Please provide valid date and time values.";
    return;
  }

  if (endMs <= startMs) {
    els.manualError.textContent = "End time must be after start time.";
    return;
  }

  const meta = getManualTypeMeta(type);
  const entry = {
    id: makeLogId(),
    startMs,
    endMs,
    manual: true,
    notes,
    createdAt: nowMs(),
  };

  if (meta.kind === "break") {
    const isPaidBreak = (meta.sequence === 2 ? false : true);
    state.breaks.push({
      ...entry,
      kind: "break",
      sequence: meta.sequence,
      plannedMinutes: meta.plannedMinutes,
      isPaidBreak,
      sessionId: null,
    });
  } else {
    state.sessions.push({
      ...entry,
      kind: "work",
    });
  }

  saveState(state);
  renderAll();
  closeManualForm();

  requestAnimationFrame(() => {
    const added = document.querySelector(`[data-log-id="${entry.id}"]`);
    added?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

els.btnClockIn.addEventListener("click", clockIn);
els.btnClockOut.addEventListener("click", clockOut);
els.btnStartBreak.addEventListener("click", startBreak);
els.btnEndBreak.addEventListener("click", endBreak);
els.btnClearSession.addEventListener("click", clearCurrentSession);
els.btnClearLogs.addEventListener("click", clearLogs);
els.btnTextWeek?.addEventListener("click", () => {
  const msg = getWeeklyHoursText();
  openSmsComposer(msg);
});
els.btnToggleFormat?.addEventListener("click", () => {
  displayMode = displayMode === "time" ? "decimal" : "time";

  const btn = els.btnToggleFormat;
  if (btn) {
    btn.textContent = displayMode === "time" ? "View: HH:MM" : "View: Decimal";
  }

  updateUI();
});
els.btnAddManualLog?.addEventListener("click", openManualForm);
els.btnCancelManual?.addEventListener("click", closeManualForm);
els.manualLogForm?.addEventListener("submit", saveManualLog);
els.manualType?.addEventListener("change", updateManualFormMeta);
els.manualDate?.addEventListener("input", updateManualFormMeta);
els.manualStart?.addEventListener("input", updateManualFormMeta);
els.manualEnd?.addEventListener("input", updateManualFormMeta);
els.log?.addEventListener("click", (evt) => {
  const target = evt.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.deleteManualId;
  if (!id) return;
  if (!window.confirm("Delete this manual log?")) return;

  const beforeSessions = state.sessions.length;
  const beforeBreaks = state.breaks.length;
  state.sessions = state.sessions.filter((entry) => !(entry.id === id && entry.manual));
  state.breaks = state.breaks.filter((entry) => !(entry.id === id && entry.manual));

  if (state.sessions.length === beforeSessions && state.breaks.length === beforeBreaks) return;

  saveState(state);
  renderAll();
});

function openSmsComposer(message) {
  const encoded = encodeURIComponent(message);
  const url = `sms:?body=${encoded}`;
  window.location.href = url;
}

function getWeeklyHoursText() {
  const weekNetEl = document.getElementById("weekNet");
  if (!weekNetEl || !weekNetEl.textContent) {
    return "Weekly total hours: N/A";
  }

  return `Weekly total hours: ${weekNetEl.textContent.trim()}`;
}

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

function paidBreaksInRangeMs(rangeStart, rangeEnd) {
  let total = 0;
  for (const b of state.breaks) {
    const bStart = b.startMs;
    const bEnd = (b.endMs == null ? nowMs() : b.endMs);
    if (b.isPaidBreak !== true) continue;
    if (bEnd < rangeStart || bStart > rangeEnd) continue;
    total += clampToRange(bStart, bEnd, rangeStart, rangeEnd);
  }
  return total;
}

function unpaidBreaksInRangeMs(rangeStart, rangeEnd) {
  let total = 0;
  for (const b of state.breaks) {
    const bStart = b.startMs;
    const bEnd = (b.endMs == null ? nowMs() : b.endMs);
    if (b.isPaidBreak !== false) continue;
    if (bEnd < rangeStart || bStart > rangeEnd) continue;
    total += clampToRange(bStart, bEnd, rangeStart, rangeEnd);
  }
  return total;
}

function netInRangeMs(rangeStart, rangeEnd) {
  const gross = grossInRangeMs(rangeStart, rangeEnd);
  const unpaid = unpaidBreaksInRangeMs(rangeStart, rangeEnd);
  return Math.max(0, gross - unpaid);
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
  const activeBreak = active ? getActiveBreak(active.id) : null;
  const todayBreakCount = countBreaksForDate(new Date());
  const allBreaksUsedToday = todayBreakCount >= BREAK_PLAN_MINUTES.length;

  els.btnClockIn.disabled = !!active;
  els.btnClockOut.disabled = !active;
  els.btnStartBreak.disabled = !active || !!activeBreak || allBreaksUsedToday;
  els.btnEndBreak.disabled = !activeBreak;
  els.btnClearSession.disabled = !active;
  els.btnClearLogs.disabled = state.sessions.length === 0 && state.breaks.length === 0;
}

function renderStatus() {
  const active = getActiveSession();
  const activeBreak = active ? getActiveBreak(active.id) : null;
  const todayBreakCount = countBreaksForDate(new Date());
  const nextBreakNumber = todayBreakCount + 1;

  if (!active) {
    els.statusText.textContent = "Not clocked in";
    els.activeSessionText.textContent = "—";
    els.breakStatusText.textContent = "Breaks available after you clock in.";
    return;
  }

  els.statusText.textContent = "Clocked in";
  const started = new Date(active.startMs);
  els.activeSessionText.textContent = `Started: ${started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  if (activeBreak) {
    const startedBreak = new Date(activeBreak.startMs);
    const breakLabel = getBreakLabel(activeBreak.sequence);
    els.breakStatusText.textContent = `${breakLabel} started at ${startedBreak.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return;
  }

  const nextMinutes = getPlannedBreakMinutes(todayBreakCount);
  if (nextMinutes == null) {
    els.breakStatusText.textContent = "All planned breaks for today are completed.";
    return;
  }
  const nextLabel = getBreakLabel(nextBreakNumber);
  els.breakStatusText.textContent = `Next: ${nextLabel}`;
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
  const todayPaidBreaksMs = paidBreaksInRangeMs(dayStart, dayEnd);
  const todayUnpaidBreaksMs = unpaidBreaksInRangeMs(dayStart, dayEnd);
  const todayNetMs = Math.max(0, todayGrossMs - todayUnpaidBreaksMs);

  const todayGrossMinutes = Math.max(0, Math.round(todayGrossMs / 60000));
  const todayPaidBreaksMinutes = Math.max(0, Math.round(todayPaidBreaksMs / 60000));
  const todayUnpaidBreaksMinutes = Math.max(0, Math.round(todayUnpaidBreaksMs / 60000));
  const todayNetMinutes = Math.max(0, Math.round(todayNetMs / 60000));
  const weekNetMinutes = Math.max(0, Math.round(netInRangeMs(weekStart, weekEnd) / 60000));
  const monthNetMinutes = Math.max(0, Math.round(netInRangeMs(monthStart, monthEnd) / 60000));
  const paidStr = formatMinutes(todayPaidBreaksMinutes);
  const unpaidStr = formatMinutes(todayUnpaidBreaksMinutes);

  els.todayGross.textContent = formatMinutes(todayGrossMinutes);
  els.todayBreaks.innerHTML = `
  <span class="break-paid">Paid ${paidStr}</span>
  <span class="break-sep"> • </span>
  <span class="break-unpaid">Unpaid ${unpaidStr}</span>
`;
  els.todayNet.textContent = formatMinutes(todayNetMinutes);
  els.weekNet.textContent = formatMinutes(weekNetMinutes);
  els.monthNet.textContent = formatMinutes(monthNetMinutes);
}

function renderLogs() {
  const items = [
    ...state.sessions.map((s) => ({ ...s, kind: "work" })),
    ...state.breaks.map((b) => ({ ...b, kind: "break" })),
  ].sort((a, b) => {
    if (b.startMs !== a.startMs) return b.startMs - a.startMs;
    const aEnd = a.endMs == null ? Number.MAX_SAFE_INTEGER : a.endMs;
    const bEnd = b.endMs == null ? Number.MAX_SAFE_INTEGER : b.endMs;
    if (bEnd !== aEnd) return bEnd - aEnd;
    const aCreated = Number.isFinite(a.createdAt) ? a.createdAt : 0;
    const bCreated = Number.isFinite(b.createdAt) ? b.createdAt : 0;
    if (bCreated !== aCreated) return bCreated - aCreated;
    return String(b.id).localeCompare(String(a.id));
  });

  if (items.length === 0) {
    els.log.innerHTML = `<div class="muted">No sessions yet.</div>`;
    return;
  }

  const html = items.map(s => {
    const start = new Date(s.startMs);
    const end = s.endMs == null ? null : new Date(s.endMs);
    const dur = sessionDurationMs(s);
    const title = s.kind === "break"
      ? getBreakLabel(s.sequence)
      : "Work session";
    const sourceLabel = s.manual ? "Manual" : "Auto";
    const manualBadge = s.manual ? '<span class="badge-manual">Manual</span>' : "";

    const startStr = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const endStr = end
      ? `${end.toLocaleDateString()} ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Active";

    return `
      <div class="log-item" data-log-id="${s.id}">
        <div class="log-header">
          ${manualBadge}
          ${s.manual ? `<button class="btn btn-delete-manual" type="button" data-delete-manual-id="${s.id}">Delete</button>` : ""}
        </div>
        <div class="row">
          <div>
            <div class="k">Start</div>
            <div class="v">${startStr}</div>
          </div>
          <div>
            <div class="k">Type</div>
            <div class="v">${title}</div>
          </div>
          <div>
            <div class="k">End</div>
            <div class="v">${endStr}</div>
          </div>
          <div>
            <div class="k">Duration</div>
            <div class="v">${fmtHMS(dur)}</div>
          </div>
          <div>
            <div class="k">Source</div>
            <div class="v">${sourceLabel}</div>
          </div>
          ${s.notes ? `<div><div class="k">Notes</div><div class="v">${s.notes}</div></div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  els.log.innerHTML = html;
}

function updateUI() {
  renderTotals();
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
