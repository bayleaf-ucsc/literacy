// Agents, spin A: an instrument. One request, two switches (reasoning, tools),
// and a timeline of the blocks the model and its tools write, with token counts,
// latency and a simulated quality check. All content is canned.
import { Explorable, h, fmt } from '../js/kit.js';

// Illustrative rates, not any product's measured speed.
const WRITE_TPS = 60;     // tokens written per second
const READ_TPS = 4000;    // tokens read per second (reading is much faster than writing)
const TOOL_MS = 1500;     // time for a tool to run
const SYSTEM = 600, TOOL_DEFS = 900, REQUEST = 40;

const REQ_TEXT = 'My seminar has 23 students and the library study rooms hold 8 each. How many rooms do we need, and can we get them Thursday at 2pm?';

const KINDS = {
  read: { label: 'Reading the context' },
  think: { label: 'Reasoning', who: 'model writes, hidden from you' },
  call: { label: 'Tool call', who: 'model writes, hidden from you' },
  result: { label: 'Tool result', who: 'the tool writes, hidden from you' },
  reply: { label: 'Reply', who: 'model writes, shown to you' },
};

const SEARCH_2 = 'rooms.search(day="Thu", start="14:00", seats=8)';
const RESULT_2 = '3120 (8 seats)  free 13:00 to 17:00\n3124 (8 seats)  free 14:00 to 16:00\n3130 (8 seats)  booked until 15:00';

const RUNS = {
  '00': {
    blocks: [{ kind: 'reply', tokens: 38, text: 'You will need 3 rooms (23 / 8 rounds up to 3). Thursday afternoons are usually quiet at the library, so 2pm should be fine.' }],
    checks: [true, false, false, false],
  },
  '10': {
    blocks: [
      { kind: 'think', tokens: 150, text: '23 students, 8 per room. Two rooms seat 16, which leaves 7 people, so 3 rooms. If the instructor comes too that is 24, still exactly 3.\nAvailability: I cannot see the booking system. I should not guess. Say so and say where to check.' },
      { kind: 'reply', tokens: 52, text: 'You need 3 rooms (two rooms seat only 16). I cannot see the library booking system, so I cannot tell you whether three are free Thursday at 2pm. The room booking page will show that.' },
    ],
    checks: [true, null, null, true],
  },
  '01': {
    blocks: [
      { kind: 'call', tokens: 28, text: SEARCH_2 },
      { kind: 'result', tokens: 120, text: RESULT_2 },
      { kind: 'reply', tokens: 30, text: 'Yes: rooms 3120 and 3124 are free Thursday at 2pm. Want me to book them?' },
    ],
    checks: [false, true, false, true],
  },
  '11': {
    blocks: [
      { kind: 'think', tokens: 80, text: '23 students, 8 per room: two rooms seat 16, so 3 rooms. I should check what is actually free instead of guessing.' },
      { kind: 'call', tokens: 28, text: SEARCH_2 },
      { kind: 'result', tokens: 120, text: RESULT_2 },
      { kind: 'think', tokens: 110, text: 'Only two rooms are free at 2pm; 3130 is booked until 3pm. 16 seats for 23 people does not work. At 3pm, 3130 opens up and 3124 is free until 4pm. Check 3pm.' },
      { kind: 'call', tokens: 28, text: 'rooms.search(day="Thu", start="15:00", seats=8)' },
      { kind: 'result', tokens: 110, text: '3120 (8 seats)  free 13:00 to 17:00\n3124 (8 seats)  free 14:00 to 16:00\n3130 (8 seats)  free 15:00 to 18:00' },
      { kind: 'think', tokens: 60, text: 'At 3pm all three are free until 4pm. Offer that, and say plainly why 2pm fails.' },
      { kind: 'reply', tokens: 66, text: 'You need 3 rooms (two seat only 16). At 2pm only two are free, so 7 people would have nowhere to sit. At 3pm, rooms 3120, 3124 and 3130 are all free until 4pm. Want me to hold those three for 3 to 4pm?' },
    ],
    checks: [true, true, true, true],
  },
};
const CHECKS = ['Right number of rooms', 'Based on the real booking system', 'Catches the 2pm conflict and offers a plan', 'Makes nothing up'];
// null marks a check the setting honestly did not attempt (no booking access), not a failure.
const MARK = { true: 'met', false: 'missed', null: 'not tried' };

// Which setting the learner would pick for this request. Two are defensible.
const CHOICE = {
  '00': { ok: false, why: 'Fast, but it made up the availability: nothing it said about 2pm came from the booking system.' },
  '10': { ok: true, why: 'Defensible. The count is right and it says plainly what it cannot see, so you check the booking page yourself. The model never touches the booking system, and it finishes in a fraction of the time.' },
  '01': { ok: false, why: 'It looked things up, but answered the wrong question: two rooms for 23 people.' },
  '11': { ok: true, why: 'Defensible. It found a plan that works, at many times the time and reading, and it now offers to hold rooms: whether it may act on the booking system is a permission you, or someone, grants.' },
};
const NAME = { '00': 'Both off', '10': 'Reasoning only', '01': 'Tools only', '11': 'Both on' };

// Walk the blocks the way an inference engine would: every model call starts by
// reading the whole context so far; a tool result ends a call.
function simulate(key) {
  const tools = key[1] === '1';
  let ctx = SYSTEM + REQUEST + (tools ? TOOL_DEFS : 0);
  let read = 0, written = 0, calls = 0, ms = 0, fresh = true, shown = 0;
  const segs = [];
  for (const b of RUNS[key].blocks) {
    if (b.kind === 'result') { ctx += b.tokens; ms += TOOL_MS; segs.push({ kind: 'result', ms: TOOL_MS }); fresh = true; continue; }
    if (fresh) { read += ctx; calls++; const r = ctx / READ_TPS * 1000; ms += r; segs.push({ kind: 'read', ms: r }); fresh = false; }
    written += b.tokens; ctx += b.tokens;
    const w = b.tokens / WRITE_TPS * 1000; ms += w; segs.push({ kind: b.kind, ms: w });
    if (b.kind === 'reply') shown = b.tokens;
  }
  return { read, written, calls, ms, segs, shown };
}
// How close an estimate came, as a factor: "within 20%" or "off by a factor of 3".
function closeness(guess, actual) {
  const f = Math.max(guess, actual) / Math.max(Math.min(guess, actual), 1e-9);
  return f < 1.25 ? `within ${Math.round((f - 1) * 100)}%` : `off by a factor of ${f.toFixed(1).replace(/\.0$/, '')}`;
}
const SIMS = Object.fromEntries(Object.keys(RUNS).map(k => [k, simulate(k)]));
const MAX_MS = Math.max(...Object.values(SIMS).map(s => s.ms));

class AgentsA extends Explorable {
  static prediction = {
    question: 'With reasoning and tools both switched on, how many tokens does the model process compared with the reply you read?',
    options: [
      { label: 'A bit more than the reply', correct: false,
        feedback: 'It seems that way because the reply is all you see. But each tool result ends one model call and starts another that reads the whole context again, and the reasoning and tool traffic are hidden. Here the model handles about 80 times the tokens of its reply, and real system prompts are often much longer.' },
      { label: 'Many times more than the reply', correct: true,
        feedback: 'Right. Hidden reasoning, tool calls and tool results all enter the context, and every new model call reads that context from the top. The reply is a small tip on a large pile.' },
    ],
    after: 'Estimate one number, then flip the two switches and compare all four combinations. Open the hidden blocks to read them.',
  };

  static literacies = {
    read: 'You open and read the hidden reasoning, tool calls and tool results behind each reply.',
    write: 'You write the booking search yourself as a tool call, then compare it with the model\'s.',
    count: 'You estimate how long the reply takes with both switches on before you see it, then see how close you were.',
  };

  static css = `
    .req { font-style: italic; }
    .toggles { margin: 0.75rem 0; }
    .toggles button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .strip { display: flex; height: 1.4rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); overflow: hidden; background: var(--lit-surface-2); }
    .strip span { height: 100%; transition: width 0.3s; }
    .k-read { background: var(--lit-border); }
    .k-think { background: var(--lit-teach); }
    .k-call { background: var(--lit-argue); }
    .k-result { background: var(--lit-muted); }
    .k-reply { background: var(--lit-work); }
    .legend { font-size: 0.8rem; margin: 0.3rem 0 0.75rem; gap: 0.75rem; }
    .legend i { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 2px; vertical-align: -0.1rem; margin-right: 0.25rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
    .stat { background: var(--lit-surface-2); border-radius: var(--lit-radius); padding: 0.4rem 0.6rem; }
    .stat .v { font-size: 1.15rem; font-weight: 650; font-variant-numeric: tabular-nums; }
    .stat .l { font-size: 0.78rem; color: var(--lit-muted); }
    .blocks { display: grid; gap: 0.35rem; margin-bottom: 0.75rem; }
    .blk { border-left: 4px solid var(--lit-border); background: var(--lit-surface); border-radius: 0 var(--lit-radius) var(--lit-radius) 0; }
    .blk.think { border-color: var(--lit-teach); } .blk.call { border-color: var(--lit-argue); }
    .blk.result { border-color: var(--lit-muted); } .blk.reply { border-color: var(--lit-work); background: var(--lit-work-tint); }
    .blk > button, .blk > .hd { width: 100%; text-align: left; border: 0; background: none; display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.35rem 0.75rem; }
    .blk .who { font-size: 0.78rem; color: var(--lit-muted); }
    .blk pre { margin: 0; padding: 0 0.75rem 0.6rem; white-space: pre-wrap; font: 0.85rem/1.45 var(--lit-font-mono); }
    .blk.reply p { margin: 0; padding: 0 0.75rem 0.6rem; }
    .checks { list-style: none; padding: 0; margin: 0.3rem 0 0; display: grid; gap: 0.2rem; }
    .checks b { display: inline-block; min-width: 3.6rem; font-size: 0.8rem; }
    .est input { width: 6rem; padding: 0.25rem 0.4rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-surface); }
    .compose { font-family: var(--lit-font-mono); font-size: 0.9rem; line-height: 2.2; overflow-wrap: anywhere; }
    .compose select { font-family: var(--lit-font-mono); padding: 0.15rem 0.25rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-surface); }
    .met { color: var(--lit-good); } .missed { color: var(--lit-bad); } .skip { color: var(--lit-muted); }
    .choose .opts { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem; }
  `;

  mount(root) {
    this.reasoning = false; this.tools = false;
    this.tried = new Set(); this.opened = new Set();
    this.guess = null; this.guessShown = false; this.callOk = false; this.chose = null;
    const toggle = (prop, label) => {
      const b = h('button', { type: 'button', 'aria-pressed': 'false', disabled: true, onclick: () => {
        this[prop] = !this[prop]; b.setAttribute('aria-pressed', String(this[prop]));
        b.textContent = `${label}: ${this[prop] ? 'on' : 'off'}`; this.update();
      } }, `${label}: off`);
      return b;
    };
    this.strip = h('div', { class: 'strip', role: 'img' });
    this.stats = h('div', { class: 'stats', 'aria-live': 'polite' });
    this.blocks = h('div', { class: 'blocks' });
    this.checks = h('ul', { class: 'checks' });
    this.toggles = [toggle('reasoning', 'Reasoning'), toggle('tools', 'Tools')];

    // Count: estimate the slowest setting's time before seeing it.
    const est = h('input', { type: 'number', min: 0, max: 600, step: 0.5, inputmode: 'decimal', 'aria-label': 'Your estimate in seconds',
      oninput: () => { lockEst.disabled = !(est.value !== '' && +est.value > 0); } });
    const lockEst = h('button', { type: 'button', class: 'primary', disabled: true, onclick: () => {
      this.guess = +est.value; est.disabled = lockEst.disabled = true;
      this.toggles.forEach(b => { b.disabled = false; });
      this.estNote.textContent = `Locked in: ${this.guess} s. Now switch both on to find out.`;
      this.toggles[0].focus(); this.report();
    } }, 'Lock in my time estimate');
    this.estNote = h('div', { class: 'muted', style: { fontSize: '0.85rem', marginTop: '0.3rem' }, 'aria-live': 'polite' }, 'The switches unlock once you estimate.');
    const estCard = h('div', { class: 'card est', style: { marginTop: '0.75rem' } },
      h('strong', {}, 'Estimate first: '),
      `with both switches off, the reply below is done in ${(SIMS['00'].ms / 1000).toFixed(1)} s. With reasoning and tools both on, how many seconds?`,
      h('div', { class: 'row', style: { marginTop: '0.4rem' } }, est, h('span', {}, 'seconds'), lockEst), this.estNote);

    // Write: compose the booking search as a tool call.
    const pick = (label, opts) => h('select', { 'aria-label': label }, h('option', { value: '' }, '?'), ...opts.map(o => h('option', { value: o }, `"${o}"`)));
    const day = pick('day', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']), start = pick('start', ['13:00', '14:00', '15:00']);
    const seats = h('select', { 'aria-label': 'seats' }, h('option', { value: '' }, '?'), ...['8', '16', '23'].map(o => h('option', { value: o }, o)));
    const callFb = h('p', { 'aria-live': 'polite', style: { margin: '0.4rem 0 0' } });
    const send = h('button', { type: 'button', onclick: () => {
      const ok = [day.value === 'Thu', start.value === '14:00', seats.value === '8'];
      if (ok.every(Boolean)) {
        this.callOk = true; [day, start, seats, send].forEach(x => { x.disabled = true; });
        callFb.replaceChildren(h('strong', { class: 'met' }, 'That is the call the model writes. '),
          'A tool call is only text like this; the app reads it and runs the search. Turn tools on and open a tool call block to compare.');
        this.report();
      } else callFb.replaceChildren(h('strong', { class: 'missed' }, 'Not yet. '),
        !ok[0] || !ok[1] ? 'Check the day and time in the request. ' : '',
        !ok[2] ? 'The search looks for single rooms, and each holds 8; counting how many to book is the model\'s job, not the tool\'s.' : '');
    } }, 'Check my call');
    const callCard = h('div', { class: 'card', style: { marginBottom: '0.75rem' } },
      h('strong', {}, 'Your turn to write a tool call'),
      h('div', { class: 'muted', style: { fontSize: '0.85rem' } }, 'Fill in the search the model should send to the booking system.'),
      h('div', { class: 'compose' }, 'rooms.search(day=', day, ', start=', start, ', seats=', seats, ')'),
      h('div', { class: 'row' }, send), callFb);

    root.append(
      h('div', { class: 'card' }, h('div', { class: 'muted', style: { fontSize: '0.8rem' } }, 'Simulated request'), h('div', { class: 'req' }, REQ_TEXT)),
      estCard,
      h('div', { class: 'row toggles', role: 'group', 'aria-label': 'Model settings' }, ...this.toggles),
      h('div', { class: 'muted', style: { fontSize: '0.8rem', marginBottom: '0.25rem' } }, 'Time from send to finished reply (same scale for every setting)'),
      this.strip,
      h('div', { class: 'row legend muted' }, ...['read', 'think', 'call', 'result', 'reply'].map(k =>
        h('span', {}, h('i', { class: `k-${k}` }), k === 'result' ? 'Tool running' : KINDS[k].label))),
      this.stats,
      h('div', { class: 'muted', style: { fontSize: '0.8rem', marginBottom: '0.25rem' } }, 'What was written, in order (open a block to read it)'),
      this.blocks,
      callCard,
      h('div', { class: 'card' }, h('strong', {}, 'Simulated answer quality'), this.checks),
      this.chooseCard(),
      h('p', { class: 'muted', style: { fontSize: '0.78rem' } }, 'Speeds, token counts and outputs are illustrative. Real models vary widely, and a model without reasoning often gets this right.'),
    );
    this.update();
  }

  update() {
    const key = `${+this.reasoning}${+this.tools}`;
    const sim = SIMS[key], run = RUNS[key];
    this.tried.add(key);
    this.strip.replaceChildren(...sim.segs.map(s => h('span', { class: `k-${s.kind}`, style: { width: `${(s.ms / MAX_MS) * 100}%` } })));
    this.strip.setAttribute('aria-label', `Timeline: ${(sim.ms / 1000).toFixed(1)} seconds`);
    const stat = (v, l) => h('div', { class: 'stat' }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l));
    this.stats.replaceChildren(
      stat(`${(sim.ms / 1000).toFixed(1)} s`, 'until the reply is done'),
      stat(String(sim.calls), sim.calls === 1 ? 'model call' : 'model calls'),
      stat(fmt.n(sim.read), 'tokens read (each call reads all so far)'),
      stat(String(sim.written), 'tokens written by the model'),
      stat(String(sim.shown), 'tokens in the reply you see'),
    );
    this.blocks.replaceChildren(...run.blocks.map(b => {
      if (b.kind === 'reply') return h('div', { class: 'blk reply' },
        h('div', { class: 'hd' }, h('span', {}, h('strong', {}, 'Reply'), ' ', h('span', { class: 'who' }, KINDS.reply.who)), h('span', { class: 'num' }, `${b.tokens} tok`)),
        h('p', {}, b.text));
      const body = h('pre', { hidden: true }, b.text);
      const btn = h('button', { type: 'button', 'aria-expanded': 'false', onclick: () => {
        const open = body.hidden; body.hidden = !open; btn.setAttribute('aria-expanded', String(open));
        if (open) { this.opened.add(b.kind); this.report(); }
      } }, h('span', {}, h('strong', {}, KINDS[b.kind].label), ' ', h('span', { class: 'who' }, KINDS[b.kind].who)), h('span', { class: 'num' }, `${b.tokens} tok`));
      return h('div', { class: `blk ${b.kind}` }, btn, body);
    }));
    this.checks.replaceChildren(...CHECKS.map((c, i) => h('li', {},
      h('b', { class: { true: 'met', false: 'missed', null: 'skip' }[run.checks[i]] }, MARK[run.checks[i]]), c)));
    if (key === '11' && this.guess != null && !this.guessShown) {
      this.guessShown = true;
      const s = sim.ms / 1000;
      this.estNote.textContent = `You estimated ${this.guess} s; it took ${s.toFixed(1)} s, ${closeness(this.guess, s)}. That is ${Math.round(sim.ms / SIMS['00'].ms)} times the plain reply.`;
    }
    this.report();
  }

  // Write: after trying all four, the learner picks a setting for this request.
  chooseCard() {
    const fb = h('div', { 'aria-live': 'polite', style: { marginTop: '0.4rem' } });
    const opts = h('div', { class: 'opts' }, ...Object.keys(NAME).map(k => h('button', { type: 'button', disabled: true, onclick: e => {
      const c = CHOICE[k];
      fb.replaceChildren(h('strong', { class: c.ok ? 'met' : 'missed' }, `${NAME[k]}: `), c.why);
      if (!c.ok) { e.currentTarget.disabled = true; this.rejected = true; this.report(); return; }
      this.chose = k; opts.querySelectorAll('button').forEach(b => { b.disabled = true; });
      this.report();
    } }, NAME[k])));
    this.chooseBtns = opts;
    return h('div', { class: 'card choose', style: { marginTop: '0.75rem' } },
      h('strong', {}, 'Which setting would you use for this request?'),
      h('div', { class: 'muted', style: { fontSize: '0.85rem' } }, 'Unlocks once you have tried all four switch combinations above. More than one answer is reasonable.'),
      opts, fb);
  }

  report() {
    const kinds = ['think', 'call', 'result'].filter(k => this.opened.has(k)).length;
    if (this.tried.size === 4 && this.chose == null && this.chooseBtns && !this.chooseBtns.dataset.open) {
      this.chooseBtns.dataset.open = '1'; this.chooseBtns.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }
    const done = this.tried.size + kinds + this.guessShown + this.callOk + (this.chose != null);
    if (done >= 10) {
      this.complete(`A one-paragraph reply can rest on several model calls, hidden reasoning and tool results, so the model processes far more than you read. Here reasoning alone gave an honest partial answer and reasoning plus tools a complete one at about ${Math.round(SIMS['11'].ms / SIMS['10'].ms)} times the time; you chose ${NAME[this.chose].toLowerCase()}, and with tools on, what the model may do in the booking system is the next question.`);
      return;
    }
    const need = [];
    if (this.guess == null) need.push('make your estimate');
    else if (!this.guessShown) need.push('switch both on to check your estimate');
    if (!this.callOk) need.push('write the tool call');
    if (this.tried.size < 4) need.push(`switch combinations tried: ${this.tried.size} of 4 (not yet: ${Object.keys(NAME).filter(k => !this.tried.has(k)).map(k => NAME[k].toLowerCase()).join(', ')})`);
    if (kinds < 3) need.push(`open a reasoning block, a tool call and a tool result (${kinds} of 3)`);
    if (this.chose == null) need.push(this.rejected ? 'choose another setting for this request: that one did not hold up' : 'choose a setting for this request');
    this.progress(done, 10, need.join('; ') + '.');
  }
}

customElements.define('x-agents-a', AgentsA);
