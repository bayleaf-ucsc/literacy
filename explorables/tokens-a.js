// Tokens, spin A (instrument): rebuild a sentence from a small vocabulary of
// token chips. Several builds read the same; this toy vocabulary allows a fewest-token
// build, but a real tokenizer follows its own fixed rules, and other vocabularies cut
// the same text differently. Ids are illustrative (GPT-2-like).
import { Explorable, h } from '../js/kit.js';

const TARGET = 'The cat sat on the mat.';
const MIN = 7;
const MAX_CHIPS = 20;

// Deliberately jumbled order. Each chip: [text, id].
const VOCAB = [
  [' sat', 3332], ['t', 83], [' the', 262], ['The', 464], [' m', 285],
  ['cat', 9246], [' on', 319], ['at', 265], [' ca', 1275], ['.', 13],
  [' ', 220], [' mat', 2603], ['the', 1169], [' s', 264], [' cat', 3797],
];

// Render text with each space as a visible dot.
function spaced(text) {
  return [...text].map(c => c === ' ' ? h('span', { class: 'sp', 'aria-hidden': 'true' }, '·') : c);
}
function spoken(text) {
  return text.replace(/ /g, 'space ').trim();
}
function chip(text, id) {
  return h('span', { class: 'tok' }, h('span', {}, spaced(text)), h('span', { class: 'id' }, String(id)));
}

class TokensA extends Explorable {
  static prediction = {
    question: 'An LLM reads "The cat sat on the mat." as a sequence of tokens. Where do the spaces between words usually go?',
    options: [
      { label: 'Each space is its own token, between the word tokens', correct: false,
        feedback: 'A lone space token exists in many vocabularies, but it is rarely used between ordinary words. In many vocabularies common words are stored with their leading space attached (" cat"), which saves a token per word. You will find a lone space chip below: try using it and watch the count.' },
      { label: 'Most spaces ride along at the front of the next word', correct: true,
        feedback: 'Many vocabularies store common words with their leading space attached, so " cat" is one token. That is why "cat" and " cat" can have different ids. Other tokenizers mark spaces differently: a common design, not a law.' },
    ],
    after: 'Guess the shortest build first, then rebuild the sentence from the chips. Dots mark spaces. Try more than one way.',
  };

  static literacies = {
    read: 'You read token chips, with their ids and visible spaces, as the pieces a model actually sees.',
    write: 'You compose the target sentence chip by chip, more than one way.',
    count: 'You guess the fewest tokens the sentence can take before building it, then see how close you were.',
  };

  static css = `
    .sp { color: var(--lit-muted); }
    .target { font-family: var(--lit-font-mono); font-size: 1.05rem; }
    .palette { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .palette button { padding: 0.15rem; border: 1px solid transparent; background: none; }
    .palette button .tok { font-size: 1rem; }
    .palette button:hover:not(:disabled) .tok { border-color: var(--lit-work); }
    .built { min-height: 2.4rem; display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; }
    .built .tok { background: var(--lit-work-tint); }
    .built .tok.off { border-color: var(--lit-bad); background: var(--lit-surface); }
    .readout { font-family: var(--lit-font-mono); overflow-wrap: anywhere; }
    .ok { color: var(--lit-good); font-weight: 600; }
    .bad { color: var(--lit-bad); font-weight: 600; }
    .found { margin: 0.25rem 0 0; padding-left: 1.2rem; }
    .found li { font-family: var(--lit-font-mono); font-size: 0.85rem; overflow-wrap: anywhere; }
    .stack > * + * { margin-top: 0.75rem; }
    .guess { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem; }
    .guess button { min-width: 2.4rem; font-variant-numeric: tabular-nums; }
    .guess button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--lit-muted); margin-bottom: 0.25rem; }
  `;

  mount(root) {
    this.seq = [];            // indices into VOCAB
    this.guess = null;        // learner's estimate of the fewest tokens, made before building
    this.builds = new Map();  // id-sequence key -> token count
    this.built = h('div', { class: 'built', 'aria-live': 'polite' });
    this.text = h('div', { class: 'readout' });
    this.ids = h('div', { class: 'readout muted' });
    this.verdict = h('p', { style: { margin: 0 } });
    this.foundList = h('ol', { class: 'found' });
    this.undoBtn = h('button', { type: 'button', onclick: () => { this.seq.pop(); this.update(); } }, 'Undo');
    this.clearBtn = h('button', { type: 'button', onclick: () => { this.seq = []; this.update(); } }, 'Clear');
    this.paletteBtns = VOCAB.map(([t, id], i) => h('button', {
      type: 'button', 'aria-label': `Add token "${spoken(t)}", id ${id}`,
      onclick: () => { if (this.seq.length < MAX_CHIPS) { this.seq.push(i); this.update(); } },
    }, chip(t, id)));
    this.guessNote = h('div', { class: 'muted', style: { fontSize: '0.85rem', marginTop: '0.3rem' }, 'aria-live': 'polite' },
      'Pick a number to unlock the chips.');
    this.guessBtns = [5, 6, 7, 8, 9, 10, 11, 12].map(n => h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => {
      this.guess = n;
      this.guessBtns.forEach(b => { b.disabled = true; b.setAttribute('aria-pressed', String(b === this.guessBtns[n - 5])); });
      this.guessNote.textContent = `Your guess: ${n} tokens. Now build.`;
      this.update(); this.paletteBtns[0].focus();
    } }, String(n)));

    root.append(h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('div', { class: 'label' }, 'Target'),
        h('div', { class: 'target' }, spaced(TARGET)),
        h('div', { class: 'muted', style: { fontSize: '0.85rem' } }, '· marks a space. Ids are illustrative. Another tokenizer would offer different chips and cut this differently.')),
      h('div', { class: 'card' },
        h('div', { class: 'label' }, 'Estimate first'),
        h('div', {}, 'What is the fewest tokens this sentence can take from the vocabulary below?'),
        h('div', { class: 'guess', role: 'group', 'aria-label': 'Your estimate in tokens' }, this.guessBtns),
        this.guessNote),
      h('div', {},
        h('div', { class: 'label' }, 'Vocabulary (click to add)'),
        h('div', { class: 'palette' }, this.paletteBtns)),
      h('div', { class: 'card' },
        h('div', { class: 'label' }, 'Your build'),
        this.built,
        h('div', { class: 'label', style: { marginTop: '0.5rem' } }, 'As text'),
        this.text,
        h('div', { class: 'label', style: { marginTop: '0.5rem' } }, 'What the model receives'),
        this.ids,
        h('div', { class: 'row', style: { marginTop: '0.6rem' } }, this.undoBtn, this.clearBtn)),
      this.verdict,
      h('div', {}, h('div', { class: 'label' }, 'Builds that match'), this.foundList),
    ));
    this.update();
  }

  update() {
    const toks = this.seq.map(i => VOCAB[i]);
    const str = toks.map(t => t[0]).join('');
    // Mark chips that run past the longest correct prefix.
    let pos = 0, okSoFar = true;
    this.built.replaceChildren(...(toks.length ? toks.map(([t, id]) => {
      const fits = okSoFar && TARGET.startsWith(t, pos);
      okSoFar = fits; pos += t.length;
      const c = chip(t, id);
      if (!fits) c.classList.add('off');
      return c;
    }) : [h('span', { class: 'muted' }, 'Nothing yet.')]));
    this.text.replaceChildren(...(str ? spaced(str) : ['""']));
    this.ids.textContent = `[${toks.map(t => t[1]).join(', ')}]  (${toks.length} token${toks.length === 1 ? '' : 's'})`;
    this.undoBtn.disabled = this.clearBtn.disabled = !toks.length;
    this.paletteBtns.forEach(b => { b.disabled = this.guess == null || toks.length >= MAX_CHIPS; });

    if (str === TARGET) {
      const key = toks.map(t => t[1]).join(',');
      const isNew = !this.builds.has(key);
      this.builds.set(key, toks.length);
      const best = toks.length === MIN;
      this.verdict.replaceChildren(h('span', { class: 'ok' }, `Matches in ${toks.length} tokens. `),
        best ? 'That is the fewest this toy vocabulary allows: one token per word, plus the period. ' +
                (this.guess === MIN ? `You guessed ${MIN} exactly.` : `You guessed ${this.guess}, ${Math.abs(this.guess - MIN)} ${this.guess > MIN ? 'too many' : 'too few'}.`)
             : `Same text, but ${toks.length - MIN} more token${toks.length - MIN === 1 ? '' : 's'} than needed. Can you find a shorter build?`,
        isNew ? '' : ' (You found this build already.)');
    } else if (this.guess == null) {
      this.verdict.replaceChildren(h('span', { class: 'muted' }, 'Make your estimate to unlock the vocabulary.'));
    } else if (!str) {
      this.verdict.replaceChildren(h('span', { class: 'muted' }, 'Start with the chip that begins the sentence.'));
    } else if (TARGET.startsWith(str)) {
      this.verdict.replaceChildren(h('span', { class: 'muted' }, `On track: ${str.length} of ${TARGET.length} characters.`));
    } else {
      let i = 0; while (str[i] === TARGET[i]) i++;
      const why = str[i] === undefined ? '' : (TARGET[i] === ' ' && str[i] !== ' ') ? ' A space is missing: look for a chip that starts with ·.'
        : (str[i] === ' ' && TARGET[i] !== ' ') ? ' There is an extra space here.' : '';
      this.verdict.replaceChildren(h('span', { class: 'bad' }, `Off at character ${i + 1}.`), why, ' Undo and try another chip.');
    }
    this.renderFound();
  }

  renderFound() {
    const entries = [...this.builds.entries()].sort((a, b) => a[1] - b[1]);
    this.foundList.replaceChildren(...(entries.length ? entries.map(([key, n]) =>
      h('li', {}, `${n} tokens: [${key.split(',').join(', ')}]`))
      : [h('li', { class: 'muted', style: { listStyle: 'none', marginLeft: '-1.2rem' } }, 'None yet. Find the shortest build and at least one longer one.')]));
    const n = entries.length;
    const hasMin = entries.some(([, c]) => c === MIN);
    const done = (hasMin ? 1 : 0) + (entries.some(([, c]) => c > MIN) ? 1 : 0);
    if (hasMin && n >= 2) {
      this.complete(`Several token sequences spell the same sentence, and this toy vocabulary allows a fewest. A real tokenizer does not search for the shortest: it applies its own fixed rules, and a different vocabulary, or the same meaning in another language, would be cut into a different count. Whoever builds the vocabulary shapes those counts, and the model only ever sees the numbers.`);
    } else {
      this.progress(done, 2, n ? `${n} matching build${n === 1 ? '' : 's'} found. ${hasMin ? 'Now find a longer one that reads the same.' : `Fewest so far: ${entries[0][1]} tokens.`}`
        : 'Rebuild the target sentence.');
    }
  }
}

customElements.define('x-tokens-a', TokensA);
