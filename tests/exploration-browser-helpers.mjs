// Walk one mixed exploratory group; never press a memory-rating button.
export async function finishWarmGroup(page) {
  for (let i = 0; i < 40; i++) {
    // Activity persistence is asynchronous; wait for the resulting screen.
    await page.waitForTimeout(150);
    if (!(await page.locator(".exploration-page").count())) return;
    if (await page.locator('[data-action="explore-finish"]').count()) {
      await page.locator('[data-action="explore-finish"]').click();
      return;
    }
    const choice = page
      .locator('[data-action="choose-answer"]:not([disabled])')
      .first();
    if (await choice.count()) {
      await choice.click();
      continue;
    }
    if (await page.locator('[data-action="explore-next"]').count()) {
      await page.locator('[data-action="explore-next"]').click();
      continue;
    }
    if (await page.locator('[data-action="explore-reveal"]').count()) {
      if (await page.locator("#explore-answer").count())
        await page.locator("#explore-answer").fill("Mijn vermoeden");
      await page.locator('[data-action="explore-reveal"]').click();
      continue;
    }
    const rate = page.locator('[data-action="explore-rate"]').first();
    if (await rate.count()) {
      await rate.click();
      continue;
    }
    if (await page.locator('[data-action="intro"]').count()) {
      await page.locator('[data-action="intro"]').click();
      continue;
    }
    throw new Error("Unrecognized exploration screen");
  }
  throw new Error("Exploration did not terminate");
}
