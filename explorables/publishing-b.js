// Publishing, spin B: "Which door?" (role play).
// The learner works the front desk of a fictional makerspace website. Visitors
// arrive one at a time (crawlers, agents, plain programs, people), and each must
// be sent to the door built for them: robots.txt, llms.txt, openapi.json or the
// HTML page. Every door can be peeked into; wrong doors explain themselves.
import { Explorable, h } from '../js/kit.js';

const DOORS = [
  { id: 'robots', file: 'robots.txt', since: 'about 1994', for: 'crawlers: where the site asks them not to go',
    peek: `User-agent: *
Disallow: /members/

User-agent: ExampleTrainingBot
Disallow: /

Sitemap: https://makerspace.example.edu/sitemap.xml` },
  { id: 'llms', file: 'llms.txt', since: '2024, a proposed convention', for: 'language models that look for it: what the site is, in plain text',
    peek: `# Example University Makerspace

> Tools, training and a community of makers.

## Hours
- Laser cutter: Mon–Thu 10am–6pm

## For agents and programs
- [API description](/api/openapi.json): availability
  and reservations. Requires an API key.` },
  { id: 'openapi', file: 'openapi.json', since: '2010s', for: 'programs: exact operations, no reading required',
    peek: `{
  "openapi": "3.1.0",
  "info": { "title": "Makerspace API" },
  "paths": {
    "/equipment/{id}/availability": { "get": { ... } },
    "/reservations": { "post": { ... } }
  },
  "security": [{ "apiKey": [] }]
}` },
  { id: 'html', file: 'index.html', since: '1990s', for: 'people: layout, photos, buttons',
    peek: `<header class="site-header" data-sticky="true">
  <nav class="primary-nav">... 14 menu links ...</nav>
</header>
<div class="cookie-banner">We use cookies ...</div>
<section class="hero"><h1>Make something.</h1>
<section class="carousel" data-autoplay="6000">
  <img srcset="...640w, ...1280w" alt="Students at the embroidery machine">
...` },
];

const VISITORS = [
  { kind: 'search crawler', who: 'SearchBot', says: 'May I index the pages under /members/?', door: 'robots',
    right: 'robots.txt answers this: the site asks all crawlers to stay out of /members/. Honoring the request is up to the crawler.',
    wrong: { llms: 'llms.txt describes the site for models; it does not say where crawlers may go.',
      openapi: 'openapi.json lists API operations, not crawl permissions.',
      html: 'The crawler can already reach the page. The question is whether it should, and that answer lives in robots.txt.' } },
  { kind: 'student\'s agent', who: 'An agent working for a first-year', says: 'Summarize what this makerspace offers and how to get started.', door: 'llms',
    right: 'llms.txt is a summary written for a model: a few hundred tokens instead of a page of markup. It is a convention, so only agents that look for it will find it.',
    wrong: { robots: 'robots.txt says where crawlers may go, not what the place is.',
      openapi: 'The API can check availability, but "what is this place" is prose, which is what llms.txt holds.',
      html: 'It would work eventually, but the agent pays for menus, banners and scripts to find a few lines. The next exercise measures how much.' } },
  { kind: 'plain program', who: 'A Discord bot script with no LLM inside', says: 'Every five minutes, check if the laser cutter is free and post it to our club server.', door: 'openapi',
    right: 'openapi.json gives exact endpoints and fields. A plain program can call /equipment/{id}/availability with no model involved.',
    wrong: { robots: 'robots.txt asks crawlers to stay out of some paths; it cannot answer whether a machine is free.',
      llms: 'A program with no model inside can fetch the text but cannot reliably interpret free-form prose. It needs exact paths and fields.',
      html: 'Scraping the page breaks whenever the design changes, and the page lists hours, not live availability.' } },
  { kind: 'person', who: 'A transfer student on their phone', says: 'I want to see what the space looks like before I visit.', door: 'html',
    right: 'The HTML page is the door for people: photos, layout, buttons, and (when built well) structure that screen readers can use.',
    wrong: { robots: 'robots.txt is for automated visitors; a person gets nothing from it.',
      llms: 'llms.txt has no photos and is not laid out for people.',
      openapi: 'A person with a phone wants pictures, not a list of endpoints.' } },
  { kind: 'training crawler', who: 'ExampleTrainingBot, collecting text for an AI company', says: 'May I copy the whole site to train a model?', door: 'robots',
    right: 'robots.txt says no: "Disallow: /" for this bot. But it is a request, not a lock. Well-behaved crawlers honor it; nothing forces the others to.',
    wrong: { llms: 'llms.txt invites agents to read the site; it does not grant or refuse permission to collect it.',
      openapi: 'openapi.json describes the API; it says nothing about copying pages.',
      html: 'Pages do not carry crawl permissions. That is robots.txt\'s job, voluntary as it is.' } },
  { kind: 'your agent', who: 'Your own agent, asked to act for you', says: 'Reserve a 3D printer for me on Friday at 2pm.', door: 'openapi',
    right: 'To act, the agent needs the reservation operation in openapi.json. It may find it by way of llms.txt, if it checks for one. To act for you it needs a credential you grant: usually an API key or a scoped token, not your own password.',
    wrong: { robots: 'robots.txt only governs crawling; it cannot make a reservation.',
      llms: 'Close: llms.txt points the way, but reading about reservations is not making one. The agent needs the operation itself.',
      html: 'Clicking through a booking form as a person would is fragile, and handing an agent your password gives it everything you can do. An API key or scoped token limits it to what you allow.' } },
];

// Visitors with a language model inside: only the two agents. The crawlers are
// plain programs, even if a training crawler's haul later feeds a model.
const MODEL_VISITORS = 2;

// The robots.txt group the learner writes once the desk closes.
const ARCHIVE_BOT = 'ExampleArchiveBot';
function checkRule(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const ua = lines.findIndex(l => /^user-agent:/i.test(l) && l.replace(/^user-agent:\s*/i, '') === ARCHIVE_BOT);
  if (ua < 0) return `Start a group with "User-agent: ${ARCHIVE_BOT}" (exact name, so the rule applies to that bot only).`;
  const rules = lines.slice(ua + 1).filter(l => /^(dis)?allow:/i.test(l)).map(l => l.toLowerCase().replace(/\s+/g, ''));
  if (rules.includes('disallow:/')) return '"Disallow: /" shuts the archive out of the whole site, but it may keep the public pages.';
  if (!rules.some(l => l === 'disallow:/members/' || l === 'disallow:/members')) return 'Add a line under it: "Disallow: /members/".';
  return null;
}

class PublishingB extends Explorable {
  static literacies = {
    read: 'Read each visitor\'s request and peek inside the four files to decide which one answers it.',
    write: 'Write a robots.txt rule that keeps a new archive crawler out of the members area only.',
    count: 'Read the six visitor briefs, estimate how many have a language model inside before the desk opens, then check.',
  };

  static prediction = {
    question: 'A short script with no language model inside wants to know whether the laser cutter is free right now. Which file helps it most?',
    options: [
      { label: 'llms.txt, the plain-text summary of the site',
        feedback: 'llms.txt is plain text, but it is prose written for a model to read. A script without a model can fetch it but cannot reliably interpret free-form prose; it needs exact paths, parameters and fields.' },
      { label: 'openapi.json, the formal description of the site\'s API', correct: true,
        feedback: 'Right. openapi.json is precise enough that ordinary code can use it directly, no model required. llms.txt is a proposed convention for briefing language models, and it can link to openapi.json.' },
    ],
    after: 'Below, you work the front desk. Send each visitor to the door built for them. Peek inside any door first.',
  };

  static css = `
    .visitor { border-left: 4px solid var(--lit-teach); }
    .visitor .kind { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--lit-muted); }
    .visitor .who { font-weight: 600; }
    .visitor q { display: block; margin-top: 0.25rem; font-style: italic; }
    .doors { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); margin-top: 0.6rem; }
    .door { display: flex; flex-direction: column; gap: 0.35rem; }
    .door .file { font: 600 0.95rem var(--lit-font-mono); }
    .door .for { font-size: 0.82rem; }
    .door[data-state="wrong"] { border-color: var(--lit-bad); }
    .door[data-state="right"] { border-color: var(--lit-good); background: var(--lit-work-tint); }
    .door button { align-self: flex-start; }
    details summary { cursor: pointer; font-size: 0.82rem; color: var(--lit-muted); }
    details summary:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 2px; }
    details pre { margin: 0.3rem 0 0; font: 0.72rem/1.4 var(--lit-font-mono); white-space: pre-wrap; word-break: break-word;
      background: var(--lit-bg); border: 1px solid var(--lit-border); border-radius: 4px; padding: 0.4rem; }
    .fb { margin-top: 0.6rem; }
    .fb .right { color: var(--lit-good); font-weight: 600; }
    .fb .wrong { color: var(--lit-bad); font-weight: 600; }
    .log { list-style: none; padding: 0; margin: 0.6rem 0 0; font-size: 0.85rem; display: grid; gap: 0.2rem; }
    .log .mono { font-size: 0.8rem; }
    .guess button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    textarea { width: 100%; min-height: 4.5rem; margin-top: 0.4rem; font: 0.85rem/1.4 var(--lit-font-mono); padding: 0.4rem; border-radius: 4px;
      border: 1px solid var(--lit-border); background: var(--lit-bg); color: var(--lit-fg); }
    textarea:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 2px; }
  `;

  mount(root) {
    this.i = 0;
    this.tried = new Set();
    this.solved = false;
    this.firstTry = 0;
    this.log = [];
    this.guess = null;
    this.ruleOk = false;
    this.guessBox = h('div', { class: 'card guess', 'aria-live': 'polite' });
    this.writeBox = h('div');
    this.visitorBox = h('div', { class: 'card visitor', 'aria-live': 'polite' });
    this.fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    this.doorBox = h('div', { class: 'doors' });
    this.logBox = h('ul', { class: 'log', 'aria-label': 'Visitors served' });
    this.doorEls = DOORS.map(d => {
      const btn = h('button', { type: 'button', onclick: () => this.send(d.id) }, `Send to ${d.file}`);
      const el = h('div', { class: 'card door' },
        h('div', { class: 'file' }, d.file),
        h('div', { class: 'for muted' }, `For ${d.for}. Since ${d.since}.`),
        h('details', {}, h('summary', {}, 'Peek inside (sample)'), h('pre', {}, d.peek)),
        btn);
      return { d, el, btn };
    });
    this.doorBox.append(...this.doorEls.map(x => x.el));
    root.append(
      h('p', { class: 'muted', style: { margin: '0 0 0.5rem', fontSize: '0.85rem' } }, 'You run the front desk of a fictional makerspace website. Simulated visitors.'),
      this.guessBox, this.visitorBox, this.fb, this.doorBox, this.logBox, this.writeBox);
    this.renderGuess();
    this.render();
  }

  renderGuess() {
    if (this.guess == null) {
      this.guessBox.replaceChildren(
        h('div', {}, h('strong', {}, 'Before the desk opens: '), 'today\'s six visitors sent ahead who they are.'),
        h('ol', { style: { margin: '0.3rem 0 0', paddingLeft: '1.4rem', fontSize: '0.88rem' } }, VISITORS.map(v => h('li', {}, `${v.who} (${v.kind})`))),
        h('div', { style: { marginTop: '0.3rem' } }, 'How many of them have a language model inside?'),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Your guess', style: { marginTop: '0.4rem' } },
          [0, 1, 2, 3, 4, 5, 6].map(n => h('button', { type: 'button', onclick: () => { this.guess = n; this.renderGuess(); this.render(); } }, String(n)))));
      return;
    }
    const done = this.i >= VISITORS.length, off = Math.abs(this.guess - MODEL_VISITORS);
    this.guessBox.replaceChildren(h('div', {}, `Your guess: ${this.guess} of 6. `,
      done ? h('span', {}, h('strong', {}, `Actual: ${MODEL_VISITORS}, the two agents. ${off ? `Off by ${off}.` : 'Spot on.'} `),
        'The crawlers, the bot and the person read no prose through a model, so llms.txt is one door among four.')
        : h('span', { class: 'muted' }, 'Checked when the desk closes.')));
  }

  renderWrite() {
    if (this.i < VISITORS.length || this.writeBox.firstChild) return;
    const ta = h('textarea', { 'aria-label': 'Your robots.txt lines', spellcheck: 'false' });
    ta.value = 'User-agent: ';
    const msg = h('div', { 'aria-live': 'polite', style: { marginTop: '0.4rem' } });
    const btn = h('button', { type: 'button', class: 'primary', onclick: () => {
      const err = checkRule(ta.value);
      if (err) { msg.replaceChildren(h('span', { class: 'wrong' }, 'Not yet. '), err); return; }
      this.ruleOk = true; ta.readOnly = true; btn.disabled = true;
      msg.replaceChildren(h('span', { class: 'right' }, 'Added to robots.txt. '), 'A well-behaved archive will now skip /members/. It is still a request: nothing stops a crawler that ignores it.');
      this.finish();
    } }, 'Add to robots.txt');
    this.writeBox.replaceChildren(h('div', { class: 'card fb' },
      h('div', {}, h('strong', {}, 'A letter arrives after closing. '), `${ARCHIVE_BOT}, a library's web archive, asks to save your public pages. Members were never asked about archiving their profile pages, so you agree to the public pages only, not /members/. Write its robots.txt lines.`),
      ta, h('div', { class: 'row', style: { marginTop: '0.4rem' } }, btn), msg));
  }

  finish() {
    if (this.i >= VISITORS.length && this.ruleOk && this.guess != null) {
      this.complete('One site, four doors: robots.txt asks crawlers to stay out (honoring it is voluntary), llms.txt briefs agents that look for it, openapi.json lets programs act with credentials you grant, and the HTML page is for people. Which doors to open, and to whom, is a publisher\'s decision.');
    }
  }

  send(id) {
    const v = VISITORS[this.i];
    if (this.solved || this.tried.has(id)) return;
    this.tried.add(id);
    const door = DOORS.find(d => d.id === id);
    if (id === v.door) {
      this.solved = true;
      if (this.tried.size === 1) this.firstTry++;
      this.log.push([v, door.file, this.tried.size === 1]);
      this.fb.replaceChildren(h('div', { class: 'card' }, h('span', { class: 'right' }, `${door.file}. `), v.right,
        h('div', { class: 'row', style: { marginTop: '0.5rem' } },
          h('button', { type: 'button', class: 'primary', onclick: () => this.next() },
            this.i === VISITORS.length - 1 ? 'Close the desk' : 'Next visitor'))));
      this.fb.querySelector('button.primary').focus();
      this.progress(this.i + 1, VISITORS.length + 1, `${this.i + 1} of ${VISITORS.length} visitors served`);
    } else {
      this.fb.replaceChildren(h('div', { class: 'card' }, h('span', { class: 'wrong' }, `Not ${door.file}. `), v.wrong[id], ' Try another door.'));
    }
    this.render();
  }

  next() {
    this.i++;
    this.tried = new Set();
    this.solved = false;
    this.fb.replaceChildren();
    if (this.i >= VISITORS.length) this.progress(VISITORS.length, VISITORS.length + 1, 'Desk closed: one robots.txt rule left to write.');
    this.renderGuess();
    this.render();
    this.renderWrite();
    this.finish();
  }

  render() {
    const done = this.i >= VISITORS.length;
    if (done) {
      this.visitorBox.replaceChildren(h('div', { class: 'who' }, `Desk closed. ${this.firstTry} of ${VISITORS.length} visitors sent to the right door on the first try.`),
        h('div', { class: 'muted', style: { fontSize: '0.88rem' } }, 'Each door is a plain file at a predictable URL. Publishing for agents mostly means writing one more of them.'));
    } else {
      const v = VISITORS[this.i];
      this.visitorBox.replaceChildren(
        h('div', { class: 'kind' }, `Visitor ${this.i + 1} of ${VISITORS.length}: ${v.kind}`),
        h('div', { class: 'who' }, v.who), h('q', {}, v.says));
    }
    const v = VISITORS[this.i];
    for (const { d, el, btn } of this.doorEls) {
      el.dataset.state = done ? '' : this.solved && d.id === v.door ? 'right' : this.tried.has(d.id) ? 'wrong' : '';
      btn.disabled = done || this.solved || this.tried.has(d.id) || this.guess == null;
    }
    this.logBox.replaceChildren(...this.log.map(([lv, file, first]) =>
      h('li', {}, h('span', { class: 'mono' }, file), ` for ${lv.kind}`, first ? '' : h('span', { class: 'muted' }, ' (after a wrong door)'))));
  }
}

customElements.define('x-publishing-b', PublishingB);
