// Publishing, spin A: the same site three ways (instrument).
// A fictional campus makerspace bundled as raw HTML, as the text a naive
// extractor keeps, and as an llms.txt. A "tokens read" slider sweeps a reading
// head through all three at once; tick marks show where each question's answer
// sits. Token counts are rough (characters ÷ 4).
import { Explorable, h } from '../js/kit.js';

const HTML = `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Makerspace | Example University</title>
<meta name="description" content="The Example University Makerspace: tools, training and community.">
<meta property="og:title" content="Makerspace | Example University">
<meta property="og:image" content="https://makerspace.example.edu/assets/img/og-card-1200x630.jpg">
<link rel="preconnect" href="https://fonts.example-cdn.com" crossorigin>
<link rel="stylesheet" href="/assets/css/main.min.css?v=8f3a2c1">
<link rel="stylesheet" href="/assets/css/vendor/carousel.min.css?v=2.4.1">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<style>:root{--brand:#003c6c;--accent:#fdc700;--gutter:clamp(1rem,3vw,2rem)}.site-header{position:sticky;top:0;z-index:50;background:var(--brand)}.mega-menu{display:none;position:absolute;left:0;right:0}.mega-menu.is-open{display:grid;grid-template-columns:repeat(4,1fr)}.hero{min-height:60vh;background-size:cover}.cookie-banner{position:fixed;bottom:0;inset-inline:0;padding:1rem}.visually-hidden{position:absolute!important;clip:rect(1px,1px,1px,1px)}</style>
<script async src="https://analytics.example.com/tag.js?id=EX-4471-MKR"></script>
<script>window.dataLayer=window.dataLayer||[];function track(){dataLayer.push(arguments)}track('init',{anonymize:true,cookie_flags:'SameSite=None;Secure'});track('page_view',{section:'makerspace'});</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Place","name":"Example University Makerspace","address":{"@type":"PostalAddress","streetAddress":"100 Example Way","addressLocality":"Santa Cruz"}}</script>
</head>
<body class="page-template-default page-id-412 has-mega-menu">
<a class="visually-hidden skip-link" href="#main">Skip to content</a>
<div class="cookie-banner" role="dialog" aria-live="polite" data-consent-version="3"><p>We use cookies to improve your experience. <a href="/privacy">Learn more</a></p><button class="btn btn--accept" data-consent="all">Accept all</button><button class="btn btn--reject" data-consent="essential">Essential only</button></div>
<header class="site-header" data-sticky="true">
<div class="site-header__inner container"><a class="site-logo" href="/"><img src="/assets/img/logo.svg" alt="Example University" width="180" height="40"></a>
<nav class="primary-nav" aria-label="Primary"><ul class="primary-nav__list">
<li class="has-children"><button class="mega-toggle" aria-expanded="false">About</button><div class="mega-menu"><ul><li><a href="/about/mission">Mission</a></li><li><a href="/about/staff">Staff</a></li><li><a href="/about/history">History</a></li><li><a href="/about/annual-report">Annual report</a></li></ul></div></li>
<li class="has-children"><button class="mega-toggle" aria-expanded="false">Equipment</button><div class="mega-menu"><ul><li><a href="/equipment/laser">Laser cutters</a></li><li><a href="/equipment/3d">3D printers</a></li><li><a href="/equipment/textiles">Textiles</a></li><li><a href="/equipment/electronics">Electronics bench</a></li><li><a href="/equipment/wood">Woodshop</a></li></ul></div></li>
<li class="has-children"><button class="mega-toggle" aria-expanded="false">Programs</button><div class="mega-menu"><ul><li><a href="/programs/workshops">Workshops</a></li><li><a href="/programs/residency">Maker residency</a></li><li><a href="/programs/k12">K–12 outreach</a></li></ul></div></li>
<li><a href="/events">Events</a></li><li><a href="/give" class="btn btn--accent">Give</a></li></ul></nav>
<button class="search-toggle" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></button>
</div></header>
<main id="main" class="site-main">
<section class="hero" style="background-image:url('/assets/img/hero-2400w.jpg')"><div class="hero__content container"><h1 class="hero__title">Make something.</h1><p class="hero__lede">Tools, training and a community of makers, open to every student.</p><a class="btn btn--accent btn--lg" href="/visit">Plan your visit</a></div></section>
<section class="carousel" data-carousel data-autoplay="6000" aria-roledescription="carousel"><div class="carousel__track"><article class="carousel__slide"><img src="/assets/img/news/textiles-640w.jpg" srcset="/assets/img/news/textiles-640w.jpg 640w, /assets/img/news/textiles-1280w.jpg 1280w" sizes="(min-width: 960px) 33vw, 100vw" alt="Students at the embroidery machine" loading="lazy"><h3><a href="/news/textiles-lab">New textiles corner opens</a></h3></article><article class="carousel__slide"><img src="/assets/img/news/expo-640w.jpg" srcset="/assets/img/news/expo-640w.jpg 640w, /assets/img/news/expo-1280w.jpg 1280w" sizes="(min-width: 960px) 33vw, 100vw" alt="Crowd at the spring expo" loading="lazy"><h3><a href="/news/spring-expo">Spring maker expo recap</a></h3></article></div><button class="carousel__prev" aria-label="Previous slide"></button><button class="carousel__next" aria-label="Next slide"></button></section>
<section class="hours container" id="hours"><h2 class="section-title">Hours</h2><div class="grid grid--3"><div class="card"><h3 class="card__title">Front desk</h3><p>Mon–Fri 9am–8pm</p></div><div class="card"><h3 class="card__title">Equipment</h3><p>Laser cutter: Mon–Thu 10am–6pm</p><p>3D printers: daily 9am–9pm</p></div><div class="card"><h3 class="card__title">Holidays</h3><p>Closed on campus holidays.</p></div></div></section>
<section class="training container" id="training"><h2 class="section-title">Get trained</h2><div class="prose"><p>Every tool needs a quick check-out first. Book a 30-minute safety training at the front desk or online, then you can reserve equipment on your own.</p></div><a class="btn" href="/training/book">Book training</a></section>
<section class="events container"><h2 class="section-title">Upcoming events</h2><ul class="event-list"><li class="event-list__item"><time datetime="2026-11-20">Nov 20</time> <a href="/events/solder-night">Solder night</a></li><li class="event-list__item"><time datetime="2026-12-03">Dec 3</time> <a href="/events/gift-making">Gift-making open hours</a></li></ul></section>
</main>
<footer class="site-footer"><div class="container grid grid--4"><div><h4>Visit</h4><p>100 Example Way<br>Santa Cruz, CA</p></div><div><h4>Connect</h4><ul class="social"><li><a href="https://social.example/@makerspace" aria-label="Mastodon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M21.3 13.9c-.3 1.5-2.6 3.1-5.3 3.4-1.4.2-2.8.3-4.2.3-2.3-.1-4.2-.6-4.2-.6v.6c.3 2.3 2.3 2.5 4.1 2.5 1.9.1 3.6-.5 3.6-.5l.1 1.7s-1.3.7-3.7.8c-1.3.1-2.9 0-4.8-.5C2.9 20.6 2.2 16.2 2.1 11.8V8.2c0-4.5 2.9-5.8 2.9-5.8C6.5 1.7 9 1.4 11.6 1.4h.1c2.6 0 5.1.3 6.6 1 0 0 2.9 1.3 2.9 5.8 0 0 0 3.3-.4 5.6z"/></svg></a></li></ul></div><div><h4>Resources</h4><ul><li><a href="/policies">Shop policies</a></li><li><a href="/accessibility">Accessibility</a></li><li><a href="/api/openapi.json">Developer API</a></li></ul></div><div><p class="legal">© 2026 Example University. All rights reserved.</p></div></div></footer>
<script src="/assets/js/vendor/carousel.min.js?v=2.4.1" defer></script>
<script src="/assets/js/main.min.js?v=8f3a2c1" defer></script>
</body>
</html>`;

const LLMS = `# Example University Makerspace

> Tools, training and a community of makers, open to every student. Every tool needs a safety training before first use.

## Hours

- Front desk: Mon–Fri 9am–8pm
- Laser cutter: Mon–Thu 10am–6pm
- 3D printers: daily 9am–9pm
- Closed on campus holidays.

## Getting started

- Book a 30-minute safety training at the front desk or online: https://makerspace.example.edu/training/book
- [Shop policies](https://makerspace.example.edu/policies)

## For agents and programs

- [API description](https://makerspace.example.edu/api/openapi.json): check equipment availability and make reservations. Requires an API key.
`;

// What a naive tag-stripping extractor keeps: no head, scripts, styles or SVG,
// but navigation, cookie banner and footer survive, and link targets vanish.
function extract(html) {
  return html
    .replace(/<head>[\s\S]*?<\/head>/, '')
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '')
    .replace(/<\/(p|h\d|li|section|div|header|footer|nav|article|ul)>/g, '\n')
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const QUESTIONS = [
  { q: 'When can I use the laser cutter?', find: ['Laser cutter: Mon–Thu 10am–6pm', 'Laser cutter: Mon–Thu 10am–6pm', 'Laser cutter: Mon–Thu 10am–6pm'] },
  { q: 'How do I get trained?', find: ['Book a 30-minute safety training', 'Book a 30-minute safety training', 'Book a 30-minute safety training'] },
  { q: 'Is there an API my agent could use?', find: ['openapi.json', 'Developer API', 'openapi.json'],
    note: 'The extracted text says "Developer API" but stripping the tags threw away the link, so the agent knows an API exists but not where.' },
];

const tok = chars => Math.round(chars / 4);

const GUESSES = [2, 5, 10, 50];

// The learner's llms.txt line must name an event and its date.
function checkEvent(line) {
  if (/solder/i.test(line) && /\b20\b/.test(line) && /nov/i.test(line)) return null;
  if (/gift/i.test(line) && /\b3\b/.test(line) && /dec/i.test(line)) return null;
  return 'Name one event and its date, as the page shows them (for example the Nov 20 solder night).';
}

class PublishingA extends Explorable {
  static literacies = {
    read: 'Read the same answer in raw HTML, stripped text and llms.txt, and see what each version makes an agent wade through.',
    write: 'Write the missing events line into the llms.txt and watch its size change.',
    count: 'Estimate how many times larger the raw page is than the llms.txt before the token counts appear.',
  };

  static prediction = {
    question: 'Look at the raw HTML of a typical campus web page. How much of it is the text a person actually reads on screen?',
    options: [
      { label: 'Most of it: markup is a thin wrapper around the words',
        feedback: 'Markup usually outweighs the words. Scripts, styles, menus, tracking and image variants pile up, and an agent reading raw HTML pays for every character in tokens.' },
      { label: 'A minority: most of it is markup, scripts and styling', correct: true,
        feedback: 'Right. Even in this small, tidy sample the readable text is a minority, and real pages are often far heavier. An agent reading raw HTML pays for all of it in tokens.' },
    ],
    after: 'Below, the same fictional site three ways. Estimate the size gap first, then pick a question and drag the reading head until each version reaches the answer.',
  };

  static css = `
    .qs { display: grid; gap: 0.35rem; }
    .qs button { text-align: left; }
    .qs button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    .qs .mark { float: right; font-weight: 400; font-size: 0.8rem; color: var(--lit-good); }
    .lanes { display: grid; gap: 0.45rem; margin: 0.75rem 0 0.3rem; }
    .lane { display: grid; grid-template-columns: 6.5rem 1fr; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
    .track { position: relative; height: 1.1rem; }
    .track .len { position: absolute; inset: 0 auto 0 0; background: var(--lit-surface); border: 1px solid var(--lit-border); border-radius: 3px; }
    .track .read { position: absolute; inset: 0 auto 0 0; background: color-mix(in srgb, var(--lit-work) 35%, transparent); border-right: 2px solid var(--lit-work); }
    .track .tick { position: absolute; top: -4px; bottom: -4px; width: 4px; margin-left: -2px; background: var(--lit-fg); border-radius: 1px; }
    .track .tick.hit { background: var(--lit-argue); }
    .lane .sub { font-size: 0.75rem; color: var(--lit-muted); }
    .tabs { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.6rem; }
    .tabs button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    pre { position: relative; margin: 0.4rem 0 0; height: 14rem; overflow: auto; white-space: pre-wrap; word-break: break-word;
      font: 0.74rem/1.45 var(--lit-font-mono); background: var(--lit-bg); border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.5rem; }
    pre .unread { color: var(--lit-muted); opacity: 0.55; }
    pre mark { background: var(--lit-work-tint); color: var(--lit-fg); outline: 2px solid var(--lit-work); }
    .readout { font-size: 0.85rem; margin-top: 0.5rem; }
    label.slider { display: block; margin-top: 0.4rem; font-size: 0.9rem; }
    label.slider input { margin: 0.3rem 0 0; }
    .est button[aria-pressed="true"] { border-color: var(--lit-work); background: var(--lit-work-tint); font-weight: 600; }
    .add { margin-top: 0.6rem; }
    .add input { width: 100%; margin-top: 0.4rem; padding: 0.3rem 0.4rem; font: 0.85rem var(--lit-font-mono);
      border: 1px solid var(--lit-border); border-radius: 4px; background: var(--lit-bg); }
    .ok { color: var(--lit-good); font-weight: 600; }
    .no { color: var(--lit-bad); font-weight: 600; }
  `;

  mount(root) {
    this.docs = [
      { name: 'raw HTML', file: 'index.html', text: HTML },
      { name: 'extracted text', file: 'tags stripped', text: extract(HTML) },
      { name: 'llms.txt', file: 'llms.txt', text: LLMS },
    ];
    for (const d of this.docs) d.tokens = tok(d.text.length);
    this.max = this.docs[0].tokens;
    // Character offset just past each answer, per question per document.
    this.ends = QUESTIONS.map(q => q.find.map((s, i) => {
      const at = this.docs[i].text.indexOf(s);
      return { at, end: at + s.length };
    }));
    this.qi = 0;
    this.view = 2;
    this.found = new Set();
    this.viewed = new Set([2]);
    this.read = 0;
    this.guess = null;
    this.added = false;

    this.estBox = h('div', { class: 'card est', 'aria-live': 'polite' });
    this.addBox = h('div', { class: 'card add' });
    this.qBox = h('div', { class: 'qs', role: 'group', 'aria-label': 'Question the agent is answering' });
    this.slider = h('input', { type: 'range', min: 0, max: this.max, step: 5, value: 0, disabled: true,
      'aria-label': 'Tokens read', oninput: () => { this.read = +this.slider.value; this.update(); } });
    this.sliderLabel = h('span', { class: 'num' });
    this.lanes = h('div', { class: 'lanes' });
    this.tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Show version' });
    this.pre = h('pre', { tabindex: 0, 'aria-label': 'Selected version, read part in full color' });
    this.readout = h('div', { class: 'readout', 'aria-live': 'polite' });

    root.append(
      h('p', { class: 'muted', style: { margin: '0 0 0.4rem', fontSize: '0.85rem' } }, 'Simulated site. Tokens are rough: characters ÷ 4. The reading head is a toy measure: many tools convert a page to readable text or Markdown before a model sees it.'),
      this.estBox,
      this.qBox,
      h('label', { class: 'slider' }, 'Reading head: ', this.sliderLabel, ' tokens read', this.slider),
      this.lanes, this.readout, this.tabs, this.pre, this.addBox,
    );
    this.renderEst();
    this.renderAdd();
    this.update();
  }

  ratio() { return this.docs[0].tokens / this.docs[2].tokens; }

  renderEst() {
    if (this.guess == null) {
      this.estBox.replaceChildren(
        h('div', {}, h('strong', {}, 'Estimate first: '), 'the whole raw HTML page is about how many times the size of the whole llms.txt?'),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Your estimate', style: { marginTop: '0.4rem' } },
          GUESSES.map(g => h('button', { type: 'button', onclick: () => { this.guess = g; this.slider.disabled = false; this.renderEst(); this.update(); } }, `about ${g}×`))));
      return;
    }
    const r = this.ratio(), near = GUESSES.reduce((a, b) => Math.abs(Math.log(b / r)) < Math.abs(Math.log(a / r)) ? b : a);
    this.estBox.replaceChildren(h('div', {}, `You estimated about ${this.guess}×. Actual: about `, h('strong', { class: 'num' }, `${Math.round(r)}×`),
      ` (~${this.docs[0].tokens.toLocaleString()} vs ~${this.docs[2].tokens.toLocaleString()} tokens). `,
      this.guess === near ? 'Your choice was the closest.' : `Closest choice: about ${near}×.`,
      h('span', { class: 'muted' }, ' A small, tidy page; heavier real pages widen the gap.')));
  }

  renderAdd() {
    const d = this.docs[2];
    if (this.added) {
      this.addBox.replaceChildren(h('span', { class: 'ok' }, 'Added. '),
        `llms.txt is now ~${d.tokens.toLocaleString()} tokens, still about ${Math.round(this.ratio())}× smaller than the raw page. Your line is at the end of the llms.txt tab.`);
      return;
    }
    const input = h('input', { type: 'text', value: '- ', 'aria-label': 'Your llms.txt line', spellcheck: 'false' });
    const msg = h('div', { 'aria-live': 'polite', style: { marginTop: '0.3rem' } });
    const add = () => {
      const err = checkEvent(input.value);
      if (err) { msg.replaceChildren(h('span', { class: 'no' }, 'Not yet. '), err); return; }
      const line = input.value.trim().replace(/^(-\s*)?/, '- ');
      d.text = d.text.trimEnd() + `\n\n## Events\n\n${line}\n`;
      d.tokens = tok(d.text.length);
      this.added = true;
      this.view = 2; this.viewed.add(2);
      this.renderAdd(); this.renderEst(); this.update();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    this.addBox.replaceChildren(
      h('div', {}, h('strong', {}, 'Your turn to publish: '), 'the page lists upcoming events, but this llms.txt leaves them out: a summary holds only what its author chose. Write one line an agent could use.'),
      input, h('div', { class: 'row', style: { marginTop: '0.4rem' } }, h('button', { type: 'button', class: 'primary', onclick: add }, 'Add to llms.txt')), msg);
  }

  update() {
    const read = this.read, chars = read * 4;
    this.sliderLabel.textContent = read.toLocaleString();
    const ends = this.ends[this.qi];
    if (chars >= ends[0].end && !this.found.has(this.qi)) { this.found.add(this.qi); }

    this.qBox.replaceChildren(...QUESTIONS.map((q, i) => h('button', { type: 'button', 'aria-pressed': String(i === this.qi),
      onclick: () => { this.qi = i; this.read = 0; this.slider.value = 0; this.update(); } },
      q.q, this.found.has(i) ? h('span', { class: 'mark' }, 'found everywhere') : null)));

    const pct = x => `${Math.min(100, 100 * x / this.max)}%`;
    this.lanes.replaceChildren(...this.docs.map((d, i) => {
      const e = ends[i];
      return h('div', { class: 'lane' },
        h('div', {}, h('div', {}, d.name), h('div', { class: 'sub num' }, this.guess == null ? 'estimate first' : `~${d.tokens.toLocaleString()} tokens`)),
        h('div', { class: 'track', 'aria-hidden': 'true' },
          h('div', { class: 'len', style: { width: pct(d.tokens) } }),
          h('div', { class: 'read', style: { width: pct(Math.min(read, d.tokens)) } }),
          h('div', { class: 'tick' + (chars >= e.end ? ' hit' : ''), style: { left: pct(tok(e.end)) } })));
    }));

    const q = QUESTIONS[this.qi];
    const reached = this.docs.map((d, i) => chars >= ends[i].end);
    this.readout.replaceChildren(...(this.guess == null ? [] : [
      h('div', {}, 'Tokens to reach the answer: ',
        ...this.docs.map((d, i) => h('span', {}, i ? ', ' : '', `${d.name} `, h('strong', { class: 'num' }, `~${tok(ends[i].end).toLocaleString()}`), reached[i] ? ' (reached)' : ''))),
      reached[0] && q.note ? h('div', { class: 'muted' }, q.note) : null,
      reached[0] ? h('div', { class: 'muted' }, `For this question the raw page costs about ${Math.round(tok(ends[0].end) / tok(ends[2].end))} times what llms.txt does.`) : null,
    ].filter(Boolean)));

    this.tabs.replaceChildren(...this.docs.map((d, i) => h('button', { type: 'button', 'aria-pressed': String(i === this.view),
      onclick: () => { this.view = i; this.viewed.add(i); this.update(); } }, d.file)));
    this.renderPre(chars);
    this.check();
  }

  renderPre(chars) {
    const d = this.docs[this.view], text = d.text, e = this.ends[this.qi][this.view];
    const cut = Math.min(chars, text.length);
    // Split at the read head and around the answer.
    const marks = [...new Set([0, cut, e.at, e.end, text.length])].filter(x => x >= 0 && x <= text.length).sort((a, b) => a - b);
    const head = h('span', { 'aria-hidden': 'true' });
    const out = [];
    for (let k = 0; k < marks.length - 1; k++) {
      const [a, b] = [marks[k], marks[k + 1]];
      if (a === cut) out.push(head);
      const s = text.slice(a, b);
      const isAns = a >= e.at && b <= e.end;
      out.push(a >= cut ? h('span', { class: 'unread' }, s) : isAns ? h('mark', {}, s) : s);
    }
    if (cut === text.length) out.push(head);
    this.pre.replaceChildren(...out);
    this.pre.scrollTop = Math.max(0, head.offsetTop - this.pre.clientHeight / 2);
  }

  check() {
    const done = this.found.size + this.viewed.size + (this.guess == null ? 0 : 1) + (this.added ? 1 : 0);
    const total = QUESTIONS.length + this.docs.length + 2;
    if (done >= total) this.complete('In this toy measure, raw HTML makes a reader pass menus, banners and scripts before the answer. An llms.txt is far smaller, but it is an authored summary that holds only what someone chose to include; adding to it costs a line, not a page.');
    else this.progress(done, total, `${this.found.size} of ${QUESTIONS.length} answers found, ${this.viewed.size} of ${this.docs.length} versions viewed${this.guess == null ? ', estimate not made' : ''}${this.added ? '' : ', events line not yet written'}`);
  }
}

customElements.define('x-publishing-a', PublishingA);
