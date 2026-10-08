import { scopeNotes, scopeCards } from "./model.js?v=3.1.16";
import { evidenceState } from "./learning.js?v=3.1.16";
export function facet(note, prefix) {
  return (
    note.tags
      .find((t) => t.startsWith(prefix + "::"))
      ?.slice(prefix.length + 2) ?? ""
  );
}
export function facetValues(notes, prefix) {
  return [...new Set(notes.map((n) => facet(n, prefix)).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "nl", { numeric: true }),
  );
}
export function levelLabel(set, value) {
  return set?.curriculum?.levels?.[value] || `Niveau ${value}`;
}
export function chapterLabel(set, value) {
  return (
    set?.curriculum?.chapters?.[value] ||
    (value ? `Hoofdstuk ${value}` : "Zonder hoofdstuk")
  );
}
export function progressFor(state, scope) {
  const counts = { new: 0, building: 0, spaced: 0, total: 0 };
  for (const c of scopeCards(state, scope)) {
    counts[evidenceState(state, c)]++;
    counts.total++;
  }
  return counts;
}
export function structureFor(state, scope) {
  const notes = scopeNotes(state, scope);
  return {
    levels: facetValues(notes, "niveau"),
    chapters: facetValues(notes, "hoofdstuk"),
    ungrouped: notes.filter((n) => !facet(n, "hoofdstuk")).length,
  };
}
export function labelMap(text) {
  const result = Object.create(null);
  for (const line of String(text)
    .split("\n")
    .filter((l) => l.trim())) {
    const pos = line.indexOf("=");
    if (pos < 1 || !line.slice(pos + 1).trim())
      throw new Error(
        "Gebruik één naam per regel: 1 = Basis of H1 = Inleiding.",
      );
    const key = line.slice(0, pos).trim(),
      value = line.slice(pos + 1).trim();
    if (
      key.length > 100 ||
      value.length > 200 ||
      ["__proto__", "constructor", "prototype"].includes(key)
    )
      throw new Error("Ongeldige niveau- of hoofdstuknaam.");
    result[key] = value;
  }
  return result;
}
export function mapText(value = {}) {
  return Object.entries(value)
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");
}
