# interactive-markdown-review

An agent skill for editing prose with a coding agent over many small passes. You
leave comments on a draft, the agent answers as an editor, and the two of you work
the draft down until no comments are left.

It has two modes:

- **Bracket mode** (default). Comments live inline in the markdown file: yours in
  `<single brackets>`, the agent's in `<<double brackets>>`.
- **Visual mode.** The agent renders the markdown to a reading page and opens it in
  [Lavish](https://github.com/kunchenguid/lavish-axi). You highlight passages and
  comment on them in the browser, or turn Lavish's Annotate switch off, click a block,
  and edit its markdown in place; clicking away saves it to the file. The agent edits
  the same file and explains its changes as margin notes on the page, which
  re-renders whenever the file changes. The markdown file stays free of markers.
  When a session starts in bracket mode, the agent mentions in one line that visual
  mode is available; ask for it ("review this visually") to switch.

See [`SKILL.md`](SKILL.md) for the full protocol.

## Requirements

- Bracket mode: nothing beyond an agent that loads skills.
- Visual mode: [Node.js](https://nodejs.org/) 22 or later (lavish-axi requires it;
  the scripts alone run on 18+) and `lavish-axi` (`npm install -g lavish-axi`). When
  you ask for visual mode, the agent checks for both and offers to install what is
  missing. It installs only after you agree, and it hands you the command for Node
  when installing it would need sudo or a system package manager. The scripts use only Node's standard library plus a
  vendored copy of [markdown-it](https://github.com/markdown-it/markdown-it) 14.1.0
  (MIT; licenses in `scripts/vendor/LICENSES.txt`), so there is no install step.

## Install

With the [`skills`](https://www.npmjs.com/package/skills) CLI:

```sh
# into the current project
npx skills add kfchou/skills --skill interactive-markdown-review

# or for your user, across projects
npx skills add kfchou/skills --skill interactive-markdown-review -g
```

The `--skill` flag picks this skill out of the
[kfchou/skills](https://github.com/kfchou/skills) collection.

As a Claude Code plugin:

```sh
/plugin marketplace add kfchou/skills
/plugin install interactive-markdown-review@kfchou-skills
```

To install by hand, copy this folder into your agent's skills directory, for example
`~/.claude/skills/interactive-markdown-review/` for Claude Code.

## Running visual mode yourself

```sh
node scripts/serve.mjs draft.md       # renders .lavish/draft.html, saves page edits, watches for changes
lavish-axi .lavish/draft.html         # open it for review
```

`serve.mjs` runs until you stop it (Ctrl+C); the page then turns read-only.
`node scripts/render.mjs draft.md` renders a read-only page once.

Notes are read from `.lavish/draft.notes.json`, a JSON array of
`{"quote": "...", "note": "..."}`. A note whose quote no longer appears in the
document is listed at the end of the page. Local images (relative paths, or site-root
paths such as `/assets/x.png` resolved against the git top-level) are copied into
`.lavish/draft.assets/`. If `.lavish/draft.baseline.md` exists (the agent writes it at
the start of each turn), blocks that differ from it get a change bar at the left edge:
blue for modified, green for added, and a red marker where a block was deleted.

### How saving works

With Annotate off, clicking a block swaps it for its markdown source. Enter adds a
line, and a blank line starts a new paragraph. Clicking away or Ctrl/Cmd+Enter
saves; Escape cancels. The helper replaces exactly that block's lines in the file and
re-renders the page.

If the file changed on disk after the page was rendered, the save is refused and the
page asks you to reload. While a block is open, the helper waits to re-render, so an
outside change never discards what you are typing.

The helper listens on 127.0.0.1 only. A localhost port is reachable from any website
open in your browser, so the helper accepts a request only when all of these hold:
- it carries the random token generated for this run, which only the rendered page
  holds;
- it comes from the sandboxed Lavish page (`Origin: null`);
- it is addressed to `127.0.0.1` or `localhost`;
- it is a JSON POST.

It writes only the one file it was started for. A page you share with
`lavish-axi share` carries the token, which stops working when the helper stops.

Footnotes and other pandoc-only markdown extensions are not rendered.
