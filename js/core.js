// Literacy core: the course shell and its three threads.
//
//   <lit-course>   shell: top bar, thread toggles, ladder, TOC, routing, progress
//   <lit-scene>    one scene; shown one at a time, routed by #id
//   <lit-teach>    thread 1, direct teaching (plain light-DOM prose)
//   <lit-explore>  thread 2, a prediction gate in front of an explorable
//   <lit-predict>  thread 2, a prediction with no explorable behind it
//   <lit-argue>    thread 3, the mounting argument (with <lit-quote>)
//   <lit-meta>     disciplines, further reading, as-of date
//   <lit-ladder>   the argument's spine: Consumer to Operator
//
// Explorables are separate custom elements (explorables/*.js) built on
// js/kit.js. A <lit-explore spins="x-tokens-a x-tokens-b"> lazily imports
// explorables/tokens-a.js etc., so each design spin is one file.

const STORE = 'literacy.progress.v1';
const progress = {
  all() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } },
  get(key) { return this.all()[key]; },
  set(key, value) { const p = this.all(); p[key] = value; localStorage.setItem(STORE, JSON.stringify(p)); },
  clear() { localStorage.removeItem(STORE); },
};

export const RUNGS = [
  ['consumer', 'Consumer'],
  ['chooser', 'Chooser'],
  ['author', 'Author'],
  ['publisher', 'Publisher'],
  ['operator', 'Operator'],
];

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.flat().filter(k => k != null));
  return n;
};

// ---- Prediction gate (shared by lit-predict and lit-explore) -------------
// prediction: { question, options: [{ label, correct, feedback }], after? }
function renderPrediction(host, prediction, key, onAnswered) {
  const saved = progress.get(key);
  const box = el('div');
  const q = el('p', { class: 'lit-q' }, prediction.question);
  const opts = el('div', { class: 'lit-options', role: 'group', 'aria-label': 'Your prediction' });
  const fb = el('div', { class: 'lit-feedback', tabindex: '-1', hidden: true });
  const answer = (i, silent) => {
    const o = prediction.options[i];
    [...opts.children].forEach((b, j) => { b.disabled = true; b.setAttribute('aria-pressed', String(j === i)); if (j === i) b.setAttribute('data-picked', ''); });
    fb.hidden = false;
    fb.replaceChildren(
      el('strong', { 'data-right': String(!!o.correct) }, o.correct ? 'Good prediction. ' : 'Not quite. '),
      o.feedback || '',
      prediction.after ? el('p', { style: 'margin:.5rem 0 0' }, prediction.after) : null,
    );
    if (!silent) progress.set(key, { pick: i, correct: !!o.correct });
    onAnswered?.(i, !!o.correct);
    if (!silent) fb.focus();
  };
  prediction.options.forEach((o, i) => opts.append(el('button', { type: 'button', onclick: () => answer(i) }, o.label)));
  box.append(q, opts, fb);
  host.append(box);
  if (saved && Number.isInteger(saved.pick) && prediction.options[saved.pick]) answer(saved.pick, true);
}

// ---- Read / Write / Count badges -----------------------------------------
// UNESCO's literacy is to "identify, understand, interpret, create,
// communicate and compute". Every explorable declares, on its class,
// where the learner reads, writes (even just by clicking) and counts:
//   static literacies = { read: '...', write: '...', count: '...' }
// A missing entry shows as a dimmed badge, which makes gaps visible.
export const LITERACIES = [['read', 'Read'], ['write', 'Write'], ['count', 'Count']];
literacyBadges.n = 0;
function literacyBadges(lits = {}) {
  const detail = el('p', { class: 'lit-acts-detail', 'aria-live': 'polite', hidden: true });
  let open = null;
  const lead = el('span', { class: 'lit-acts-lead', id: `lit-acts-${++literacyBadges.n}` }, 'This exercise asks you to');
  const row = el('div', { class: 'lit-acts', role: 'group', 'aria-labelledby': lead.id }, lead,
    ...LITERACIES.map(([id, label]) => el('button', {
      type: 'button', 'data-act': id, 'data-has': String(!!lits[id]), 'aria-expanded': 'false',
      onclick: e => {
        const same = open === id;
        row.querySelectorAll('button').forEach(b => b.setAttribute('aria-expanded', 'false'));
        open = same ? null : id;
        detail.hidden = same;
        if (!same) {
          e.currentTarget.setAttribute('aria-expanded', 'true');
          detail.textContent = lits[id] ? `${label}: ${lits[id]}` : `${label}: not yet part of this exercise.`;
        }
      },
    }, label)));
  return el('div', {}, row, detail);
}

// ---- <lit-predict> -------------------------------------------------------
// Inline prediction defined in markup:
//   <lit-predict question="...">
//     <option correct feedback="...">Label</option> ...
//   </lit-predict>
class LitPredict extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const options = [...this.querySelectorAll('option')].map(o => ({
      label: o.textContent.trim(), correct: o.hasAttribute('correct'), feedback: o.getAttribute('feedback') || '',
    }));
    const after = this.getAttribute('after');
    const scene = this.closest('lit-scene');
    this.replaceChildren();
    const card = el('div', { class: 'lit-work' }, el('div', { class: 'label' }, el('span', {}, 'Predict')));
    this.append(card);
    renderPrediction(card, { question: this.getAttribute('question'), options, after }, `${scene?.id}:predict`, () => {
      this.done = true;
      this.dispatchEvent(new CustomEvent('lit-worked', { bubbles: true }));
    });
  }
}

// ---- <lit-explore> -------------------------------------------------------
class LitExplore extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    this.spins = (this.getAttribute('spins') || '').split(/\s+/).filter(Boolean);
    const scene = this.closest('lit-scene');
    // A scene may sequence several explorables; each keeps its own progress.
    const idx = scene ? [...scene.querySelectorAll('lit-explore')].indexOf(this) : 0;
    this.key = `${scene?.id}:explore${idx > 0 ? `:${idx}` : ''}`;
    const url = new URL(location.href);
    const wanted = url.searchParams.get(`spin-${scene?.id}`) || progress.get(`${this.key}:spin`);
    this.current = this.spins.find(s => s.endsWith(`-${wanted}`)) || this.spins[0];
    this.done = !!progress.get(`${this.key}:done`);
    this.card = el('div', { class: 'lit-work' });
    this.append(this.card);
    // Load the explorable module only once its scene is first shown.
    if (scene && !scene.hasAttribute('active')) scene.addEventListener('lit-activate', () => this.render(), { once: true });
    else this.render();
  }

  async render() {
    const tag = this.current;
    const letter = tag.split('-').pop();
    const spinPicker = this.spins.length > 1
      ? el('span', { class: 'lit-spins', role: 'group', 'aria-label': 'Design spin (an authoring aid)' },
          'design spin:',
          ...this.spins.map(s => el('button', {
            type: 'button', 'aria-pressed': String(s === tag),
            onclick: () => { this.current = s; progress.set(`${this.key}:spin`, s.split('-').pop()); this.render(); },
          }, s.split('-').pop().toUpperCase())))
      : null;
    const status = el('div', { class: 'lit-status', 'aria-live': 'polite' });
    const stage = el('div', { class: 'lit-stage' });
    this.card.replaceChildren(el('div', { class: 'label' }, el('span', {}, 'Work it'), spinPicker));

    const file = new URL(`../explorables/${tag.replace(/^x-/, '')}.js`, import.meta.url).href;
    try { await import(file); } catch (e) {
      this.card.append(el('div', { class: 'lit-placeholder' }, `Spin ${letter.toUpperCase()} (${tag}) is not built yet.`));
      console.warn(`lit-explore: could not load ${file}`, e);
      return;
    }
    const Ctor = customElements.get(tag);
    this.card.querySelector('.label').after(literacyBadges(Ctor?.literacies));
    const mount = () => {
      const x = document.createElement(tag);
      x.addEventListener('lit-progress', e => {
        if (this.done) return;
        const { done, total, note } = e.detail || {};
        status.textContent = note || (total ? `${done} of ${total}` : '');
      });
      x.addEventListener('lit-complete', e => {
        status.setAttribute('data-done', '');
        status.textContent = e.detail?.note || 'Worked. You can continue.';
        if (!this.done) { this.done = true; progress.set(`${this.key}:done`, true); }
        this.dispatchEvent(new CustomEvent('lit-worked', { bubbles: true }));
      });
      stage.replaceChildren(x);
      if (this.done) { status.setAttribute('data-done', ''); status.textContent = 'Already worked. Explore again as you like.'; }
    };
    if (Ctor?.prediction) {
      const gate = el('div');
      this.card.append(gate, stage, status);
      renderPrediction(gate, Ctor.prediction, `${this.key}:${tag}:predict`, mount);
    } else {
      this.card.append(stage, status);
      mount();
    }
  }
}

// ---- <lit-quote cite="Author, Title (year)" href="..."> ------------------
class LitQuote extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const body = [...this.childNodes];
    const href = this.getAttribute('href');
    const cite = this.getAttribute('cite') || '';
    this.replaceChildren(
      el('figure', { style: 'margin:0' },
        el('blockquote', {}, ...body),
        el('figcaption', {}, href ? el('a', { href }, cite) : cite)),
    );
  }
}

// ---- <lit-meta disciplines="A; B" asof="2026-11"> ------------------------
class LitMeta extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const ds = (this.getAttribute('disciplines') || '').split(';').map(s => s.trim()).filter(Boolean);
    const kids = [...this.childNodes];
    this.replaceChildren(
      el('div', { class: 'disciplines', 'aria-label': 'Disciplines in play' },
        el('strong', { style: 'margin-right:.25rem' }, 'Disciplines in play:'),
        ...ds.map(d => el('span', {}, d))),
      ...kids,
      this.hasAttribute('asof') ? el('p', { class: 'asof' }, `Claims here are current as of ${this.getAttribute('asof')}.`) : null,
    );
  }
}

// ---- <lit-ladder current="author"> ---------------------------------------
class LitLadder extends HTMLElement {
  static observedAttributes = ['current'];
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const cur = RUNGS.findIndex(([id]) => id === this.getAttribute('current'));
    this.setAttribute('aria-label', 'Where the argument has brought you');
    this.replaceChildren(...RUNGS.flatMap(([id, label], i) => [
      i ? el('span', { class: 'sep', 'aria-hidden': 'true' }, '›') : null,
      el('span', { class: 'rung', 'data-state': i < cur ? 'past' : i === cur ? 'current' : 'future' }, label),
    ]).filter(Boolean));
  }
}

// ---- <lit-course> --------------------------------------------------------
class LitCourse extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    this.scenes = [...this.querySelectorAll(':scope > lit-scene')];
    const ladder = el('lit-ladder');
    const saved = progress.get('toc');
    const tocOpen = saved ?? matchMedia('(min-width: 901px)').matches;
    this.tocToggle = el('button', { type: 'button', class: 'lit-toc-toggle', 'aria-controls': 'lit-toc',
      onclick: () => this.setToc(this.getAttribute('data-toc') !== 'open', true) }, 'Contents');
    const top = el('header', { class: 'lit-top' },
      this.tocToggle,
      el('a', { class: 'brand', href: '#' + this.scenes[0].id }, this.getAttribute('title') || 'Literacy', ' ', el('span', {}, this.getAttribute('subtitle') || '')),
      ladder,
      el('button', { type: 'button', title: 'Forget all predictions and progress in this browser', onclick: () => {
        if (confirm('Forget your predictions and progress in this browser?')) { progress.clear(); location.reload(); }
      } }, 'Reset'),
    );
    this.ladder = ladder;
    // Scroll targets clear the sticky top bar, whose height varies as it wraps.
    new ResizeObserver(() => document.documentElement.style.setProperty('--lit-top-h', `${top.offsetHeight}px`)).observe(top);
    this.toc = el('nav', { class: 'lit-toc', id: 'lit-toc', 'aria-label': 'Scenes' });
    this.setToc(tocOpen, false);
    // On a narrow screen, picking a scene from the contents gets out of the way.
    this.toc.addEventListener('click', e => {
      if (e.target.closest('a') && !matchMedia('(min-width: 901px)').matches) this.setToc(false, false);
    });
    const main = el('main', { class: 'lit-main' }, ...this.scenes);
    this.replaceChildren(top, el('div', { class: 'lit-shell' }, this.toc, main));

    this.scenes.forEach((s, i) => s.append(this.nextBar(s, this.scenes[i + 1])));
    this.addEventListener('lit-worked', () => { this.renderToc(); this.updateNext(); });
    addEventListener('hashchange', () => this.route());
    this.route();
  }

  setToc(open, remember) {
    this.setAttribute('data-toc', open ? 'open' : 'closed');
    this.tocToggle.setAttribute('aria-expanded', String(open));
    if (remember) progress.set('toc', open);
  }

  // A scene is worked when every gate in all three threads is done:
  // the lesson marked read, every exercise worked, the stance taken.
  worked(scene) {
    return [...scene.querySelectorAll('lit-readcheck, lit-explore, lit-predict, lit-stance')].every(x => x.done);
  }

  nextBar(scene, next) {
    const bar = el('div', { class: 'lit-next' });
    if (!next) { bar.append(el('small', {}, 'The end. Thank you for reading, and for writing.')); return bar; }
    const btn = el('button', { type: 'button', onclick: () => {
      const pending = this.pending(scene);
      if (pending.length) return this.nudge(pending);
      if (this.argueWaiting(scene)) this.revealArgue(scene);
      else location.hash = next.id;
    } }, scene.getAttribute('continue-label') || `Continue: ${next.getAttribute('title')}`);
    const hint = el('small', { 'aria-live': 'polite' });
    bar.append(btn, hint);
    scene._next = { btn, hint };
    return bar;
  }

  // What still needs the reader before Continue works, in reading order. Only
  // things they can see: exercises hide behind an unread lesson, and a late
  // argument's stance does not count until the argument has interjected.
  pending(scene) {
    const gates = [...scene.querySelectorAll('lit-readcheck, lit-explore, lit-predict, lit-stance')].filter(x => !x.done);
    if (gates.some(x => x.matches('lit-readcheck'))) return gates.filter(x => x.matches('lit-readcheck'));
    if (this.argueWaiting(scene)) return gates.filter(x => !x.matches('lit-stance'));
    return gates;
  }

  // The pending gates in words, so a blocked Continue says what is left.
  todo(scene) {
    const xs = [...scene.querySelectorAll('lit-explore')];
    const name = x => x.matches('lit-readcheck') ? 'mark the lesson read'
      : x.matches('lit-predict') ? 'make the prediction'
      : x.matches('lit-stance') ? 'take a stance'
      : xs.length > 1 ? `finish exercise ${xs.indexOf(x) + 1} of ${xs.length}` : 'finish the exercise';
    return this.pending(scene).map(name).join(', ');
  }

  // A disabled-looking Continue still takes clicks: it wiggles what is left to do.
  nudge(items) {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    items[0].scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    for (const x of items) {
      x.classList.remove('lit-wiggle');
      void x.offsetWidth; // restart the animation on repeated clicks
      x.classList.add('lit-wiggle');
      x.addEventListener('animationend', () => x.classList.remove('lit-wiggle'), { once: true });
    }
  }

  // Progressive reveal: a scene with argue="late" keeps its argument out of
  // sight until the reader first tries to continue. Then the margin interjects,
  // and its stance becomes one more thing to do before moving on.
  argueWaiting(scene) {
    return scene.getAttribute('argue') === 'late' && !scene.hasAttribute('data-argue-shown');
  }

  revealArgue(scene) {
    scene.setAttribute('data-argue-shown', '');
    progress.set(`${scene.id}:argue-shown`, true);
    this.toggleAttribute('data-argue-hidden', false);
    const argue = scene.querySelector(':scope > lit-argue');
    if (argue) {
      argue.classList.add('interject');
      argue.tabIndex = -1;
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sticky = getComputedStyle(argue).position === 'sticky';
      const target = sticky ? scene.querySelector(':scope > lit-teach') || argue : argue;
      target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      argue.focus({ preventScroll: true });
    }
    this.updateNext();
  }

  updateNext() {
    for (const s of this.scenes) {
      if (!s._next) continue;
      const { btn, hint } = s._next;
      if (this.argueWaiting(s)) {
        const ready = [...s.querySelectorAll('lit-readcheck, lit-explore, lit-predict')].every(x => x.done);
        btn.setAttribute('aria-disabled', String(!ready));
        hint.textContent = 'Work this scene to continue in order, or jump anywhere from the contents.';
        hint.hidden = ready;
        continue;
      }
      const ok = this.worked(s);
      btn.setAttribute('aria-disabled', String(!ok));
      const stanceLeft = [...s.querySelectorAll('lit-readcheck, lit-explore, lit-predict')].every(x => x.done);
      hint.textContent = stanceLeft
        ? 'One more thing: the argument wants your stance before you move on.'
        : `Still to do: ${this.todo(s)}. Or jump anywhere from the contents.`;
      hint.hidden = ok;
    }
  }

  renderToc() {
    const groups = [];
    for (const s of this.scenes) {
      const act = s.getAttribute('act') || '';
      if (!groups.length || groups.at(-1).act !== act) groups.push({ act, scenes: [] });
      groups.at(-1).scenes.push(s);
    }
    const cur = this.current?.id;
    this.toc.replaceChildren(...groups.flatMap(g => [
      g.act ? el('h2', {}, g.act) : null,
      el('ol', {}, ...g.scenes.map(s => el('li', {},
        el('a', { href: '#' + s.id, 'aria-current': s.id === cur ? 'page' : false, 'data-state': this.worked(s) ? 'worked' : 'open' },
          el('span', { class: 'mark', 'aria-hidden': 'true' }, this.worked(s) ? '●' : '○'),
          s.getAttribute('title'))))),
    ]).filter(Boolean));
  }

  observeReveal(scene) {
    if (scene._revealing) return;
    scene._revealing = true;
    const kids = [...scene.children].filter(k => !k.matches('header, .lit-titlecard'));
    if (!('IntersectionObserver' in window)) { kids.forEach(k => k.setAttribute('data-seen', '')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.setAttribute('data-seen', ''); io.unobserve(e.target); }
    }), { threshold: 0.25 });
    kids.forEach(k => io.observe(k));
  }

  route() {
    const id = location.hash.slice(1);
    const scene = this.scenes.find(s => s.id === id) || this.scenes[0];
    this.scenes.forEach(s => s.toggleAttribute('active', s === scene));
    scene.dispatchEvent(new Event('lit-activate'));
    const wasBare = this.hasAttribute('data-bare');
    const bare = scene.getAttribute('chrome') === 'none';
    this.toggleAttribute('data-bare', bare);
    if (wasBare && !bare) {
      this.classList.add('lit-unfurl');
      setTimeout(() => this.classList.remove('lit-unfurl'), 1200);
    }
    if (bare) this.observeReveal(scene);
    this.current = scene;
    // The ladder belongs to the argument: hide it wherever the argument is not on stage yet.
    this.toggleAttribute('data-argue-hidden', !scene.querySelector(':scope > lit-argue') || this.argueWaiting(scene));
    this.ladder.setAttribute('current', scene.getAttribute('rung') || 'consumer');
    const rungLabel = (RUNGS.find(([r]) => r === scene.getAttribute('rung')) || RUNGS[0])[1];
    scene.querySelectorAll('lit-argue').forEach(a => a.setAttribute('data-rung-label', ` · ${rungLabel}`));
    document.title = `${scene.getAttribute('title')} · ${this.getAttribute('title') || 'Literacy'}`;
    this.renderToc();
    this.updateNext();
    if (id) scrollTo({ top: 0 });
  }
}

class LitScene extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const head = el('header', {},
      el('div', { class: 'act' }, this.getAttribute('act') || ''),
      el('h1', {}, this.getAttribute('title')),
      this.getAttribute('dek') ? el('p', { class: 'dek' }, this.getAttribute('dek')) : null);
    this.prepend(head);
    if (progress.get(`${this.id}:argue-shown`)) this.setAttribute('data-argue-shown', '');
    // Teach gate: the work thread waits behind "I've read this".
    const firstWork = this.querySelector(':scope > lit-explore, :scope > lit-predict');
    if (firstWork && this.querySelector(':scope > lit-teach')) firstWork.before(el('lit-readcheck'));
  }
}

// ---- <lit-readcheck>: self-certify the teaching prose ------------------
class LitReadcheck extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    this.scene = this.closest('lit-scene');
    this.key = `${this.scene?.id}:read`;
    this.done = !!progress.get(this.key);
    this.render();
  }
  render() {
    this.scene?.toggleAttribute('data-read', this.done);
    if (this.done) { this.replaceChildren(el('p', { class: 'lit-readcheck-done', tabindex: '-1' }, 'You marked the lesson as read. The work is below.')); return; }
    this.replaceChildren(el('div', { class: 'lit-readcheck' },
      el('p', {}, 'Read the lesson above, then open the exercises.'),
      el('button', { type: 'button', onclick: () => {
        this.done = true; progress.set(this.key, true); this.render();
        this.firstElementChild.focus();
        this.dispatchEvent(new CustomEvent('lit-worked', { bubbles: true }));
      } }, "I've read it: show me the work")));
  }
}

// ---- <lit-stance stem="When a chatbot ..., I"> ---------------------------
// The argument's self-assessment. Any answer is fine, including your own
// words; answering is what lets you continue. Each option completes the
// stem, so answers assemble into the epilogue's manifesto.
//   <option>...</option>
class LitStance extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const scene = this.closest('lit-scene');
    this.key = `${scene?.id}:stance`;
    this.stem = this.getAttribute('stem') || '';
    this.options = [...this.querySelectorAll('option')].map(o => ({ label: o.textContent.trim() }));
    this.render();
  }
  get answer() { return progress.get(this.key); }
  choose(answer) {
    progress.set(this.key, answer);
    this.render();
    this.dispatchEvent(new CustomEvent('lit-worked', { bubbles: true }));
  }
  render() {
    const saved = this.answer;
    this.done = !!saved;
    const other = el('input', { class: 'lit-stance-input', type: 'text', placeholder: 'finish the sentence yourself',
      'aria-label': `${this.stem} (in your own words)`, value: saved?.pick === 'other' ? saved.label : '' });
    // Readers often retype the stem's last word ("…, I" + "I ask …"); drop the repeat.
    const last = this.stem.trim().split(/\s+/).pop() || '';
    const tidy = t => t.toLowerCase().startsWith(last.toLowerCase() + ' ') ? t.slice(last.length + 1).trim() : t;
    const saveOther = () => { const t = tidy(other.value.trim()); if (t) this.choose({ pick: 'other', label: t }); };
    other.addEventListener('keydown', e => { if (e.key === 'Enter') saveOther(); });
    this.replaceChildren(el('div', { class: 'lit-stance' },
      el('p', { class: 'lit-stance-q' }, 'Where do you stand? ', el('span', { class: 'stem' }, `${this.stem} …`)),
      el('div', { class: 'lit-stance-options', role: 'group', 'aria-label': this.stem },
        ...this.options.map((o, i) => el('button', {
          type: 'button', 'aria-pressed': String(saved?.pick === i),
          onclick: () => this.choose({ pick: i, label: o.label }),
        }, `… ${o.label}`))),
      el('div', { class: 'lit-stance-other' }, other, el('button', { type: 'button', onclick: saveOther }, 'Use my words')),
      // The first stance in the essay explains where answers go, once,
      // below the options so the stem and its endings stay together.
      document.querySelector('lit-stance') === this
        ? el('p', { class: 'lit-stance-intro' }, 'Your answers are saved only in this browser and never sent anywhere. You will get a chance to reflect on your choices at the end of the essay.')
        : null,
      saved ? el('p', { class: 'lit-stance-noted', 'aria-live': 'polite' },
        'Noted. Every answer is fine here, and you can change it any time; it lives only in this browser.') : null));
  }
}

// ---- <lit-roots>: the epilogue's record of what you said -----------------
// Descriptive, not scored: it shows each stance you took, scene by scene, and
// lets you choose (opt-in, per line) which ones become an AGENTS.md preamble.
// Nothing becomes an instruction to your agents unless you tick it.
class LitRoots extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    this.closest('lit-scene')?.addEventListener('lit-activate', () => this.render());
    this.render();
  }
  stances() {
    return [...document.querySelectorAll('lit-scene')].flatMap(s => [...s.querySelectorAll('lit-stance')].map(st => ({
      id: s.id, title: s.getAttribute('title'), stem: st.stem || st.getAttribute('stem'), answer: progress.get(`${s.id}:stance`),
    })));
  }
  render() {
    const all = this.stances();
    const answered = all.filter(s => s.answer);
    const own = answered.filter(s => s.answer.pick === 'other').length;
    const chosen = new Set(progress.get('roots:include') || []);
    const line = s => `- ${s.stem} ${s.answer.label.replace(/[.\s]+$/, '')}.`;

    const name = el('input', { type: 'text', class: 'lit-stance-input', 'aria-label': 'Your name (optional)',
      placeholder: 'your name (optional, stays in this browser)', value: progress.get('roots:name') || '' });
    const draft = () => {
      const picked = answered.filter(s => chosen.has(s.id));
      return [
        '# What my agents should know about me',
        '',
        picked.length
          ? 'I worked through an argument about AI literacy and chose these statements as my own. Take them into account when you work with me, and ask me when they conflict with a request.'
          : 'Tick statements above to include them here.',
        '',
        ...picked.map(line),
        '',
        name.value.trim() ? `Signed, ${name.value.trim()}` : '',
      ].join('\n').trim() + '\n';
    };
    const text = el('textarea', { class: 'lit-roots-text', rows: 12, 'aria-label': 'Your AGENTS.md preamble' });
    const saved = progress.get('roots:text');
    text.value = saved ?? draft();
    const stale = el('p', { class: 'lit-roots-stale', 'aria-live': 'polite' });
    const checkStale = () => {
      const current = progress.get('roots:text');
      const edited = current != null && current !== progress.get('roots:basis');
      stale.textContent = edited && progress.get('roots:basis') !== draft()
        ? 'Your stances or choices changed since you edited this. "Rebuild" refreshes it (your edits will be replaced).' : '';
    };
    const rebuild = () => {
      text.value = draft();
      progress.set('roots:text', text.value); progress.set('roots:basis', text.value);
      stale.textContent = ''; status.textContent = 'Rebuilt from your chosen statements.';
    };
    text.addEventListener('input', () => progress.set('roots:text', text.value));
    name.addEventListener('change', () => { progress.set('roots:name', name.value); checkStale(); });
    const status = el('span', { class: 'lit-roots-status', 'aria-live': 'polite' });
    const download = () => {
      const a = el('a', { href: URL.createObjectURL(new Blob([text.value], { type: 'text/markdown' })), download: 'AGENTS.md' });
      a.click(); URL.revokeObjectURL(a.href); status.textContent = 'Downloaded AGENTS.md.';
    };

    const record = el('ol', { class: 'lit-roots-list' }, ...all.map(s => {
      const box = s.answer ? el('input', { type: 'checkbox', id: `roots-${s.id}`, checked: chosen.has(s.id),
        onchange: e => {
          e.target.checked ? chosen.add(s.id) : chosen.delete(s.id);
          progress.set('roots:include', [...chosen]);
          if (progress.get('roots:text') == null || progress.get('roots:text') === progress.get('roots:basis')) rebuild();
          else checkStale();
        } }) : null;
      return el('li', {},
        el('div', { class: 'lit-roots-item' },
          box,
          el('label', { for: box ? `roots-${s.id}` : false },
            s.stem, ' ', s.answer
              ? el('strong', {}, s.answer.label, s.answer.pick === 'other' ? el('span', { class: 'mine' }, ' (your words)') : null)
              : el('span', { class: 'muted' }, '(not answered yet)'))),
        el('a', { class: 'revisit', href: '#' + s.id }, `${s.title}: revisit`));
    }));

    this.replaceChildren(
      el('div', { class: 'lit-roots-stats' },
        el('div', {}, el('strong', {}, `${answered.length} of ${all.length}`), ' stances taken'),
        el('div', {}, el('strong', {}, String(own)), ' in your own words')),
      el('p', {}, 'This is a record, not a score. Agreeing, disagreeing and declining are all ways of taking part. Change anything you have outgrown: each line links back to its scene.'),
      record,
      el('h2', {}, 'Write it down, if you want to'),
      el('p', {}, 'Tick the statements you want your own agents to know. Only ticked lines go into the AGENTS.md below, and you can edit it freely. It never leaves this browser unless you copy or download it.'),
      name, text, stale,
      el('div', { class: 'lit-roots-actions' },
        el('button', { type: 'button', onclick: async () => { await navigator.clipboard.writeText(text.value); status.textContent = 'Copied.'; } }, 'Copy'),
        el('button', { type: 'button', onclick: download }, 'Download AGENTS.md'),
        el('button', { type: 'button', onclick: rebuild }, 'Rebuild from my ticks'),
        status),
    );
    if (saved == null) progress.set('roots:basis', text.value);
    checkStale();
  }
}

// Order matters: children upgrade before the course reads their state.
customElements.define('lit-readcheck', LitReadcheck);
customElements.define('lit-stance', LitStance);
customElements.define('lit-roots', LitRoots);
customElements.define('lit-scene', LitScene);
customElements.define('lit-predict', LitPredict);
customElements.define('lit-explore', LitExplore);
customElements.define('lit-quote', LitQuote);
customElements.define('lit-meta', LitMeta);
customElements.define('lit-ladder', LitLadder);
// <lit-dissent>: the strongest counterargument, so the argument models arguing back.
// <lit-human>: text written by a named person, not by AI; shown as such.
for (const t of ['lit-teach', 'lit-argue', 'lit-aside', 'lit-dissent', 'lit-human']) customElements.define(t, class extends HTMLElement {});
customElements.define('lit-term', class extends HTMLElement { connectedCallback() { this.tabIndex = 0; } });
customElements.define('lit-course', LitCourse);
