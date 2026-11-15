// Retention, spin B: a story with scenario cards. You are a TA asking for help
// with feedback on a student's personal essay. The same message goes out six
// ways; for each, call who could read it 30 days later, and whether anyone
// besides you could have read it in flight. Cards 4–6 look alike 30 days later
// and differ only in flight: that is the ZDR/ZOA distinction. The student was
// never asked, so the closing note can also ask first, or not send it at all.
import { Explorable, h } from '../js/kit.js';

const READERS = [
  ['you', 'You'],
  ['app', 'Whoever runs the app'],
  ['provider', 'The model provider'],
  ['training', 'Possibly future models, as training data'],
];

// What the TA can honestly tell the student: who else could read it later (by reader ids)...
const TELL = [
  ['only I could read it', []],
  ['I and the app\'s operator could read it', ['app']],
  ['I, the app\'s operator and the model provider could read it, and it might train future models', ['app', 'provider', 'training']],
];
// ...and whether anyone else could read it in flight.
const FLIGHT = [
  ['someone running the service could read it', true],
  ['no one besides me could read it', false],
];
// What the TA does about a message that is not theirs. The cards assumed it was sent.
const ROUTES = [
  ['ask', 'ask the student first'],
  ['deid', 'remove names and family details, then use a setup'],
  ['none', 'not put the essay into any AI tool'],
  ['used', 'tell the student afterwards (they were not asked)'],
];

const CASES = [
  {
    title: 'A free chatbot, default settings',
    setup: 'A consumer chatbot from a company that trains its own models. History is on. Its terms (illustrative) say chats may be used to improve models unless you opt out. You didn\'t.',
    later: ['you', 'app', 'provider', 'training'], flight: true,
    why: {
      you: 'History is on, so the chat is in your sidebar.',
      app: 'The company runs the app and stores your history.',
      provider: 'Same company: app and model come as one bundle.',
      training: 'You didn\'t opt out, so the student\'s essay may become training data. That is authorship neither of you intended.',
      flight: 'Plain text the whole way.',
    },
  },
  {
    title: 'A writing app over a ZDR API',
    setup: 'A third-party writing app sends your text to a model provider under a ZDR agreement. The app saves your documents in its own cloud; its terms forbid training on them.',
    later: ['you', 'app'], flight: true,
    why: {
      you: 'The app keeps your document for you.',
      app: 'ZDR binds the provider, not the app. The app\'s database still holds the essay.',
      provider: 'ZDR: processed in memory, only metadata kept.',
      training: 'The provider kept nothing and the app\'s terms forbid it. (Terms can change; stored copies can be re-purposed.)',
      flight: 'Both the app and the provider handled plain text. ZDR is about storage, not sight.',
    },
  },
  {
    title: 'BayLeaf Chat',
    setup: 'chat.bayleaf.dev routes to zero-data-retention model providers and keeps your conversation history so you can return to it from any device.',
    later: ['you', 'app'], flight: true,
    why: {
      you: 'Your history is saved.',
      app: 'The BayLeaf administrator can read the stored history database. Chat is ZDR at the inference layer only.',
      provider: 'Requests go to ZDR endpoints: no prompt or completion kept, only request metadata.',
      training: 'ZDR providers keep nothing to train on.',
      flight: 'The message is plain text on the Chat server and at the provider while it is answered.',
    },
  },
  {
    title: 'BayLeaf API, plaintext lane',
    setup: 'A command-line tool on your laptop calls api.bayleaf.dev, which forwards to ZDR providers. Your tool saves a transcript on your laptop.',
    later: ['you'], flight: true,
    why: {
      you: 'Your own tool saved a transcript locally.',
      app: 'The API stores no prompt or completion content and has request logging off: only metadata such as model, token counts and time.',
      provider: 'ZDR.',
      training: 'Nothing kept anywhere to train on.',
      flight: 'Yes, in principle. This is a strong zero-operator-access posture, not a guarantee: an operator with deploy rights could ship a build that logs, and no attestation would stop it. The provider also computes on plain text.',
    },
  },
  {
    title: 'BayLeaf API, Sealed lane',
    setup: 'The same tool, using Sealed: before sending, it checks the enclave\'s attestation and encrypts the request to that enclave (run by Tinfoil).',
    later: ['you'], flight: false,
    why: {
      you: 'Your own transcript, as before.',
      app: 'BayLeaf carried only ciphertext. It never held a readable copy to keep.',
      provider: 'Decrypted only inside the attested enclave. Attestation shows which code runs there; that this code keeps nothing rests on reviewing it, not on attestation alone.',
      training: 'Nothing kept to train on.',
      flight: 'No, as far as the enclave hardware and attestation hold. BayLeaf relays ciphertext it cannot decrypt, and the enclave\'s operator has no technical means to read inside it.',
    },
  },
  {
    title: 'A small model on your own laptop',
    setup: 'You run an open-weight model locally. Nothing leaves your machine.',
    later: ['you'], flight: false,
    why: {
      you: 'It is on your laptop.',
      app: 'There is no outside app.',
      provider: 'There is no outside provider.',
      training: 'Nobody else received it.',
      flight: 'No one besides you, and whoever else can use your machine. The trust root is your own device.',
    },
  },
];

const FLIGHT_COUNT = CASES.filter(c => c.flight).length;

class RetentionB extends Explorable {
  static literacies = {
    read: 'Read six setups for the same message and judge who could read it later and in flight.',
    write: 'Compose the note to the student: ask first, decline to send it, or disclose both who could read it later and who could read it in flight.',
    count: 'Look over the six setups, guess in how many someone else could read the essay in flight, then check against the table.',
  };

  static prediction = {
    question: 'The BayLeaf API has two lanes. Neither keeps prompt or completion content. Could BayLeaf\'s operator read your message while it passes through?',
    options: [
      { label: 'Plaintext lane: yes, in principle. Sealed lane: no.', correct: true,
        feedback: 'You saw the pattern with ZDR and ZOA. The plaintext lane is a posture: nothing is logged, but an operator with deploy rights could ship a build that logs. Sealed encrypts to an attested enclave, so BayLeaf carries only ciphertext.' },
      { label: 'Neither: nothing is kept, so nobody can read it', correct: false,
        feedback: 'Keeping nothing is about later. The plaintext lane handles readable text in flight, and only an operator\'s choice not to log protects it. Sealed is different: BayLeaf carries ciphertext it cannot decrypt.' },
    ],
    after: 'Now the same distinction on real-world setups, including BayLeaf\'s. Make your call on each card before revealing.',
  };

  static css = `
    .story { margin-top: 0; }
    .steps { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.6rem; }
    .steps button { min-width: 2.2rem; padding: 0.25rem 0.5rem; }
    .steps button[aria-current=step] { border-color: var(--lit-work); box-shadow: inset 0 0 0 1px var(--lit-work); }
    .steps button[data-done] { background: var(--lit-work-tint); }
    .card h3 { margin: 0 0 0.3rem; font-size: 1.05rem; }
    fieldset { border: 0; padding: 0; margin: 0.6rem 0 0; }
    legend { font-weight: 600; padding: 0; margin-bottom: 0.25rem; }
    .opt { display: flex; gap: 0.45rem; align-items: flex-start; padding: 0.15rem 0; cursor: pointer; }
    .opt input { margin-top: 0.3rem; }
    .verdict { margin-top: 0.5rem; padding: 0.4rem 0.6rem; border-radius: var(--lit-radius); background: var(--lit-surface-2); }
    .verdict .mark { font-weight: 700; margin-right: 0.3rem; }
    .verdict[data-ok=true] .mark { color: var(--lit-good); }
    .verdict[data-ok=false] .mark { color: var(--lit-bad); }
    .verdict p { margin: 0.15rem 0 0; }
    .nav { margin-top: 0.75rem; justify-content: space-between; }
    .tablewrap { overflow-x: auto; margin-top: 0.75rem; }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.3rem 0.4rem; border-bottom: 1px solid var(--lit-border); vertical-align: top; }
    td.yes { color: var(--lit-bad); font-weight: 600; }
    td.no { color: var(--lit-good); }
    .guess button { min-width: 2.2rem; }
    .tell { margin-top: 0.75rem; }
    .tell select { margin: 0.15rem 0.1rem; padding: 0.2rem; border: 1px solid var(--lit-border); border-radius: 4px; background: var(--lit-bg); max-width: 100%; }
    .tell .ok { color: var(--lit-good); font-weight: 600; }
    .tell .bad { color: var(--lit-bad); font-weight: 600; }
  `;

  mount(root) {
    this.i = 0;
    this.answers = CASES.map(() => ({ later: new Set(), flight: null, revealed: false }));
    this.guess = null;
    this.told = false;
    this.guessBox = h('div', { class: 'card guess', 'aria-live': 'polite' });
    this.steps = h('div', { class: 'steps', role: 'group', 'aria-label': 'Scenario cards' });
    this.body = h('div');
    this.summary = h('div');
    this.tell = h('div');
    root.append(
      h('p', { class: 'story' }, 'You are a TA with a student\'s personal essay, about their family. You want help drafting kind, specific feedback. The student has not been asked. ', h('span', { class: 'muted' }, 'Before deciding anything, trace where the essay would go: same message, six setups. All scenarios are simplified.')),
      this.guessBox, this.steps, this.body, this.summary, this.tell);
    this.renderGuess();
    this.render();
  }

  renderGuess() {
    if (this.guess == null) {
      this.guessBox.replaceChildren(
        h('div', {}, h('strong', {}, 'Guess first: '), 'in how many of the six setups could someone besides you read the essay while it is being answered?'),
        h('ol', { class: 'muted', style: { margin: '0.3rem 0 0', paddingLeft: '1.4rem', fontSize: '0.85rem' } }, CASES.map(c => h('li', {}, c.title))),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Your guess', style: { marginTop: '0.4rem' } },
          [0, 1, 2, 3, 4, 5, 6].map(n => h('button', { type: 'button', onclick: () => { this.guess = n; this.renderGuess(); this.render(); } }, String(n)))));
      return;
    }
    const done = this.answers.every(a => a.revealed), off = Math.abs(this.guess - FLIGHT_COUNT);
    this.guessBox.replaceChildren(h('div', {}, `Your guess: ${this.guess} of 6. `,
      done ? h('strong', {}, `Actual: ${FLIGHT_COUNT}. ${off ? `Off by ${off}.` : 'Spot on.'}`) : h('span', { class: 'muted' }, 'Checked after the last card.')));
  }

  renderTell() {
    if (!this.answers.every(a => a.revealed) || this.tell.firstChild) return;
    const route = h('select', { 'aria-label': 'What you will do' }, h('option', { value: '' }, 'choose...'), ROUTES.map(([v, t]) => h('option', { value: v }, t)));
    const setup = h('select', { 'aria-label': 'Setup' }, h('option', { value: '' }, 'choose a setup...'), CASES.map((c, i) => h('option', { value: String(i) }, c.title)));
    const who = h('select', { 'aria-label': 'Who could read it a month from now' }, h('option', { value: '' }, 'choose...'), TELL.map(([t], i) => h('option', { value: String(i) }, t)));
    const flight = h('select', { 'aria-label': 'Who could read it in flight' }, h('option', { value: '' }, 'choose...'), FLIGHT.map(([t], i) => h('option', { value: String(i) }, t)));
    const sentence = h('p', { style: { margin: '0.4rem 0 0' } });
    const msg = h('div', { 'aria-live': 'polite', style: { marginTop: '0.4rem' } });
    const disclose = [' A month from now, ', who, '. While it is being answered, ', flight, '.'];
    const compose = () => {
      const r = route.value;
      sentence.replaceChildren(...(
        r === 'ask' ? ['"May I use ', setup, ' to help me draft feedback on your essay?', ...disclose, ' Saying no is fine; I will write the feedback myself."']
        : r === 'deid' ? ['"I removed your name and family details, then used ', setup, ' to help with feedback.', ...disclose, '"']
        : r === 'used' ? ['"I used ', setup, ' to help with feedback on your essay.', ...disclose, '"']
        : r === 'none' ? ['"I did not put your essay into any AI tool. This feedback is mine."']
        : [h('span', { class: 'muted' }, 'Choose what you will do first.')]));
    };
    route.addEventListener('change', compose);
    const btn = h('button', { type: 'button', class: 'primary', onclick: () => {
      const r = route.value;
      if (!r) { msg.replaceChildren('Choose what you will do.'); return; }
      let after;
      if (r === 'none') {
        after = 'Not sending it is a complete answer. No setup on the cards, however private, establishes that the essay was yours to send.';
      } else {
        if (!setup.value || !who.value || !flight.value) { msg.replaceChildren('Fill every blank: the setup, who could read it later, and who could read it in flight.'); return; }
        const c = CASES[+setup.value];
        const truthLater = c.later.filter(x => x !== 'you');
        const saidLater = TELL[+who.value][1];
        const laterOk = truthLater.length === saidLater.length && truthLater.every(x => saidLater.includes(x));
        const flightOk = FLIGHT[+flight.value][1] === c.flight;
        if (!laterOk || !flightOk) {
          const names = truthLater.map(x => READERS.find(y => y[0] === x)[1]).join(', ') || 'only you';
          msg.replaceChildren(h('span', { class: 'bad' }, 'Not accurate for that setup. '),
            `Check its row in the table: readable 30 days later by ${names}; in flight, ${c.flight ? 'yes, someone else could' : 'no one else'}.`);
          return;
        }
        after = {
          ask: 'Accurate, and asked before anything was sent. The student\'s answer, including no, decides.',
          deid: 'Accurate. Removing names helps, but a personal essay about a family can still identify its author, and removing details does not make it yours to share.',
          used: 'Accurate, but this is disclosure after the fact, not consent: the student could not say no.',
        }[r];
        if (!c.flight) after += ' The "no one" in flight holds only as far as the hardware, attestation or your own device hold.';
      }
      this.told = true; route.disabled = setup.disabled = who.disabled = flight.disabled = btn.disabled = true;
      msg.replaceChildren(h('span', { class: 'ok' }, 'Sent. '), after);
      this.renderSummary();
    } }, 'Send note');
    compose();
    this.tell.replaceChildren(h('div', { class: 'card tell' },
      h('div', {}, h('strong', {}, 'Write to the student. '), 'The essay is theirs and they were not asked. Decide what you will do, then write the note. If a setup is involved, say both who could read the essay a month from now and who could read it while it was answered.'),
      h('p', { style: { margin: '0.4rem 0 0' } }, 'I will ', route, '.'),
      sentence,
      h('div', { class: 'row', style: { marginTop: '0.4rem' } }, btn), msg));
  }

  render() {
    this.steps.replaceChildren(...CASES.map((c, i) => h('button', {
      type: 'button', 'aria-current': i === this.i ? 'step' : false, 'data-done': this.answers[i].revealed,
      'aria-label': `Card ${i + 1}: ${c.title}${this.answers[i].revealed ? ' (revealed)' : ''}`,
      onclick: () => { this.i = i; this.render(); },
    }, String(i + 1))));

    if (this.guess == null) {
      this.body.replaceChildren(h('p', { class: 'muted' }, 'Make your guess above to deal the first card.'));
      this.renderSummary();
      return;
    }
    const c = CASES[this.i], a = this.answers[this.i];
    const name = `r${this.i}`;
    const boxes = READERS.map(([id, label]) => {
      const truth = c.later.includes(id), mine = a.later.has(id);
      return h('div', {},
        h('label', { class: 'opt' },
          h('input', { type: 'checkbox', checked: mine, disabled: a.revealed, onchange: e => { e.target.checked ? a.later.add(id) : a.later.delete(id); } }),
          h('span', {}, label)),
        a.revealed ? this.verdict(truth === mine, `${truth ? 'Yes' : 'No'}${truth === mine ? '' : `, you said ${mine ? 'yes' : 'no'}`}.`, c.why[id]) : null);
    });
    const flightOpts = [['yes', 'Yes, if they chose to'], ['no', 'No one could']].map(([v, label]) => h('label', { class: 'opt' },
      h('input', { type: 'radio', name, value: v, checked: a.flight === v, disabled: a.revealed, onchange: () => { a.flight = v; this.revealBtn.disabled = false; } }),
      h('span', {}, label)));
    const flightTruth = c.flight ? 'yes' : 'no';
    this.revealBtn = h('button', { type: 'button', class: 'primary', disabled: a.revealed || !a.flight, onclick: () => { a.revealed = true; this.render(); } }, 'Reveal');

    this.body.replaceChildren(h('div', { class: 'card' },
      h('h3', {}, `${this.i + 1}. ${c.title}`),
      h('p', { style: { margin: 0 } }, c.setup),
      h('fieldset', {}, h('legend', {}, '30 days later, who could read the essay?'), boxes),
      h('fieldset', { role: 'radiogroup' }, h('legend', {}, 'While it was being answered, could anyone besides you have read it?'), flightOpts,
        a.revealed ? this.verdict(a.flight === flightTruth, `${c.flight ? 'Yes' : 'No'}.`, c.why.flight) : null),
      h('div', { class: 'row nav' },
        a.revealed ? h('span', { class: 'muted' }, `${this.score(this.i)} of 5 right`) : h('span', { class: 'muted' }, 'Tick everyone who applies, then answer the second question.'),
        a.revealed
          ? (this.i < CASES.length - 1 ? h('button', { type: 'button', class: 'primary', onclick: () => { this.i++; this.render(); } }, 'Next card') : null)
          : this.revealBtn)));

    this.renderGuess();
    this.renderSummary();
    this.renderTell();
  }

  verdict(ok, head, why) {
    return h('div', { class: 'verdict', 'data-ok': String(ok) },
      h('span', { class: 'mark' }, ok ? 'Right.' : 'Not quite.'), h('span', {}, head), h('p', { class: 'muted' }, why));
  }

  score(i) {
    const c = CASES[i], a = this.answers[i];
    return READERS.filter(([id]) => c.later.includes(id) === a.later.has(id)).length + (a.flight === (c.flight ? 'yes' : 'no') ? 1 : 0);
  }

  renderSummary() {
    const n = this.answers.filter(a => a.revealed).length;
    if (n < CASES.length) {
      this.summary.replaceChildren();
      this.progress(n, CASES.length + 1, `${n} of ${CASES.length} cards revealed.`);
      return;
    }
    const total = CASES.reduce((s, _, i) => s + this.score(i), 0);
    const others = c => c.later.filter(r => r !== 'you').map(r => READERS.find(x => x[0] === r)[1]).join(', ') || 'only you';
    this.summary.replaceChildren(
      h('div', { class: 'tablewrap' }, h('table', {},
        h('caption', { class: 'muted', style: { textAlign: 'left', paddingBottom: '0.3rem' } }, `Your score: ${total} of ${CASES.length * 5}`),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Setup'), h('th', { scope: 'col' }, 'Readable 30 days later by'), h('th', { scope: 'col' }, 'Readable in flight by others?'))),
        h('tbody', {}, CASES.map(c => h('tr', {},
          h('th', { scope: 'row' }, c.title), h('td', { class: c.later.length > 1 ? 'yes' : 'no' }, others(c)), h('td', { class: c.flight ? 'yes' : 'no' }, c.flight ? 'yes' : 'no')))))),
      h('p', { class: 'debrief' }, 'Look at the last three rows: identical 30 days later. What separates them is who could have chosen to look while it passed through.'));
    if (!this.told) { this.progress(CASES.length, CASES.length + 1, 'All cards revealed: decide what to do and write the note to the student.'); return; }
    this.complete('Retention is about later and access is about now: in these six setups, ZDR empties the provider\'s part of the 30-day column but not the in-flight one, only Sealed and your own laptop also empty the in-flight one (as far as the hardware and attestation hold), any app that keeps history holds a readable copy regardless, and none of them decides whether the essay was yours to send.');
  }
}

customElements.define('x-retention-b', RetentionB);
