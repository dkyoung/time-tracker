export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function fmtHMS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function fmtHM(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${pad2(m)}`;
}

export function minutesFromMs(ms) {
  return Math.max(0, ms / 60000);
}

export function startOfDayMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function endOfDayMs(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

export function startOfWeekMs(d) {
  const x = new Date(d);
  const day = x.getDay();
  const deltaToMonday = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + deltaToMonday);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function startOfMonthMs(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function nowMs() {
  return Date.now();
}

export function makeLogId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `log_${Date.now()}_${suffix}`;
}

export function parseDateTimeToMs(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}`).getTime();
}

export function fmtLogStamp(ms) {
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

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDateInputValue(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatTimeInputValue(ms) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function expectedMinutesForType(type) {
  if (type === "break_1" || type === "break_3") return 15;
  if (type === "break_2") return 30;
  return null;
}

export function getManualTypeMeta(type) {
  if (type === "break_1") return { kind: "break", sequence: 1, plannedMinutes: 15 };
  if (type === "break_2") return { kind: "break", sequence: 2, plannedMinutes: 30 };
  if (type === "break_3") return { kind: "break", sequence: 3, plannedMinutes: 15 };
  return { kind: "work" };
}

export function clampToRange(msStart, msEnd, rangeStart, rangeEnd) {
  const s = Math.max(msStart, rangeStart);
  const e = Math.min(msEnd, rangeEnd);
  return Math.max(0, e - s);
}

export function formatShortUsDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear() % 100;
  return `${month}/${day}/${year}`;
}

export function formatDecimalHours(minutes) {
  const decimalHours = minutes / 60;
  return decimalHours.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

export function formatLiveDecimalHours(ms) {
  const decimalHours = minutesFromMs(ms) / 60;
  return Math.max(0, decimalHours).toFixed(2);
}
