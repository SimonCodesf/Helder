import { scopeNotes, scopeCards, stats } from "./model.js?v=3.1.56";
import { evidenceState } from "./learning.js?v=3.1.56";
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
// Prefill the rename fields with every value in use, so an empty box never
// suggests there is nothing to rename. Saving keeps the shown names unless
// edited; mappings for values no longer in use are preserved as-is.
export function labelText(state, set, kind) {
  const prefix = kind === "levels" ? "niveau" : "hoofdstuk",
    label = kind === "levels" ? levelLabel : chapterLabel,
    values = facetValues(
      scopeNotes(state, { type: "set", id: set.id }),
      prefix,
    ),
    custom = set.curriculum?.[kind] ?? {},
    seen = new Set(values),
    lines = values.map((v) => `${v} = ${label(set, v)}`);
  for (const [k, v] of Object.entries(custom))
    if (!seen.has(k)) lines.push(`${k} = ${v}`);
  return lines.join("\n");
}

// Latest touch (rating or exploration) inside a scope. Drives "continue
// where you left off": recency first, volume second.
export function lastActive(state, scope) {
  const ids = new Set(scopeCards(state, scope).map((c) => c.id));
  let latest = 0;
  for (const r of state.reviews ?? []) {
    if (Number.isFinite(r?.time) && r.time > latest && ids.has(r.cardId))
      latest = r.time;
  }
  for (const a of state.activities ?? []) {
    if (Number.isFinite(a?.time) && a.time > latest && ids.has(a.cardId))
      latest = a.time;
  }
  return latest;
}
// Where are you busy? Engaged work (due reviews plus explored-but-unrated)
// outranks untouched new cards, so pristine material never hijacks a
// default. Falls back to the first chapter or level with new cards.
export function engagedOpen(state, scope) {
  const st = stats(state, scope);
  return st.due + st.learning;
}
export function resumeLevel(state, set) {
  const scope = { type: "set", id: set.id };
  let best = null,
    firstNew = null;
  for (const level of structureFor(state, scope).levels) {
    const st = stats(state, { ...scope, level }),
      engaged = st.due + st.learning;
    if (engaged > 0) {
      const active = lastActive(state, { ...scope, level }),
        candidate = { level, engaged, active };
      if (
        !best ||
        active > best.active ||
        (active === best.active && engaged > best.engaged)
      )
        best = candidate;
    }
    if (firstNew == null && st.newToday > 0) firstNew = level;
  }
  return best ? best.level : (firstNew ?? "");
}
export function resumeChapter(state, set, level) {
  const base = { type: "set", id: set.id, ...(level ? { level } : {}) },
    names = [...structureFor(state, base).chapters];
  if (
    scopeNotes(state, base).some(
      (n) => !n.tags.some((t) => t.startsWith("hoofdstuk::")),
    )
  )
    names.push("__none");
  let best = null,
    firstNew = null;
  for (const chapter of names) {
    const scope = { ...base, chapter },
      st = stats(state, scope),
      engaged = st.due + st.learning;
    if (engaged > 0) {
      const active = lastActive(state, scope),
        candidate = { chapter, scope, engaged, active };
      if (
        !best ||
        active > best.active ||
        (active === best.active && engaged > best.engaged)
      )
        best = candidate;
    }
    if (firstNew == null && st.newToday > 0) firstNew = chapter;
  }
  if (best)
    return { chapter: best.chapter, scope: { ...base, chapter: best.chapter } };
  if (firstNew != null)
    return { chapter: firstNew, scope: { ...base, chapter: firstNew } };
  return null;
}
