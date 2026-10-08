// Optional additional UI checks; Playwright required. See README.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
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
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
});
const page = await context.newPage();
const results = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${output}/${name}.png` });
};
try {
  await page.goto(`${base}`);
  await page.waitForSelector(".today-hero");
  await page
    .locator(".set-card h3 a")
    .filter({ hasText: "Continentale filosofie" })
    .click();
  await page.waitForSelector("#tag-filter");
  await page.selectOption("#tag-filter", "niveau::1");
  assert.match(
    await page.locator(".section-head .small").innerText(),
    /50 notities/,
  );
  await shot("25-niveaufilter");
  results.push("niveau::1 filter");
  await page.locator('[data-action="start-learn"]').click();
  await page.waitForSelector('[data-action="intro"]');
  await page.locator('[data-action="intro"]').click();
  await shot("26-kennismaken");
  assert.ok(await page.locator('[data-action="intro-done"]').isVisible());
  await page.locator('[data-action="intro-done"]').click();
  await page.locator('[data-action="reveal"]').click();
  assert.ok(await page.locator('[data-rating="4"]').isDisabled());
  await page.locator(".understanding summary").click();
  await shot("27-begripscheck");
  results.push("kennismaking + easy restriction + expanded explanation");
  await page.locator('[data-action="star-note"]').click();
  await page.locator('[data-action="end-study"]').click();
  await page.goto(`${base}/#/starred`);
  await page.waitForSelector(".card-row");
  await shot("28-sterren");
  results.push("starred route");
  await page.locator('[data-action="start-practice"]').click();
  await page.waitForSelector('[data-action="reveal"]');
  await page.locator('[data-action="reveal"]').click();
  await page.locator('[data-rating="3"]').click();
  await page.waitForSelector(".finish-card");
  assert.match(
    await page.locator(".finish-card").innerText(),
    /zonder de gewone FSRS/,
  );
  results.push("extra practice without review scheduling");
  await page.goto(`${base}/#/set/missing`);
  await page.waitForSelector(".empty-state");
  await shot("29-niet-gevonden");
  results.push("missing route state");
  await page.goto(`${base}/#/today`);
  await page.waitForSelector(".today-hero");
  await page
    .locator('[data-action="new-set"]')
    .filter({ visible: true })
    .first()
    .click();
  await page.locator('[data-action="builder-tab"][data-tab="import"]').click();
  await page.fill("#import-text", "Dit is geen goede kaart");
  await page.waitForTimeout(300);
  assert.ok(await page.locator("#import-preview .inline-error").isVisible());
  await shot("30-importfout");
  await page.locator('[data-action="close-modal"]').first().click();
  results.push("invalid import with readable error");
  await page.goto(`${base}/#/guide`);
  await page.waitForSelector(".readable");
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await shot("31-handleiding-onderaan");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/#/library`);
  await page.waitForSelector(".set-card");
  await page
    .locator(".set-card h3 a")
    .filter({ hasText: "Algemene filosofie" })
    .click();
  await page.waitForSelector('[data-action="start-flash"]');
  await page.locator('[data-action="start-flash"]').click();
  await page.waitForSelector(".flash-card");
  await page.locator('[data-action="flip"]').first().click();
  await shot("32-mobiel-flash");
  await page.locator('[data-action="end-study"]').click();
  await page.locator('[data-action="edit-set"]').click();
  await shot("33-mobiel-setbeheer");
  await page.locator('[data-action="close-modal"]').first().click();
  results.push("mobile flashcards and set management");
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/extra-results.json`,
    JSON.stringify({ checks: results.length, results, errors }, null, 2),
  );
  console.log("Aanvullende UI-controles:", results.length, "geslaagd.");
  await browser.close();
  process.exit(0);
} catch (error) {
  console.error(error);
  await page.screenshot({ path: `${output}/extra-failure.png` });
  await browser.close();
  process.exit(1);
}
