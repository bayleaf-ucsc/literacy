// Smoke test for every explorable: mounts behind its prediction, logs no
// errors, has keyboard-reachable controls, no overflow at phone width, and
// declares where it asks the learner to read, write and count.
//
//   python3 -m http.server 8811 &          (from the repo root)
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/smoke.mjs [scene ...]
//
// Prints one line per problem. Text only: no screenshots.
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8811/index.html';
const only = process.argv.slice(2);

const browser = await chromium.launch();
const probe = await browser.newPage();
await probe.goto(BASE);
const targets = await probe.evaluate(() => [...document.querySelectorAll('lit-scene')].flatMap(s =>
  [...s.querySelectorAll('lit-explore')].flatMap((x, i) =>
    x.getAttribute('spins').split(/\s+/).map(tag => ({ scene: s.id, index: i, tag })))));
await probe.close();

const problems = [];
let checked = 0;
for (const t of targets.filter(t => !only.length || only.includes(t.scene))) {
  for (const width of [1280, 360]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const letter = t.tag.split('-').pop();
    await page.goto(`${BASE}?spin-${t.scene}=${letter}#${t.scene}`);
    // Pass the teach gate (self-certified reading) so the work is visible.
    const gate = page.locator(`lit-scene#${t.scene} lit-readcheck button`);
    if (await gate.count()) await gate.click();
    const card = page.locator(`lit-scene#${t.scene} lit-explore`).nth(t.index).locator('.lit-work');
    await card.locator('.lit-options button').first().click({ timeout: 5000 })
      .catch(() => errors.push('no prediction gate'));
    await page.waitForTimeout(300);
    const r = await page.evaluate(({ scene, index, tag }) => {
      const host = document.querySelectorAll(`lit-scene#${scene} lit-explore`)[index];
      const x = host?.querySelector(tag);
      const sr = x?.shadowRoot;
      const lits = customElements.get(tag)?.literacies || {};
      return {
        mounted: !!sr && sr.childElementCount > 1,
        focusables: sr ? sr.querySelectorAll('button, input, select, textarea, [tabindex]').length : 0,
        overflow: Math.max((x?.scrollWidth || 0) - (host?.clientWidth || 0), document.documentElement.scrollWidth - innerWidth),
        missing: ['read', 'write', 'count'].filter(k => !lits[k]),
      };
    }, t);
    checked++;
    const id = `${t.scene}[${t.index}] ${t.tag} @${width}`;
    if (!r.mounted) problems.push(`${id}: did not mount`);
    if (!r.focusables) problems.push(`${id}: no focusable controls`);
    if (r.overflow > 2) problems.push(`${id}: overflows by ${r.overflow}px`);
    if (width === 1280 && r.missing.length) problems.push(`${id}: literacies missing ${r.missing.join(', ')}`);
    for (const e of errors.filter(e => !/favicon/.test(e))) problems.push(`${id}: ${e.split('\n')[0]}`);
    await ctx.close();
  }
}
await browser.close();
console.log(`checked ${checked} explorable×width combinations; ${problems.length} problems`);
for (const p of problems) console.log(p);
process.exitCode = problems.length ? 1 : 0;
