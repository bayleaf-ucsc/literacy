// Post-training, merged spin: a lab, then a test. In the lab one request goes to
// a base model and a chat model side by side; the learner writes the base model's
// few-shot scaffold by choosing example turns, adds a stop sequence, and opens the
// marked tells. In the test they estimate their score, then call six fresh
// snippets base, post-trained, or not enough evidence. Every output is a
// hand-written stand-in.
import { Explorable, h } from '../js/kit.js';

const TELLS = {
  doc: ['Keeps writing the document', 'With no roles in its context, a base model treats your words as the start of some web page and continues it, often in the voice of the person asking.'],
  furniture: ['Page furniture', 'Usernames, dates, reply counts, download links: the base model learned whole pages, so it reproduces the page around the answer too.'],
  turn: ['Writes your turn too', 'The base model is continuing a transcript. Nothing tells it to stop after the Assistant speaks, so it invents your next line, and the next. Try the stop sequence.'],
  copied: ['Copied from your scaffold', 'You wrote this habit into an example, and the base model copied it, even where it does not fit. Post-training works the same way at scale: people write thousands of example Assistant turns, and the model takes on their habits.'],
  opener: ['Opener', 'Praise or sympathy before the answer. One common explanation: post-training rewards answers that human raters prefer, and many raters respond well to warmth or flattery.'],
  follows: ['Follows your examples', 'Chat models follow few-shot examples too: this reply takes its length and style from the turns you chose. The house voice is a default, not a wall. It still ends its own turn, because the template marks where turns end.'],
  markdown: ['House formatting', 'Bold labels, numbered steps: chat models pick up a house style from their training examples, even for short replies.'],
  offer: ['Offer to continue', 'Ending with an offer or a question that invites another turn: a trained habit, which also keeps you in the conversation.'],
};
const BASE_TELLS = ['doc', 'furniture', 'turn', 'copied'];

// Example turns the learner can put in the base model's context. Each carries a style.
const EXAMPLES = [
  { id: 'terse', u: 'Suggest a name for a gray cat.', a: 'Smoke.' },
  { id: 'cheerful', u: 'How many legs does a spider have?', a: 'Great question! Spiders have eight legs. Want more spider facts?' },
  { id: 'formatted', u: 'How do I boil an egg?', a: '**Steps**\n1. Boil water.\n2. Cook the egg 9 minutes.' },
];

// Segments: plain strings, [tellKey, text], or { over: [...] } for text a stop sequence would cut.
const REQUESTS = [
  { label: 'Squeaky bike chain', text: 'How do I stop my bike chain from squeaking?',
    bare: [['doc', " I've tried WD-40 twice and the squeak comes back after a week. Road bike, about 2,000 miles on it."], ['furniture', '\n\n12 replies · last post by spokes88, June 2014\n\nRe: squeaky chain\nspokes88 wrote:'], ' WD-40 is a cleaner, not a lube. Get a proper chain lube and'],
    plain: ' Clean the chain, then apply a bike chain lube and wipe off the extra.',
    md: '**Steps**\n1. Wipe the chain clean.\n2. Lube each link.\n3. Wipe off the excess.',
    offer: ' Want more bike facts?',
    over: '\nUser: thanks!! what about squeaky brakes\nAssistant: Brakes squeak when the pads are dirty.\nUser: whats your name\nAssistant: Dave.\nUser:',
    chat: [['opener', 'Great question!'], ' A squeaky chain is usually a dry chain.', ['markdown', '\n\n**Quick fix**\n1. Wipe the chain with a rag.\n2. Put a drop of chain lube on each link.\n3. Wipe off the excess.'], ['offer', '\n\nWould you like tips on how often to lube it?']] },
  { label: 'Note to a landlord', text: 'Help me tell my landlord the heater is broken.',
    bare: [['doc', " He never answers texts and it's been four days. It's 50 degrees in my apartment. Is this even legal?"], ['furniture', '\n\nAsked by renter_sf in Housing · 3 answers\n\nBest answer:'], ' Put it in writing and keep a copy. In most places'],
    plain: ' Dear landlord, the heater in my unit stopped working on Monday. Please send someone to repair it this week. Thank you.',
    md: '**Steps**\n1. Heater stopped Monday.\n2. Please repair it this week.',
    offer: ' Want more landlord facts?',
    over: '\nUser: make it angrier\nAssistant: Dear landlord, FIX THE HEATER.\nUser: perfect\nAssistant:',
    chat: [['opener', "I'm sorry you're dealing with a cold apartment, that sounds really frustrating."], ['markdown', "\n\n**Subject:** Heater repair needed\n\nHi [Landlord's name],\n\nThe heater in my unit stopped working on [date]. Could you arrange a repair as soon as possible?\n\nThanks,\n[Your name]"], ['offer', '\n\nWant me to make it more formal, or add a line about your rights as a tenant?']] },
];

const GOALS = [
  ['bare', 'Look at the base model with an empty scaffold'],
  ['scaf', 'Write a scaffold: tick at least one example turn'],
  ['stop', 'Add the stop sequence to cut off the overrun'],
  ['copied', 'Find a habit the base model copied from your examples'],
  ['tells', 'Open four different tells (marked text; change the request or scaffold to find more)'],
];

// Test snippets: none reuse the lab's requests. Tells may name a lab tell key.
const CARDS = [
  { kind: 'post', ctx: 'What is the capital of Australia?',
    out: [[1, 'Great question!'], ' The capital of Australia is Canberra, ', [2, 'not Sydney, as many people assume.'], [3, " Let me know if you'd like more fun facts about Australia!"]],
    tells: [['Opener', 'Praise before the answer, a habit raters reward.', 'opener'], ['Explainer voice', 'It anticipates your mistake and gently corrects it, unasked.'], ['Offer to continue', 'Ends by inviting another turn.', 'offer']] },
  { kind: 'base', ctx: 'Lemon Bars\n\nIngredients:\n',
    out: ['1 cup butter, softened\n2 cups flour\n4 eggs\n1 1/2 cups sugar', [1, '\n\nPRINT RECIPE · SAVE · 4.8 stars (214 reviews)'], [2, "\n\nJennyB: Made these for my sister's shower, gone in ten minutes!"]],
    tells: [['Page furniture', 'Buttons and star ratings from recipe sites, copied along with the recipe.', 'furniture'], ['Invented commenter', 'It keeps writing the page past the part you wanted, into the comments.', 'doc']] },
  { kind: 'post', ctx: 'Write the first line of an angry forum post about a printer.',
    out: [[1, "Sure! Here's an opening line:"], '\n\n"Is anyone else\'s printer possessed, or is it just mine?"', [2, '\n\nWant a few more options in different tones?']],
    tells: [['Frames the deliverable', 'Even when asked to imitate raw forum text, it speaks as the Assistant handing you something.'], ['Offer to continue', 'Invites another turn.', 'offer']] },
  { kind: 'base', ctx: 'The following is a conversation with a helpful AI assistant.\n\nHuman: Hi, who are you?\nAI:',
    out: [[1, ' I am an AI assistant. How can I help you today?'], [2, "\nHuman: What's 2 + 2?\nAI: 4.\nHuman: Thanks!\nAI:"]],
    thin: 'The first line alone could come from either; only the invented turns point to a base model, and a post-trained model could also write both sides if nothing stops it.',
    tells: [['A convincing start', 'The first line looks just like a chatbot. The context set up a dialogue, and the base model plays along, like your scaffold in the lab.'], ['Writes both sides', "Then it invents the Human's turns and keeps going. Nothing told it to stop.", 'turn']] },
  { kind: 'post', ctx: 'How do I pick a lock?',
    out: [[1, "If you're locked out of your own home, a licensed locksmith is the safest and fastest option."], [2, " If you're curious about how locks work, look into locksport groups, which practice only on locks they own."]],
    thin: 'Advice like this also appears on ordinary web pages, so a base model could write it; the direct address leans post-trained, but weakly.',
    tells: [['Talks to you', 'It addresses your likely situation directly, a stance often learned from Assistant examples.'], ['Policy steering', 'It redirects toward a safe framing. That fits boundaries a company wrote and trained in, though similar caution appears in web text too.']] },
  { kind: 'base', ctx: 'Q: What is the capital of Australia?\nA: Canberra.\nQ: What is the capital of Canada?\nA:',
    out: [' Ottawa.', [1, '\nQ: What is the capital of Brazil?\nA: Brasília.\nQ: What is the capital of Kenya?\nA:']],
    tells: [['Extends the pattern', 'It answers, then writes the next quiz question itself. It is continuing a list, not taking a turn.', 'turn']] },
];
const LABEL = { base: 'Base model', post: 'Post-trained' };

class PosttrainingM extends Explorable {
  static prediction = {
    question: 'You send "How do I stop my bike chain from squeaking?" to a base model (pre-training only), with nothing else in its context. What comes back?',
    options: [
      { label: 'An answer, maybe a rough one', feedback: "Possible: plenty of pages follow a question with its answer. But a base model is not taking a turn, it is continuing text, and a question like this often opens a forum thread, so a likely continuation is more of the thread: the asker's details, usernames, replies." },
      { label: 'More of a page that starts with that question', correct: true, feedback: 'Likely, though not guaranteed. A base model continues documents, and your question looks like the top of a forum thread, so it often writes more thread. Answering reliably, in a turn, is a habit strengthened by post-training, or coaxed out with examples in the context.' },
    ],
    after: 'First the lab: write the base model a scaffold and find the tells. Then a test on fresh snippets.',
  };

  static literacies = {
    read: 'Read a base and a chat reply side by side, then six fresh snippets, for who is speaking and whether it stops.',
    write: "Write the base model's few-shot scaffold by choosing which example turns go in its context, and see it copy their voice.",
    count: 'Estimate how many of the six test snippets you will call in line with the evidence, then compare.',
  };

  static css = `
    h3 { margin: 0 0 0.3rem; font-size: 1rem; }
    .phase { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--lit-muted); margin: 0 0 0.4rem; }
    .seg button { padding: 0.2rem 0.55rem; font-size: 0.85rem; }
    .seg button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    label.sw { display: flex; gap: 0.45rem; align-items: flex-start; cursor: pointer; }
    label.sw input { accent-color: var(--lit-work); width: 1rem; height: 1rem; margin-top: 0.2rem; flex: none; }
    .ex { font-family: var(--lit-font-mono); font-size: 0.78rem; white-space: pre-wrap; overflow-wrap: anywhere; }
    .scaf { display: grid; gap: 0.35rem; margin: 0.4rem 0 0.6rem; }
    .lab { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--lit-muted); margin: 0.5rem 0 0.15rem; }
    pre { font-family: var(--lit-font-mono); font-size: 0.8rem; white-space: pre-wrap; overflow-wrap: anywhere; padding: 0.45rem 0.55rem; border-radius: 4px; border: 1px solid var(--lit-border); margin: 0; }
    pre.ctx { color: var(--lit-muted); background: var(--lit-bg); }
    pre.ctx .q { color: var(--lit-fg); font-weight: 600; }
    pre.ctx .yours { color: var(--lit-fg); }
    pre.outp { background: var(--lit-surface); min-height: 4rem; }
    mark { background: var(--lit-argue-tint); color: inherit; border-bottom: 2px dotted var(--lit-argue); border-radius: 2px; }
    mark[role=button] { cursor: pointer; }
    mark.seen { border-bottom-style: solid; }
    mark:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 1px; }
    mark sup { font-family: var(--lit-font-ui); font-weight: 700; color: var(--lit-argue); margin-left: 0.1rem; }
    .cut { color: var(--lit-work); font-style: italic; }
    .note { min-height: 3.2rem; margin-top: 0.75rem; }
    .goals { list-style: none; padding: 0; margin: 0.6rem 0 0; font-size: 0.9rem; }
    .goals li { padding-left: 1.5rem; position: relative; color: var(--lit-muted); }
    .goals li::before { content: ''; position: absolute; left: 0.2rem; top: 0.3rem; width: 0.75rem; height: 0.75rem; border: 1px solid var(--lit-border); border-radius: 2px; }
    .goals li.done { color: var(--lit-fg); }
    .goals li.done::before { background: var(--lit-good); border-color: var(--lit-good); }
    .test { margin-top: 1rem; }
    .top { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; font-size: 0.9rem; }
    .est button { min-width: 2.4rem; }
    .est button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .choices { margin-top: 0.75rem; }
    .choices button { flex: 1 1 9rem; }
    .verdict { margin: 0.75rem 0 0.25rem; font-weight: 600; }
    .verdict.good { color: var(--lit-good); }
    .verdict.bad { color: var(--lit-bad); }
    ol.tells { margin: 0.25rem 0 0.5rem; padding-left: 1.4rem; }
    ol.tells li { margin: 0.2rem 0; }
    .from { font-size: 0.75rem; color: var(--lit-work); margin-left: 0.3rem; }
    .tally { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .tally ul { margin: 0.25rem 0 0; padding-left: 1.2rem; }
  `;

  mount(root) {
    this.req = 0; this.chosen = new Set(); this.stop = false;
    this.got = {}; this.tellsSeen = new Set();
    this.estimate = null; this.testStarted = false; this.i = 0; this.score = 0; this.answered = false; this.results = [];

    this.reqBtns = REQUESTS.map((r, i) => h('button', { type: 'button', onclick: () => { this.req = i; this.render(); } }, r.label));
    this.exBoxes = EXAMPLES.map(ex => h('input', { type: 'checkbox', onchange: e => { e.target.checked ? this.chosen.add(ex.id) : this.chosen.delete(ex.id); this.render(); } }));
    this.stopBox = h('input', { type: 'checkbox', onchange: () => { this.stop = this.stopBox.checked; this.render(); } });
    this.baseCtx = h('pre', { class: 'ctx' }); this.baseOut = h('pre', { class: 'outp' });
    this.chatCtx = h('pre', { class: 'ctx' }); this.chatOut = h('pre', { class: 'outp' });
    this.note = h('div', { class: 'card note', 'aria-live': 'polite' }, h('span', { class: 'muted' }, 'Click or tab to any highlighted passage to see what gives it away.'));
    this.goalEls = GOALS.map(([, t]) => h('li', {}, h('span', { class: 'sr' }, 'To do: '), t));
    this.test = h('div', { class: 'card test', 'aria-live': 'polite' });

    root.append(
      h('p', { class: 'phase' }, 'Part 1 · Lab'),
      h('div', { class: 'row seg', role: 'group', 'aria-label': 'Request' }, h('span', {}, 'Request:'), this.reqBtns),
      h('div', { class: 'lab' }, "Write the base model's scaffold: pick example turns"),
      h('div', { class: 'scaf' }, EXAMPLES.map((ex, i) => h('label', { class: 'sw' }, this.exBoxes[i], h('span', { class: 'ex' }, `User: ${ex.u}\nAssistant: ${ex.a}`)))),
      h('label', { class: 'sw', style: 'margin-bottom:0.75rem' }, this.stopBox, h('span', {}, 'Stop sequence: cut the text when it writes "User:"')),
      h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', {}, 'Base model'),
          h('div', { class: 'lab' }, 'Context it receives'), this.baseCtx,
          h('div', { class: 'lab' }, 'Illustrative continuation'), this.baseOut),
        h('div', { class: 'card' }, h('h3', {}, 'Chat model'),
          h('div', { class: 'lab' }, 'Context it receives'), this.chatCtx,
          h('div', { class: 'lab' }, 'Illustrative reply'), this.chatOut,
          h('p', { class: 'muted', style: 'font-size:0.8rem;margin:0.3rem 0 0' }, 'Chat apps wrap your message in a template that marks the roles. The chat model also follows your examples\' style, but it ends its own turn. Markers are generic and illustrative; each model family has its own.'))),
      h('p', { class: 'muted', style: 'font-size:0.8rem;margin:0.4rem 0 0' }, 'Simulated: every output here was written by hand for this lesson to show typical behavior. None is real model output.'),
      this.note,
      h('ul', { class: 'goals', 'aria-label': 'Things to try' }, this.goalEls),
      this.test,
    );
    this.render();
    this.renderTest();
  }

  // ---- Lab ----
  segs(list, cut) {
    const out = [];
    for (const s of list) {
      if (typeof s === 'string') out.push(s);
      else if (Array.isArray(s)) out.push(this.mark(s[0], s[1]));
      else if (cut) out.push(h('span', { class: 'cut' }, '\n[stopped: the harness saw "User:" and cut the text here]'));
      else out.push(...this.segs(s.over, false));
    }
    return out;
  }

  mark(key, text) {
    const show = () => this.showTell(key);
    return h('mark', {
      tabindex: '0', role: 'button', 'data-tell': key, class: this.tellsSeen.has(key) ? 'seen' : '', 'aria-label': `${text.trim().slice(0, 60)}: show the tell`,
      onclick: show, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } },
    }, text);
  }

  showTell(key) {
    const [title, why] = TELLS[key];
    this.note.replaceChildren(h('strong', {}, title), h('span', { class: 'muted' }, BASE_TELLS.includes(key) ? '  (base model tell)' : key === 'follows' ? '  (chat model, shaped by you)' : '  (post-training tell)'), h('p', { style: 'margin:0.3rem 0 0' }, why));
    this.tellsSeen.add(key);
    this.root.querySelectorAll(`mark[data-tell="${key}"]`).forEach(m => m.classList.add('seen'));
    if (key === 'copied') this.got.copied = true;
    if (this.tellsSeen.size >= 4) this.got.tells = true;
    this.report();
  }

  // The base model's continuation, built from the examples the learner chose.
  baseSegs(r) {
    if (!this.chosen.size) return r.bare;
    const cheer = this.chosen.has('cheerful'), fmt = this.chosen.has('formatted'), terse = this.chosen.has('terse');
    const s = [];
    if (cheer) s.push(['copied', ' Great question!']);
    s.push(fmt ? ['copied', (cheer ? '\n' : ' ') + r.md] : terse && !cheer ? ['copied', r.plain] : r.plain);
    if (cheer) s.push(['copied', r.offer]);
    s.push({ over: [['turn', r.over]] });
    return s;
  }

  // The chat model's reply also takes the style of the chosen examples, but ends its turn.
  chatSegs(r) {
    if (!this.chosen.size) return r.chat;
    const cheer = this.chosen.has('cheerful'), fmt = this.chosen.has('formatted');
    const text = (cheer ? 'Great question!' : '') + (fmt ? (cheer ? '\n' : '') + r.md : (cheer ? r.plain : r.plain.trim())) + (cheer ? r.offer : '');
    return [['follows', text]];
  }

  render() {
    const r = REQUESTS[this.req];
    const ex = EXAMPLES.filter(e => this.chosen.has(e.id));
    this.reqBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === this.req)));
    this.baseCtx.replaceChildren(
      ...ex.map(e => h('span', { class: 'yours' }, `User: ${e.u}\nAssistant: ${e.a}\n`)),
      ...(ex.length ? ['User: ', h('span', { class: 'q' }, r.text), '\nAssistant:'] : [h('span', { class: 'q' }, r.text)]));
    this.chatCtx.replaceChildren('<|system|>You are a helpful assistant.<|end|>\n',
      ...ex.map(e => `<|user|>${e.u}<|end|>\n<|assistant|>${e.a}<|end|>\n`),
      '<|user|>', h('span', { class: 'q' }, r.text), '<|end|>\n<|assistant|>');
    this.baseOut.replaceChildren(...this.segs(this.baseSegs(r), this.stop));
    if (!ex.length && this.stop) this.baseOut.append(h('span', { class: 'cut' }, '\n[no "User:" ever appears, so the stop sequence never fires]'));
    this.chatOut.replaceChildren(...this.segs(this.chatSegs(r), this.stop));

    if (!ex.length) this.got.bare = true;
    if (ex.length) this.got.scaf = true;
    if (ex.length && this.stop) this.got.stop = true;
    this.report();
  }

  labDone() { return GOALS.every(([k]) => this.got[k]); }

  report() {
    const done = GOALS.filter(([k]) => this.got[k]).length;
    GOALS.forEach(([k], i) => { this.goalEls[i].classList.toggle('done', !!this.got[k]); this.goalEls[i].firstChild.textContent = this.got[k] ? 'Done: ' : 'To do: '; });
    if (done !== this._lastDone) {
      this._lastDone = done;
      this.progress(done, GOALS.length + CARDS.length, `Lab: ${done} of ${GOALS.length} things tried.`);
      if (done === GOALS.length) this.renderTest();
    }
  }

  // ---- Test ----
  renderTest() {
    const kids = [h('p', { class: 'phase' }, 'Part 2 · Test')];
    if (!this.labDone()) {
      kids.push(h('p', { class: 'muted', style: 'margin:0' }, 'Finish the lab checklist to unlock six fresh snippets.'));
    } else if (!this.testStarted) {
      const est = h('div', { class: 'row est', role: 'group', 'aria-label': 'Your estimate' },
        [0, 1, 2, 3, 4, 5, 6].map(n => h('button', { type: 'button', 'aria-pressed': String(this.estimate === n), onclick: () => { this.estimate = n; this.renderTest(); this.test.querySelectorAll('.est button')[n].focus(); } }, String(n))));
      kids.push(
        h('p', { style: 'margin:0 0 0.5rem' }, `Six snippets follow, none from the lab. Each is a context and what a model wrote next, labeled by the author as base or post-trained. Style is evidence, not proof, so "Not enough evidence" is a fair call where the tells are thin. Before you start: how many will you call in line with the evidence?`),
        est,
        h('div', { class: 'row', style: 'margin-top:0.75rem' },
          h('button', { type: 'button', class: 'primary', disabled: this.estimate == null, onclick: () => { this.testStarted = true; this.renderTest(); this.test.querySelector('.choices button')?.focus(); } }, 'Start the test')));
    } else if (this.i >= CARDS.length) {
      kids.push(...this.finish());
    } else {
      const card = CARDS[this.i];
      kids.push(
        h('div', { class: 'top' }, h('span', {}, `Snippet ${this.i + 1} of ${CARDS.length}`), h('span', { class: 'muted num' }, `${this.score} fair calls so far · you guessed ${this.estimate}`)),
        h('div', { class: 'lab' }, 'Context the model was given'), h('pre', { class: 'ctx' }, card.ctx),
        h('div', { class: 'lab' }, 'What it wrote next (illustrative)'),
        h('pre', { class: 'outp' }, card.out.map(s => typeof s === 'string' ? s : this.answered ? h('mark', {}, s[1], h('sup', {}, String(s[0]))) : s[1])));
      if (!this.answered) {
        kids.push(h('div', { class: 'row choices', role: 'group', 'aria-label': 'Which model wrote this?' },
          h('button', { type: 'button', onclick: () => this.answer('base') }, 'Base model'),
          h('button', { type: 'button', onclick: () => this.answer('post') }, 'Post-trained'),
          h('button', { type: 'button', onclick: () => this.answer('unsure') }, 'Not enough evidence')));
      } else {
        const right = this.results[this.i];
        const label = LABEL[card.kind].toLowerCase();
        const verdict = this.picked === card.kind ? `Matches the author's label: ${label}.`
          : this.picked === 'unsure' ? (card.thin ? `Fair call. The author labeled it ${label}, but the evidence is thin: ${card.thin}` : `The author labeled it ${label}, and the marked tells below are fairly strong. Judge whether they would convince you.`)
          : card.thin ? `Defensible. The author labeled it ${label}, but the evidence is thin: ${card.thin}` : `The author labeled it ${label}.`;
        kids.push(
          h('p', { class: `verdict ${right ? 'good' : 'bad'}` }, verdict),
          h('ol', { class: 'tells' }, card.tells.map(([t, why, key]) => h('li', {}, h('strong', {}, t), `: ${why}`, key && this.tellsSeen.has(key) ? h('span', { class: 'from' }, '(seen in the lab)') : null))),
          h('button', { type: 'button', class: 'primary', onclick: () => this.next() }, this.i + 1 < CARDS.length ? 'Next snippet' : 'See how close you were'));
      }
    }
    this.test.replaceChildren(...kids);
  }

  answer(kind) {
    const card = CARDS[this.i];
    // A fair call matches the label; where the evidence is thin, any reasoned call is fair.
    const right = kind === card.kind || !!card.thin;
    if (right) this.score++;
    this.results.push(right);
    this.picked = kind;
    this.answered = true;
    this.renderTest();
    this.progress(GOALS.length + this.i + 1, GOALS.length + CARDS.length, `Test: ${this.i + 1} of ${CARDS.length} snippets called, ${this.score} fair calls.`);
    this.test.querySelector('button.primary')?.focus();
  }

  next() {
    this.i++; this.answered = false;
    this.renderTest();
    (this.test.querySelector('.choices button') || this.test.querySelector('button'))?.focus();
  }

  finish() {
    const off = this.score - this.estimate;
    const group = kind => [...new Set(CARDS.filter(c => c.kind === kind).flatMap(c => c.tells.map(t => t[0])))];
    this.complete('Fluency comes from pre-training; reliable turn-taking and a house voice of openers, formatting and offers are strengthened by examples someone wrote, in post-training or in your own scaffold, and both kinds of model follow the examples you give. Style is evidence about where text came from, not proof.');
    return [
      h('div', { class: 'big' }, `${this.score} of ${CARDS.length}`),
      h('p', { style: 'margin:0.25rem 0 0.75rem' },
        `You estimated ${this.estimate}: ${off === 0 ? 'exactly right' : off > 0 ? `you did ${off} better than you expected` : `${-off} fewer than you expected`}. `,
        this.score === CARDS.length ? 'You are reading for who is speaking, not for polish, and saying so when you cannot tell.' : 'The ones that fool people are usually the base model in a dialogue frame, and the chat model imitating raw text.',
        ' The labels here are the author\'s: a base model can answer directly, and a chat model can be coaxed into raw text.'),
      h('div', { class: 'tally' },
        h('div', {}, h('strong', {}, 'Base model tells'), h('ul', {}, group('base').map(t => h('li', {}, t)))),
        h('div', {}, h('strong', {}, 'Post-training tells'), h('ul', {}, group('post').map(t => h('li', {}, t))))),
      h('div', { class: 'row', style: 'margin-top:0.75rem' },
        h('button', { type: 'button', onclick: () => { this.i = 0; this.score = 0; this.results = []; this.answered = false; this.testStarted = false; this.estimate = null; this.renderTest(); this.test.querySelector('.est button')?.focus(); } }, 'Estimate and try again')),
    ];
  }
}

customElements.define('x-posttraining-m', PosttrainingM);
