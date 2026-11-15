// Distributions, spin B (role): be the model. For each context the learner
// spreads weight across candidate tokens, locks it in, and compares with a toy
// model's distribution and with the single answer a chat product would show.
import { Explorable, h } from '../js/kit.js';

// Illustrative numbers, not measured from any real model. "anything else"
// stands for the rest of the vocabulary.
const ROUNDS = [
  { ctx: 'I walked down to the bank to', cands: [[' deposit', .30], [' fish', .10], [' meet', .12], [' watch', .08], ['anything else', .40]],
    note: 'Two readings of "bank" stay alive at once: money and river. The model does not have to decide yet, so it keeps both.' },
  { ctx: 'My favorite color is', cands: [[' blue', .32], [' green', .14], [' red', .10], [' purple', .09], ['anything else', .35]],
    note: 'Nothing in the context settles this, so the spread is wide. Any single answer here is mostly an accident of sampling.' },
  { ctx: 'The capital of France is', cands: [[' Paris', .86], [' a', .05], [' the', .03], [' located', .02], ['anything else', .04]],
    note: 'Peaked, but not 100%: " a" (as in "a city of...") is a grammatical way to go on. The model scores continuations, not facts.' },
  { ctx: 'Review: "Cold food, but the staff were lovely." Positive, negative, or mixed? Answer:', cands: [[' mixed', .55], [' positive', .24], [' negative', .18], ['anything else', .03]],
    decision: true,
    note: 'Used as a decision model, these scores are the product: read them directly, no prose sampled. They are next-token scores, not a calibrated chance that the review is mixed; that would need checking against labeled examples. Still, they show the runner-up that a bare "mixed" hides.' },
];

const pct = x => `${Math.round(100 * x)}%`;
const show = t => t.replace(/^ /, '·');

class DistributionsB extends Explorable {
  static prediction = {
    question: 'Below you play against a toy model, built so its numbers follow what each context leaves open. For "My favorite color is", how much probability does it put on its single most likely next word?',
    options: [
      { label: 'Most of it, over 70%: models answer confidently', correct: false,
        feedback: 'Nothing in this context picks a color, so the toy model spreads its probability out, with the top word well under half. Its numbers are illustrative, not measured: a real model may be more or less peaked, and a confident-sounding reply does not tell you which.' },
      { label: 'Well under half: the context leaves it open', correct: true,
        feedback: 'Nothing in the context picks a color, so the toy model spreads its probability out. Its numbers are illustrative, not measured from a real model. A chat reply can sound just as sure either way, because it shows one pick, not the spread.' },
    ],
    after: 'Now be the model. For each context, write the word you would put next, spread your weight across the candidates, then compare.',
  };

  static literacies = {
    read: 'You read each context for how much it settles about what comes next.',
    write: 'You write your own next word for each context, then see where the toy model puts it.',
    count: 'You estimate a probability for each candidate before the toy model\'s numbers are revealed, then see how much of your weight you share with it (a comparison, not a grade).',
  };

  static css = `
    .ctx { font-family: var(--lit-font-body); font-size: 1.1rem; }
    .ctx .slot { font-family: var(--lit-font-mono); color: var(--lit-work); border-bottom: 2px solid var(--lit-work); padding: 0 0.4rem; }
    .mine input { width: 9rem; padding: 0.25rem 0.4rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-surface); font-family: var(--lit-font-mono); }
    .alloc { display: grid; grid-template-columns: 7.5rem 1fr 3rem; gap: 0.35rem 0.6rem; align-items: center; }
    .alloc .t, .cmp .t { font-family: var(--lit-font-mono); white-space: pre; overflow-wrap: anywhere; }
    .cmp { display: grid; grid-template-columns: 7.5rem 1fr 6.5rem; gap: 0.15rem 0.6rem; align-items: center; font-size: 0.9rem; }
    .pair { display: grid; gap: 2px; }
    .bar.you { background: var(--lit-teach); }
    .bar.model { background: var(--lit-work); }
    .bar { min-width: 1px; transition: width 0.3s; }
    .key { display: inline-block; width: 0.8rem; height: 0.6rem; border-radius: 2px; margin: 0 0.25rem 0 0.6rem; }
    .shown { padding: 0.5rem 0.7rem; background: var(--lit-surface-2); border-radius: var(--lit-radius); }
    .steps { display: flex; gap: 0.3rem; }
    .steps span { width: 1.6rem; height: 0.35rem; border-radius: 2px; background: var(--lit-border); }
    .steps span[data-on] { background: var(--lit-work); }
    .summary { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .summary th, .summary td { text-align: left; padding: 0.3rem 0.4rem; border-bottom: 1px solid var(--lit-border); vertical-align: top; }
    .stack > * + * { margin-top: 0.75rem; }
    .label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--lit-muted); margin-bottom: 0.25rem; }
  `;

  mount(root) {
    this.i = 0;
    this.results = [];
    this.box = h('div', { class: 'stack' });
    root.append(this.box);
    this.renderRound();
  }

  renderRound() {
    const r = ROUNDS[this.i];
    const w = r.cands.map(() => 20);
    let touched = false;
    const outs = r.cands.map(() => h('output', { class: 'num' }));
    const lock = h('button', { type: 'button', class: 'primary', disabled: true }, 'Lock in my distribution');
    const hint = h('span', { class: 'muted', style: { fontSize: '0.85rem' } }, 'Move at least one slider.');
    const word = h('input', { type: 'text', maxlength: 24, autocomplete: 'off', 'aria-label': 'The next word you would write', oninput: () => refresh() });
    const norm = () => { const z = w.reduce((a, b) => a + b, 0) || 1; return w.map(x => x / z); };
    const refresh = () => {
      norm().forEach((p, j) => { outs[j].textContent = pct(p); });
      const ok = touched && w.some(x => x > 0) && word.value.trim();
      lock.disabled = !ok;
      hint.textContent = ok ? 'Your weights are scaled to add up to 100%.' : !word.value.trim() ? 'Write your next word, and move at least one slider.' : 'Move at least one slider.';
    };
    const sliders = r.cands.map(([t], j) => h('input', { type: 'range', min: 0, max: 100, step: 1, value: 20,
      'aria-label': `Weight for ${t.trim()}`, oninput: e => { w[j] = +e.target.value; touched = true; refresh(); } }));
    const alloc = h('div', { class: 'alloc' }, r.cands.flatMap(([t], j) => [h('span', { class: 't' }, show(t)), sliders[j], outs[j]]));
    const reveal = h('div', { 'aria-live': 'polite' });
    lock.addEventListener('click', () => {
      sliders.forEach(s => { s.disabled = true; });
      word.disabled = true;
      lock.disabled = true; lock.textContent = 'Locked in';
      this.reveal(reveal, r, norm(), word.value.trim());
    });
    refresh();
    this.box.replaceChildren(
      this.stepper(),
      h('div', { class: 'card' },
        h('div', { class: 'label' }, r.decision ? `Context ${this.i + 1} of ${ROUNDS.length}: a decision` : `Context ${this.i + 1} of ${ROUNDS.length}`),
        h('p', { class: 'ctx', style: { margin: '0 0 0.75rem' } }, r.ctx, ' ', h('span', { class: 'slot' }, '?')),
        h('label', { class: 'row mine', style: { marginBottom: '0.75rem' } }, h('span', {}, 'You write next:'), word),
        h('div', { class: 'label' }, 'You are the model: how likely is each next token?'),
        alloc,
        h('div', { class: 'row', style: { marginTop: '0.75rem' } }, lock, hint)),
      reveal);
    this.progress(this.results.length, ROUNDS.length, `Context ${this.i + 1} of ${ROUNDS.length}: spread your weight and lock it in.`);
  }

  reveal(host, r, mine, word) {
    const model = r.cands.map(c => c[1]);
    const wj = r.cands.slice(0, -1).findIndex(([t]) => t.trim().toLowerCase() === word.toLowerCase().replace(/[.,!?"]+$/, ''));
    const yours = wj >= 0
      ? `You wrote "${word}": the toy model gives it ${pct(model[wj])}.`
      : `You wrote "${word}": in this toy model it is folded into "anything else" (${pct(model.at(-1))} together).`;
    const overlap = mine.reduce((s, p, j) => s + Math.min(p, model[j]), 0);
    const topJ = model.indexOf(Math.max(...model.slice(0, -1)));
    const top = r.cands[topJ][0];
    this.results.push({ r, overlap, top, topP: model[topJ] });
    const last = this.results.length === ROUNDS.length;
    host.replaceChildren(h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('div', { class: 'label' }, 'You vs. the toy model ',
          h('span', { class: 'key', style: { background: 'var(--lit-teach)' } }), 'you',
          h('span', { class: 'key', style: { background: 'var(--lit-work)' } }), 'model'),
        h('div', { class: 'cmp' }, r.cands.flatMap(([t, p], j) => [
          h('span', { class: 't' }, show(t)),
          h('div', { class: 'pair', 'aria-label': `${t.trim()}: you ${pct(mine[j])}, model ${pct(p)}` },
            h('div', { class: 'bar you', style: { width: pct(mine[j]), height: '0.5rem' } }),
            h('div', { class: 'bar model', style: { width: pct(p), height: '0.5rem' } })),
          h('span', { class: 'num' }, `${pct(mine[j])} / ${pct(p)}`)])),
        h('p', { style: { margin: '0.6rem 0 0' } }, h('strong', {}, `Comparison: you share ${pct(overlap)} of your weight with the toy model. `), r.note),
        h('p', { style: { margin: '0.4rem 0 0' } }, yours, ' Your word is one pick, like one word of a chat reply.'),
        h('p', { class: 'muted', style: { margin: '0.4rem 0 0', fontSize: '0.85rem' } }, 'Toy numbers, illustrative only. Disagreeing with them is not an error: they are not a gold standard.')),
      h('div', { class: 'shown' },
        r.decision ? [h('strong', {}, 'A decision model reads off: '), r.cands.slice(0, -1).map(([t, p]) => `${t.trim()} ${pct(p)}`).join(', '),
             `. The other ${pct(r.cands.at(-1)[1])} fell outside the three labels and is usually set aside before the scores are compared.`]
          : [h('strong', {}, 'A chat product at low temperature shows only: '), h('span', { class: 'mono' }, `"${r.ctx}${top}"`),
             ` The other ${pct(1 - r.cands[topJ][1])} of the next-token distribution never reaches you.`]),
      last ? this.summary() : h('div', {}, h('button', { type: 'button', class: 'primary', onclick: () => { this.i++; this.renderRound(); } }, 'Next context')),
    ));
    if (last) {
      this.complete('Some contexts are nearly settled and some are wide open, but a chat reply sounds equally sure in both. Each word of a reply is one draw (or, at low temperature, the top pick) from a spread like these, and the reply hides the spread. Next-token scores are not calibrated confidence in a whole answer, but they are evidence the interface usually leaves out.');
    } else {
      this.progress(this.results.length, ROUNDS.length, `${this.results.length} of ${ROUNDS.length} contexts compared.`);
    }
  }

  summary() {
    return h('div', { class: 'card' },
      h('div', { class: 'label' }, 'All four contexts'),
      h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'summary' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Context'), h('th', {}, 'Top token'), h('th', { class: 'num' }, 'Its share'), h('th', { class: 'num' }, 'Shared with toy'))),
        h('tbody', {}, this.results.map(x => h('tr', {},
          h('td', {}, x.r.ctx.length > 34 ? x.r.ctx.slice(0, 32) + '...' : x.r.ctx),
          h('td', { class: 'mono' }, x.top.trim()),
          h('td', { class: 'num' }, pct(x.topP)),
          h('td', { class: 'num' }, pct(x.overlap))))))),
      h('div', { class: 'row', style: { marginTop: '0.6rem' } },
        h('button', { type: 'button', onclick: () => { this.i = 0; this.results = []; this.renderRound(); } }, 'Play again')));
  }

  stepper() {
    return h('div', { class: 'steps', 'aria-hidden': 'true' }, ROUNDS.map((_, j) => h('span', { 'data-on': j <= this.i ? '' : false })));
  }
}

customElements.define('x-distributions-b', DistributionsB);
