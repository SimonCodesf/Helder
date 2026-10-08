// Optional integration test. Requires Playwright + a Chromium binary.
// Run a local server first, then: node tests/browser-smoke.mjs
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://127.0.0.1:4173";
const output =
  process.env.TEST_OUTPUT ||
  fileURLToPath(new URL("../test-results/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN || undefined,
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
  acceptDownloads: true,
});
const page = await context.newPage(),
  errors = [],
  report = [];
page.on("pageerror", (error) => errors.push(error.message));
const click = (action) =>
  page
    .locator(`[data-action="${action}"]`)
    .filter({ visible: true })
    .first()
    .click();
const wait = () => page.waitForTimeout(200);
const shot = async (name) => {
  await wait();
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: false });
};
const check = (name) => {
  report.push({ name, result: "pass" });
  console.log("PASS", name);
};
const inspectOverflow = async (name) => {
  const p = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(
    p.scroll <= p.width + 1,
    `${name}: horizontal overflow ${p.scroll}/${p.width}`,
  );
};
const snapshot = () =>
  page.evaluate(async () => {
    const req = indexedDB.open("helder-v1", 1);
    const db = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("state", "readonly");
    const r = tx.objectStore("state").get("collection");
    return await new Promise(
      (resolve) =>
        (r.onsuccess = () => {
          const v = r.result;
          db.close();
          resolve(v);
        }),
    );
  });
try {
  await page.goto(base);
  await page.waitForSelector(".today-hero");
  assert.equal((await snapshot()).cards.length, 432);
  check("Starter 50 + 382 cards");
  await shot("01-vandaag");
  await inspectOverflow("today desktop");
  const beforeSkip = await page.evaluate(() => location.hash);
  await page.locator(".skip-link").focus();
  await page.locator(".skip-link").click();
  assert.equal(await page.evaluate(() => location.hash), beforeSkip);
  assert.equal(await page.evaluate(() => document.activeElement.id), "main");
  check("Skip link keeps route and focuses content");
  await page.goto(`${base}/#/library`);
  await page.waitForSelector("#live-query");
  await page.fill("#live-query", "Algemene");
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".set-card").count(), 1);
  check("Live search sets");
  await page.fill("#live-query", "");
  await page.waitForTimeout(300);
  await shot("02-bibliotheek");
  await page
    .locator(".set-card h3 a")
    .filter({ hasText: "Algemene filosofie" })
    .click();
  await page.waitForSelector(".card-row");
  await shot("03-set");
  await page.locator('.card-row [data-action="star-note"]').first().click();
  await wait();
  assert.ok((await snapshot()).notes.some((n) => n.starred));
  check("Star persistence");
  const setHash = await page.evaluate(() => location.hash);
  const beforeReviews = (await snapshot()).reviews.length;
  await click("start-flash");
  await page.waitForSelector(".flash-card");
  await shot("04-flash-vraag");
  await click("flip");
  await shot("05-flash-antwoord");
  await click("flash-next");
  await click("end-study");
  assert.equal((await snapshot()).reviews.length, beforeReviews);
  check("Flashcards do not reschedule");
  await click("start-learn");
  await page.waitForSelector("#study-answer");
  await page.fill(
    "#study-answer",
    "Dit is mijn eigen formulering, niet een letterlijke definitie.",
  );
  await shot("06-leren-vraag");
  await click("reveal");
  await shot("07-leren-antwoord");
  await page.locator('[data-rating="3"]').click();
  await wait();
  assert.equal((await snapshot()).reviews.length, beforeReviews + 1);
  check("Learn rating persisted");
  await click("undo-grade");
  await wait();
  assert.equal((await snapshot()).reviews.length, beforeReviews);
  assert.ok(await page.locator('[data-rating="3"]').isVisible());
  check("Undo restores schedule and review log");
  await page.locator('[data-rating="3"]').click();
  await wait();
  await page.reload();
  await page.waitForSelector(".empty-state");
  assert.equal((await snapshot()).reviews.length, beforeReviews + 1);
  check("Progress survives reload");
  await page.goto(`${base}/#/today`);
  await page.waitForSelector(".today-hero");
  await click("new-set");
  await page.waitForSelector("#set-title");
  await page.fill("#set-title", "QA handmatige set");
  await page.fill("#note-front", "Waarom oefenen met vragen?");
  await page.fill(
    "#note-back",
    "Om **actief op te halen**, niet alleen opnieuw te lezen.",
  );
  await page.fill("#note-tags", "qa, niveau::1");
  await page.locator(".editor-extras:not(.set-options) summary").click();
  await page.fill("#note-hint", "Het gaat om ophalen.");
  await page.fill("#note-explain", "Geef een eigen voorbeeld.");
  await click("note-preview");
  await shot("08-editor");
  await click("builder-save");
  await page.waitForSelector(".card-row");
  assert.equal((await snapshot()).sets.length, 3);
  check("Manual editor saves last pending card");
  await click("start-learn");
  await page.waitForSelector("#study-answer");
  await click("show-hint");
  await click("reveal");
  assert.ok(await page.locator('[data-rating="3"]').isDisabled());
  assert.ok(await page.locator('[data-rating="2"]').isDisabled());
  await page.locator('[data-rating="1"]').click();
  await wait();
  assert.equal((await snapshot()).reviews.at(-1).rating, 1);
  await shot("09-ronde-klaar");
  check("Hint requires Again; future learning not forced early");
  await click("end-study");
  await page.goto(`${base}/#/library`);
  await page.waitForSelector(".set-grid");
  await click("new-set");
  await page.waitForSelector("#set-title");
  await page.fill("#set-title", "QA Markdown");
  await page.locator('[data-action="builder-tab"][data-tab="import"]').click();
  await page.fill(
    "#import-text",
    "# QA Markdown\nmap: Tests::Import\n\n## Kennis is {{c1::weten}} en {{c2::begrijpen}}.\ntype: cloze\ntags: qa, invul\n\nExtra uitleg.\n\n---\n\n## A\ntype: reverse\n\nB",
  );
  await page.waitForTimeout(400);
  assert.match(
    await page.locator("#import-preview").innerText(),
    /2 kaarten gevonden/,
  );
  await shot("10-import");
  await click("builder-save");
  await page.waitForSelector(".card-row");
  assert.equal((await snapshot()).sets.length, 4);
  assert.equal((await snapshot()).cards.length, 437);
  check("Markdown import + cloze + reverse templates");
  const current = (await snapshot()).notes.filter((n) => n.front === "A")[0];
  await page
    .locator(`[data-action="edit-note"][data-id="${current.id}"]`)
    .click();
  await page.fill("#note-back", "B aangepast");
  await click("save-note");
  await wait();
  assert.equal(
    (await snapshot()).notes.find((n) => n.id === current.id).back,
    "B aangepast",
  );
  check("Note edit");
  await click("edit-set");
  await page.fill("#set-title", "QA Markdown hernoemd");
  await click("save-set");
  await wait();
  assert.match(await page.locator("main h1").innerText(), /hernoemd/);
  check("Rename set");
  await page.goto(`${base}/#/library`);
  await page.waitForSelector(".set-grid");
  await click("new-folder");
  await page.fill("#folder-name", "QA map");
  await click("save-folder");
  await wait();
  const data = await snapshot(),
    folder = data.folders.find((f) => f.name === "QA map");
  assert.ok(folder);
  await page.goto(`${base}/#/folder/${folder.id}`);
  await page.waitForSelector("main h1");
  await shot("11-map-leeg");
  await click("edit-folder");
  await page.fill("#folder-name", "QA map hernoemd");
  await click("save-folder");
  assert.equal(
    (await snapshot()).folders.find((f) => f.id === folder.id).name,
    "QA map hernoemd",
  );
  check("Folder create and rename");
  await click("edit-folder");
  await click("delete-folder");
  await page.waitForSelector('[data-action="confirm"]');
  await click("confirm");
  await wait();
  assert.ok(!(await snapshot()).folders.some((f) => f.id === folder.id));
  check("Folder delete");
  await page.goto(`${base}/#/tag/qa`);
  await page.waitForSelector(".card-row");
  assert.equal(await page.locator(".card-row").count(), 2);
  await shot("12-tag");
  check("Cross-set tag filter");
  // Pausing excludes all templates; resuming restores them without losing progress.
  const pausedId = (await snapshot()).notes.find(
    (n) => n.front === "Waarom oefenen met vragen?",
  ).id;
  await page
    .locator(`[data-action="edit-note"][data-id="${pausedId}"]`)
    .click();
  await click("pause-note");
  await wait();
  assert.ok(
    (await snapshot()).cards
      .filter((c) => c.noteId === pausedId)
      .every((c) => c.suspended),
  );
  await click("close-modal");
  await page
    .locator(`[data-action="edit-note"][data-id="${pausedId}"]`)
    .click();
  await click("pause-note");
  await wait();
  assert.ok(
    (await snapshot()).cards
      .filter((c) => c.noteId === pausedId)
      .every((c) => !c.suspended),
  );
  await click("close-modal");
  check("Pause and resume templates");
  await page.goto(`${base}/#/difficult`);
  await page.waitForSelector(".empty-state");
  await shot("13-moeilijk-leeg");
  await page.goto(`${base}${setHash}`);
  await page.waitForSelector(".card-row");
  await click("add-cards");
  await page.locator('[data-action="builder-tab"][data-tab="import"]').click();
  await page.locator("#import-file").setInputFiles({
    name: "extra.tsv",
    mimeType: "text/tab-separated-values",
    buffer: Buffer.from(
      "Term\tDefinitie\nEen extra term\tEen eenvoudige definitie.\nEen extra term\tEen eenvoudige definitie.",
      "utf8",
    ),
  });
  await page.waitForTimeout(400);
  assert.match(
    await page.locator("#import-preview").innerText(),
    /1 kaart gevonden/,
  );
  await click("builder-save");
  await wait();
  assert.equal((await snapshot()).cards.length, 438);
  check("TSV file import and duplicate skip");
  await page.goto(`${base}/#/settings`);
  await page.waitForSelector("#settings-form");
  await page.fill("#new-per-day", "10");
  await page.fill("#session-size", "5");
  await page.selectOption("#answer-mode", "think");
  await click("submit-settings");
  await wait();
  assert.equal((await snapshot()).settings.newPerDay, 10);
  assert.equal((await snapshot()).settings.answerMode, "think");
  check("Settings persist");
  await shot("14-instellingen");
  const downloadPromise = page.waitForEvent("download");
  await click("backup");
  const download = await downloadPromise;
  await download.saveAs(`${output}/backup.json`);
  const backup = JSON.parse(await readFile(`${output}/backup.json`, "utf8"));
  assert.equal(backup.cards.length, 438);
  check("Backup export contains schedule and cards");
  const chooserPromise = page.waitForEvent("filechooser");
  await click("restore");
  const chooser = await chooserPromise;
  await chooser.setFiles(`${output}/backup.json`);
  await page.waitForSelector('[data-action="confirm"]');
  await shot("15-herstel");
  await click("confirm");
  await page.waitForSelector(".today-hero");
  assert.equal((await snapshot()).cards.length, 438);
  check("Backup restore validated and applied");
  await page.goto(`${base}/#/settings`);
  await page.waitForSelector("#settings-form");
  await page.selectOption("#theme", "dark");
  await click("submit-settings");
  await wait();
  await shot("16-donker");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  check("Dark theme");
  await page.selectOption("#theme", "light");
  await click("submit-settings");
  await page.goto(`${base}/#/guide`);
  await page.waitForSelector(".readable");
  await shot("17-handleiding");
  await inspectOverflow("guide");
  await page.goto(`${base}/#/today`);
  await page.waitForSelector(".today-hero");
  await page.evaluate(async () => {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Offline installatie niet gereed na 10s")),
          10000,
        ),
      ),
    ]);
  });
  await page.reload();
  await page.waitForSelector(".today-hero");
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector(".today-hero");
  assert.equal((await snapshot()).cards.length, 438);
  await click("new-set");
  assert.ok(await page.locator("#set-title").isVisible());
  await click("close-modal");
  check("Service worker offline reload and editor");
  await context.setOffline(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/#/today`);
  await page.waitForSelector(".today-hero");
  await shot("18-mobiel-vandaag");
  await inspectOverflow("mobile today");
  await page.locator("#menu-toggle").click();
  assert.ok(await page.locator("#sidebar").isVisible());
  await shot("19-mobiel-menu");
  await page.locator('#sidebar a[href="#/library"]').click();
  await page.waitForSelector(".set-grid");
  await shot("20-mobiel-bibliotheek");
  await inspectOverflow("mobile library");
  check("Mobile navigation");
  await page
    .locator(".set-card h3 a")
    .filter({ hasText: "Algemene filosofie" })
    .click();
  await page.waitForSelector(".card-row");
  await shot("21-mobiel-set");
  await inspectOverflow("mobile set");
  await click("start-learn");
  await page.waitForSelector('[data-action="reveal"]');
  await shot("22-mobiel-leren");
  await click("reveal");
  await shot("23-mobiel-antwoord");
  await inspectOverflow("mobile learning");
  check("Mobile learning layout");
  await click("end-study");
  await page.locator('.mobile-bar [data-action="new-set"]').click();
  await page.waitForSelector("#set-title");
  await shot("24-mobiel-editor");
  await inspectOverflow("mobile modal");
  await click("close-modal");
  // Two concurrent tabs must not silently overwrite each other's collection.
  await page.goto(`${base}/#/settings`);
  await page.waitForSelector("#settings-form");
  const other = await context.newPage();
  other.on("pageerror", (error) => errors.push(error.message));
  await other.goto(`${base}/#/settings`);
  await other.waitForSelector("#settings-form");
  await page.fill("#new-per-day", "9");
  await click("submit-settings");
  await wait();
  await other.fill("#new-per-day", "19");
  await other.locator('[data-action="submit-settings"]').click();
  await other.waitForTimeout(400);
  assert.match(await other.locator("#toast").innerText(), /andere tab/);
  assert.equal((await snapshot()).settings.newPerDay, 9);
  await other.close();
  check("Concurrent tab refuses stale overwrite");
  // File scheme shows an explanatory message even if module loading fails.
  const filePage = await context.newPage();
  await filePage.goto(new URL("../index.html", import.meta.url).href);
  assert.match(await filePage.locator("#main").innerText(), /lokale server/);
  await filePage.close();
  check("file:// startup help");
  assert.deepEqual(errors, []);
  check("No JavaScript runtime errors");
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ tests: report.length, report, errors }, null, 2),
  );
  console.log(`\n${report.length} browser checks passed.`);
  await browser.close();
  process.exit(0);
} catch (error) {
  console.error("FAILED:", error);
  console.error("Runtime errors:", errors);
  await page.screenshot({ path: `${output}/failure.png`, fullPage: false });
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ report, errors, failure: error.message }, null, 2),
  );
  await browser.close();
  process.exit(1);
}
