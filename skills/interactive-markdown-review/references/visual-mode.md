# Visual mode: reviewing in Lavish

Read this when the user asks for visual mode. Everything in SKILL.md still applies
(the turn, the editorial checks, local vs. structural); this file covers only what
changes when the comments move off the file and onto a rendered page.

**Placeholders used below:**

- `<skill-dir>` is the folder the skill's SKILL.md was loaded from.
- `<document.md>` is the markdown file under review.
- `<name>` is that file's name without its extension (`draft` for `draft.md`).
- `<page>` is the path `serve.mjs` prints after `page:` (normally `.lavish/<name>.html`).

## Prerequisites

Visual mode needs a recent Node.js and `lavish-axi`. Check with `node --version` and
`lavish-axi --version`. lavish-axi's minimum Node version is in its `engines` field
(`npm view lavish-axi engines`).

- If one is missing or too old, tell the user which, and offer to install it. Install
  only after they say yes, and re-run both checks afterward.
- lavish-axi: `npm install -g lavish-axi`. This skill needs no further setup;
  `lavish-axi setup hooks` is optional and unrelated.
- Node: install it yourself only through a version manager that is already there
  (nvm, fnm, or volta). Otherwise give the user the install command for their
  platform and wait. Use sudo or change system packages only when they have said you
  may; the same goes for `npm install -g` when the global npm folder needs sudo.
- If they decline, stay in bracket mode.

## The scripts and files

The scripts live in `<skill-dir>/scripts/`. Run them with `node`.

- `serve.mjs <document.md>` is the save helper. It renders the page, saves edits the
  author makes on the page straight to the markdown file, and re-renders whenever the
  markdown, the notes file, or the baseline changes. It prints `page: <page>` and runs
  until stopped.
- `render.mjs <document.md>` renders once and prints the page path. The page is
  read-only, but change bars and notes still work. Use it only if the helper can't run.

Both work under `.lavish/` in the current directory. Run every command in this file
from one directory, and `mkdir -p .lavish` before your first `cp` into it:

| File | Written by | Purpose |
|---|---|---|
| `.lavish/<name>.html` | scripts | the page |
| `.lavish/<name>.notes.json` | you | your margin notes |
| `.lavish/<name>.snapshot.md` | you | the file as you left it, to find the author's page edits |
| `.lavish/<name>.baseline.md` | you (the helper folds author saves in) | the file as the author left it, for change bars |
| `.lavish/<name>.assets/` | scripts | copied local images |

Neither script touches the markdown except to apply an author's save. `.lavish/`
holds only generated files: the first time you create it in a git repository, suggest
adding `.lavish/` to `.gitignore`. Leave the folder in place when the session ends.

**Notes file.** A JSON array of `{"quote": "...", "note": "..."}`. `quote` is exact
text from the document as it reads, without markdown markup (no `**`, backticks, or
link syntax); line breaks and runs of spaces may differ. The first occurrence is
highlighted, so quote enough to be unique. A note whose quote no longer matches is
listed at the end of the page under "Notes that no longer match the text".

A note that holds a back-and-forth uses `thread` in place of `note`: an array of
turns in order, each `{"by": "editor" | "author", "text": "..."}`, for example
`{"quote": "...", "thread": [{"by": "editor", "text": "..."}, {"by": "author",
"text": "..."}, {"by": "editor", "text": "..."}]}`. The page shows each turn under a
byline, separated by dividers, with author turns set apart from yours.

## How the protocol maps

- Author `<comments>` arrive through the poll as a quoted selection plus the comment.
  Find the passage in the markdown by its quote; the file never holds them.
- In visual mode every comment of yours goes in the notes file, as a note on the
  passage it concerns. `STRUCTURAL:` and `META:` prefixes carry over into the note
  text, and one issue per comment becomes one issue per note.
- An author comment you didn't act on gets a note on the same passage answering it.
  The author replies by highlighting the note. When they do, turn the note into a
  `thread`: keep the earlier turns, add their reply as an `author` turn and your
  answer as an `editor` turn, rather than folding the exchange into one note text.
- Resolved threads drop their notes. The notes file holds only the open editor
  comments for this turn, so a converging draft renders with fewer of them.
- **Direct edits.** With Lavish's Annotate switch off (or Ctrl/Cmd+I), the author
  clicks a block, edits its markdown, and clicking away (or Ctrl/Cmd+Enter) saves it to
  the file. These saves don't come through the poll; the snapshot diff finds them.
  A direct edit is the author's decision: treat it as settled text and build on it,
  adding a note only if it conflicts with something else in the draft. If it breaks a
  note's quote, re-quote the note.

## Starting visual mode

1. Check the prerequisites (above).
2. **If you are switching from bracket mode**, convert the file first:
   1. Write the baseline from the file as it stands, markers included:
      `cp <document.md> .lavish/<name>.baseline.md`.
   2. Move every comment into the notes file without acting on it yet: each open
      `<<editor comment>>` becomes a note on the passage it sits beside, and each
      `<author comment>` becomes a note quoting its passage that restates it (with
      your reply in the same note, if you already answered it). Applying them is
      the turn in step 4.
   3. Remove every comment marker from the file (the `<...>` and `<<...>>` comments,
      not angle brackets that belong to the prose, such as HTML).
   4. In the first handoff, say that the change bars on this turn mark where comments
      were moved into notes.
3. Start the helper as a background job your harness tracks (in Claude Code, a Bash
   call with `run_in_background`): `node <skill-dir>/scripts/serve.mjs <document.md>`.
   Wait until it prints `page:`, then open the page: `lavish-axi <page>`.
4. Choose the first wait:
   - If the document already has open comments (including any you just converted), or
     you are switching modes, take your turn first (below), then hand back with step 5
     of the turn.
   - Otherwise write the snapshot (`cp <document.md> .lavish/<name>.snapshot.md`) and
     wait for the author: `lavish-axi poll <page>`.

## A visual turn

1. Find the author's direct edits: `diff -u .lavish/<name>.snapshot.md <document.md>`.
   Every difference is a page save (skip this on the first turn, before a snapshot
   exists).
2. Before your first edit, write the baseline:
   `cp <document.md> .lavish/<name>.baseline.md`. The page puts a change bar beside
   every block your turn modifies or adds, and a marker where you delete one. (On a
   mode switch you already wrote it in "Starting visual mode".)
3. Take your turn as in SKILL.md's "Taking a turn", with comments as notes. Edit the
   **markdown file**, never the page. Re-read it immediately before each write,
   because the author can save at any moment, and make targeted edits rather than
   rewriting the file from an older read. Rewrite the notes file for the draft as it
   now stands. The helper re-renders and Lavish reloads the page on its own.
4. **Check before handing back.** On top of SKILL.md's turn check:
   - the file holds no `<...>` or `<<...>>` comment markers;
   - every note's quote appears in the file's text (ignoring markdown markup); re-quote
     or delete any that don't;
   - the notes file holds only open threads.
5. Refresh the snapshot (`cp <document.md> .lavish/<name>.snapshot.md`), then hand back
   and wait in one step: `lavish-axi poll <page> --agent-reply "<short handoff>"`. The
   reply is the chat handoff: a brief pointer, with the reasoning in the notes.
6. Repeat from step 1 when the poll returns feedback.

**Waiting on the poll.** Read `lavish-axi poll --help` once per session for its
current rules. In a harness with a tool timeout, run the poll with the longest timeout
allowed, or as a background job the harness tracks and reports back on. When the call times out or is interrupted, run `lavish-axi poll <page>` again
**without** `--agent-reply`: your handoff was already delivered, and the author's
feedback stays queued.

**If the helper exits.** Read its output and start it again the same way. If it can't
run, render after each turn with `node <skill-dir>/scripts/render.mjs <document.md>`
and tell the author that editing on the page is off until it is back; comments still
work.

## Ending the session

The poll that reports the end still carries the author's last feedback. Act on it,
then stop the helper. Leave the session closed unless the author asks to reopen it.

## Common mistakes

| Mistake | Fix |
|---|---|
| Re-sending `--agent-reply` after a poll timeout | Re-run the bare poll; the reply was delivered. |
| Switching from bracket mode and writing the baseline after removing markers | Baseline first, so the bars show where comments moved. |
| Opening the page before the helper prints `page:` | Wait for that line. |
| Leaving notes whose quotes you edited away | Check every quote against the file before handing back. |
| Overwriting the file from an old read and losing a page save | Re-read right before each write; edit in place. |
| Leaving the helper running after the session ends | Stop it after acting on the final feedback. |
