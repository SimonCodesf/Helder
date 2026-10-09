import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  emptyCollection,
  newSet,
  upsertNote,
  stats,
  queueFor,
  scopeNotes,
  validateCollection,
} from "../src/model.js";
import { parseImport, toMarkdown, validateNote } from "../src/parser.js";
import {
  progressFor,
  labelMap,
  labelText,
  resumeLevel,
  resumeChapter,
} from "../src/curriculum.js";
import { prepareStep, evidenceState } from "../src/learning.js";
import { createSession } from "../src/study.js";
import {
  cloudSnapshot,
  mergeCollections,
  SyncEngine,
} from "../src/sync-core.js";
import { scheduleRating } from "../src/scheduler.js";
const clone = (v) => structuredClone(v);
const fixture = () => {
  const s = emptyCollection(),
    set = newSet(s, { title: "Vak" });
  upsertNote(s, set.id, {
    front: "Wat is een kwart?",
    back: "25%",
    kind: "basic",
    tags: ["niveau::1", "hoofdstuk::H1"],
  });
  return s;
};
test("V3 public collection is empty", async () =>
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(new URL("../data/starter.json", import.meta.url)),
    ),
    [],
  ));
test("Authored exercise Markdown round-trips exactly", async () => {
  const p = parseImport(
    await fs.readFile(new URL("../data/voorbeeld.md", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    parseImport(
      toMarkdown(
        { title: p.title, description: p.description },
        p.notes,
        p.folderPath,
      ),
    ).notes,
    p.notes,
  );
});
test("Invalid recognition answers are rejected", () => {
  for (const c of [
    { prompt: "Q", options: ["A", "A", "C"], correct: 0 },
    { prompt: "Q", options: ["A", "B"], correct: 0 },
    { prompt: "Q", options: ["A", "B", "C"], correct: 5 },
  ])
    assert.throws(() =>
      validateNote({
        front: "Q",
        back: "A",
        kind: "basic",
        learning: { choice: c },
      }),
    );
});
test("Unclosed teaching block is rejected", () =>
  assert.throws(() =>
    parseImport("## Q\nA\n:::toepassen\nvraag: X\nantwoord: Y"),
  ));
test("Unlimited switch is not capped at fifteen", () => {
  const s = fixture();
  for (let i = 0; i < 30; i++)
    upsertNote(s, s.sets[0].id, {
      front: "Q" + i,
      back: "A",
      kind: "basic",
      tags: [],
    });
  s.settings.dailyLimit = false;
  assert.equal(stats(s).newToday, 31);
  s.settings.dailyLimit = true;
  s.settings.newPerDay = 0;
  assert.equal(stats(s).newToday, 0);
});
test("New cards progress in numeric level order within each set", () => {
  const s = fixture();
  s.notes[0].tags = ["niveau::3"];
  const n = upsertNote(s, s.sets[0].id, {
    front: "Basis",
    back: "A",
    kind: "basic",
    tags: ["niveau::1"],
  });
  assert.equal(s.cards.find((c) => c.id === queueFor(s)[0]).noteId, n.id);
});
test("Level and chapter filters intersect", () => {
  const s = fixture();
  assert.equal(
    scopeNotes(s, { type: "all", level: "1", chapter: "H1" }).length,
    1,
  );
  assert.equal(
    scopeNotes(s, { type: "all", level: "2", chapter: "H1" }).length,
    0,
  );
});
test("First-time learner enters exploration; known reviews do not reread", () => {
  const s = fixture(),
    session = createSession(s, { type: "all" });
  prepareStep(session, s);
  assert.equal(session.phase, "explore");
  s.settings.scaffold = false;
  const plain = createSession(s, { type: "all" });
  prepareStep(plain, s);
  assert.equal(plain.phase, "recall");
});
test("Recognizing and same-day retries are not spaced evidence", () => {
  const s = fixture(),
    c = s.cards[0];
  c.schedule.reps = 3;
  s.reviews = [
    {
      cardId: c.id,
      rating: 3,
      day: "2026-01-01",
      time: 1767225600000,
      wasNew: false,
    },
    {
      cardId: c.id,
      rating: 3,
      day: "2026-01-01",
      time: 1767225600000,
      wasNew: false,
    },
    {
      cardId: c.id,
      rating: 3,
      day: "2026-01-02",
      time: 1767312000000,
      wasNew: false,
      assisted: true,
    },
  ];
  assert.equal(evidenceState(s, c), "building");
  s.reviews.push({
    cardId: c.id,
    rating: 3,
    day: "2026-01-03",
    time: 1767398400000,
    wasNew: false,
  });
  assert.equal(evidenceState(s, c), "spaced");
});
test("Curriculum label maps do not allow prototype mutation", () => {
  assert.throws(() => labelMap("__proto__ = X"));
  assert.equal(labelMap("1 = Basis")["1"], "Basis");
});
test("Cloud snapshots exclude local preferences and authentication", () => {
  const s = fixture();
  s.settings.theme = "dark";
  const p = cloudSnapshot(s);
  assert.equal(p.settings.theme, undefined);
  assert.equal(p.revision, undefined);
  assert.equal(p.lastBackup, undefined);
});
test("Different device edits merge without data loss", () => {
  const b = fixture(),
    l = clone(b),
    r = clone(b);
  l.notes[0].front = "Lokale vraag";
  r.notes[0].back = "Cloudantwoord";
  const m = mergeCollections(b, l, r);
  assert.equal(m.conflicts.length, 0);
  assert.equal(m.collection.notes[0].front, "Lokale vraag");
  assert.equal(m.collection.notes[0].back, "Cloudantwoord");
});
test("Same text edited twice requires explicit resolution", () => {
  const b = fixture(),
    l = clone(b),
    r = clone(b);
  l.notes[0].front = "L";
  r.notes[0].front = "R";
  const m = mergeCollections(b, l, r);
  assert.equal(m.conflicts.length, 1);
  const resolved = mergeCollections(b, l, r, {
    [m.conflicts[0].key]: "remote",
  });
  assert.equal(resolved.collection.notes[0].front, "R");
});
test("FSRS schedules are coherent atomic branches, never field-merged", () => {
  const b = fixture(),
    l = clone(b),
    r = clone(b);
  l.cards[0].schedule = scheduleRating(l.cards[0], 1, 0.9, Date.now()).schedule;
  r.cards[0].schedule = scheduleRating(r.cards[0], 4, 0.9, Date.now()).schedule;
  const m = mergeCollections(b, l, r);
  assert.equal(m.conflicts[0].key, `cards:${b.cards[0].id}:schedule`);
  const resolved = mergeCollections(b, l, r, { [m.conflicts[0].key]: "local" });
  assert.deepEqual(resolved.collection.cards[0].schedule, l.cards[0].schedule);
});
test("Inactive parallel attempt is preserved, not counted as daily progress", () => {
  const b = fixture(),
    l = clone(b),
    r = clone(b),
    time = Date.now(),
    id = b.cards[0].id;
  for (const [s, rating] of [
    [l, 1],
    [r, 4],
  ]) {
    s.cards[0].schedule = scheduleRating(
      s.cards[0],
      rating,
      0.9,
      time,
    ).schedule;
    s.reviews.push({
      id: "review" + rating,
      cardId: id,
      time,
      day: "2026-01-01",
      rating,
      wasNew: true,
    });
  }
  const m = mergeCollections(b, l, r),
    resolved = mergeCollections(b, l, r, { [m.conflicts[0].key]: "local" });
  assert.equal(resolved.collection.reviews.length, 2);
  assert.equal(
    resolved.collection.reviews.filter((x) => !x.inactive).length,
    1,
  );
  validateCollection(resolved.collection);
});
test("Concurrent folder cycle pauses safely", () => {
  const b = fixture();
  b.folders = [
    { id: "a", name: "A", parentId: null },
    { id: "b", name: "B", parentId: null },
  ];
  const l = clone(b),
    r = clone(b);
  l.folders[0].parentId = "b";
  r.folders[1].parentId = "a";
  const m = mergeCollections(b, l, r);
  assert.equal(m.conflicts[0].key, "structure");
});
test("New users never inherit another account binding", async () => {
  const saved = { userId: "owner-A", endpoint: "test", enabled: true },
    store = { get: async () => saved, set: async () => {} },
    engine = new SyncEngine({
      store,
      transport: {},
      getLocal: fixture,
      applyLocal: async () => {},
    });
  await engine.init("owner-B", "test");
  assert.equal(engine.phase, "account-mismatch");
  await assert.rejects(() => engine.connect());
});
test("Offline two-device sync merges different cards through optimistic CAS", async () => {
  const initial = fixture();
  let remote = null,
    revision = 0;
  const transport = {
    metadata: async () => (remote ? { revision } : null),
    read: async () => (remote ? { payload: clone(remote), revision } : null),
    push: async (payload, expected) => {
      if (expected !== revision) return { ok: false, revision };
      remote = clone(payload);
      return { ok: true, revision: ++revision };
    },
  };
  const make = (state) => {
    const data = new Map();
    let local = clone(state);
    return {
      engine: new SyncEngine({
        transport,
        store: {
          get: async (k) => data.get(k),
          set: async (k, v) => data.set(k, clone(v)),
        },
        getLocal: () => local,
        applyLocal: async (next, expected) => {
          assert.equal(local.revision, expected);
          local = { ...next, revision: expected + 1 };
        },
      }),
      read: () => local,
      edit: (fn) => {
        fn(local);
        local.revision++;
      },
    };
  };
  const a = make(initial),
    b = make(emptyCollection());
  await a.engine.init("u", "test");
  await a.engine.connect();
  await b.engine.init("u", "test");
  await b.engine.connect();
  assert.equal(b.read().notes.length, 1);
  a.edit((s) => (s.notes[0].front = "Offline A"));
  b.edit((s) => (s.notes[0].back = "Offline B"));
  await a.engine.sync();
  await b.engine.sync();
  await a.engine.sync();
  assert.equal(a.read().notes[0].back, "Offline B");
  assert.equal(b.read().notes[0].front, "Offline A");
});

test("New recognition content with same canonical prompt is not silently deduplicated", () => {
  const text = "## Q\nA\n\n---\n\n## Q\ntags: niveau::2\nA";
  assert.equal(parseImport(text).notes.length, 2);
});
test("Spaced evidence does not reward attempts across midnight two minutes apart", () => {
  const s = fixture(),
    c = s.cards[0];
  c.schedule.reps = 2;
  s.reviews = [
    {
      id: "a",
      cardId: c.id,
      rating: 3,
      day: "2026-01-01",
      time: 1767311940000,
      wasNew: false,
    },
    {
      id: "b",
      cardId: c.id,
      rating: 3,
      day: "2026-01-02",
      time: 1767312060000,
      wasNew: false,
    },
  ];
  assert.equal(evidenceState(s, c), "building");
});
test("Content edits on different devices ignore updatedAt metadata conflict", () => {
  const b = fixture(),
    l = clone(b),
    r = clone(b);
  l.notes[0].front = "L";
  l.notes[0].updatedAt += 10;
  r.notes[0].back = "R";
  r.notes[0].updatedAt += 20;
  const m = mergeCollections(b, l, r);
  assert.equal(m.conflicts.length, 0);
  assert.equal(m.collection.notes[0].updatedAt, r.notes[0].updatedAt);
});
test("Late network response cannot restore a logged-out local collection", async () => {
  const s = fixture();
  let release,
    reads = 0,
    applied = 0,
    pushed = 0;
  const gate = new Promise((resolve) => (release = resolve));
  const data = new Map([
    [
      "sync-meta",
      {
        userId: "u",
        endpoint: "x",
        enabled: true,
        base: cloudSnapshot(emptyCollection()),
        revision: 0,
      },
    ],
  ]);
  const engine = new SyncEngine({
    store: {
      get: async (k) => data.get(k),
      set: async (k, v) => data.set(k, v),
    },
    getLocal: () => s,
    applyLocal: async () => applied++,
    transport: {
      metadata: async () => {
        await gate;
        return { revision: 1 };
      },
      read: async () => {
        reads++;
        return { revision: 1, payload: cloudSnapshot(s) };
      },
      push: async () => {
        pushed++;
        return { ok: true, revision: 2 };
      },
    },
  });
  await engine.init("u", "x");
  const request = engine.sync();
  engine.cancel();
  release();
  await request;
  assert.equal(applied, 0);
  assert.equal(pushed, 0);
});
test("Invalid imported curriculum is rejected before a set is written", () => {
  const s = emptyCollection();
  for (const curriculum of [
    [],
    "bad metadata",
    false,
    { levels: ["Basis"] },
    { levels: { 1: 42 } },
    JSON.parse('{"chapters":{"__proto__":"bad"}}'),
  ]) {
    assert.throws(() => newSet(s, { title: "Vak", curriculum }));
    assert.equal(s.sets.length, 0);
  }
});
test("Valid curriculum is cloned and survives collection validation", () => {
  const s = emptyCollection(),
    curriculum = { levels: { 1: "Basis" }, chapters: { H1: "Inleiding" } };
  const set = newSet(s, { title: "Vak", curriculum });
  curriculum.levels[1] = "Changed outside the collection";
  assert.equal(set.curriculum.levels[1], "Basis");
  assert.equal(
    validateCollection(s).sets[0].curriculum.chapters.H1,
    "Inleiding",
  );
});

test("Rename fields are prefilled with values in use", () => {
  const s = fixture(),
    set = s.sets[0];
  assert.equal(labelText(s, set, "chapters"), "H1 = Hoofdstuk H1");
  assert.equal(labelText(s, set, "levels"), "1 = Niveau 1");
  set.curriculum = { chapters: { H1: "Inleiding" } };
  assert.equal(labelText(s, set, "chapters"), "H1 = Inleiding");
  assert.equal(labelMap(labelText(s, set, "chapters"))["H1"], "Inleiding");
});

test("Resume prefers engaged levels and chapters over pristine new", () => {
  const s = emptyCollection(),
    set = newSet(s, { title: "Vak" });
  upsertNote(s, set.id, {
    kind: "basic",
    front: "Oud",
    back: "O",
    tags: ["niveau::1", "hoofdstuk::H1"],
  });
  for (let i = 0; i < 5; i++)
    upsertNote(s, set.id, {
      kind: "basic",
      front: "Nieuw " + i,
      back: "N" + i,
      tags: ["niveau::2", "hoofdstuk::H9"],
    });
  const due = s.cards[0];
  due.schedule.state = 2;
  due.schedule.reps = 5;
  due.schedule.due = Date.now() - 1000;
  assert.equal(resumeLevel(s, set), "1");
  assert.equal(resumeChapter(s, set, "").chapter, "H1");
});

test("Resume falls back to first new, then to nothing when done", () => {
  const s = emptyCollection(),
    set = newSet(s, { title: "Vak" });
  upsertNote(s, set.id, {
    kind: "basic",
    front: "Nieuw",
    back: "N",
    tags: ["niveau::2", "hoofdstuk::H9"],
  });
  assert.equal(resumeLevel(s, set), "2");
  assert.equal(resumeChapter(s, set, "").chapter, "H9");
  const c = s.cards[0];
  c.schedule.state = 2;
  c.schedule.reps = 5;
  c.schedule.due = Date.now() + 86400000;
  assert.equal(resumeLevel(s, set), "");
  assert.equal(resumeChapter(s, set, ""), null);
});
