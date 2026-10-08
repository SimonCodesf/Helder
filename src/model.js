import { uid, localDay, nextMidnight, normalize } from "./utils.js?v=3.1.18";
import { emptySchedule, State, retrievability } from "./scheduler.js?v=3.1.18";
import { validateNote, clozeMatches } from "./parser.js?v=3.1.18";
import { exploredCardIds } from "./learning.js?v=3.1.18";
export const SCHEMA_VERSION = 1;
export const DEFAULT_SETTINGS = {
  newPerDay: 15,
  sessionSize: 20,
  retention: 0.9,
  answerMode: "think",
  mix: true,
  theme: "system",
  dailyLimit: true,
  scaffold: true,
  exploreSize: 3,
  application: true,
  flashShuffle: true,
};
export function emptyCollection() {
  return {
    version: SCHEMA_VERSION,
    revision: 0,
    folders: [],
    sets: [],
    notes: [],
    cards: [],
    reviews: [],
    activities: [],
    settings: { ...DEFAULT_SETTINGS },
    seeded: false,
    lastBackup: null,
  };
}
export function folderDescendants(state, id) {
  const ids = new Set(id ? [id] : []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of state.folders)
      if (ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        changed = true;
      }
  }
  return ids;
}
export function folderPath(state, id) {
  const names = [],
    visited = new Set();
  let current = state.folders.find((f) => f.id === id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = state.folders.find((f) => f.id === current.parentId);
  }
  return names.join("::");
}
export function ensureFolderPath(state, path) {
  let parentId = null;
  for (const name of String(path)
    .split("::")
    .map((s) => s.trim())
    .filter(Boolean)) {
    let folder = state.folders.find(
      (f) => f.parentId === parentId && f.name === name,
    );
    if (!folder) {
      folder = { id: uid(), name, parentId };
      state.folders.push(folder);
    }
    parentId = folder.id;
  }
  return parentId;
}
function validateCurriculum(curriculum) {
  if (curriculum == null) return;
  if (typeof curriculum !== "object" || Array.isArray(curriculum))
    throw new Error("Ongeldige vakstructuur.");
  for (const map of [curriculum.levels ?? {}, curriculum.chapters ?? {}])
    if (
      typeof map !== "object" ||
      Array.isArray(map) ||
      Object.entries(map).some(
        ([key, value]) =>
          ["__proto__", "constructor", "prototype"].includes(key) ||
          typeof value !== "string" ||
          value.length > 200 ||
          key.length > 100,
      )
    )
      throw new Error("Ongeldige niveau- of hoofdstuknamen.");
}
export function newSet(
  state,
  { title, description = "", folderId = null, curriculum },
) {
  if (!title.trim()) throw new Error("Geef je set een naam.");
  if (title.trim().length > 200)
    throw new Error("Een setnaam mag maximaal 200 tekens bevatten.");
  if (folderId && !state.folders.some((f) => f.id === folderId))
    throw new Error("De gekozen map bestaat niet meer.");
  validateCurriculum(curriculum);
  const set = {
    id: uid(),
    title: title.trim(),
    ...(curriculum ? { curriculum: structuredClone(curriculum) } : {}),
    description: description.trim(),
    folderId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.sets.push(set);
  return set;
}
export function templatesFor(note) {
  if (note.kind === "cloze")
    return [...new Set(clozeMatches(note.front).map((m) => `cloze:${m[1]}`))];
  return note.kind === "reverse" ? ["forward", "reverse"] : ["forward"];
}
export function upsertNote(
  state,
  setId,
  input,
  noteId = null,
  { reset = false } = {},
) {
  if (!state.sets.some((s) => s.id === setId))
    throw new Error("De set bestaat niet meer.");
  validateNote(input);
  const existing = state.notes.find((n) => n.id === noteId);
  const note = {
    ...existing,
    id: existing?.id ?? uid(),
    setId,
    front: input.front.trim(),
    back: input.back?.trim() ?? "",
    hint: input.hint?.trim() ?? "",
    explain: input.explain?.trim() ?? "",
    source: input.source?.trim() ?? "",
    kind: input.kind,
    ...(input.learning && Object.keys(input.learning).length
      ? { learning: structuredClone(input.learning) }
      : { learning: undefined }),
    tags: [...new Set(input.tags ?? [])],
    starred: input.starred ?? existing?.starred ?? false,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  if (existing) state.notes[state.notes.indexOf(existing)] = note;
  else state.notes.push(note);
  const templates = templatesFor(note),
    obsolete = state.cards
      .filter((c) => c.noteId === note.id && !templates.includes(c.template))
      .map((c) => c.id);
  state.cards = state.cards.filter((c) => !obsolete.includes(c.id));
  state.reviews = state.reviews.filter((r) => !obsolete.includes(r.cardId));
  state.activities = (state.activities ?? []).filter(
    (a) => !obsolete.includes(a.cardId),
  );
  for (const template of templates) {
    const card = state.cards.find(
      (c) => c.noteId === note.id && c.template === template,
    );
    if (!card)
      state.cards.push({
        id: uid(),
        noteId: note.id,
        template,
        schedule: emptySchedule(),
        buriedUntil: 0,
        suspended: false,
      });
    else if (reset) {
      card.schedule = emptySchedule();
      card.buriedUntil = 0;
      state.reviews = state.reviews.filter((r) => r.cardId !== card.id);
      state.activities = (state.activities ?? []).filter(
        (a) => a.cardId !== card.id,
      );
      delete card.practiceMark;
      delete card.practiceAt;
    }
  }
  const set = state.sets.find((s) => s.id === setId);
  set.updatedAt = Date.now();
  return note;
}
export function deleteNotes(state, ids) {
  const wanted = new Set(ids),
    cards = new Set(
      state.cards.filter((c) => wanted.has(c.noteId)).map((c) => c.id),
    );
  state.notes = state.notes.filter((n) => !wanted.has(n.id));
  state.cards = state.cards.filter((c) => !cards.has(c.id));
  state.reviews = state.reviews.filter((r) => !cards.has(r.cardId));
  state.activities = (state.activities ?? []).filter(
    (a) => !cards.has(a.cardId),
  );
}
export function resetSet(state, setId) {
  const wanted = new Set(
    state.notes.filter((n) => n.setId === setId).map((n) => n.id),
  );
  if (!state.sets.some((s) => s.id === setId)) return 0;
  const ids = new Set();
  for (const card of state.cards) {
    if (!wanted.has(card.noteId)) continue;
    ids.add(card.id);
    card.schedule = emptySchedule();
    card.buriedUntil = 0;
    delete card.practiceMark;
    delete card.practiceAt;
  }
  state.reviews = state.reviews.filter((r) => !ids.has(r.cardId));
  state.activities = (state.activities ?? []).filter(
    (a) => !ids.has(a.cardId),
  );
  const set = state.sets.find((s) => s.id === setId);
  if (set) set.updatedAt = Date.now();
  return ids.size;
}
export function scopeNotes(state, scope = { type: "all" }) {
  let notes = state.notes;
  if (scope.type === "set") notes = notes.filter((n) => n.setId === scope.id);
  if (scope.type === "folder") {
    const folders = folderDescendants(state, scope.id),
      sets = new Set(
        state.sets.filter((s) => folders.has(s.folderId)).map((s) => s.id),
      );
    notes = notes.filter((n) => sets.has(n.setId));
  }
  if (scope.type === "starred") notes = notes.filter((n) => n.starred);
  if (scope.type === "difficult") {
    const ids = new Set(
      state.cards
        .filter(
          (c) =>
            c.practiceMark === "unknown" ||
            c.schedule.lapses >= 3 ||
            (c.schedule.reps > 0 && c.schedule.difficulty >= 7),
        )
        .map((c) => c.noteId),
    );
    notes = notes.filter((n) => ids.has(n.id));
  }
  if (scope.type === "tag")
    notes = notes.filter((n) =>
      n.tags.some((t) => t === scope.id || t.startsWith(scope.id + "::")),
    );
  if (scope.level)
    notes = notes.filter((n) => n.tags.includes("niveau::" + scope.level));
  if (scope.chapter)
    notes = notes.filter((n) =>
      scope.chapter === "__none"
        ? !n.tags.some((t) => t.startsWith("hoofdstuk::"))
        : n.tags.includes("hoofdstuk::" + scope.chapter),
    );
  if (scope.tag)
    notes = notes.filter((n) =>
      n.tags.some((t) => t === scope.tag || t.startsWith(scope.tag + "::")),
    );
  if (scope.query) {
    const q = normalize(scope.query);
    notes = notes.filter((n) =>
      normalize(`${n.front} ${n.back} ${n.tags.join(" ")}`).includes(q),
    );
  }
  return notes;
}
export function scopeCards(state, scope) {
  const ids = new Set(scopeNotes(state, scope).map((n) => n.id));
  return state.cards.filter((c) => ids.has(c.noteId));
}
export function isAvailable(card, now = Date.now()) {
  return !card.suspended && (card.buriedUntil || 0) <= now;
}
export function stats(state, scope = { type: "all" }, now = Date.now()) {
  const cards = scopeCards(state, scope),
    available = cards.filter((c) => isAvailable(c, now));
  const today = state.reviews.filter(
    (r) => !r.inactive && r.day === localDay(now),
  );
  const introduced = new Set(today.filter((r) => r.wasNew).map((r) => r.cardId))
    .size;
  const fresh = available.filter((c) => c.schedule.state === State.New);
  const dueNotes = new Set(
    available
      .filter((c) => c.schedule.state !== State.New && c.schedule.due <= now)
      .map((c) => c.noteId),
  );
  const freshNotes = new Set(
    fresh.filter((c) => !dueNotes.has(c.noteId)).map((c) => c.noteId),
  );
  // Explored but never rated: already introduced to learning, still awaiting
  // a first FSRS rating. Shown separately and blocking new exploration.
  const explored = new Set(exploredCardIds(state));
  return {
    total: cards.length,
    notes: scopeNotes(state, scope).length,
    due: dueNotes.size,
    new: fresh.length,
    learning: available.filter(
      (c) => c.schedule.state === State.New && explored.has(c.id),
    ).length,
    newToday: Math.min(
      freshNotes.size,
      state.settings.dailyLimit === false
        ? freshNotes.size
        : Math.max(0, state.settings.newPerDay - introduced),
    ),
    introduced,
    done: today.length,
    suspended: cards.filter((c) => c.suspended).length,
  };
}
export function queueFor(
  state,
  scope = { type: "all" },
  now = Date.now(),
  { practice = false } = {},
) {
  const available = scopeCards(state, scope).filter(
    (c) => !c.suspended && (practice || isAvailable(c, now)),
  );
  if (practice) return available.map((c) => c.id);
  const due = available.filter(
    (c) => c.schedule.state !== State.New && c.schedule.due <= now,
  );
  // Intraday learning first; older reviews prioritized by estimated recall probability.
  due.sort((a, b) => {
    const aLearning = [State.Learning, State.Relearning].includes(
        a.schedule.state,
      ),
      bLearning = [State.Learning, State.Relearning].includes(b.schedule.state);
    if (aLearning !== bLearning) return aLearning ? -1 : 1;
    return aLearning
      ? a.schedule.due - b.schedule.due
      : retrievability(a, state.settings.retention, now) -
          retrievability(b, state.settings.retention, now);
  });
  const order = new Map(state.notes.map((n, i) => [n.id, i]));
  const noteById = new Map(state.notes.map((n) => [n.id, n]));
  const setOrder = new Map(state.sets.map((set, i) => [set.id, i]));
  const level = (note) => {
    const t = note.tags.find((t) => t.startsWith("niveau::"));
    return t ? t.slice(8) : "";
  };
  const fresh = available
    .filter((c) => c.schedule.state === State.New)
    .sort((a, b) => {
      const na = noteById.get(a.noteId),
        nb = noteById.get(b.noteId);
      return (
        setOrder.get(na.setId) - setOrder.get(nb.setId) ||
        level(na).localeCompare(level(nb), "nl", { numeric: true }) ||
        order.get(a.noteId) - order.get(b.noteId)
      );
    });
  const seenNotes = new Set();
  const distinct = (cards) =>
    cards.filter((c) => {
      if (seenNotes.has(c.noteId)) return false;
      seenNotes.add(c.noteId);
      return true;
    });
  const dueCards = distinct(due),
    freshCards = distinct(fresh).slice(0, stats(state, scope, now).newToday);
  return [...dueCards, ...freshCards].map((c) => c.id);
}
export function faces(note, card) {
  if (card.template === "reverse")
    return {
      question: note.back,
      answer: note.front,
      label: "Omgekeerde kaart",
    };
  if (card.template.startsWith("cloze:")) {
    const target = card.template.split(":")[1];
    const replace = (show) =>
      note.front.replace(
        /\{\{c([1-9]\d*)::([^{}]+?)\}\}/g,
        (_, index, payload) => {
          const [answer, ...hint] = payload.split("::");
          return show || index !== target
            ? answer
            : hint.length
              ? `[${hint.join("::")}]`
              : "[…]";
        },
      );
    return {
      question: replace(false),
      answer: replace(true) + (note.back ? `\n\n${note.back}` : ""),
      label: "Invulkaart",
    };
  }
  return { question: note.front, answer: note.back, label: "Begrip of vraag" };
}
export function burySiblings(state, card, now = Date.now()) {
  for (const sibling of state.cards)
    if (sibling.noteId === card.noteId && sibling.id !== card.id)
      sibling.buriedUntil = nextMidnight(now);
}
export function validateCollection(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== SCHEMA_VERSION)
    throw new Error("Dit is geen ondersteunde Helder-back-up (versie 1).");
  for (const name of ["folders", "sets", "notes", "cards", "reviews"])
    if (!Array.isArray(raw[name])) throw new Error(`De back-up mist ${name}.`);
  if (
    raw.notes.length > 100000 ||
    raw.cards.length > 300000 ||
    raw.reviews.length > 1000000
  )
    throw new Error("Deze back-up is te groot.");
  const requireUnique = (items, name) => {
    const set = new Set();
    for (const item of items) {
      if (typeof item.id !== "string" || !item.id || set.has(item.id))
        throw new Error(`Dubbele of ontbrekende ID in ${name}.`);
      set.add(item.id);
    }
    return set;
  };
  const folders = requireUnique(raw.folders, "mappen"),
    sets = requireUnique(raw.sets, "sets"),
    notes = requireUnique(raw.notes, "notities"),
    cards = requireUnique(raw.cards, "kaarten");
  requireUnique(raw.reviews, "beoordelingen");
  requireUnique(raw.activities ?? [], "oefenlogboek");
  for (const f of raw.folders) {
    if (
      typeof f.name !== "string" ||
      !f.name.trim() ||
      f.name.length > 200 ||
      (f.parentId && !folders.has(f.parentId))
    )
      throw new Error("Ongeldige map.");
    const seen = new Set([f.id]);
    let parent = f.parentId;
    while (parent) {
      if (seen.has(parent))
        throw new Error("Mappen kunnen niet in elkaar blijven rondlopen.");
      seen.add(parent);
      parent = raw.folders.find((p) => p.id === parent)?.parentId;
    }
  }
  for (const s of raw.sets)
    if (
      typeof s.title !== "string" ||
      !s.title.trim() ||
      s.title.length > 200 ||
      (s.folderId && !folders.has(s.folderId))
    )
      throw new Error("Ongeldige set of mapverwijzing.");
  for (const s of raw.sets) validateCurriculum(s.curriculum);
  for (const n of raw.notes) {
    if (
      !sets.has(n.setId) ||
      !Array.isArray(n.tags) ||
      n.tags.some((t) => typeof t !== "string") ||
      typeof n.front !== "string" ||
      typeof n.back !== "string"
    )
      throw new Error("Ongeldige notitie.");
    validateNote(n);
  }
  const templateKeys = new Set();
  const noteMap = new Map(raw.notes.map((n) => [n.id, n]));
  for (const c of raw.cards) {
    if (!notes.has(c.noteId))
      throw new Error("Kaart zonder bijbehorende notitie.");
    if (!templatesFor(noteMap.get(c.noteId)).includes(c.template))
      throw new Error("Ongeldig kaartsjabloon.");
    const key = `${c.noteId}|${c.template}`;
    if (templateKeys.has(key)) throw new Error("Dubbel kaartsjabloon.");
    templateKeys.add(key);
    const s = c.schedule;
    if (typeof c.suspended !== "boolean")
      throw new Error("Ongeldige pauzestatus.");
    if (
      !s ||
      ![0, 1, 2, 3].includes(s.state) ||
      !Number.isFinite(s.due) ||
      Math.abs(s.due) > 8.64e15
    )
      throw new Error("Ongeldige herhalingsplanning.");
    for (const k of [
      "stability",
      "difficulty",
      "elapsed_days",
      "scheduled_days",
      "reps",
      "lapses",
      "learning_steps",
    ])
      if (!Number.isFinite(s[k]) || s[k] < 0)
        throw new Error(`Ongeldige planningwaarde: ${k}.`);
    if (
      s.difficulty > 10 ||
      (s.last_review !== null &&
        (!Number.isFinite(s.last_review) ||
          Math.abs(s.last_review) > 8.64e15)) ||
      !Number.isFinite(c.buriedUntil ?? 0)
    )
      throw new Error("Ongeldige geheugentoestand.");
  }
  for (const n of raw.notes)
    for (const t of templatesFor(n))
      if (!templateKeys.has(`${n.id}|${t}`))
        throw new Error("Er ontbreekt een kaart bij een notitie.");
  if (
    raw.activities != null &&
    (!Array.isArray(raw.activities) || raw.activities.length > 1000000)
  )
    throw new Error("Ongeldig oefenlogboek.");
  for (const a of raw.activities ?? [])
    if (
      !cards.has(a.cardId) ||
      typeof a.id !== "string" ||
      !Number.isFinite(a.time) ||
      !["recognition", "application", "practice"].includes(a.form) ||
      typeof a.success !== "boolean"
    )
      throw new Error("Ongeldig oefenlogboek.");
  for (const c of raw.cards)
    if (
      (c.practiceMark && !["known", "unknown"].includes(c.practiceMark)) ||
      !Number.isFinite(c.practiceAt ?? 0)
    )
      throw new Error("Ongeldige swipe-markering.");
  for (const r of raw.reviews)
    if (
      !cards.has(r.cardId) ||
      !Number.isFinite(r.time) ||
      ![1, 2, 3, 4].includes(r.rating) ||
      typeof r.day !== "string"
    )
      throw new Error("Ongeldig leerlogboek.");
  const settings = { ...DEFAULT_SETTINGS, ...raw.settings };
  if (
    !Number.isInteger(settings.newPerDay) ||
    settings.newPerDay < 0 ||
    settings.newPerDay > 100000 ||
    !Number.isInteger(settings.sessionSize) ||
    settings.sessionSize < 5 ||
    settings.sessionSize > 200 ||
    !Number.isFinite(settings.retention) ||
    settings.retention < 0.8 ||
    settings.retention > 0.95 ||
    !["think", "write"].includes(settings.answerMode) ||
    !["system", "light", "dark"].includes(settings.theme) ||
    typeof settings.mix !== "boolean" ||
    typeof settings.dailyLimit !== "boolean" ||
    typeof settings.scaffold !== "boolean" ||
    ![1, 3, 5].includes(settings.exploreSize) ||
    typeof settings.application !== "boolean" ||
    typeof settings.flashShuffle !== "boolean"
  )
    throw new Error("Ongeldige instellingen.");
  return {
    ...raw,
    activities: raw.activities ?? [],
    settings,
    revision: Number.isInteger(raw.revision) ? raw.revision : 0,
  };
}
