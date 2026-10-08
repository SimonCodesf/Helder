import { queueFor, stats } from "./model.js?v=3.1.20";
import { shuffle, uid } from "./utils.js?v=3.1.20";
import { exploredCardIds } from "./learning.js?v=3.1.20";
// A learn round stays steady: with fewer than this many due reviews, one
// small batch of new cards is explored up front. Nothing new is added
// mid-round; the rest waits for the next round.
const MAX_DUE_WITH_NEW = 10;
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
  // One batch of new cards per learn round: explored once up front, then
  // recalled together with due reviews. Ten or more due reviews means a
  // reviews-only round; extra new cards wait for later.
  let batch = [];
  if (mode === "learn" && !practice && state.settings.scaffold) {
    const warmed = new Set(exploredCardIds(state)),
      isNew = (id) =>
        state.cards.find((c) => c.id === id)?.schedule.state === 0,
      dueCount = queue.filter((id) => !isNew(id)).length,
      // Cards already in learning await their first rating: no new batch
      // until they are rated.
      inLearning = stats(state, scope, Date.now()).learning;
    batch =
      dueCount < MAX_DUE_WITH_NEW && !inLearning
        ? queue
            .filter((id) => isNew(id) && !warmed.has(id))
            .slice(0, state.settings.exploreSize ?? 3)
        : [];
    const keep = new Set(batch);
    queue = queue.filter(
      (id) => !isNew(id) || warmed.has(id) || keep.has(id),
    );
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
  if (batch.length) {
    // The new batch is explored first, then recalled with the reviews.
    const inBatch = new Set(batch);
    queue = [...batch, ...queue.filter((id) => !inBatch.has(id))];
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
