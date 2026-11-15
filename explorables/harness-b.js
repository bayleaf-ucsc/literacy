// Spin B for "harness": a role. The learner is the harness. The model only
// emits text asking for tool calls; the learner routes each one to the right
// mechanism (or refuses it), and the result goes back into the model's context.
// Two counters make the point: the model executes nothing directly; the harness
// executes every operation the model chose.
import { Explorable, h } from '../js/kit.js';

// What this harness can do. "ask" and "reject" are harness policy, not tools.
const ACTIONS = [
  ['shell', 'Run it in the shell'],
  ['read', 'Read the file'],
  ['write', 'Write the file'],
  ['fetch', 'Fetch the web page'],
  ['show', 'Show it to the person'],
  ['ask', 'Ask the person first'],
  ['reject', 'Reply: no such tool'],
];

// The policy this harness enforces, shown to the learner before any routing,
// so each decision applies a visible rule rather than guessing the author's.
const POLICY = [
  'Tools that exist: read, write, fetch, bash, send_reply_to_user. Nothing else.',
  'A call to any other tool name: reply that no such tool exists.',
  'Anything that deletes files: ask the person first, in words they can judge.',
  'Other reads, writes, fetches and shell commands: run them.',
];

// Each step: the model's request, the right action, the result, and feedback
// for a wrong pick (keyed by action, with a fallback).
const STEPS = [
  { call: 'read("notes/README.md")', want: 'read', result: '"Lecture notes, one file per week. Old drafts in notes/old-drafts."',
    why: 'Reading a file is its own tool here. The model cannot open files; it asked you to.' },
  { call: 'bash("grep -ril tokeniz notes/")', want: 'shell', result: 'notes/2026-10-01-tokens.md\nnotes/2026-10-15-bpe.md',
    why: 'Anything sent to bash runs as a command on this computer, with your permissions.' },
  { call: 'fetch("https://example.org/what-is-bpe")', want: 'fetch', result: '(a web page, converted to about 1,800 tokens of text)',
    why: 'Only the harness touches the network. The page text now sits in the model’s context.' },
  { call: 'bash("rm -r notes/old-drafts")', want: 'ask', result: 'Person said: no, keep them.',
    why: 'This deletes files. Your policy says deletions need a yes from the person first.',
    wrong: { shell: 'Had you run this, the folder would be gone and nobody would have asked the person. The model only asked; the harness would have acted. Check the policy.' } },
  { call: 'write("bin/notedates", "#!/bin/sh\\nfor f in $(grep -ril \\"$1\\" notes/); do sed -n \'s/^date: //p\' \\"$f\\"; done")', want: 'write',
    result: 'wrote bin/notedates (2 lines)',
    why: 'This is the notedates script you just watched the bash agent make. From the harness side, it is just another file write.' },
  { call: 'notedates("tokeniz")', want: 'reject', result: 'error: no tool named notedates. Available: read, write, fetch, bash, send_reply_to_user.',
    why: 'The model made a script, not a tool. Only the harness decides which tools exist, so you say so, as the policy requires.',
    wrong: { shell: 'Tempting, but the model called a tool that does not exist. A harness that guesses what the model meant is a harness that does surprising things.' } },
  { call: 'bash("sh bin/notedates tokeniz")', want: 'shell', result: 'Oct 1\nOct 15',
    why: 'Same script, reached through bash. To the harness, self-extension is one more shell command it agreed to run.' },
  { call: 'send_reply_to_user("Tokenizers come up Oct 1 and Oct 15. I left old-drafts alone, as you asked.")', want: 'show',
    result: '(the person reads it)',
    why: 'In this harness, even replying is a tool call. Without a harness to show it, the model’s answer goes nowhere.' },
];

class HarnessB extends Explorable {
  static prediction = {
    question: 'An agent "deletes a file" while working for you. Who actually deletes it?',
    options: [
      { label: 'The model', correct: false,
        feedback: 'A model only produces text. Here that text says "please run rm". Nothing happens until some program reads it and acts.' },
      { label: 'The harness, running a command the model asked for', correct: true,
        feedback: 'The harness parses the request, checks its rules, and runs the command. That is also where permission prompts and limits live.' },
    ],
    after: 'You are the harness now. Estimate, then route each request the model sends.',
  };

  static literacies = {
    read: 'You read each request the model emits and work out what it would do on a real computer.',
    write: 'You write the permission prompt the person sees before anything gets deleted.',
    count: 'Before routing, you estimate how large the model’s context will grow, then watch the counter.',
  };

  static css = `
    .counters { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; margin-bottom: 0.6rem; }
    .counters div { display: flex; flex-direction: column; }
    .counters small { color: var(--lit-muted); font-size: 0.78rem; }
    .model { border-left: 3px solid var(--lit-teach); background: var(--lit-teach-tint); padding: 0.5rem 0.7rem; border-radius: 0 var(--lit-radius) var(--lit-radius) 0; }
    .model small { display: block; color: var(--lit-muted); font-size: 0.75rem; }
    .model code { font-family: var(--lit-font-mono); font-size: 0.82rem; white-space: pre-wrap; overflow-wrap: anywhere; }
    .actions { display: grid; gap: 0.35rem; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); margin: 0.6rem 0; }
    .fb { padding: 0.5rem 0.7rem; border-left: 3px solid var(--lit-border); background: var(--lit-surface); margin-bottom: 0.5rem; }
    .fb[data-ok="true"] { border-color: var(--lit-good); }
    .fb[data-ok="false"] { border-color: var(--lit-bad); }
    .fb strong[data-ok="true"] { color: var(--lit-good); }
    .fb strong[data-ok="false"] { color: var(--lit-bad); }
    ol.log { margin: 0.3rem 0 0; padding-left: 1.4rem; font-size: 0.8rem; }
    ol.log li { margin-bottom: 0.25rem; }
    ol.log code { font-family: var(--lit-font-mono); overflow-wrap: anywhere; white-space: pre-wrap; }
    details summary { cursor: pointer; font-weight: 600; font-size: 0.9rem; }
    .policy { margin-bottom: 0.6rem; font-size: 0.85rem; }
    .policy ul { margin: 0.2rem 0 0; padding-left: 1.2rem; }
    .est { margin-bottom: 0.6rem; }
    .est p, .prompt p { margin: 0 0 0.3rem; }
    input.text { padding: 0.3rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
    .est input { width: 6rem; }
    .prompt input { width: 100%; margin-bottom: 0.3rem; }
  `;

  mount(root) {
    this.i = 0;
    this.misses = 0;
    this.harnessActs = 0;
    this.ctx = 900; // rough starting context: system prompt, tool list, request
    this.log = [];
    this.guess = null;      // estimated final context, in tokens
    this.askText = null;    // the permission prompt the learner wrote
    this.estInput = h('input', { class: 'text', type: 'number', min: 1, step: 100, inputmode: 'numeric', 'aria-label': 'Estimated final context in tokens',
      onkeydown: e => { if (e.key === 'Enter') this.lockGuess(); } });
    this.est = h('div', { class: 'est card', 'aria-live': 'polite' });
    this.counters = h('div', { class: 'counters', 'aria-live': 'polite' });
    this.model = h('div', { class: 'model' });
    this.actions = h('div', { class: 'actions', role: 'group', 'aria-label': 'Harness actions' },
      ...ACTIONS.map(([id, label]) => h('button', { type: 'button', 'data-act': id, onclick: () => this.route(id) }, label)));
    this.fb = h('div', { 'aria-live': 'polite' });
    this.logEl = h('ol', { class: 'log' });
    root.append(
      h('p', { class: 'muted', style: { margin: '0 0 0.5rem', fontSize: '0.85rem' } },
        'The person asked: "Which notes mention tokenizers? Tidy up while you are in there." Simulated model output.'),
      h('div', { class: 'card policy' }, h('strong', {}, 'Your harness policy'),
        h('ul', {}, ...POLICY.map(p => h('li', {}, p)))),
      this.est, this.counters, this.model, this.actions, this.fb,
      h('details', {}, h('summary', {}, 'The model’s context so far'), this.logEl));
    this.render();
  }

  lockGuess() {
    const n = Math.round(Number(this.estInput.value));
    if (!(n >= 1)) { this.estInput.focus(); return; }
    this.guess = n;
    this.render();
    this.actions.querySelector('button')?.focus();
  }

  route(act) {
    const s = STEPS[this.i];
    if (!s || this.guess == null) return;
    if (act === s.want && act === 'ask' && this.askText == null) return this.writePrompt();
    if (act !== s.want) {
      this.misses++;
      const msg = s.wrong?.[act] || `Not this one. Look at the name of the tool the model asked for, and what it would do on this computer.`;
      this.fb.replaceChildren(h('div', { class: 'fb', 'data-ok': 'false' }, h('strong', { 'data-ok': 'false' }, 'Hold on. '), msg));
      return;
    }
    if (act !== 'reject') this.harnessActs++;
    this.ctx += Math.round((s.call.length + s.result.length) / 4) + (act === 'fetch' ? 1800 : 0);
    this.log.push(s);
    this.fb.replaceChildren(h('div', { class: 'fb', 'data-ok': 'true' }, h('strong', { 'data-ok': 'true' }, 'Routed. '), s.why,
      act === 'ask' ? h('div', { style: { fontSize: '0.85rem', marginTop: '0.3rem' } }, 'You asked: “', this.askText, '”') : null,
      h('div', { class: 'mono muted', style: { whiteSpace: 'pre-wrap', fontSize: '0.8rem', marginTop: '0.3rem' } }, '→ sent back to the model: ', s.result)));
    this.i++;
    this.render();
    if (this.i === STEPS.length) {
      const r = this.guess / this.ctx;
      const verdict = r > 0.7 && r < 1.4 ? 'close' : `about ${(r > 1 ? r : 1 / r).toFixed(1)} times too ${r > 1 ? 'high' : 'low'}`;
      this.fb.append(h('div', { class: 'fb' }, h('strong', {}, 'Your estimate. '),
        `You guessed about ${this.guess.toLocaleString()} tokens; the context ended near ${this.ctx.toLocaleString()} (${verdict}). The one fetched page was 1,800 of them, more than all eight requests and every other result together.`));
      this.complete('In this trace the model chose each action and wrote its content, but only the harness executed them: it ran every read, write and fetch, applied the deletion policy, and delivered the reply.');
    } else {
      this.progress(this.i, STEPS.length, `${this.i} of ${STEPS.length} requests handled.`);
    }
  }

  // The person sees only what the harness shows them, so the learner writes it.
  writePrompt() {
    const input = h('input', { class: 'text', type: 'text', 'aria-label': 'Permission prompt shown to the person',
      placeholder: 'For example: The agent wants to delete ...',
      onkeydown: e => { if (e.key === 'Enter') send(); } });
    const send = () => {
      const t = input.value.trim();
      if (t.split(/\s+/).length < 3) { input.focus(); return; }
      this.askText = t;
      this.route('ask');
    };
    this.fb.replaceChildren(h('div', { class: 'fb prompt' },
      h('p', {}, h('strong', {}, 'Write the prompt. '), 'The person will see only what you, the harness, show them. Say what is about to happen in words they can judge.'),
      input, h('button', { type: 'button', onclick: send }, 'Send this prompt')));
    input.focus();
  }

  render() {
    this.est.replaceChildren(...this.guess == null
      ? [h('p', {}, h('strong', {}, 'Estimate: '), 'the model’s context starts near 900 tokens (instructions, tool list, request). After all eight requests, roughly how many tokens will it hold?'),
        h('div', { class: 'row' }, this.estInput, h('button', { type: 'button', onclick: () => this.lockGuess() }, 'Lock in and start'))]
      : [h('p', { class: 'muted', style: { margin: 0 } }, `Your estimate: about ${this.guess.toLocaleString()} tokens at the end.`)]);
    const s = STEPS[this.i];
    this.counters.replaceChildren(
      h('div', {}, h('span', { class: 'big num' }, '0'), h('small', {}, 'operations the model executed directly')),
      h('div', {}, h('span', { class: 'big num' }, String(this.harnessActs)), h('small', {}, 'operations you (the harness) executed')),
      h('div', {}, h('span', { class: 'big num' }, `~${(this.ctx / 1000).toFixed(1)}k`), h('small', {}, 'tokens in context (rough)')));
    this.model.replaceChildren(...s
      ? [h('small', {}, `Model output, request ${this.i + 1} of ${STEPS.length}`), h('code', {}, s.call)]
      : [h('small', {}, 'Model output'), h('code', {}, '(nothing: the turn is over, and the model waits for the next message)')]);
    for (const b of this.actions.children) b.disabled = !s || this.guess == null;
    this.logEl.replaceChildren(...this.log.map(x => h('li', {}, h('code', {}, x.call), h('br'), h('span', { class: 'muted' }, '→ ', x.result))));
  }
}

customElements.define('x-harness-b', HarnessB);
