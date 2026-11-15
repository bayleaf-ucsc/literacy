// Skills, spin A: a skill trigger matcher (instrument).
// Four SKILL.md descriptions, five incoming requests. The learner guesses which
// skill loads, sees a word-overlap score per description, then edits one
// jargon-heavy description until a missed request triggers it, without
// stealing any other request. The scorer is a stand-in for the model's own
// judgment, and the UI says so.
import { Explorable, h } from '../js/kit.js';

const THRESHOLD = 2;
const AGENTS_TOKENS = 300; // rough size of the project's AGENTS.md

const SKILLS = [
  { id: 'yuja-captions', body: 1400, editable: true,
    desc: 'YuJa caption retrieval: export VTT files through the YuJa API and search them by keyword.' },
  { id: 'study-rooms', body: 900,
    desc: 'Book a group study room at McHenry or the Science & Engineering Library. Use when someone wants to reserve a room for a group.' },
  { id: 'lab-citations', body: 1800,
    desc: "Format citations and references in the Coastal Ecology Lab's house style. Use when someone is writing a paper, poster or bibliography." },
  { id: 'canvas-grades', body: 1100,
    desc: 'Look up assignment grades and due dates in Canvas. Use when someone asks about a course grade, score or deadline.' },
];

const REQUESTS = [
  { text: 'Can you reserve a study room for four of us on Thursday?', want: 'study-rooms' },
  { text: 'When is the CMPM 120 assignment due in Canvas?', want: 'canvas-grades' },
  { text: "Put my bibliography in our lab's citation style, please.", want: 'lab-citations' },
  { text: "What did the professor say about shaders in Tuesday's lecture?", want: 'yuja-captions' },
  { text: 'Write a haiku about the redwoods.', want: null },
];

const STOP = new Set(('a about an and are as at be by can did do does for from has have how i if in into is it its me my of on or our please '
  + 'so some someone that the their them they this to up us use was we what when where which who wants asks with would you your four').split(' '));

function stem(w) {
  w = w.toLowerCase().replace(/'s$/, '').replace(/[^a-z0-9]/g, '');
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}
const words = text => new Set(text.split(/[\s/–-]+/).map(stem).filter(w => w && !STOP.has(w)));
const tokens = text => Math.max(1, Math.round(text.length / 4));

// Score every skill for one request; the top scorer(s) at or above threshold load.
function route(reqText, descs) {
  const rw = words(reqText);
  const scores = SKILLS.map(s => {
    const dw = words(descs[s.id]);
    return { id: s.id, hits: [...rw].filter(w => dw.has(w)) };
  });
  const top = Math.max(...scores.map(s => s.hits.length));
  for (const s of scores) s.loads = top >= THRESHOLD && s.hits.length === top;
  return scores;
}
const loadedId = scores => { const l = scores.filter(s => s.loads); return l.length === 1 ? l[0].id : l.length ? 'tie' : null; };

class SkillsA extends Explorable {
  static prediction = {
    question: 'In the harness you just saw, AGENTS.md is read in full at every session start. Now the agent also has 30 skills installed. You ask it one question. What does it read before answering?',
    options: [
      { label: 'All 30 skills in full, so it has everything it might need',
        feedback: 'That would fill the context with pages of irrelevant instructions on every turn, costing tokens and distracting the model. Harnesses that support skills typically show only short descriptions up front.' },
      { label: 'Thirty short descriptions, then the full text of only the skills that match', correct: true,
        feedback: 'Right. In typical harnesses the names and descriptions stay in view, like a table of contents. A skill\'s full text loads when the model judges it fits the task (or someone invokes it by name), so the description largely decides whether your skill gets used.' },
    ],
    after: 'Below, a crude word-overlap scorer stands in for that matching. Guess first, then look at the scores.',
  };

  static literacies = {
    read: 'You read four skill descriptions and predict which one each request will load.',
    write: 'You rewrite a jargon-heavy description in the words a student would use, until the missed request finds it.',
    count: 'Before the tally, you estimate how many tokens the descriptions cost every session, then scale it to 30 skills.',
  };

  static css = `
    .reqs { display: grid; gap: 0.35rem; }
    .reqs button { text-align: left; }
    .reqs button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    .reqs .mark { float: right; font-weight: 400; color: var(--lit-muted); }
    .guess { margin: 0.6rem 0; }
    .guess button { font-family: var(--lit-font-mono); font-size: 0.85rem; }
    .skills { display: grid; gap: 0.5rem; margin-top: 0.6rem; }
    .skill { border-left: 4px solid var(--lit-border); }
    .skill[data-loads="true"] { border-left-color: var(--lit-work); background: var(--lit-work-tint); }
    .skill h4 { margin: 0 0 0.25rem; font: 600 0.9rem var(--lit-font-mono); display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .skill .badge { font: 600 0.75rem var(--lit-font-ui); color: var(--lit-muted); }
    .skill[data-loads="true"] .badge { color: var(--lit-work); }
    .skill p { margin: 0; font-size: 0.88rem; }
    textarea { width: 100%; font: 0.88rem/1.4 var(--lit-font-mono); color: var(--lit-fg); background: var(--lit-bg);
      border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.4rem; resize: vertical; }
    textarea:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 2px; }
    .hits { font-size: 0.8rem; margin-top: 0.3rem; }
    mark { background: var(--lit-work-tint); color: var(--lit-fg); border-bottom: 2px solid var(--lit-work); padding: 0 1px; }
    .pips { display: inline-flex; gap: 3px; vertical-align: middle; margin-right: 0.35rem; }
    .pips i { width: 0.7rem; height: 0.7rem; border-radius: 2px; border: 1px solid var(--lit-border); }
    .pips i.on { background: var(--lit-work); border-color: var(--lit-work); }
    .pips i.th { border-color: var(--lit-fg); border-style: dashed; }
    .ctx { margin-top: 0.75rem; font-size: 0.85rem; }
    .ctx .bar { display: inline-block; height: 0.7rem; vertical-align: middle; margin-right: 0.4rem; }
    .ctx .full { background: var(--lit-border); }
    .warn { color: var(--lit-bad); font-size: 0.85rem; }
    .ok { color: var(--lit-good); font-size: 0.85rem; }
    .ctx input { width: 5rem; padding: 0.3rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
  `;

  mount(root) {
    this.descs = Object.fromEntries(SKILLS.map(s => [s.id, s.desc]));
    this.guesses = {};          // request index -> guessed id
    this.current = null;
    this.edited = false;
    this.costGuess = null;      // { said, was }: description tokens estimated vs tallied
    this.estInput = h('input', { type: 'number', min: 1, step: 1, inputmode: 'numeric', 'aria-label': 'Estimated tokens for all four descriptions',
      onkeydown: e => { if (e.key === 'Enter') this.lockGuess(); } });

    this.reqBox = h('div', { class: 'reqs', role: 'group', 'aria-label': 'Incoming requests' });
    this.guessBox = h('div', { class: 'guess', 'aria-live': 'polite' });
    this.skillBox = h('div', { class: 'skills' });
    this.ctxBox = h('div', { class: 'ctx card' });
    this.fixBox = h('div', { 'aria-live': 'polite' });

    root.append(
      h('p', { class: 'muted', style: { margin: '0 0 0.4rem' } }, 'Incoming requests (pick one):'),
      this.reqBox, this.guessBox, this.fixBox,
      h('p', { class: 'muted', style: { margin: '0.6rem 0 0', fontSize: '0.8rem' } },
        `Simplified scorer: it counts content words shared by the request and each description, and loads the top skill if it shares at least ${THRESHOLD}. Real agents let the model judge, which copes better with synonyms, but a description written in tool jargon still gets missed.`),
      this.skillBox, this.ctxBox,
    );
    this.render();
  }

  pick(i) { this.current = i; this.render(); }

  lockGuess() {
    const n = Math.round(Number(this.estInput.value));
    if (!(n >= 1)) { this.estInput.focus(); return; }
    this.costGuess = { said: n, was: SKILLS.reduce((a, s) => a + tokens(this.descs[s.id]), 0) };
    this.render();
    this.check();
  }

  guess(id) {
    this.guesses[this.current] = id;
    this.render();
    this.check();
  }

  render() {
    const routes = REQUESTS.map(r => route(r.text, this.descs));
    this.reqBox.replaceChildren(...REQUESTS.map((r, i) => {
      const g = i in this.guesses;
      const got = loadedId(routes[i]);
      const mark = !g ? '' : got === r.want ? 'routed' : 'missed';
      return h('button', { type: 'button', 'aria-pressed': String(this.current === i), onclick: () => this.pick(i) },
        r.text, mark ? h('span', { class: 'mark' }, mark) : null);
    }));

    const i = this.current;
    const revealed = i != null && i in this.guesses;
    if (i == null) this.guessBox.replaceChildren();
    else if (!revealed) {
      this.guessBox.replaceChildren(
        h('div', { style: { marginBottom: '0.3rem' } }, h('strong', {}, 'Your guess: '), 'which skill loads?'),
        h('div', { class: 'row' }, ...SKILLS.map(s => h('button', { type: 'button', onclick: () => this.guess(s.id) }, s.id)),
          h('button', { type: 'button', onclick: () => this.guess(null) }, 'none')));
    } else {
      const got = loadedId(routes[i]);
      const g = this.guesses[i];
      this.guessBox.replaceChildren(h('div', {},
        h('strong', {}, `You guessed ${g || 'none'}. `),
        got === 'tie' ? 'Two skills tie, so both load.' : `Loaded: ${got || 'none'}. `,
        REQUESTS[i].want === got ? '' : h('span', { class: 'warn' }, `The intended route was ${REQUESTS[i].want || 'none'}.`)));
    }

    const scores = revealed ? routes[i] : null;
    const rw = i != null ? words(REQUESTS[i].text) : new Set();
    // Cards are built once and updated in place, so the textarea keeps focus while typing.
    if (!this.cards) {
      this.cards = SKILLS.map(s => {
        const c = { badge: h('span', { class: 'badge' }), desc: h('p', {}), hits: h('div', { class: 'hits' }) };
        if (s.editable) {
          c.ta = h('textarea', { rows: 3, 'aria-label': `Description of ${s.id} (editable)`, spellcheck: 'false',
            oninput: () => { this.descs[s.id] = c.ta.value; this.edited = true; this.render(); this.check(); } });
          c.ta.value = this.descs[s.id];
          c.desc = h('div', {}, h('div', { class: 'muted', style: { fontSize: '0.78rem' } }, 'description (editable):'), c.ta);
        }
        c.el = h('div', { class: 'card skill' }, h('h4', {}, h('span', {}, `${s.id}/SKILL.md`), c.badge), c.desc, c.hits);
        return c;
      });
      this.skillBox.append(...this.cards.map(c => c.el));
    }
    SKILLS.forEach((s, k) => {
      const c = this.cards[k];
      const sc = scores?.find(x => x.id === s.id);
      c.el.dataset.loads = String(!!sc?.loads);
      c.badge.textContent = !sc ? `body ~${s.body.toLocaleString()} tokens` : sc.loads ? 'loads full text' : 'stays closed';
      if (!s.editable) c.desc.replaceChildren(...this.highlight(this.descs[s.id], revealed ? rw : new Set()));
      c.hits.hidden = !sc;
      if (sc) c.hits.replaceChildren(
        h('span', { class: 'pips', 'aria-hidden': 'true' },
          ...[1, 2, 3, 4].map(n => h('i', { class: (n <= sc.hits.length ? 'on' : '') + (n === THRESHOLD ? ' th' : '') }))),
        `${sc.hits.length} shared word${sc.hits.length === 1 ? '' : 's'}`,
        sc.hits.length ? `: ${sc.hits.join(', ')}` : '');
    });
    this.renderContext(routes);
    this.renderFix(routes);
  }

  highlight(text, rw) {
    return text.split(/(\s+)/).map(part => rw.has(stem(part)) && !STOP.has(stem(part)) ? h('mark', {}, part) : part);
  }

  renderContext(routes) {
    const i = this.current;
    const descTok = SKILLS.reduce((a, s) => a + tokens(this.descs[s.id]), 0);
    const loaded = i != null && i in this.guesses ? routes[i].filter(s => s.loads) : [];
    const bodyTok = loaded.reduce((a, s) => a + SKILLS.find(x => x.id === s.id).body, 0);
    const now = AGENTS_TOKENS + descTok + bodyTok;
    const all = AGENTS_TOKENS + descTok + SKILLS.reduce((a, s) => a + s.body, 0);
    const pct = x => `${Math.max(1, Math.round(100 * x / all))}%`;
    if (!this.costGuess) {
      this.ctxBox.replaceChildren(
        h('div', { style: { fontWeight: 600, marginBottom: '0.3rem' } }, 'Estimate before the tally'),
        h('p', { style: { margin: '0 0 0.3rem' } }, 'The four descriptions above are read at the start of every session, whether or not any skill loads. At roughly 4 characters per token, how many tokens do they cost together?'),
        h('div', { class: 'row' }, this.estInput, h('button', { type: 'button', onclick: () => this.lockGuess() }, 'Check my estimate')));
      return;
    }
    const { said, was } = this.costGuess, r = said / was;
    const verdict = r > 0.7 && r < 1.4 ? 'within about a third' : `your figure was about ${(r > 1 ? r : 1 / r).toFixed(1)} times ${r > 1 ? 'higher' : 'lower'}`;
    this.ctxBox.replaceChildren(
      h('p', { style: { margin: '0 0 0.5rem' } }, `You estimated ${said} tokens; the four descriptions came to about ${was} (${verdict}). `,
        `At 30 skills of this size, that is roughly ${(Math.round(was / 4 * 30 / 10) * 10).toLocaleString()} tokens every session before any skill loads, at this rough rate.`),
      h('div', { style: { fontWeight: 600, marginBottom: '0.3rem' } }, 'Read this turn (rough tokens, characters ÷ 4)'),
      h('div', { class: 'num' }, `AGENTS.md ${AGENTS_TOKENS} (always) + descriptions ${descTok} (always) + skill text ${bodyTok} (on demand) = `, h('strong', {}, now.toLocaleString())),
      h('div', { style: { marginTop: '0.3rem' } }, h('span', { class: 'bar', style: { width: pct(now) } }), h('span', { class: 'muted' }, 'this turn')),
      h('div', {}, h('span', { class: 'bar full', style: { width: '100%', maxWidth: '70%' } }), h('span', { class: 'muted' }, `if every skill loaded: ${all.toLocaleString()}`)),
    );
  }

  renderFix(routes) {
    const lect = REQUESTS.findIndex(r => r.want === 'yuja-captions');
    if (!(lect in this.guesses)) { this.fixBox.replaceChildren(); return; }
    const fixed = loadedId(routes[lect]) === 'yuja-captions';
    const stolen = REQUESTS.map((r, j) => [r, loadedId(routes[j])]).filter(([r, got]) => r.want !== 'yuja-captions' && got !== r.want);
    this.fixBox.replaceChildren(h('div', { class: 'card', style: { marginTop: '0.5rem' } },
      fixed ? h('div', { class: 'ok' }, 'The lecture request now loads yuja-captions.')
        : h('div', {}, h('strong', {}, 'A miss. '), "You know YuJa hosts lecture recordings; the description doesn't say so. Edit it below in the words a student would use, until the lecture request scores at least 2."),
      ...stolen.map(([r]) => h('div', { class: 'warn' }, `Now misrouted: "${r.text}" Keep the description specific.`))));
  }

  check() {
    const routes = REQUESTS.map(r => route(r.text, this.descs));
    const guessed = Object.keys(this.guesses).length;
    const allRight = REQUESTS.every((r, j) => loadedId(routes[j]) === r.want);
    const done = guessed + (allRight && this.edited ? 1 : 0) + (this.costGuess ? 1 : 0);
    if (done >= REQUESTS.length + 2) {
      this.complete('In this simulation, a description in tool jargon missed a request until it used a student\'s words. Real harnesses let the model judge, often with the name in view too, but the description is still most of what it has before deciding.');
    } else {
      this.progress(done, REQUESTS.length + 2, guessed < REQUESTS.length
        ? `${guessed} of ${REQUESTS.length} requests guessed`
        : !(allRight && this.edited) ? 'Now fix the missed request by editing the description'
        : 'Estimate what the descriptions cost every session');
    }
  }
}

customElements.define('x-skills-a', SkillsA);
