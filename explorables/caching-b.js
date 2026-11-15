// Caching, spin B: a story in three steps. First two human readers of a serial
// book (one re-reads from page 1 every day, one keeps their place), then a
// matching puzzle that maps the story onto an agent, then the same arithmetic
// as an agent's itemized receipt. Prices are illustrative, not any provider's.
import { Explorable, h, fmt } from '../js/kit.js';

const DAYS = 8, CHAPTER = 10;
const PRICE = { cached: 0.30, fresh: 3.00, out: 15.00 }; // illustrative, per million tokens
const AGENT = { start: 8000, perTurn: 1500, out: 400, guessAt: 5, end: 40 };

const PAIRS = [
  ['A new chapter arrives', 'A new message or tool result'],
  ['Paging back through the earlier chapters', 'Re-reading the context so far'],
  ['Your bookmark and margin notes', 'The cache'],
  ['Writing the day\'s paragraph', 'Output tokens'],
];
const CHOICES = [...PAIRS.map(p => p[1])].sort();
// Compact counts for the narrow receipt: 9,900 -> "9.9k".
const k = x => x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : String(x);

// One agent turn re-reads everything before it. With caching, the prefix seen
// last turn (its output included) is a cache hit; only new tokens are fresh.
function turn(t) {
  const { start, perTurn, out } = AGENT;
  const cached = t === 1 ? 0 : start + (t - 1) * perTurn + (t - 1) * out;
  const fresh = t === 1 ? start + perTurn : perTurn;
  return { t, cached, fresh, out, cost: (cached * PRICE.cached + fresh * PRICE.fresh + out * PRICE.out) / 1e6,
    uncached: ((cached + fresh) * PRICE.fresh + out * PRICE.out) / 1e6 };
}

class CachingB extends Explorable {
  static prediction = {
    question: 'A serial novel arrives one 10-page chapter a day. One reader re-reads from page 1 every day; another keeps their place. Adding up all the pages each has read so far, how does the re-reader\'s total pull ahead?',
    options: [
      { label: 'Steadily: the gap between the totals grows by the same amount each day', correct: false,
        feedback: 'The new chapter is the same size each day, but the pile behind it keeps growing, so each day adds more to the gap than the last: 10 extra pages on day 2, 70 on day 8. After eight days the totals are 360 pages against 80.' },
      { label: 'Faster and faster: each day adds more to the gap than the day before', correct: true,
        feedback: 'Right. Each day\'s extra re-reading grows in a straight line (10, 20, 30, up to 70 pages on day 8), so the running total grows with the square of the number of days: 360 pages against 80 after eight days.' },
    ],
    after: 'Play out the eight days, then carry the story over to an agent.',
  };

  static literacies = {
    read: 'You read two readers\' page counts and an agent\'s itemized receipt as the same story.',
    write: 'You write the analogy yourself, mapping each part of the story onto its agent version.',
    count: 'You estimate the cached share of tokens at turn 40 from what turn 5 shows, then see the real share.',
  };

  static css = `
    h3 { margin: 0 0 0.4rem; font-size: 1rem; }
    .step { margin-top: 0.75rem; }
    .step[data-locked] { opacity: 0.5; }
    .days { display: grid; grid-template-columns: auto 1fr 1fr; gap: 0.2rem 0.6rem; align-items: center; font-size: 0.85rem; }
    .days .hd { font-size: 0.78rem; color: var(--lit-muted); }
    .track { display: flex; height: 0.85rem; background: var(--lit-surface-2); border-radius: 3px; overflow: hidden; }
    .old { background: var(--lit-teach); opacity: 0.55; }
    .new { background: var(--lit-work); }
    .legend { font-size: 0.8rem; gap: 0.8rem; margin: 0.4rem 0; }
    .legend i { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 2px; vertical-align: -0.1rem; margin-right: 0.25rem; }
    .match { display: grid; gap: 0.5rem; }
    .match { grid-template-columns: minmax(0, 1fr); }
    .match label { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.15rem; font-size: 0.9rem; }
    .match select { padding: 0.3rem; border-radius: var(--lit-radius); border: 1px solid var(--lit-border); background: var(--lit-surface); width: 100%; min-width: 0; }
    .match select[data-state=right] { border-color: var(--lit-good); }
    .match select[data-state=wrong] { border-color: var(--lit-bad); }
    .ok { color: var(--lit-good); font-weight: 600; } .no { color: var(--lit-bad); font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    th, td { text-align: right; padding: 0.2rem 0.3rem; border-bottom: 1px solid var(--lit-border); }
    th:first-child, td:first-child { text-align: left; }
    td.c { color: var(--lit-teach); font-weight: 600; }
    .gap td { text-align: center; color: var(--lit-muted); }
    .meter { height: 0.9rem; background: var(--lit-surface-2); border-radius: 3px; position: relative; margin: 0.3rem 0; }
    .meter div { height: 100%; background: var(--lit-teach); border-radius: 3px; transition: width 0.4s; }
    .meter span { position: absolute; top: -0.2rem; bottom: -0.2rem; left: 90%; border-left: 2px dashed var(--lit-fg); }
    .guess { display: grid; gap: 0.4rem; margin-top: 0.4rem; }
    .guess button { text-align: left; }
  `;

  mount(root) {
    this.day = 0; this.matched = false; this.t = 0; this.guessed = false;
    this.book = h('section', { class: 'card step' });
    this.mapping = h('section', { class: 'card step' });
    this.receipt = h('section', { class: 'card step' });
    root.append(this.book, this.mapping, this.receipt,
      h('p', { class: 'muted', style: { fontSize: '0.78rem' } }, 'Simulated session; token counts and prices are illustrative.'));
    this.renderBook(); this.renderMapping(); this.renderReceipt();
  }

  // Step 1: the human story.
  renderBook() {
    const max = DAYS * CHAPTER;
    const track = (old, fresh) => h('div', { class: 'track', role: 'img', 'aria-label': `${old + fresh} pages, ${old} of them re-read` },
      h('span', { class: 'old', style: { width: `${old / max * 100}%` } }), h('span', { class: 'new', style: { width: `${fresh / max * 100}%` } }));
    const rows = [];
    for (let d = 1; d <= this.day; d++) rows.push(h('span', {}, `Day ${d}`), track((d - 1) * CHAPTER, CHAPTER), track(0, CHAPTER));
    const re = this.day * (this.day + 1) / 2 * CHAPTER, bm = this.day * CHAPTER;
    const next = h('button', { type: 'button', class: 'primary', onclick: () => {
      this.day++; this.renderBook(); this.renderMapping(); this.report(); this.book.querySelector('button.primary')?.focus();
    } }, this.day === 0 ? 'Day 1: the first chapter arrives' : `Day ${this.day + 1}`);
    this.book.replaceChildren(
      h('h3', {}, '1. Two readers, one serial novel'),
      h('p', { style: { margin: '0 0 0.5rem' } }, `Each day a ${CHAPTER}-page chapter arrives, and each reader writes a paragraph about the story so far.`),
      h('div', { class: 'days' }, h('span', {}), h('span', { class: 'hd' }, 'Re-reads from page 1'), h('span', { class: 'hd' }, 'Keeps their place'), ...rows),
      h('div', { class: 'row legend muted' }, h('span', {}, h('i', { class: 'old' }), 'pages read again'), h('span', {}, h('i', { class: 'new' }), 'new pages')),
      h('p', { class: 'num', 'aria-live': 'polite', style: { margin: '0.3rem 0' } },
        `Pages read so far: ${re} by the re-reader, ${bm} by the bookmarker`, this.day > 1 ? ` (${(re / bm).toFixed(1)} times as many).` : '.'),
      this.day < DAYS ? next : h('p', { class: 'debrief', style: { margin: 0 } },
        'The bookmarker did not skip the story: their notes carry it. Re-reading something you already processed is the expensive part, and it can be avoided.'));
  }

  // Step 2: map the story onto an agent.
  renderMapping() {
    const locked = this.day < DAYS;
    this.mapping.toggleAttribute('data-locked', locked);
    if (locked) { this.mapping.replaceChildren(h('h3', {}, '2. Same story, different reader'), h('p', { class: 'muted', style: { margin: 0 } }, 'Finish the eight days first.')); return; }
    if (this.mapping.dataset.built) return;
    this.mapping.dataset.built = '1';
    const selects = PAIRS.map(([book]) => h('select', { 'aria-label': `In an agent session: ${book}` },
      h('option', { value: '' }, 'Choose the agent version...'), ...CHOICES.map(c => h('option', { value: c }, c))));
    const fb = h('p', { 'aria-live': 'polite', style: { margin: '0.4rem 0 0' } });
    const check = h('button', { type: 'button', class: 'primary', onclick: () => {
      let right = 0;
      selects.forEach((s, i) => { const ok = s.value === PAIRS[i][1]; s.dataset.state = s.value ? (ok ? 'right' : 'wrong') : ''; right += ok; });
      if (right === PAIRS.length) {
        this.matched = true; check.disabled = true; selects.forEach(s => { s.disabled = true; });
        fb.replaceChildren(h('span', { class: 'ok' }, 'All four match. '),
          'One difference: the bookmarker remembers the gist, but an ideal cache keeps the model\'s exact processed version of every token, so nothing is lost by not re-reading. Real caches expire or get evicted, and then the model does re-read.');
        this.renderReceipt(); this.report();
      } else fb.replaceChildren(h('span', { class: 'no' }, `${right} of ${PAIRS.length} right. `), 'Red borders mark the mismatches.');
    } }, 'Check');
    this.mapping.replaceChildren(h('h3', {}, '2. Same story, different reader'),
      h('p', { style: { margin: '0 0 0.5rem' } }, 'Now the reader is a model in an agent session. Match each part of the story to its agent version.'),
      h('div', { class: 'match' }, ...PAIRS.map(([book], i) => h('label', {}, h('span', {}, book), selects[i]))),
      h('div', { class: 'row', style: { marginTop: '0.5rem' } }, check), fb);
  }

  // Step 3: the agent's receipt.
  renderReceipt() {
    if (!this.matched) {
      this.receipt.setAttribute('data-locked', '');
      this.receipt.replaceChildren(h('h3', {}, '3. The agent\'s receipt'), h('p', { class: 'muted', style: { margin: 0 } }, 'Match the story to the agent first.'));
      return;
    }
    this.receipt.removeAttribute('data-locked');
    const rows = Array.from({ length: this.t }, (_, i) => turn(i + 1));
    const tot = rows.reduce((a, r) => ({ cached: a.cached + r.cached, fresh: a.fresh + r.fresh, out: a.out + r.out, cost: a.cost + r.cost, uncached: a.uncached + r.uncached }),
      { cached: 0, fresh: 0, out: 0, cost: 0, uncached: 0 });
    const all = tot.cached + tot.fresh + tot.out, share = all ? tot.cached / all : 0;
    const shown = rows.length > 6 ? [...rows.slice(0, 2), null, ...rows.slice(-3)] : rows;
    const tr = r => r ? h('tr', {}, h('td', {}, String(r.t)), h('td', { class: 'c' }, k(r.cached)), h('td', {}, k(r.fresh)), h('td', {}, k(r.out)), h('td', {}, fmt.usd(r.cost)))
      : h('tr', { class: 'gap' }, h('td', { colspan: 5 }, `${rows.length - 5} more turns`));

    const controls = [];
    if (this.t < AGENT.guessAt) controls.push(h('button', { type: 'button', class: 'primary', onclick: () => { this.t++; this.renderReceipt(); this.receipt.querySelector('button.primary')?.focus(); } },
      this.t === 0 ? 'Start the session' : `Turn ${this.t + 1}`));
    else if (!this.guessed) controls.push(this.guessCard(share));
    else if (this.t < AGENT.end) controls.push(h('button', { type: 'button', class: 'primary', onclick: () => { this.t = AGENT.end; this.renderReceipt(); this.report(); } }, `Jump to turn ${AGENT.end}`));
    else controls.push(h('p', { class: 'debrief', style: { margin: 0 } },
      this.guessLabel ? `At turn ${AGENT.guessAt} you guessed ${this.guessLabel.toLowerCase()}. ` : '',
      `By turn ${AGENT.end}, ${Math.round(share * 100)}% of all tokens are cached re-reads. An ideal cache cut the bill from ${fmt.usd(tot.uncached)} to ${fmt.usd(tot.cost)}. Most of the tokens on this receipt are the model re-reading.`));

    this.receipt.replaceChildren(...[h('h3', {}, '3. The agent\'s receipt'),
      h('p', { style: { margin: '0 0 0.5rem' } }, `The session starts with ${fmt.n(AGENT.start)} tokens of instructions and files. Each turn adds ${fmt.n(AGENT.perTurn)} new tokens and the model writes ${AGENT.out}.`),
      rows.length ? h('div', { style: { overflowX: 'auto' } }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'turn'), h('th', {}, 'cached'), h('th', {}, 'fresh'), h('th', {}, 'output'), h('th', {}, 'cost'))),
        h('tbody', {}, ...shown.map(tr)))) : null,
      rows.length ? h('div', { 'aria-live': 'polite' },
        h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: '0.4rem' } }, h('span', {}, 'Cached share of all tokens'), h('strong', { class: 'num' }, `${Math.round(share * 100)}%`)),
        h('div', { class: 'meter' }, h('div', { style: { width: `${share * 100}%` } }), h('span', { title: '90%' })),
        h('div', { class: 'muted num', style: { fontSize: '0.8rem' } }, `Total ${fmt.usd(tot.cost)} with caching, ${fmt.usd(tot.uncached)} without. Illustrative prices per million tokens: cached $${PRICE.cached.toFixed(2)}, fresh $${PRICE.fresh.toFixed(2)}, output $${PRICE.out.toFixed(2)}.`)) : null,
      h('div', { style: { marginTop: '0.6rem' } }, ...controls)].filter(Boolean));
  }

  guessCard(now) {
    const fb = h('div', { 'aria-live': 'polite' });
    const opts = [
      ['About half', false, 'It only goes up from here: every new turn re-reads a longer context, while fresh input and output stay the same size.'],
      [`About ${Math.round(now * 100)}%, like now`, false, 'The re-read part grows every turn, while fresh input and output stay the same size, so the share keeps climbing.'],
      ['Over 90%', true, 'Right. It is the re-reader\'s problem again: the pile behind each new chapter keeps growing.'],
    ];
    const box = h('div', { class: 'guess' }, ...opts.map(([label, ok, why]) => h('button', { type: 'button', onclick: () => {
      box.querySelectorAll('button').forEach(b => { b.disabled = true; });
      this.guessed = true; this.guessLabel = label.replace(/, like now$/, '');
      fb.replaceChildren(h('p', { style: { margin: '0.4rem 0' } }, h('span', { class: ok ? 'ok' : 'no' }, ok ? 'Good guess. ' : 'Not quite. '), why),
        h('button', { type: 'button', class: 'primary', onclick: () => { this.t = AGENT.end; this.renderReceipt(); this.report(); } }, `Jump to turn ${AGENT.end}`));
      fb.querySelector('button').focus();
    } }, label)));
    return h('div', {}, h('strong', {}, `Guess: at turn ${AGENT.end}, what share of all tokens will be cached re-reads?`), box, fb);
  }

  report() {
    const done = (this.day >= DAYS) + this.matched + (this.t >= AGENT.end);
    if (done === 3) this.complete('Re-reads of a growing context are most of the tokens in this agent session; an ideal cache keeps the model\'s place, so those re-reads become the cheapest tokens on the bill.');
    else this.progress(done, 3, `${done} of 3 steps done.`);
  }
}

customElements.define('x-caching-b', CachingB);
