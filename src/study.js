import { queueFor } from "./model.js?v=3.1.14";
import { shuffle, uid } from "./utils.js?v=3.1.14";
import { exploredCardIds } from "./learning.js?v=3.1.14";
// Sessions are a UI concern, not a second scheduling algorithm. Only FSRS changes due dates.
export function createSession(
  state,
  scope,
  { mode = "learn", practice = false } = {},
) {
  let queue = queueFor(state, scope, Date.now(), {
    practice: mode === "flash" || mode === "explore" || practice,
  });
  if (mode === "explore") {
    const seen = new Set();
    queue = queue.filter((id) => {
      const c = state.cards.find((c) => c.id === id);
      if (!c || seen.has(c.noteId)) return false;
      seen.add(c.noteId);
      return true;
    });
  }
  if (mode === "flash" ? state.settings.flashShuffle !== false : practice)
    queue = shuffle(queue);
  else if (state.settings.mix) {
    queue = queue.slice(0, state.settings.sessionSize); // Select urgent cards BEFORE mixing.
    // Mix reviews without randomly pulling advanced new material ahead of beginners' cards.
    const fresh = queue.filter(
      (id) => state.cards.find((c) => c.id === id).schedule.state === 0,
    );
    const review = queue.filter((id) => !fresh.includes(id));
    queue = [...shuffle(review), ...fresh];
  }
  return {
    id: uid(),
    scope,
    mode,
    practice,
    queue: queue.slice(
      0,
      mode === "flash" ? queue.length : state.settings.sessionSize,
    ),
    total: Math.min(
      queue.length,
      mode === "flash" ? queue.length : state.settings.sessionSize,
    ),
    completed: [],
    revealed: false,
    hintUsed: false,
    answer: "",
    index: 0,
    // Exploration is remembered across rounds: cards explored earlier
    // (persisted as exploration activities) are not warmed up again.
    warmedIds: exploredCardIds(state),
    startedAt: Date.now(),
    cardStartedAt: Date.now(),
    lastUndo: null,
  };
}
export function currentCardId(session) {
  if (session.exploration)
    return session.exploration.ids[session.exploration.index];
  return session.mode === "flash"
    ? session.queue[session.index]
    : session.queue[0];
}
export function advanceSession(session, cardId, rating) {
  session.completed.push({ cardId, rating });
  session.queue.shift();
  session.revealed = false;
  session.answer = "";
  session.hintUsed = false;
  session.cardStartedAt = Date.now();
}
