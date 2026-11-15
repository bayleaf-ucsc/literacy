// Skills, spin B: an AGENTS.md editor as a puzzle with three clients.
// The learner toggles lines in a lab section's AGENTS.md, starts a new session
// (the file is read at session start, so edits do nothing until then), and
// watches a canned agent reply change. Three people in turn ask for something
// different; one file has to satisfy them all by the end.
import { Explorable, h } from '../js/kit.js';

const LINES = [
  { id: 'coach', text: "Don't write lab reports for students. Coach them: ask questions, point out what's missing." },
  { id: 'apa', text: 'This lab cites sources in APA 7th edition.' },
  { id: 'jargon', text: 'Students are new to lab science. Define technical terms the first time you use them.' },
  { id: 'short', text: 'Keep replies short: a few sentences, no walls of text.' },
  { id: 'ask', text: 'Before starting anything big, ask one clarifying question.' },
  { id: 'slug', text: 'End every reply with a banana slug fact.' },
];
const START = { slug: true };

const USER_MSG = 'I have my data from the catalase experiment. Can you help me write the lab report?';

// The canned agent: compose a reply from whichever lines were loaded.
function reply(cfg) {
  const p = [];
  const define = '(Catalase is an enzyme: a protein that speeds up a reaction, here splitting hydrogen peroxide into water and oxygen. It denatures, losing its shape and its function, when it gets too hot.)';
  let jargon = false;
  if (cfg.coach) {
    p.push("I won't write the report for you, but I can coach you through it.");
    if (!cfg.short) p.push('A lab report runs from question to method to evidence to claim, and the claim is only as strong as the evidence under it, so we will build it in that order and check each part against your data before moving on.');
    p.push('First question: what did you expect to happen to catalase activity as the temperature went up, and why?');
    jargon = true;
    if (cfg.apa) p.push('When you cite your lab manual, use APA 7th: author, year, title.');
  } else if (cfg.ask) {
    p.push('Happy to help. Before I write anything: do you need the whole report, or one section, like the discussion?');
    if (cfg.apa) p.push("I'll format any citations in APA 7th.");
  } else if (cfg.short) {
    p.push('Here is a compact draft you can paste in:');
    p.push('Catalase activity rose with temperature, peaked near 37 °C, then fell as the enzyme denatured.');
    p.push(cfg.apa ? 'Cite the lab manual in APA 7th.' : 'Add a citation or two.');
    jargon = true;
  } else {
    p.push('Sure! Here is a complete draft of your lab report.');
    p.push('Title: The Effect of Temperature on Catalase Activity. Introduction: Enzymes are biological catalysts that speed up reactions in living cells. Catalase, found in nearly all aerobic organisms, breaks down hydrogen peroxide. In this experiment we measured how its activity changed across three temperatures, five trials each, and found that activity peaked near 37 °C before the enzyme denatured. Methods: Potato extract was added to hydrogen peroxide at 4 °C, 37 °C and 60 °C, and oxygen production was measured over two minutes ...');
    p.push(cfg.apa ? '[the draft continues for about 1,200 words, with references in APA 7th]' : '[the draft continues for about 1,200 words, with citations in whatever format came to mind]');
    jargon = true;
  }
  if (jargon && cfg.jargon) p.push(define);
  if (cfg.slug) p.push('Banana slug fact: they breathe through an opening on their side called a pneumostome.');
  const text = p.join(' ');
  return {
    paras: p, words: text.split(/\s+/).filter(Boolean).length,
    ghostwrites: !cfg.coach, apa: !!cfg.apa && /APA/.test(text), undefinedJargon: jargon && !cfg.jargon, slug: !!cfg.slug,
  };
}

const CLIENTS = [
  { who: 'Prof. Okafor, who runs the lab section',
    says: 'Last quarter the agent wrote whole reports for students. It should coach, not ghostwrite, and it should know our citation style.',
    checks: [['Does not write the report for the student', r => !r.ghostwrites], ['Mentions APA 7th', r => r.apa]] },
  { who: 'Jun, a first-year student in the section',
    says: 'It buried me in a wall of text full of words I did not know.',
    checks: [['Under 80 words', r => r.words < 80], ['Defines any technical terms it uses', r => !r.undefinedJargon]] },
  { who: 'Ari, the TA, who keeps one AGENTS.md for the whole section',
    says: 'One file has to work for everyone at once. Also, students say the slug facts got old by week three.',
    checks: [['No ghostwriting', r => !r.ghostwrites], ['Mentions APA 7th', r => r.apa], ['Under 80 words', r => r.words < 80],
      ['Defines technical terms', r => !r.undefinedJargon], ['No slug facts', r => !r.slug]] },
];

class SkillsB extends Explorable {
  static prediction = {
    question: 'Mid-conversation, you add a line to the project\'s AGENTS.md: "Keep replies short." What happens to the agent\'s very next reply?',
    options: [
      { label: 'It gets shorter right away, because the agent keeps watching the file',
        feedback: 'In most harnesses the agent is not watching. AGENTS.md is read when a session starts and placed at the top of the context, so the running session still has the old text.' },
      { label: 'Usually nothing changes until a new session starts', correct: true,
        feedback: 'Right. The file is shown to the agent at session start, so an edit takes effect in the next session (or when you ask the agent to reread it). Some harnesses differ; check yours.' },
    ],
    after: 'Below, three people each want something from the lab section\'s agent. Edit the file, start a new session, and read the simulated reply.',
  };

  static literacies = {
    read: 'You read three people’s complaints and the simulated reply each version of the file produces.',
    write: 'You compose the lab section’s AGENTS.md by choosing which lines stay in it.',
    count: 'You estimate by eye how many words a wall-of-text reply runs, then check it against an 80-word limit.',
  };

  static css = `
    .client { border-left: 4px solid var(--lit-teach); }
    .client .who { font-weight: 600; }
    .client q { display: block; margin: 0.25rem 0 0.4rem; font-style: italic; }
    .checks { list-style: none; padding: 0; margin: 0; font-size: 0.88rem; }
    .checks li::before { content: attr(data-mark); display: inline-block; width: 4.2rem; font-weight: 600; font-size: 0.78rem; }
    .checks li[data-ok="true"] { color: var(--lit-good); }
    .checks li[data-ok="false"] { color: var(--lit-bad); }
    .file { font-family: var(--lit-font-mono); font-size: 0.85rem; margin-top: 0.6rem; }
    .file .name { font-size: 0.78rem; color: var(--lit-muted); margin-bottom: 0.3rem; }
    .file label { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.2rem 0.25rem; border-radius: 4px; cursor: pointer; }
    .file label:hover { background: var(--lit-surface-2); }
    .file input { margin-top: 0.25rem; accent-color: var(--lit-work); }
    .file label.off span { color: var(--lit-muted); text-decoration: line-through; }
    .file .hd { color: var(--lit-teach); padding: 0 0.25rem 0.2rem; }
    .stale { color: var(--lit-bad); font-size: 0.85rem; }
    .chat { margin-top: 0.6rem; display: grid; gap: 0.45rem; }
    .msg { padding: 0.5rem 0.7rem; border-radius: var(--lit-radius); font-size: 0.9rem; }
    .msg.user { background: var(--lit-teach-tint); justify-self: end; max-width: 90%; }
    .msg.agent { background: var(--lit-surface); border: 1px solid var(--lit-border); }
    .msg.agent p { margin: 0 0 0.35rem; }
    .msg .meta { font-size: 0.75rem; color: var(--lit-muted); margin-bottom: 0.2rem; }
    .est { margin-top: 0.5rem; }
    .est p { margin: 0 0 0.3rem; }
    .est input { width: 5rem; padding: 0.3rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
  `;

  mount(root) {
    this.cfg = { ...START };
    this.session = { ...START };
    this.sessions = 1;
    this.stage = 0;
    this.guess = null;  // { said, was }: words estimated by eye vs counted, at Jun's turn
    this.estInput = h('input', { type: 'number', min: 1, step: 1, inputmode: 'numeric', 'aria-label': 'Estimated words in the reply',
      onkeydown: e => { if (e.key === 'Enter') this.lockGuess(); } });
    this.clientBox = h('div', { class: 'card client', 'aria-live': 'polite' });
    this.boxes = {};
    const file = h('div', { class: 'card file' },
      h('div', { class: 'name' }, 'bio20l-lab-reports/AGENTS.md (tick a line to keep it in the file)'),
      h('div', { class: 'hd' }, '# Lab report helper for BIO 20L'),
      ...LINES.map(l => {
        const box = h('input', { type: 'checkbox', checked: !!this.cfg[l.id], onchange: () => { this.cfg[l.id] = box.checked; this.render(); } });
        this.boxes[l.id] = box;
        return h('label', {}, box, h('span', {}, `- ${l.text}`));
      }));
    this.staleBox = h('div', { class: 'row', style: { marginTop: '0.5rem' } });
    this.chat = h('div', { class: 'chat', 'aria-live': 'polite' });
    root.append(this.clientBox, file, this.staleBox, this.chat);
    this.render();
  }

  newSession() {
    this.session = { ...this.cfg };
    this.sessions++;
    this.render();
  }

  lockGuess() {
    const n = Math.round(Number(this.estInput.value));
    if (!(n >= 1)) { this.estInput.focus(); return; }
    this.guess = { said: n, was: reply(this.session).words };
    this.render();
  }

  // Jun counts words, so the count stays hidden until the learner eyeballs it.
  estimateBox() {
    if (this.stage !== 1) return null;
    if (!this.guess) return h('div', { class: 'est' },
      h('p', {}, h('strong', {}, 'Before you edit: '), 'count by eye. Roughly how many words is the agent’s reply below?'),
      h('div', { class: 'row' }, this.estInput, h('button', { type: 'button', onclick: () => this.lockGuess() }, 'Check my count')));
    const { said, was } = this.guess, off = Math.abs(said - was);
    return h('p', { class: 'muted', style: { margin: '0.4rem 0 0', fontSize: '0.88rem' } },
      `You said ${said}; it was ${was} words (${off <= was * 0.2 ? 'close' : `off by ${off}`}). Jun's limit is 80.`);
  }

  next() {
    this.stage++;
    if (this.stage >= CLIENTS.length) {
      this.complete('In this simulation, a few plain sentences read at session start turned a ghostwriter into a coach for three people at once. Real instructions steer a model without enforcing anything, so the people the file serves still check what it does.');
    } else this.progress(this.stage, CLIENTS.length, `${this.stage} of ${CLIENTS.length} people satisfied`);
    this.render();
  }

  render() {
    for (const l of LINES) this.boxes[l.id].closest('label').classList.toggle('off', !this.cfg[l.id]);
    const stale = LINES.some(l => !!this.cfg[l.id] !== !!this.session[l.id]);
    const r = reply(this.session);

    const done = this.stage >= CLIENTS.length;
    const c = CLIENTS[Math.min(this.stage, CLIENTS.length - 1)];
    const results = c.checks.map(([label, fn]) => [label, fn(r)]);
    const hidden = this.stage === 1 && !this.guess;
    const allOk = results.every(([, ok]) => ok) && !stale && !hidden;
    this.clientBox.replaceChildren(...[
      h('div', { class: 'muted', style: { fontSize: '0.78rem' } }, done ? 'All three satisfied' : `Person ${this.stage + 1} of ${CLIENTS.length}`),
      h('div', { class: 'who' }, c.who),
      h('q', {}, c.says),
      h('ul', { class: 'checks', 'aria-label': 'What the reply must do' },
        ...results.map(([label, ok]) => hidden ? h('li', { 'data-mark': '?' }, label)
          : h('li', { 'data-ok': String(ok), 'data-mark': ok ? 'met' : 'not yet' }, label))),
      this.estimateBox(),
      !done && allOk ? h('div', { class: 'row', style: { marginTop: '0.5rem' } },
        h('button', { type: 'button', class: 'primary', onclick: () => this.next() },
          this.stage === CLIENTS.length - 1 ? 'Finish' : 'Next person')) : null,
      !done && !allOk ? h('p', { class: 'muted', style: { margin: '0.5rem 0 0', fontSize: '0.85rem' } },
        hidden ? 'Make your estimate first.'
          : stale ? 'Start a new session so the agent loads your edited file.'
          : 'Tick and untick lines in the file until every check above says met, then start a new session.') : null,
    ].filter(Boolean));

    this.staleBox.replaceChildren(
      h('button', { type: 'button', class: stale ? 'primary' : '', onclick: () => this.newSession() }, 'Start a new session'),
      stale ? h('span', { class: 'stale' }, 'File edited. The running session still has the old version.')
        : h('span', { class: 'muted', style: { fontSize: '0.85rem' } }, `Session ${this.sessions} loaded this file at start.`),
    );

    this.chat.replaceChildren(
      h('div', { class: 'msg user' }, USER_MSG),
      h('div', { class: 'msg agent' },
        h('div', { class: 'meta' }, `agent, session ${this.sessions} (simulated reply${this.guess ? `, ${r.words} words` : ''})`),
        ...r.paras.map(t => h('p', {}, t))),
    );
  }
}

customElements.define('x-skills-b', SkillsB);
