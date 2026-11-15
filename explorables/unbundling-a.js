// Spin A for "unbundling": an instrument. Two bundles (a 1995 online service,
// a 2026 chat app) with the same three layers. Open each layer's note, drag
// the bundle apart, then mix layers and watch the count of working stacks.
import { Explorable, h } from '../js/kit.js';

const LAYERS = ['client', 'access', 'content'];

// Compatibility rules are deliberately simplified, scoped to this scenario, and
// labeled as such. Hosting weights and passing requests to someone's API are
// different things, so a reseller can offer a closed model it could never host.
const ERAS = {
  1995: {
    title: '1995: an online service',
    bundle: 'One icon, one monthly bill',
    names: { client: 'Client', access: 'Network access', content: 'Content' },
    notes: {
      client: 'The service shipped its own software on a floppy or CD. Later, a general web browser could reach any site, so the client stopped being tied to one company.',
      access: 'The service ran its own dial-up numbers. Once local ISPs sold plain internet access, the wire into your home no longer decided what you could read.',
      content: 'Member forums, news and chat lived inside the service. The open web put content on millions of servers, reachable from any browser over any ISP.',
    },
    options: {
      client: [['svc', 'The service’s own software'], ['browserA', 'A web browser'], ['browserB', 'A different web browser']],
      access: [['svc', 'The service’s dial-up'], ['isp', 'A local ISP'], ['campus', 'A campus modem pool']],
      content: [['svc', 'Members-only forums and chat'], ['web', 'The open web'], ['usenet', 'Usenet newsgroups']],
    },
    check(s) {
      if (s.content === 'svc' && s.client !== 'svc') return 'Members-only content opens only in the service’s own software.';
      if (s.client === 'svc' && s.access !== 'svc') return 'Simplified: in this scenario the service’s software logs in only over its own network.';
      return null;
    },
    offBundle: s => s.client !== 'svc' && s.access !== 'svc' && s.content !== 'svc',
  },
  2026: {
    title: '2026: a chat app',
    bundle: 'One app, one subscription',
    names: { client: 'Client', access: 'Inference provider', content: 'Model' },
    notes: {
      client: 'The app is just a client. Clients such as Open WebUI (hosted) or OpenChamber (desktop) speak a common API, so they can talk to many providers.',
      access: 'A provider runs the model on its machines. Marketplaces such as OpenRouter resell many providers; a campus service or your own laptop can be a provider too.',
      content: 'Closed models run only where their lab allows, though others may pass requests to the lab’s API. Open-weight models can be downloaded, so many providers (and you) can run the same one, within its license and your hardware.',
    },
    options: {
      client: [['lab', 'The lab’s own app'], ['owui', 'Open WebUI (hosted)'], ['desk', 'OpenChamber (desktop)']],
      access: [['lab', 'The lab’s own servers'], ['market', 'A marketplace'], ['campus', 'A campus service'], ['laptop', 'Your laptop']],
      content: [['closed', 'The lab’s closed model'], ['openL', 'Large open-weight model'], ['openS', 'Small open-weight model']],
    },
    check(s) {
      if (s.client === 'lab' && s.access !== 'lab') return 'Simplified: in this scenario the lab’s app connects only to the lab’s servers.';
      if (s.access === 'lab' && s.content !== 'closed') return 'Simplified: in this scenario the lab serves only its own closed model.';
      if (s.content === 'closed' && s.access === 'laptop') return 'Closed weights are not handed out, so your laptop cannot host them. (Marketplaces and campus services reach them by passing requests to the lab’s API.)';
      if (s.access === 'laptop' && s.content === 'openL') return 'This scenario’s laptop has 16 GB of memory; a large model does not fit.';
      if (s.client === 'owui' && s.access === 'laptop') return 'Simplified: in this setup the hosted client has no network path to your laptop.';
      return null;
    },
    offBundle: s => s.client !== 'lab' && s.access !== 'lab' && s.content !== 'closed',
  },
};

function countWorking(era) {
  const o = era.options; let n = 0;
  for (const [c] of o.client) for (const [a] of o.access) for (const [m] of o.content)
    if (!era.check({ client: c, access: a, content: m })) n++;
  return n;
}

class UnbundlingA extends Explorable {
  static prediction = {
    question: 'You leave a lab’s chat app for a different client. Do you have to give up the model you were using?',
    options: [
      { label: 'Yes: the model comes with the app', correct: false,
        feedback: 'The app is only the top layer. The same model is usually reachable through an API from other clients, and open-weight models can be run by many providers, including you.' },
      { label: 'Not necessarily: the layers can be chosen separately', correct: true,
        feedback: 'Client, provider and model are separate layers joined by a common API. What limits your mix is mostly who may serve the model (open weights, licenses, API resale) and where it fits.' },
    ],
    after: 'Open every layer’s note, pull each bundle apart, estimate how many mixes work, then build a stack with no piece from the lab.',
  };

  static literacies = {
    read: 'You read how each layer of a 1995 online service and a 2026 chat app came apart.',
    write: 'You compose your own stack, layer by layer, until nothing in it comes from the lab.',
    count: 'Before the count appears, you estimate how many of the 27 or 36 possible mixes actually work.',
  };

  static css = `
    .eras { display: flex; gap: 0.4rem; margin-bottom: 0.6rem; }
    .eras button[aria-pressed="true"] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .stack { display: flex; flex-direction: column; border: 2px solid var(--lit-work); border-radius: var(--lit-radius); padding: 0.4rem; transition: gap 0.25s, border-color 0.25s; }
    .stack[data-apart] { border-color: transparent; padding: 0; }
    .layer { background: var(--lit-surface); border: 1px solid var(--lit-border); border-radius: var(--lit-radius); padding: 0.5rem 0.7rem; }
    .layer .head { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .layer h3 { margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--lit-muted); }
    .layer .note { margin: 0.4rem 0 0; font-size: 0.9rem; }
    .layer button[aria-expanded="true"] { border-color: var(--lit-work); }
    .layer select { width: 100%; margin-top: 0.4rem; padding: 0.3rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
    .seen { color: var(--lit-work); font-size: 0.8rem; }
    .bundle-tag { text-align: center; font-weight: 600; color: var(--lit-work); padding: 0.25rem; }
    label.slide { display: block; margin: 0.8rem 0 0.2rem; font-weight: 600; }
    input[type=range] { display: block; margin: 0.2rem 0; }
    .ends { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--lit-muted); }
    .readout { margin-top: 0.7rem; display: grid; gap: 0.5rem; grid-template-columns: auto 1fr; align-items: center; }
    .verdict { padding: 0.5rem 0.7rem; border-left: 3px solid var(--lit-border); background: var(--lit-surface); margin-top: 0.5rem; }
    .verdict[data-ok="true"] { border-color: var(--lit-good); }
    .verdict[data-ok="false"] { border-color: var(--lit-bad); }
    .estimate input { width: 5rem; padding: 0.3rem; border: 1px solid var(--lit-border); border-radius: var(--lit-radius); background: var(--lit-bg); }
  `;

  mount(root) {
    this.era = '1995';
    this.apart = { 1995: 0, 2026: 0 };
    this.pick = {
      1995: { client: 'svc', access: 'svc', content: 'svc' },
      2026: { client: 'lab', access: 'lab', content: 'closed' },
    };
    this.opened = new Set();     // `${era}:${layer}`
    this.unbundled = new Set();  // eras pulled fully apart
    this.freed = false;          // built a working off-bundle 2026 stack
    this.est = {};               // era -> estimated count of working stacks
    this.draft = {};             // era -> estimate typed but not yet checked
    this.openNote = null;

    this.tabs = h('div', { class: 'eras', role: 'group', 'aria-label': 'Era' },
      ...Object.keys(ERAS).map(k => h('button', { type: 'button', 'data-era': k, onclick: () => { this.era = k; this.openNote = null; this.render(); } }, ERAS[k].title)));
    this.stack = h('div', { class: 'stack' });
    this.slider = h('input', { type: 'range', min: 0, max: 100, step: 1, id: 'apart',
      oninput: e => { this.apart[this.era] = +e.target.value; if (+e.target.value === 100) this.unbundled.add(this.era); this.render(); } });
    this.readout = h('div');
    root.append(this.tabs, this.stack,
      h('label', { class: 'slide', for: 'apart' }, 'Pull the bundle apart'),
      this.slider, h('div', { class: 'ends', 'aria-hidden': 'true' }, h('span', {}, 'one bundle'), h('span', {}, 'three separate layers')),
      this.readout);
    this.render();
  }

  // Re-rendering replaces controls, so carry keyboard focus across by key.
  render() {
    const focusKey = this.root.activeElement?.dataset?.key;
    this.draw();
    if (focusKey) this.root.querySelector(`[data-key="${focusKey}"]`)?.focus();
  }

  draw() {
    const era = ERAS[this.era], apart = this.apart[this.era], s = this.pick[this.era];
    const loose = apart >= 100;
    for (const b of this.tabs.children) b.setAttribute('aria-pressed', String(b.dataset.era === this.era));
    this.slider.value = apart;
    this.slider.setAttribute('aria-valuetext', loose ? 'fully apart' : apart === 0 ? 'bundled' : `${apart} percent apart`);
    this.stack.toggleAttribute('data-apart', loose);
    this.stack.style.gap = `${0.15 + apart / 100 * 0.85}rem`;

    const layers = LAYERS.map(L => {
      const key = `${this.era}:${L}`, open = this.openNote === key;
      const select = loose ? h('select', { 'data-key': `sel-${L}`, 'aria-label': `Choose ${era.names[L].toLowerCase()}`,
        onchange: e => { s[L] = e.target.value; this.render(); } },
        ...era.options[L].map(([v, label]) => h('option', { value: v, selected: s[L] === v }, label))) : null;
      return h('div', { class: 'layer' },
        h('div', { class: 'head' },
          h('h3', {}, era.names[L]),
          h('span', { class: 'row' },
            this.opened.has(key) ? h('span', { class: 'seen' }, 'read') : null,
            h('button', { type: 'button', 'data-key': `note-${L}`, 'aria-expanded': String(open),
              'aria-label': `${open ? 'Hide note' : 'How it came apart'}: ${era.names[L].toLowerCase()}`,
              onclick: () => { this.openNote = open ? null : key; this.opened.add(key); this.render(); } }, open ? 'Hide note' : 'How it came apart'))),
        loose ? select : h('div', { class: 'muted' }, era.options[L].find(([v]) => v === s[L])[1]),
        open ? h('p', { class: 'note' }, era.notes[L]) : null);
    });
    this.stack.replaceChildren(...(apart < 100 ? [h('div', { class: 'bundle-tag' }, era.bundle)] : []), ...layers);
    if (apart < 100) this.stack.firstChild.style.opacity = String(1 - apart / 100);

    const total = era.options.client.length * era.options.access.length * era.options.content.length;
    const working = loose ? countWorking(era) : 1;
    const why = loose ? era.check(s) : null;
    if (loose && !why && this.era === '2026' && era.offBundle(s)) this.freed = true;
    const guess = this.est[this.era];
    const count = !loose
      ? h('div', { class: 'readout' }, h('span', { class: 'big num' }, '1'), h('span', {}, 'working stack: the one the bundle sells you'))
      : guess == null ? this.estimateBox(total)
      : h('div', {},
        h('div', { class: 'readout' },
          h('span', { class: 'big num' }, String(working)),
          h('span', {}, `working stacks out of ${total} combinations (simplified rules)`)),
        h('div', { class: 'muted' }, `You estimated ${guess}: ${guess === working ? 'exactly right' : `off by ${Math.abs(guess - working)}`}.`));
    this.readout.replaceChildren(count,
      loose ? h('div', { class: 'verdict', 'data-ok': String(!why), role: 'status' },
        why ? `Will not work: ${why}` : era.offBundle(s)
          ? 'Works, and nothing in this stack comes from the original bundle.'
          : 'Works. Try swapping every layer away from the original company.') : '');

    const done = this.opened.size + this.unbundled.size + Object.keys(this.est).length + (this.freed ? 1 : 0);
    if (done >= 11) {
      this.complete('Once the layers come apart, a common API lets you swap client and provider, and open weights (within their license and your hardware) let others host the model, a different freedom from the open protocols that freed the ISP.');
    } else {
      const left = [];
      if (this.opened.size < 6) {
        const here = [...this.opened].filter(k => k.startsWith(`${this.era}:`)).length;
        left.push(here < 3 ? `${6 - this.opened.size} notes to read` : `${6 - this.opened.size} notes to read in the other era`);
      }
      if (this.unbundled.size < 2) left.push(`pull ${2 - this.unbundled.size === 2 ? 'both eras' : 'the other era'} fully apart`);
      const unguessed = Object.keys(ERAS).filter(k => this.est[k] == null).length;
      if (unguessed) left.push(`estimate the working stacks in ${unguessed === 2 ? 'both eras' : 'one more era'}`);
      if (!this.freed) left.push('build a working 2026 stack with no piece from the lab');
      this.progress(done, 11, `Still to do: ${left.join('; ')}.`);
    }
  }

  // Asked once per era, the moment the layers come loose and before the count shows.
  estimateBox(total) {
    const era = this.era;
    const input = h('input', { type: 'number', min: 0, max: total, step: 1, inputmode: 'numeric', 'data-key': 'est',
      'aria-label': `Estimated working stacks out of ${total}`, value: this.draft[era] ?? '',
      oninput: e => { this.draft[era] = e.target.value; } });
    const commit = () => {
      const n = Math.round(Number(input.value));
      if (input.value === '' || !(n >= 0 && n <= total)) { input.focus(); return; }
      this.est[era] = n;
      this.render();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
    return h('div', { class: 'estimate' },
      h('p', { style: { margin: '0 0 0.3rem' } }, `Before the count: the layers now offer ${total} combinations. Roughly how many do you think actually work?`),
      h('div', { class: 'row' }, input, h('button', { type: 'button', 'data-key': 'est-go', onclick: commit }, 'Check my estimate')));
  }
}

customElements.define('x-unbundling-a', UnbundlingA);
