# AGENTS.md

Guidance for agents working on **AI Literacy for the LLM Age**, the explorable essay
at `https://literacy.bayleaf.dev/`. It is a standalone project in the `bayleaf-ucsc`
org: a publication about BayLeaf, not a BayLeaf service, with no backend or state.
Architecture, contracts and testing: `README.md` and `SPINS.md`.

BayLeaf itself lives in https://github.com/bayleaf-ucsc/bayleaf. Its `AGENTS.md`
([data posture](https://github.com/bayleaf-ucsc/bayleaf/blob/main/AGENTS.md#data-posture-zdr-everywhere-zoa-where-possible)) is the source of truth for every claim this essay makes
about BayLeaf. When that posture changes, check the essay; when the essay describes
BayLeaf, check that section first.

Do not commit or push unless asked; show a summary first. Prefer one clean commit per
coherent change over a transcript of the session.

## Authorship

**Adam Smith** (UC Santa Cruz, Computational Media) is the original author and the
maintainer of this essay. He welcomes input from others: issues, pull requests,
playtest notes, and changes proposed by other people's agents. He decides what lands.

The essay's authorship model is part of its argument, so keep it true:

- **Surface text is AI-written, except where marked.** The neutral teaching voice, the
  first-person agitator in the margin, and the Dissent are all written by AI. The
  concept, structure and many sentence fragments are Adam's, and every passage is
  closely anchored in a nearby human's authorial intent: something a person asked for,
  approved, or would recognize as theirs. Do not add free-floating AI prose that no
  human directed.
- **Human-written text is marked with `<lit-human author="...">` and is never edited by
  agents.** Not for typos, not for house style, not for consistency. If something in a
  `<lit-human>` block looks wrong, say so to its author and let them change it.
- Contributions from other people follow the same rule: if a contributor writes a
  passage by hand and wants it kept verbatim, mark it with `<lit-human>` under their
  name; otherwise it joins the AI-written surface, anchored to their intent.
- When an agent makes a substantive change on someone's behalf, say whose intent it
  carries (in the commit message or pull request description).

## Voices

Three voices share the page; keep them distinct (see `css/theme.css` for typefaces):

- **Teach**: plain, neutral, accurate. No sass.
- **Argue**: the first-person "I" of an anarchist pamphleteer. Snark aimed at
  institutions and products, never at the reader. "Radical" means changed at the root.
- **Dissent**: the strongest honest counterargument, in a cooler register. Keep one in
  every argue block; the essay argues with itself on purpose.
- HTML comments in `index.html` speak as the editorial "we" and reward source readers.

## Invariants

- Every stance answer is fine. Nothing is scored; the epilogue is a record, and nothing
  becomes an agent instruction without the reader ticking it.
- Readers cannot switch threads off. Continuing in order needs the lesson marked read,
  every exercise worked and the stance taken; the contents menu always allows jumping.
- Everything a reader does stays in their browser (`localStorage`). No telemetry, no
  network requests from explorables.
- Claims about BayLeaf follow the BayLeaf repository's data posture exactly; never overclaim.
- `llms.txt`, `openapi.json` and `skills/` stay decoupled from the essay's structure:
  they link to the essay as a whole and never to anchors inside it.
- House style: no emdashes, no emoji.
