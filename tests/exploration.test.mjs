import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyCollection,
  newSet,
  upsertNote,
  validateCollection,
} from "../src/model.js";
import { createSession, currentCardId } from "../src/study.js";
import {
  prepareStep,
  startExploration,
  nextExploration,
  finishExploration,
  requeueExploration,
  dropExploredCard,
  exploredCardIds,
  explorationTerm,
  explorationTasks,
} from "../src/learning.js";
import { parseImport, toMarkdown, toTSV } from "../src/parser.js";
import { validateCloudConfig, CloudConnection } from "../src/cloud.js";
const fixture = () => {
  const s = emptyCollection(),
    set = newSet(s, { title: "Begrippen" });
  for (let i = 0; i < 6; i++)
    upsertNote(s, set.id, {
      front: "Begrip " + i,
      back: "Een definitie voor begrip " + i + ".",
      kind: "basic",
      tags: ["niveau::1", "hoofdstuk::H1"],
    });
  return s;
};
const skipBatch = (s) => {
  s.exploration.screen = "bridge";
  finishExploration(s);
};
test("Warm group is bounded and leaves schedules/reviews unchanged", () => {
  const s = fixture(),
    before = structuredClone(s),
    ss = createSession(s, { type: "all" });
  prepareStep(ss, s);
  assert.equal(ss.exploration.ids.length, 3);
  startExploration(ss, s);
  assert.equal(ss.exploration.task.kind, "reverse");
  assert.deepEqual(s, before);
});
test("Learn round holds one bounded batch of new cards", () => {
  const s = fixture(),
    ss = createSession(s, { type: "all" });
  // Six new cards, default group of three: the rest waits for later rounds.
  assert.equal(ss.queue.length, 3);
  prepareStep(ss, s);
  assert.deepEqual(ss.exploration.ids, ss.queue.slice(0, 3));
  finishExploration(ss);
  // No second group mid-round: the batch is recalled directly.
  prepareStep(ss, s);
  assert.equal(ss.exploration, undefined);
  assert.equal(ss.phase, "recall");
});
test("New batch is explored first, then recalled with due reviews", () => {
  const s = fixture();
  s.cards[0].schedule.state = 2;
  s.cards[0].schedule.reps = 5;
  s.cards[0].schedule.due = Date.now() - 1000;
  const ss = createSession(s, { type: "all" });
  assert.deepEqual(ss.queue.slice(0, 3), [
    s.cards[1].id,
    s.cards[2].id,
    s.cards[3].id,
  ]);
  assert.equal(ss.queue.at(-1), s.cards[0].id);
  prepareStep(ss, s);
  assert.equal(ss.phase, "explore");
  finishExploration(ss);
  prepareStep(ss, s);
  assert.equal(ss.phase, "recall");
});
test("Skipping start does not mark the later recall as assisted", () => {
  const s = fixture(),
    ss = createSession(s, { type: "all" });
  prepareStep(ss, s);
  finishExploration(ss);
  prepareStep(ss, s);
  assert.equal(ss.phase, "recall");
  assert.equal(ss.introSeen, false);
});
test("All warmed cards receive recent-help flags on productive recall", () => {
  const s = fixture(),
    ss = createSession(s, { type: "all" });
  prepareStep(ss, s);
  const ids = [...ss.exploration.ids];
  startExploration(ss, s);
  nextExploration(ss, s);
  nextExploration(ss, s);
  nextExploration(ss, s);
  assert.equal(ss.exploration.screen, "bridge");
  finishExploration(ss);
  for (const id of ids) {
    assert.equal(ss.queue[0], id);
    prepareStep(ss, s);
    assert.equal(ss.introSeen, true);
    ss.queue.shift();
    ss.preparedId = null;
  }
  // The batch is done: no second group mid-round.
  prepareStep(ss, s);
  assert.equal(ss.exploration, undefined);
  assert.equal(ss.phase, "recall");
});
test("Reverse clue masks exact term without replacing longer words", () => {
  const n = { front: "Kat", back: "De kat is geen kathedraal.", kind: "basic" };
  assert.equal(
    explorationTasks(n, { template: "forward" })[0].definition,
    "De […] is geen kathedraal.",
  );
});
test("Ordinary question and cloze are not automatically inverted", () => {
  for (const n of [
    {
      front: "Wat is kennis?",
      back: "Een onderbouwde overtuiging.",
      kind: "basic",
    },
    {
      front: "Leg kennis uit",
      back: "Een onderbouwde overtuiging.",
      kind: "basic",
    },
    { front: "Kennis is {{c1::weten}}.", back: "Uitleg", kind: "cloze" },
  ])
    assert.equal(explorationTerm(n), null);
});
test("Explicit term enables reverse exploration of a question card", () => {
  const n = {
    front: "Wat betekent 25%?",
    back: "Een kwart.",
    kind: "basic",
    learning: { term: "Een kwart" },
  };
  assert.equal(
    explorationTasks(n, { template: "forward" })[0].term,
    "Een kwart",
  );
});
test("Authored choice precedes definition-to-term exploration", () => {
  const n = {
    front: "Kennis",
    back: "Kennis gaat over weten.",
    kind: "basic",
    learning: {
      choice: {
        prompt: "Welke omschrijving?",
        options: ["Weten", "Bewegen", "Voelen"],
        correct: 0,
      },
      term: "Kennis",
    },
  };
  assert.deepEqual(
    explorationTasks(n, { template: "forward" }).map((t) => t.kind),
    ["choice", "reverse"],
  );
});
test("No authored choice means no fabricated distractors", () => {
  const n = { front: "Wat betekent 25%?", back: "Een kwart.", kind: "basic" };
  assert.deepEqual(
    explorationTasks(n, { template: "forward" }).map((t) => t.kind),
    ["exposure"],
  );
});
test("Reverse SRS template does not receive unrelated forward choice", () => {
  const n = {
    front: "Kennis",
    back: "Weten",
    kind: "reverse",
    learning: {
      choice: { prompt: "A?", options: ["A", "B", "C"], correct: 0 },
    },
  };
  assert.equal(
    explorationTasks(n, { template: "reverse" })[0].kind,
    "exposure",
  );
});
test("Standalone exploration includes future cards but never schedules them", () => {
  const s = fixture();
  s.cards[0].schedule.state = 2;
  s.cards[0].schedule.due = Date.now() + 86400000;
  const before = structuredClone(s),
    ss = createSession(s, { type: "all" }, { mode: "explore" });
  assert.ok(ss.queue.includes(s.cards[0].id));
  prepareStep(ss, s);
  startExploration(ss, s);
  const active = currentCardId(ss);
  nextExploration(ss, s);
  assert.notEqual(currentCardId(ss), active);
  skipBatch(ss);
  assert.deepEqual(s, before);
});
test("Skipping free exploration is not counted as actually viewed", () => {
  const s = fixture(),
    ss = createSession(s, { type: "all" }, { mode: "explore" });
  prepareStep(ss, s);
  finishExploration(ss);
  assert.equal(ss.exploredIds.length, 0);
});
test("Term metadata roundtrips Markdown and TSV", () => {
  const p = parseImport(
    "# Vak\n\n## Wat betekent 25%?\nverken-term: Een kwart\n\nEen kwart.\n",
  );
  assert.equal(p.notes[0].learning.term, "Een kwart");
  assert.equal(
    parseImport(toMarkdown({ title: "Vak" }, p.notes)).notes[0].learning.term,
    "Een kwart",
  );
  assert.equal(
    parseImport(toTSV(p.notes), "tsv").notes[0].learning.term,
    "Een kwart",
  );
});
test("Literal Term text in an answer is not accidentally metadata", () => {
  const p = parseImport(
    "# Vak\n\n## Kennis\nTerm: dit is gewone antwoordtekst.\n",
  );
  assert.match(p.notes[0].back, /Term:/);
});
test("Bad batch size is rejected and old backups get the default", () => {
  const s = fixture();
  assert.throws(() =>
    validateCollection({ ...s, settings: { ...s.settings, exploreSize: 99 } }),
  );
  delete s.settings.exploreSize;
  assert.equal(validateCollection(s).settings.exploreSize, 3);
});
test("Email provider is accepted, private key still refused", () => {
  const cfg = {
    supabaseUrl: "https://project.example.test",
    publishableKey: "sb_publishable_TEST_ONLY",
    providers: ["email"],
  };
  assert.deepEqual(validateCloudConfig(cfg).providers, ["email"]);
  assert.throws(() =>
    validateCloudConfig({ ...cfg, publishableKey: "sb_secret_PRIVATE" }),
  );
});
test("Email login uses the SDK and requires explicit opt-in before sync", async () => {
  const c = new CloudConnection({});
  c.config = { providers: ["email"] };
  let seen;
  c.client = {
    auth: {
      signInWithPassword: async (v) => (
        (seen = v),
        { data: { session: null }, error: null }
      ),
    },
  };
  await c.emailAuth("login", "mock@example.test", "TEST_ONLY");
  assert.equal(seen.email, "mock@example.test");
  assert.equal(c.engine, null);
});
test("Registration/resets use the SDK; credential update requires recovery", async () => {
  const c = new CloudConnection({});
  c.config = { providers: ["email"] };
  let signup = 0,
    reset = 0;
  c.client = {
    auth: {
      signUp: async () => {
        signup++;
        return { data: { session: null } };
      },
      resetPasswordForEmail: async () => {
        reset++;
        return { data: {} };
      },
    },
  };
  const old = globalThis.location;
  globalThis.location = { pathname: "/", origin: "https://app.example.test" };
  try {
    await c.emailAuth("register", "mock@example.test", "TEST_ONLY");
    await c.emailAuth("forgot", "mock@example.test", "");
    await assert.rejects(c.emailAuth("update", "", "TEST_ONLY"));
    assert.equal(signup, 1);
    assert.equal(reset, 1);
  } finally {
    globalThis.location = old;
  }
});

test("Explored cards stay explored in later rounds", () => {
  const s = fixture();
  s.activities.push({ cardId: s.cards[0].id, round: "exploration" });
  const ss = createSession(s, { type: "all" });
  assert.ok(ss.warmedIds.includes(s.cards[0].id));
  ss.queue = [s.cards[0].id];
  prepareStep(ss, s);
  assert.equal(ss.phase, "recall");
  assert.equal(ss.exploration, undefined);
});

test("Failed reverse exploration returns twice, then drops", () => {
  const s = fixture();
  const ss = createSession(s, { type: "all" });
  prepareStep(ss, s);
  startExploration(ss, s);
  assert.equal(ss.exploration.task.kind, "reverse");
  const first = ss.exploration.ids[0];
  ss.exploration.revealed = true;
  assert.equal(requeueExploration(ss), true);
  assert.equal(requeueExploration(ss), true);
  assert.equal(requeueExploration(ss), false);
  dropExploredCard(ss);
  finishExploration(ss);
  // Dropped: not warmed, not recalled, unexplored again next round.
  assert.ok(!ss.warmedIds.includes(first));
  assert.ok(!ss.queue.includes(first));
  s.activities.push(
    { cardId: first, round: "exploration" },
    { cardId: first, round: "exploration" },
    { cardId: first, round: "exploration", dropped: true },
  );
  assert.ok(!exploredCardIds(s).includes(first));
});
