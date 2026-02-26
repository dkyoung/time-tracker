"use strict";

const STORAGE_KEY = "tt_v1";

const els = {
  todayLabel: document.getElementById("todayLabel"),
  statusText: document.getElementById("statusText"),
  activeSessionText: document.getElementById("activeSessionText"),

  todayGross: document.getElementById("todayGross"),
  todayBreaks: document.getElementById("todayBreaks"),
  todayNet: document.getElementById("todayNet"),

  weekNet: document.getElementById("weekNet"),
  monthNet: document.getElementById("monthNet"),

  log: document.getElementById("log"),

  btnClockIn: document.getElementById("btnClockIn"),
  btnClockOut: document.getElementById("btnClockOut"),
  btnBreak15: document.getElementById("btnBreak15"),
  btnBreak30: document.getElementById("btnBreak30"),
  btnBreak60: document.getElementById("btnBreak60"),

  btnClear: document.getElementById("btnClear"),
  btnExport: document.getElementById("btnExport"),
  btnSeedDemo: document.getElementById("btnSeedDemo"),
};

function nowTs() { return Date.now(); }
function uid() { return Math.random().toString(16).slice(2) + "-" + Math.random().toString(16).slice(2); }

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function dayKey(ts = nowTs()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekTs(ts = nowTs()) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function startOfMonthTs(ts = nowTs()) {
  const d = new Date(ts);
  d.setHours(0,0,0,0);
  d.setDate(1);
  return d.getTime();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], openSession: null };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [], openSession: null };
    return { entries: parsed.entries, openSession: parsed.openSession ?? null };
  } catch {
    return { entries: [], openSession: null };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function minutesToHours(min) { return min / 60; }
function sumMinutes(entries) { return entries.reduce((acc, e) => acc + (e.minutes ?? 0), 0); }

function computeDayGrossMinutes(state, dayStr) {
  const inChron = [...state.entries].slice().reverse();
  let gross = 0;
  let openInTs = null;

  for (const e of inChron) {
    if (dayKey(e.ts) !== dayStr) continue;

    if (e.type === "clock_in") openInTs = e.ts;
    if (e.type === "clock_out" && openInTs != null) {
      gross += Math.max(0, Math.round((e.ts - openInTs) / 60000));
      openInTs = null;
    }
  }

  if (state.openSession?.startedAtTs && dayKey(state.openSession.startedAtTs) === dayStr) {
    gross += Math.max(0, Math.round((nowTs() - state.openSession.startedAtTs) / 60000));
  }
  return gross;
}

function computeDayBreakMinutes(state, dayStr) {
  return sumMinutes(state.entries.filter(e => dayKey(e.ts) === dayStr && e.type === "break"));
}

function computeNetMinutesForDay(state, dayStr) {
  const gross = computeDayGrossMinutes(state, dayStr);
  const br = computeDayBreakMinutes(state, dayStr);
  return Math.max(0, gross - br);
}

function computeNetMinutesBetween(state, startTs, endTsExclusive) {
  let total = 0;
  const cur = new Date(startTs);
  cur.setHours(0,0,0,0);

  while (cur.getTime() < endTsExclusive) {
    total += computeNetMinutesForDay(state, dayKey(cur.getTime()));
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}

function setStatus(state) {
  const working = !!state.openSession?.startedAtTs;
  els.statusText.textContent = working ? "Working" : "Idle";
  els.activeSessionText.textContent = working ? formatDate(state.openSession.startedAtTs) : "None";

  els.btnClockIn.disabled = working;
  els.btnClockOut.disabled = !working;
  els.btnBreak15.disabled = !working;
  els.btnBreak30.disabled = !working;
  els.btnBreak60.disabled = !working;
}

function renderTotals(state) {
  const today = dayKey();
  els.todayLabel.textContent = `Today: ${today}`;

  const grossMin = computeDayGrossMinutes(state, today);
  const breakMin = computeDayBreakMinutes(state, today);
  const netMin = Math.max(0, grossMin - breakMin);

  els.todayGross.textContent = minutesToHours(grossMin).toFixed(2);
  els.todayBreaks.textContent = minutesToHours(breakMin).toFixed(2);
  els.todayNet.textContent = minutesToHours(netMin).toFixed(2);

  const now = nowTs() + 1;
  const weekNet = computeNetMinutesBetween(state, startOfWeekTs(), now);
  const monthNet = computeNetMinutesBetween(state, startOfMonthTs(), now);

  els.weekNet.textContent = minutesToHours(weekNet).toFixed(2);
  els.monthNet.textContent = minutesToHours(monthNet).toFixed(2);
}

function renderLog(state) {
  els.log.innerHTML = "";
  if (state.entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No entries yet.";
    els.log.appendChild(empty);
    return;
  }

  for (const e of state.entries.slice(0, 50)) {
    const div = document.createElement("div");
    div.className = "log-item";

    const top = document.createElement("div");
    top.className = "top";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.className = "muted code";
    right.textContent = e.id;

    const typeLabel =
      e.type === "clock_in" ? "Clock In" :
      e.type === "clock_out" ? "Clock Out" :
      e.type === "break" ? `Break (${e.minutes} min)` : e.type;

    left.innerHTML = `<strong>${typeLabel}</strong><div class="muted">${formatDate(e.ts)}</div>`;

    top.appendChild(left);
    top.appendChild(right);
    div.appendChild(top);
    els.log.appendChild(div);
  }
}

function render(state) {
  setStatus(state);
  renderTotals(state);
  renderLog(state);
}

function addEntry(state, entry) {
  state.entries.unshift(entry);
  saveState(state);
  render(state);
}

function clockIn() {
  const state = loadState();
  if (state.openSession) return;

  const ts = nowTs();
  state.openSession = { startedAtTs: ts };
  saveState(state);
  addEntry(state, { id: uid(), ts, type: "clock_in", minutes: 0 });
}

function clockOut() {
  const state = loadState();
  if (!state.openSession?.startedAtTs) return;

  const ts = nowTs();
  state.openSession = null;
  saveState(state);
  addEntry(state, { id: uid(), ts, type: "clock_out", minutes: 0 });
}

function addBreak(minutes) {
  const state = loadState();
  if (!state.openSession?.startedAtTs) return;

  addEntry(state, { id: uid(), ts: nowTs(), type: "break", minutes });
}

function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
  render(loadState());
}

function exportJson() {
  const state = loadState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `time-tracker-${dayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function seedDemo() {
  const state = loadState();
  if (state.entries.length > 0) return;

  const base = new Date();
  base.setHours(9, 0, 0, 0);

  const tIn = base.getTime();
  const tLunch = base.getTime() + 3 * 60 * 60000;
  const tOut = base.getTime() + 8 * 60 * 60000;

  state.entries = [
    { id: uid(), ts: tOut, type: "clock_out", minutes: 0 },
    { id: uid(), ts: tLunch, type: "break", minutes: 60 },
    { id: uid(), ts: tIn, type: "clock_in", minutes: 0 },
  ];
  state.openSession = null;
  saveState(state);
  render(state);
}

els.btnClockIn.addEventListener("click", clockIn);
els.btnClockOut.addEventListener("click", clockOut);
els.btnBreak15.addEventListener("click", () => addBreak(15));
els.btnBreak30.addEventListener("click", () => addBreak(30));
els.btnBreak60.addEventListener("click", () => addBreak(60));
els.btnClear.addEventListener("click", clearAll);
els.btnExport.addEventListener("click", exportJson);
els.btnSeedDemo.addEventListener("click", seedDemo);

setInterval(() => renderTotals(loadState()), 15000);
render(loadState());
