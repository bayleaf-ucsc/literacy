// Home, spin B: a story. Move one request, step by step, from a vendor's
// chat app toward a model running in your own browser tab. At each stop a
// ledger shows who can read, what it costs, what model you get and who keeps
// it running; before moving on, the learner names the trade the step made.
// The learner can stop at any stop, saying why it is enough for them; then a
// classmate wants to use their setup, and they decide whether to share it and
// draft what they would owe them. Prices and model sizes are illustrative;
// Pouch is experimental.
import { Explorable, h } from '../js/kit.js';

const ROWS = [['read', 'Who can read it'], ['cost', 'What it costs you'], ['model', 'What model you get'], ['upkeep', 'Who keeps it running']];

const SERVE_LAPTOP = { label: 'Serve your laptop’s model to them', text: 'You are now their provider. If your server logs prompts, you can read theirs, and whether it does is your decision. Your laptop has to stay on and reachable, and if you switch models, they get switched. This is operating a platform at its smallest scale.' };

const STOPS = [
  { name: 'A vendor’s chat app', where: 'their cloud',
    read: 'The vendor’s systems and, under its policies, its staff. Chats may be kept and, depending on settings, used for training.',
    cost: '$0 to about $20 a month (illustrative), plus your data.',
    model: 'Frontier models, fast. Their choice: they can swap the model or change the terms at any time.',
    upkeep: 'Theirs, entirely.',
    endings: [
      { label: 'Tell them how to sign up', text: 'They make their own account. The vendor is their provider, under terms neither of you set, and you operate nothing.' },
      { label: 'Let them use your account', text: 'They would see your chat history and you theirs, under one set of terms, and most services forbid it. Lending an account is not the same as providing a service.' },
    ] },
  { name: 'A ZDR API, through a client you pick', where: 'a provider’s cloud',
    read: 'Processed in passing; the provider contracts not to keep or train on it. A contract, not a lock, and request metadata is still kept.',
    cost: 'Pay per token: cents per task (illustrative).',
    model: 'Many of the same frontier models, and you choose which one. Features, tools and versions can differ from the vendor’s own app.',
    upkeep: 'Mostly theirs; you choose and configure the client.',
    delta: { read: 'gained', cost: 'changed', model: 'gained', upkeep: 'more on you' },
    q: { options: [
      { label: 'A no-retention contract and your own choice of model, for a per-token bill', correct: true, feedback: 'Yes. Similar models, but now under a zero-data-retention contract, through a client and with a model you chose. You pay for what you use.' },
      { label: 'A weaker model, in exchange for privacy', feedback: 'Not necessarily. The API serves many of the same frontier models as the app. What changed is the contract (no retention) and who picks the client and the model.' },
    ] },
    endings: [
      { label: 'Help them set up their own key', text: 'They pick a client and pay their own per-token bill. Their settings, and whatever their client logs, are theirs.' },
      { label: 'Run a client for them on your key', text: 'You pay for their tokens, and whatever your client logs about their prompts is yours to read. You now decide which model they get, and when it changes.' },
    ] },
  { name: 'BayLeaf Sealed', where: 'an attested Tinfoil enclave, relayed by BayLeaf',
    read: 'Encrypted in your page to the enclave. BayLeaf relays ciphertext it cannot read; you check the enclave’s attestation instead of trusting a promise. You still trust BayLeaf’s page code, your browser and your device.',
    cost: 'Covered for campus users in this setup (illustrative); someone still pays for the chips.',
    model: 'Large open-weight models only: the ones the enclave provider hosts.',
    upkeep: 'BayLeaf and Tinfoil.',
    delta: { read: 'gained', cost: 'changed', model: 'gave up', upkeep: 'same' },
    q: { options: [
      { label: 'A promise became a lock: BayLeaf carries what it cannot open', correct: true, feedback: 'Yes. The request is encrypted to the enclave before it leaves your page. You trust BayLeaf’s page code and the attestation, not anyone’s restraint. The price: only the open-weight models the enclave hosts.' },
      { label: 'Campus now reads your prompts instead of the vendor', feedback: 'Sealed is built so BayLeaf cannot read: the page encrypts the request to an attested enclave, and BayLeaf only relays ciphertext. That is the point of the step.' },
    ] },
    endings: [
      { label: 'Point them to Sealed', text: 'If they are eligible, they use it the same way you do, and BayLeaf relays ciphertext for them too. You operate nothing; BayLeaf and Tinfoil do.' },
      { label: 'Let them use your sign-in', text: 'Their requests would arrive as yours, under your eligibility and limits. Encryption still keeps BayLeaf from reading them, but you now answer for their use.' },
    ] },
  { name: 'A localhost server on your laptop', where: 'your machine (oMLX, Ollama, LM Studio)',
    read: 'You, your operating system and other software on your machine. Nobody else, unless the server logs it or forwards it: a localhost server sends prompts wherever it is configured to.',
    cost: 'Electricity, and a laptop you already own.',
    est: true,
    model: 'Whatever fits your memory: roughly 8B to 30B on a 16 to 64 GB laptop. Slower. It changes when you update it.',
    upkeep: 'Yours: install the server, download weights, update, keep the laptop awake.',
    delta: { read: 'depends', cost: 'gained', model: 'gave up', upkeep: 'more on you' },
    q: { options: [
      { label: 'You gave up the biggest models and took on the upkeep', correct: true, feedback: 'Yes. Your prompts can stay on your machine if the server is set up that way, and the model changes only when you update it. In return the model is what your memory holds, and keeping it running is your job. Whether that beats an attested enclave depends on whom you are guarding against.' },
      { label: 'The model’s maker can now see your prompts, since it is their model', feedback: 'Weights are a file of numbers; they do not phone home. What could leak is whatever your server software logs or sends, and checking that is now your job.' },
    ] },
    endings: [
      { label: 'Help them set up their own server', text: 'They install a server on their own machine, if it is up to it. You share a recipe, not a service: you operate nothing for them.' },
      SERVE_LAPTOP,
    ] },
  { name: 'In your browser tab', where: 'this page, on your graphics chip (Transformers.js, WebGPU)',
    read: 'If the page is written to keep it local: you, your browser, its extensions and your operating system. The page’s code can change when you reload it; Pouch’s content policy limits where the loaded code can connect.',
    cost: 'Battery, and a one-time model download.',
    model: 'Small models, roughly 1B to 4B, chosen by the page. Fine for short, focused tasks.',
    upkeep: 'Nearly none for you: open the tab. Whoever publishes the page maintains it, and can change it.',
    delta: { read: 'depends', cost: 'same', model: 'gave up', upkeep: 'gained' },
    q: { options: [
      { label: 'Nothing to install, but only small models fit in a tab', correct: true, feedback: 'Yes. No install at all, and the tab’s small memory share you met in the checker is the price. You also trust whoever serves the page, each time it loads.' },
      { label: 'A browser model is more capable, because it is newer', feedback: 'Newness is not size. As the checker showed, a tab gets only part of your device’s memory: good for short tasks, not the hardest ones.' },
    ] },
    endings: [
      { label: 'Send them the page', text: 'They open it and run their own copy in their own browser. You operate nothing for them, but the page’s publisher still decides what code loads each time it opens, and their device has to be up to it.' },
      SERVE_LAPTOP,
    ] },
];

const CHECKS = ['who could read their prompts', 'which model they get, and who can change it', 'what happens if it changes or stops'];
const words = s => s.trim().split(/\s+/).filter(Boolean).length;

class HomeB extends Explorable {
  static prediction = {
    question: 'The checker showed what fits on your device and whom each route trusts. If you move a request from a vendor’s app toward your own browser tab, is every step a pure gain?',
    options: [
      { label: 'No: each step trades something, such as model size, money or upkeep, for control', correct: true, feedback: 'Right. Control tends to rise as you move home, but the biggest models drop away and keeping things running becomes your job. Some steps cost more money, some less. The ledger at each stop shows the trade.' },
      { label: 'Yes: once a model fits, running it yourself is better on every count', feedback: 'Better on some counts, not every count. Fitting is the floor: what fits is smaller than the frontier, and the upkeep is now yours. The ledger at each stop shows what each step trades.' },
    ],
    after: 'Now move a request toward home one step at a time, and stop wherever it is enough for you. Costs and model sizes are illustrative, and Pouch is experimental.',
  };

  static literacies = {
    read: 'You read a four-row ledger at each stop, name the trade the step made, and decide where to stop.',
    write: 'You write why your stop is enough, then draft the note you would send a classmate who wants to use your setup.',
    count: 'You estimate what an hour of generating on your laptop costs in electricity, then compare it with a monthly subscription.',
  };

  static css = `
    .track { display: flex; flex-wrap: wrap; gap: 0.3rem; list-style: none; padding: 0; margin: 0 0 0.25rem; counter-reset: stop; }
    .track li { flex: 1 1 5.5rem; font-size: 0.78rem; line-height: 1.25; padding: 0.3rem 0.4rem; border-radius: var(--lit-radius); border: 1px solid var(--lit-border); color: var(--lit-muted); }
    .track li[data-state=past] { color: var(--lit-fg); }
    .track li[aria-current=step] { color: var(--lit-fg); border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    .ends { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--lit-muted); margin-bottom: 0.6rem; }
    .stop h3 { margin: 0; font-size: 1.05rem; }
    .stop .where { font-size: 0.85rem; color: var(--lit-muted); margin-bottom: 0.4rem; }
    dl { display: grid; grid-template-columns: minmax(7rem, auto) 1fr; gap: 0.35rem 0.75rem; margin: 0; }
    dt { font-weight: 600; font-size: 0.88rem; }
    dd { margin: 0; font-size: 0.9rem; }
    @media (max-width: 30rem) { dl { grid-template-columns: 1fr; } dd { margin-bottom: 0.3rem; } }
    .tag { display: inline-block; font-size: 0.72rem; padding: 0 0.35rem; margin-left: 0.3rem; border-radius: 3px; border: 1px solid var(--lit-border); color: var(--lit-muted); font-weight: 400; }
    .tag[data-d=gained] { border-color: var(--lit-good); color: var(--lit-good); }
    .tag[data-d="gave up"], .tag[data-d="more on you"] { border-color: var(--lit-argue); color: var(--lit-argue); }
    .q { margin-top: 0.75rem; }
    .q p { margin: 0 0 0.4rem; font-weight: 600; }
    .opts { display: grid; gap: 0.35rem; }
    .opts button { text-align: left; }
    .opts button:disabled { opacity: 1; color: var(--lit-muted); }
    .opts button[data-picked] { border-color: var(--lit-work); background: var(--lit-work-tint); color: var(--lit-fg); }
    .fb { margin-top: 0.4rem; font-size: 0.9rem; }
    .fb b[data-ok=true] { color: var(--lit-good); }
    .fb b[data-ok=false] { color: var(--lit-bad); }
    .nav { margin-top: 0.75rem; }
    .ending { margin-top: 0.9rem; }
    .ending .opts { grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
    .ending h4 { margin: 0.8rem 0 0.3rem; font-size: 0.95rem; }
    .est { margin-top: 0.75rem; font-size: 0.92rem; }
    .est input, textarea { padding: 0.3rem 0.5rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
    .est input { width: 6rem; }
    textarea { width: 100%; font: inherit; color: var(--lit-fg); margin-top: 0.35rem; }
    textarea:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 2px; }
    .checks { display: grid; gap: 0.2rem; margin-top: 0.4rem; font-size: 0.9rem; }
    .checks label { display: flex; gap: 0.4rem; align-items: baseline; }
  `;

  mount(root) {
    this.at = 0;
    this.answers = STOPS.map(() => null); // index of the option picked at each stop
    this.stop = null; // the stop the learner chose to finish at
    this.ending = null;
    this.estimate = null; // cents per hour of generating, the learner's guess
    this.reason = '';
    this.note = '';
    this.ticks = CHECKS.map(() => false);

    this.trackItems = STOPS.map(s => h('li', {}, s.name));
    this.stage = h('div', { class: 'card stop', 'aria-live': 'polite' });
    this.back = h('button', { type: 'button', onclick: () => this.go(this.at - 1) }, 'Back');
    this.next = h('button', { type: 'button', class: 'primary', onclick: () => this.go(this.at + 1) }, 'Move closer to home');
    this.stopBtn = h('button', { type: 'button', onclick: () => this.stopHere() }, 'Stop here: this is enough');
    this.endingBox = h('div', { class: 'ending' });

    root.append(
      h('ol', { class: 'track', 'aria-label': 'From their cloud to your device' }, this.trackItems),
      h('div', { class: 'ends', 'aria-hidden': 'true' }, h('span', {}, 'their cloud'), h('span', {}, 'your device')),
      this.stage,
      h('div', { class: 'row nav' }, this.back, this.next, this.stopBtn),
      this.endingBox,
    );
    this.render();
  }

  go(i) {
    this.at = Math.max(0, Math.min(STOPS.length - 1, i));
    if (this.stop !== this.at) { this.stop = null; this.ending = null; }
    this.render();
    if (!this.next.hidden && !this.next.disabled) this.next.focus();
    else this.stage.querySelector('.est input, .opts button:not(:disabled)')?.focus() || this.stopBtn.focus();
  }

  stopHere() {
    this.stop = this.at;
    this.ending = null;
    this.render();
    this.endingBox.querySelector('textarea')?.focus();
    this.progress(this.answers.filter(a => a != null).length, this.stop + 3, `You stopped at ${STOPS[this.stop].name}. Say why, then answer your classmate.`);
  }

  answer(i, j) {
    this.answers[i] = j;
    this.render();
    const answered = this.answers.filter(a => a != null).length;
    this.progress(answered, STOPS.length - 1, `${answered} trades named. Move on, or stop where it is enough for you.`);
  }

  // Rough: a laptop drawing ~50 W while generating, electricity at ~$0.30 per kWh.
  estimateBox(lead) {
    const actual = 50 / 1000 * 0.30 * 100; // cents per hour
    const input = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Your estimate, in cents per hour',
      onkeydown: e => { if (e.key === 'Enter') lock(); } });
    const lock = () => {
      const g = parseFloat(input.value.replace(/[^\d.]/g, ''));
      if (!(g >= 0)) return;
      this.estimate = g;
      this.render();
      this.finish();
    };
    const body = this.estimate == null
      ? h('div', { class: 'row' }, input, h('span', {}, 'cents'), h('button', { type: 'button', onclick: lock }, 'Check'))
      : h('p', { style: 'margin:.3rem 0 0' }, h('strong', {}, `About ${actual} cents. `),
        `50 W for an hour is 0.05 kWh, times $0.30. You said ${this.estimate}${Math.abs(this.estimate - actual) <= 1 ? ', close' : ''}. `,
        h('span', { class: 'muted' }, `A $20 monthly plan buys about ${Math.round(2000 / actual).toLocaleString()} such hours, though not the same service: it brings bigger models and someone else’s upkeep. The laptop itself is the real cost.`));
    return h('div', { class: 'est' },
      h('div', {}, h('strong', {}, 'Estimate: '), lead || '', 'a laptop draws roughly 50 W while it generates. At about $0.30 per kWh (rough), what does an hour of generating cost?'),
      body);
  }

  render() {
    const s = STOPS[this.at];
    this.trackItems.forEach((li, i) => {
      li.setAttribute('data-state', i < this.at ? 'past' : i === this.at ? 'current' : 'future');
      if (i === this.at) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    const dl = h('dl', {}, ROWS.flatMap(([k, label]) => [
      h('dt', {}, label, s.delta ? h('span', { class: 'tag', 'data-d': s.delta[k] }, s.delta[k]) : null),
      h('dd', {}, s[k]),
    ]));
    let q = null;
    if (s.q) {
      const picked = this.answers[this.at];
      const opts = s.q.options.map((o, j) => h('button', {
        type: 'button', disabled: picked != null, 'data-picked': picked === j,
        onclick: () => this.answer(this.at, j),
      }, o.label));
      const o = picked != null ? s.q.options[picked] : null;
      q = h('div', { class: 'q' },
        h('p', {}, 'What did this step trade?'),
        h('div', { class: 'opts', role: 'group', 'aria-label': 'What did this step trade?' }, opts),
        o ? h('div', { class: 'fb' }, h('b', { 'data-ok': String(!!o.correct) }, o.correct ? 'Yes. ' : 'Not quite. '), o.feedback.replace(/^Yes\. /, '')) : null);
    }
    this.stage.replaceChildren(
      h('h3', {}, `${this.at + 1}. ${s.name}`),
      h('div', { class: 'where' }, `Runs in ${s.where}`),
      dl, ...(s.est ? [this.estimateBox()] : []), ...(q ? [q] : []));
    this.back.disabled = this.at === 0;
    const last = this.at === STOPS.length - 1;
    const blocked = (!!s.q && this.answers[this.at] == null) || (!!s.est && this.estimate == null);
    this.next.hidden = last;
    this.next.disabled = blocked;
    this.stopBtn.disabled = blocked || this.stop === this.at;
    this.stopBtn.textContent = last ? 'Stop here: all the way home' : 'Stop here: this is enough';
    this.renderEnding();
  }

  renderEnding() {
    if (this.stop == null || this.stop !== this.at) { this.endingBox.replaceChildren(); return; }
    const s = STOPS[this.stop];
    const reasonStatus = h('p', { class: 'fb muted', 'aria-live': 'polite' });
    const showReason = () => {
      const n = words(this.reason);
      reasonStatus.textContent = n >= 6 ? 'A reasoned stop. Moving further home is not required, and neither is staying.' : `${n} of at least 6 words.`;
    };
    const reason = h('textarea', { rows: 2, id: 'reason', placeholder: 'For what I do, this keeps ... and I give up ...',
      oninput: () => { this.reason = reason.value; showReason(); this.finish(); } });
    reason.value = this.reason;
    showReason();
    const opts = s.endings.map((e, j) => h('button', {
      type: 'button', 'data-picked': this.ending === j, 'aria-pressed': String(this.ending === j),
      onclick: () => { this.ending = j; this.renderEnding(); this.finish(); },
    }, e.label));
    this.endingBox.replaceChildren(h('div', { class: 'card' },
      h('h3', { style: 'margin:0 0 .3rem;font-size:1.05rem' }, `You stop at: ${s.name}`),
      h('label', { for: 'reason' }, h('strong', {}, 'Why is this stop enough for you, for now? '), 'Name what you keep and what you give up, from the ledger.'),
      reason, reasonStatus,
      this.estimate == null ? this.estimateBox('for comparison with a laptop server further home, ') : null,
      h('h4', {}, 'A classmate asks to use your setup'),
      h('p', { style: 'margin:0 0 .5rem' }, 'What you have works for you. A classmate wants it too. What do you do?'),
      h('div', { class: 'opts', role: 'group', 'aria-label': 'Your choice' }, opts),
      this.ending != null ? [
        h('p', { class: 'fb' }, s.endings[this.ending].text),
        h('p', { class: 'fb muted' }, h('strong', {}, 'The other way: '), s.endings[1 - this.ending].text),
        h('p', { class: 'fb' }, 'People reasonably choose either. Either way, you just made a decision about who runs what, for whom, and what you owe them.'),
        this.noteBox(),
      ] : null));
  }

  noteBox() {
    const status = h('p', { class: 'fb muted', 'aria-live': 'polite' });
    const show = () => {
      const left = CHECKS.filter((_, k) => !this.ticks[k]).length;
      status.textContent = words(this.note) < 5 ? 'Write a few sentences, then review them against the three points.'
        : left ? `Review: ${left} of the three points still unchecked. Revise the note until it says each one.` : 'Your note covers what anyone you share with is owed.';
    };
    const ta = h('textarea', { rows: 3, id: 'note', placeholder: 'Hi! Here is how to use it...',
      oninput: () => { this.note = ta.value; show(); this.finish(); } });
    ta.value = this.note;
    const boxes = CHECKS.map((c, k) => {
      const cb = h('input', { type: 'checkbox', checked: this.ticks[k],
        onchange: () => { this.ticks[k] = cb.checked; show(); this.finish(); } });
      return h('label', {}, cb, `My note says ${c}.`);
    });
    show();
    return h('div', { style: 'margin-top:.6rem' },
      h('label', { for: 'note' }, h('strong', {}, 'Draft the note you would send them. ')),
      ta, h('div', { class: 'checks', role: 'group', 'aria-label': 'Review your note' }, boxes), status);
  }

  finish() {
    if (this.stop == null || this.ending == null || this.estimate == null) return;
    if (this.answers.slice(1, this.stop + 1).some(a => a == null)) return;
    if (words(this.reason) < 6 || words(this.note) < 5 || this.ticks.some(t => !t)) return;
    this.complete('Each step toward home traded capability or convenience for control, and you chose where it was enough. Where you stopped, you said who could read a request, who could change the model and who keeps it running: what anyone you share it with is owed.');
  }
}

customElements.define('x-home-b', HomeB);
