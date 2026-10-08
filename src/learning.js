import { normalize, shuffle } from "./utils.js?v=3.0.0";

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
export function prepareStep(session, state) {
  if (session.application || session.mode !== "learn") return;
  const id = session.queue[0];
  if (!id || session.preparedId === id) return;
  const card = state.cards.find((c) => c.id === id);
  session.preparedId = id;
  session.phase =
    !session.practice && card?.schedule.state === 0 && state.settings.scaffold
      ? "orient"
      : "recall";
  session.intro = session.phase === "introduce";
  session.introSeen = false;
  session.choiceSelection = null;
  session.choiceOptions = [];
  session.revealed = false;
  session.hintUsed = false;
  session.answer = "";
}
export function beginRecall(session) {
  session.phase = "recall";
  session.intro = false;
  session.revealed = false;
  session.answer = "";
  session.cardStartedAt = Date.now();
}
