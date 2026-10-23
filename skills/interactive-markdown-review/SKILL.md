---
name: interactive-markdown-review
description: >-
  Collaborative, turn-based editing of a piece of writing using an inline
  two-byline comment protocol: the author writes comments in single brackets
  <like this> and you, acting as editor, reply in double brackets <<like this>>.
  An optional visual mode renders the markdown as a reading page in Lavish
  (lavish-axi), where the author highlights passages and comments on them or edits
  a block's markdown in place and saves it to the file, and your explanations
  appear as margin notes instead of brackets in the file. Bracket mode
  is the default: when a session starts in it, tell the user in one line that visual
  mode is available, and switch only when they ask ("review this visually", "open it
  in Lavish"). Use this skill WHENEVER the user wants to iteratively edit, revise, review, or
  workshop a piece of PROSE with you as a writing partner — a blog post, essay,
  report, README, spec, documentation, chapter, cover letter, or any human-readable
  writing — especially when they say things like "let's review this", "edit this with
  me", "interactive review", "interactive markdown review", "let's workshop this draft",
  "go through this section by section", or when they leave <bracketed comments> in a document for you to respond
  to. Trigger it even if they don't name the skill: the tell is a written document
  plus a desire to improve it together over multiple passes rather than a one-shot
  rewrite. This skill is about HOW you collaborate on writing — the byline protocol,
  editorial judgment, turn-taking, and when to flag structural rewrites — not about
  any single genre. It is for reviewing PROSE, NOT code: do not invoke it for code
  review, pull-request review, refactoring, or evaluating an implementation — those
  are code-review tasks, even when the prose lives in a repo. (Reviewing the prose
  *inside* code — a doc comment, a README, error-message copy — is in scope; judging
  the code is not.)
---

# Interactive Markdown Review

A protocol for editing a document *with* someone across many small passes, the way
a good writer and a good editor work a draft between them. You are the editor. The
work converges because each turn resolves some comments and raises sharper ones,
not because either side rewrites everything at once.

**Scope: this is for prose, not code.** The document under review is writing meant
for a human reader — an essay, post, report, spec, README, documentation. This skill
does not apply to code review, pull-request review, refactoring, or judging an
implementation; hand those to a code-review tool or workflow. The one nuance: prose
that happens to live in a codebase — a doc comment, a README, UI or error-message
copy — is fair game as *writing*. You're reviewing the words, never the logic.

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

This inline form is **bracket mode**, the default. **Visual mode** (below) keeps the
same two bylines and turn-taking but moves the comments out of the file and onto a
rendered page the author reads in Lavish.

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
     `<<double-bracket>>` reply directly beneath it. Don't silently drop an author
     comment you didn't act on; that's how intent gets lost.

3. **Do your own editorial pass** and add `<<comments>>` where your judgment adds
   something the author didn't ask for. This is the part that makes you an editor
   and not a typist. See "What a good editor catches" below.

4. **Resolve and clean up.** Delete your own `<<comments>>` once the author has
   answered them and you've acted — a converging draft sheds comments, it doesn't
   accumulate them. If a thread is settled, the text should stand on its own with no
   marker left behind.

5. **Hand back in chat, briefly.** One short message: what you changed this pass,
   what you're now waiting on the author to decide, and any structural flag (below).
   Keep the reasoning in the document; keep the handoff a pointer.

Then it is the author's turn. They will edit, resolve your comments, and leave new
`<ones>`. Do not run ahead and take their turn for them.

## Visual mode: reviewing in Lavish

In visual mode the markdown file holds only prose. The author reads a rendered page in
Lavish (`lavish-axi`), highlights passages and comments on them there, and can also
edit the markdown on the page and save it straight to the file. Your explanations appear as margin notes beside
the passages they refer to.

**When to use it.** Only when the user asks for it ("review this visually", "open it
in Lavish"), at the start or at any later turn. Bracket mode is the default, and a
session that starts in it opens with one short line telling the user visual mode is
available: they can review a rendered page in Lavish, highlighting passages and
reading your notes in the margin, and they only need to ask. If a prerequisite
(below) is missing, name it in the same line and offer to install it. Say this once
per session, and never switch modes on your own.

**Prerequisites.** Visual mode needs Node.js 22 or later (lavish-axi requires it;
the skill's own scripts run on 18+) and `lavish-axi`. Check with `node --version` and
`lavish-axi --version` when visual mode is requested, and before the one-line mention
names a missing tool.

- If one is missing or too old, tell the user which, and offer to install it. Install
  only after they say yes, never silently, and re-run both checks afterward.
- lavish-axi: `npm install -g lavish-axi`. This skill needs no further setup;
  `lavish-axi setup hooks` is optional and unrelated.
- Node: install it yourself only through a version manager that is already there
  (nvm, fnm, or volta, e.g. `nvm install 22`). Otherwise give the user the command for
  their platform, such as `brew install node` on macOS or
  `winget install OpenJS.NodeJS.LTS` on Windows, and wait. Don't use sudo or change
  system packages unless they have said you may. The same applies to
  `npm install -g` when the global npm folder needs sudo.
- If they decline, stay in bracket mode.

**The scripts** live in this skill's `scripts/` folder:

- `serve.mjs <document.md>` is the save helper. It renders the page, saves edits the
  author makes on the page straight to the markdown file, and re-renders whenever the
  markdown, the notes file, or the baseline changes. It prints the page path and runs until stopped.
- `render.mjs <document.md>` renders once, read-only. Use it only if the helper can't run.

Both write the page to `.lavish/<name>.html` under the current directory and read notes
from `.lavish/<name>.notes.json` beside it; keep the notes file there, not next to the
author's markdown. Local images are copied into `.lavish/<name>.assets/`. Neither
script touches the markdown except to apply an author's save.

The notes file is a JSON array of `{"quote": "...", "note": "..."}`. `quote` is exact
text from the document as it reads, without markdown markup (no `**`, backticks, or
link syntax); line breaks and runs of spaces may differ. The first occurrence is
highlighted, so quote enough to be unique. A note whose quote no longer matches,
usually because you edited that passage, is listed at the end of the page under
"Notes that no longer match the text" rather than dropped. Treat that as a slip in
your turn: re-quote the note or delete it before handing back.

**The loop.**

1. Start the helper as a background job your harness tracks (in Claude Code, a Bash
   call with `run_in_background`): `node <skill-dir>/scripts/serve.mjs <document.md>`.
   When it prints the page path, open the page: `lavish-axi <page>`.
2. Snapshot the document as you leave it: `cp <document.md> .lavish/<name>.snapshot.md`.
3. Wait for the author: `lavish-axi poll <page>`. It blocks until they send comments or
   end the session. Read `lavish-axi poll --help` once per session for its current
   rules (keep it in the foreground, never kill it, re-run it if interrupted) instead
   of working from memory.
4. Take your turn as in "Taking a turn":
   - Start with `diff -u .lavish/<name>.snapshot.md <document.md>`. Every difference is
     a direct edit the author saved from the page (see below).
   - Before your first edit, write the baseline:
     `cp <document.md> .lavish/<name>.baseline.md`. The page compares the file with it
     and puts a change bar beside every block your turn modifies or adds, plus a
     marker where you delete one, so the author can see what this turn touched.
     The snapshot and the baseline differ in one way. The snapshot is the file as
     *you* left it, used to find the author's edits. The baseline is the file as
     *the author* left it, used for the bars. The helper folds the author's own
     page saves into the baseline, so those never get bars.
   - Edit the **markdown file**, never the page. Re-read it immediately before each
     write, because the author can save at any moment; make targeted edits rather than
     rewriting the file from an older read.
   - Rewrite the notes file for the draft as it now stands.
   The helper re-renders on its own and Lavish reloads the page.
5. Refresh the snapshot, then hand back and wait in one step:
   `lavish-axi poll <page> --agent-reply "<short handoff>"`. The reply is the chat
   handoff and follows the same rule: a brief pointer, with the reasoning in the notes.
6. Repeat from step 4 until the author ends the session. The poll that reports the end
   still carries their last feedback; act on it, then stop the helper. Never leave it
   running after the session, and do not reopen the session uninvited.

**How the protocol maps.**

- Author `<comments>` arrive through the poll as a quoted selection plus the comment.
  They are never written into the file; find the passage in the markdown by its quote.
- Your `<<comments>>` become notes on the passage they concern. Never write `<<>>` or
  `<>` markers into the file in this mode. `STRUCTURAL:` and `META:` prefixes carry
  over into the note text, and the one-issue-per-comment rule applies per note.
- An author comment you didn't act on gets a note on the same passage answering it,
  in place of leaving the comment in the file. The author replies by highlighting the
  note.
- Resolved threads drop their notes. The notes file holds only the open editor
  comments for this turn, so a converging draft renders with fewer of them.

**Direct edits.** With Lavish's Annotate switch off (or Ctrl/Cmd+I), the author clicks
a block on the page and edits its markdown source in place. Clicking away (or
Ctrl/Cmd+Enter) saves it to the file and the page re-renders; Escape cancels. These
saves don't come through the poll, which is why each turn starts with the snapshot diff.

- A direct edit is the author's decision. Keep it and build on it; add a note only if
  it conflicts with something else in the draft.
- Never revert or overwrite an author edit. If it breaks a note's quote, re-quote the
  note.
- The helper refuses a save when the file changed after the page was rendered, so an
  author save can't silently undo yours; the page tells the author to reload instead.
- If the helper isn't running, the page is read-only and says so. Comments still work.

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
  Flag where it slips — over-hedging and reassurance vocabulary ("honestly",
  "genuinely", "to be fair" on repeat) usually signals a draft anxious about its own
  claims rather than confident in them. Point of view is part of that relationship,
  and first person splits two ways that are easy to conflate. Use **"I"** for
  authorship, judgment, and personal fact — whose idea it is, what the writer chose to
  report, the data they gathered; "we" there sounds falsely modest. Use the expository
  **"we"** for shared derivation — defining a term, deriving a formula, walking through
  a construction — where "we" means author-and-reader together and reads warmer than a
  hoarding "I" or a bossy "you". The test: if you can prefix it with "follow along," it
  is "we"; if it is "my call / my data / my idea," it is "I". Reserve **"you"** for
  genuinely instructing the reader; a results narrative that drifts into "you" turns
  findings into a how-to guide.
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

You will not catch all of these every pass, and you shouldn't force them. Raise what
genuinely improves the draft; a wall of nitpicks is its own failure of editorial
judgment. Prioritize the few things that matter most this turn.

## Local edits vs. structural rewrites

Match your autonomy to the size of the change:

- **Local edits** — a word, a sentence, a paragraph, tightening, a reorder within a
  section. Just make them. Delete the comment. Move on. Asking permission for every
  comma is exhausting and slows the loop.

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
- **Every comment is a debt to be cleared.** Author comments get resolved or
  answered; editor comments get deleted once settled. Comments are scaffolding, not
  content — the finished draft has none.
- **One issue per comment.** If a passage has three problems, leave three separate
  `<<comments>>`, not one bundled note. The author needs to accept, reject, or discuss
  each independently; a bundle forces an all-or-nothing reply and buries the point
  they'd have engaged with. This applies inline — the chat handoff can still summarize
  across issues. When you catch yourself writing "and also" or a second "Cold-reader
  miss" inside one comment, split it.
- **Take one turn at a time.** Resolve, raise, hand back. Don't simulate the author's
  responses or barrel through three rounds of edits they haven't seen.
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

## Let this skill evolve as we edit

This skill is not finished — it is meant to sharpen every time it's used on a real
document. Editing a genuine piece surfaces things no amount of up-front design
does: a recurring problem worth adding to "What a good editor catches", a bit of the
byline protocol that's awkward in practice, a kind of comment that keeps needing a
convention, a lesson about this author's voice or habits that should carry forward.

So treat every real editing session as also a test of the skill itself. When you
notice one of these — a pattern that recurs, a rule that misfired, a better way to do
something the skill already covers, or a gap it doesn't — **raise it.** A light way is
a `<<META: ...>>` comment or a line in the chat handoff: "we've hit this same
assumed-knowledge problem three sections running; worth naming it as its own check in
the skill?" Then, with the author's agreement, **update
`~/.claude/skills/interactive-markdown-review/SKILL.md`** to fold the lesson in.

Two cautions so it improves rather than bloats:

- **Generalize before you write it down.** One document's quirk is not a rule. Add
  something only when it will help the *next* piece too, phrased for the general
  case, not this specific draft. The skill is used across many documents; keep it
  about how to collaborate, not about any one project.
- **Prefer sharpening to appending.** Rewrite or tighten an existing section before
  adding a new one. A skill that only grows becomes a skill nobody reads. When a
  lesson makes an old instruction wrong, fix the old instruction.

Don't rewrite the skill mid-pass or without the author's nod — surface the
improvement, agree on it, then make the change as its own small, deliberate edit.

## Starting a session

If the user hands you a document (a file path, or pasted text you should save to a
file) and wants to review it, confirm you'll use this protocol, settle the mode
(bracket by default, visual if asked; in bracket mode, add the one-line note that
visual mode is available, as described above), make sure the
comment bylines are clear, and take the first editor turn. If they've already seeded the
document with `<author comments>`, those are your first agenda. If the document is
clean, do an opening editorial pass and raise the `<<comments>>` that matter most —
then hand back and let them steer.
