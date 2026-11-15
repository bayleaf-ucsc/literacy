// Costs, spin A: an instrument. Two models, a cheap one that wanders and an
// expensive one that goes straight there. Cost per task is price times tokens,
// so the per-token price alone never settles which is cheaper. A log-log chart
// shows where the lines cross. All prices and energy figures are illustrative.
import { Explorable, h } from '../js/kit.js';

// Rough active-parameter sizes, used only for the energy estimate.
const ACTIVE = { s: 10e9, l: 200e9 };
// Rough: about 1 joule per token for a 70B-active model on data-center GPUs.
// Real figures vary by 10x or more with hardware, batching and precision.
const J_PER_TOKEN_PER_PARAM = 1 / 70e9;

const RANGES = { pS: [0.05, 5], pL: [1, 100], tS: [1e3, 1e6], tL: [1e3, 1e6] };
const PRESETS = {
  quick: { label: 'Quick question', st: { pS: 0.4, pL: 8, tS: 1500, tL: 1000 } },
  agent: { label: 'Multi-step agent task', st: { pS: 0.4, pL: 8, tS: 360e3, tL: 12e3 } },
};
const GOALS = [
  ['guess', 'Estimate the break-even before you see the chart'],
  ['price', 'Move a price slider'],
  ['tokens', 'Move a tokens-per-task slider'],
  ['lwin', 'Find settings where Model L is the cheaper one per task'],
  ['even', 'Move a slider to the break-even point (within 5%)'],
  ['rule', 'Write your rule of thumb for when to pay more'],
];
// Accepts "20000", "20,000", "20k" or "0.2M".
const parseTokens = str => {
  const m = String(str).trim().replace(/,/g, '').match(/^(\d*\.?\d+)\s*([km]?)$/i);
  if (!m) return NaN;
  return +m[1] * ({ k: 1e3, m: 1e6 }[m[2].toLowerCase()] || 1);
};
const words = str => str.trim().split(/\s+/).filter(Boolean).length;

const toPos = (v, [lo, hi]) => Math.round(1000 * Math.log(v / lo) / Math.log(hi / lo));
const fromPos = (p, [lo, hi]) => lo * Math.pow(hi / lo, p / 1000);
const nice = x => Number(x.toPrecision(2));
const usd = x => x >= 0.01 ? `$${x.toFixed(2)}` : x >= 0.0001 ? `$${x.toFixed(4)}` : 'under $0.0001';
const price = x => `$${x < 1 ? x.toFixed(2) : nice(x)}`;
const times = x => x >= 10 ? `${Math.round(x)}x` : `${nice(x)}x`;
const wh = j => { const w = j / 3600; return w >= 1 ? `${nice(w)} Wh` : `${nice(w * 1000)} mWh`; };

const SVG = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

class CostsA extends Explorable {
  static prediction = {
    question: 'Model L charges 20 times more per token than Model S. On a multi-step agent task, S writes 30 times as many tokens as L (wrong turns, retries, rambling). Which costs less to finish the task?',
    options: [
      { label: 'Model S: a 20x price gap is hard to beat', feedback: 'The bill is price times tokens. S pays one twentieth the price for thirty times the tokens, so it spends 30 ÷ 20 = 1.5 times as much as L. A per-token price on its own says nothing about the cost of a task.' },
      { label: 'Model L: 30x fewer tokens outweighs a 20x price', correct: true, feedback: 'Right: the bill is price times tokens. Thirty times fewer tokens beats a twenty times higher price, so L finishes the job for about two thirds of what S spends. A wiser model can be the thrifty one.' },
    ],
    after: 'Now move the prices and token counts yourself. This toy bills every token at one blended rate (real bills price input, cached and output tokens differently), and its prices and energy are illustrative, not quotes for real products.',
  };

  static literacies = {
    read: 'You interpret a log-log chart where a flat line and a rising line cross, and say which model wins on either side.',
    write: 'You write a one-line rule of thumb for when the pricier model is worth it, then compare it with the arithmetic.',
    count: 'You estimate how many tokens Model S can write before it costs as much as Model L, then see the real break-even.',
  };

  static css = `
    .presets { margin-bottom: 0.75rem; }
    .presets button { font-size: 0.85rem; padding: 0.2rem 0.6rem; }
    .presets button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .model h3 { margin: 0 0 0.1rem; font-size: 1rem; }
    .model[data-model=s] h3 { color: var(--lit-teach); }
    .model[data-model=l] h3 { color: var(--lit-argue); }
    .model[data-win] { border-color: var(--lit-work); box-shadow: inset 0 0 0 1px var(--lit-work); }
    .ctl { margin-top: 0.5rem; }
    .ctl label { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.9rem; }
    .cost { margin-top: 0.4rem; }
    .cost small { color: var(--lit-muted); display: block; }
    .verdict { margin: 0.75rem 0 0.25rem; }
    .verdict strong { color: var(--lit-work); }
    .eq { font-size: 0.85rem; }
    svg { width: 100%; height: auto; display: block; margin-top: 0.5rem; }
    svg text { fill: var(--lit-muted); font: 12px var(--lit-font-ui); }
    .energy { font-size: 0.9rem; margin-top: 0.4rem; }
    .goals { list-style: none; padding: 0; margin: 0.6rem 0 0; font-size: 0.9rem; }
    .goals li { padding-left: 1.5rem; position: relative; color: var(--lit-muted); }
    .goals li::before { content: ''; position: absolute; left: 0.2rem; top: 0.3rem; width: 0.75rem; height: 0.75rem; border: 1px solid var(--lit-border); border-radius: 2px; }
    .goals li.done { color: var(--lit-fg); }
    .goals li.done::before { background: var(--lit-good); border-color: var(--lit-good); }
    .ask { margin-top: 0.75rem; }
    .ask label { display: block; font-size: 0.9rem; margin-bottom: 0.35rem; }
    .ask input[type=text] { flex: 1 1 10rem; min-width: 0; padding: 0.3rem 0.5rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
    .ask .out { margin: 0.4rem 0 0; font-size: 0.9rem; }
  `;

  mount(root) {
    this.st = { ...PRESETS.quick.st };
    this.preset = 'quick';
    this.got = {};

    this.presetBtns = Object.entries(PRESETS).map(([id, p]) =>
      h('button', { type: 'button', onclick: () => this.applyPreset(id) }, p.label));

    this.sliders = {};
    const slider = (key, kind, label, model) => {
      const out = h('span', { class: 'num' });
      const input = h('input', {
        type: 'range', min: 0, max: 1000, step: 1, 'aria-label': `${model}: ${label}, log scale`,
        oninput: () => {
          this.st[key] = fromPos(+input.value, RANGES[key]);
          this.got[kind] = true;
          this.preset = null;
          this.update(true);
        },
      });
      this.sliders[key] = { input, out };
      return h('div', { class: 'ctl' }, h('label', {}, h('span', {}, label), out), input);
    };
    const card = (m, title, sub) => {
      this[`cost_${m}`] = h('div', { class: 'big' });
      this[`per1k_${m}`] = h('small', {});
      this[`card_${m}`] = h('div', { class: 'card model', 'data-model': m },
        h('h3', {}, title), h('div', { class: 'muted', style: 'font-size:.85rem' }, sub),
        slider(`p${m.toUpperCase()}`, 'price', 'Price per million tokens', title),
        slider(`t${m.toUpperCase()}`, 'tokens', 'Tokens per task, one rate', title),
        h('div', { class: 'cost' }, h('small', {}, 'Cost per task'), this[`cost_${m}`], this[`per1k_${m}`]));
      return this[`card_${m}`];
    };

    this.verdict = h('p', { class: 'verdict', 'aria-live': 'polite' });
    this.eq = h('p', { class: 'eq muted mono' });
    this.svg = s('svg', { viewBox: '0 0 600 220', role: 'img' });
    this.energy = h('p', { class: 'energy' });
    this.goalList = h('ul', { class: 'goals' });

    // Count: estimate the crossing before the chart shows it.
    this.guessIn = h('input', { type: 'text', inputmode: 'decimal', id: 'guess', placeholder: 'e.g. 50k', autocomplete: 'off',
      onkeydown: e => { if (e.key === 'Enter') this.checkGuess(); } });
    this.guessOut = h('p', { class: 'out', 'aria-live': 'polite' });
    this.chartBox = h('div', { hidden: true }, this.svg);
    const guessBox = h('div', { class: 'card ask' },
      h('label', { for: 'guess' }, h('strong', {}, 'Estimate first: '), 'at the current settings, how many tokens could Model S write before its task costs as much as Model L’s?'),
      h('div', { class: 'row' }, this.guessIn, h('button', { type: 'button', onclick: () => this.checkGuess() }, 'Show the chart')),
      this.guessOut);
    // Write: a rule of thumb in the learner's own words.
    this.ruleIn = h('input', { type: 'text', id: 'rule', autocomplete: 'off', placeholder: 'Pay for L when ...',
      oninput: () => { const ok = words(this.ruleIn.value) >= 5; if (ok !== !!this.got.rule) { this.got.rule = ok; this.touched = true; this.update(false); } } });
    this.ruleOut = h('p', { class: 'out muted' });
    const ruleBox = h('div', { class: 'card ask' },
      h('label', { for: 'rule' }, h('strong', {}, 'Your rule of thumb: '), 'in one line, when is the pricier model worth it?'),
      h('div', { class: 'row' }, this.ruleIn), this.ruleOut);

    root.append(
      h('div', { class: 'row presets', role: 'group', 'aria-label': 'Task' }, h('span', { class: 'muted' }, 'Task:'), ...this.presetBtns),
      h('div', { class: 'grid2' },
        card('s', 'Model S', 'small and cheap, ~10B active parameters (illustrative)'),
        card('l', 'Model L', 'large and pricey, ~200B active parameters (illustrative)')),
      this.verdict, this.eq, guessBox, this.chartBox, this.energy, ruleBox, this.goalList,
    );
    this.syncSliders();
    this.update(false);
    let lastW = 0;
    new ResizeObserver(() => {
      const w = Math.round(this.svg.getBoundingClientRect().width);
      if (w && w !== lastW) { lastW = w; this.drawChart(); }
    }).observe(this.svg);
  }

  checkGuess() {
    const g = parseTokens(this.guessIn.value);
    if (!(g > 0)) { this.guessOut.textContent = 'Enter a number of tokens, such as 5000 or 50k.'; return; }
    const { pS, pL, tL } = this.st;
    const cross = pL * tL / pS; // L's cost ÷ S's price, in tokens
    const off = Math.max(g / cross, cross / g);
    this.guessOut.replaceChildren(
      h('strong', {}, `Break-even: about ${nice(cross).toLocaleString()} tokens. `),
      `You said ${nice(g).toLocaleString()}: ${off < 1.25 ? 'close.' : `off by a factor of about ${nice(off)}.`} `,
      h('span', { class: 'muted' }, `Shortcut: L’s tokens × (L’s price ÷ S’s price) = ${nice(tL).toLocaleString()} × ${nice(pL / pS)}.`));
    this.got.guess = true;
    this.touched = true;
    this.chartBox.hidden = false;
    this.update(false);
  }

  applyPreset(id) {
    this.preset = id;
    this.st = { ...PRESETS[id].st };
    this.syncSliders();
    this.update(false);
  }

  syncSliders() {
    for (const [key, { input }] of Object.entries(this.sliders)) input.value = toPos(this.st[key], RANGES[key]);
  }

  update(fromSlider) {
    const { pS, pL, tS, tL } = this.st;
    const cS = pS * tS / 1e6, cL = pL * tL / 1e6;
    const ratio = cS / cL;
    const even = Math.abs(ratio - 1) < 0.05;
    if (ratio > 1.05) this.got.lwin = true;
    if (even && fromSlider) this.got.even = true;

    this.presetBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(Object.keys(PRESETS)[i] === this.preset)));
    this.sliders.pS.out.textContent = price(pS);
    this.sliders.pL.out.textContent = price(pL);
    this.sliders.tS.out.textContent = nice(tS).toLocaleString();
    this.sliders.tL.out.textContent = nice(tL).toLocaleString();
    for (const [key, { input, out }] of Object.entries(this.sliders))
      input.setAttribute('aria-valuetext', key.startsWith('p') ? `${out.textContent} per million tokens` : `${out.textContent} tokens`);
    this.cost_s.textContent = usd(cS);
    this.cost_l.textContent = usd(cL);
    this.per1k_s.textContent = `${usd(cS * 1000)} per 1,000 tasks`;
    this.per1k_l.textContent = `${usd(cL * 1000)} per 1,000 tasks`;
    this.card_s.toggleAttribute('data-win', ratio < 0.95);
    this.card_l.toggleAttribute('data-win', ratio > 1.05);

    const winner = even ? 'About even: this is the break-even point.'
      : ratio > 1 ? `Model L is ${times(ratio)} cheaper per task.` : `Model S is ${times(1 / ratio)} cheaper per task.`;
    this.verdict.replaceChildren(h('strong', {}, winner));
    this.eq.textContent = `S's cost ÷ L's cost = (S's tokens ÷ L's) × (S's price ÷ L's) = ${nice(tS / tL)} × ${nice(pS / pL)} = ${nice(ratio)}`;

    const eS = tS * ACTIVE.s * J_PER_TOKEN_PER_PARAM, eL = tL * ACTIVE.l * J_PER_TOKEN_PER_PARAM;
    const sameWinner = (eS > eL) === (cS > cL);
    this.energy.replaceChildren(
      h('strong', {}, 'Rough energy per task: '), `S ${wh(eS)}, L ${wh(eL)}. `,
      h('span', { class: 'muted' }, sameWinner
        ? 'Energy tracks active parameters times tokens, so here the cheaper run also uses less energy.'
        : 'Here the cheaper run is not the lower-energy one: prices follow markets, energy follows parameters times tokens.'),
      h('br'), h('small', { class: 'muted' }, 'Assumes about 1 joule per token per 70 billion active parameters; real figures vary tenfold.'));

    this.drawChart();

    this.ruleOut.textContent = this.got.rule
      ? `On cost alone, the arithmetic says: pay for L when S would use more than ${times(pL / pS)} as many tokens (the price ratio). If your rule also weighs mistakes, energy or who checks the work, it covers things this toy cannot.`
      : '';

    const done = GOALS.filter(([k]) => this.got[k]).length;
    this.goalList.replaceChildren(...GOALS.map(([k, label]) => h('li', { class: this.got[k] ? 'done' : '' }, h('span', { class: 'sr' }, this.got[k] ? 'Done: ' : 'To do: '), label)));
    if (done === GOALS.length) {
      this.complete('In this toy, price per token is half the story: cost per task is price times tokens, so a pricier model that takes a shorter path can be the cheaper, and sometimes the lower-energy, choice. Whether either answer is good enough is a separate question.');
    } else if (fromSlider || this.touched || this.preset === 'agent') {
      const next = GOALS.find(([k]) => !this.got[k]);
      this.progress(done, GOALS.length, `${done} of ${GOALS.length}. Next: ${next[1].toLowerCase()}.`);
    }
  }

  drawChart() {
    const { pS, pL, tS, tL } = this.st;
    const cS = pS * tS / 1e6, cL = pL * tL / 1e6;
    // Draw at the rendered width so labels stay legible on a phone.
    const W = Math.max(280, Math.round(this.svg.getBoundingClientRect().width) || 600), H = 220, L = 58, R = 14, T = 14, B = 40;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const xOf = t => L + (W - L - R) * Math.log10(t / 1e3) / 3;
    const yOf = c => T + (H - T - B) * (1 - (Math.log10(Math.max(c, 1e-5)) + 5) / 7);
    const svg = this.svg;
    svg.replaceChildren();
    svg.setAttribute('aria-label', `Cost per task against Model S's tokens per task. Model L's cost is flat at ${usd(cL)}. The lines cross at ${nice(cL / pS * 1e6).toLocaleString()} tokens.`);
    for (const [c, label] of [[1e-4, '$0.0001'], [1e-2, '$0.01'], [1, '$1'], [100, '$100']]) {
      svg.append(s('line', { x1: L, x2: W - R, y1: yOf(c), y2: yOf(c), stroke: 'var(--lit-border)' }));
      svg.append(s('text', { x: L - 6, y: yOf(c) + 4, 'text-anchor': 'end' }, label));
    }
    for (const [t, label] of [[1e3, '1k'], [1e4, '10k'], [1e5, '100k'], [1e6, '1M']]) {
      svg.append(s('text', { x: xOf(t), y: H - B + 16, 'text-anchor': 'middle' }, label));
    }
    svg.append(s('text', { x: (L + W - R) / 2, y: H - 6, 'text-anchor': 'middle' }, "Model S's tokens per task (log scale)"));
    // S: cost rises with its tokens. L: flat, since its tokens are fixed here.
    svg.append(s('line', { x1: xOf(1e3), y1: yOf(pS * 1e3 / 1e6), x2: xOf(1e6), y2: yOf(pS), stroke: 'var(--lit-teach)', 'stroke-width': 2.5 }));
    svg.append(s('line', { x1: xOf(1e3), y1: yOf(cL), x2: xOf(1e6), y2: yOf(cL), stroke: 'var(--lit-argue)', 'stroke-width': 2.5 }));
    svg.append(s('text', { x: L + 4, y: yOf(cL) - 6, style: 'fill:var(--lit-argue)' }, 'Model L'));
    svg.append(s('text', { x: xOf(1e6) - 4, y: yOf(pS) + 16, 'text-anchor': 'end', style: 'fill:var(--lit-teach)' }, 'Model S'));
    const cross = cL / pS * 1e6;
    if (cross >= 1e3 && cross <= 1e6) {
      svg.append(s('line', { x1: xOf(cross), x2: xOf(cross), y1: T, y2: H - B, stroke: 'var(--lit-muted)', 'stroke-dasharray': '4 4' }));
      const flip = xOf(cross) > W * 0.7; // keep the label inside the frame
      svg.append(s('text', { x: xOf(cross) + (flip ? -4 : 4), y: T + 10, 'text-anchor': flip ? 'end' : 'start' }, 'break-even'));
    }
    svg.append(s('circle', { cx: xOf(tS), cy: yOf(cS), r: 6, fill: 'var(--lit-work)', stroke: 'var(--lit-bg)', 'stroke-width': 2 }));
  }
}

customElements.define('x-costs-a', CostsA);
