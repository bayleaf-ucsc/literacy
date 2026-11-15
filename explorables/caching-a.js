// Caching, spin A: an instrument. A cost meter over an agent session: sliders
// for session length and token sizes, caching on/off, stacked per-turn bars in
// tokens or dollars. Prices are illustrative, not any provider's.
import { Explorable, h, fmt } from '../js/kit.js';

// Illustrative prices in dollars per million tokens. Cached input at about 10%
// of fresh input and output at several times input is a common shape.
const PRICE = { cached: 0.30, fresh: 3.00, out: 15.00 };

// Every turn (one model call) reads the whole context so far. With caching, the
// prefix seen on the previous turn (including its output) is a cache hit; only
// newly appended tokens are fresh. Without caching, the prefix is reprocessed
// and billed as fresh input. (Some providers also charge extra to write the
// cache; that is left out here.)
function session({ turns, start, perTurn, out }) {
  const rows = [];
  let prefix = 0;
  for (let t = 1; t <= turns; t++) {
    const fresh = t === 1 ? start + perTurn : perTurn;
    rows.push({ reread: prefix, fresh, out });
    prefix += fresh + out;
  }
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  const tot = { reread: sum('reread'), fresh: sum('fresh'), out: sum('out') };
  tot.all = tot.reread + tot.fresh + tot.out;
  const cost = (r, cache) => (r.reread * (cache ? PRICE.cached : PRICE.fresh) + r.fresh * PRICE.fresh + r.out * PRICE.out) / 1e6;
  return { rows, tot, cost, share: tot.reread / tot.all };
}

// The estimate: double a session's length at the starting sizes, caching on.
const BASE = { start: 8000, perTurn: 1500, out: 400 };
const EST_FROM = 30, EST_TO = 60;
const billAt = turns => { const r = session({ turns, ...BASE }); return r.cost(r.tot, true); };

// The story's 40-turn session, for the prediction's feedback: re-reads' share of
// tokens, and of the bill with caching on and off.
const STORY = (() => {
  const r = session({ turns: 40, ...BASE }), rr = { ...r.tot, fresh: 0, out: 0 };
  const pct = x => Math.round(x * 100);
  return { tokens: pct(r.share), on: pct(r.cost(rr, true) / r.cost(r.tot, true)), off: pct(r.cost(rr, false) / r.cost(r.tot, false)) };
})();
const CONDITIONS = `The share depends on the session: a one-turn session has no re-reads at all, and longer sessions push it up.`;

// How close an estimate came, as a factor: "within 20%" or "off by a factor of 3".
function closeness(guess, actual) {
  const f = Math.max(guess, actual) / Math.max(Math.min(guess, actual), 1e-9);
  return f < 1.25 ? `within ${Math.round((f - 1) * 100)}%` : `off by a factor of ${f.toFixed(1).replace(/\.0$/, '')}`;
}

const SLIDERS = [
  ['turns', 'Turns in the session (each is one model call)', 1, 60, 1, v => String(v)],
  ['start', 'Starting context: instructions, tool descriptions, files', 2000, 40000, 1000, v => `${fmt.n(v)} tokens`],
  ['perTurn', 'New input per turn: your message or a tool result', 200, 6000, 100, v => `${fmt.n(v)} tokens`],
  ['out', 'Output per turn: reasoning, tool calls, replies', 100, 2000, 50, v => `${fmt.n(v)} tokens`],
];

class CachingA extends Explorable {
  static prediction = {
    question: `In the story's 40-turn session, over 90% of the agent's tokens were cached re-reads. With caching on, are they also over 90% of that session's bill?`,
    options: [
      { label: 'Yes: the bill follows the tokens', correct: false,
        feedback: `Not even without caching: output is priced at five times fresh input here, so re-reads would be about ${STORY.off}% of the bill against ${STORY.tokens}% of the tokens. With caching, cached tokens cost a tenth of fresh input and a fiftieth of output, so in that session they drop to about ${STORY.on}% of the bill. ${CONDITIONS}` },
      { label: 'No: priced at a tenth, they drop to around half', correct: true,
        feedback: `Right. Cached tokens cost a tenth of fresh input and a fiftieth of output here, so the small fresh and output lines carry much more weight per token: in that session re-reads are about ${STORY.on}% of the bill. ${CONDITIONS}` },
    ],
    after: 'Estimate one bill first, then rewrite the starting context, switch caching off and on, and look at the bill as well as the tokens.',
  };

  static literacies = {
    read: 'You read stacked bars, a token meter and an itemized bill for the same session.',
    write: 'You rewrite the starting context the agent re-reads every turn, smaller or larger, and see what each 1,000 tokens of it costs.',
    count: 'You estimate what doubling a session\'s length does to its bill before the sliders unlock, then see how close you were.',
  };

  static css = `
    .sl { display: grid; gap: 0.1rem; margin-bottom: 0.5rem; }
    .sl label { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.85rem; }
    .sl input { margin: 0.2rem 0; }
    .sl output { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
    .bar-row button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .chart { display: flex; align-items: flex-end; gap: 1px; height: 11rem; border-bottom: 1px solid var(--lit-border); margin-top: 0.75rem; }
    .col { flex: 1 1 0; height: 100%; display: flex; flex-direction: column-reverse; min-width: 0; max-width: 2.5rem; }
    .col span { display: block; transition: height 0.3s; }
    .s-reread { background: var(--lit-teach); }
    .s-reread.full { background: var(--lit-argue); }
    .s-fresh { background: var(--lit-muted); }
    .s-out { background: var(--lit-work); }
    .axis { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--lit-muted); }
    .legend { font-size: 0.8rem; gap: 0.8rem; margin: 0.4rem 0 0.75rem; }
    .legend i { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 2px; vertical-align: -0.1rem; margin-right: 0.25rem; }
    .meter { position: relative; height: 0.9rem; background: var(--lit-surface-2); border-radius: 3px; margin: 0.3rem 0 0.2rem; }
    .meter .fill { height: 100%; background: var(--lit-teach); border-radius: 3px; transition: width 0.3s; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    th, td { text-align: right; padding: 0.2rem 0.3rem; border-bottom: 1px solid var(--lit-border); }
    th:first-child, td:first-child { text-align: left; }
    tfoot td { font-weight: 650; border-bottom: 0; }
    .est input { width: 6rem; padding: 0.25rem 0.4rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-surface); }
    .goals { list-style: none; padding: 0; margin: 0.4rem 0 0; font-size: 0.85rem; }
    .goals li[data-done] { color: var(--lit-good); }
    .goals li[data-done]::before { content: 'done: '; font-weight: 600; }
  `;

  mount(root) {
    this.s = { turns: 4, ...BASE };
    this.cache = true; this.view = 'tokens';
    this.goals = { estimate: false, off: false, on: false, cost: false, author: false };
    this.inputs = [];
    const sliders = SLIDERS.map(([k, label, min, max, step, show]) => {
      const out = h('output', {}, show(this.s[k]));
      const input = h('input', { type: 'range', min, max, step, value: this.s[k], disabled: true, 'aria-label': label, oninput: () => {
        this.s[k] = +input.value; out.textContent = show(this.s[k]); this.update();
      } });
      this.inputs.push(input);
      return h('div', { class: 'sl' }, h('label', {}, h('span', {}, label), out), input);
    });
    const seg = (prop, opts) => {
      const btns = opts.map(([v, label]) => h('button', { type: 'button', 'aria-pressed': String(this[prop] === v), onclick: () => {
        this[prop] = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i][0] === v))); this.update();
      } }, label));
      return btns;
    };
    this.chart = h('div', { class: 'chart', role: 'img' });
    this.axis = h('div', { class: 'axis' });
    this.legend = h('div', { class: 'row legend muted' });
    this.meter = h('div', { class: 'card', 'aria-live': 'polite' });
    this.bill = h('div', { class: 'card', style: { marginTop: '0.75rem', overflowX: 'auto' } });
    this.goalList = h('ul', { class: 'goals' });

    // Count: estimate the doubled session's bill before the sliders unlock.
    const from = billAt(EST_FROM), to = billAt(EST_TO);
    const est = h('input', { type: 'number', min: 0, step: 0.05, inputmode: 'decimal', 'aria-label': 'Your estimate in dollars',
      oninput: () => { lock.disabled = !(est.value !== '' && +est.value > 0); } });
    const estNote = h('div', { 'aria-live': 'polite', style: { marginTop: '0.3rem', fontSize: '0.9rem' } },
      h('span', { class: 'muted' }, 'The sliders unlock once you estimate.'));
    const lock = h('button', { type: 'button', class: 'primary', disabled: true, onclick: () => {
      const g = +est.value; est.disabled = lock.disabled = true;
      this.inputs.forEach(i => { i.disabled = false; });
      estNote.replaceChildren(`You estimated ${fmt.usd(g)}; it costs ${fmt.usd(to)}, ${closeness(g, to)}. `,
        `Doubling the turns multiplied the bill by ${(to / from).toFixed(1)}, not 2: each added turn re-reads a longer context. Drag Turns to ${EST_TO} to see it.`);
      this.goals.estimate = true; this.update(); this.inputs[0].focus();
    } }, 'Lock in');
    const estCard = h('div', { class: 'card est', style: { marginBottom: '0.75rem' } },
      h('strong', {}, 'Estimate first: '),
      `at the starting sizes below, a ${EST_FROM}-turn session costs ${fmt.usd(from)} with caching on. What does a ${EST_TO}-turn session cost?`,
      h('div', { class: 'row', style: { marginTop: '0.4rem' } }, h('span', {}, '$'), est, lock), estNote);

    root.append(
      estCard,
      ...sliders,
      h('div', { class: 'row bar-row', style: { marginTop: '0.5rem' } },
        h('span', { class: 'muted' }, 'Caching:'), ...seg('cache', [[true, 'on'], [false, 'off']]),
        h('span', { class: 'muted', style: { marginLeft: '0.75rem' } }, 'Bar height:'), ...seg('view', [['tokens', 'tokens'], ['cost', 'cost']])),
      h('p', { class: 'muted', style: { fontSize: '0.8rem', margin: '0.4rem 0 0' } },
        'This is an ideal cache: every turn reuses exactly the prefix the last turn saw. Real caches expire after idle minutes or get evicted, miss from the first changed token onward (edit the instructions mid-session and everything after is reprocessed), and some providers charge extra to write them.'),
      this.chart, this.axis, this.legend, this.meter, this.bill,
      h('div', { class: 'card', style: { marginTop: '0.75rem' } }, h('strong', {}, 'Try to'), this.goalList),
    );
    this.update();
  }

  update() {
    const { s, cache, view } = this;
    const run = session(s);
    const rowCost = r => ({
      reread: r.reread * (cache ? PRICE.cached : PRICE.fresh) / 1e6, fresh: r.fresh * PRICE.fresh / 1e6, out: r.out * PRICE.out / 1e6,
    });
    // Scale cost bars to the uncached maximum, so switching caching on visibly shrinks them.
    const values = run.rows.map(r => view === 'cost' ? rowCost(r) : r);
    const max = view === 'cost'
      ? Math.max(...run.rows.map(r => (r.reread + r.fresh) * PRICE.fresh / 1e6 + r.out * PRICE.out / 1e6))
      : Math.max(...run.rows.map(r => r.reread + r.fresh + r.out));
    this.chart.replaceChildren(...values.map((v, i) => h('div', { class: 'col', title: `Turn ${i + 1}` },
      h('span', { class: 's-out', style: { height: `${v.out / max * 100}%` } }),
      h('span', { class: 's-fresh', style: { height: `${v.fresh / max * 100}%` } }),
      h('span', { class: `s-reread${cache ? '' : ' full'}`, style: { height: `${v.reread / max * 100}%` } }))));
    const peak = view === 'cost' ? fmt.usd(max) : `${fmt.n(max)} tokens`;
    this.chart.setAttribute('aria-label', `Per-turn ${view} for ${s.turns} turns, tallest bar ${peak}`);
    this.axis.replaceChildren(h('span', {}, 'turn 1'), h('span', {}, `tallest bar: ${peak}`), h('span', {}, `turn ${s.turns}`));
    const rereadName = cache ? 'Re-read, from cache' : 'Re-read, reprocessed at full price';
    this.legend.replaceChildren(
      h('span', {}, h('i', { class: `s-reread${cache ? '' : ' full'}` }), rereadName),
      h('span', {}, h('i', { class: 's-fresh' }), 'Fresh input'),
      h('span', {}, h('i', { class: 's-out' }), 'Output'));

    const pct = Math.round(run.share * 100);
    this.meter.replaceChildren(
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('span', {}, 'Share of all tokens that are re-reads'), h('span', { class: 'big' }, `${pct}%`)),
      h('div', { class: 'meter' }, h('div', { class: 'fill', style: { width: `${pct}%` } })),
      h('div', { class: 'row', style: { justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.3rem' } },
        h('span', {}, 'Re-reads\' share of the bill'), h('strong', { class: 'num' }, `${Math.round(run.cost({ ...run.tot, fresh: 0, out: 0 }, cache) / run.cost(run.tot, cache) * 100)}%`)),
      h('div', { class: 'muted', style: { fontSize: '0.8rem' } }, 'The model reads the same tokens either way; caching means the repeated prefix is not reprocessed and is billed at the cached price.'));

    const line = (name, tokens, price, cost) => h('tr', {}, h('td', {}, name), h('td', {}, fmt.n(tokens)), h('td', {}, `$${price.toFixed(2)}`), h('td', {}, fmt.usd(cost)));
    const total = run.cost(run.tot, cache), other = run.cost(run.tot, !cache);
    const rp = cache ? PRICE.cached : PRICE.fresh;
    // What one more 1,000 tokens of starting context adds to this session's bill.
    const more = session({ ...s, start: s.start + 1000 });
    const perK = c => more.cost(more.tot, c) - run.cost(run.tot, c);
    this.bill.replaceChildren(
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Session bill'), h('th', {}, 'tokens'), h('th', {}, 'per million'), h('th', {}, 'cost'))),
        h('tbody', {},
          line(cache ? 'Re-read (cached)' : 'Re-read (no cache)', run.tot.reread, rp, run.tot.reread * rp / 1e6),
          line('Fresh input', run.tot.fresh, PRICE.fresh, run.tot.fresh * PRICE.fresh / 1e6),
          line('Output', run.tot.out, PRICE.out, run.tot.out * PRICE.out / 1e6)),
        h('tfoot', {}, h('tr', {}, h('td', {}, 'Total'), h('td', {}, fmt.n(run.tot.all)), h('td', {}), h('td', {}, fmt.usd(total))))),
      h('p', { class: 'muted', style: { fontSize: '0.8rem', margin: '0.4rem 0 0' } },
        `With caching ${cache ? 'off' : 'on'}, the same session would cost ${fmt.usd(other)}. Prices are illustrative, per million tokens.`),
      h('p', { style: { fontSize: '0.9rem', margin: '0.4rem 0 0' } },
        `Every 1,000 tokens of starting context you write adds about ${fmt.usd(perK(true))} to this ${s.turns}-turn session with caching on, ${fmt.usd(perK(false))} with it off: every turn re-reads it.`));

    if (cache) this.goals.on = true; else this.goals.off = true;
    if (view === 'cost') this.goals.cost = true;
    if (this.goals.estimate && (s.start <= BASE.start / 2 || s.start >= BASE.start * 2)) this.goals.author = true;
    const items = [
      ['estimate', `Estimate a ${EST_TO}-turn session's bill`],
      ['author', `Rewrite the starting context: halve it (${fmt.n(BASE.start / 2)} tokens or fewer) or double it (${fmt.n(BASE.start * 2)} or more), and read what each 1,000 tokens costs`],
      ['off', 'Switch caching off and compare the bill'],
      ['cost', 'Show bar height as cost instead of tokens'],
    ];
    this.goalList.replaceChildren(...items.map(([k, label]) => h('li', { 'data-done': this.goals[k] }, label)));
    const done = items.filter(([k]) => this.goals[k]).length;
    if (done === items.length) this.complete('In these simulated sessions, the context you write at the start is re-read on every turn. An ideal cache makes those re-reads the cheapest tokens, so in a long session they are most of the tokens but a smaller share of the bill, and the bill still grows faster than the session. How much context you write, and keep stable, is a cost every turn pays.');
    else this.progress(done, items.length, `${done} of ${items.length} goals reached.`);
  }
}

customElements.define('x-caching-a', CachingA);
