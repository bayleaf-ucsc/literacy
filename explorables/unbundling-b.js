// Spin B for "unbundling": a puzzle. You staff a campus help desk; five
// people arrive with different needs. Build a client/provider/model stack
// for each. No single stack satisfies everyone, which a bundle would force.
import { Explorable, h } from '../js/kit.js';

const PARTS = {
  client: { label: 'Client', items: {
    app:  'The lab’s own app',
    owui: 'Open WebUI on a campus server',
    desk: 'OpenChamber on your laptop, with a notes folder',
  } },
  provider: { label: 'Provider', items: {
    lab:    'The lab’s servers, through the app’s plan',
    labapi: 'The lab’s API, billed per token (zero-retention terms)',
    market: 'A marketplace, zero-retention routes only',
    campus: 'A campus service (zero retention)',
    laptop: 'Your laptop',
  } },
  model: { label: 'Model', items: {
    closed: 'A frontier closed model',
    openL:  'A large open-weight model',
    openS:  'A small open-weight model',
  } },
};

// Simplified compatibility, scoped to this scenario; close to spin A's rules.
// Hosting weights and passing requests to the lab's API are different things,
// so the campus service and the marketplace can both offer the closed model.
function invalid(s) {
  if (s.client === 'app' && s.provider !== 'lab') return 'In this scenario the lab’s app only talks to the lab’s servers, under its own plan.';
  if (s.provider === 'lab' && s.client !== 'app') return 'In this scenario the app’s plan works only inside the lab’s app; other clients reach the lab through its API.';
  if ((s.provider === 'lab' || s.provider === 'labapi') && s.model !== 'closed') return 'In this simplified world, the lab serves only its own closed model.';
  if (s.model === 'closed' && s.provider === 'laptop') return 'Closed weights are not handed out, so your laptop cannot host them.';
  if (s.provider === 'laptop' && s.model === 'openL') return 'This scenario’s laptop has 16 GB of memory; a large model will not fit.';
  if (s.client === 'owui' && s.provider === 'laptop') return 'In this setup the campus server has no network path to your laptop.';
  return null;
}

// Each case returns [status, reason]: 'ok', 'catch' (works, with a cost) or 'no'.
// Every client here can attach documents, and the lab's model stays reachable
// through its API without the app, so no vendor gets an invented disability.
const CASES = [
  { who: 'A grad student', need: 'Summarize interview transcripts that name participants. The approved protocol allows only services whose terms forbid keeping or training on the data.',
    judge(s) {
      if (s.provider === 'lab') return ['no', 'A consumer plan may keep chats, and its settings decide whether they train future models. That is not what the protocol approved.'];
      return ['ok', s.provider === 'laptop' ? 'Nothing leaves the machine. The notes folder now needs the same care as the transcripts.'
        : 'Zero-retention terms match the protocol: the provider processes the text, then does not keep it. The client may still store history; know where, and who can open it.'];
    } },
  { who: 'A first-year with no budget', need: 'Get help outlining an essay, for free.',
    judge(s) {
      if (s.provider === 'market' || s.provider === 'labapi') return ['no', 'This route bills per token. Cheap, but not free.'];
      if (s.provider === 'lab') return ['catch', 'Free tiers exist, often paid for with limits or your data. Look for a stack where nobody bills you.'];
      return ['ok', s.provider === 'campus' ? 'The campus pays for shared access.' : 'You already own the hardware; the electricity is yours.'];
    } },
  { who: 'A researcher on a long flight', need: 'Draft a paragraph with no internet connection.',
    judge(s) {
      if (s.provider !== 'laptop') return ['no', 'Every provider but your laptop is on the other side of a network you do not have.'];
      return ['ok', 'Client, provider and model are all on the tray table.'];
    } },
  { who: 'A new advisor', need: 'Answer questions about this department’s own advising rules.',
    judge(s) {
      const how = { app: 'The app’s project files hold the rules, so each chat starts with them.',
        owui: 'The campus server attaches the rules as knowledge every model sees.',
        desk: 'The rules sit in a text file the agent reads at the start of each session.' }[s.client];
      return ['ok', `No model was trained on these rules; the client puts them in context. ${how} Spot-check answers against the document either way.`];
    } },
  { who: 'A lab manager', need: 'Work through a tricky multi-year grant budget. Not sensitive and quality matters most, but the department’s subscription to the lab’s app just lapsed.',
    judge(s) {
      if (s.provider === 'lab') return ['no', 'The app’s plan is what lapsed, so this route is closed until someone renews it.'];
      if (s.model === 'openS') return ['catch', 'A small model is the most likely to slip on long, careful reasoning. Use a bigger one when it matters.'];
      return ['ok', `${s.model === 'closed' ? 'The lab’s model is still reachable without the app subscription.' : 'A large open-weight model is a reasonable fit.'} Either way, re-add one year’s totals by hand before trusting the rest.`];
    } },
];

// Every stack that runs, and the fewest distinct stacks that fully serve all
// five people under these rules (computed, so edits to the rules stay honest).
const STACKS = Object.keys(PARTS.client.items).flatMap(client => Object.keys(PARTS.provider.items).flatMap(provider =>
  Object.keys(PARTS.model.items).map(model => ({ client, provider, model })))).filter(s => !invalid(s));
const OK_SETS = STACKS.map(s => CASES.reduce((m, c, i) => m | (c.judge(s)[0] === 'ok' ? 1 << i : 0), 0));
function fewestStacks() {
  const all = (1 << CASES.length) - 1;
  let reach = new Set([0]);
  for (let k = 1; k <= CASES.length; k++) {
    const next = new Set();
    for (const m of reach) for (const o of OK_SETS) next.add(m | o);
    if (next.has(all)) return k;
    reach = next;
  }
  return null;
}

class UnbundlingB extends Explorable {
  static prediction = {
    question: 'Now that the layers mix freely, five people bring five needs: privacy, no budget, no internet, local knowledge, hard reasoning. Will one well-chosen stack serve them all?',
    options: [
      { label: 'Yes: find the best stack and keep it', correct: false,
        feedback: 'A small open-weight model on your laptop covers privacy, cost, offline use and even local notes. But it is the weakest choice for hard reasoning, and the big models cannot fly with you. Needs pull in different directions.' },
      { label: 'No: different needs call for different stacks', correct: true,
        feedback: 'One default can cover several needs, but here no single stack covers all five: being offline and needing a big model pull apart. Unbundling is what lets you keep a default and still have alternatives.' },
    ],
    after: 'You staff the help desk. Estimate first, then build a stack that fully works for each person.',
  };

  static literacies = {
    read: 'You read five people’s needs and the reason each stack does or does not meet them.',
    write: 'You assemble a client, provider and model for each person and hand it over.',
    count: 'Before you start, you estimate the fewest different stacks that could serve all five, then compare.',
  };

  static css = `
    .queue { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.6rem; }
    .queue button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    .queue button[data-solved]::after { content: " \\2713"; color: var(--lit-good); }
    .ask { margin: 0 0 0.6rem; }
    .ask strong { display: block; }
    fieldset { border: 1px solid var(--lit-border); border-radius: var(--lit-radius); margin: 0 0 0.5rem; padding: 0.4rem 0.7rem 0.55rem; }
    legend { font-weight: 600; font-size: 0.85rem; padding: 0 0.25rem; }
    fieldset label { display: flex; gap: 0.45rem; align-items: baseline; padding: 0.15rem 0; cursor: pointer; }
    input[type=radio] { accent-color: var(--lit-work); }
    .result { margin-top: 0.4rem; padding: 0.55rem 0.8rem; border-left: 3px solid var(--lit-border); background: var(--lit-surface); }
    .result[data-s="ok"] { border-color: var(--lit-good); }
    .result[data-s="no"], .result[data-s="bad"] { border-color: var(--lit-bad); }
    .result .tag { font-weight: 650; margin-right: 0.3rem; }
    .result[data-s="ok"] .tag { color: var(--lit-good); }
    .result[data-s="no"] .tag, .result[data-s="bad"] .tag { color: var(--lit-bad); }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.4rem; }
    th, td { text-align: left; padding: 0.3rem 0.4rem; border-bottom: 1px solid var(--lit-border); vertical-align: top; }
    .scroll { overflow-x: auto; }
    .est { margin-bottom: 0.7rem; }
    .est p { margin: 0 0 0.3rem; }
    .est button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
  `;

  mount(root) {
    this.cur = 0;
    this.stacks = CASES.map(() => ({ client: 'app', provider: 'lab', model: 'closed' }));
    this.solved = new Set();
    this.tries = 0;
    this.guess = null;   // estimated fewest distinct stacks, locked at the first hand-over
    this.queue = h('div', { class: 'queue', role: 'group', 'aria-label': 'People at the help desk' },
      ...CASES.map((c, i) => h('button', { type: 'button', onclick: () => { this.cur = i; this.result = null; this.render(); } }, c.who)));
    this.ask = h('p', { class: 'ask', 'aria-live': 'polite' });
    this.form = h('div');
    this.out = h('div', { 'aria-live': 'polite' });
    this.summary = h('div');
    this.est = h('div', { class: 'est card' });
    this.handOver = h('button', { type: 'button', class: 'primary', onclick: () => this.tryIt() }, 'Hand over this stack');
    root.append(this.est, this.queue, this.ask, this.form,
      h('div', { class: 'row' }, this.handOver),
      this.out, this.summary);
    this.render();
  }

  tryIt() {
    if (this.guess == null) return;
    const s = this.stacks[this.cur];
    this.tries++;
    const bad = invalid(s);
    const [status, why] = bad ? ['bad', bad] : CASES[this.cur].judge(s);
    this.result = { status, why };
    if (status === 'ok') this.solved.add(this.cur);
    this.render();
    if (this.solved.size === CASES.length) {
      this.complete('In this scenario one default stack can serve most of these people but not all five; being able to swap a layer is what kept the rest from being stuck with one bundle.');
    } else {
      this.progress(this.solved.size, CASES.length, `${this.solved.size} of ${CASES.length} people helped.`);
    }
  }

  // Fewest distinct stacks that fully work for everyone (2 under these rules).
  static FEWEST = fewestStacks();

  renderEstimate() {
    const locked = this.tries > 0, done = this.solved.size === CASES.length;
    const fewest = this.constructor.FEWEST;
    const handed = new Set([...this.solved].map(i => Object.values(this.stacks[i]).join('|'))).size;
    this.est.replaceChildren(
      h('p', {}, h('strong', {}, 'Estimate: '), 'what is the fewest number of different stacks that could fully serve all five people?'),
      h('div', { class: 'row', role: 'group', 'aria-label': 'Your estimate' },
        ...[1, 2, 3, 4, 5].map(n => h('button', { type: 'button', 'aria-pressed': String(this.guess === n), disabled: locked,
          onclick: () => { this.guess = n; this.render(); } }, String(n)))),
      done ? h('p', { style: { marginTop: '0.4rem' } },
        `You estimated ${this.guess}; the fewest is ${fewest}, and you handed out ${handed}. `,
        'Only your laptop works offline, and in this scenario it cannot run a large model, so the hard budget needs a second stack. Several of the others could share either one.')
        : h('p', { class: 'muted', style: { marginTop: '0.3rem', fontSize: '0.85rem' } },
          locked ? 'Locked in. Checked when everyone is helped.' : 'Pick a number to open the help desk.'));
    this.handOver.disabled = this.guess == null;
  }

  // Editing a handed-over stack un-solves it: the table only lists tested stacks.
  // Updates in place, so the radio being changed keeps keyboard focus.
  edited() {
    const was = this.solved.delete(this.cur);
    this.out.replaceChildren(was ? h('div', { class: 'result' }, 'Changed since you handed it over. Hand it over again to re-check.') : '');
    if (!was) return;
    this.renderEstimate();
    this.renderQueue();
    this.renderSummary();
    this.progress(this.solved.size, CASES.length, `${this.solved.size} of ${CASES.length} people helped.`);
  }

  renderQueue() {
    [...this.queue.children].forEach((b, i) => {
      b.setAttribute('aria-pressed', String(i === this.cur));
      b.toggleAttribute('data-solved', this.solved.has(i));
    });
  }

  render() {
    this.renderEstimate();
    this.renderQueue();
    const c = CASES[this.cur], s = this.stacks[this.cur];
    this.ask.replaceChildren(h('strong', {}, c.who), c.need);
    this.form.replaceChildren(...Object.entries(PARTS).map(([key, part]) =>
      h('fieldset', {}, h('legend', {}, part.label),
        ...Object.entries(part.items).map(([v, label]) => h('label', {},
          h('input', { type: 'radio', name: `${key}`, value: v, checked: s[key] === v,
            onchange: () => { s[key] = v; this.result = null; this.edited(); } }),
          label)))));
    const r = this.result;
    const tags = { ok: 'Works.', catch: 'Works, with a catch.', no: 'Does not meet the need.', bad: 'Will not run.' };
    this.out.replaceChildren(r ? h('div', { class: 'result', 'data-s': r.status },
      h('span', { class: 'tag' }, tags[r.status]), r.why,
      r.status === 'catch' ? ' Try another layer.' : null) : '');
    this.renderSummary();
  }

  // Once a few are solved, show the stacks side by side so the divergence is visible.
  renderSummary() {
    if (this.solved.size >= 2) {
      const short = (k, v) => PARTS[k].items[v].replace(/\s*\(.*\)|, .*$/, '');
      const rows = [...this.solved].sort().map(i => h('tr', {},
        h('th', { scope: 'row' }, CASES[i].who),
        ...['client', 'provider', 'model'].map(k => h('td', {}, short(k, this.stacks[i][k])))));
      const distinct = new Set([...this.solved].map(i => Object.values(this.stacks[i]).join('|'))).size;
      this.summary.replaceChildren(h('h3', { style: { fontSize: '0.95rem', margin: '0.9rem 0 0.2rem' } },
        `Stacks you handed out (${distinct} different)`),
        h('div', { class: 'scroll' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Person'), h('th', {}, 'Client'), h('th', {}, 'Provider'), h('th', {}, 'Model'))),
          h('tbody', {}, rows))),
        h('p', { class: 'muted', style: { fontSize: '0.8rem' } }, 'Rules and outcomes are simplified for teaching; real plans and products vary.'));
    } else this.summary.replaceChildren();
  }
}

customElements.define('x-unbundling-b', UnbundlingB);
