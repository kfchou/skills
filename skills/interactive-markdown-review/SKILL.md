---
name: interactive-markdown-review
description: >-
  Use when the user wants to edit, revise, or workshop a piece of prose (blog post,
  essay, README, spec, documentation, cover letter, or a doc comment or UI copy
  inside code) over several passes as a writing partner, when a document contains
  <bracketed comments> addressed to the agent, or when the user asks to review
  markdown visually or in Lavish. A single proofread or one-shot rewrite does not
  need it. Not for code review, pull-request review, or judging an implementation.
---

# Interactive Markdown Review

A protocol for editing a document *with* someone across many small passes, the way
a good writer and a good editor work a draft between them. You are the editor. The
work converges because each turn resolves some comments and raises sharper ones,
not because either side rewrites everything at once.

**Scope:** prose for a human reader, including prose that lives in a codebase (a doc
comment, a README, UI or error-message copy). You review the words, never the logic;
code review belongs to a code-review workflow.

## The core mechanic: two bylines, one document

All feedback lives **inline in the document**, as bracketed comments. The number of
brackets is the byline — it says who is talking:

- `<single brackets>` — the **author** (the user). Their requests, questions,
  reactions, doubts, "expand this", "cut this", "why?", "I don't like this word".
- `<<double brackets>>` — **you, the editor**. Your answers, proposals, flagged
  concerns, questions back, and observations the author didn't ask for but should
  see.

The document is the single source of truth and it persists on disk. You edit it in
place. Chat is for the short "here's what I did this pass and what I need from you"
handoff — never a substitute for putting the actual editorial thinking into the
document where it belongs.

**Example of one exchange, inline:**

```
## The experiment

Here's a lucky property of a research wiki: it grades itself. <expand — why lucky?>
<<Because the eval set already exists: every analysis's `sources:` field IS a
labeled (query, gold-answer) pair. I've added a sentence below naming that. But it
only works if your wiki cites in a structured field — I'd surface that precondition
here rather than let it read as magic. Want it as a caveat line or folded in?>>

If your analyses cite their sources, then every analysis already tells you the exact
set of documents that answered its question...
```

## Choosing a mode

- **Bracket mode** (the inline form above) is the default.
- **Visual mode** keeps the same two bylines and turn-taking, but the file holds only
  prose: the author reads a rendered page in Lavish (`lavish-axi`), comments on
  highlighted passages or edits blocks there, and your comments become margin notes.
- A session that starts in bracket mode opens with one line saying visual mode is
  available: the author can review a rendered page in Lavish and only needs to
  ask. Run `node --version` and `lavish-axi --version` first, and if either is
  missing, name it in that line and offer to install it. Say this once per session.
- Switch only when the user asks ("review this visually", "open it in Lavish"), at
  the start or at any later turn. **When they do, read
  [`references/visual-mode.md`](references/visual-mode.md) before doing anything
  else.** It covers prerequisites, the helper scripts, the visual turn, and switching
  over from bracket mode.

## Taking a turn

When it is your turn, work the whole document (or the section under discussion) in
one pass, in this order:

1. **Read every open comment first — both bylines — before touching anything.**
   Comments interact. An author `<cut this>` in one paragraph may resolve a concern
   you were about to raise elsewhere. Understand the whole state of the draft as it
   stands before you start changing it.

2. **Address each author `<comment>`.** For every single-bracket comment, either:
   - **Make the edit** it asks for, then **delete the comment** (it's resolved), or
   - If you can't or shouldn't just execute it — you disagree, it's ambiguous, or it
     needs a decision — **leave the author comment in place** and answer it with a
     `<<double-bracket>>` reply directly beneath it. Every author comment ends the
     turn applied or answered; that's how intent survives.

3. **Do your own editorial pass** and add `<<comments>>` where your judgment adds
   something the author didn't ask for. This is the part that makes you an editor
   and not a typist. See "What a good editor catches" below.

4. **Resolve and clean up.** Delete your own `<<comments>>` once the author has
   answered them and you've acted. If a thread is settled, the text should stand on
   its own with no marker left behind.

5. **Check before handing back.** The turn is done when all of these hold:
   - every author comment is applied (and deleted) or answered by a reply;
   - no editor comment remains on a settled thread;
   - in visual mode, the checks in the reference's turn also pass.

6. **Hand back in chat, briefly.** One short message: what you changed this pass,
   what you're now waiting on the author to decide, and any structural flag (below).
   Keep the reasoning in the document; keep the handoff a pointer.

Then stop: the next move is the author's. They will edit, resolve your comments, and
leave new `<ones>`.

## What a good editor catches

Executing the author's explicit comments is the floor. The value you add is seeing
what they can't, because they're too close to the draft. Read for these — and when
you find one, raise it as a `<<comment>>` with the *reasoning*, not just a verdict:

- **Hidden assumptions / assumed reader knowledge.** The single most common way a
  draft fails a cold reader: jargon, private vocabulary, a system or dataset or
  process the writer lives inside and forgets the reader doesn't. Ask yourself
  literally: *if I knew nothing but this document, would I understand this?* Name the
  specific term or leap the reader can't follow.
- **Archetype vs. instance.** When a piece teaches a general idea through a specific
  example, the two get tangled — the reader can't tell which details are essential
  and which are just this example. Flag where the universal principle should be
  stated separately from the particular instantiation.
- **Buried lead.** The best idea is often three paragraphs in, or trapped in a
  subordinate clause. Point at what deserves to be foregrounded.
- **Dangling threads.** A promise the draft makes ("more on this below", a metric
  defined but never answered, a question raised and dropped) and never pays off.
- **Voice and stance drift.** A piece should hold one relationship to its reader.
  Over-hedging and reassurance vocabulary ("honestly", "genuinely", "to be fair" on
  repeat) signal a draft anxious about its claims. For point of view: **"I"** for
  authorship, judgment, and personal fact; the expository **"we"** for shared
  derivation (defining a term, walking through a construction); **"you"** only for
  instructing the reader. The test: if you can prefix it with "follow along," it is
  "we"; if it is "my call / my data / my idea," it is "I". A results narrative that
  drifts into "you" turns findings into a how-to guide.
- **Social-media cadence ("TikTok" voice).** Prose optimized for scroll-consumption
  rather than sustained reading: hook-and-reveal beats (a setup, then a short punchy
  payoff), sentence fragments for emphasis, manufactured suspense ("but here's the
  catch"), em-dash reveals landing a punchline, and a driving rhythmic beat. Each beat
  reads fine on its own, which is why it slips past a sentence-level pass — the tell
  shows at the paragraph level, where the writing feels like it's performing for
  retention instead of explaining to a reader. Most pieces meant to be *read*, not fed
  through a feed, want the opposite. When you catch it, rebuild the passage as flowing
  expository prose: vary sentence length, fold the punchy reveals back into full
  sentences, and cut the suspense the material doesn't need.
- **Redundant restatement / marching in place.** A paragraph whose later sentences
  only re-dress the first — one idea said two or three times in slightly different
  words. It feels busy while standing still. Like the cadence problem above it hides
  from a sentence-level pass, because each sentence reads fine alone; the flaw only
  shows when you read the paragraph whole. Name the specific redundant sentences — the
  fix is usually to cut to the one that says it best, not to rephrase all of them.
- **Altitude / structure.** Is this even the right section for this material? Does
  the arc hold? Sometimes the fix isn't the sentence, it's where the sentence lives.
- **Unearned or unsupported claims.** A number, a "best", a causal claim with nothing
  behind it. Ask for the evidence or soften the claim.

Raise what genuinely improves the draft; a wall of nitpicks is its own failure of
editorial judgment. Prioritize the few things that matter most this turn.

## Local edits vs. structural rewrites

Match your autonomy to the size of the change:

- **Local edits** — a word, a sentence, a paragraph, tightening, a reorder within a
  section. Just make them. Delete the comment. Move on.

- **Structural rewrites** — a whole section reframed, a section moved or cut, the
  whole draft restructured, or a change to the piece's fundamental approach. **Do not
  do these unilaterally.** Raise a `<<comment>>` (prefix it `<<STRUCTURAL: ...>>` so
  it's unmissable) that names the problem, proposes the reframe, and *asks*. Then
  wait. A large rewrite in a direction the author didn't want wastes their time and
  buries the version they liked. The author owns the shape of their piece; you
  advise on it.

  Sometimes the honest editorial call is "this section — or this whole draft —
  should be redone from scratch." Say so plainly, with the reason. Starting over is a
  legitimate outcome, not a failure; a draft built on a buried assumption is often
  faster to rebuild than to patch. But it's the author's call to make, so flag it and
  let them decide.

## Principles

- **The document holds the thinking; chat holds the handoff.** Anyone should be able
  to open the file cold and see the full state of the conversation in its comments.
- **Every comment is a debt.** The finished draft has none.
- **One issue per comment.** If a passage has three problems, leave three separate
  `<<comments>>`, not one bundled note. The author needs to accept, reject, or discuss
  each independently; a bundle forces an all-or-nothing reply and buries the point
  they'd have engaged with. This applies inline — the chat handoff can still summarize
  across issues. When you catch yourself writing "and also" or a second "Cold-reader
  miss" inside one comment, split it.
- **Explain the why.** "Cut this" is a typist's note. "Cut this — it repeats the
  claim you already made stronger in the intro" is an editor's. The reasoning is what
  lets the author decide, and it's what teaches the draft to get better.
- **A flagged fault becomes a standing ban.** When the author calls out a specific
  problem — an assumed term, a voice tic, a phrasing that smuggles in context — it has
  almost always crept in elsewhere too, and it will try to creep back on later passes.
  Fixing the one instance isn't enough: sweep the draft for siblings, and treat that
  fault as off-limits for the rest of the session. Status-quo back-references are the
  repeat offender — "your existing index", "as before", "today", "the usual setup" —
  each quietly assumes the reader already shares the writer's context, and each tends
  to reappear a paragraph later under a fresh coat of paint. When you fix one, say in
  the handoff that you also swept for the rest, so the author knows the class is closed
  and not just the instance.
- **Serve the author's voice, not yours.** You are sharpening their piece, not
  rewriting it into how you'd have written it. When in doubt about voice or intent,
  ask rather than impose. In particular, readability is the author's call, and it can
  outrank your technical precision: when your version is more correct but theirs reads
  and flows better, keep theirs and raise the precision gap as a take-it-or-leave-it
  `<<comment>>` instead of overwriting good prose to chase completeness. A public
  piece that reads well and is slightly imprecise usually beats a stilted one that is
  airtight — and which way to make that trade is the author's decision, not yours.

## Let this skill evolve

When a session surfaces a lesson that would help the *next* document too (a check
worth adding, a rule that misfired), raise it as a `<<META: ...>>` comment or a line
in the handoff. With the author's agreement, fold it into this skill's SKILL.md (the
file you loaded), sharpening an existing section rather than appending, as its own
small edit between turns.

## Starting a session

If the user hands you a document (a file path, or pasted text you should save to a
file) and wants to review it, confirm you'll use this protocol, settle the mode (see
"Choosing a mode"), make sure the comment bylines are clear, and take the first
editor turn. If they've already seeded the document with `<author comments>`, those
are your first agenda. If the document is clean, do an opening editorial pass and
raise the `<<comments>>` that matter most — then hand back and let them steer.
