"use strict";
const APP_VERSION = "1.1.0";
const STORAGE_KEY = "tt_v1";
const LAST_BACKUP_KEY = "tt_last_backup_ts";
const LAST_IMPORT_KEY = "tt_last_import_ts";
const EDIT_MODE_KEY = "tt_edit_mode";
const BACKUP_MODE_KEY = "tt_backup_mode";
const LAST_AUTO_BACKUP_KEY = "tt_last_auto_backup_ts";
const BACKUP_FILE_NAME_KEY = "tt_backup_file_name";
const BACKUP_FILE_HANDLE_KEY = "tt_backup_file_handle";
const BACKUP_CAPABILITY_STATE_KEY = "tt_backup_capability_state";
const BREAK_PLAN_MINUTES = [15, 30, 15];
const BACKUP_MODE_LOCAL_ONLY = "local_only";
const BACKUP_MODE_AUTO_FILE = "auto_file";
const AUTO_BACKUP_DEBOUNCE_MS = 750;

const els = {
  // header
  todayLabel: document.getElementById("todayLabel"),

  // Refresh App after new version available
  updateBanner: document.getElementById("updateBanner"),
  btnRefreshApp: document.getElementById("btnRefreshApp"),
  appVersionLabel: document.getElementById("appVersionLabel"),
  // tabs
  tabDashboard: document.getElementById("tabDashboard"),
  tabLogs: document.getElementById("tabLogs"),
  tabSettings: document.getElementById("tabSettings"),
  dashboardPanel: document.getElementById("dashboardPanel"),
  logsPanel: document.getElementById("logsPanel"),
  settingsPanel: document.getElementById("settingsPanel"),

  // dashboard
  bigTimer: document.getElementById("bigTimer"),
  statusText: document.getElementById("statusText"),
  activeSessionText: document.getElementById("activeSessionText"),
  breakStatusText: document.getElementById("breakStatusText"),
  breakSkipSummary: document.getElementById("breakSkipSummary"),
  breakCountdownWrap: document.getElementById("breakCountdownWrap"),
  breakCountdownLabel: document.getElementById("breakCountdownLabel"),
  breakCountdownValue: document.getElementById("breakCountdownValue"),

  todayGross: document.getElementById("todayGross"),
  todayBreaks: document.getElementById("todayBreaks"),
  todayNet: document.getElementById("todayNet"),
  weekNet: document.getElementById("weekNet"),
  monthNet: document.getElementById("monthNet"),

  // logs (now in Logs tab)
  log: document.getElementById("log"),
  logFilterType: document.getElementById("logFilterType"),
  logFilterSource: document.getElementById("logFilterSource"),
  logFilterDate: document.getElementById("logFilterDate"),
  logFilterNotes: document.getElementById("logFilterNotes"),
  btnClearLogFilters: document.getElementById("btnClearLogFilters"),
  logsEditModeBanner: document.getElementById("logsEditModeBanner"),

  // controls
  btnClockIn: document.getElementById("btnClockIn"),
  btnClockOut: document.getElementById("btnClockOut"),
  btnStartBreak: document.getElementById("btnStartBreak"),
  btnEndBreak: document.getElementById("btnEndBreak"),
  btnSkipBreak: document.getElementById("btnSkipBreak"),
  skipBreakModal: document.getElementById("skipBreakModal"),
  skipBreakModalBackdrop: document.getElementById("skipBreakModalBackdrop"),
  skipBreakModalBody: document.getElementById("skipBreakModalBody"),
  btnCancelSkipBreak: document.getElementById("btnCancelSkipBreak"),
  btnConfirmSkipBreak: document.getElementById("btnConfirmSkipBreak"),
  appToast: document.getElementById("appToast"),
  btnClearSession: document.getElementById("btnClearSession"),
  btnClearLogs: document.getElementById("btnClearLogs"),
  btnAddManualLog: document.getElementById("btnAddManualLog"),
  btnCancelManual: document.getElementById("btnCancelManual"),
  btnShareWeek: document.getElementById("btnShareWeek"),
  btnCopyWeek: document.getElementById("btnCopyWeek"),
  shareFeedback: document.getElementById("shareFeedback"),
  btnToggleFormat: document.getElementById("btnToggleFormat"),
  skipBreakTarget: document.getElementById("skipBreakTarget"),

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

  btnExportBackup: document.getElementById("btnExportBackup"),
  btnImportBackup: document.getElementById("btnImportBackup"),
  importBackupInput: document.getElementById("importBackupInput"),
  lastBackupLabel: document.getElementById("lastBackupLabel"),
  lastImportLabel: document.getElementById("lastImportLabel"),
  backupModeSelect: document.getElementById("backupModeSelect"),
  backupDestinationLabel: document.getElementById("backupDestinationLabel"),
  btnChooseBackupFile: document.getElementById("btnChooseBackupFile"),
  btnRunBackupNow: document.getElementById("btnRunBackupNow"),
  btnResetBackupStorage: document.getElementById("btnResetBackupStorage"),
  lastAutoBackupLabel: document.getElementById("lastAutoBackupLabel"),
  autoBackupStatusLabel: document.getElementById("autoBackupStatusLabel"),
  editModeToggle: document.getElementById("editModeToggle"),
  editModeState: document.getElementById("editModeState"),
  logEditorModal: document.getElementById("logEditorModal"),
  logEditorBackdrop: document.getElementById("logEditorBackdrop"),
  logEditorForm: document.getElementById("logEditorForm"),
  logEditorType: document.getElementById("logEditorType"),
  logEditorDate: document.getElementById("logEditorDate"),
  logEditorSessionTypeWrap: document.getElementById("logEditorSessionTypeWrap"),
  logEditorSessionType: document.getElementById("logEditorSessionType"),
  logEditorStart: document.getElementById("logEditorStart"),
  logEditorEndWrap: document.getElementById("logEditorEndWrap"),
  logEditorEnd: document.getElementById("logEditorEnd"),
  logEditorNotes: document.getElementById("logEditorNotes"),
  logEditorMeta: document.getElementById("logEditorMeta"),
  logEditorError: document.getElementById("logEditorError"),
  btnCloseLogEditor: document.getElementById("btnCloseLogEditor"),
  btnCancelLogEdit: document.getElementById("btnCancelLogEdit"),
};

// ---------------------------
// State
// ---------------------------
function defaultState() {
  return {
    sessions: [], // { id, startMs, endMs|null }
    breaks: [], // { id, startMs, endMs|null, plannedMinutes, sequence }
    auditLogs: [], // { id, kind, timestampMs, message, notes, breakSequence, endedActiveBreak, manual }
    skippedBreaksByDate: {}, // { YYYY-MM-DD: [bool,bool,bool] }
  };
}



function sanitizeSkippedBreaksByDate(raw) {
  if (!raw || typeof raw !== "object") return {};

  const clean = {};
  for (const [dateKey, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    clean[dateKey] = BREAK_PLAN_MINUTES.map((_, idx) => value[idx] === true);
  }
  return clean;
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
      auditLogs: (Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []).map((item) => ({
        id: item.id || makeLogId(),
        kind: item.kind || "audit",
        timestampMs: Number.isFinite(item.timestampMs) ? item.timestampMs : nowMs(),
        message: typeof item.message === "string" ? item.message : "",
        notes: typeof item.notes === "string" ? item.notes : "",
        breakSequence: Number.isFinite(item.breakSequence) ? item.breakSequence : null,
        endedActiveBreak: item.endedActiveBreak === true,
        manual: item.manual === true,
        createdAt: Number.isFinite(item.createdAt) ? item.createdAt : (Number.isFinite(item.timestampMs) ? item.timestampMs : nowMs()),
      })),
      skippedBreaksByDate: sanitizeSkippedBreaksByDate(parsed?.skippedBreaksByDate),
    };
    return next;
  } catch {
    return defaultState();
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function loadEditMode() {
  try {
    const storedValue = localStorage.getItem(EDIT_MODE_KEY);
    return storedValue === "1" || storedValue === "true";
  } catch {
    return false;
  }
}

function saveEditMode(enabled) {
  localStorage.setItem(EDIT_MODE_KEY, enabled ? "1" : "0");
}

function getEditModeEnabled() {
  return editModeEnabled === true;
}

let state = loadState();
let displayMode = "time"; // "time" or "decimal"
let editModeEnabled = loadEditMode();
const logFilters = { type: "all", source: "all", date: "", notes: "" };
let pendingSkipBreakSequence = null;
let skipBreakSubmitInFlight = false;
let toastTimeoutId = null;
let logEditorState = null;
let autoBackupTimeoutId = null;
let backupFileHandle = null;

function loadBackupMode() {
  const stored = localStorage.getItem(BACKUP_MODE_KEY);
  return stored === BACKUP_MODE_AUTO_FILE ? BACKUP_MODE_AUTO_FILE : BACKUP_MODE_LOCAL_ONLY;
}

function loadBackupFileName() {
  return localStorage.getItem(BACKUP_FILE_NAME_KEY) || "";
}

function supportsAutomaticBackup() {
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}

function getDefaultBackupCapabilityState() {
  if (!supportsAutomaticBackup()) return "unsupported";
  if (loadBackupFileName()) return "permission_needed";
  return "ready";
}

function loadBackupCapabilityState() {
  const stored = localStorage.getItem(BACKUP_CAPABILITY_STATE_KEY);
  if (stored) return stored;
  return getDefaultBackupCapabilityState();
}

let backupMode = loadBackupMode();
let backupFileName = loadBackupFileName();
let backupCapabilityState = loadBackupCapabilityState();

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

function minutesFromMs(ms) {
  return Math.max(0, ms / 60000);
}

function formatMinutes(minutes) {
  if (displayMode === "decimal") {
    const decimalHours = minutes / 60;
    return decimalHours.toFixed(2);
  }

  const totalMinutes = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
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

function fmtLogStamp(ms) {
  const d = new Date(ms);
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dateStr} ${timeStr}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateInputValue(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeInputValue(ms) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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

function getBreakShortLabel(sequence) {
  if (sequence === 1) return "Break 1";
  if (sequence === 2) return "Break 2 (Lunch)";
  if (sequence === 3) return "Break 3";
  return `Break ${sequence}`;
}

function getBreakPromptLabel(sequence) {
  const minutes = BREAK_PLAN_MINUTES[sequence - 1];
  return `Break ${sequence} - ${minutes}m`;
}

function showToast(message) {
  if (!els.appToast) return;
  if (toastTimeoutId) clearTimeout(toastTimeoutId);

  els.appToast.textContent = message;
  els.appToast.hidden = false;
  els.appToast.classList.add("is-visible");

  toastTimeoutId = setTimeout(() => {
    els.appToast.classList.remove("is-visible");
    els.appToast.hidden = true;
    toastTimeoutId = null;
  }, 1800);
}

function getDateKey(ms = nowMs()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildBackupPayload() {
  return {
    meta: {
      app: "Time Tracker",
      exportedAt: new Date().toISOString(),
      storageKey: STORAGE_KEY,
      version: 1,
    },
    data: JSON.parse(JSON.stringify(state)),
  };
}

function setBackupCapabilityState(nextState) {
  backupCapabilityState = nextState;
  localStorage.setItem(BACKUP_CAPABILITY_STATE_KEY, nextState);
  renderAutomaticBackupSettings();
}

function setBackupMode(nextMode) {
  backupMode = nextMode === BACKUP_MODE_AUTO_FILE ? BACKUP_MODE_AUTO_FILE : BACKUP_MODE_LOCAL_ONLY;
  localStorage.setItem(BACKUP_MODE_KEY, backupMode);
  renderAutomaticBackupSettings();
}

function setBackupFileName(nextName) {
  backupFileName = nextName || "";
  if (backupFileName) {
    localStorage.setItem(BACKUP_FILE_NAME_KEY, backupFileName);
  } else {
    localStorage.removeItem(BACKUP_FILE_NAME_KEY);
  }

  // File handles are not safely serializable into localStorage.
  localStorage.removeItem(BACKUP_FILE_HANDLE_KEY);
  renderAutomaticBackupSettings();
}

function canUseAutomaticBackup() {
  return supportsAutomaticBackup() && backupMode === BACKUP_MODE_AUTO_FILE && !!backupFileHandle;
}

async function ensureBackupWritePermission(fileHandle) {
  if (!fileHandle) return false;

  if (typeof fileHandle.queryPermission === "function") {
    const current = await fileHandle.queryPermission({ mode: "readwrite" });
    if (current === "granted") return true;
  }

  if (typeof fileHandle.requestPermission === "function") {
    const requested = await fileHandle.requestPermission({ mode: "readwrite" });
    return requested === "granted";
  }

  return true;
}

function scheduleAutomaticBackup() {
  if (autoBackupTimeoutId) {
    clearTimeout(autoBackupTimeoutId);
  }

  if (backupMode !== BACKUP_MODE_AUTO_FILE) return;

  autoBackupTimeoutId = setTimeout(() => {
    autoBackupTimeoutId = null;
    runAutomaticBackup().catch((error) => {
      console.error("Automatic backup failed:", error);
    });
  }, AUTO_BACKUP_DEBOUNCE_MS);
}

async function runAutomaticBackup({ manualTrigger = false } = {}) {
  if (!supportsAutomaticBackup()) {
    setBackupCapabilityState("unsupported");
    if (manualTrigger) showToast("Automatic backup is unavailable on this browser.");
    return { ok: false, error: "unsupported" };
  }

  if (!backupFileHandle) {
    setBackupCapabilityState("permission_needed");
    if (manualTrigger) showToast("Choose a backup file to enable automatic backups.");
    return { ok: false, error: "missing_handle" };
  }

  try {
    const hasPermission = await ensureBackupWritePermission(backupFileHandle);
    if (!hasPermission) {
      setBackupCapabilityState("permission_needed");
      if (manualTrigger) showToast("Backup file permission is needed.");
      return { ok: false, error: "permission_denied" };
    }

    const writable = await backupFileHandle.createWritable();
    await writable.write(JSON.stringify(buildBackupPayload(), null, 2));
    await writable.close();

    const timestamp = String(Date.now());
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, timestamp);
    setBackupFileName(backupFileHandle.name || backupFileName);
    setBackupCapabilityState("ready");
    renderLastAutomaticBackup();

    if (manualTrigger) showToast("Backup written successfully.");
    return { ok: true };
  } catch (error) {
    console.error("Automatic backup failed:", error);
    const needsPermission = error && (error.name === "NotAllowedError" || error.name === "SecurityError" || error.name === "InvalidStateError");
    setBackupCapabilityState(needsPermission ? "permission_needed" : "error");
    if (manualTrigger) {
      showToast(needsPermission ? "Backup file permission is needed." : "Automatic backup failed.");
    }
    return { ok: false, error: error?.message || "write_failed" };
  }
}

async function chooseBackupFile() {
  if (!supportsAutomaticBackup()) {
    setBackupCapabilityState("unsupported");
    showToast("Automatic backup is unavailable on this browser.");
    return;
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: backupFileName || buildBackupFilename(new Date()),
      types: [{
        description: "Time Tracker Backup",
        accept: { "application/json": [".json"] },
      }],
    });

    if (!handle) return;

    backupFileHandle = handle;
    setBackupFileName(handle.name || "");
    setBackupCapabilityState("ready");
    renderAutomaticBackupSettings();
    showToast("Backup destination selected.");
  } catch (error) {
    if (error && error.name === "AbortError") return;
    console.error("Unable to choose backup file:", error);
    setBackupCapabilityState("error");
    showToast("Unable to choose a backup file.");
  }
}

function resetBackupPreferences() {
  if (autoBackupTimeoutId) {
    clearTimeout(autoBackupTimeoutId);
    autoBackupTimeoutId = null;
  }

  backupFileHandle = null;
  setBackupMode(BACKUP_MODE_LOCAL_ONLY);
  setBackupFileName("");
  localStorage.removeItem(LAST_AUTO_BACKUP_KEY);
  setBackupCapabilityState(supportsAutomaticBackup() ? "ready" : "unsupported");
  renderLastAutomaticBackup();
}

function ensureSkippedBreaksForDate(dateKey = getDateKey()) {
  if (!state.skippedBreaksByDate || typeof state.skippedBreaksByDate !== "object") {
    state.skippedBreaksByDate = {};
  }

  if (!Array.isArray(state.skippedBreaksByDate[dateKey])) {
    state.skippedBreaksByDate[dateKey] = BREAK_PLAN_MINUTES.map(() => false);
  }

  state.skippedBreaksByDate[dateKey] = BREAK_PLAN_MINUTES.map((_, idx) => state.skippedBreaksByDate[dateKey][idx] === true);
  return state.skippedBreaksByDate[dateKey];
}

function getSkippedBreaksForDate(dateKey = getDateKey()) {
  const skipped = ensureSkippedBreaksForDate(dateKey);
  return [...skipped];
}

function cleanupSkippedBreaks(todayKey = getDateKey()) {
  const previous = JSON.stringify(state.skippedBreaksByDate || {});
  if (!state.skippedBreaksByDate || typeof state.skippedBreaksByDate !== "object") {
    state.skippedBreaksByDate = {};
  }
  state.skippedBreaksByDate = { [todayKey]: ensureSkippedBreaksForDate(todayKey) };
  return JSON.stringify(state.skippedBreaksByDate) !== previous;
}

function getCompletedBreakSequencesForDate(d) {
  const dayStart = startOfDayMs(d);
  const dayEnd = endOfDayMs(d);
  const completed = new Set();

  for (const b of state.breaks) {
    if (b.startMs < dayStart || b.startMs > dayEnd) continue;
    if (!Number.isFinite(b.sequence)) continue;
    if (b.endMs == null) continue;
    completed.add(b.sequence);
  }

  return completed;
}

function getNextBreakSequence(d = new Date()) {
  const completed = getCompletedBreakSequencesForDate(d);
  const skipped = getSkippedBreaksForDate(getDateKey(d.getTime()));

  for (let sequence = 1; sequence <= BREAK_PLAN_MINUTES.length; sequence += 1) {
    if (completed.has(sequence)) continue;
    if (skipped[sequence - 1]) continue;
    return sequence;
  }

  return null;
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

function setEditMode(enabled) {
  const nextValue = enabled === true;

  if (!nextValue && logEditorState) {
    const closed = closeLogEditor();
    if (!closed) {
      if (els.editModeToggle) {
        els.editModeToggle.checked = true;
      }
      renderEditModeUI();
      return;
    }
  }

  if (els.editModeToggle) {
    els.editModeToggle.checked = nextValue;
  }

  editModeEnabled = nextValue;
  saveEditMode(editModeEnabled);
  renderEditModeUI();
  renderLogs();
}

function renderEditModeUI() {
  const isEnabled = getEditModeEnabled();

  if (els.editModeToggle) {
    els.editModeToggle.checked = isEnabled;
  }

  if (els.editModeState) {
    els.editModeState.textContent = isEnabled ? "ON" : "OFF";
    els.editModeState.classList.toggle("is-on", isEnabled);
  }

  if (els.logsEditModeBanner) {
    els.logsEditModeBanner.hidden = !isEnabled;
  }
}

function canEditLogItem(item) {
  if (!item) return false;

  if (item.kind === "audit") {
    return (item.auditKind || item.kindValue || "") === "break_skip" && Number.isFinite(item.timestampMs);
  }

  if (item.kind !== "work" && item.kind !== "break") return false;
  if (!Number.isFinite(item.startMs) || !Number.isFinite(item.endMs)) return false;
  return item.endMs > item.startMs;
}

function getLogEditorItem(logId, kind) {
  if (kind === "work") {
    return state.sessions.find((item) => item.id === logId) || null;
  }

  if (kind === "break") {
    return state.breaks.find((item) => item.id === logId) || null;
  }

  if (kind === "audit") {
    return (Array.isArray(state.auditLogs) ? state.auditLogs : []).find((item) => item.id === logId) || null;
  }

  return null;
}

function getLogEntryTypeLabel(item) {
  if (item.kind === "work") return "Work session";
  if (item.kind === "break") return getBreakLabel(item.sequence);
  if (item.kind === "audit" && item.auditKind === "break_skip") return "Break skipped";
  if (item.kind === "audit") return "Audit record";
  return "Log entry";
}

function getLogEditorSnapshot() {
  return JSON.stringify({
    date: els.logEditorDate?.value || "",
    sessionType: els.logEditorSessionType?.value || "",
    start: els.logEditorStart?.value || "",
    end: els.logEditorEnd?.value || "",
    notes: els.logEditorNotes?.value || "",
  });
}

function isLogEditorDirty() {
  if (!logEditorState) return false;
  return getLogEditorSnapshot() !== logEditorState.initialSnapshot;
}

function populateLogEditor(item) {
  if (!item) return;

  els.logEditorType.textContent = getLogEntryTypeLabel(item);
  els.logEditorDate.value = formatDateInputValue(item.startMs);
  els.logEditorStart.value = formatTimeInputValue(item.startMs);
  const isSkippedBreakAudit = item.kind === "audit" && item.auditKind === "break_skip";
  if (els.logEditorSessionTypeWrap) {
    els.logEditorSessionTypeWrap.hidden = !isSkippedBreakAudit;
  }
  if (els.logEditorSessionType) {
    els.logEditorSessionType.value = `break_${Number.isFinite(item.breakSequence) ? item.breakSequence : 1}`;
  }
  if (els.logEditorEndWrap) {
    els.logEditorEndWrap.hidden = isSkippedBreakAudit;
  }
  if (els.logEditorEnd) {
    els.logEditorEnd.required = !isSkippedBreakAudit;
    els.logEditorEnd.disabled = isSkippedBreakAudit;
    els.logEditorEnd.value = isSkippedBreakAudit ? "" : formatTimeInputValue(item.endMs);
  }
  els.logEditorNotes.value = isSkippedBreakAudit ? (item.notes || "") : (item.notes || "");
  els.logEditorError.textContent = "";

  if (isSkippedBreakAudit) {
    const metaBits = [
      `System note: ${item.message || "Break skipped"}`,
      `Ended active break: ${item.endedActiveBreak === true ? "Yes" : "No"}`,
    ];
    els.logEditorMeta.innerHTML = `<div class="muted">${escapeHtml(metaBits.join(" • "))}</div>`;
  } else if (item.kind === "break") {
    const metaBits = [
      `Sequence: ${Number.isFinite(item.sequence) ? item.sequence : "—"}`,
      `Planned: ${Number.isFinite(item.plannedMinutes) ? `${item.plannedMinutes}m` : "—"}`,
      `Paid: ${item.isPaidBreak === false ? "No" : "Yes"}`,
    ];
    els.logEditorMeta.innerHTML = `<div class="muted">${metaBits.join(" • ")}</div>`;
  } else {
    els.logEditorMeta.innerHTML = `<div class="muted">Entry type: ${escapeHtml(getLogEntryTypeLabel(item))}</div>`;
  }

  logEditorState = {
    id: item.id,
    kind: item.kind,
    auditKind: item.auditKind || "",
    initialSnapshot: "",
  };
  logEditorState.initialSnapshot = getLogEditorSnapshot();
}

function openLogEditor(logId, kind) {
  if (!editModeEnabled) return;

  const item = getLogEditorItem(logId, kind);
  const editorItem = { ...item, kind, auditKind: kind === "audit" ? item?.kind : "" };
  if (!item || !canEditLogItem(editorItem)) return;

  populateLogEditor(editorItem);
  els.logEditorModal.hidden = false;
  els.logEditorModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    els.logEditorDate?.focus();
  });
}

function closeLogEditor(options = {}) {
  const { force = false } = options;

  if (!els.logEditorModal || els.logEditorModal.hidden) {
    logEditorState = null;
    return true;
  }

  if (!force && isLogEditorDirty()) {
    const shouldDiscard = window.confirm("Discard your unsaved log edits?");
    if (!shouldDiscard) return false;
  }

  els.logEditorModal.hidden = true;
  els.logEditorModal.setAttribute("aria-hidden", "true");
  els.logEditorError.textContent = "";
  els.logEditorForm?.reset();
  if (els.logEditorMeta) els.logEditorMeta.innerHTML = "";
  logEditorState = null;
  return true;
}

function validateLogEdit(formData, originalItem) {
  const dateValue = String(formData.date || "").trim();
  const sessionTypeValue = String(formData.sessionType || "").trim();
  const startValue = String(formData.start || "").trim();
  const endValue = String(formData.end || "").trim();
  const notes = String(formData.notes || "");

  const isSkippedBreakAudit = originalItem?.kind === "audit" && originalItem?.kindValue === "break_skip";
  if (!dateValue || !startValue || (!isSkippedBreakAudit && !endValue)) {
    return { ok: false, error: isSkippedBreakAudit ? "Date and start time are required." : "Date, start time, and end time are required." };
  }

  const startMs = parseDateTimeToMs(dateValue, startValue);
  const endMs = isSkippedBreakAudit ? startMs : parseDateTimeToMs(dateValue, endValue);

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { ok: false, error: "Please enter a valid date and time." };
  }

  if (!isSkippedBreakAudit && endMs <= startMs) {
    return { ok: false, error: "End time must be after start time." };
  }

  if (!originalItem || !canEditLogItem(originalItem)) {
    return { ok: false, error: "This log entry cannot be edited safely." };
  }

  if (isSkippedBreakAudit) {
    const meta = getManualTypeMeta(sessionTypeValue);
    if (!meta || meta.kind !== "break") {
      return { ok: false, error: "Please choose a valid skipped-break type." };
    }

    return {
      ok: true,
      updates: {
        timestampMs: startMs,
        breakSequence: meta.sequence,
        notes,
        message: `${getBreakShortLabel(meta.sequence)} skipped${originalItem.endedActiveBreak ? " and active break ended" : ""}`,
      },
    };
  }

  return {
    ok: true,
    updates: {
      startMs,
      endMs,
      notes,
    },
  };
}

function updateLogEntryInState(kind, id, updates) {
  const collection = kind === "work"
    ? state.sessions
    : (kind === "break" ? state.breaks : state.auditLogs);
  const index = collection.findIndex((item) => item.id === id);
  if (index === -1) return null;

  collection[index] = {
    ...collection[index],
    ...updates,
  };

  return collection[index];
}

function rerenderAfterLogEdit(logId) {
  saveState(state);
  scheduleAutomaticBackup();
  renderAll();

  requestAnimationFrame(() => {
    const row = document.querySelector(`[data-log-id="${CSS.escape(logId)}"]`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function saveLogEdit(evt) {
  evt.preventDefault();
  if (!logEditorState) return;

  const originalItem = getLogEditorItem(logEditorState.id, logEditorState.kind);
  const validation = validateLogEdit({
    date: els.logEditorDate.value,
    sessionType: els.logEditorSessionType?.value || "",
    start: els.logEditorStart.value,
    end: els.logEditorEnd.value,
    notes: els.logEditorNotes.value,
  }, originalItem ? {
    ...originalItem,
    kind: logEditorState.kind,
    kindValue: logEditorState.auditKind || originalItem.kind,
  } : null);

  if (!validation.ok) {
    els.logEditorError.textContent = validation.error;
    return;
  }

  const updated = updateLogEntryInState(logEditorState.kind, logEditorState.id, validation.updates);
  if (!updated) {
    els.logEditorError.textContent = "Unable to save this log entry.";
    return;
  }

  const editedId = logEditorState.id;
  closeLogEditor({ force: true });
  rerenderAfterLogEdit(editedId);
  showToast("Log entry updated.");
}

// ---------------------------
// Tabs
// ---------------------------
function setTab(name) {
  const isDash = name === "dashboard";
  const isLogs = name === "logs";
  const isSettings = name === "settings";

  els.tabDashboard?.classList.toggle("is-active", isDash);
  els.tabLogs?.classList.toggle("is-active", isLogs);
  els.tabSettings?.classList.toggle("is-active", isSettings);

  els.tabDashboard?.setAttribute("aria-selected", isDash ? "true" : "false");
  els.tabLogs?.setAttribute("aria-selected", isLogs ? "true" : "false");
  els.tabSettings?.setAttribute("aria-selected", isSettings ? "true" : "false");

  els.dashboardPanel?.classList.toggle("is-active", isDash);
  els.logsPanel?.classList.toggle("is-active", isLogs);
  els.settingsPanel?.classList.toggle("is-active", isSettings);

  renderEditModeUI();

  if (isLogs) {
    renderLogs();
  }

  if (isSettings) {
    renderAutomaticBackupSettings();
    renderLastAutomaticBackup();
    renderLastBackup();
    renderLastImport();
  }
}

let tabListenersAttached = false;

function attachTabListeners() {
  if (tabListenersAttached) return;

  els.tabDashboard?.addEventListener("click", () => setTab("dashboard"));
  els.tabLogs?.addEventListener("click", () => setTab("logs"));
  els.tabSettings?.addEventListener("click", () => setTab("settings"));

  tabListenersAttached = true;
}

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
  scheduleAutomaticBackup();
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
  scheduleAutomaticBackup();
  renderAll();
}

function startBreak() {
  const activeSession = getActiveSession();
  if (!activeSession) return;

  const activeBreak = getActiveBreak(activeSession.id);
  if (activeBreak) return;

  const sequence = getNextBreakSequence(new Date());
  if (sequence == null) return;

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
  scheduleAutomaticBackup();
  renderAll();
}

function endBreak() {
  const activeSession = getActiveSession();
  if (!activeSession) return;

  const activeBreak = getActiveBreak(activeSession.id);
  if (!activeBreak) return;

  activeBreak.endMs = nowMs();
  saveState(state);
  scheduleAutomaticBackup();
  renderAll();
}

function applySkipBreak(selectedSequence) {
  const activeSession = getActiveSession();
  if (!activeSession) return;

  const dateKey = getDateKey();
  const skipped = ensureSkippedBreaksForDate(dateKey);
  const completed = getCompletedBreakSequencesForDate(new Date());

  if (!Number.isFinite(selectedSequence) || selectedSequence < 1 || selectedSequence > BREAK_PLAN_MINUTES.length) return;
  if (completed.has(selectedSequence)) return;
  if (skipped[selectedSequence - 1]) return;

  const activeBreak = getActiveBreak(activeSession.id);
  let endedActiveBreak = false;
  if (activeBreak && activeBreak.sequence === selectedSequence) {
    activeBreak.endMs = nowMs();
    endedActiveBreak = true;
  }

  skipped[selectedSequence - 1] = true;

  state.auditLogs.push({
    id: makeLogId(),
    kind: "break_skip",
    timestampMs: nowMs(),
    breakSequence: selectedSequence,
    endedActiveBreak,
    manual: false,
    message: `${getBreakShortLabel(selectedSequence)} skipped${endedActiveBreak ? " and active break ended" : ""}`,
    createdAt: nowMs(),
  });

  cleanupSkippedBreaks(dateKey);
  saveState(state);
  scheduleAutomaticBackup();
  renderAll();
}

function resolveSkipBreakSelection() {
  const selectedValue = els.skipBreakTarget?.value || "next";
  return selectedValue === "next" ? getNextBreakSequence(new Date()) : Number(selectedValue);
}

function openSkipBreakModal(sequence) {
  pendingSkipBreakSequence = sequence;
  els.skipBreakModalBody.textContent = `You are about to skip ${getBreakPromptLabel(sequence)} for today.`;
  els.skipBreakModal.hidden = false;
  els.skipBreakModal.setAttribute("aria-hidden", "false");
  els.btnConfirmSkipBreak.disabled = false;
}

function closeSkipBreakModal() {
  pendingSkipBreakSequence = null;
  skipBreakSubmitInFlight = false;
  els.skipBreakModal.hidden = true;
  els.skipBreakModal.setAttribute("aria-hidden", "true");
  els.btnConfirmSkipBreak.disabled = false;
}

function promptSkipBreak() {
  const activeSession = getActiveSession();
  if (!activeSession) return;

  const selectedSequence = resolveSkipBreakSelection();
  if (!Number.isFinite(selectedSequence)) {
    showToast("No breaks left to skip today");
    return;
  }

  const dateKey = getDateKey();
  const skipped = ensureSkippedBreaksForDate(dateKey);
  if (skipped[selectedSequence - 1]) {
    showToast(`Break ${selectedSequence} was already skipped today`);
    return;
  }

  openSkipBreakModal(selectedSequence);
}

function confirmSkipBreak() {
  if (skipBreakSubmitInFlight || !Number.isFinite(pendingSkipBreakSequence)) return;
  skipBreakSubmitInFlight = true;
  els.btnConfirmSkipBreak.disabled = true;

  const selectedSequence = pendingSkipBreakSequence;
  const dateKey = getDateKey();
  const skipped = ensureSkippedBreaksForDate(dateKey);

  if (skipped[selectedSequence - 1]) {
    closeSkipBreakModal();
    showToast(`Break ${selectedSequence} was already skipped today`);
    return;
  }

  applySkipBreak(selectedSequence);
  closeSkipBreakModal();
  showToast(`Break ${selectedSequence} skipped`);
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
  scheduleAutomaticBackup();
  closeLogEditor({ force: true });
  renderAll();
}

function clearLogs() {
  state.sessions = [];
  state.breaks = [];
  state.auditLogs = [];
  saveState(state);
  scheduleAutomaticBackup();
  closeLogEditor({ force: true });
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
  scheduleAutomaticBackup();
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
els.btnSkipBreak?.addEventListener("click", promptSkipBreak);
els.btnCancelSkipBreak?.addEventListener("click", closeSkipBreakModal);
els.btnConfirmSkipBreak?.addEventListener("click", confirmSkipBreak);
els.skipBreakModalBackdrop?.addEventListener("click", closeSkipBreakModal);
document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && els.skipBreakModal && !els.skipBreakModal.hidden) {
    closeSkipBreakModal();
    return;
  }

  if (evt.key === "Escape" && els.logEditorModal && !els.logEditorModal.hidden) {
    closeLogEditor();
  }
});
els.btnClearSession.addEventListener("click", clearCurrentSession);
els.btnClearLogs.addEventListener("click", clearLogs);
els.btnShareWeek?.addEventListener("click", shareWeeklyHours);
els.btnCopyWeek?.addEventListener("click", copyWeeklyHoursToClipboard);
els.btnToggleFormat?.addEventListener("click", () => {
  displayMode = displayMode === "time" ? "decimal" : "time";

  const btn = els.btnToggleFormat;
  if (btn) {
    btn.textContent = displayMode === "time" ? "View: HH:MM" : "View: Decimal";
  }

  updateUI();
});
els.btnExportBackup?.addEventListener("click", exportBackup);
els.btnImportBackup?.addEventListener("click", () => {
  els.importBackupInput?.click();
});
els.importBackupInput?.addEventListener("change", importBackupFromFile);
els.backupModeSelect?.addEventListener("change", (evt) => {
  const target = evt.target;
  if (!(target instanceof HTMLSelectElement)) return;

  if (target.value === BACKUP_MODE_AUTO_FILE && !supportsAutomaticBackup()) {
    target.value = BACKUP_MODE_LOCAL_ONLY;
    setBackupMode(BACKUP_MODE_LOCAL_ONLY);
    setBackupCapabilityState("unsupported");
    showToast("Automatic backup is unavailable on this browser.");
    return;
  }

  setBackupMode(target.value);

  if (backupMode === BACKUP_MODE_AUTO_FILE) {
    setBackupCapabilityState(backupFileHandle ? "ready" : "permission_needed");
  } else {
    setBackupCapabilityState(supportsAutomaticBackup() ? "ready" : "unsupported");
  }
});
els.btnChooseBackupFile?.addEventListener("click", () => {
  chooseBackupFile();
});
els.btnRunBackupNow?.addEventListener("click", () => {
  runAutomaticBackup({ manualTrigger: true });
});
els.btnResetBackupStorage?.addEventListener("click", () => {
  resetBackupPreferences();
  showToast("Automatic backup reset to default local storage.");
});
els.editModeToggle?.addEventListener("change", (evt) => {
  const target = evt.target;
  if (!(target instanceof HTMLInputElement)) return;
  setEditMode(target.checked);
});
els.btnAddManualLog?.addEventListener("click", openManualForm);
els.btnCancelManual?.addEventListener("click", closeManualForm);
els.manualLogForm?.addEventListener("submit", saveManualLog);
els.logEditorForm?.addEventListener("submit", saveLogEdit);
els.btnCancelLogEdit?.addEventListener("click", () => closeLogEditor());
els.btnCloseLogEditor?.addEventListener("click", () => closeLogEditor());
els.logEditorBackdrop?.addEventListener("click", () => closeLogEditor());
els.manualType?.addEventListener("change", updateManualFormMeta);
els.manualDate?.addEventListener("input", updateManualFormMeta);
els.manualStart?.addEventListener("input", updateManualFormMeta);
els.manualEnd?.addEventListener("input", updateManualFormMeta);
els.logFilterType?.addEventListener("change", (evt) => {
  logFilters.type = evt.target.value;
  renderLogs();
});
els.logFilterSource?.addEventListener("change", (evt) => {
  logFilters.source = evt.target.value;
  renderLogs();
});
els.logFilterDate?.addEventListener("change", (evt) => {
  logFilters.date = evt.target.value;
  renderLogs();
});
els.logFilterNotes?.addEventListener("input", (evt) => {
  logFilters.notes = evt.target.value;
  renderLogs();
});
els.btnClearLogFilters?.addEventListener("click", () => {
  logFilters.type = "all";
  logFilters.source = "all";
  logFilters.date = "";
  logFilters.notes = "";

  if (els.logFilterType) els.logFilterType.value = "all";
  if (els.logFilterSource) els.logFilterSource.value = "all";
  if (els.logFilterDate) els.logFilterDate.value = "";
  if (els.logFilterNotes) els.logFilterNotes.value = "";

  renderLogs();
});
els.log?.addEventListener("click", (evt) => {
  const target = evt.target;
  if (!(target instanceof HTMLElement)) return;
  const editButton = target.closest("[data-edit-log-id]");
  if (editButton instanceof HTMLElement) {
    openLogEditor(editButton.dataset.editLogId, editButton.dataset.editLogKind);
    return;
  }
  const id = target.dataset.deleteManualId;
  if (!id) return;
  if (!window.confirm("Delete this manual log?")) return;

  const beforeSessions = state.sessions.length;
  const beforeBreaks = state.breaks.length;
  state.sessions = state.sessions.filter((entry) => !(entry.id === id && entry.manual));
  state.breaks = state.breaks.filter((entry) => !(entry.id === id && entry.manual));

  if (state.sessions.length === beforeSessions && state.breaks.length === beforeBreaks) return;

  saveState(state);
  scheduleAutomaticBackup();
  renderAll();
});

function renderLastBackup() {
  if (!els.lastBackupLabel) return;

  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) {
    els.lastBackupLabel.textContent = "Never";
    return;
  }

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) {
    els.lastBackupLabel.textContent = "Never";
    return;
  }

  const formatted = new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  els.lastBackupLabel.textContent = formatted;
}

function renderLastImport() {
  if (!els.lastImportLabel) return;

  const raw = localStorage.getItem(LAST_IMPORT_KEY);
  if (!raw) {
    els.lastImportLabel.textContent = "Never";
    return;
  }

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) {
    els.lastImportLabel.textContent = "Never";
    return;
  }

  const formatted = new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  els.lastImportLabel.textContent = formatted;
}

function renderLastAutomaticBackup() {
  if (!els.lastAutoBackupLabel) return;

  const raw = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
  if (!raw) {
    els.lastAutoBackupLabel.textContent = "Never";
    return;
  }

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) {
    els.lastAutoBackupLabel.textContent = "Never";
    return;
  }

  els.lastAutoBackupLabel.textContent = new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAutoBackupStatusLabel() {
  if (!supportsAutomaticBackup()) return "Unavailable on this browser";
  if (backupCapabilityState === "error") return "Error";
  if (backupCapabilityState === "permission_needed") return "File permission needed";
  return "Ready";
}

function renderAutomaticBackupSettings() {
  if (els.backupModeSelect) {
    els.backupModeSelect.value = backupMode;
    const autoOption = Array.from(els.backupModeSelect.options).find((option) => option.value === BACKUP_MODE_AUTO_FILE);
    if (autoOption) autoOption.disabled = !supportsAutomaticBackup();
  }

  if (els.backupDestinationLabel) {
    els.backupDestinationLabel.textContent = backupFileName || "No backup file selected";
  }

  if (els.autoBackupStatusLabel) {
    els.autoBackupStatusLabel.textContent = getAutoBackupStatusLabel();
  }

  if (els.btnChooseBackupFile) {
    els.btnChooseBackupFile.disabled = !supportsAutomaticBackup();
  }

  if (els.btnRunBackupNow) {
    els.btnRunBackupNow.disabled = !supportsAutomaticBackup() || (!backupFileHandle && !canUseAutomaticBackup());
  }
}

function buildBackupFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `time-tracker-backup-${year}-${month}-${day}-${hours}${minutes}.json`;
}

function exportBackup() {
  const payload = buildBackupPayload();

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildBackupFilename(new Date());
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  renderLastBackup();
}

function validateAndMigrateBackupPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Invalid backup file." };
  }

  const meta = payload.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta) || meta.app !== "Time Tracker") {
    return { ok: false, error: "This backup file is not from Time Tracker." };
  }

  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Invalid backup file." };
  }

  if (!Array.isArray(data.sessions)) {
    return { ok: false, error: "Invalid backup file (missing sessions)." };
  }

  const warnings = [];
  if (meta.storageKey && meta.storageKey !== STORAGE_KEY) {
    warnings.push(`Backup storage key mismatch: expected ${STORAGE_KEY}, got ${meta.storageKey}`);
  }

  let backupVersion = 1;
  if (meta.version == null) {
    warnings.push("Backup file is missing meta.version. Assuming version 1.");
  } else if (Number.isFinite(Number(meta.version))) {
    backupVersion = Number(meta.version);
  }

  let migratedData = {
    ...data,
  };

  if (backupVersion <= 1) {
    migratedData = {
      ...migratedData,
      breaks: Array.isArray(migratedData.breaks) ? migratedData.breaks : [],
      auditLogs: Array.isArray(migratedData.auditLogs) ? migratedData.auditLogs : [],
      skippedBreaksByDate: sanitizeSkippedBreaksByDate(
        migratedData.skippedBreaksByDate && typeof migratedData.skippedBreaksByDate === "object" && !Array.isArray(migratedData.skippedBreaksByDate)
          ? migratedData.skippedBreaksByDate
          : {}
      ),
    };
  }

  const migratedState = {
    sessions: migratedData.sessions,
    breaks: migratedData.breaks,
    auditLogs: migratedData.auditLogs,
    skippedBreaksByDate: migratedData.skippedBreaksByDate,
  };

  return {
    ok: true,
    state: migratedState,
    warnings,
  };
}

function importBackupFromFile(evt) {
  const input = evt.target;
  if (!(input instanceof HTMLInputElement)) return;

  const [file] = input.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || ""));
      const result = validateAndMigrateBackupPayload(payload);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      result.warnings.forEach((warning) => console.warn(warning));

      const shouldImport = window.confirm("Importing will overwrite the current data on this device. Continue?");
      if (!shouldImport) return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state));
      localStorage.setItem(LAST_IMPORT_KEY, String(Date.now()));
      state = loadState();
      closeLogEditor({ force: true });
      scheduleAutomaticBackup();
      renderAll();
      renderLastImport();
    } catch {
      window.alert("Invalid backup file.");
    } finally {
      input.value = "";
    }
  };

  reader.onerror = () => {
    window.alert("Invalid backup file.");
    input.value = "";
  };

  reader.readAsText(file);
}

function getWeeklyHoursText() {
  const weekStart = startOfWeekMs(new Date());
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dailyEntries = [];

  for (let i = 0; i < 7; i += 1) {
    const dayDate = new Date(weekStart + (i * 24 * 60 * 60 * 1000));
    const dayStart = startOfDayMs(dayDate);
    const dayEnd = endOfDayMs(dayDate);
    const netMs = Math.max(0, netInRangeMs(dayStart, dayEnd));

    if (netMs <= 0) continue;

    dailyEntries.push({
      label: `${dayLabels[i]}-${formatShortUsDate(dayDate)}`,
      ms: netMs,
    });
  }

  const weeklyTotalMs = dailyEntries.reduce((sum, entry) => sum + entry.ms, 0);
  const lines = ["Weekly Hours Summary", ""];

  if (dailyEntries.length === 0) {
    lines.push("No tracked hours this week.");
  } else {
    dailyEntries.forEach((entry) => {
      lines.push(`${entry.label}: ${formatDecimalHours(minutesFromMs(entry.ms))} Hrs`);
    });
  }

  lines.push("", `Weekly Total: ${formatDecimalHours(minutesFromMs(weeklyTotalMs))} Hrs`);
  return lines.join("\n");
}

let shareFeedbackTimer = null;

function showShareFeedback(message) {
  if (!els.shareFeedback) return;

  els.shareFeedback.textContent = message;

  if (shareFeedbackTimer) {
    clearTimeout(shareFeedbackTimer);
  }

  shareFeedbackTimer = setTimeout(() => {
    if (els.shareFeedback) els.shareFeedback.textContent = "";
  }, 2200);
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand copy below.
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    textArea.remove();
    return copied;
  } catch {
    return false;
  }
}

async function shareWeeklyHours() {
  const text = getWeeklyHoursText();

  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    const copied = await copyTextToClipboard(text);
    showShareFeedback(copied ? "Weekly hours copied to clipboard." : "Unable to share or copy weekly hours.");
    return;
  }

  try {
    await navigator.share({
      title: "Weekly Hours Summary",
      text,
    });
  } catch (error) {
    if (error && error.name === "AbortError") return;

    const copied = await copyTextToClipboard(text);
    if (copied) {
      showShareFeedback("Weekly hours copied to clipboard.");
      return;
    }

    showShareFeedback("Unable to share or copy weekly hours.");
  }
}

async function copyWeeklyHoursToClipboard() {
  const text = getWeeklyHoursText();
  const copied = await copyTextToClipboard(text);

  if (copied) {
    showShareFeedback("Weekly hours copied to clipboard.");
    return;
  }

  showShareFeedback("Unable to copy weekly hours.");
}

function formatShortUsDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear() % 100;
  return `${month}/${day}/${year}`;
}

function formatDecimalHours(minutes) {
  const decimalHours = minutes / 60;
  return decimalHours.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

function formatLiveDecimalHours(ms) {
  const decimalHours = minutesFromMs(ms) / 60;
  return Math.max(0, decimalHours).toFixed(2);
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
  const nextBreakSequence = getNextBreakSequence(new Date());

  els.btnClockIn.disabled = !!active;
  els.btnClockOut.disabled = !active;
  els.btnStartBreak.disabled = !active || !!activeBreak || nextBreakSequence == null;
  els.btnEndBreak.disabled = !activeBreak;
  els.btnSkipBreak.disabled = !active || nextBreakSequence == null;
  els.skipBreakTarget.disabled = !active;
  els.btnClearSession.disabled = !active;
  els.btnClearLogs.disabled = state.sessions.length === 0 && state.breaks.length === 0 && (state.auditLogs?.length ?? 0) === 0;

  const dateKey = getDateKey();
  const skipped = getSkippedBreaksForDate(dateKey);
  const completed = getCompletedBreakSequencesForDate(new Date());
  for (const option of els.skipBreakTarget.options) {
    const value = option.value;
    if (value === "next") {
      option.disabled = nextBreakSequence == null;
      option.textContent = nextBreakSequence == null
        ? "Next upcoming break (none left)"
        : `Next upcoming break (${getBreakShortLabel(nextBreakSequence)})`;
      continue;
    }

    const sequence = Number(value);
    const isDone = completed.has(sequence);
    const isSkipped = skipped[sequence - 1] === true;
    option.disabled = isDone || isSkipped;
    const suffix = isDone ? " (completed)" : (isSkipped ? " (skipped)" : "");
    option.textContent = `${getBreakShortLabel(sequence)}${sequence === 2 ? " - 30m" : " - 15m"}${suffix}`;
  }

  if (els.skipBreakTarget.value !== "next") {
    const selected = Number(els.skipBreakTarget.value);
    if (Number.isFinite(selected) && (completed.has(selected) || skipped[selected - 1])) {
      els.skipBreakTarget.value = "next";
    }
  }
}

function renderStatus() {
  const active = getActiveSession();
  const activeBreak = active ? getActiveBreak(active.id) : null;
  const dateKey = getDateKey();
  const skipped = getSkippedBreaksForDate(dateKey);
  const skippedList = skipped
    .map((isSkipped, idx) => (isSkipped ? getBreakShortLabel(idx + 1) : null))
    .filter(Boolean);

  els.breakSkipSummary.textContent = skippedList.length > 0
    ? `Skipped today: ${skippedList.join(", ")}`
    : "No skipped breaks today.";

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

  const nextBreakSequence = getNextBreakSequence(new Date());
  if (nextBreakSequence == null) {
    els.breakStatusText.textContent = "All planned breaks for today are completed or skipped.";
    return;
  }

  const nextLabel = getBreakLabel(nextBreakSequence);
  els.breakStatusText.textContent = `Next: ${nextLabel}`;
}

function renderBigTimer() {
  const active = getActiveSession();
  if (!active) {
    els.bigTimer.textContent = displayMode === "decimal" ? "0.00" : "00:00:00";
    return;
  }
  const elapsed = sessionDurationMs(active);
  els.bigTimer.textContent = displayMode === "decimal"
    ? formatLiveDecimalHours(elapsed)
    : fmtHMS(elapsed);
}

function renderBreakCountdown() {
  const active = getActiveSession();
  const activeBreak = active ? getActiveBreak(active.id) : null;

  if (!activeBreak) {
    els.breakCountdownWrap.hidden = true;
    els.breakCountdownLabel.textContent = "";
    els.breakCountdownValue.textContent = displayMode === "decimal" ? "0.00" : "00:00:00";
    els.breakCountdownValue.classList.remove("break-paid", "break-unpaid");
    return;
  }

  const plannedMinutes = Number.isFinite(activeBreak.plannedMinutes)
    ? activeBreak.plannedMinutes
    : getPlannedBreakMinutes((activeBreak.sequence ?? 1) - 1);
  const plannedMs = Math.max(0, (plannedMinutes ?? 0) * 60 * 1000);
  const elapsedMs = Math.max(0, nowMs() - activeBreak.startMs);
  const remainingMs = Math.max(0, plannedMs - elapsedMs);

  els.breakCountdownWrap.hidden = false;
  els.breakCountdownLabel.textContent = getBreakLabel(activeBreak.sequence);
  els.breakCountdownValue.textContent = displayMode === "decimal"
    ? formatLiveDecimalHours(remainingMs)
    : fmtHMS(remainingMs);

  const paidClass = activeBreak.isPaidBreak === false ? "break-unpaid" : "break-paid";
  els.breakCountdownValue.classList.remove("break-paid", "break-unpaid");
  els.breakCountdownValue.classList.add(paidClass);
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

  const todayGrossMinutes = minutesFromMs(todayGrossMs);
  const todayPaidBreaksMinutes = minutesFromMs(todayPaidBreaksMs);
  const todayUnpaidBreaksMinutes = minutesFromMs(todayUnpaidBreaksMs);
  const todayNetMinutes = minutesFromMs(todayNetMs);
  const weekNetMinutes = minutesFromMs(netInRangeMs(weekStart, weekEnd));
  const monthNetMinutes = minutesFromMs(netInRangeMs(monthStart, monthEnd));
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

function getItemTypeFilterValue(item) {
  if (item.kind === "audit") return "audit";
  if (item.kind === "work") return "work";
  if (item.kind === "break") return `break_${Number.isFinite(item.sequence) ? item.sequence : ""}`;
  return "all";
}

function getItemSourceLabel(item) {
  return item.manual ? "Manual" : "Auto";
}

function buildCombinedLogItems() {
  return [
    ...state.sessions.map((s) => ({ ...s, kind: "work" })),
    ...state.breaks.map((b) => ({ ...b, kind: "break" })),
    ...((Array.isArray(state.auditLogs) ? state.auditLogs : []).map((a) => ({
      ...a,
      kind: "audit",
      auditKind: a.kind,
      startMs: a.timestampMs,
      endMs: a.timestampMs,
    }))),
  ];
}

function applyLogFilters(items, filters) {
  return items.filter((item) => {
    if (filters.type !== "all" && getItemTypeFilterValue(item) !== filters.type) {
      return false;
    }

    if (filters.source !== "all") {
      const source = item.manual ? "manual" : "auto";
      if (source !== filters.source) return false;
    }

    if (filters.date) {
      const itemDate = getDateKey(item.startMs);
      if (itemDate !== filters.date) return false;
    }

    if (filters.notes.trim()) {
      const needle = filters.notes.trim().toLowerCase();
      const haystack = item.kind === "audit"
        ? `${item.message || ""}\n${item.notes || ""}`
        : (item.notes || "");
      if (!haystack.toLowerCase().includes(needle)) return false;
    }

    return true;
  });
}

function renderLogs() {
  renderEditModeUI();

  const items = buildCombinedLogItems().sort((a, b) => {
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

  const filtered = applyLogFilters(items, logFilters);
  if (filtered.length === 0) {
    els.log.innerHTML = `<div class="muted">No matching records.</div>`;
    return;
  }

  const html = filtered.map((s) => {
    const startStr = fmtLogStamp(s.startMs);

    let sessionType = "Work session";
    let endStr = s.endMs == null ? "Active" : fmtLogStamp(s.endMs);
    let durationStr = "—";
    let notesStr = s.notes || "—";

    if (s.kind === "audit") {
      sessionType = "Break skipped";
      endStr = "—";
      durationStr = "—";
      notesStr = s.notes || s.message || "—";
    } else {
      const dur = sessionDurationMs(s);
      const durationMinutes = minutesFromMs(dur);
      let workedMinutes = durationMinutes;

      if (s.kind === "work") {
        const sessionStart = s.startMs;
        const sessionEnd = s.endMs == null ? nowMs() : s.endMs;
        const unpaidLunchOverlapMs = state.breaks
          .filter((b) => b.isPaidBreak === false)
          .reduce((total, b) => {
            const breakEnd = b.endMs == null ? nowMs() : b.endMs;
            return total + clampToRange(sessionStart, sessionEnd, b.startMs, breakEnd);
          }, 0);

        const workedMs = Math.max(0, (sessionEnd - sessionStart) - unpaidLunchOverlapMs);
        workedMinutes = minutesFromMs(workedMs);
        durationStr = formatMinutes(workedMinutes);
      } else {
        durationStr = formatMinutes(durationMinutes);
        sessionType = getBreakLabel(s.sequence);
      }
    }

    const sourceLabel = getItemSourceLabel(s);
    const canDeleteManual = s.manual && (s.kind === "work" || s.kind === "break");
    const editable = editModeEnabled && canEditLogItem(s);
    const showDeleteManual = editModeEnabled && canDeleteManual;

    return `
      <div class="log-item log-row" data-log-id="${s.id}">
        <div class="log-row-cell"><div class="v">${escapeHtml(startStr)}</div></div>
        <div class="log-row-cell"><div class="v">${escapeHtml(sessionType)}</div></div>
        <div class="log-row-cell"><div class="v">${escapeHtml(endStr)}</div></div>
        <div class="log-row-cell"><div class="v">${escapeHtml(durationStr)}</div></div>
        <div class="log-row-cell log-row-source">
          <span class="v">${escapeHtml(sourceLabel)}</span>
          ${editable ? `<button class="btn btn-edit-log" type="button" data-edit-log-id="${s.id}" data-edit-log-kind="${s.kind}" aria-label="Edit ${escapeHtml(sessionType)}">Edit</button>` : ""}
          ${showDeleteManual ? `<button class="btn btn-delete-manual" type="button" data-delete-manual-id="${s.id}">Delete</button>` : ""}
        </div>
        <div class="log-row-cell log-row-notes"><div class="v">${escapeHtml(notesStr)}</div></div>
      </div>
    `;
  }).join("");

  els.log.innerHTML = html;
}

function updateUI() {
  renderBigTimer();
  renderBreakCountdown();
  renderTotals();
  renderEditModeUI();
  renderLogs();
  renderAutomaticBackupSettings();
  renderLastAutomaticBackup();
  renderLastBackup();
  renderLastImport();
}

function initializeDefaultLogDateFilter() {
  const todayDateKey = getDateKey();

  if (!logFilters.date) {
    logFilters.date = todayDateKey;
  }

  if (els.logFilterDate && !els.logFilterDate.value) {
    els.logFilterDate.value = todayDateKey;
  }
}

function renderAll() {
  const didCleanupSkips = cleanupSkippedBreaks(getDateKey());
  if (didCleanupSkips) saveState(state);

  renderHeader();
  renderButtons();
  renderStatus();
  renderBigTimer();
  renderBreakCountdown();
  renderTotals();
  renderEditModeUI();
  renderLogs();
  renderAutomaticBackupSettings();
  renderLastAutomaticBackup();
  renderLastBackup();
  renderLastImport();

  if (els.appVersionLabel) {
    els.appVersionLabel.textContent = APP_VERSION;
  }
}

// Big timer should always be live, even if user stays on Logs tab.
setInterval(() => {
  renderBigTimer();
  renderBreakCountdown();
  renderTotals();
  // If an active session is running, the "End: Active" duration should tick in logs too.
  // This is cheap enough for small lists.
  renderLogs();
}, 1000);

// Init
function initializeApp() {
  if (backupMode === BACKUP_MODE_AUTO_FILE && !backupFileHandle) {
    backupCapabilityState = supportsAutomaticBackup() ? "permission_needed" : "unsupported";
  } else if (backupMode === BACKUP_MODE_LOCAL_ONLY) {
    backupCapabilityState = supportsAutomaticBackup() ? "ready" : "unsupported";
  }
  localStorage.setItem(BACKUP_CAPABILITY_STATE_KEY, backupCapabilityState);

  if (els.editModeToggle) {
    els.editModeToggle.checked = editModeEnabled;
  }

  attachTabListeners();
  initializeDefaultLogDateFilter();
  renderAll();
  setTab("dashboard");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}

let refreshingApp = false;
let pendingServiceWorker = null;

function showUpdateBanner(worker) {
  pendingServiceWorker = worker;
  if (els.updateBanner) {
    els.updateBanner.hidden = false;
  }
}

function hideUpdateBanner() {
  pendingServiceWorker = null;
  if (els.updateBanner) {
    els.updateBanner.hidden = true;
  }
}

els.btnRefreshApp?.addEventListener("click", () => {
  if (pendingServiceWorker) {
    pendingServiceWorker.postMessage({ type: "SKIP_WAITING" });
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });

      if (registration.waiting) {
        showUpdateBanner(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshingApp) return;
        refreshingApp = true;
        hideUpdateBanner();
        window.location.reload();
      });
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  });
}
