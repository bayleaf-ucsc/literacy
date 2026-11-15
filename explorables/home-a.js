// Home, spin A: an instrument. Pick a device's memory, a precision and a
// model size; see whether the model fits in a browser tab, on your machine's
// localhost server, or only on BayLeaf's Sealed lane, and which trust root
// that route sits under (after Pouch's three: BayLeaf, your browser, your
// machine). Memory rule of thumb: parameters × bits ÷ 8 bytes, plus about 20%
// for context and runtime. Device budgets and speeds are rough illustrations.
import { Explorable, h } from '../js/kit.js';

const DEVICES = [
  { gb: 4, label: 'older phone', bw: 30 },
  { gb: 8, label: 'phone', bw: 60 },
  { gb: 16, label: 'laptop', bw: 100 },
  { gb: 32, label: 'bigger laptop', bw: 200 },
  { gb: 64, label: 'workstation', bw: 400 },
  { gb: 128, label: 'big workstation', bw: 550 },
];
const MODELS = [1, 3, 8, 14, 32, 70, 120, 400, 1000]; // billions of parameters
const BITS = [4, 8, 16];
const OVERHEAD = 1.2;

const need = (b, bits) => b * bits / 8 * OVERHEAD; // GB
// Rough: a page's graphics code gets a fraction of memory, capped; a local
// server can use most of it, leaving room for the OS and your other apps.
const browserBudget = gb => Math.min(gb * 0.25, 4);
const machineBudget = gb => gb * 0.7;
const nice = x => Number(x.toPrecision(2));
const sizeText = b => b >= 1000 ? `${b / 1000}T` : `${b}B`;

const ROOTS = [
  { id: 'browser', root: 'Your browser', provider: 'Transformers.js in the page',
    text: 'The model runs inside this tab on your graphics chip (WebGPU). The prompt can stay on your device if the page’s code keeps it there. You trust the browser, its extensions, your operating system and the page code it loaded this time (a reload can bring different code); Pouch ships a strict content policy that limits where that code can connect.' },
  { id: 'machine', root: 'Your machine', provider: 'Localhost: oMLX, Ollama, LM Studio',
    text: 'A server app on your computer answers at localhost with the same kind of API cloud providers offer. You trust your operating system and the server you installed. It sends prompts wherever it is configured to: whether it logs or forwards them is your choice and your responsibility.' },
  { id: 'bayleaf', root: 'BayLeaf', provider: 'BayLeaf Sealed (Tinfoil enclaves)',
    text: 'For models too big for your device. The page encrypts your request to an attested Tinfoil enclave, so BayLeaf carries ciphertext it cannot read. You trust BayLeaf’s page code and the enclave attestation, not an operator’s good intentions, on top of your own browser and device.' },
];

class HomeA extends Explorable {
  static prediction = {
    question: 'You have an ordinary 16 GB laptop. Can it run an 8-billion-parameter model itself, with no cloud involved?',
    options: [
      { label: 'Yes: at 4 bits it needs about 5 GB', correct: true, feedback: 'Right. 8 billion parameters × 4 bits ÷ 8 = 4 GB of weights, plus some room for context, about 5 GB. That leaves plenty for the operating system and your other apps.' },
      { label: 'No: models like that need data-center hardware', feedback: 'Training them does. Running one is another matter: 8 billion × 4 bits ÷ 8 = 4 GB of weights, about 5 GB with context, which an ordinary laptop holds comfortably. The arithmetic from Act I applies.' },
    ],
    after: 'Now try other devices and models. Pouch is experimental, and every budget and speed here is a rough rule of thumb.',
  };

  static literacies = {
    read: 'You interpret a fit table and a route, and read what each trust root asks you to trust.',
    write: 'You name your own trust roots: the device and software you would actually run a model on.',
    count: 'You estimate a 70B model’s memory at 4-bit before the table shows it, then see how close you came.',
  };

  static css = `
    .ctl { margin-bottom: 0.75rem; }
    .ctl label { display: flex; justify-content: space-between; gap: 0.5rem; font-weight: 600; }
    .ctl label .num { font-weight: 400; }
    .ctl input[type=range] { margin: 0.25rem 0 0; }
    .seg button { padding: 0.2rem 0.6rem; font-size: 0.85rem; }
    .seg button[aria-pressed=true], tr[data-selected=true] button { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin: 0.25rem 0 0.75rem; }
    th, td { text-align: left; padding: 0.2rem 0.35rem; border-bottom: 1px solid var(--lit-border); white-space: nowrap; }
    th { font-weight: 600; color: var(--lit-muted); }
    td button { padding: 0.1rem 0.5rem; min-width: 3.2rem; }
    .fit { color: var(--lit-good); }
    .nofit { color: var(--lit-muted); }
    .route { margin-bottom: 0.75rem; }
    .roots { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); }
    .rootbox { border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.5rem 0.65rem; background: var(--lit-surface); }
    .rootbox[data-active] { border-color: var(--lit-work); box-shadow: inset 0 0 0 1px var(--lit-work); background: var(--lit-work-tint); }
    .rootbox h4 { margin: 0; font-size: 0.95rem; }
    .rootbox .prov { font-size: 0.82rem; color: var(--lit-muted); }
    .rootbox button { margin-top: 0.35rem; font-size: 0.82rem; padding: 0.15rem 0.5rem; }
    .rootbox p { margin: 0.4rem 0 0; font-size: 0.85rem; }
    .you { text-align: center; font-size: 0.85rem; color: var(--lit-muted); margin: 0.6rem 0 0.35rem; }
    .goals { font-size: 0.88rem; margin-top: 0.6rem; }
    .ask { margin-bottom: 0.75rem; font-size: 0.92rem; }
    .ask label { display: block; margin-bottom: 0.35rem; }
    .ask input[type=text] { flex: 1 1 8rem; min-width: 0; padding: 0.3rem 0.5rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
    .ask .out { margin: 0.4rem 0 0; }
    .ask .out:empty { display: none; }
    .mine { margin-top: 0.75rem; }
  `;

  mount(root) {
    this.dev = 2; this.bits = 4; this.model = 8;
    this.seenRoutes = new Set();
    this.read = new Set();
    this.triedBits = false;

    this.devOut = h('span', { class: 'num' });
    this.devInput = h('input', { type: 'range', min: 0, max: DEVICES.length - 1, step: 1, value: this.dev, 'aria-label': 'Device memory',
      oninput: () => { this.dev = +this.devInput.value; this.update(true); } });
    this.bitBtns = BITS.map(b => h('button', { type: 'button', onclick: () => { this.bits = b; this.triedBits ||= b !== 4; this.update(true); } }, `${b}-bit`));
    this.rows = MODELS.map(b => {
      const btn = h('button', { type: 'button', onclick: () => { this.model = b; this.update(true); } }, sizeText(b));
      const needTd = h('td', { class: 'num' }), tabTd = h('td'), hostTd = h('td');
      return { b, btn, needTd, tabTd, hostTd, tr: h('tr', {}, h('td', {}, btn), needTd, tabTd, hostTd) };
    });
    this.tbody = h('tbody', {}, this.rows.map(r => r.tr));
    this.route = h('div', { class: 'card route', 'aria-live': 'polite' });
    this.boxes = ROOTS.map(r => {
      const p = h('p', { hidden: true }, r.text);
      const btn = h('button', { type: 'button', 'aria-expanded': 'false', onclick: () => {
        const open = p.hidden; p.hidden = !open; btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Hide' : 'What do you trust?';
        if (open) { this.read.add(r.id); this.update(true, false); }
      } }, 'What do you trust?');
      const el = h('div', { class: 'rootbox' }, h('h4', {}, r.root), h('div', { class: 'prov' }, r.provider), btn, p);
      return { id: r.id, el };
    });
    this.goals = h('p', { class: 'goals muted' });

    // Count: extend the prediction's arithmetic to a bigger model before the table reveals it.
    this.guessed = false;
    this.guessIn = h('input', { type: 'text', inputmode: 'decimal', id: 'gb', autocomplete: 'off', placeholder: 'GB',
      onkeydown: e => { if (e.key === 'Enter') this.checkGuess(); } });
    this.guessOut = h('p', { class: 'out', 'aria-live': 'polite' });
    const guessBox = h('div', { class: 'card ask' },
      h('label', { for: 'gb' }, h('strong', {}, 'Estimate first: '), 'how many GB does a 70B model need at 4-bit?'),
      h('div', { class: 'row' }, this.guessIn, h('button', { type: 'button', onclick: () => this.checkGuess() }, 'Show the table')),
      this.guessOut);
    // Write: the learner's own trust roots.
    this.named = false;
    this.mineIn = h('input', { type: 'text', id: 'mine', autocomplete: 'off', placeholder: 'e.g. which device, which app',
      oninput: () => { const ok = this.mineIn.value.trim().split(/\s+/).filter(Boolean).length >= 3; if (ok !== this.named) { this.named = ok; this.update(true, false); } } });
    const mineBox = h('div', { class: 'card ask mine' },
      h('label', { for: 'mine' }, h('strong', {}, 'Name your own trust roots: '), 'what device and software would you run a model on, and so have to trust?'),
      h('div', { class: 'row' }, this.mineIn));

    root.append(
      guessBox,
      h('div', { class: 'ctl' }, h('label', {}, h('span', {}, 'Device memory'), this.devOut), this.devInput),
      h('div', { class: 'row seg ctl', role: 'group', 'aria-label': 'Precision' }, h('span', {}, 'Precision:'), ...this.bitBtns),
      h('div', { style: 'overflow-x:auto' }, h('table', {},
        h('caption', { class: 'muted', style: 'text-align:left;font-size:.85rem' }, 'Pick a model. Memory = parameters × bits ÷ 8, plus ~20% for context.'),
        h('thead', {}, h('tr', {}, h('th', {}, 'Model'), h('th', {}, 'Needs'), h('th', {}, 'In a tab'), h('th', {}, 'Localhost'))),
        this.tbody)),
      this.route,
      h('div', { class: 'you' }, 'You choose a provider; each adds a root to trust, and your device and browser sit under all of them'),
      h('div', { class: 'roots' }, this.boxes.map(b => b.el)),
      mineBox,
      this.goals,
    );
    this.update(false);
  }

  checkGuess() {
    const g = parseFloat(this.guessIn.value.replace(/[^\d.]/g, ''));
    if (!(g > 0)) { this.guessOut.textContent = 'Enter a number of gigabytes, such as 20.'; return; }
    const n = need(70, 4), off = Math.max(g / n, n / g);
    this.guessOut.replaceChildren(
      h('strong', {}, `About ${nice(n)} GB: `), `70 billion × 4 bits ÷ 8 = 35 GB of weights, plus ~20%. `,
      `You said ${nice(g)} GB, ${off < 1.25 ? 'close.' : `off by a factor of about ${nice(off)}.`} `,
      h('span', { class: 'muted' }, 'More than a 32 GB laptop can spare.'));
    this.guessed = true;
    this.update(true, false);
  }

  routeFor(b) {
    const gb = DEVICES[this.dev].gb, n = need(b, this.bits);
    if (n <= browserBudget(gb)) return 'browser';
    if (n <= machineBudget(gb)) return 'machine';
    return 'bayleaf';
  }

  update(user, moved = user) {
    const d = DEVICES[this.dev];
    this.devOut.textContent = `${d.gb} GB (${d.label})`;
    this.devInput.setAttribute('aria-valuetext', `${d.gb} GB, ${d.label}`);
    this.bitBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(BITS[i] === this.bits)));

    this.rows.forEach(({ b, tr, btn, needTd, tabTd, hostTd }) => {
      const n = need(b, this.bits);
      const cell = (td, ok) => { td.className = ok ? 'fit' : 'nofit'; td.textContent = ok ? 'fits' : 'too big'; };
      tr.setAttribute('data-selected', String(b === this.model));
      btn.setAttribute('aria-pressed', String(b === this.model));
      needTd.textContent = this.guessed ? `${nice(n)} GB` : '?';
      cell(tabTd, n <= browserBudget(d.gb));
      cell(hostTd, n <= machineBudget(d.gb));
    });

    const route = this.routeFor(this.model);
    if (moved) this.seenRoutes.add(route);
    const r = ROOTS.find(x => x.id === route);
    const n = need(this.model, this.bits);
    const speed = route === 'bayleaf' ? 'speed set by the data-center hardware'
      : `roughly ${Math.max(1, Math.round(d.bw * 0.7 / (this.model * this.bits / 8)))} tokens per second on this device`;
    const why = route === 'browser' ? `It fits within the roughly ${nice(browserBudget(d.gb))} GB a page can use here.`
      : route === 'machine' ? `Too big for a tab (about ${nice(browserBudget(d.gb))} GB), but within the roughly ${nice(machineBudget(d.gb))} GB a local server can use.`
      : `More than this device can hold (about ${nice(machineBudget(d.gb))} GB to spare), so it would go to BayLeaf Sealed, if Sealed offers a model that size. Or try a smaller model: it may be enough for the task.`;
    this.route.replaceChildren(
      h('div', {}, h('strong', {}, `${sizeText(this.model)} at ${this.bits}-bit ${this.guessed ? `needs about ${nice(n)} GB` : 'needs ? GB (estimate above)'}. `), why),
      h('div', { style: 'margin-top:.3rem' }, 'Route: ', h('strong', {}, r.provider), `, under ${r.id === 'bayleaf' ? r.root : r.root.toLowerCase()}; ${speed}.`),
      h('small', { class: 'muted' }, 'This checker picks the nearest route that fits, by memory alone; it does not check runtime support or speed. In Pouch you choose the provider yourself.'));
    this.boxes.forEach(bx => bx.el.toggleAttribute('data-active', bx.id === route));

    const done = this.seenRoutes.size + this.read.size + (this.triedBits ? 1 : 0) + (this.guessed ? 1 : 0) + (this.named ? 1 : 0);
    const total = 9;
    this.goals.textContent = `${this.guessed ? 'Estimated.' : 'Estimate the 70B memory.'} Routes reached: ${this.seenRoutes.size} of 3. Trust roots read: ${this.read.size} of 3. ${this.triedBits ? 'Tried another precision.' : 'Try another precision.'} ${this.named ? 'Named your roots.' : 'Name your own roots.'}`;
    if (done === total) {
      this.complete('By this rough memory check, a model that fits can run on your own device, though you still trust the page or server software you run it with; for what does not fit, a smaller model may be enough, or you can choose a provider built so it cannot read you.');
    } else if (user) {
      this.progress(done, total, this.goals.textContent);
    }
  }
}

customElements.define('x-home-a', HomeA);
