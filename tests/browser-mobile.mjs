// V2 interaction and layout tests. Run the local server before this optional script.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const base = process.env.TEST_URL || "http://127.0.0.1:4173";
const output =
  process.env.TEST_OUTPUT ||
  fileURLToPath(new URL("../test-results/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN,
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage(),
  errors = [],
  report = [];
page.on("pageerror", (e) => errors.push(e.message));
const click = (action) =>
  page
    .locator(`[data-action="${action}"]`)
    .filter({ visible: true })
    .first()
    .click();
const wait = () => page.waitForTimeout(180);
const shot = async (name) => {
  await wait();
  await page.screenshot({ path: `${output}/v2-${name}.png` });
};
const check = (name) => {
  report.push({ name, result: "pass" });
  console.log("PASS", name);
};
const overflow = async () =>
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Horizontal overflow",
  );
const rect = (selector) => page.locator(selector).boundingBox();
const ratingDock = async () => {
  const dock = await rect(".study-dock"),
    box = await rect('[data-rating="3"]');
  assert.ok(
    dock && box && box.y >= dock.y && box.y + box.height <= 844,
    "Rating controls must be inside the viewport dock",
  );
  assert.ok(
    box.height >= 44 && box.width >= 44,
    "Rating targets must be 44px or larger",
  );
};
try {
  await page.goto(base);
  await page.waitForSelector(".today-hero");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".mobile-bar .status-copy").textContent ===
      "Offline gereed",
  );
  check("Offline status follows successful worker activation");
  await shot("01-vandaag-390");
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await overflow();
    for (const tab of await page.locator(".bottom-tab").all()) {
      const b = await tab.boundingBox();
      assert.ok(
        b.width >= 44 && b.height >= 44,
        `Navigation touch area at ${width}`,
      );
    }
    if (width === 320) await shot("02-vandaag-320");
    if (width === 768) await shot("03-tablet");
  }
  check("No horizontal overflow; navigation targets at 320 / 390 / 430 / 768");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menu-toggle").click();
  assert.equal(await page.locator("#main").evaluate((el) => el.inert), true);
  assert.equal(
    await page.locator("#sidebar").getAttribute("aria-modal"),
    "true",
  );
  await page.locator("#sidebar .status-button").focus();
  await page.keyboard.press("Tab");
  assert.ok(
    await page
      .locator("#sidebar .wordmark")
      .evaluate((el) => el === document.activeElement),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#main").evaluate((el) => el.inert), false);
  assert.ok(
    await page
      .locator("#menu-toggle")
      .evaluate((el) => el === document.activeElement),
  );
  check("Mobile drawer traps focus; Escape restores the More button");
  await page.locator("#menu-toggle").click();
  await page.locator('#sidebar .nav-item[href="#/today"]').click();
  assert.equal(
    await page
      .locator("body")
      .evaluate((el) => el.classList.contains("nav-open")),
    false,
  );
  check("Selecting the current route closes the drawer");
  await page.locator('.bottom-tab[data-tab="library"]').click();
  await page.waitForSelector(".set-grid");
  await page.waitForFunction(() => document.body.dataset.route === "library");
  assert.equal(
    await page
      .locator('.bottom-tab[data-tab="library"]')
      .getAttribute("aria-current"),
    "page",
  );
  await shot("04-bibliotheek");
  await page
    .locator(".set-card h3 a")
    .filter({ hasText: "Algemene filosofie" })
    .click();
  await page.waitForSelector(".card-row");
  await overflow();
  const title = await rect("main h1"),
    add = await rect('[data-action="add-cards"]');
  assert.ok(
    add.y + add.height <= title.y + 1,
    "Detail actions should not crowd the title",
  );
  await shot("05-set");
  check("Set title and compact management actions remain separate");
  await click("start-learn");
  await page.waitForSelector("#study-answer");
  assert.ok(!(await page.locator(".bottom-nav").isVisible()));
  assert.ok(!(await page.locator(".mobile-bar").isVisible()));
  const reveal = await rect('[data-action="reveal"]');
  assert.ok(
    reveal.y + reveal.height <= 844 && reveal.height >= 44,
    "Reveal dock remains reachable",
  );
  await page.fill(
    "#study-answer",
    "Premissen zijn de uitgangspunten. De conclusie is wat daaruit volgt.",
  );
  await shot("06-leren-vraag");
  await click("reveal");
  await ratingDock();
  const allButtons = await page
    .locator(".grade")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().y));
  assert.equal(
    new Set(allButtons).size,
    1,
    "Four ratings fit in one row at 390px",
  );
  await page.locator(".understanding summary").click();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await wait();
  const explanation = await rect(".understanding p"),
    dock = await rect(".study-dock");
  assert.ok(
    explanation.y + explanation.height < dock.y,
    "Long answers can scroll fully above the fixed dock",
  );
  await shot("07-leren-antwoord-scroll");
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator(".understanding summary").click();
  await page.evaluate(() => scrollTo(0, 0));
  await shot("08-leren-antwoord");
  check("Focus mode + thumb dock + fully scrollable answer");
  await page.setViewportSize({ width: 320, height: 844 });
  await overflow();
  const rows = await page
    .locator(".grade")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().y));
  assert.equal(
    new Set(rows).size,
    2,
    "Compact phones use a 2x2 grading layout",
  );
  await shot("09-leren-320");
  check("Small-phone grading falls back to two rows");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await shot("10-leren-donker");
  assert.notEqual(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(249, 248, 247)",
  );
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".study-card")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  check("System dark mode and reduced motion");
  await click("end-study");
  await page.waitForSelector(".card-row");
  await click("start-flash");
  await page.waitForSelector(".flash-card");
  await shot("11-flash-vraag");
  await click("flip");
  await overflow();
  await shot("12-flash-antwoord");
  await click("end-study");
  check("Flashcards retain full-screen touch controls");
  await page.locator('.mobile-bar [data-action="new-set"]').click();
  await page.waitForSelector("#set-title");
  assert.ok(!(await page.locator("#note-hint").isVisible()));
  await shot("13-editor");
  await page.locator(".editor-extras:not(.set-options) summary").click();
  await page.fill("#note-hint", "Een aanwijzing.");
  await page
    .locator(".modal-body")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  const footBefore = await rect(".modal-foot");
  await page.fill("#note-explain", "Geef een eigen voorbeeld.");
  const footAfter = await rect(".modal-foot");
  assert.equal(footBefore.y, footAfter.y);
  assert.ok(
    footAfter.y + footAfter.height <= 844,
    "Save controls stay visible while the editor scrolls",
  );
  await shot("14-editor-opties");
  await click("close-modal");
  check("Progressive editor options + anchored save controls");
  await click("connection-info");
  await page.waitForSelector(".connection-intro");
  await shot("15-onderweg");
  await click("close-modal");
  await context.setOffline(true);
  await page.waitForFunction(
    () =>
      document.querySelector(".mobile-bar .status-copy").textContent ===
      "Je bent offline",
  );
  await page.reload();
  await page.waitForSelector(".card-row");
  await page.waitForFunction(
    () =>
      document.querySelector(".mobile-bar .status-copy").textContent ===
      "Je bent offline",
  );
  await context.setOffline(false);
  check(
    "Offline reload works with versioned entry assets; badge reflects connection",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.ok(!(await page.locator(".drawer-close").isVisible()));
  await page.goto(`${base}/#/today`);
  await page.waitForSelector(".today-hero");
  await overflow();
  await shot("16-desktop");
  check("Desktop keeps sidebar, without mobile-only close control");
  assert.deepEqual(errors, []);
  check("No runtime errors in the V2 mobile interaction flow");
  await writeFile(
    `${output}/mobile-results.json`,
    JSON.stringify({ tests: report.length, report, errors }, null, 2),
  );
  console.log(`\n${report.length} mobile/UI checks passed.`);
  await browser.close();
  process.exit(0);
} catch (e) {
  console.error(e);
  await page.screenshot({ path: `${output}/v2-failure.png` });
  await writeFile(
    `${output}/mobile-results.json`,
    JSON.stringify({ report, errors, failure: e.message }, null, 2),
  );
  await browser.close();
  process.exit(1);
}
