import { fsrs, createEmptyCard, Rating, State } from "../vendor/fsrs.mjs";
export { Rating, State };
export function serializeSchedule(card) {
  return {
    ...card,
    due: new Date(card.due).getTime(),
    last_review: card.last_review ? new Date(card.last_review).getTime() : null,
  };
}
export function hydrateSchedule(card) {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}
export const emptySchedule = (now = Date.now()) =>
  serializeSchedule(createEmptyCard(new Date(now)));
const instances = new Map();
export function scheduler(retention = 0.9) {
  const r = Math.min(0.95, Math.max(0.8, Number(retention) || 0.9));
  if (!instances.has(r))
    instances.set(
      r,
      fsrs({
        request_retention: r,
        maximum_interval: 36500,
        enable_fuzz: false,
        enable_short_term: true,
        learning_steps: ["1m", "10m"],
        relearning_steps: ["10m"],
      }),
    );
  return instances.get(r);
}
export function previewRatings(card, retention = 0.9, now = Date.now()) {
  return scheduler(retention).repeat(
    hydrateSchedule(card.schedule),
    new Date(now),
  );
}
export function scheduleRating(
  card,
  rating,
  retention = 0.9,
  now = Date.now(),
) {
  if (![1, 2, 3, 4].includes(rating)) throw new Error("Ongeldige beoordeling.");
  const result = scheduler(retention).next(
    hydrateSchedule(card.schedule),
    new Date(now),
    rating,
  );
  return {
    schedule: serializeSchedule(result.card),
    log: {
      ...result.log,
      due: new Date(result.log.due).getTime(),
      review: new Date(result.log.review).getTime(),
    },
  };
}
export function retrievability(card, retention = 0.9, now = Date.now()) {
  if (!card.schedule.last_review || card.schedule.state === State.New) return 0;
  return Number(
    scheduler(retention).get_retrievability(
      hydrateSchedule(card.schedule),
      new Date(now),
      false,
    ),
  );
}
