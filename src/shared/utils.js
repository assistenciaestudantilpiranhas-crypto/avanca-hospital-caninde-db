export const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );

export const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function numericFromText(value = "") {
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

export function formatDateBR(isoDate) {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export function minutesFromClock(value = "") {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function calculateAge(nascimento = "") {
  if (!nascimento) return "-";
  const parts = nascimento.split("/");
  if (parts.length !== 3) return "-";
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return "-";
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : "-";
}

export function formatElapsed(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatWaitTime(startTs, fallbackClock = "") {
  if (!Number.isFinite(startTs)) return fallbackClock || "-";
  return formatElapsed(Date.now() - startTs);
}
