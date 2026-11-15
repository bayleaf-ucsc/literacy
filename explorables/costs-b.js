// Costs, spin B: a puzzle with a role. You run AI for a small campus office
// for a term. Every job defaults to the medium model, and the plan is over
// budget. For each job the learner first settles, with the people it affects,
// what counts as done; then picks a route that meets that standard within a
// money budget and an energy budget. Routes include the three model sizes
// and, where reasonable, search over community-written sources, a person's
// check, or no AI at all, whose people-hours show on a meter no budget caps.
// Verdicts are hidden until the term runs, so the learner reasons from the
// job and the standard. All prices, energy and verdicts are simulated.
import { Explorable, h } from '../js/kit.js';

// Illustrative blended price per million tokens, and rough joules per token
// (about 1 J per token per 70B active parameters).
const TIERS = [
  { id: 's', name: 'Small', size: '~2B', price: 0.05, j: 0.03 },
  { id: 'm', name: 'Medium', size: '~30B', price: 0.5, j: 0.4 },
  { id: 'l', name: 'Large', size: '~400B', price: 10, j: 6 },
];
const tier = id => TIERS.find(t => t.id === id);
const BUDGET_USD = 5;
const BUDGET_KWH = 0.8;
const KETTLE_KWH = 0.1; // rough: boiling one liter of water

// A route: a model tier (or none) running some tokens, plus hours of a
// person's time. Each standard lists the routes that meet it.
const r = (id, name, model, tokens, hours, note) => ({ id, name, model, tokens, hours, note });
const JOBS = [
  { title: 'Sort 5,000 help-desk emails into four queues', who: 'students writing in, and the help-desk staff',
    routes: [
      r('s', 'Small', 's', 1.5e6, 0, 'Routine sorting goes fine, but a few urgent emails written without the usual words land in the wrong queue.'),
      r('m', 'Medium', 'm', 1.5e6, 0, 'Medium also catches the urgent emails written in unusual words.'),
      r('l', 'Large', 'l', 1.5e6, 0, 'Large sorts well too, at twenty times Medium’s money and fifteen times its energy.'),
      r('none', 'No AI', null, 0, 14, 'Staff sort by hand: reliable, and about 14 hours of someone’s time.'),
    ],
    standards: [
      { say: 'Staff skim every queue anyway; a misfiled email just gets moved.', ok: ['s', 'm', 'l', 'none'] },
      { say: 'Anyone about to lose housing must reach a person the same day.', ok: ['m', 'l', 'none'] },
    ] },
  { title: 'Autocomplete in the office’s student code lab, all term', who: 'student developers using the lab',
    routes: [
      r('s', 'Small', 's', 20e6, 0, 'Huge volume, quick suggestions: Small keeps up and costs little.'),
      r('m', 'Medium', 'm', 20e6, 0, 'Medium works, at ten times Small’s price across 20 million tokens.'),
      r('l', 'Large', 'l', 20e6, 0, 'Large here would cost more than every other job combined.'),
      r('none', 'Off', null, 0, 0, 'Autocomplete off: students type and look things up themselves.'),
    ],
    standards: [
      { say: 'We want fast suggestions; we review every line we accept.', ok: ['s', 'm', 'l'] },
      { say: 'The intro-course students asked for it off while they learn.', ok: ['none'] },
    ] },
  { title: 'Find the one clause in a 300-page lease that moves the deadline', who: 'tenants who could lose their place over a missed deadline',
    routes: [
      r('s', 'Small', 's', 150e3, 0, 'A detail buried deep in a long document tests attention; Small skims past it.'),
      r('m', 'Medium', 'm', 150e3, 0, 'Medium finds the clause. Nobody checked its answer.'),
      r('l', 'Large', 'l', 150e3, 0, 'Large finds it too, at twenty times the price. Nobody checked its answer.'),
      r('check', 'Medium + advocate', 'm', 150e3, 1, 'Medium points to the clause; a tenant advocate confirms it in about an hour.'),
      r('none', 'Advocate reads it', null, 0, 6, 'A tenant advocate reads the lease: about six hours.'),
    ],
    standards: [
      { say: 'Point us to the right clause; we will read it ourselves.', ok: ['m', 'l', 'check', 'none'] },
      { say: 'A missed deadline costs a home: a person checks every answer.', ok: ['check', 'none'] },
    ] },
  { title: 'Agent: fix a failing test suite in a mid-size project', who: 'the student who maintains the project',
    routes: [
      r('s', 'Small', 's', 12e6, 0, 'Small wanders for 12 million tokens and never gets the suite to pass.'),
      r('m', 'Medium', 'm', 8e6, 0, 'Medium gets there after 8 million tokens of wrong turns: more energy than the whole term’s budget.'),
      r('l', 'Large', 'l', 3e5, 0, 'Large takes the short path, so here it costs less than Medium: the crossover from the instrument above.'),
      r('none', 'Maintainer fixes it', null, 0, 4, 'The maintainer fixes it by hand in about four hours, and knows the code better afterward.'),
    ],
    standards: [
      { say: 'Any fix that passes is fine; I review the diff either way.', ok: ['m', 'l', 'none'] },
      { say: 'I would rather fix it myself and learn the code.', ok: ['none'] },
    ] },
  { title: 'Answer a question about the 1985 Watsonville cannery strike', who: 'the person asking, and the families and organizers whose history it is',
    routes: [
      r('s', 'Small', 's', 3e3, 0, 'Small has not memorized obscure local history, and makes things up.'),
      r('m', 'Medium', 'm', 3e3, 0, 'Medium half-remembers and mixes up the dates.'),
      r('l', 'Large', 'l', 3e3, 0, 'Large recalls a fair summary from training, but cannot say where any of it came from.'),
      r('rag', 'Small + archive search', 's', 2e4, 0, 'Small reads passages from a community oral-history archive (simulated) and cites them.'),
      r('none', 'Ask a local historian', null, 0, 0.5, 'A local historian answers in about half an hour, with sources.'),
    ],
    standards: [
      { say: 'A quick, fair summary is enough; it is for a class discussion.', ok: ['l', 'rag', 'none'] },
      { say: 'Cite what the community wrote; no unsourced claims about our strike.', ok: ['rag', 'none'] },
    ] },
  { title: 'Translate the move-in guide into Spanish', who: 'Spanish-speaking residents',
    routes: [
      r('s', 'Small', 's', 2e4, 0, 'The smallest model’s Spanish reads awkwardly and drops details.'),
      r('m', 'Medium', 'm', 2e4, 0, 'Medium reads naturally. Nobody fluent has checked it.'),
      r('l', 'Large', 'l', 2e4, 0, 'Large reads naturally too, at twenty times Medium’s price. Nobody fluent has checked it.'),
      r('check', 'Medium + reviewer', 'm', 2e4, 1.5, 'Medium drafts; a fluent resident reviews it in about 90 minutes.'),
      r('none', 'A person translates', null, 0, 6, 'A fluent speaker translates it: about six hours, paid.'),
    ],
    standards: [
      { say: 'Readable is enough; we will ask the office about anything unclear.', ok: ['m', 'l', 'check', 'none'] },
      { say: 'Someone fluent from the building reviews it before it goes out.', ok: ['check', 'none'] },
    ] },
];

const nice = x => Number(x.toPrecision(2));
const usd = x => x === 0 ? '$0' : x >= 0.01 ? `$${x.toFixed(2)}` : x >= 0.001 ? `$${x.toFixed(3)}` : 'under $0.001';
const tokText = t => t >= 1e6 ? `${nice(t / 1e6)}M` : `${nice(t / 1e3)}k`;
const cost = rt => rt.model ? rt.tokens / 1e6 * tier(rt.model).price : 0;
const kwh = rt => rt.model ? rt.tokens * tier(rt.model).j / 3.6e6 : 0;
const routeOf = (job, id) => job.routes.find(x => x.id === id);
const sub = rt => [rt.model ? `${usd(cost(rt))} · ${tokText(rt.tokens)} tok` : '$0', rt.hours ? `+${nice(rt.hours)} h of a person` : null].filter(Boolean).join(' · ');

class CostsB extends Explorable {
  static prediction = {
    question: 'Your office runs six AI jobs this term, all on a medium-sized model, and the bill is over budget. Where is most of the money going?',
    options: [
      { label: 'The hardest jobs, which need the most capable model', feedback: 'Hard jobs are often small: a question, a document, a few thousand tokens. Even on a large model they cost cents. The bill is driven by volume, so the place to look first is the routine work you run millions of tokens through.' },
      { label: 'Routine, high-volume jobs on a bigger model than they need', correct: true, feedback: 'Yes. You just saw that cost is price times tokens; across a whole office, the tokens term dominates. Routine jobs run millions of tokens, so moving them to a small model, or off AI, saves far more than anything you do with the hard jobs.' },
    ],
    after: 'Now settle with the people each job affects what counts as done, then right-size the plan. Prices, energy and the verdicts are simulated.',
  };

  static literacies = {
    read: 'You interpret six jobs and what the people each one affects say counts as done, then read the verdicts after each run.',
    write: 'You compose a term’s plan, a standard and a route for every job, and revise it after reading how each went.',
    count: 'You estimate what share of the all-Medium bill its biggest job takes, then see the real share, and keep two budgets and the people-hours in view.',
  };

  static css = `
    .brief { margin: 0 0 0.75rem; }
    .meters { display: grid; gap: 0.5rem; margin-bottom: 0.75rem; }
    .meter .top { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.9rem; }
    .track { height: 0.8rem; border-radius: 3px; background: var(--lit-surface-2); overflow: hidden; }
    .track .bar { transition: width 0.2s; }
    .meter[data-over] .bar { background: var(--lit-bad); }
    .meter[data-over] .top .num { color: var(--lit-bad); font-weight: 600; }
    .jobs { display: grid; gap: 0.5rem; padding: 0; margin: 0; list-style: none; }
    .job .title { font-weight: 600; }
    .job .who { font-size: 0.85rem; color: var(--lit-muted); }
    .label { font-size: 0.85rem; margin: 0.4rem 0 0.25rem; }
    .stds { display: grid; gap: 0.3rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
    .stds button { text-align: left; font-size: 0.85rem; line-height: 1.3; padding: 0.3rem 0.5rem; }
    .tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr)); gap: 0.35rem; }
    .tiers button { padding: 0.25rem 0.4rem; font-size: 0.85rem; line-height: 1.25; text-align: left; }
    .tiers button small { display: block; color: var(--lit-muted); font-variant-numeric: tabular-nums; }
    .stds button[aria-pressed=true], .tiers button[aria-pressed=true] { background: var(--lit-work-tint); border-color: var(--lit-work); font-weight: 600; }
    .verdict { margin: 0.4rem 0 0; font-size: 0.88rem; }
    .verdict b[data-ok=true] { color: var(--lit-good); }
    .verdict b[data-ok=false] { color: var(--lit-bad); }
    .check { margin-top: 0.75rem; }
    .result { margin-top: 0.5rem; }
    .guess { margin-bottom: 0.75rem; font-size: 0.92rem; }
    .guess .row { margin-top: 0.35rem; flex-wrap: nowrap; }
    .guess-out { margin: 0.4rem 0 0; }
    .guess-out:empty { display: none; }
  `;

  mount(root) {
    this.plan = JOBS.map(() => 'm');
    this.std = JOBS.map(() => null); // index of the standard settled for each job
    this.checks = 0;
    this.checked = JOBS.map(() => false);

    this.costMeter = this.meter('Money', BUDGET_USD);
    this.energyMeter = this.meter('Energy', BUDGET_KWH);
    this.hoursMeter = this.meter('People’s time', 30); // the bar's scale only, not a budget
    this.cards = JOBS.map((job, i) => {
      const stdButtons = job.standards.map((st, k) => h('button', {
        type: 'button', onclick: () => this.agree(i, k),
      }, `“${st.say}”`));
      const buttons = job.routes.map(rt => h('button', {
        type: 'button', 'aria-label': `${rt.name} for: ${job.title}`,
        onclick: () => this.assign(i, rt.id),
      }, rt.name, h('small', {}, sub(rt))));
      const verdict = h('p', { class: 'verdict', 'aria-live': 'polite', hidden: true });
      const li = h('li', { class: 'card job' },
        h('div', { class: 'title' }, job.title),
        h('div', { class: 'who' }, `Affects ${job.who}.`),
        h('div', { class: 'label' }, h('strong', {}, 'Done means: '), 'which standard did they settle on?'),
        h('div', { class: 'stds', role: 'group', 'aria-label': `What counts as done for: ${job.title}` }, stdButtons),
        h('div', { class: 'label' }, h('strong', {}, 'Route:')),
        h('div', { class: 'tiers', role: 'group', 'aria-label': `Route for: ${job.title}` }, buttons),
        verdict);
      return { li, stdButtons, buttons, verdict };
    });
    this.result = h('div', { class: 'result', 'aria-live': 'polite' });

    // Count: before reassigning anything, estimate how lopsided the default bill is.
    this.guess = null;
    this.guessIn = h('input', { type: 'range', min: 0, max: 100, step: 5, value: 30, 'aria-label': 'Your estimate, percent of the bill',
      oninput: () => { this.guessVal.textContent = `${this.guessIn.value}%`; this.guessIn.setAttribute('aria-valuetext', `${this.guessIn.value} percent`); } });
    this.guessVal = h('span', { class: 'num' }, '30%');
    this.guessBtn = h('button', { type: 'button', onclick: () => this.lockGuess() }, 'Lock in');
    this.guessOut = h('p', { class: 'guess-out', 'aria-live': 'polite' });

    root.append(
      h('p', { class: 'brief' }, `You run AI for a small campus office this term. Every job starts on Medium, and the plan is over budget. For each job, first settle with the people it affects what counts as done, then pick a route that meets it within the office’s ${usd(BUDGET_USD)} and ${BUDGET_KWH} kWh. Some routes use a person, or no model at all. Model prices are per job, at illustrative rates: Small ${TIERS[0].size}, Medium ${TIERS[1].size}, Large ${TIERS[2].size} active parameters.`),
      h('div', { class: 'card guess' },
        h('div', {}, h('strong', {}, 'Estimate first: '), 'in the all-Medium plan, roughly what share of the money goes to its single most expensive job?'),
        h('div', { class: 'row' }, h('div', { style: 'flex:1 1 8rem' }, this.guessIn), this.guessVal, this.guessBtn),
        this.guessOut),
      h('div', { class: 'meters' }, this.costMeter.el, this.energyMeter.el, this.hoursMeter.el),
      h('ol', { class: 'jobs' }, this.cards.map(c => c.li)),
      h('div', { class: 'row check' }, h('button', { type: 'button', class: 'primary', onclick: () => this.check() }, 'Run the term')),
      this.result,
    );
    this.render();
  }

  meter(label, budget) {
    const num = h('span', { class: 'num' });
    const bar = h('div', { class: 'bar' });
    const note = h('small', { class: 'muted' });
    const el = h('div', { class: 'meter' }, h('div', { class: 'top' }, h('strong', {}, label), num), h('div', { class: 'track' }, bar), note);
    return { el, num, bar, note, budget };
  }

  lockGuess() {
    const costs = JOBS.map(job => cost(routeOf(job, 'm')));
    const total = costs.reduce((a, b) => a + b, 0);
    const top = costs.indexOf(Math.max(...costs));
    const share = Math.round(costs[top] / total * 100);
    this.guess = +this.guessIn.value;
    this.guessIn.disabled = this.guessBtn.disabled = true;
    const gap = Math.abs(this.guess - share);
    this.guessOut.replaceChildren(
      h('strong', {}, `${share}%: `), `“${JOBS[top].title}” costs ${usd(costs[top])} of ${usd(total)}. `,
      `You said ${this.guess}%, ${gap <= 10 ? 'close.' : `${gap} points ${this.guess < share ? 'low' : 'high'}.`} `,
      h('span', { class: 'muted' }, 'Start there.'));
    if (this.passed) this.finish();
  }

  totals() {
    let usdSum = 0, kwhSum = 0, hourSum = 0;
    this.plan.forEach((id, i) => { const rt = routeOf(JOBS[i], id); usdSum += cost(rt); kwhSum += kwh(rt); hourSum += rt.hours; });
    return { usdSum, kwhSum, hourSum };
  }

  touch(i) {
    this.checked[i] = false;
    this.passed = false;
    this.render();
    const settled = this.std.filter(k => k != null).length;
    const moved = this.plan.filter(p => p !== 'm').length;
    this.progress(settled + moved, JOBS.length * 2, `${settled} of ${JOBS.length} standards settled; ${moved} jobs moved off the default. Run the term to see how each one went.`);
  }

  agree(i, k) { this.std[i] = k; this.touch(i); }
  assign(i, id) { this.plan[i] = id; this.touch(i); }

  render() {
    const { usdSum, kwhSum, hourSum } = this.totals();
    const setMeter = (m, v, text, note, over = v > m.budget) => {
      m.num.textContent = text;
      m.bar.style.width = `${Math.min(100, v / m.budget * 100)}%`;
      m.el.toggleAttribute('data-over', over);
      m.note.textContent = note;
    };
    setMeter(this.costMeter, usdSum, `${usd(usdSum)} of ${usd(BUDGET_USD)}`, 'illustrative prices');
    setMeter(this.energyMeter, kwhSum, `${kwhSum.toFixed(2)} of ${BUDGET_KWH} kWh`, `about ${Math.round(kwhSum / KETTLE_KWH)} kettles of water brought to a boil (rough, inference only)`);
    setMeter(this.hoursMeter, hourSum, `about ${nice(hourSum)} hours`, 'no budget caps this, but someone does the work', false);
    this.cards.forEach((c, i) => {
      c.stdButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(this.std[i] === k)));
      c.buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(JOBS[i].routes[j].id === this.plan[i])));
      if (!this.checked[i]) c.verdict.hidden = true;
    });
  }

  check() {
    const unset = this.std.filter(k => k == null).length;
    if (unset) {
      this.result.replaceChildren(h('p', {}, h('strong', {}, 'Not yet: '), `settle what counts as done for ${unset} more job${unset > 1 ? 's' : ''} first. The people each job affects set that, not the budget.`));
      return;
    }
    this.checks++;
    const { usdSum, kwhSum, hourSum } = this.totals();
    let good = 0;
    this.cards.forEach((c, i) => {
      const job = JOBS[i], st = job.standards[this.std[i]], rt = routeOf(job, this.plan[i]);
      const ok = st.ok.includes(rt.id);
      // Overkill: another model route meets the same standard for less money and no extra person-time.
      const overkill = ok && rt.model && job.routes.some(x => st.ok.includes(x.id) && x.model && !x.hours && cost(x) < cost(rt));
      if (ok) good++;
      this.checked[i] = true;
      c.verdict.hidden = false;
      c.verdict.replaceChildren(h('b', { 'data-ok': String(ok) },
        !ok ? 'Falls short of what they asked. ' : overkill ? 'Meets their standard, but costs more than it needs to. ' : 'Meets their standard. '),
        rt.note, !ok ? ` They said: “${st.say}”` : '');
    });
    const overUsd = usdSum > BUDGET_USD, overKwh = kwhSum > BUDGET_KWH;
    const problems = [
      good < JOBS.length ? `${JOBS.length - good} job${JOBS.length - good > 1 ? 's' : ''} fell short` : null,
      overUsd ? `money is over by ${usd(usdSum - BUDGET_USD)}` : null,
      overKwh ? `energy is over by ${(kwhSum - BUDGET_KWH).toFixed(2)} kWh` : null,
    ].filter(Boolean);
    this.passed = !problems.length;
    if (this.passed) {
      const large = this.plan.filter(p => p === 'l').length;
      const noModel = this.plan.filter((p, i) => !routeOf(JOBS[i], p).model).length;
      const jobs = n => `${n || 'no'} job${n === 1 ? '' : 's'}`;
      this.result.replaceChildren(h('div', { class: 'debrief' },
        h('strong', {}, 'The term met every standard the people affected set. '),
        `${usd(usdSum)} and ${kwhSum.toFixed(2)} kWh${hourSum ? `, plus about ${nice(hourSum)} hours of people’s time that no budget meter counts` : ''}. `,
        `Large ran ${jobs(large)}; ${jobs(noModel)} used no model. `,
        'This is one simulated office: other standards, set by other people, would make a different plan right.',
        this.guess == null ? h('p', { style: 'margin:.4rem 0 0' }, 'One more step: lock in your estimate at the top.') : null));
      this.finish();
    } else {
      this.result.replaceChildren(h('p', {}, h('strong', {}, 'Not yet: '), `${problems.join('; ')}. Read the verdicts, adjust, and run it again.`));
      this.progress(good, JOBS.length, `${good} of ${JOBS.length} jobs meet their standard; ${problems.join('; ')}.`);
    }
  }

  finish() {
    if (!this.passed || this.guess == null) return;
    this.result.querySelector('.debrief p')?.remove();
    this.complete('In this simulated office, enough was set by the people each job affects: small models for routine bulk work, a large one only where it took the short path and the standard allowed a model, and search over community sources, a person’s check, or no AI where those met the standard better.');
  }
}

customElements.define('x-costs-b', CostsB);
