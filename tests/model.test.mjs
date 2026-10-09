import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyCollection,
  newSet,
  upsertNote,
  ensureFolderPath,
  folderPath,
  folderDescendants,
  scopeNotes,
  scopeCards,
  stats,
  queueFor,
  burySiblings,
  faces,
  deleteNotes,
  resetSet,
  swapSetQA,
  setChapter,
  validateCollection,
} from "../src/model.js";
import {
  emptySchedule,
  scheduleRating,
  previewRatings,
  hydrateSchedule,
  State,
  retrievability,
} from "../src/scheduler.js";
import { localDay, nextMidnight, clone } from "../src/utils.js";
import { createSession } from "../src/study.js";
function fixture(kind = "basic", front = "Vraag", back = "Antwoord") {
  const s = emptyCollection(),
    set = newSet(s, { title: "Test" });
  const n = upsertNote(s, set.id, {
    kind,
    front,
    back,
    tags: ["filosofie::kennisleer"],
  });
  return { s, set, n, c: s.cards[0] };
}
test("Folders resolve paths and descendants", () => {
  const s = emptyCollection(),
    id = ensureFolderPath(s, "Filosofie::Vakken::Ethiek");
  assert.equal(folderPath(s, id), "Filosofie::Vakken::Ethiek");
  assert.equal(s.folders.length, 3);
  assert.equal(ensureFolderPath(s, "Filosofie::Vakken::Ethiek"), id);
  assert.equal(folderDescendants(s, s.folders[0].id).size, 3);
});
test("Basic note creates one card, reverse two independent cards", () => {
  const { s, c } = fixture("reverse");
  assert.equal(s.cards.length, 2);
  assert.notEqual(s.cards[0].id, s.cards[1].id);
  assert.equal(faces(s.notes[0], s.cards[1]).question, "Antwoord");
  assert.equal(c.schedule.state, State.New);
});
test("Multiple cloze numbers generate one card each", () => {
  const { s, n } = fixture(
    "cloze",
    "{{c1::A}} en {{c2::B::hint}} en {{c1::C}}",
    "Extra",
  );
  assert.equal(s.cards.length, 2);
  assert.equal(faces(n, s.cards[0]).question, "[…] en B en […]");
  assert.equal(faces(n, s.cards[1]).question, "A en [hint] en C");
  assert.ok(faces(n, s.cards[1]).answer.endsWith("Extra"));
});
test("Edits retain progress unless explicitly reset", () => {
  const { s, n, set, c } = fixture();
  c.schedule = scheduleRating(c, 4).schedule;
  const before = clone(c.schedule);
  upsertNote(s, set.id, { ...n, back: "Betere uitleg" }, n.id);
  assert.deepEqual(s.cards[0].schedule, before);
  upsertNote(s, set.id, { ...n, back: "Nieuwe inhoud" }, n.id, { reset: true });
  assert.equal(s.cards[0].schedule.reps, 0);
});
test("Changing templates removes obsolete card log references", () => {
  const { s, n, set } = fixture("reverse");
  const gone = s.cards[1].id;
  s.reviews.push({ id: "r", cardId: gone });
  upsertNote(s, set.id, { ...n, kind: "basic" }, n.id);
  assert.equal(s.cards.length, 1);
  assert.equal(s.reviews.length, 0);
});
test("Tag prefix scope includes children", () => {
  const { s } = fixture();
  assert.equal(scopeNotes(s, { type: "tag", id: "filosofie" }).length, 1);
});
test("Folder scope includes nested sets", () => {
  const { s, set } = fixture();
  set.folderId = ensureFolderPath(s, "A::B");
  assert.equal(
    scopeCards(s, { type: "folder", id: s.folders[0].id }).length,
    1,
  );
});
test("Stars and difficult filters are dynamic, not copies", () => {
  const { s, n, c } = fixture();
  n.starred = true;
  assert.equal(scopeNotes(s, { type: "starred" }).length, 1);
  c.schedule.lapses = 3;
  assert.equal(scopeNotes(s, { type: "difficult" }).length, 1);
  assert.equal(s.notes.length, 1);
});
test("New card budget is global and excludes repeated introductions", () => {
  const { s, c } = fixture();
  s.settings.newPerDay = 2;
  s.reviews.push(
    { cardId: c.id, wasNew: true, day: localDay() },
    { cardId: c.id, wasNew: true, day: localDay() },
  );
  assert.equal(stats(s).introduced, 1);
  assert.equal(stats(s).newToday, 1);
});
test("Queue picks only one sibling and respects paused cards", () => {
  const { s } = fixture("reverse");
  assert.equal(queueFor(s).length, 1);
  s.cards.forEach((c) => (c.suspended = true));
  assert.equal(queueFor(s).length, 0);
});
test("Reviews ahead of new cards; future learning is not accelerated", () => {
  const { s, set, c } = fixture();
  c.schedule = scheduleRating(c, 1).schedule;
  upsertNote(s, set.id, { kind: "basic", front: "Nieuw", back: "B", tags: [] });
  assert.equal(queueFor(s).length, 1);
  c.schedule.due = Date.now() - 1000;
  assert.equal(queueFor(s)[0], c.id);
});
test("Siblings buried until next LOCAL midnight; practice ignores burial", () => {
  const { s, c } = fixture("reverse");
  const now = Date.now();
  burySiblings(s, c, now);
  assert.equal(s.cards[1].buriedUntil, nextMidnight(now));
  assert.equal(queueFor(s, { type: "all" }, now, { practice: true }).length, 2);
});
test("A selected round, not the whole due backlog, is shuffled", () => {
  const { s, set } = fixture();
  for (let i = 0; i < 30; i++)
    upsertNote(s, set.id, {
      kind: "basic",
      front: `Vraag ${i}`,
      back: "A",
      tags: [],
    });
  s.settings.sessionSize = 5;
  s.settings.newPerDay = 15;
  const session = createSession(s, { type: "all" });
  assert.equal(session.queue.length, 5);
  assert.equal(session.queue[0], s.cards[0].id);
});
test("Deleting notes removes cards and review entries", () => {
  const { s, n, c } = fixture();
  s.reviews.push({ id: "r", cardId: c.id });
  deleteNotes(s, [n.id]);
  assert.equal(s.notes.length + s.cards.length + s.reviews.length, 0);
});
test("Valid snapshot round-trip", () => {
  const { s } = fixture();
  assert.equal(
    validateCollection(JSON.parse(JSON.stringify(s))).cards.length,
    1,
  );
});
test("Snapshot rejects duplicate ID, cycle, orphan and missing template", () => {
  const { s } = fixture();
  let bad = clone(s);
  bad.notes.push(clone(bad.notes[0]));
  assert.throws(() => validateCollection(bad), /Dubbele/);
  bad = clone(s);
  bad.folders = [{ id: "f", name: "F", parentId: "f" }];
  assert.throws(() => validateCollection(bad), /rondlopen/);
  bad = clone(s);
  bad.cards[0].noteId = "missing";
  assert.throws(() => validateCollection(bad), /zonder/);
  bad = clone(s);
  bad.cards = [];
  assert.throws(() => validateCollection(bad), /ontbreekt/);
});
test("Snapshot rejects invalid FSRS state and unsafe settings", () => {
  const { s } = fixture();
  let bad = clone(s);
  bad.cards[0].schedule.stability = -1;
  assert.throws(() => validateCollection(bad), /planningwaarde/);
  bad = clone(s);
  bad.settings.retention = 1;
  assert.throws(() => validateCollection(bad), /instellingen/);
  bad = clone(s);
  bad.version = 999;
  assert.throws(() => validateCollection(bad), /ondersteunde/);
});
test("FSRS hydration restores real Date instances", () => {
  const c = emptySchedule();
  assert.ok(hydrateSchedule(c).due instanceof Date);
});
test("All four FSRS previews match applied rating", () => {
  const { c } = fixture();
  const now = Date.now();
  const p = previewRatings(c, 0.9, now);
  for (const rating of [1, 2, 3, 4])
    assert.equal(
      scheduleRating(c, rating, 0.9, now).schedule.due,
      p[rating].card.due.getTime(),
    );
});
test("FSRS Again is future learning; Easy graduates", () => {
  const { c } = fixture();
  const now = Date.now(),
    again = scheduleRating(c, 1, 0.9, now),
    easy = scheduleRating(c, 4, 0.9, now);
  assert.ok(again.schedule.due > now);
  assert.equal(again.schedule.state, State.Learning);
  assert.equal(easy.schedule.state, State.Review);
  assert.ok(easy.schedule.due > now + 86400000);
});
test("FSRS learns, graduates, and can relearn after forgetting", () => {
  const { c } = fixture();
  const now = Date.now();
  c.schedule = scheduleRating(c, 3, 0.9, now).schedule;
  const t = c.schedule.due;
  c.schedule = scheduleRating(c, 3, 0.9, t).schedule;
  assert.equal(c.schedule.state, State.Review);
  const again = scheduleRating(c, 1, 0.9, c.schedule.due);
  assert.equal(again.schedule.state, State.Relearning);
  assert.equal(again.schedule.lapses, 1);
});
test("FSRS recalls probability in range; new cards no invented score", () => {
  const { c } = fixture();
  assert.equal(retrievability(c), 0);
  c.schedule = scheduleRating(c, 4).schedule;
  const p = retrievability(c);
  assert.ok(p > 0 && p <= 1);
});

test("Dashboard counts only one eligible sibling per note", () => {
  const { s } = fixture("reverse");
  assert.equal(stats(s).total, 2);
  assert.equal(stats(s).new, 2);
  assert.equal(stats(s).newToday, 1);
});

test("Snapshot rejects string values for boolean settings and card flags", () => {
  const { s } = fixture();
  let bad = clone(s);
  bad.settings.mix = "false";
  assert.throws(() => validateCollection(bad), /instellingen/);
  bad = clone(s);
  bad.settings.flashShuffle = "false";
  assert.throws(() => validateCollection(bad), /instellingen/);
  bad = clone(s);
  bad.cards[0].suspended = "false";
  assert.throws(() => validateCollection(bad), /pauzestatus/);
});
test("Reset per set wist planning, logboek en swipes, andere sets niet", () => {
  const s = emptyCollection(),
    a = newSet(s, { title: "A" }),
    b = newSet(s, { title: "B" });
  upsertNote(s, a.id, { kind: "basic", front: "V1", back: "A1" });
  upsertNote(s, a.id, { kind: "basic", front: "V2", back: "A2" });
  upsertNote(s, b.id, { kind: "basic", front: "V3", back: "A3" });
  for (const c of s.cards) {
    c.schedule = { ...c.schedule, state: 2, reps: 3 };
    c.practiceMark = "known";
    c.practiceAt = 1;
    s.reviews.push({ cardId: c.id, time: 1, rating: 3, day: "2026-01-01" });
  }
  assert.equal(resetSet(s, a.id), 2);
  for (const c of s.cards) {
    const note = s.notes.find((n) => n.id === c.noteId);
    if (note.setId === a.id) {
      assert.equal(c.schedule.state, State.New);
      assert.equal(c.practiceMark, undefined);
    } else {
      assert.equal(c.schedule.state, 2);
      assert.equal(c.practiceMark, "known");
    }
  }
  assert.equal(s.reviews.length, 1);
  assert.equal(resetSet(s, "missing"), 0);
});
test("Flashcards husselen staat aan en volgt de instelling", () => {
  assert.equal(emptyCollection().settings.flashShuffle, true);
  const s = emptyCollection(),
    set = newSet(s, { title: "Test" });
  for (let i = 0; i < 8; i++)
    upsertNote(s, set.id, { kind: "basic", front: "V" + i, back: "A" + i });
  s.settings.flashShuffle = false;
  const scope = { type: "set", id: set.id },
    expected = queueFor(s, scope, Date.now(), { practice: true }),
    session = createSession(s, scope, { mode: "flash" });
  assert.deepEqual(session.queue, expected);
});

test("Set swap flips basic and reverse, skips cloze", () => {
  const s = emptyCollection(),
    set = newSet(s, { title: "Frans" }),
    other = newSet(s, { title: "Latijn" });
  upsertNote(s, set.id, { kind: "basic", front: "pomme", back: "appel" });
  upsertNote(s, set.id, { kind: "reverse", front: "lire", back: "lezen" });
  upsertNote(s, set.id, {
    kind: "cloze",
    front: "De {{c1::kat}} slaapt.",
    back: "Uitleg",
  });
  upsertNote(s, other.id, { kind: "basic", front: "aqua", back: "water" });
  assert.deepEqual(swapSetQA(s, set.id), { swapped: 2, skipped: 1 });
  const [a, b, c, d] = s.notes;
  assert.equal(a.front, "appel");
  assert.equal(a.back, "pomme");
  assert.equal(b.front, "lezen");
  assert.equal(b.back, "lire");
  assert.ok(c.front.includes("{{c1::kat}}"));
  assert.equal(d.front, "aqua");
});

test("Bulk chapter replaces chapter tags, keeps the rest", () => {
  const s = emptyCollection(),
    set = newSet(s, { title: "Vak" });
  const a = upsertNote(s, set.id, {
    kind: "basic",
    front: "V1",
    back: "A1",
    tags: ["niveau::1"],
  });
  const b = upsertNote(s, set.id, {
    kind: "basic",
    front: "V2",
    back: "A2",
    tags: ["niveau::1", "hoofdstuk::H0", "kern"],
  });
  assert.equal(setChapter(s, [a.id, b.id], "H1"), 2);
  assert.ok(s.notes[0].tags.includes("hoofdstuk::H1"));
  assert.ok(s.notes[0].tags.includes("niveau::1"));
  assert.ok(!s.notes[1].tags.includes("hoofdstuk::H0"));
  assert.ok(s.notes[1].tags.includes("kern"));
  assert.equal(setChapter(s, ["missing"], "H2"), 0);
});
