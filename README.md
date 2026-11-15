# AI Literacy for the LLM Age

A static, explorable site, aimed at `literacy.bayleaf.dev`, that teaches people to
*read* and *write* with large language models and, by the end, to run a little
platform of their own.

```bash
python3 -m http.server 8811   # from the repo root, then open http://localhost:8811/
```

## Three threads

Every scene braids three threads, each a custom element. Readers cannot switch a thread off: the site is the braid.

| Thread | Element | Role |
|---|---|---|
| Teach | `<lit-teach>`, `<lit-aside>`, `<lit-term>` | direct explanation |
| Work | `<lit-predict>`, `<lit-explore>` | choose a prediction, then work an explorable; working it unlocks *Continue* |
| Argue | `<lit-argue>`, `<lit-quote>` | the mounting argument, Consumer › Chooser › Author › Publisher › Operator (`rung=` on each scene, shown by `<lit-ladder>`) |

`<lit-meta>` closes each scene with disciplines in play, further reading and an as-of date.

### Gates (one per thread)

*Continue* needs engagement with all three threads. The argument speaks in its own first-person voice and typeface (`--lit-font-argue`), distinct from quoted sources and from the Dissent.

- **Teach**: `<lit-readcheck>` (inserted automatically before the first exercise) is a
  self-certified "I've read it"; the Work thread stays hidden until then.
- **Work**: every prediction answered and every explorable completed. Predictions stay
  changeable after answering; trying another answer does not reset the explorable.
- **Argue**: `<lit-stance stem="...">` asks the reader to finish a first-person sentence,
  from options or in their own words. Any answer is fine; answering is what counts.
  `<lit-dissent>` precedes it with the strongest counterargument.

The epilogue's `<lit-roots>` is a descriptive record of every stance (not a score), with
links back to revise them. Readers tick which statements become an AGENTS.md preamble;
nothing becomes an agent instruction without that opt-in. Everything lives in
`localStorage` only.

## Files

- `index.html`: all content. One `<lit-scene>` per scene, routed by `#id`.
- `css/theme.css`: every visual decision as `--lit-*` custom properties. Restyle here.
- `css/site.css`: layout and light-DOM component styles.
- `js/core.js`: the course shell and thread elements; progress in `localStorage`.
- `js/kit.js`: the explorable contract (`Explorable` base class, `h()`, `fmt`).
- `explorables/<scene>-<spin>.js`: one design spin per file, lazily imported.
- `SPINS.md`: the explorable contract and per-scene design briefs.
- `llms.txt`: the agent-facing front door. Agents support their human rather than doing
  the exercises; it describes an opt-in, interview-first AGENTS.md declaration.
- `skills/ai-literacy-development-technique/SKILL.md`: a template practice skill, offered
  only on request.
- `openapi.json` and `api/ping.json`: a pedagogical stub of a machine-readable door; one
  GET for a static file.

These agent-facing files are deliberately decoupled from `index.html`: they link to the
essay as a whole and tell agents to read its current argument, so the essay can keep
changing without them. They use absolute `https://literacy.bayleaf.dev/` URLs. Agentic
testers are told out of band that the site would be deployed there, but should work only
from local resources.

## Read, write, count

Following UNESCO's definition of literacy ("identify, understand, interpret, create,
communicate and compute"), every explorable declares `static literacies = { read,
write, count }`, and `<lit-explore>` renders them as inline, underlined words.
Hovering or focusing a word reveals its explanation in space reserved below, blank
by default. A missing entry has a dashed underline, so gaps are visible in review.
Counting means a rough numerical estimate made before a reveal.

## Testing

```bash
PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/smoke.mjs [scene ...]
```

Text-only smoke test over every explorable at 1280px and 360px: it mounts behind its
prediction, logs no errors, has focusable controls, doesn't overflow, leaks no raw
values (`null`, `[object …]`), and declares all three literacies.

```bash
PLAYWRIGHT=... node scripts/a11y.mjs [scene ...]   # OUT=dir also saves each scene's aria tree
PLAYWRIGHT=... node scripts/path.mjs               # Continue from the first scene to the last
```

`a11y.mjs` works each scene's gates by keyboard alone (Tab, Enter), then tabs through
the scene and reports focus stops with no name or no visible ring, and pointer-only
targets. `path.mjs` walks the whole braid in order: every gate, every stance, every
Continue (explorables are marked complete directly; they have their own tests).

Agent browsers that cannot see into shadow roots (OpenChamber's panel, for one) can
add `?light` to the URL: explorables then mount in the light DOM, styled with
`@scope`. It is a testing aid only; ids inside explorables may collide across scenes,
so a label can look unnamed there that is fine in the real page.

## Deploy

An assets-only Cloudflare Worker (`wrangler.jsonc`, following BayLeaf Pouch) serves the
repo root at `https://literacy.bayleaf.dev/`. `.assetsignore` keeps tooling and drafts
out; `_headers` sets a strict Content-Security-Policy. No Worker code runs and
observability is off.

```bash
npx wrangler deploy
BASE=https://literacy.bayleaf.dev/index.html PLAYWRIGHT=... node scripts/smoke.mjs
```

Cloudflare Web Analytics for the `bayleaf.dev` zone is set to manual snippet
installation (changed 2026-11-14), so no beacon is injected into these pages. The CSP
would block one anyway, as a backstop for the no-telemetry promise.

## Design spins

`<lit-explore spins="x-tokens-a x-tokens-b">` shows a *design spin* toggle (an authoring aid)
so alternatives can be compared in place. `?spin-tokens=b` in the URL selects a
spin directly. Once a winner is chosen, drop the loser from `spins=` and the toggle
disappears.

## Patterns worth naming

- **Gate, then explore** (Predict–Observe–Explain, after White & Gunstone): the
  prediction lives on the explorable's class (`static prediction`), so a spin owns
  its own question.
- **Progressive disclosure over linear gating**: the TOC always allows jumping; only
  *Continue* requires work, so nobody is trapped.
- **Tokens as the theming API**: shadow roots inherit `--lit-*`, so restyling the
  site restyles every explorable without touching their files.

## License

Essay text under [CC BY-SA 4.0](LICENSE-CC-BY-SA-4.0.txt), code under MIT; quoted
sources and the BayLeaf logo excluded. Details in [LICENSE](LICENSE).
