// Small pure helpers shared by the UI, importer and scheduler.
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clone = (value) => structuredClone(value);
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const localDay = (time = Date.now()) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const nextMidnight = (time = Date.now()) => {
  const d = new Date(time);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};
export const dateLabel = (time) =>
  new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" }).format(
    new Date(time),
  );
export const shuffle = (values, random = Math.random) => {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export function intervalLabel(due, now = Date.now()) {
  const minutes = Math.max(
    1,
    Math.round((new Date(due).getTime() - now) / 60000),
  );
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} uur`;
  const days = Math.round(minutes / 1440);
  if (days < 30) return `${days} ${days === 1 ? "dag" : "dagen"}`;
  if (days < 365) return `${Math.round(days / 30)} mnd`;
  return `${(days / 365).toFixed(1).replace(".", ",")} jaar`;
}
export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function downloadText(name, text, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const countLabel = (number, singular, plural) =>
  `${number} ${number === 1 ? singular : plural}`;
// List titles show no raw image code: ![alt](url) becomes [alt].
export const stripImages = (value) =>
  String(value ?? "").replace(
    /!\[([^\]\n]*)\]\(([^\s)]+)\)/g,
    (_, alt) => (alt.trim() ? `[${alt.trim()}]` : "[afbeelding]"),
  );
