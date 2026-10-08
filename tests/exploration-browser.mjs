import {
  chromium,
  launchOptions,
  TEST_URL,
  outputFile,
} from "./browser-environment.mjs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { finishWarmGroup } from "./exploration-browser-helpers.mjs";
const browser = await chromium.launch(launchOptions),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    colorScheme: "light",
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.route("**/config.json", (r) =>
  r.fulfill({
    json: { supabaseUrl: "", publishableKey: "", providers: ["email"] },
  }),
);
const click = (a) => page.locator(`[data-action="${a}"]`).first().click();
const capture = async (name) => {
  await page.waitForTimeout(200);
  await page.locator("#toast").evaluate((el) => (el.hidden = true));
  await page.screenshot({ path: outputFile(name + ".png") });
};
const read = () =>
  page.evaluate(async () => {
    const r = indexedDB.open("helder-v1");
    const db = await new Promise(
      (resolve) => (r.onsuccess = () => resolve(r.result)),
    );
    const g = db.transaction("state").objectStore("state").get("collection");
    return new Promise((resolve) => (g.onsuccess = () => resolve(g.result)));
  });
try {
  await page.goto(TEST_URL);
  await page.locator(".welcome-card").waitFor();
  await click("new-import");
  await page
    .locator("#import-text")
    .fill(
      await fs.readFile(
        new URL("../data/verkennen.md", import.meta.url),
        "utf8",
      ),
    );
  await page
    .locator("#builder-status")
    .filter({ hasText: "3 kaarten klaar" })
    .waitFor();
  await click("builder-save");
  await page.locator("#modal").waitFor({ state: "hidden" });
  await page.locator("#structure-title").waitFor();
  const before = await read();
  await click("start-explore");
  await capture("20-exploration-start");
  await click("intro");
  await page.locator("#explore-answer").waitFor();
  assert.equal(
    await page
      .locator(".exploration-card")
      .innerText()
      .then((t) => t.includes("Premisse")),
    false,
  );
  await capture("21-definition-first");
  await page.locator("#explore-answer").fill("Uitgangspunt");
  await click("explore-reveal");
  await capture("22-reverse-feedback");
  await page
    .locator('[data-action="explore-rate"][data-success="true"]')
    .click();
  await finishWarmGroup(page);
  await page.locator(".finish-card").waitFor();
  assert.deepEqual((await read()).cards, before.cards);
  assert.deepEqual((await read()).reviews, before.reviews);
  assert.equal((await read()).activities.length, 3);
  assert.equal(
    (await read()).activities.every(
      (a) => a.round === "exploration" && !a.independent,
    ),
    true,
  );
  await capture("23-exploration-finish");
  console.log(
    "PASS automatic definition-first term guessing and independent exploratory round without FSRS changes",
  );
  await page.locator('[data-action="start-learn"]').click();
  await page.locator(".exploration-intro").waitFor();
  await click("intro-skip");
  await page.locator("#study-answer").fill("Een uitgangspunt in een argument.");
  await click("reveal");
  assert.equal(await page.locator('[data-rating="4"]').isDisabled(), false);
  await page.locator('[data-rating="3"]').click();
  await click("end-study");
  console.log(
    "PASS fully skipped warm-up does not masquerade as recent-help recall",
  );
  await page.goto(TEST_URL + "/#/settings");
  await page.locator("#explore-size").selectOption("1");
  await click("submit-settings");
  await page.goto(TEST_URL + "/#/set/" + before.sets[0].id);
  await click("start-learn");
  assert.match(await page.locator(".study-counter").innerText(), /0\s*\/\s*1/);
  await click("intro");
  await finishWarmGroup(page);
  await page.locator("#study-answer").fill("De uitkomst van een argument.");
  await click("reveal");
  assert.equal(await page.locator('[data-rating="4"]').isDisabled(), true);
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS configurable group size, assistance marker and narrow productive-recall layout",
  );
  await click("end-study");
  await page.locator("#structure-title").waitFor();
  await page.goto(TEST_URL + "/#/set/" + before.sets[0].id);
  await page.locator("#structure-title").waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector(".status-copy").textContent === "Offline gereed",
  );
  await context.setOffline(true);
  await page.reload();
  await page
    .locator(".welcome-card, #structure-title, .finish-card")
    .first()
    .waitFor();
  console.log("PASS new exploration modules included in actual offline reload");
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error);
  await page.screenshot({ path: outputFile("EXPLORATION-FAIL.png") });
  process.exitCode = 1;
}
await browser.close();
process.exit(process.exitCode ?? 0);
