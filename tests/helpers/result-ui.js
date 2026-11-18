export async function revealResult(page) {
  if (await page.locator('#ending').isVisible() && await page.locator('#result-dialog').count()
    && !await page.locator('#result-dialog').evaluate(el => el.open)) {
    await page.clock.runFor(2000);
  }
}
