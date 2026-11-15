// Keyboard and accessibility-tree audit, in the real shadow-DOM mode.
//
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/a11y.mjs [scene ...]
//   OUT=/tmp/aria node scripts/a11y.mjs     (also writes each scene's aria tree to OUT)
//
// For each scene: passes the reading gate and every prediction by keyboard
// (Tab to the button, then Enter), then tabs through the whole scene and
// reports focus stops with no accessible name, focus with no visible ring,
// and pointer targets inside explorables that the keyboard cannot reach.
// Prints text only: no screenshots.
import { writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8811/index.html';
const OUT = process.env.OUT;
const only = process.argv.slice(2);
if (OUT) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const probe = await browser.newPage();
await probe.goto(BASE);
const scenes = (await probe.evaluate(() => [...document.querySelectorAll('lit-scene')].map(s => s.id)))
  .filter(s => !only.length || only.includes(s));
await probe.close();

// The deepest focused element, through shadow roots, described for a report.
const focused = () => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  if (!a || a === document.body) return null;
  const cs = getComputedStyle(a);
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
  const name = (a.getAttribute('aria-label') || a.labels?.[0]?.textContent || a.textContent || a.value || a.title || '').trim().replace(/\s+/g, ' ');
  const host = a.getRootNode().host;
  return {
    tag: a.localName, type: a.type || '', name: name.slice(0, 60), ring,
    where: host ? host.localName : (a.closest('lit-scene')?.id ? 'page' : 'shell'),
    key: (host ? host.localName + ':' : '') + a.localName + ':' + name.slice(0, 40),
  };
};

// Elements that look clickable inside explorables but cannot take focus.
const unreachable = () => [...document.querySelectorAll('lit-scene[active] lit-explore *')]
  .filter(x => x.shadowRoot).flatMap(x => [...x.shadowRoot.querySelectorAll('*')]
    .filter(n => getComputedStyle(n).cursor === 'pointer' && !n.matches('button, a[href], input, select, textarea, summary, label, [tabindex]')
      && !n.closest('button, a[href], label, summary'))
    .map(n => `${x.localName} <${n.localName} class="${n.className}"> "${n.textContent.trim().slice(0, 40)}"`));

for (const scene of scenes) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}#${scene}`);
  await page.waitForTimeout(300);
  const problems = [];
  // Keyboard-only: press Tab until a gate button is focused, then Enter. Repeat
  // while gates (reading check, predictions) remain.
  const gateSel = `lit-scene#${scene} lit-readcheck button, lit-scene#${scene} .lit-options button:not(:disabled)`;
  for (let round = 0; round < 8 && await page.locator(gateSel).count(); round++) {
    let hit = false;
    for (let i = 0; i < 200 && !hit; i++) {
      await page.keyboard.press('Tab');
      hit = await page.evaluate(sel => document.activeElement?.matches(sel), gateSel);
    }
    if (!hit) { problems.push('could not reach a gate button by Tab'); break; }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  // Tab through everything once, from the top of the page.
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.locator('body').focus();
  const stops = [];
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(focused);
    if (!f) continue;
    if (seen.has(f.key) && stops.length > 3 && f.key === stops[0].key) break; // wrapped around
    seen.add(f.key);
    stops.push(f);
  }
  const inX = stops.filter(s => s.where.startsWith('x-'));
  for (const s of stops) {
    if (!s.name) problems.push(`unnamed focus stop: <${s.tag}${s.type ? ' type=' + s.type : ''}> in ${s.where}`);
    if (!s.ring) problems.push(`no visible focus ring: <${s.tag}> "${s.name}" in ${s.where}`);
  }
  for (const u of await page.evaluate(unreachable)) problems.push(`pointer-only target: ${u}`);
  if (await page.locator(`lit-scene#${scene} lit-explore`).count() && !inX.length) problems.push('no focus stops inside the explorable');
  for (const e of errors) problems.push(`error: ${e.split('\n')[0]}`);
  console.log(`${scene}: ${stops.length} stops (${inX.length} in explorables)${problems.length ? '' : ', ok'}`);
  for (const p of [...new Set(problems)]) console.log(`  ${p}`);
  if (OUT) writeFileSync(`${OUT}/${scene}.aria.txt`, await page.locator(`lit-scene#${scene}`).ariaSnapshot());
  await ctx.close();
}
await browser.close();
