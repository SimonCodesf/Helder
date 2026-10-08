import { normalize, shuffle } from "./utils.js?v=3.1.14";

// Pedagogical scaffolding is separate from the FSRS memory model.
// Choice/application answers must be authored, never invented from other cards.
export function validateLearning(learning) {
  if (learning == null) return;
  if (typeof learning !== "object" || Array.isArray(learning))
    throw new Error("Ongeldige extra oefeningen.");
  const text = (v, name, required = true) => {
    if (typeof v !== "string" || (required && !v.trim()) || v.length > 50000)
      throw new Error(`Controleer ${name}.`);
  };
  if (learning.term != null) {
    text(learning.term, "de term voor omgekeerd verkennen");
    if (learning.term.length > 200 || learning.term.includes("\n"))
      throw new Error("Gebruik één korte term voor omgekeerd verkennen.");
  }
  if (learning.choice) {
    const c = learning.choice;
    text(c.prompt, "je herkenningsvraag");
    if (
      !Array.isArray(c.options) ||
      c.options.length < 3 ||
      c.options.length > 5 ||
      !Number.isInteger(c.correct) ||
      c.correct < 0 ||
      c.correct >= c.options.length
    )
      throw new Error(
        "Een herkenningsvraag heeft 3 tot 5 opties en één juist antwoord.",
      );
    c.options.forEach((v) => text(v, "de antwoordopties"));
    if (
      [c.prompt, ...c.options, c.feedback ?? ""].some((v) => v.includes("\n"))
    )
      throw new Error(
        "Gebruik één regel voor herkenningsvragen, opties en feedback.",
      );
    if (new Set(c.options.map(normalize)).size !== c.options.length)
      throw new Error("Gebruik verschillende antwoordopties.");
    text(c.feedback ?? "", "de feedback", false);
  }
  if (learning.application) {
    const a = learning.application;
    text(a.prompt, "je toepassingsvraag");
    if (a.prompt.includes("\n"))
      throw new Error(
        "Gebruik één regel voor de toepassingsvraag; de voorbeeldredenering mag meer regels hebben.",
      );
    text(a.answer, "het modelantwoord voor de toepassing");
    if (!Array.isArray(a.rubric ?? []) || (a.rubric ?? []).length > 10)
      throw new Error("Gebruik maximaal tien kernpunten.");
    (a.rubric ?? []).forEach((v) => text(v, "de kernpunten"));
  }
}
export function recognitionOptions(note) {
  if (!note.learning?.choice) return [];
  return shuffle(
    note.learning.choice.options.map((text, original) => ({ text, original })),
  );
}
export function correctRecallDays(state, cardId) {
  return new Set(
    state.reviews
      .filter(
        (r) =>
          r.cardId === cardId &&
          r.rating > 1 &&
          !r.hintUsed &&
          !r.assisted &&
          !r.inactive &&
          !r.wasNew,
      )
      .map((r) => r.day),
  );
}
// Exploration is recorded persistently (round: "exploration"), so quitting
// mid-round loses nothing: explored cards stay explored in later rounds.
export function exploredCardIds(state) {
  return [
    ...new Set(
      (state.activities ?? [])
        .filter((a) => a.round === "exploration")
        .map((a) => a.cardId),
    ),
  ];
}
export function hasSpacedEvidence(state, cardId) {
  const attempts = state.reviews.filter(
    (r) =>
      r.cardId === cardId &&
      r.rating > 1 &&
      !r.hintUsed &&
      !r.assisted &&
      !r.inactive &&
      !r.wasNew &&
      Number.isFinite(r.time),
  );
  return (
    new Set(attempts.map((r) => r.day)).size >= 2 &&
    attempts.length >= 2 &&
    Math.max(...attempts.map((r) => r.time)) -
      Math.min(...attempts.map((r) => r.time)) >=
      86400000
  );
}
export function evidenceState(state, card) {
  if (card.schedule.reps === 0) return "new";
  // An explainable design heuristic, not a scientifically validated mastery threshold.
  return hasSpacedEvidence(state, card.id) ? "spaced" : "building";
}
export function shouldApply(state, card, note, rating) {
  if (
    !state.settings.application ||
    !note.learning?.application ||
    rating === 1
  )
    return false;
  const days = correctRecallDays(state, card.id);
  if (!hasSpacedEvidence(state, card.id)) return false;
  const last = (state.activities ?? [])
    .filter((a) => a.cardId === card.id && a.form === "application")
    .at(-1);
  return !last || Date.now() - last.time >= 7 * 86400000;
}
// Batch size is a transparent product default, not a research-derived optimum.
export function explorationTerm(note) {
  if (note.kind === "cloze" || !note.back?.trim()) return null;
  if (note.learning?.term) return note.learning.term.trim();
  const term = note.front.trim().replace(/[*_`]/g, "");
  if (
    term.length > 100 ||
    /[?\n{}]/.test(term) ||
    /[.:!]$/.test(term) ||
    /^(?:wat|hoe|waarom|welke|wanneer|waar|leg|geef|beschrijf|bereken|noem|is|kan|kun|what|why|how|which|explain|describe|calculate|give|name)\b/i.test(
      term,
    )
  )
    return null;
  return term;
}
export function explorationTasks(note, card) {
  const tasks = [];
  if (card.template === "forward" && note.learning?.choice)
    tasks.push({ kind: "choice", choice: note.learning.choice });
  const term = card.template === "forward" && explorationTerm(note);
  if (term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mask = new RegExp(
      "(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])",
      "giu",
    );
    tasks.push({
      kind: "reverse",
      term,
      definition: note.back.replace(mask, "[…]"),
    });
  }
  if (!tasks.length) tasks.push({ kind: "exposure" });
  return tasks;
}
function startExploreTask(session, state) {
  const e = session.exploration,
    card = state.cards.find((c) => c.id === e.ids[e.index]),
    note = state.notes.find((n) => n.id === card.noteId);
  e.task = explorationTasks(note, card)[e.substep];
  e.options = e.task.kind === "choice" ? recognitionOptions(note) : [];
  e.answer = "";
  e.revealed = false;
  e.selected = null;
  e.screen = "task";
  session.supportIds = [...new Set([...(session.supportIds ?? []), card.id])];
}
export function startExploration(session, state) {
  startExploreTask(session, state);
}
export function nextExploration(session, state) {
  const e = session.exploration,
    card = state.cards.find((c) => c.id === e.ids[e.index]),
    note = state.notes.find((n) => n.id === card.noteId);
  if (++e.substep < explorationTasks(note, card).length)
    return startExploreTask(session, state);
  e.substep = 0;
  if (++e.index >= e.ids.length) {
    e.index = e.ids.length - 1;
    e.screen = "bridge";
    return;
  }
  startExploreTask(session, state);
}
// A failed reverse exploration returns once at the end of the group.
// A second failure moves on, so a difficult card can never loop forever.
export function requeueExploration(session) {
  const e = session.exploration;
  if (!e || e.task?.kind !== "reverse") return false;
  e.retried ??= [];
  const id = e.ids[e.index];
  if (e.retried.includes(id)) return false;
  e.retried.push(id);
  e.ids.push(id);
  return true;
}
export function finishExploration(session) {
  const ids = session.exploration.ids;
  session.warmedIds = [...new Set([...(session.warmedIds ?? []), ...ids])];
  if (session.mode === "explore") {
    session.exploredIds = [
      ...new Set([
        ...(session.exploredIds ?? []),
        ...ids.filter((id) => (session.supportIds ?? []).includes(id)),
      ]),
    ];
    session.queue = session.queue.filter((id) => !ids.includes(id));
  }
  delete session.exploration;
  session.preparedId = null;
  session.phase = "recall";
  session.revealed = false;
}
export function prepareStep(session, state) {
  if (
    session.application ||
    !["learn", "explore"].includes(session.mode) ||
    session.exploration
  )
    return;
  const id = session.queue[0];
  if (!id || session.preparedId === id) return;
  const card = state.cards.find((c) => c.id === id),
    note = state.notes.find((n) => n.id === card?.noteId);
  if (!card || !note) return;
  session.preparedId = id;
  const explore =
    session.mode === "explore" ||
    (!session.practice &&
      card.schedule.state === 0 &&
      state.settings.scaffold &&
      !(session.warmedIds ?? []).includes(id));
  if (explore) {
    const tag = (n, prefix) => n.tags.find((t) => t.startsWith(prefix)) ?? "";
    const ids = session.queue
      .filter((candidate) => {
        const c = state.cards.find((v) => v.id === candidate),
          n = state.notes.find((v) => v.id === c?.noteId);
        return (
          c &&
          n &&
          (session.mode === "explore" || c.schedule.state === 0) &&
          !(session.warmedIds ?? []).includes(candidate) &&
          n.setId === note.setId &&
          tag(n, "niveau::") === tag(note, "niveau::") &&
          tag(n, "hoofdstuk::") === tag(note, "hoofdstuk::")
        );
      })
      .slice(0, state.settings.exploreSize ?? 3);
    session.exploration = {
      ids,
      index: 0,
      substep: 0,
      screen: "start",
      answer: "",
      revealed: false,
      selected: null,
    };
    session.phase = "explore";
    session.intro = false;
    session.revealed = false;
    return;
  }
  session.phase = "recall";
  session.intro = false;
  session.introSeen = (session.supportIds ?? []).includes(id);
  session.choiceSelection = null;
  session.choiceOptions = [];
  session.revealed = false;
  session.hintUsed = false;
  session.answer = "";
  session.cardStartedAt = Date.now();
}
export function beginRecall(session) {
  session.phase = "recall";
  session.intro = false;
  session.revealed = false;
  session.answer = "";
  session.cardStartedAt = Date.now();
}
