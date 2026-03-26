import {
  STORAGE_KEY,
  EDIT_MODE_KEY,
  BACKUP_MODE_KEY,
  BACKUP_FILE_NAME_KEY,
  BACKUP_CAPABILITY_STATE_KEY,
  BREAK_PLAN_MINUTES,
  BACKUP_MODE_AUTO_FILE,
  BACKUP_MODE_LOCAL_ONLY,
} from "./constants.js";
import { makeLogId, nowMs } from "./utils.js";

export function defaultState() {
  return {
    sessions: [],
    breaks: [],
    auditLogs: [],
    skippedBreaksByDate: {},
  };
}

export function sanitizeSkippedBreaksByDate(raw) {
  if (!raw || typeof raw !== "object") return {};

  const clean = {};
  for (const [dateKey, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    clean[dateKey] = BREAK_PLAN_MINUTES.map((_, idx) => value[idx] === true);
  }
  return clean;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sessions)) return defaultState();

    return {
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
        createdAt: Number.isFinite(item.createdAt)
          ? item.createdAt
          : (Number.isFinite(item.timestampMs) ? item.timestampMs : nowMs()),
      })),
      skippedBreaksByDate: sanitizeSkippedBreaksByDate(parsed?.skippedBreaksByDate),
    };
  } catch {
    return defaultState();
  }
}

export function saveState(s, onSaved = null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  if (typeof onSaved === "function") onSaved();
}

export function loadEditMode() {
  try {
    const storedValue = localStorage.getItem(EDIT_MODE_KEY);
    return storedValue === "1" || storedValue === "true";
  } catch {
    return false;
  }
}

export function saveEditMode(enabled) {
  localStorage.setItem(EDIT_MODE_KEY, enabled ? "1" : "0");
}

export function loadBackupMode() {
  const stored = localStorage.getItem(BACKUP_MODE_KEY);
  return stored === BACKUP_MODE_AUTO_FILE ? BACKUP_MODE_AUTO_FILE : BACKUP_MODE_LOCAL_ONLY;
}

export function loadBackupFileName() {
  return localStorage.getItem(BACKUP_FILE_NAME_KEY) || "";
}

export function supportsAutomaticBackup() {
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}

export function getDefaultBackupCapabilityState() {
  if (!supportsAutomaticBackup()) return "unsupported";
  if (loadBackupFileName()) return "permission_needed";
  return "ready";
}

export function loadBackupCapabilityState() {
  const stored = localStorage.getItem(BACKUP_CAPABILITY_STATE_KEY);
  if (stored) return stored;
  return getDefaultBackupCapabilityState();
}
