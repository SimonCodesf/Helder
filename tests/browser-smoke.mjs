import {
  chromium,
  launchOptions,
  TEST_URL,
  EXAMPLE_FILE,
  outputFile,
} from "./browser-environment.mjs";
import fs from "node:fs/promises";
import { finishWarmGroup } from "./exploration-browser-helpers.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    reducedMotion: "reduce",
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const click = (a) => page.locator(`[data-action="${a}"]`).first().click();
const collection = () =>
  page.evaluate(async () => {
    const r = indexedDB.open("helder-v1");
    const db = await new Promise((res, rej) => {
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return new Promise((res, rej) => {
      const g = db
        .transaction("state", "readonly")
        .objectStore("state")
        .get("collection");
      g.onsuccess = () => res(g.result);
      g.onerror = () => rej(g.error);
    });
  });
const snapshot = async (name) => {
  await page.waitForTimeout(250);
  await page.locator("#toast").evaluate((el) => (el.hidden = true));
  await page.screenshot({ path: outputFile(`${name}.png`) });
};
try {
  await page.goto(TEST_URL);
  await page.locator(".welcome-card").waitFor();
  assert.equal((await collection()).notes.length, 0);
  await snapshot("01-empty-mobile");
  await click("new-import");
  await page
    .locator("#import-text")
    .fill(await fs.readFile(EXAMPLE_FILE, "utf8"));
  await page
    .locator("#builder-status")
    .filter({ hasText: "5 kaarten klaar" })
    .waitFor();
  await click("builder-save");
  await page.locator("#structure-title").waitFor();
  assert.equal((await collection()).notes.length, 5);
  console.log(
    "PASS empty publication, authored Markdown exercises, automatic levels/chapters",
  );
  await click("edit-set");
  await page
    .locator(".editor-extras")
    .filter({ has: page.locator("#set-levels") })
    .locator("summary")
    .click();
  await page
    .locator("#set-levels")
    .fill("1 = Basis\n2 = Verbanden\n3 = Toepassen");
  await page
    .locator("#set-chapters")
    .fill("H1 = Breuken en percentages\nH2 = Groei\nH3 = Twee veranderingen");
  await click("save-set");
  await snapshot("02-course-mobile");
  await page.locator('[data-action="select-level"][data-level="2"]').click();
  assert.match(await page.locator(".chapter-list").innerText(), /Groei/);
  assert.doesNotMatch(
    await page.locator(".chapter-list").innerText(),
    /Breuken en percentages/,
  );
  await page.locator('[data-action="select-level"][data-level=""]').click();
  console.log("PASS first-class level selection, meaningful chapter labels");
  const before = (await collection()).cards.map((c) => c.schedule);
  await click("start-flash");
  await page.locator(".flash-card").waitFor();
  await snapshot("03-swipe-mobile");
  const box = await page.locator(".flip-surface").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + 160, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  assert.equal(
    (await collection()).cards.filter((c) => c.practiceMark === "known").length,
    1,
  );
  assert.deepEqual(
    (await collection()).cards.map((c) => c.schedule),
    before,
  );
  await click("undo-flash");
  assert.equal(
    (await collection()).cards.filter((c) => c.practiceMark === "known").length,
    0,
  );
  await page.locator('[data-action="flash-mark"][data-mark="unknown"]').click();
  await page.waitForTimeout(100);
  await click("end-study");
  console.log(
    "PASS horizontal swipe, persistent known/unknown, undo, scheduling unchanged",
  );
  await click("start-learn");
  await page.locator(".exploration-intro").waitFor();
  await snapshot("04-exploration-start-mobile");
  await click("intro");
  await page.locator(".choice-options").waitFor();
  await snapshot("05-recognition-mobile");
  await page.locator('[data-action="choose-answer"][data-choice="1"]').click();
  assert.equal((await collection()).reviews.length, 0);
  assert.equal((await collection()).activities.length, 1);
  await snapshot("05b-choice-feedback-mobile");
  await click("explore-next");
  await page.locator("#explore-answer").fill("Een kwart");
  await click("explore-reveal");
  await snapshot("06-reverse-mobile");
  await page
    .locator('[data-action="explore-rate"][data-success="true"]')
    .click();
  await finishWarmGroup(page);
  assert.equal((await collection()).reviews.length, 0);
  assert.equal((await collection()).activities.length, 4);
  await page.locator("#study-answer").fill("Een kwart: 25 van elke 100.");
  await click("reveal");
  await snapshot("07-recall-mobile");
  assert.equal(await page.locator('[data-rating="4"]').isDisabled(), true);
  await page.locator('[data-rating="3"]').click();
  assert.equal((await collection()).reviews.length, 1);
  assert.equal((await collection()).reviews[0].assisted, true);
  console.log(
    "PASS exploratory group → authored choice → reverse clue → productive recall; only recall writes FSRS",
  );
  await click("end-study");
  const scheduled = JSON.stringify(
    (await collection()).cards.map((c) => c.schedule),
  );
  await click("start-transfer");
  await page.locator("#application-answer").fill("Mijn eigen aanpak.");
  await click("application-reveal");
  await snapshot("08-application-mobile");
  await page
    .locator('[data-action="application-rate"][data-success="true"]')
    .click();
  assert.equal(
    JSON.stringify((await collection()).cards.map((c) => c.schedule)),
    scheduled,
  );
  console.log(
    "PASS application self-check and separate activity log, no FSRS contamination",
  );
  await click("end-study");
  await page.goto(TEST_URL + "/#/settings");
  await page.locator("#daily-limit").uncheck();
  await click("submit-settings");
  assert.equal((await collection()).settings.dailyLimit, false);
  await page.locator("#scaffold").uncheck();
  await click("submit-settings");
  assert.equal((await collection()).settings.scaffold, false);
  console.log("PASS unlimited new cards and opt-out scaffolding settings");
  await page.goto(TEST_URL + "/#/library");
  await page.locator(".course-tile").first().locator("h3 a").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await snapshot("09-course-desktop");
  await page.setViewportSize({ width: 320, height: 844 });
  await snapshot("10-course-small");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log("PASS 320px layout without horizontal overflow; no page errors");
  await fs.writeFile(
    outputFile("smoke.json"),
    JSON.stringify({ errors, suite: "browser-smoke" }, null, 2),
  );
} catch (e) {
  await page.screenshot({ path: outputFile("FAIL.png") });
  console.error(e);
  process.exitCode = 1;
}
await browser.close();
process.exit(process.exitCode ?? 0);
