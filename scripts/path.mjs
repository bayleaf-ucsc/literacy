// End-to-end path through the course shell: from the first scene to the last,
// pass every gate the way a reader would (lesson read, predictions, stance) and
// press Continue, checking that it lands on the next scene. Explorables are
// marked complete directly: this tests the braid, not each exercise.
//
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/path.mjs
//
// Prints one line per scene. Text only: no screenshots.
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8811/index.html';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
await page.goto(BASE);
const ids = await page.evaluate(() => [...document.querySelectorAll('lit-scene')].map(s => s.id));
let failed = 0;

for (const [k, id] of ids.slice(0, -1).entries()) {
  const S = `lit-scene#${id}`;
  const gate = page.locator(`${S} lit-readcheck button`);
  if (await gate.count()) await gate.click();
  // Choices remain enabled after answering. Visit each exercise rather than
  // treating enabled buttons as a queue of unanswered predictions.
  const work = page.locator(`${S} lit-predict, ${S} lit-explore`);
  for (let i = 0; i < await work.count(); i++) {
    await work.nth(i).locator('.lit-options button').first().click();
    await page.waitForTimeout(150);
  }
  await page.evaluate(S => document.querySelectorAll(`${S} lit-explore .lit-stage > *`).forEach(x => x.complete?.('path test')), S);
  // Take the stance once it is on screen (a late argument appears on the first Continue).
  const stance = async () => {
    const st = page.locator(`${S} lit-stance`);
    if (!await st.count() || !await st.isVisible() || await st.evaluate(x => x.done)) return;
    if (k % 2) { await st.locator('input').fill('I would say it in my own words'); await st.getByRole('button', { name: 'Use my words' }).click(); }
    else await st.locator('.lit-stance-options button').first().click();
  };
  const next = page.locator(`${S} .lit-next button`);
  const want = `#${ids[k + 1]}`;
  for (let t = 0; t < 3 && await page.evaluate(() => location.hash) !== want; t++) {
    await stance();
    await next.click();
    await page.waitForTimeout(250);
  }
  const at = await page.evaluate(() => location.hash);
  if (at !== want) failed++;
  console.log(`${id} -> ${at}${at === want ? '' : `  BLOCKED: ${await page.locator(`${S} .lit-next small`).textContent()}`}`);
}
const taken = await page.locator('lit-roots input[type=checkbox]').count();
console.log(`roots: ${taken} stances recorded`);
for (const e of errors) console.log(`error: ${e}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
