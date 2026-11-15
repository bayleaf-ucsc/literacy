// Explorable kit: the contract every explorable spin builds on.
//
//   import { Explorable, h } from '../js/kit.js';
//   class TokensA extends Explorable {
//     static prediction = { question, options: [{ label, correct, feedback }], after };
//     static css = `...`;                 // extra styles for this spin's shadow root
//     mount(root) { ... }                 // build UI into the shadow root
//   }
//   customElements.define('x-tokens-a', TokensA);
//
// Call this.progress(done, total, note) as the learner works, and
// this.complete(note) once they have genuinely worked it (not on first click).
// Theme tokens (--lit-*) inherit into the shadow root; use them, not raw colors.

export const baseCSS = `
:host { display: block; font: 0.95rem/1.5 var(--lit-font-ui); color: var(--lit-fg); }
* { box-sizing: border-box; }
button, select, input { font: inherit; color: inherit; }
button {
  cursor: pointer; padding: 0.35rem 0.75rem; border-radius: var(--lit-radius);
  border: 1px solid var(--lit-border); background: var(--lit-surface);
}
button:hover:not(:disabled) { border-color: var(--lit-work); }
button.primary { background: var(--lit-work); border-color: var(--lit-work); color: var(--lit-bg); font-weight: 600; }
button:disabled { opacity: 0.55; cursor: default; }
button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 3px solid var(--lit-work); outline-offset: 2px; }
input[type=range] { width: 100%; accent-color: var(--lit-work); }
.card { background: var(--lit-surface); border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.75rem 0.9rem; }
.row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.grid2 { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.muted { color: var(--lit-muted); }
.mono { font-family: var(--lit-font-mono); }
.big { font-size: 1.6rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.num { font-variant-numeric: tabular-nums; }
/* A token chip: shows leading spaces as a visible dot. */
.tok {
  display: inline-flex; align-items: baseline; gap: 0.3rem;
  font-family: var(--lit-font-mono); white-space: pre;
  padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid var(--lit-border);
  background: var(--lit-teach-tint);
}
.tok .id { font-size: 0.7em; color: var(--lit-muted); }
.bar { height: 0.8rem; border-radius: 3px; background: var(--lit-work); }
.debrief { margin-top: 0.75rem; padding: 0.6rem 0.8rem; border-left: 3px solid var(--lit-work); background: var(--lit-surface); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

export class Explorable extends HTMLElement {
  static prediction = null;
  static css = '';
  connectedCallback() {
    if (this.root) return;
    this.root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = baseCSS + this.constructor.css;
    this.root.append(style);
    this.mount(this.root);
  }
  mount(_root) {}
  progress(done, total, note) {
    this.dispatchEvent(new CustomEvent('lit-progress', { bubbles: true, composed: true, detail: { done, total, note } }));
  }
  complete(note) {
    if (this._completed) return;
    this._completed = true;
    this.dispatchEvent(new CustomEvent('lit-complete', { bubbles: true, composed: true, detail: { note } }));
  }
}

// Tiny hyperscript: h('button', { class: 'primary', onclick }, 'Go').
// Attributes starting with "on" become listeners; "style" may be an object.
export function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  n.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return n;
}

// Format helpers shared by numeric explorables.
export const fmt = {
  n(x, digits = 2) {
    const units = [[1e15, ' quadrillion'], [1e12, ' trillion'], [1e9, ' billion'], [1e6, ' million'], [1e3, ' thousand']];
    for (const [v, s] of units) if (Math.abs(x) >= v) return (x / v).toPrecision(digits + 1).replace(/\.0+$/, '') + s;
    return String(Math.round(x));
  },
  usd(x) { return x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`; },
};
