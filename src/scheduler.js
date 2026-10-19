import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
} from "../vendor/fsrs.mjs?v=3.1.56";
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
// Hard ceiling: no review interval ever exceeds three months. Longer
// waits look efficient on paper but leave too few chances to notice a
// half-forgotten term before an exam or conversation.
export const MAX_INTERVAL_DAYS = 90;
// ts-fsrs keeps Good/Easy at least one day above Hard/Easy previews, so a
// capped Hard can push Good one day past maximum_interval. Clamp the final
// card ourselves to keep the promise exact.
function capInterval(card, now) {
  if (!card || card.scheduled_days <= MAX_INTERVAL_DAYS) return card;
  const due = new Date(card.last_review ?? now);
  due.setDate(due.getDate() + MAX_INTERVAL_DAYS);
  card.due = due;
  card.scheduled_days = MAX_INTERVAL_DAYS;
  return card;
}
const instances = new Map();
export function scheduler(retention = 0.9) {
  const r = Math.min(0.95, Math.max(0.8, Number(retention) || 0.9));
  if (!instances.has(r))
    instances.set(
      r,
      fsrs({
        request_retention: r,
        maximum_interval: MAX_INTERVAL_DAYS,
        enable_fuzz: false,
        enable_short_term: true,
        learning_steps: ["1m", "10m"],
        relearning_steps: ["10m"],
      }),
    );
  return instances.get(r);
}
export function previewRatings(card, retention = 0.9, now = Date.now()) {
  const preview = scheduler(retention).repeat(
    hydrateSchedule(card.schedule),
    new Date(now),
  );
  for (const item of Object.values(preview)) capInterval(item?.card, now);
  return preview;
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
  capInterval(result.card, now);
  const schedule = serializeSchedule(result.card);
  return {
    schedule,
    log: {
      ...result.log,
      due: schedule.due,
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
