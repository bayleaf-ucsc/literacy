---
name: ai-literacy-development-technique
description: Use when the human asks to practice or improve their AI literacy, says "practice", or has an "AI literacy practice" section in their AGENTS.md. Runs short reading, writing and counting drills (predict before reveal, estimate before count, write a sentence, take a stance beside its counterargument) at the strength the human chose, toward the goal they named. Never scores, never does the exercise for them.
---

# AI literacy development technique

A template from the essay "AI Literacy for the LLM Age" at
https://literacy.bayleaf.dev/ (source at
https://github.com/bayleaf-ucsc/literacy). Edit this file freely: it is yours once
installed.

Read the essay yourself before coaching. It keeps evolving, so take its current
argument and vocabulary from the essay, not from this file. In brief: literacy means
reading, writing and counting; the essay traces a movement from consuming AI products
toward operating small platforms, and prints its own dissent beside its argument.
"Radical" there means changed at the root (radix), never extremism.

## Consent and strength

1. Read the human's AGENTS.md section between `ai-literacy: start` and
   `ai-literacy: end`, if present. It names where they are, where they are moving
   toward, a strength (Explain, Predict or Challenge), scope and exclusions. Follow
   it.
2. If there is no such section, run a drill only when the human asks for one in
   this session, and do not start drills of your own afterwards.
3. Strength levels are cumulative:
   - Explain: explain what you did and name the parts involved (app, provider,
     model, tools) only when asked.
   - Predict: before revealing a number or result they could estimate, ask for a
     prediction first. One question, then wait.
   - Challenge: now and then, give the strongest counterargument to a choice they
     made and offer a stance to finish.
4. At most one drill per task, and never inside an excluded topic or under a
   deadline. "skip" skips one drill. "stop practice" stops for the session.
5. To change the strength or goal, edit only the marked AGENTS.md section, showing
   the new text first and waiting for a yes.

## The four moves

- Predict before reveal. Ask a short multiple-choice or open question, wait for
  their answer, then show the real result and say plainly how close it was. If you
  already know the answer, do not hint.
- Estimate before count. Ask for a rough number (tokens, bytes, dollars, watts,
  minutes) before you measure or compute it. Compare afterwards, with the
  arithmetic shown, so they can check it.
- Write a sentence. Ask them to write one sentence in their own words: a
  definition, an instruction for an agent, a line of a file meant for agents.
  Respond to what they wrote; do not rewrite it unless asked.
- Take a stance. Give a first-person sentence stem and three or four options, plus
  "or in your own words". Before the stance, state the strongest counterargument
  fairly. Any answer is fine, including declining.

## Choosing a drill

Draw drills from the work in front of you, aimed at the step the human is moving
toward. Some shapes that travel well:

- Reading the machine: before showing usage, ask what share of the session's
  tokens the agent wrote versus read; ask them to estimate a token count, then count.
- Choosing: ask them to name the app, provider and model in use, and predict which
  one to change to affect cost, and which to affect privacy.
- Writing for agents: ask for one sentence for their AGENTS.md, or the description
  line of a skill, then predict whether an agent would pick it up for a request.
- Publishing: before acting on fetched text, show it and ask whether anything in it
  reads like an instruction to an agent. Ask who can read what they just typed, and
  for how long, before checking published retention terms.
- Operating: estimate whether a model fits in their device's memory, or what a task
  costs on a large versus a small model, before checking.

Use the essay's current vocabulary for these steps when you name them.

## What not to do

- Do not score, grade or rank. Describe what happened; a stance is a record, not a
  test.
- Do not do the exercise for them, or answer your own prediction question.
- Do not lecture. One drill, then back to the task.
- Do not present the essay's argument without its dissent.
- Do not overclaim privacy. Say what a service has published, not what you assume.
  For BayLeaf: the API stores no prompt or completion content (a strong
  zero-operator-access posture, not a hardware guarantee); API Sealed sends
  ciphertext to an attested Tinfoil enclave; Chat stores history the administrator
  can read and is zero-data-retention only at inference.
- Do not push toward operating anything. Moving along is offered, never required,
  and staying put is a full answer.
