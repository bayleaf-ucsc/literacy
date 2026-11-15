// Retention, spin A: an instrument. One message's data path, six hops, under
// three provider settings (ordinary, ZDR, ZOA), a client-history switch and a
// time scrubber. The learner reads every hop and watches which copies stay
// readable, by whom, and for how long. Retention and access are separate axes:
// ZOA (an access property) implies ZDR (a retention property), not the reverse.
import { Explorable, h } from '../js/kit.js';

const HOPS = [
  ['device', 'Your device'],
  ['client', 'Client app'],
  ['gateway', 'Provider gateway'],
  ['host', 'Model host'],
  ['logs', 'Logs'],
  ['train', 'Training pipeline'],
];

const SETTINGS = [
  ['ordinary', 'Ordinary', 'The provider handles plain text and keeps copies under its own terms. Content is already kept.'],
  ['zdr', 'ZDR', 'A promise, backed by contract and configuration. The provider still handles plain text, so a policy change or a logging build could start keeping it.'],
  ['zoa', 'ZOA', 'Architecture, shown here as one implementation: content is decrypted only inside attested hardware. Attestation proves which code runs, not that the code is private. A build that logs would measure differently, so a client that checks against code it has approved would refuse to send to it.'],
];

const TIMES = [['while answering', 0], ['1 day later', 1], ['1 week later', 7], ['1 year later', 365]];

const BADGE = {
  yours: 'your copy', keeps: 'keeps content', maybe: 'may keep, by terms', sees: 'reads in flight', meta: 'metadata only',
  cipher: 'ciphertext only', enclave: 'sealed enclave', none: 'nothing',
};

// Each hop: s (state), keep (days a readable copy lasts), text (what happens there).
function path(setting, history) {
  const device = { s: 'yours', keep: Infinity, text: setting === 'zoa'
    ? 'Before sending, your client checks an attestation (a hardware-signed proof of what code the enclave runs) against code it has approved, and encrypts your message to that enclave. Your own copy stays with you.'
    : 'Your message sits in your browser or app. You control this copy, as does anyone with your unlocked device.' };
  const clientKeeps = { s: 'keeps', keep: Infinity };
  const P = {
    ordinary: {
      client: history
        ? { ...clientKeeps, text: 'The client saves your conversation on its servers, unencrypted, so you can come back to it. Whoever administers that database can read it, until you delete it. (Some clients encrypt history with a key only you hold; this one does not.)' }
        : { s: 'sees', keep: 0, text: 'This client keeps no history: it passes your message along in plain text and forgets it.' },
      gateway: { s: 'sees', keep: 0, text: 'The provider\'s front door receives your message in plain text, scans it (abuse filters) and counts tokens for billing.' },
      host: { s: 'sees', keep: 0, text: 'GPUs compute on your message in plain text. Staff with access to these machines could, in principle, inspect it.' },
      logs: { s: 'keeps', keep: 30, text: 'A copy of prompt and reply is logged, here for 30 days of abuse review (an illustrative window; some terms keep longer). Retained data can leak, be subpoenaed, or be read by staff.' },
      train: { s: 'maybe', keep: Infinity, text: 'Depending on the terms and your settings, the conversation may become training data, or may not, so this hop is not counted as a definite copy. If it is used, a copy may sit in a training corpus and the model\'s weights are shaped by it; someone recovering your exact words from the weights is a different, rarer thing. Either way you would be an unintended contributor to someone else\'s next model.' },
    },
    zdr: {
      client: history
        ? { ...clientKeeps, text: 'ZDR binds the provider, not the client. This client still saves your history unencrypted, so its administrator can read it. BayLeaf Chat works this way: ZDR at the inference layer only.' }
        : { s: 'sees', keep: 0, text: 'This client passes your message on in plain text without saving it.' },
      gateway: { s: 'sees', keep: 0, text: 'Still receives plain text, and may still scan it as it passes. Keeps only metadata: model, token counts, timestamps.' },
      host: { s: 'sees', keep: 0, text: 'Still computes on plain text. ZDR is about storage, not about who can see your message while it is being answered.' },
      logs: { s: 'meta', keep: 0, text: 'Metadata only. No prompt or completion content is written down, so stored content cannot leak later. The metadata itself (which model, when, how many tokens, often which account) is kept, and can be sensitive.' },
      train: { s: 'none', keep: 0, text: 'No content was kept, so there is no stored copy to train on.' },
    },
    zoa: {
      client: history
        ? { ...clientKeeps, text: 'This client decrypts your history and stores it readably, so the ZOA boundary stops here: whoever runs this client\'s database can read this copy. (A client could instead store history encrypted with a key only you hold; this one does not.)' }
        : { s: 'cipher', keep: 0, text: 'The client encrypted on your device and keeps nothing server-side, so it only ever relays ciphertext.' },
      gateway: { s: 'cipher', keep: 0, text: 'Carries ciphertext it cannot decrypt (BayLeaf Sealed works this way). It can still see metadata such as size and timing.' },
      host: { s: 'enclave', keep: 0, text: 'Decrypts only inside the attested enclave. The operator has no technical means to read memory there, as far as the hardware\'s guarantees hold.' },
      logs: { s: 'meta', keep: 0, text: 'Nothing readable to log: the operator never held the plain text. Metadata such as size and timing is still visible and can be kept.' },
      train: { s: 'none', keep: 0, text: 'Nothing to train on.' },
    },
  };
  return { device, ...P[setting] };
}

const readableAt = (hop, days) => (hop.s === 'sees' && days === 0) || (hop.s === 'keeps' && hop.keep >= days);
// Conditional copies (training, if the terms allow it) are shown apart, never counted as definite.
const maybeAt = hop => hop.s === 'maybe';

// The hops whose story changes under each non-ordinary setting: reading them is part of the work.
const CHANGED = { zdr: ['logs', 'train'], zoa: ['gateway', 'host'] };
const CHANGED_TOTAL = Object.values(CHANGED).flat().length;

// The estimate: ordinary setting, history on, one week later.
const WEEK_COUNT = HOPS.filter(([id]) => id !== 'device' && readableAt(path('ordinary', true)[id], 7)).length;

// The privacy notice the learner composes, for ZDR providers plus saved history.
const NOTICE = [
  { id: 'a', options: [
    ['keep no copy of', null],
    ['never see', 'ZDR providers still receive and compute on plain text. They keep no copy; they do see it in flight.'],
    ['cannot read', 'Only a ZOA design removes the means to read. ZDR is about what is kept.'],
  ] },
  { id: 'b', options: [
    ['our administrator can read your saved history', null],
    ['nobody can read your saved history', 'The client keeps that history in plain text, and whoever runs its database can read it.'],
    ['your saved history falls under the same promise', 'ZDR binds the providers, not the client. The history sits outside it.'],
  ] },
];

class RetentionA extends Explorable {
  static literacies = {
    read: 'Read what happens to one message at each of six hops, then at the hops that change under ZDR and ZOA.',
    write: 'Compose an honest one-sentence privacy notice for a service with ZDR providers and saved history.',
    count: 'Estimate how many hops still hold a readable copy a week later, then scrub time and count them.',
  };

  static prediction = {
    question: 'A model provider promises zero data retention (ZDR). While the model is answering your message, could the provider\'s staff read it?',
    options: [
      { label: 'No: ZDR means nobody sees it', correct: false,
        feedback: 'ZDR is a retention promise: nothing is stored. Your message still arrives in plain text and is computed on in plain text, so the provider could scan it in flight, or quietly start keeping it.' },
      { label: 'Yes: it still passes through their systems readably', correct: true,
        feedback: 'ZDR is about what is kept, not what is seen. Only zero operator access (ZOA) designs remove the operator\'s means to read content in flight.' },
    ],
    after: 'Follow one message through six hops. Make one estimate, read every hop, read the hops marked "changed" under ZDR and ZOA, scrub time forward, flip the client\'s history, then write the notice.',
  };

  static css = `
    .seg { display: inline-flex; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); overflow: hidden; }
    .seg button { border: 0; border-radius: 0; }
    .seg button + button { border-left: 1px solid var(--lit-border); }
    .seg button[aria-pressed=true] { background: var(--lit-work); color: var(--lit-bg); font-weight: 600; }
    .flow { display: grid; gap: 0.4rem; grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr)); margin: 0.75rem 0; }
    .hop { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; text-align: left; padding: 0.45rem 0.55rem; position: relative; }
    .hop .n { font-size: 0.75rem; color: var(--lit-muted); }
    .hop .name { font-weight: 600; line-height: 1.2; }
    .hop .badge { font-size: 0.75rem; }
    .hop[data-s=keeps] .badge { color: var(--lit-bad); font-weight: 600; }
    .hop[data-s=sees] .badge, .hop[data-s=maybe] .badge { color: var(--lit-argue); }
    .hop[data-s=meta] .badge, .hop[data-s=cipher] .badge, .hop[data-s=enclave] .badge, .hop[data-s=none] .badge { color: var(--lit-good); }
    .hop.hot { background: var(--lit-argue-tint); border-color: var(--lit-argue); }
    .hop[aria-pressed=true] { outline: 2px solid var(--lit-work); outline-offset: 1px; }
    .hop .seen { position: absolute; top: 0.3rem; right: 0.4rem; font-size: 0.7rem; color: var(--lit-muted); }
    .detail { min-height: 4.5rem; }
    .detail h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .readout { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); margin-top: 0.75rem; }
    .readout .card p { margin: 0.2rem 0 0; }
    label.check { display: inline-flex; gap: 0.4rem; align-items: center; cursor: pointer; }
    .controls { display: grid; gap: 0.6rem; }
    .timeLabel { font-weight: 600; }
    .est button { min-width: 2.2rem; }
    .notice { margin-top: 0.75rem; }
    .notice select { margin: 0.15rem 0.1rem; padding: 0.2rem; border: 1px solid var(--lit-border); border-radius: 4px; background: var(--lit-bg); max-width: 100%; }
    .notice .ok { color: var(--lit-good); font-weight: 600; }
    .notice .no { color: var(--lit-bad); font-weight: 600; }
  `;

  mount(root) {
    this.setting = 'ordinary';
    this.history = true;
    this.t = 0;
    this.sel = null;
    this.read = new Set();
    this.readChanged = new Set();
    this.seenSettings = new Set(['ordinary']);
    this.movedTime = false;
    this.flippedHistory = false;
    this.guess = null;
    this.noticeOk = false;

    this.segBtns = SETTINGS.map(([id, label]) => h('button', { type: 'button', onclick: () => this.setSetting(id) }, label));
    const histBox = h('input', { type: 'checkbox', checked: true, onchange: e => { this.history = e.target.checked; this.flippedHistory = true; this.update(); } });
    this.timeIn = h('input', { type: 'range', min: 0, max: TIMES.length - 1, step: 1, value: 0, disabled: true, 'aria-label': 'Time since you sent the message',
      oninput: e => { this.t = +e.target.value; if (this.t >= 2) this.movedTime = true; this.update(); } });
    this.timeLabel = h('span', { class: 'timeLabel' });

    this.hopBtns = HOPS.map(([id, name], i) => h('button', { type: 'button', class: 'hop', onclick: () => this.pick(id) },
      h('span', { class: 'n' }, `hop ${i + 1}`), h('span', { class: 'name' }, name), h('span', { class: 'badge' }), h('span', { class: 'seen' })));
    this.detail = h('div', { class: 'card detail', 'aria-live': 'polite' });
    this.copies = h('div', { class: 'card' });
    this.rule = h('div', { class: 'card' });
    this.est = h('div', { class: 'card est', 'aria-live': 'polite' });
    this.notice = h('div', { class: 'card notice' });

    root.append(
      this.est,
      h('div', { class: 'controls', style: { marginTop: '0.6rem' } },
        h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Provider setting:'), h('div', { class: 'seg', role: 'group', 'aria-label': 'Provider setting' }, this.segBtns)),
        h('label', { class: 'check' }, histBox, 'The client app saves your conversation history'),
        h('div', {}, h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Time since sending:'), this.timeLabel), this.timeIn)),
      h('div', { class: 'flow', role: 'group', 'aria-label': 'Data path, one button per hop' }, this.hopBtns),
      this.detail,
      h('div', { class: 'readout' }, this.copies, this.rule),
      this.notice,
      h('p', { class: 'muted', style: { fontSize: '0.8rem', margin: '0.5rem 0 0' } }, 'Simplified and illustrative: real retention windows and settings vary by provider and product.'),
    );
    this.renderEst();
    this.renderNotice();
    this.update();
  }

  renderEst() {
    if (this.guess == null) {
      this.est.replaceChildren(
        h('div', {}, h('strong', {}, 'Estimate first: '), 'ordinary setting, history on. One week after you send, how many of the five hops beyond your device definitely still hold a readable copy?'),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Your estimate', style: { marginTop: '0.4rem' } },
          [0, 1, 2, 3, 4, 5].map(n => h('button', { type: 'button', onclick: () => { this.guess = n; this.timeIn.disabled = false; this.renderEst(); this.update(); } }, String(n)))));
      return;
    }
    const off = Math.abs(this.guess - WEEK_COUNT);
    this.est.replaceChildren(h('div', {}, `You estimated ${this.guess}. Actual: `, h('strong', {}, String(WEEK_COUNT)),
      ` definite (client history, logs), plus the training pipeline as a possible third, depending on terms and settings. ${off ? `Off by ${off}.` : 'Spot on.'} `,
      h('span', { class: 'muted' }, 'Scrub to a week on Ordinary to watch the two in-flight hops go quiet.')));
  }

  renderNotice() {
    const sels = NOTICE.map(({ id, options }) => h('select', { 'aria-label': `Notice blank ${id === 'a' ? 1 : 2}` },
      h('option', { value: '' }, 'choose...'), options.map(([text], k) => h('option', { value: String(k) }, text))));
    const msg = h('div', { 'aria-live': 'polite', style: { marginTop: '0.4rem' } });
    const check = () => {
      if (sels.some(s => !s.value)) { msg.replaceChildren('Fill both blanks.'); return; }
      const errs = sels.map((s, i) => NOTICE[i].options[+s.value][1]).filter(Boolean);
      if (errs.length) { msg.replaceChildren(h('span', { class: 'no' }, 'Not honest yet. '), errs.join(' ')); return; }
      this.noticeOk = true;
      sels.forEach(s => { s.disabled = true; });
      btn.disabled = true;
      msg.replaceChildren(h('span', { class: 'ok' }, 'Honest. '), 'This is close to how BayLeaf Chat has to describe itself: ZDR at the inference layer only, history the administrator can read. A fuller notice would also say the providers see your messages in flight.');
      this.update();
    };
    const btn = h('button', { type: 'button', class: 'primary', onclick: check }, 'Publish notice');
    this.notice.replaceChildren(
      h('div', {}, h('strong', {}, 'Write the notice. '), 'A chat service uses ZDR model providers and saves conversation history. Complete its one-line privacy notice so it is true.'),
      h('p', { style: { margin: '0.4rem 0 0' } }, '"Our model providers ', sels[0], ' your messages (they keep only metadata, such as timestamps and token counts), and ', sels[1], '."'),
      h('div', { class: 'row', style: { marginTop: '0.4rem' } }, btn), msg);
  }

  setSetting(id) { this.setting = id; this.seenSettings.add(id); this.update(); }
  pick(id) {
    this.sel = id; this.read.add(id);
    if (CHANGED[this.setting]?.includes(id)) this.readChanged.add(`${this.setting}:${id}`);
    this.update();
  }

  update() {
    const p = path(this.setting, this.history);
    const [tLabel, days] = TIMES[this.t];
    this.segBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(SETTINGS[i][0] === this.setting)));
    this.timeLabel.textContent = tLabel;
    this.timeIn.setAttribute('aria-valuetext', tLabel);

    const hot = [], maybe = [];
    HOPS.forEach(([id, name], i) => {
      const hop = p[id], b = this.hopBtns[i];
      const isHot = id !== 'device' && readableAt(hop, days);
      if (isHot) hot.push(name);
      if (maybeAt(hop)) maybe.push(name);
      const changed = CHANGED[this.setting]?.includes(id);
      b.dataset.s = hop.s;
      b.classList.toggle('hot', isHot);
      b.setAttribute('aria-pressed', String(this.sel === id));
      b.querySelector('.badge').textContent = BADGE[hop.s] + (isHot ? ', readable now' : '');
      b.querySelector('.seen').textContent = changed && !this.readChanged.has(`${this.setting}:${id}`) ? 'changed'
        : this.read.has(id) ? 'read' : '';
    });

    if (this.sel) {
      const name = HOPS.find(([id]) => id === this.sel)[1];
      this.detail.replaceChildren(h('h3', {}, `${name}, ${SETTINGS.find(s => s[0] === this.setting)[1]}`), h('p', { style: { margin: 0 } }, p[this.sel].text));
    } else {
      this.detail.replaceChildren(h('p', { class: 'muted', style: { margin: 0 } }, 'Select a hop to see what happens to your message there.'));
    }

    this.copies.replaceChildren(
      h('strong', {}, `Readable by someone else, ${tLabel}: `), h('span', { class: 'big', style: { display: 'block' } }, String(hot.length)),
      h('p', { class: 'muted' }, hot.length ? hot.join(', ') : 'No hop beyond your device holds readable content.'),
      maybe.length ? h('p', { class: 'muted' }, `Possibly also: ${maybe.join(', ')} (only if the terms and your settings allow training).`) : '');
    this.rule.replaceChildren(
      h('strong', {}, 'What stops this from changing tomorrow?'),
      h('p', {}, SETTINGS.find(s => s[0] === this.setting)[2]),
      this.setting !== 'ordinary' && this.history ? h('p', { class: 'muted' }, 'Except the client\'s saved history, which sits outside the provider\'s promise.') : '');

    const done = this.read.size + this.seenSettings.size + this.readChanged.size + (this.movedTime ? 1 : 0) + (this.flippedHistory ? 1 : 0)
      + (this.guess == null ? 0 : 1) + (this.noticeOk ? 1 : 0);
    const total = HOPS.length + SETTINGS.length + CHANGED_TOTAL + 4;
    const todo = [];
    if (this.guess == null) todo.push('make the estimate');
    if (this.read.size < HOPS.length) todo.push(`read ${HOPS.length - this.read.size} more hop${HOPS.length - this.read.size > 1 ? 's' : ''}`);
    if (this.seenSettings.size < 3) todo.push('try every setting');
    for (const [s, ids] of Object.entries(CHANGED)) {
      const left = ids.filter(id => !this.readChanged.has(`${s}:${id}`)).length;
      if (left) todo.push(`under ${SETTINGS.find(x => x[0] === s)[1]}, read ${left} hop${left > 1 ? 's' : ''} marked "changed"`);
    }
    if (!this.movedTime) todo.push('scrub to a week or later');
    if (!this.flippedHistory) todo.push('flip client history');
    if (!this.noticeOk) todo.push('write the notice');
    if (done >= total) {
      this.complete('In this model, ZDR empties the stored content copies (not the metadata) but not the in-flight ones; the attested enclave removes the operator\'s means to read in flight, as far as the hardware and the approved code hold; possible training depends on terms; and a client that saves unencrypted history keeps a readable copy outside both.');
    } else {
      this.progress(done, total, `${done} of ${total}: ${todo.join(', ')}.`);
    }
  }
}

customElements.define('x-retention-a', RetentionA);
