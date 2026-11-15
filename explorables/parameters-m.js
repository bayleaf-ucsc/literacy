// Parameters, merged spin: estimate, then instrument, then puzzle. The learner
// first guesses how much training text, in page equivalents, a phone-sized model
// would see, then gets the instrument (device memory, bits per parameter, tokens
// per parameter, a chain down to pages and a bookshelf) and uses it as the tool for
// a shelving challenge: put six models on the smallest device that holds them, at
// two precisions. Rough rule throughout: memory = parameters × bits ÷ 8, plus an
// assumed 20% working room. Real overhead depends on the OS, other apps and context
// length, and is labeled as an assumption in the UI. Every number is a sketch.
import { Explorable, h } from '../js/kit.js';

const DEVICES = [
  { id: 'phone', label: 'Phone', gb: 4 },
  { id: 'laptop', label: 'Laptop', gb: 16 },
  { id: 'workstation', label: 'Workstation', gb: 64 },
  { id: 'server', label: 'Server', gb: 1000 },
];
const BINS = [...DEVICES, { id: 'none', label: 'None of these devices', gb: Infinity }];
const MODELS = [
  { id: '2B', b: 2 }, { id: '8B', b: 8 }, { id: '27B', b: 27 },
  { id: '70B', b: 70 }, { id: '400B', b: 400 }, { id: '2T', b: 2000 },
];
const ROOM = 1.2;           // weights plus an assumed 20% working room (not universal)
const ROUNDS = 2;           // solve the shelf at two precisions
const GB_LO = 1, GB_HI = 2000;
const R_LO = 20, R_HI = 1000;
const WORDS_PER_TOKEN = 0.75;
const WORDS_PER_PAGE = 1000;
const PAGES_PER_BOOK = 300;

// The estimate: a 4 GB phone at 4 bits, trained at 20 tokens per parameter.
const fitParams = (gb, bits) => gb * 1e9 / ROOM / (bits / 8);
const pagesFor = (params, ratio) => params * ratio * WORDS_PER_TOKEN / WORDS_PER_PAGE;
const ANSWER = pagesFor(fitParams(4, 4), 20); // about 100 million pages
const G_LO = 3, G_STEPS = 36;                // guess slider: 10^3 to 10^12 in quarter decades

const toPos = (v, lo, hi) => Math.round(1000 * Math.log(v / lo) / Math.log(hi / lo));
const fromPos = (p, lo, hi) => lo * Math.pow(hi / lo, p / 1000);
const nice = x => Number(x.toPrecision(2));
const rough = x => {
  for (const [v, s] of [[1e15, ' quadrillion'], [1e12, ' trillion'], [1e9, ' billion'], [1e6, ' million'], [1e3, ' thousand']])
    if (x >= v) return `${nice(x / v)}${s}`;
  return String(nice(x));
};
const gbText = gb => gb >= 1000 ? `${nice(gb / 1000)} TB` : `${gb < 10 ? nice(gb) : Math.round(gb)} GB`;
const needGB = (m, bits) => m.b * bits / 8 * ROOM;
const home = (m, bits) => BINS.find(d => d.gb >= needGB(m, bits)).id;

class ParametersM extends Explorable {
  static prediction = {
    question: 'A 70-billion-parameter model stored at 4 bits per parameter, plus some working room. What is the smallest device that can hold it?',
    options: [
      { label: 'A 64 GB workstation', correct: true, feedback: '4 bits is half a byte, so 70 billion parameters take about 35 GB. Assume roughly 20% more for the system and the context and you need about 42 GB: a workstation holds it. Holding it is the first question; speed comes next.' },
      { label: 'Only a data-center server', feedback: 'That is true at 16 bits (2 bytes each, 140 GB of weights). At 4 bits each parameter is half a byte, so the weights are about 35 GB, and with an assumed 20% working room about 42 GB: a 64 GB workstation holds it.' },
    ],
    after: 'First a guess about how much text a small model is trained on, then a tool, then a shelf to sort with it.',
  };

  static literacies = {
    read: 'Read the chain from memory to parameters to pages, and each model\'s size, to judge where it can live.',
    write: 'Compose a shelf: place six models on devices and revise it when the precision changes.',
    count: 'Guess how much training text a phone-sized model would see, in page equivalents, before the instrument reveals it.',
  };

  static css = `
    section + section { margin-top: 0.75rem; }
    h3 { margin: 0 0 0.4rem; font-size: 1rem; }
    .ctl { margin-bottom: 0.9rem; }
    .ctl label { display: flex; justify-content: space-between; gap: 0.5rem; font-weight: 600; }
    .ctl label .num { font-weight: 400; }
    .notches button, .seg button { padding: 0.2rem 0.55rem; font-size: 0.85rem; }
    .seg button[aria-pressed=true], .notches button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .chain { display: grid; grid-template-columns: auto 1fr; gap: 0.15rem 0.75rem; margin: 0.25rem 0 0.5rem; }
    .chain dt { color: var(--lit-muted); }
    .chain dd { margin: 0; font-variant-numeric: tabular-nums; }
    .chain dd small { color: var(--lit-muted); }
    .shelf { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 2px; min-height: 3.2rem; padding: 0.3rem 0.3rem 0; border-bottom: 4px solid var(--lit-border); }
    .spine { width: 7px; border-radius: 1px 1px 0 0; }
    .small { font-size: 0.85rem; }
    .tray { min-height: 2.6rem; margin: 0.5rem 0; padding: 0.4rem; border: 1px dashed var(--lit-border); border-radius: var(--lit-radius); }
    .chip { font-family: var(--lit-font-mono); font-weight: 600; padding: 0.2rem 0.55rem; background: var(--lit-teach-tint); }
    .chip[aria-pressed=true] { outline: 3px solid var(--lit-work); outline-offset: 1px; }
    .chip.right { border-color: var(--lit-good); background: var(--lit-work-tint); }
    .chip.wrong { border-color: var(--lit-bad); border-style: dashed; }
    .chip small { font-family: var(--lit-font-ui); font-weight: 400; color: var(--lit-muted); margin-left: 0.3rem; }
    .bins { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); }
    .bin { border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.4rem; background: var(--lit-bg); min-height: 4.5rem; }
    .bin > button.place { width: 100%; text-align: left; border-style: dashed; display: flex; justify-content: space-between; gap: 0.4rem; }
    .bin.armed > button.place { border-color: var(--lit-work); border-style: solid; background: var(--lit-work-tint); }
    .bin .chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
    .msg { min-height: 1.5rem; margin: 0.5rem 0 0; }
    .msg.bad { color: var(--lit-bad); }
    .msg.good { color: var(--lit-good); font-weight: 600; }
  `;

  mount(root) {
    this.gb = 4; this.bits = 4; this.ratio = 20;
    this.guessPos = 12; this.guessed = false;
    this.solved = new Set(); this.place = {}; this.selected = null; this.checked = false;

    // 1. Count: estimate before the reveal.
    this.guessVal = h('span', { class: 'num' });
    this.guess = h('input', { type: 'range', min: 0, max: G_STEPS, step: 1, value: this.guessPos, 'aria-label': 'Your guess, pages, log scale',
      oninput: () => { this.guessPos = +this.guess.value; this.showGuess(); } });
    this.lockBtn = h('button', { type: 'button', class: 'primary', onclick: () => this.lock() }, 'Lock in my guess');
    this.reveal = h('p', { class: 'msg', 'aria-live': 'polite' });

    // 2. The instrument.
    this.memVal = h('span', { class: 'num' });
    this.mem = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Device memory, log scale', oninput: () => this.setMem(fromPos(+this.mem.value, GB_LO, GB_HI), true) });
    this.devBtns = DEVICES.map(d => h('button', { type: 'button', onclick: () => this.setMem(d.gb) }, `${d.label} ${gbText(d.gb)}`));
    this.bitBtns = [4, 8, 16].map(b => h('button', { type: 'button', onclick: () => this.setBits(b) }, `${b}-bit`));
    this.ratioVal = h('span', { class: 'num' });
    this.rat = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Training tokens per parameter, log scale', oninput: () => this.setRatio(fromPos(+this.rat.value, R_LO, R_HI)) });
    this.out = { params: h('dd'), tokens: h('dd'), words: h('dd'), pages: h('dd') };
    this.shelf = h('div', { class: 'shelf', role: 'img' });
    this.shelfNote = h('p', { class: 'muted small', style: 'margin:0.3rem 0 0' });

    // 3. The challenge, solved with the instrument.
    this.tray = h('div', { class: 'tray row', 'aria-label': 'Models not yet shelved' });
    this.bins = BINS.map(d => {
      const chips = h('div', { class: 'chips' });
      const btn = h('button', { type: 'button', class: 'place', onclick: () => this.drop(d.id) },
        h('strong', {}, d.label), h('span', { class: 'muted num' }, d.gb === Infinity ? 'over 1 TB' : gbText(d.gb)));
      return { d, chips, btn, el: h('div', { class: 'bin' }, btn, chips) };
    });
    this.checkBtn = h('button', { type: 'button', class: 'primary', onclick: () => this.check() }, 'Check');
    this.bitsNote = h('span', { class: 'muted small' });
    this.msg = h('p', { class: 'msg', 'aria-live': 'polite' });

    this.tool = h('div', { hidden: true },
      h('section', { class: 'card' },
        h('h3', {}, 'The instrument'),
        h('div', { class: 'ctl' }, h('label', {}, 'Device memory', this.memVal), this.mem,
          h('div', { class: 'row notches', role: 'group', 'aria-label': 'Device presets' }, this.devBtns)),
        h('div', { class: 'ctl' }, h('label', {}, 'Bits per parameter', h('span', { class: 'num muted' }, 'fewer bits, more parameters')),
          h('div', { class: 'row seg', role: 'group', 'aria-label': 'Precision' }, this.bitBtns)),
        h('div', { class: 'ctl' }, h('label', {}, 'Training tokens per parameter', this.ratioVal), this.rat,
          h('div', { class: 'row muted', style: 'justify-content:space-between;font-size:0.8rem' }, h('span', {}, '20x: rule of thumb'), h('span', {}, '1000x: far past it'))),
        h('dl', { class: 'chain' },
          h('dt', {}, 'Largest model'), this.out.params,
          h('dt', {}, 'Training tokens'), this.out.tokens,
          h('dt', {}, 'Words'), this.out.words,
          h('dt', {}, 'Page equivalents'), this.out.pages),
        this.shelf, this.shelfNote),
      h('section', { class: 'card' },
        h('h3', {}, 'Challenge: shelve six models'),
        h('p', { style: 'margin:0' }, 'Put each model on the ', h('strong', {}, 'smallest'), ' device that holds it. Pick a model, then a device. Use the instrument to size each device; its bits setting is the shelf\'s precision. Solve at two precisions. Fits are rough weight-loading estimates under the 20% assumption, not proof a model runs fast enough there.'),
        this.tray,
        h('div', { class: 'bins' }, this.bins.map(b => b.el)),
        h('div', { class: 'row', style: 'margin-top:0.5rem' }, this.checkBtn, this.bitsNote),
        this.msg));

    root.append(
      h('section', { class: 'card' },
        h('h3', {}, 'Estimate first'),
        h('p', { style: 'margin:0 0 0.5rem' }, 'Fill a 4 GB phone with the largest model it holds at 4 bits per parameter (assuming 20% of memory goes to working room), trained at 20 tokens per parameter. How much training text is that, in 1,000-word page equivalents? Repeats count; this is text seen, not distinct books or what the model can recall.'),
        h('div', { class: 'ctl', style: 'margin-bottom:0.5rem' }, h('label', {}, 'Your guess', this.guessVal), this.guess),
        this.lockBtn, this.reveal),
      this.tool);
    this.showGuess();
    this.setMem(this.gb); this.setRatio(this.ratio);
    this.render();
  }

  guessValue() { return Math.pow(10, G_LO + this.guessPos / 4); }

  showGuess() {
    this.guessVal.textContent = `about ${rough(this.guessValue())} pages`;
    this.guess.setAttribute('aria-valuetext', this.guessVal.textContent);
  }

  lock() {
    const g = this.guessValue(), f = ANSWER / g;
    this.guessed = true; this.guess.disabled = true; this.lockBtn.disabled = true;
    const off = f >= 1 ? f : 1 / f;
    const verdict = off < 3 ? 'Close: within a factor of 3.'
      : `You were about ${rough(off)} times too ${f > 1 ? 'low' : 'high'}.`;
    this.reveal.textContent = `Rough answer under these assumptions: about ${rough(ANSWER)} page equivalents of training text (4 GB ÷ 1.2 assumed working room ÷ half a byte = about 6.7 billion parameters, × 20 tokens × 0.75 words ÷ 1,000). ${verdict} A real phone often leaves less memory free than this assumes. The instrument below starts on that phone.`;
    this.reveal.className = `msg ${off < 3 ? 'good' : ''}`;
    this.tool.hidden = false;
    this.report();
    this.mem.focus();
  }

  setMem(gb, fromSlider = false) {
    const near = DEVICES.find(d => Math.abs(toPos(d.gb, GB_LO, GB_HI) - toPos(gb, GB_LO, GB_HI)) <= 12);
    if (near) gb = near.gb;
    else if (fromSlider) gb = gb < 10 ? nice(gb) : Math.round(gb);
    this.gb = gb;
    if (!fromSlider || near) this.mem.value = toPos(gb, GB_LO, GB_HI);
    this.update();
  }

  setBits(b) {
    if (b === this.bits) return;
    this.bits = b; this.checked = false; this.selected = null;
    if (this.tool && !this.tool.hidden && Object.keys(this.place).length) {
      this.say(this.solved.has(b) ? `Already solved at ${b}-bit.` : `Now ${b}-bit: every model is half or double its size. Your shelf stays; move what no longer belongs and check.`);
    }
    this.update(); this.render();
  }

  setRatio(r) {
    this.ratio = Math.abs(r - R_LO) < 1.5 ? R_LO : nice(r);
    this.rat.value = toPos(this.ratio, R_LO, R_HI);
    this.update();
  }

  update() {
    if (!this.out) return;
    const params = fitParams(this.gb, this.bits);
    const tokens = params * this.ratio;
    const words = tokens * WORDS_PER_TOKEN;
    const pages = words / WORDS_PER_PAGE;
    const dev = DEVICES.find(d => d.gb === this.gb);
    this.memVal.textContent = dev ? `${gbText(this.gb)} (${dev.label.toLowerCase()})` : gbText(this.gb);
    this.mem.setAttribute('aria-valuetext', this.memVal.textContent);
    this.devBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(DEVICES[i].gb === this.gb)));
    this.bitBtns.forEach((b, i) => b.setAttribute('aria-pressed', String([4, 8, 16][i] === this.bits)));
    this.ratioVal.textContent = `${this.ratio}x`;
    this.rat.setAttribute('aria-valuetext', `${this.ratio} tokens per parameter`);
    const bytes = this.bits / 8;
    this.out.params.replaceChildren(`about ${rough(params)} parameters `, h('small', {}, `(${gbText(this.gb)} ÷ 1.2 assumed working room ÷ ${bytes} byte${bytes === 1 ? '' : 's'})`));
    this.out.tokens.replaceChildren(`about ${rough(tokens)} `, h('small', {}, `(× ${this.ratio})`));
    this.out.words.replaceChildren(`about ${rough(words)} `, h('small', {}, '(× 0.75)'));
    this.out.pages.replaceChildren(h('strong', {}, `about ${rough(pages)}`), ' ', h('small', {}, '(÷ 1,000, rough)'));
    this.drawShelf(pages / PAGES_PER_BOOK);
  }

  drawShelf(books) {
    // One spine stands for a power of ten of books, so 10 to 100 spines show.
    let unit = 1;
    while (books / unit > 100) unit *= 10;
    const n = Math.max(1, Math.round(books / unit));
    const tones = ['var(--lit-work)', 'var(--lit-teach)', 'var(--lit-argue)', 'var(--lit-muted)'];
    this.shelf.replaceChildren(...Array.from({ length: n }, (_, i) =>
      h('span', { class: 'spine', style: { height: `${2 + ((i * 7) % 5) * 0.25}rem`, background: tones[(i * 5) % 4] } })));
    this.shelf.setAttribute('aria-label', `${n} spines, each standing for ${rough(unit)} books of 300 pages, about ${rough(books)} book equivalents of training text in all (rough, repeats counted)`);
    this.shelfNote.textContent = `Each spine = ${rough(unit)} books of 300 pages; about ${rough(books)} book equivalents of training text in all (rough). Repeats count, so these are not distinct books, and not what the model can recall.`;
  }

  pick(id) {
    this.selected = this.selected === id ? null : id;
    this.checked = false;
    this.say(this.selected ? `${id} selected. Choose a device.` : '');
    this.render();
    this.root.querySelector(`[data-model="${id}"]`)?.focus();
  }

  drop(deviceId) {
    if (!this.selected) { this.say('Pick a model first.'); return; }
    const id = this.selected;
    this.place[id] = deviceId; this.selected = null; this.checked = false;
    this.say(`${id} shelved on ${BINS.find(d => d.id === deviceId).label}.`);
    this.render();
    (this.tray.querySelector('button') || this.checkBtn).focus();
  }

  check() {
    this.checked = true;
    const wrong = MODELS.filter(m => this.place[m.id] !== home(m, this.bits));
    if (wrong.length) {
      this.say(`${MODELS.length - wrong.length} of ${MODELS.length} right at ${this.bits}-bit. The misplaced ones now show what they need.`, 'bad');
    } else {
      this.solved.add(this.bits);
      this.say(this.solved.size < ROUNDS
        ? `Solved at ${this.bits}-bit. Switch bits in the instrument and fix the shelf.`
        : `Solved at ${[...this.solved].sort((a, b) => a - b).map(b => `${b}-bit`).join(' and ')}.`, 'good');
    }
    this.render();
  }

  say(text, tone = '') { this.msg.textContent = text; this.msg.className = `msg ${tone}`; }

  chip(m) {
    const placed = this.place[m.id];
    const verdict = this.checked && placed ? (placed === home(m, this.bits) ? 'right' : 'wrong') : '';
    const need = `~${gbText(needGB(m, this.bits))}`;
    return h('button', {
      type: 'button', class: `chip ${verdict}`, 'data-model': m.id, 'aria-pressed': String(this.selected === m.id),
      'aria-label': `${m.id} model${verdict ? `, ${verdict}` : ''}${verdict === 'wrong' ? `, needs about ${gbText(needGB(m, this.bits))}` : ''}`,
      onclick: () => this.pick(m.id),
    }, m.id, verdict === 'wrong' ? h('small', {}, need) : null);
  }

  render() {
    const unplaced = MODELS.filter(m => !this.place[m.id]);
    this.tray.replaceChildren(...(unplaced.length ? unplaced.map(m => this.chip(m)) : [h('span', { class: 'muted' }, 'All shelved.')]));
    for (const b of this.bins) {
      b.el.classList.toggle('armed', !!this.selected);
      b.chips.replaceChildren(...MODELS.filter(m => this.place[m.id] === b.d.id).map(m => this.chip(m)));
      b.btn.setAttribute('aria-label', `Shelve on ${b.d.label}${b.d.gb === Infinity ? '' : `, ${gbText(b.d.gb)}`}`);
    }
    this.checkBtn.disabled = unplaced.length > 0;
    this.bitsNote.textContent = `Shelving at ${this.bits}-bit. Solved: ${this.solved.size} of ${ROUNDS}${this.solved.size ? ` (${[...this.solved].map(b => `${b}-bit`).join(', ')})` : ''}.`;
    this.report();
  }

  report() {
    if (!this.bitsNote) return;
    const placed = MODELS.length - MODELS.filter(m => !this.place[m.id]).length;
    const done = (this.guessed ? 1 : 0) + this.solved.size;
    const total = 1 + ROUNDS;
    if (done === total) {
      this.complete('Under these assumptions, a model sized to fill a phone\'s memory implies training text on the order of a hundred million page equivalents (repeats counted, not distinct books or what it can recall); halving the bits per parameter can move a model down a whole device, and the largest here fit none of these four. Fitting in memory is only the first question: speed, licensing, and who helps you run it come next.');
    } else {
      this.progress(done, total, this.guessed
        ? `Estimate made; ${placed} of ${MODELS.length} shelved at ${this.bits}-bit; ${this.solved.size} of ${ROUNDS} precisions solved.`
        : 'Make your estimate to unlock the instrument.');
    }
  }
}

customElements.define('x-parameters-m', ParametersM);
