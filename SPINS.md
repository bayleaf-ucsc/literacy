# Explorable design spins

Each scene in `index.html` has a `<lit-explore spins="x-<scene>-a x-<scene>-b">`.
Each spin is one file, `explorables/<scene>-<letter>.js`, defining one custom element
built on `js/kit.js` (read it: it is the whole contract). Spins are deliberately
divergent designs for the same learning goal, so the author can compare them in place
with the "design spin" toggle and keep the better one (or merge them).

**Spin A** leans toward an *instrument*: direct manipulation, sliders, live numbers.
**Spin B** leans toward a *puzzle or story*: a constrained challenge, a sequence of
cards, a role to play. Each brief below is a starting point; push the design further.

## Contract (non-negotiable)

- One file per spin; `import { Explorable, h, fmt } from '../js/kit.js'`; extend
  `Explorable`; `customElements.define('x-<scene>-<letter>', ...)`.
- `static prediction = { question, options: [{ label, correct, feedback }], after }`:
  a two-option (occasionally three) prediction the learner must commit to before the
  explorable appears. Feedback explains *why* for both options. Each spin writes its own
  prediction, fitted to its design.
- `static literacies = { read, write, count }`: one short sentence each saying where the
  learner *reads* (interprets a situation), *writes* (creates or edits something, even
  just by choosing words or clicking to compose), and *counts* (makes a rough numerical
  judgment, ideally an estimate before the reveal, then sees how close it was). This
  follows UNESCO's literacy definition ("identify, understand, interpret, create,
  communicate and compute"). All three must be genuinely present; badges render from it.
- Call `this.progress(done, total, note)` as they work and `this.complete(note)` only when
  they have genuinely worked it (several meaningful interactions, all tooltips read, a
  target reached), never on first click. `note` is a one-sentence debrief of what they
  should now see.
- Static only: no network requests, no external libraries, no build step. Canned data is
  fine and expected (mark simulated content as simulated in the UI).
- Style with the `--lit-*` tokens only (they inherit into the shadow root). Fluid width up
  to about 40rem, works at 360px wide. Keyboard accessible (real buttons/inputs, visible
  focus), readable text contrast, respects `prefers-reduced-motion`.
- Tone: house style avoids emdashes (use colons, commas, parentheses), no emoji, plain
  words. Short UI copy; the scene's teaching prose already explains the concept.
- Facts: be conservative and label rough numbers as rough. Prices and model names date
  quickly; use illustrative, clearly labeled figures rather than claims about specific
  products' current prices.

## Testing (cheap by design)

Run `node --check` on your file, then the shared smoke test, which prints text only:

```bash
PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/smoke.mjs <scene>
```

For completion, write a small Playwright script in your own temp dir that drives your
spin through `element.shadowRoot` and prints whether `lit-complete` fired. Do not take
screenshots or browser-panel snapshots into your context: the OpenChamber browser tool
cannot click inside shadow roots anyway, and screenshots were the main cost of round one.

## Scenes that sequence spins

Where both spins were kept, a scene runs them in order as separate `<lit-explore>`
elements (see `index.html`). The second should not re-teach what the first just did;
its prediction can build on it.

## Briefs

1. **tokens**. A: Adam's exercise. Rebuild "The cat sat on the mat." from a ~10-chip
   vocabulary (" cat", "The", " sat", " on", " the", " mat", ".", " ca", "t", " m",
   ...), each chip with its id; visible leading spaces; reward the fewest-token build.
   B: a tokenizer microscope: type or pick text (English, a German compound, Chinese),
   see a greedy tokenization against a small built-in vocabulary, tokens-per-word
   compared across languages.
2. **distributions**. A: build the cat sentence one position at a time with a toy
   next-token distribution shown as bars; a temperature slider and a sample button;
   see that low temperature always says "mat". B: "be the model": the learner assigns
   probabilities across candidates for ambiguous contexts, then compares with a toy
   model; or a decision-model framing (scores, no sampling). Designer's choice.
3. **parameters**. A: Adam's sliders: device memory on a log scale with notches
   (phone 4GB, laptop 16GB, workstation 64GB, server 1TB), token-to-parameter ratio
   20x–1000x log scale, quantization 4/8/16 bit; outputs parameters, training tokens,
   textbook pages (1,000 words per page, about 0.75 words per token), a bookshelf viz.
   B: "what fits where?": sort models (2B, 8B, 27B, 70B, 400B, 2T) onto devices at a
   chosen quantization; correct when sorted.
4. **posttraining**. A: the same context sent to a base model and a chat model
   (canned outputs); toggle a few-shot User/Assistant scaffold; see the base model
   break format. B: "spot the post-training": classify short snippets as base vs
   post-trained, with the tells revealed after each.
5. **agents**. A: Adam's toggles: reasoning on/off, tools on/off for one request;
   timeline of blocks (reasoning, tool call, tool result, reply), token counts, latency,
   simulated answer quality. B: step through a trace block by block; a running
   counter of tokens the user saw vs tokens processed.
6. **caching**. A: a cost meter over N turns of an agent session, caching on/off,
   stacked input/cached/output bars; illustrative per-million-token prices. B: a human
   analogy first (re-reading a whole book every time vs keeping your place), then the
   same arithmetic for an agent.
7. **unbundling**. A: AOL-1995 bundle vs 2026 stack: three layers (client,
   access/provider, content/model) that come apart; must open every layer's
   explanation to continue. B: "stack builder": pick client/provider/model for scenarios
   (sensitive data, no money, offline, campus knowledge) and see consequences.
8. **harness**. A: the same task under three harnesses (bash-only, named tools,
   computer use): read three canned transcripts, rate legibility, then see
   self-extension in the bash one. B: "be the harness": the model emits tool calls and
   the learner routes/executes them, seeing that the harness is the one acting.
9. **skills**. A: skill trigger matcher: several SKILL.md descriptions and incoming
   requests; predict which loads; edit a description so a missed request triggers
   (simple word-overlap scorer, labeled as a simplification). B: AGENTS.md editor:
   toggle lines in an AGENTS.md and see a canned agent reply change.
10. **publishing**. A: the same site as HTML vs llms.txt (bundled sample text): token
    count bars, what an agent has to wade through. B: "which door?": robots.txt,
    llms.txt, openapi.json, HTML page; route agent tasks to the right door.
11. **retention**. A: the data path (device, client, provider, model host, logs,
    training pipeline) under three settings (ordinary, ZDR, ZOA); must read every hop's
    tooltip. B: scenario cards: "who could read your message 30 days later?" for
    several configurations, including BayLeaf Chat vs API vs Sealed.
12. **injection**. A: a fetched web page with an injected instruction; find it, then
    see the simulated agent follow it; toggle defenses (read first, least privilege,
    confirm before sending). B: audit three SKILL.md files "from URLs" and spot the
    risky lines.
13. **costs**. A: two models, cheap-but-verbose vs expensive-but-concise: sliders for
    price and tokens per task, total cost and a crossover point. B: "right-size it":
    match tasks to model sizes under a cost and energy budget.
14. **home**. A: device checker: pick device memory and see which model sizes fit, and
    which route (browser, localhost, BayLeaf Sealed) a request takes; trust-roots
    diagram (BayLeaf, your browser, your machine). B: "move the inference home": move
    the model step by step from a vendor's cloud to your device, watching who can read,
    cost, speed and upkeep change.
