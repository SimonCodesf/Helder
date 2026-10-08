import {
  chromium,
  launchOptions,
  TEST_URL,
  EXAMPLE_FILE,
  outputFile,
} from "./browser-environment.mjs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    colorScheme: "light",
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const click = (a) => page.locator(`[data-action="${a}"]`).first().click();
const capture = async (name) => {
  await page.waitForTimeout(250);
  await page.locator("#toast").evaluate((el) => (el.hidden = true));
  await page.screenshot({ path: outputFile(`${name}.png`) });
};
const read = () =>
  page.evaluate(async () => {
    const r = indexedDB.open("helder-v1");
    const db = await new Promise(
      (resolve) => (r.onsuccess = () => resolve(r.result)),
    );
    return new Promise((resolve) => {
      const g = db.transaction("state").objectStore("state").get("collection");
      g.onsuccess = () => resolve(g.result);
    });
  });
try {
  await page.goto(TEST_URL);
  await page.locator(".welcome-card").waitFor();
  await page.locator("#menu-toggle").click();
  await capture("11-drawer-mobile");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.querySelector("#sidebar").contains(document.activeElement),
    ),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  console.log("PASS drawer focus trap and Escape return");
  await click("new-import");
  await page.locator("#import-text").fill("Dit is geen goede kaart");
  await page.locator("#import-preview .inline-error").waitFor();
  assert.equal(
    await page.locator("#import-text").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("#import-error").scrollIntoViewIfNeeded();
  await capture("12-import-error-mobile");
  await click("close-modal");
  assert.equal((await read()).notes.length, 0);
  console.log("PASS invalid import is explained and does not write data");
  await click("new-import");
  await page
    .locator("#import-text")
    .fill(await fs.readFile(EXAMPLE_FILE, "utf8"));
  await page
    .locator("#builder-status")
    .filter({ hasText: "5 kaarten klaar" })
    .waitFor();
  await click("builder-save");
  await page.locator("#modal").waitFor({ state: "hidden" });
  await page.locator("#structure-title").waitFor();
  await page.locator('[data-action="course-tab"][data-view="cards"]').click();
  assert.equal(
    await page
      .locator(".note-row")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft) >= 20),
    true,
  );
  await page.locator(".note-row").first().scrollIntoViewIfNeeded();
  await capture("13-cards-mobile");
  await page.locator("#level-filter").selectOption("2");
  assert.equal(await page.locator(".note-row").count(), 1);
  await page.locator("#chapter-filter").selectOption("H3");
  assert.equal(await page.locator(".note-row").count(), 0);
  await page.locator("#chapter-filter").selectOption("");
  await page.locator("#level-filter").selectOption("");
  console.log(
    "PASS visible card filters intersect and empty selection is safe",
  );
  await page.locator('[data-action="edit-note"]').first().click();
  const recognition = page
    .locator("details")
    .filter({ has: page.locator("#choice-prompt") });
  if (!(await recognition.evaluate((el) => el.open)))
    await recognition.locator("summary").click();
  assert.equal(
    await page.evaluate(() =>
      [
        "#note-level",
        "#note-chapter",
        "#note-tags",
        "#note-source",
        "#choice-prompt",
        "#choice-correct",
        "#choice-feedback",
        "#apply-prompt",
      ].every((selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return (
          parseFloat(style.minHeight) >= 48 && parseFloat(style.fontSize) >= 16
        );
      }),
    ),
    true,
  );
  await recognition.locator("summary").scrollIntoViewIfNeeded();
  await capture("14-editor-mobile");
  await page
    .locator("#note-back")
    .fill(
      "25% is een kwart: 25 van de 100. Deel het totaal door vier. Een percentage hoort altijd bij een basisbedrag.\n\n".repeat(
        12,
      ),
    );
  await click("save-note");
  await page.locator("#modal").waitFor({ state: "hidden" });
  await click("start-learn");
  await click("intro-skip");
  await click("reveal");
  await page.locator(".understanding summary").scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const summary = await page.locator(".understanding summary").boundingBox(),
    dock = await page.locator(".study-dock").boundingBox();
  assert.ok(summary.y + summary.height <= dock.y + 1);
  await capture("15-long-answer-mobile");
  console.log("PASS end of long answer stays reachable above fixed dock");
  await click("end-study");
  await click("start-flash");
  await page.locator(".flip-surface").waitFor({ state: "visible" });
  const cdp = await context.newCDPSession(page);
  const box = await page.locator(".flip-surface").boundingBox(),
    x = box.x + box.width / 2,
    y = Math.max(200, box.y + 100);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 6; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 15 * i, y }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(250);
  assert.equal(
    (await read()).cards.filter((c) => c.practiceMark === "known").length,
    1,
  );
  console.log("PASS actual Chromium touch event swipes horizontally");
  await click("end-study");
  await page.goto(TEST_URL + "/#/settings");
  await page.locator("#theme").selectOption("dark");
  await click("submit-settings");
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.locator("#cloud-panel").scrollIntoViewIfNeeded();
  await capture("16-sync-unconfigured-dark");
  await page.locator("#theme").selectOption("light");
  await click("submit-settings");
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  await page.goto(TEST_URL + "/#/today");
  await capture("17-today-mobile");
  const set = (await read()).sets[0];
  await page.goto(TEST_URL + "/#/set/" + set.id);
  await page.locator('[data-action="select-level"][data-level="2"]').click();
  await capture("18-selected-level-mobile");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture("19-course-tablet");
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS dark/light, selected level, tablet and 320px without horizontal overflow",
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".status-copy").textContent === "Offline gereed",
  );
  await context.setOffline(true);
  await page.reload();
  await page.locator("#structure-title").waitFor();
  assert.equal((await read()).notes.length, 5);
  console.log("PASS actual offline reload with full versioned module cache");
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error);
  await page.screenshot({ path: outputFile("EXTRA-FAIL.png") });
  process.exitCode = 1;
}
await browser.close();
process.exit(process.exitCode ?? 0);
