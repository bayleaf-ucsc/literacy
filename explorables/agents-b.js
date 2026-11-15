// Agents, spin B: a story told twice. Step through one agent trace block by
// block, watching two panes: what your chat screen shows, and what the model
// actually processes. Three checkpoints ask what happens next. Canned trace.
import { Explorable, h, fmt } from '../js/kit.js';

const PREAMBLE = 1800; // instructions and tool descriptions, written by the app's makers

const TRACE = [
  { kind: 'user', tokens: 22, text: 'Can you move my Thursday 1:1 with Priya to Friday and let her know?' },
  { kind: 'think', tokens: 85, text: 'The 1:1 is Thursday 11:00 to 11:30. I need a Friday slot when both of us are free. Check both calendars.' },
  { kind: 'call', tokens: 34, chip: 'Checked calendars', text: 'calendar.find_free(people=["me", "priya"], day="Fri", minutes=30)',
    ask: { q: 'The model has just finished writing a tool call. What happens next?', options: [
      { label: 'The model keeps writing, and imagines what the calendars say', correct: false,
        feedback: 'That would be a guess dressed up as a lookup. A trained agent stops at the end-of-call marker instead.' },
      { label: 'Generation pauses; the app runs the search and pastes the result into the context', correct: true,
        feedback: 'Right. The model only writes a description of the action. Software around it carries it out, and the result becomes more text for the model to read.' },
    ] } },
  { kind: 'result', tokens: 150, text: 'Friday, both free:\n  09:00 to 09:30\n  10:00 to 10:30\n  14:00 to 15:00' },
  { kind: 'think', tokens: 95, text: '9:00 is early and Priya teaches at 9:30. 10:00 fits 30 minutes. Move the event there.' },
  { kind: 'call', tokens: 30, chip: 'Moved an event', text: 'calendar.move_event(id="evt_8812", start="Fri 10:00")' },
  { kind: 'result', tokens: 22, text: '{"ok": true, "attendees_notified": false}',
    ask: { q: 'Your screen still shows only your own message and a couple of small labels. Has anything changed outside this chat?', options: [
      { label: 'Not yet: so far it is all text in the context', correct: false,
        feedback: 'The trace is text, but the tool call it contains was carried out. That is what makes it an agent rather than a chatbot.' },
      { label: 'Yes: your real calendar now says Friday at 10', correct: true,
        feedback: 'Right. A tool call is text that the app turns into an action. The interface still looks like talking, but the calendar has changed.' },
    ] } },
  { kind: 'think', tokens: 110, text: 'Moved. The calendar did not notify her, so send a short, friendly email. Keep the tone casual; they meet weekly.' },
  { kind: 'call', tokens: 85, chip: 'Sent an email', text: 'email.send(to="priya@example.edu",\n  subject="Moving our 1:1 to Friday",\n  body="Hi Priya, I moved our Thursday 1:1 to Friday 10:00 to 10:30. Hope that works! If not, just pick another time.")',
    ask: { q: 'This email goes out in your name. Who has read it before it is sent?', options: [
      { label: 'You have: the app shows it to you first', correct: false,
        feedback: 'Some apps do ask before sending, but this one did not. Look at your screen pane: you have seen a label, not the email.' },
      { label: 'Only the model: you will see at most a small "Sent an email" label', correct: true,
        feedback: 'Right. Whether an agent asks before acting is a setting someone chose, often not you. Here the email was written and sent to Priya before you saw a word of it.' },
    ] } },
  { kind: 'result', tokens: 18, text: '{"sent": true, "id": "msg_40117"}' },
  { kind: 'reply', tokens: 28, text: 'Done: your 1:1 with Priya is now Friday 10:00 to 10:30, and I emailed her to let her know.' },
];

const LABEL = { user: 'You', think: 'Reasoning', call: 'Tool call', result: 'Tool result', reply: 'Reply' };
const WHO = { user: 'you wrote', think: 'model wrote', call: 'model wrote', result: 'tool wrote', reply: 'model wrote' };
const ASKS = TRACE.filter(s => s.ask).length;
const SEEN = TRACE.filter(s => s.kind === 'user' || s.kind === 'reply').reduce((a, s) => a + s.tokens, 0);
const FINAL_CTX = TRACE.reduce((a, s) => a + s.tokens, PREAMBLE);
// The three actions, for the approval policy the learner writes at the end and
// the replay that runs the same request under it.
const ACTIONS = [
  { name: 'calendar.find_free', does: 'reads your calendar and Priya\'s', call: TRACE[2].text,
    asks: 'The agent wants to read your calendar and Priya\'s to find a free Friday slot.' },
  { name: 'calendar.move_event', does: 'changes your calendar', call: TRACE[5].text,
    asks: 'The agent wants to move your Thursday 1:1 to Friday 10:00 to 10:30.' },
  { name: 'email.send', does: 'speaks in your name', call: TRACE[8].text,
    asks: 'The agent wants to send this email to Priya in your name.' },
];
// What the agent says and what has changed, by how far the replay got (index of
// the first action that did not run; 3 means all ran). Canned, like the trace.
const OUTCOME = [
  { reply: 'I could not check calendars, so I have not moved anything. Which Friday time would you like?',
    world: 'Nothing changed: no calendar was read, the meeting is still Thursday, and Priya heard nothing.' },
  { reply: 'You and Priya are both free Friday at 9:00, 10:00 and 14:00. I have not moved the meeting; want me to?',
    world: 'The agent read both calendars (Priya\'s free times included). The meeting is still Thursday and Priya heard nothing.' },
  { reply: 'Your 1:1 is now Friday 10:00 to 10:30. I did not email Priya, and the calendar did not notify her.',
    world: 'Your calendar changed, but Priya was not told: she may still expect Thursday. That gap is now yours to close.' },
  { reply: TRACE.at(-1).text,
    world: 'Your calendar changed and an email went to Priya in your name.' },
];
const VERB = { free: 'ran without asking', yes: 'ran after you approved', no: 'you refused', never: 'blocked by your policy', skip: 'never attempted' };

// How close an estimate came, as a factor: "within 20%" or "off by a factor of 3".
function closeness(guess, actual) {
  const f = Math.max(guess, actual) / Math.max(Math.min(guess, actual), 1e-9);
  return f < 1.25 ? `within ${Math.round((f - 1) * 100)}%` : `off by a factor of ${f.toFixed(1).replace(/\.0$/, '')}`;
}

class AgentsB extends Explorable {
  static prediction = {
    question: 'In the last exercise, every model call re-read its whole context. In this agent\'s trace, which kind of text fills most of that context?',
    options: [
      { label: 'Your request and the model\'s own writing', correct: false,
        feedback: 'Those are the parts you picture, but your request is 22 tokens and the model writes about 470. The app\'s built-in instructions and tool descriptions, which you never see, come to 1,800: nearly three quarters of the context.' },
      { label: 'Tool results', correct: false,
        feedback: 'Tool results can be huge (a fetched web page, a whole file), but here they are short, about 190 tokens. The app\'s built-in instructions and tool descriptions, which you never see, come to 1,800: nearly three quarters of the context.' },
      { label: 'The app\'s built-in instructions and tool descriptions', correct: true,
        feedback: 'Right. Before you type a word, the app\'s makers have written about 1,800 tokens you never see. By the end they are nearly three quarters of the context; your request is under 1%.' },
    ],
    after: 'Estimate one number, then step through the trace. Your screen is on the left (or on top); the model\'s context is beside it.',
  };

  static literacies = {
    read: 'You read a trace block by block, comparing your screen with what the model processes.',
    write: 'You write the agent\'s approval policy (run freely, ask first, or never), then replay the request under it, approving or refusing as it asks.',
    count: 'You estimate how many tokens the model reads in total before you send the request, then see how close you were.',
  };

  static css = `
    .counters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-bottom: 0.75rem; }
    .counter { background: var(--lit-surface-2); border-radius: var(--lit-radius); padding: 0.4rem 0.55rem; }
    .counter .v { font-size: 1.15rem; font-weight: 650; font-variant-numeric: tabular-nums; }
    .counter .l { font-size: 0.75rem; color: var(--lit-muted); line-height: 1.3; }
    .pane { min-height: 12rem; }
    .pane h3 { margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--lit-muted); }
    .screen { display: flex; flex-direction: column; gap: 0.5rem; }
    .bubble { padding: 0.45rem 0.7rem; border-radius: 12px; max-width: 92%; }
    .bubble.user { align-self: flex-end; background: var(--lit-teach-tint); }
    .bubble.reply { align-self: flex-start; background: var(--lit-work-tint); }
    .chip { align-self: flex-start; font-size: 0.78rem; color: var(--lit-muted); border: 1px solid var(--lit-border); border-radius: 999px; padding: 0.05rem 0.55rem; }
    .ctx { display: grid; gap: 0.3rem; max-height: 22rem; overflow-y: auto; }
    .b { border-left: 4px solid var(--lit-border); padding: 0.25rem 0.5rem; background: var(--lit-surface-2); border-radius: 0 4px 4px 0; }
    .b.think { border-color: var(--lit-teach); } .b.call { border-color: var(--lit-argue); }
    .b.result { border-color: var(--lit-muted); } .b.reply { border-color: var(--lit-work); } .b.user { border-color: var(--lit-teach); }
    .b .t { font-size: 0.75rem; color: var(--lit-muted); display: flex; justify-content: space-between; gap: 0.5rem; }
    .b pre { margin: 0.15rem 0 0; white-space: pre-wrap; font: 0.8rem/1.4 var(--lit-font-mono); }
    .b.new { outline: 2px solid var(--lit-work); }
    .reread { font-size: 0.75rem; color: var(--lit-muted); text-align: center; border-top: 1px dashed var(--lit-border); padding-top: 0.15rem; }
    .controls { margin-top: 0.75rem; }
    .ask { margin-top: 0.75rem; border-color: var(--lit-work); }
    .ask .opts { display: grid; gap: 0.4rem; margin-top: 0.4rem; }
    .ask .opts button { text-align: left; }
    .ask .fb { margin-top: 0.5rem; }
    .est input { width: 7rem; padding: 0.25rem 0.4rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-surface); }
    .policy { display: grid; gap: 0.4rem; margin-top: 0.4rem; }
    .policy label { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5rem; align-items: center; font-size: 0.9rem; }
    .policy .mono { overflow-wrap: anywhere; }
    .policy select { padding: 0.25rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-surface); }
    .right { color: var(--lit-good); font-weight: 600; } .wrong { color: var(--lit-bad); font-weight: 600; }
    .replay { margin-top: 0.75rem; border-top: 1px dashed var(--lit-border); padding-top: 0.6rem; }
    .replay ol { margin: 0.3rem 0; padding-left: 1.2rem; font-size: 0.9rem; }
    .replay pre { margin: 0.3rem 0; white-space: pre-wrap; font: 0.8rem/1.4 var(--lit-font-mono); background: var(--lit-surface-2); padding: 0.3rem 0.5rem; border-radius: 4px; }
    @media (max-width: 30rem) { .counters { grid-template-columns: 1fr; } }
  `;

  mount(root) {
    this.shown = 0; this.solved = new Set();
    this.guess = null; this.policy = ACTIONS.map(() => ''); this.policyDone = false;
    this.replay = null; this.replayDone = false;
    this.counters = h('div', { class: 'counters', 'aria-live': 'polite' });
    this.screen = h('div', { class: 'screen' });
    this.ctx = h('div', { class: 'ctx' });
    this.controls = h('div', { class: 'controls' });
    root.append(
      this.counters,
      h('div', { class: 'grid2' },
        h('div', { class: 'card pane' }, h('h3', {}, 'Your screen'), this.screen),
        h('div', { class: 'card pane' }, h('h3', {}, 'What the model processes'), this.ctx)),
      this.controls,
      h('p', { class: 'muted', style: { fontSize: '0.78rem' } }, 'Simulated trace; token counts are rough. Real apps differ in what they show you.'),
    );
    this.render();
  }

  // Count as an inference engine would: each model call begins by reading the
  // whole context so far, and a tool result (or your message) starts a new call.
  tally() {
    let ctx = PREAMBLE, read = 0, written = 0, seen = 0, calls = 0, needCall = true;
    for (const s of TRACE.slice(0, this.shown)) {
      if (s.kind === 'user' || s.kind === 'result') { ctx += s.tokens; needCall = true; if (s.kind === 'user') seen += s.tokens; continue; }
      if (needCall) { read += ctx; calls++; needCall = false; }
      written += s.tokens; ctx += s.tokens;
      if (s.kind === 'reply') seen += s.tokens;
    }
    return { read, written, seen, calls };
  }

  render() {
    const t = this.tally();
    const counter = (v, l) => h('div', { class: 'counter' }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l));
    this.counters.replaceChildren(
      counter(String(t.seen), 'tokens of text on your screen'),
      counter(String(t.written), 'tokens the model wrote'),
      counter(fmt.n(t.read), `tokens the model read (${t.calls} ${t.calls === 1 ? 'pass' : 'passes'} from the top)`),
    );

    const visible = TRACE.slice(0, this.shown);
    const working = this.shown > 1 && visible.at(-1).kind !== 'reply';
    this.screen.replaceChildren(...visible.flatMap(s =>
      s.kind === 'user' || s.kind === 'reply' ? [h('div', { class: `bubble ${s.kind}` }, s.text)]
        : s.chip ? [h('span', { class: 'chip' }, s.chip)] : []),
      ...(working ? [h('span', { class: 'chip' }, 'Working...')] : []));

    let needCall = true;
    const rows = [h('div', { class: 'b' }, h('div', { class: 't' }, h('span', {}, 'Instructions and tool descriptions'), h('span', { class: 'num' }, `${PREAMBLE} tok`)),
      h('div', { class: 'muted', style: { fontSize: '0.8rem' } }, 'Written by the app\'s makers. You never see it.'))];
    visible.forEach((s, i) => {
      const model = s.kind !== 'user' && s.kind !== 'result';
      if (model && needCall) rows.push(h('div', { class: 'reread' }, 'new model call: reads everything above'));
      needCall = !model;
      rows.push(h('div', { class: `b ${s.kind}${i === this.shown - 1 ? ' new' : ''}` },
        h('div', { class: 't' }, h('span', {}, `${LABEL[s.kind]}, ${WHO[s.kind]}`), h('span', { class: 'num' }, `${s.tokens} tok`)),
        h('pre', {}, s.text)));
    });
    this.ctx.replaceChildren(...rows);
    this.ctx.scrollTop = this.ctx.scrollHeight;

    const last = visible.at(-1);
    if (this.guess == null) { this.controls.replaceChildren(this.estimateCard()); this.progress(0, ASKS + 3, 'Make your estimate, then send the request.'); return; }
    if (last?.ask && !this.solved.has(last)) this.controls.replaceChildren(this.askCard(last));
    else if (this.shown < TRACE.length) {
      const next = h('button', { type: 'button', class: 'primary', onclick: () => { this.shown++; this.render(); this.focusNext(); } },
        this.shown === 0 ? 'Send the request' : 'Next block');
      this.controls.replaceChildren(h('div', { class: 'row' }, next, h('span', { class: 'muted num' }, `block ${this.shown} of ${TRACE.length}`)));
    } else {
      this.controls.replaceChildren(h('div', { class: 'debrief' },
        `You read ${t.seen} tokens. The model wrote ${t.written} and read ${t.read.toLocaleString('en-US')}, passing over the whole context ${t.calls} times. Along the way it changed a calendar and sent an email in your name.`,
        h('p', { style: { margin: '0.4rem 0 0' } }, `You estimated ${this.guess.toLocaleString('en-US')} tokens read: ${closeness(this.guess, t.read)}.`),
        h('div', { class: 'row', style: { marginTop: '0.5rem' } }, h('button', { type: 'button', onclick: () => {
          this.solved.clear(); this.shown = 0; this.render(); this.focusNext();
        } }, 'Start over'))), this.policyCard());
      this.finish();
      return;
    }
    this.progress(1 + this.solved.size, ASKS + 3, `Block ${this.shown} of ${TRACE.length}; ${this.solved.size} of ${ASKS} checkpoints answered.`);
  }

  finish() {
    if (this.replayDone) this.complete('One sentence on your screen stood on four model calls, each re-reading a growing context, and on actions outside the chat. Replaying the request under your own policy showed which of those actions waited for you and what changed, or did not, when one was refused.');
    else if (this.policyDone) this.progress(2 + ASKS, ASKS + 3, 'Replay the request under your policy to finish.');
    else this.progress(1 + ASKS, ASKS + 3, 'Write the approval policy to finish.');
  }

  estimateCard() {
    const input = h('input', { type: 'number', min: 1, step: 100, inputmode: 'numeric', 'aria-label': 'Your estimate in tokens',
      oninput: () => { lock.disabled = !(input.value !== '' && +input.value > 0); } });
    const lock = h('button', { type: 'button', class: 'primary', disabled: true, onclick: () => {
      this.guess = Math.round(+input.value); this.render(); this.focusNext();
    } }, 'Lock in my token estimate');
    return h('div', { class: 'card est' },
      h('strong', {}, 'Estimate first: '),
      `your screen will end up showing about ${SEEN} tokens (your request and a one-line reply). The model's finished context will be about ${(Math.round(FINAL_CTX / 100) * 100).toLocaleString('en-US')} tokens. In total, how many tokens will the model have read?`,
      h('div', { class: 'row', style: { marginTop: '0.5rem' } }, input, h('span', {}, 'tokens'), lock));
  }

  // Write: the learner composes which actions run freely, ask first, or never run.
  policyCard() {
    const fb = h('div', { 'aria-live': 'polite', style: { marginTop: '0.5rem' } });
    this.replayBox = h('div', { class: 'replay', 'aria-live': 'polite' });
    const explain = () => {
      if (this.policy.some(p => !p)) { fb.replaceChildren(h('span', { class: 'muted' }, 'Choose for all three.')); this.renderReplay(); return; }
      const p = this.policy;
      fb.replaceChildren(h('p', { style: { margin: 0 } },
        p[0] === 'free' ? 'The agent may read Priya\'s calendar as well as yours without asking: even a lookup is an access decision. '
          : p[0] === 'ask' ? 'You decide each time whether it may read the two calendars. ' : 'It may not read calendars at all. ',
        p[1] === 'free' ? 'It changes your calendar on its own. ' : '',
        p[2] === 'free' ? 'Any email still goes out unread, in your name. ' : p[2] === 'ask' ? 'You read any email before Priya does. ' : '',
        'Real apps set a policy like this for you; whose choice it is matters.'),
        h('div', { class: 'row', style: { marginTop: '0.5rem' } }, h('button', { type: 'button', class: 'primary', onclick: () => {
          this.replay = { i: 0, log: [] }; this.stepReplay();
        } }, 'Replay the request under my policy')));
      this.policyDone = true; this.finish();
      this.renderReplay();
    };
    const rows = ACTIONS.map((a, i) => h('label', {},
      h('span', {}, h('span', { class: 'mono' }, a.name), h('span', { class: 'muted' }, `: ${a.does}`)),
      h('select', { 'aria-label': `${a.name} policy`, onchange: e => { this.policy[i] = e.target.value; this.replay = null; explain(); } },
        ...[['', 'Choose...'], ['free', 'Run freely'], ['ask', 'Ask me first'], ['never', 'Never allow']].map(([v, l]) => h('option', { value: v, selected: this.policy[i] === v }, l)))));
    const card = h('div', { class: 'card', style: { marginTop: '0.75rem' } },
      h('strong', {}, 'Write the agent\'s approval policy'),
      h('div', { class: 'muted', style: { fontSize: '0.85rem' } }, 'For each action in this trace: may it run freely, must it ask you first, or is it never allowed?'),
      h('div', { class: 'policy' }, rows), fb, this.replayBox);
    if (this.policy.every(p => p)) explain();
    return card;
  }

  // Replay: walk the three actions under the policy. "Ask" pauses for the
  // learner; a refusal or a blocked action stops the agent at that point.
  stepReplay(answer) {
    const r = this.replay;
    if (answer) { r.log.push(answer); if (answer === 'no') r.stop = r.i; r.i++; }
    while (r.stop == null && r.i < ACTIONS.length && this.policy[r.i] !== 'ask') {
      const p = this.policy[r.i];
      r.log.push(p); if (p === 'never') r.stop = r.i; r.i++;
    }
    if (r.stop != null || r.i >= ACTIONS.length) { r.done = true; this.replayDone = true; }
    this.renderReplay();
    this.replayBox.querySelector('button')?.focus();
    if (r.done) this.finish();
  }

  renderReplay() {
    const r = this.replay, box = this.replayBox;
    if (!box) return;
    if (!r) { box.replaceChildren(); return; }
    const items = ACTIONS.map((a, i) => i < r.log.length ? h('li', {}, h('span', { class: 'mono' }, a.name), `: ${VERB[r.log[i]]}`)
      : r.done ? h('li', { class: 'muted' }, h('span', { class: 'mono' }, a.name), `: ${VERB.skip}`) : null);
    const parts = [h('strong', {}, 'Replay under your policy (simulated)'), h('ol', {}, items)];
    if (!r.done) {
      const a = ACTIONS[r.i];
      parts.push(h('div', { class: 'card ask' }, h('strong', {}, 'The agent asks: '), a.asks, h('pre', {}, a.call),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'primary', onclick: () => this.stepReplay('yes') }, 'Approve'),
          h('button', { type: 'button', onclick: () => this.stepReplay('no') }, 'Refuse'))));
    } else {
      const o = OUTCOME[r.stop ?? ACTIONS.length];
      parts.push(h('p', { style: { margin: '0.3rem 0' } }, h('strong', {}, 'Reply on your screen: '), o.reply),
        h('p', { style: { margin: '0.3rem 0' } }, h('strong', {}, 'Outside the chat: '), o.world),
        h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => { this.replay = { i: 0, log: [] }; this.stepReplay(); } }, 'Replay again')));
    }
    box.replaceChildren(...parts);
  }

  focusNext() { this.controls.querySelector('button')?.focus(); }

  askCard(step) {
    const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    const opts = h('div', { class: 'opts' }, ...step.ask.options.map(o => h('button', { type: 'button', onclick: e => {
      fb.replaceChildren(h('span', { class: o.correct ? 'right' : 'wrong' }, o.correct ? 'Yes. ' : 'Not quite. '), o.feedback);
      if (!o.correct) { e.currentTarget.disabled = true; return; }
      opts.querySelectorAll('button').forEach(b => { b.disabled = true; });
      this.solved.add(step);
      fb.append(h('div', { style: { marginTop: '0.5rem' } }, h('button', { type: 'button', class: 'primary', onclick: () => { this.render(); this.focusNext(); } }, 'Continue')));
      fb.querySelector('button.primary').focus();
    } }, o.label)));
    return h('div', { class: 'card ask' }, h('strong', {}, 'Checkpoint: '), step.ask.q, opts, fb);
  }
}

customElements.define('x-agents-b', AgentsB);
