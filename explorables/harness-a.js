// Spin A for "harness": an instrument. One task, three harnesses, one shared
// timeline slider: scrub to the same moment in each lane, rate how well you
// could follow each, then unlock a sixth moment where the bash agent extends itself.
import { Explorable, h } from '../js/kit.js';

const PHASES = ['Look around', 'Find matches', 'Read details', 'Save the list', 'Reply', 'Next week, a similar request'];

// Each call: [call text, result, plain] where plain marks a call whose name says
// what it does to a non-programmer (a rough, hand-assigned judgment).
const LANES = [
  { id: 'bash', name: 'Bash only', tools: ['bash'], phases: [
    [['bash("ls ~/notes")', '2026-09-24-intro.md  2026-10-01-tokens.md  2026-10-15-bpe.md  ...', 0]],
    [['bash("grep -ril tokeniz ~/notes")', 'notes/2026-10-01-tokens.md, notes/2026-10-15-bpe.md', 0]],
    [['bash("for f in $(grep -ril tokeniz ~/notes); do sed -n \'s/^date: //p\' \\"$f\\"; done")', 'Oct 1, Oct 15', 0]],
    [['bash("printf \'- %s\\\\n\' \'Oct 1: tokens\' \'Oct 15: BPE\' > ~/notes/tokenizer-list.md")', '(no output)', 0]],
    [['reply("Two lectures mention tokenizers: Oct 1 and Oct 15. List saved.")', 'shown to you', 1]],
    [['bash("cat > ~/bin/notedates <<\'EOF\'\\n#!/bin/sh\\n# usage: notedates WORD\\nfor f in $(grep -ril \\"$1\\" ~/notes); do\\n  sed -n \'s/^date: //p\' \\"$f\\"\\ndone\\nEOF\\nchmod +x ~/bin/notedates")', '(a new command now exists)', 0],
     ['bash("notedates sampling")', 'Oct 8, Oct 22', 0],
     ['reply("Sampling came up Oct 8 and Oct 22.")', 'shown to you', 1]],
  ] },
  { id: 'named', name: 'Named tools', tools: ['list', 'search', 'read', 'write', 'edit', 'fetch', 'load_skill', 'reply'], phases: [
    [['list("notes/")', '14 files', 1]],
    [['search("tokeniz", in: "notes/")', '2 files match', 1]],
    [['read("notes/2026-10-01-tokens.md")', 'date: Oct 1 ...', 1], ['read("notes/2026-10-15-bpe.md")', 'date: Oct 15 ...', 1]],
    [['write("notes/tokenizer-list.md", "- Oct 1: tokens\\n- Oct 15: BPE")', 'saved', 1]],
    [['reply("Two lectures mention tokenizers: Oct 1 and Oct 15. List saved.")', 'shown to you', 1]],
    [['search("sampling", in: "notes/")', '2 files match', 1], ['read(...) twice', 'Oct 8, Oct 22', 1],
     ['reply("Sampling came up Oct 8 and Oct 22.")', 'shown to you', 1]],
  ] },
  { id: 'cu', name: 'Computer use', tools: ['screenshot', 'click', 'type', 'key', 'reply'], phases: [
    [['screenshot()', 'a desktop with a Files icon', 1], ['click(Files icon)', 'Files opens', 1]],
    [['click(search box)', '', 1], ['type("tokeniz")', '', 1], ['screenshot()', '2 results', 1]],
    [['click("2026-10-01-tokens.md")', '', 1], ['screenshot()', 'date: Oct 1', 1], ['click(Back)', '', 1],
     ['click("2026-10-15-bpe.md")', '', 1], ['screenshot()', 'date: Oct 15', 1]],
    [['click(Text Editor)', '', 1], ['type("- Oct 1: tokens ...")', '', 1], ['key("ctrl+s")', 'Save dialog', 1],
     ['type("tokenizer-list")', '', 1], ['key("enter")', 'saved', 1]],
    [['reply("Two lectures mention tokenizers: Oct 1 and Oct 15. List saved.")', 'shown to you', 1]],
    [['(repeats every click and screenshot, a little faster this time)', '', 1]],
  ] },
];

const RATINGS = ['I could follow it', 'Partly', 'Lost me'];

class HarnessA extends Explorable {
  static prediction = {
    question: 'Two agents get the same model and the same file and network permissions. One harness offers only bash; the other offers eight named tools, none of which runs code. Which agent can do more?',
    options: [
      { label: 'The one with eight named tools', correct: false,
        feedback: 'Here, more names, not more power. With the same permissions, a shell can run any installed program, including ones the agent writes itself. What the named tools add is a trail that a person can read. (A named-tools harness that included a code-running tool would close the gap the other way.)' },
      { label: 'About the same; the difference is who can follow along', correct: true,
        feedback: 'With equal permissions, bash can do nearly anything these named tools do. The names change legibility: a list of read, search, write tells a story that grep and sed do not.' },
    ],
    after: 'Estimate first, then drag the timeline. Rate each harness once you reach the reply.',
  };

  static literacies = {
    read: 'You read three transcripts of the same task and judge how well you could follow each.',
    write: 'You write the plain-language log line that the bash agent’s most cryptic call never gave you.',
    count: 'Before scrubbing, you estimate how many calls the computer-use agent needs, then see the tally.',
  };

  static css = `
    .lanes { display: grid; gap: 0.6rem; grid-template-columns: repeat(auto-fit, minmax(11.5rem, 1fr)); margin-top: 0.6rem; }
    .lane { background: var(--lit-surface); border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.55rem 0.65rem; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .lane h3 { margin: 0; font-size: 0.95rem; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.2rem; }
    .chips code { font-size: 0.72rem; padding: 0 0.3rem; border: 1px solid var(--lit-border); border-radius: 4px; background: var(--lit-teach-tint); }
    .call { font-family: var(--lit-font-mono); font-size: 0.75rem; white-space: pre-wrap; overflow-wrap: anywhere; background: var(--lit-bg); border-radius: 4px; padding: 0.25rem 0.35rem; }
    .call .res { display: block; color: var(--lit-muted); }
    .call[data-new] { outline: 2px solid var(--lit-work); }
    .stats { font-size: 0.8rem; color: var(--lit-muted); }
    .rate { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .rate button { font-size: 0.78rem; padding: 0.15rem 0.45rem; }
    .rate button[aria-pressed="true"] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .meter { height: 0.5rem; background: var(--lit-border); border-radius: 3px; overflow: hidden; }
    .meter > div { height: 100%; background: var(--lit-work); }
    .phase { font-weight: 600; }
    input[type=range] { display: block; margin: 0.2rem 0; }
    .self { margin-top: 0.6rem; }
    .est input { width: 5rem; padding: 0.3rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
    .est, .gloss { margin: 0.5rem 0; }
    .gloss textarea { width: 100%; font: inherit; color: var(--lit-fg); background: var(--lit-bg); border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.35rem; }
    .gloss textarea:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 2px; }
  `;

  mount(root) {
    this.phase = 0;
    this.visited = new Set([0]);
    this.rated = {};
    this.guess = null;   // estimated computer-use calls by the reply
    this.logLine = null; // the learner's plain-language gloss of a bash call
    this.slider = h('input', { type: 'range', id: 't', min: 0, max: 4, step: 1, value: 0, disabled: true,
      oninput: e => { this.phase = +e.target.value; this.visited.add(this.phase); this.render(); } });
    this.phaseLabel = h('span', { class: 'phase', 'aria-live': 'polite' });
    this.lanes = h('div', { class: 'lanes' });
    this.self = h('div', { class: 'self' });
    this.estInput = h('input', { type: 'number', min: 1, max: 99, step: 1, inputmode: 'numeric', 'aria-label': 'Estimated computer-use calls',
      onkeydown: e => { if (e.key === 'Enter') this.lockGuess(); } });
    this.est = h('div', { class: 'est', 'aria-live': 'polite' });
    this.glossInput = h('textarea', { rows: 2, 'aria-label': 'Your plain-language log line for moment 3', placeholder: 'For example: Looked in each matching file for ...' });
    this.gloss = h('div', { class: 'gloss' });
    root.append(
      h('p', { class: 'muted', style: { margin: '0 0 0.4rem', fontSize: '0.85rem' } },
        'Task: "Which of my lecture notes mention tokenizers? Save a list with dates." Illustrative transcripts, not recorded from a real agent.'),
      this.est,
      h('label', { for: 't' }, 'Moment: ', this.phaseLabel), this.slider, this.lanes, this.gloss, this.self);
    this.render();
  }

  lockGuess() {
    const n = Math.round(Number(this.estInput.value));
    if (!(n >= 1)) { this.estInput.focus(); return; }
    this.guess = n;
    this.slider.disabled = false;
    this.render();
    this.slider.focus();
  }

  saveGloss() {
    const t = this.glossInput.value.trim();
    if (t.split(/\s+/).length < 3) { this.glossInput.focus(); return; }
    this.logLine = t;
    this.render();
  }

  renderEstimate() {
    const calls = id => LANES.find(L => L.id === id).phases.slice(0, 5).flat().length;
    if (this.guess == null) {
      this.est.replaceChildren(h('div', { class: 'card' },
        h('p', { style: { margin: '0 0 0.3rem' } }, `By the reply (moment 5), the named-tools agent makes ${calls('named')} calls. Roughly how many will the computer-use agent make?`),
        h('div', { class: 'row' }, this.estInput, h('button', { type: 'button', onclick: () => this.lockGuess() }, 'Lock in and start'))));
    } else if (this.phase >= 4) {
      const actual = calls('cu'), r = this.guess / actual;
      const verdict = r > 0.7 && r < 1.4 ? 'close' : `about ${(r > 1 ? r : 1 / r).toFixed(1)} times too ${r > 1 ? 'high' : 'low'}`;
      this.est.replaceChildren(h('p', { class: 'muted', style: { margin: 0 } },
        `You estimated ${this.guess} computer-use calls; it made ${actual} (${verdict}). Bash made ${calls('bash')}. Every click and screenshot is a call.`));
    } else this.est.replaceChildren(h('p', { class: 'muted', style: { margin: 0 } }, `Your estimate: ${this.guess} computer-use calls by the reply.`));
  }

  renderGloss() {
    if (this.rated.bash == null) { this.gloss.replaceChildren(); return; }
    const call = LANES[0].phases[2][0][0];
    this.gloss.replaceChildren(h('div', { class: 'card' },
      h('p', { style: { margin: '0 0 0.3rem' } }, h('strong', {}, 'Write the missing log line. '),
        'In plain words a colleague could read, what did this bash call do?'),
      h('div', { class: 'call' }, call),
      this.logLine == null
        ? [this.glossInput, h('div', { class: 'row', style: { marginTop: '0.3rem' } }, h('button', { type: 'button', onclick: () => this.saveGloss() }, 'Add to the log'))]
        : h('p', { style: { margin: '0.4rem 0 0' } }, h('strong', {}, 'Your log: '), this.logLine, h('br'),
          h('span', { class: 'muted' }, 'The named-tools lane needed no translation: read("notes/2026-10-01-tokens.md"), read("notes/2026-10-15-bpe.md"). Some harnesses ask the model to write a line like yours for every shell command.'))));
  }

  render() {
    this.renderEstimate();
    this.renderGloss();
    const p = this.phase;
    this.phaseLabel.textContent = `${p + 1}. ${PHASES[p]}`;
    this.slider.setAttribute('aria-valuetext', PHASES[p]);
    const focusKey = this.root.activeElement?.dataset?.key;
    this.lanes.replaceChildren(...LANES.map(L => {
      const upto = L.phases.slice(0, p + 1).flat();
      const plain = upto.filter(c => c[2]).length;
      const chars = upto.reduce((n, c) => n + c[0].length, 0);
      const rated = this.rated[L.id];
      return h('section', { class: 'lane', 'aria-label': L.name },
        h('h3', {}, L.name),
        h('div', { class: 'chips', 'aria-label': 'Tools this harness offers' }, ...L.tools.map(t => h('code', {}, t))),
        ...L.phases[p].map(([call, res]) => h('div', { class: 'call', 'data-new': true }, call, res ? h('span', { class: 'res' }, '\u2192 ', res) : null)),
        h('div', { class: 'stats num' }, `So far: ${upto.length} calls, about ${Math.round(chars / 4)} tokens of calls (rough)`),
        p >= 4 ? h('div', { class: 'rate', role: 'group', 'aria-label': `How well could you follow ${L.name}?` },
          ...RATINGS.map((r, i) => h('button', { type: 'button', 'data-key': `${L.id}-${i}`, 'aria-pressed': String(rated === i),
            onclick: () => { this.rated[L.id] = i; this.render(); } }, r))) : null,
        rated != null ? h('div', {},
          h('div', { class: 'stats' }, `Calls whose name says what they do (the author’s rough call, not a check on your rating): ${plain} of ${upto.length}`),
          h('div', { class: 'meter', 'aria-hidden': 'true' }, h('div', { style: { width: `${100 * plain / upto.length}%` } }))) : null);
    }));
    if (focusKey) this.root.querySelector(`[data-key="${focusKey}"]`)?.focus();

    const allRated = LANES.every(L => this.rated[L.id] != null);
    const unseen = [0, 1, 2, 3, 4].filter(i => !this.visited.has(i));
    if (allRated && this.logLine != null && !unseen.length && this.slider.max !== '5') {
      this.slider.max = 5;
      this.self.replaceChildren(h('div', { class: 'debrief' }, 'Unlocked: drag to moment 6. A week later you ask about a different topic.'));
    }
    if (p === 5) {
      this.self.replaceChildren(h('div', { class: 'debrief' },
        h('strong', {}, 'Self-extension. '),
        'The bash agent wrote a new command, notedates, then ran it. Its harness still offers one tool, but the agent now has a command it made. ',
        'This named-tools harness has no tool that runs code, so its agent can only use the list its builder gave it. The computer-use agent repeats its clicks; it could open a terminal, which is bash by way of the screen.'));
    }

    const done = this.visited.size + Object.keys(this.rated).length + (this.guess != null) + (this.logLine != null);
    if (this.visited.has(5)) {
      this.complete('In these transcripts, each harness set what its agent could touch and how easily you could follow it; given a shell, the agent added a command of its own.');
    } else {
      this.progress(done, 11, this.guess == null ? 'Estimate the computer-use calls to start.'
        : !this.visited.has(4) ? 'Drag the timeline to the reply.'
        : !allRated ? `Rate ${3 - Object.keys(this.rated).length} more harness${3 - Object.keys(this.rated).length === 1 ? '' : 'es'}.`
        : this.logLine == null ? 'Write the missing log line for the bash call.'
        : unseen.length ? `Look at moment${unseen.length === 1 ? '' : 's'} ${unseen.map(i => i + 1).join(', ')} too.`
        : 'Drag to moment 6.');
    }
  }
}

customElements.define('x-harness-a', HarnessA);
