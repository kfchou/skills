#!/usr/bin/env node
// Render a markdown document to an HTML reading page for review in Lavish.
//
// Usage: node render.mjs <document.md> [notes.json] [out.html]
//
//   out.html    defaults to .lavish/<document-name>.html in the current directory
//   notes.json  defaults to <out without .html>.notes.json, beside the page;
//               a missing or empty file means "no notes"
//
// Notes are a JSON array of {"quote": "...", "note": "..."}. Each quote is exact
// text from the rendered document (whitespace may differ). The page highlights the
// quote and shows the note in the margin; a note whose quote no longer matches is
// listed at the end of the page instead of being dropped.
//
// Local images are copied into <out without .html>.assets/ beside the page so
// Lavish can serve them: relative paths resolve against the document's folder,
// site-root paths (/assets/x.png) against the git top-level. Remote URLs are left
// alone, and the source markdown is never modified.
//
// If <out without .html>.baseline.md exists, blocks that differ from it get a
// change bar at the left edge: one color for modified blocks, another for added
// ones, and a small marker where blocks were deleted. Inside a changed list the
// bars mark only the items that changed, at any nesting depth. The agent writes the
// baseline at the start of its turn, so the bars show what that turn changed.
//
// Every top-level block carries the source line range it came from. serve.mjs
// uses that to let the reviewer edit a block's markdown on the page and save it
// straight to the file; a page rendered by this script alone is read-only.
//
// Prints the path of the rendered page. Requires Node 18+ (Lavish itself needs 22+);
// markdown-it is vendored.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const markdownit = createRequire(import.meta.url)('./vendor/markdown-it.min.cjs');

// Raw HTML passes through, as it would in most markdown previews of your own file.
// No typographer: rendered quotes and dashes stay as typed, so note quotes match
// both the page and the markdown source.
const md = markdownit({ html: true, linkify: false, typographer: false });
const mdTitle = markdownit({ html: false });

// Heading ids, so in-page links such as a table of contents keep working.
md.core.ruler.push('heading_ids', state => {
  const used = new Set();
  state.tokens.forEach((t, i) => {
    if (t.type !== 'heading_open') return;
    const base = state.tokens[i + 1].content.replace(/<[^>]*>/g, '').toLowerCase()
      .replace(/[^\p{L}\p{N}\s_.-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    t.attrSet('id', id);
  });
});

const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const local = env.copyImage(tokens[idx].attrGet('src'));
  if (local) tokens[idx].attrSet('src', local);
  return defaultImage(tokens, idx, options, env, self);
};

export function resolvePaths(src, notes, out) {
  const name = path.basename(src).replace(/\.[^.]*$/, '');
  out = out || path.join('.lavish', `${name}.html`);
  const stem = out.replace(/\.html$/, '');
  return { src, name, out, notes: notes || `${stem}.notes.json`, assets: `${stem}.assets`, baseline: `${stem}.baseline.md` };
}

export const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { title: '', body: text, offset: 0 };
  let title = (/^title:[ \t]*(.*)$/m.exec(m[1]) || ['', ''])[1].trim();
  if (/^".*"$/.test(title)) {
    try { title = JSON.parse(title); } catch { title = title.slice(1, -1); }
  } else if (/^'.*'$/.test(title)) {
    title = title.slice(1, -1).replace(/''/g, "'");
  }
  return { title, body: text.slice(m[0].length), offset: m[0].split('\n').length - 1 };
}

function imageCopier(src, assets) {
  const docDir = path.dirname(path.resolve(src));
  let siteRoot = '';
  try {
    siteRoot = execFileSync('git', ['-C', docDir, 'rev-parse', '--show-toplevel'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {}
  let count = 0;
  return url => {
    if (!url || /^[a-z][\w+.-]*:/i.test(url) || url.startsWith('//')) return null;
    let p = url.replace(/[?#].*$/, '');
    try { p = decodeURIComponent(p); } catch {}
    const candidates = p.startsWith('/') ? [siteRoot && path.join(siteRoot, p), p] : [path.join(docDir, p)];
    const file = candidates.find(f => f && fs.statSync(f, { throwIfNoEntry: false })?.isFile());
    if (!file) return null;
    const dest = `${++count}-${path.basename(file).replace(/[^\w.-]/g, '_')}`;
    fs.mkdirSync(assets, { recursive: true });
    fs.copyFileSync(file, path.join(assets, dest));
    return `${path.basename(assets)}/${dest}`;
  };
}

// Split markdown into top-level blocks, each with its tokens and source line range
// (0-based, end exclusive, relative to the body). Ranges stop before trailing blank
// lines, which markdown-it counts into lists, so the blank line that separates a
// block from the next one is never part of an edit.
function splitBlocks(body, env) {
  const tokens = md.parse(body, env);
  const lines = body.split('\n');
  const blocks = [];
  for (let i = 0; i < tokens.length; i++) {
    let j = i;
    if (tokens[i].nesting === 1) {
      for (let depth = 0; j < tokens.length; j++) {
        depth += tokens[j].nesting;
        if (depth === 0) break;
      }
    }
    const map = tokens[i].map;
    let end = map ? map[1] : 0;
    if (map) while (end > map[0] + 1 && !lines[end - 1].trim()) end--;
    blocks.push({
      tokens: tokens.slice(i, j + 1),
      start: map ? map[0] : -1,
      end,
      text: map ? lines.slice(map[0], end).map(l => l.trimEnd()).join('\n') : null,
    });
    i = j;
  }
  return blocks;
}

// Change bars: compare this render's blocks with the baseline (the document as
// the reviewer left it at the start of the agent's turn). Blocks are matched by
// source text with a longest-common-subsequence pass, so an insertion doesn't mark
// everything after it. Within each unmatched stretch, blocks pair up as modified;
// extra current blocks are added and extra baseline blocks become a deletion
// marker before the next current block.
function changeMarks(current, baseline) {
  const a = baseline.map(b => b.text), b = current.map(c => c.text);
  const n = a.length, m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const marks = new Array(m).fill(null);
  const pairs = new Array(m).fill(-1);
  const deletedBefore = new Array(m + 1).fill(false);
  let i = 0, j = 0, gapA = 0, gapB = [];
  const flush = () => {
    gapB.forEach((k, x) => {
      marks[k] = x < gapA ? 'mod' : 'add';
      if (x < gapA) pairs[k] = i - gapA + x;
    });
    if (gapA > gapB.length) deletedBefore[j] = true;
    gapA = 0;
    gapB = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { flush(); i++; j++; }
    else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) gapB.push(j++);
    else { gapA++; i++; }
  }
  flush();
  return { marks, pairs, deletedBefore };
}

const isList = t => t.type === 'bullet_list_open' || t.type === 'ordered_list_open';

// Source text of lines [start, end), trailing blank lines dropped.
function sourceText(lines, start, end) {
  while (end > start + 1 && !lines[end - 1].trim()) end--;
  return lines.slice(start, end).map(l => l.trimEnd()).join('\n');
}

// The items of the list opening at tokens[at], each with its nested lists.
function listItems(tokens, at, lines) {
  const items = [];
  const level = tokens[at].level;
  for (let k = at + 1; k < tokens.length && tokens[k].level > level; k++) {
    const t = tokens[k];
    if (t.type === 'list_item_open' && t.level === level + 1) {
      items.push({ open: t, lists: [], text: sourceText(lines, t.map[0], t.map[1]), own: null });
    } else if (isList(t) && t.level === level + 2) {
      const item = items[items.length - 1];
      if (item.own === null) item.own = sourceText(lines, item.open.map[0], t.map[0]);
      item.lists.push(k);
    }
  }
  return items;
}

// Mark changes item by item inside a modified list, descending into nested lists
// when only they changed. Returns false if no item differs, e.g. when only the
// spacing between items changed.
function markListItems(cur, at, curLines, base, baseAt, baseLines, depth) {
  const items = listItems(cur, at, curLines);
  const baseItems = listItems(base, baseAt, baseLines);
  const { marks, pairs, deletedBefore } = changeMarks(items, baseItems);
  const tag = (item, cls) => {
    item.open.attrJoin('class', cls);
    item.open.attrSet('style', `--depth:${depth}`);
  };
  let found = false;
  items.forEach((item, k) => {
    if (deletedBefore[k]) { tag(item, 'chg-del-before'); found = true; }
    if (!marks[k]) return;
    found = true;
    const old = baseItems[pairs[k]];
    if (marks[k] === 'mod' && old && item.own !== null && item.own === old.own
      && item.lists.length === old.lists.length) {
      item.lists.forEach((l, x) => markListItems(cur, l, curLines, base, old.lists[x], baseLines, depth + 1));
      return;
    }
    tag(item, `chg-${marks[k]}`);
  });
  if (deletedBefore[items.length] && items.length) { tag(items[items.length - 1], 'chg-del-after'); found = true; }
  return found;
}

function renderBlocks(body, offset, env, baselineBody) {
  const blocks = splitBlocks(body, env);
  const mapped = blocks.filter(b => b.start >= 0);
  const baseBlocks = baselineBody === null ? [] : splitBlocks(baselineBody, {}).filter(b => b.start >= 0);
  const changes = baselineBody === null ? null : changeMarks(mapped, baseBlocks);
  // A modified list marks only the items that changed.
  if (changes) {
    const lines = body.split('\n'), baseLines = baselineBody.split('\n');
    mapped.forEach((blk, k) => {
      const old = baseBlocks[changes.pairs[k]];
      if (changes.marks[k] !== 'mod' || !old || !isList(blk.tokens[0]) || old.tokens[0].type !== blk.tokens[0].type) return;
      if (markListItems(blk.tokens, 0, lines, old.tokens, 0, baseLines, 1)) changes.marks[k] = null;
    });
  }
  let html = '';
  let k = 0;
  for (const blk of blocks) {
    const inner = md.renderer.render(blk.tokens, md.options, env);
    if (blk.start < 0) { html += inner; continue; }
    if (changes?.deletedBefore[k]) html += '<div class="chg-del" data-lavish-ui aria-hidden="true"></div>\n';
    const mark = changes?.marks[k];
    const cls = mark ? ` chg-${mark}` : '';
    html += `<div class="blk${cls}" data-start="${blk.start + offset}" data-end="${blk.end + offset}">${inner}</div>\n`;
    k++;
  }
  if (changes?.deletedBefore[k]) html += '<div class="chg-del" data-lavish-ui aria-hidden="true"></div>\n';
  return html;
}

function readNotes(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch { return { notes: [] }; }
  if (!raw.trim()) return { notes: [] };
  try {
    const notes = JSON.parse(raw);
    if (!Array.isArray(notes)) throw new Error('expected a JSON array');
    return { notes };
  } catch (e) {
    return { notes: [], error: e.message };
  }
}

// save: null for a read-only page, or { url, token } from serve.mjs.
export function render({ src, notes, out, name, assets, baseline }, save = null) {
  const text = fs.readFileSync(src, 'utf8');
  const fm = frontMatter(text);
  let base = null;
  try { base = frontMatter(fs.readFileSync(baseline, 'utf8').replace(/\r\n/g, '\n')).body; } catch {}
  fs.rmSync(assets, { recursive: true, force: true });
  const body = renderBlocks(fm.body.replace(/\r\n/g, '\n'), fm.offset, { copyImage: imageCopier(src, assets) }, base);
  const titleHtml = fm.title ? mdTitle.renderInline(fm.title) : '';
  const pageTitle = titleHtml ? titleHtml.replace(/<[^>]*>/g, '') : escapeHtml(name);
  const { notes: noteList, error } = readNotes(notes);
  const data = {
    notes: noteList,
    notesError: error || null,
    save: save && { url: save.url, token: save.token, sha: sha256(text), file: path.basename(src) },
    source: save ? text.replace(/\r\n/g, '\n') : null,
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pageTitle}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<p class="mode-hint" data-lavish-ui></p>
<div class="src">${escapeHtml(src)}</div>
${titleHtml ? `<h1 class="doc-title">${titleHtml}</h1>\n` : ''}${body}</main>
<script type="application/json" id="review-data">${json}</script>
<script>${CLIENT}</script>
</body>
</html>
`;
  fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
  const tmp = `${out}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, html);
  fs.renameSync(tmp, out);
  return out;
}

const CSS = `
:root{--bg:#fbfaf7;--fg:#1f2328;--muted:#656d76;--rule:#e4e0d8;--note:#fff6d6;--noteb:#e8c547;--mark:#fdeeb0;--warn:#b42318;--edit:#a9cdee;--chg-mod:#1a85c4;--chg-add:#3f8f2c;--chg-del:#c42b1c}
@media (prefers-color-scheme:dark){:root{--bg:#15171a;--fg:#e6e6e6;--muted:#9aa1a9;--rule:#2c3036;--note:#2b2717;--noteb:#a8892a;--mark:#4a3f12;--warn:#f97066;--edit:#2d5a82;--chg-mod:#3b9fd8;--chg-add:#5fae47;--chg-del:#e5534b}}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 Charter,"Iowan Old Style",Georgia,serif}
main{max-width:46rem;margin:0 auto;padding:3rem 1rem 6rem}
.src{font:13px ui-monospace,monospace;color:var(--muted);overflow-wrap:anywhere}
h1{font-size:2rem;line-height:1.25;margin:.4rem 0 2rem}
h2{margin-top:2.6rem;padding-top:.6rem;border-top:1px solid var(--rule)}
img{max-width:100%}
pre{overflow-x:auto;background:var(--rule);padding:.8rem 1rem;border-radius:4px}
code{font:.88em ui-monospace,monospace;background:var(--rule);padding:.05em .3em;border-radius:3px}
pre code{background:none;padding:0}
blockquote{margin:1rem 0;padding-left:1rem;border-left:3px solid var(--rule);color:var(--muted)}
.tw{overflow-x:auto}
table{border-collapse:collapse;font:14px/1.45 system-ui,sans-serif;width:100%}
th,td{border:1px solid var(--rule);padding:.45rem .6rem;vertical-align:top;text-align:left}
th{background:var(--rule)}
mark.agent{background:var(--mark);color:inherit;border-radius:2px}
aside.agent-note{font:14px/1.5 system-ui,sans-serif;background:var(--note);border-left:3px solid var(--noteb);padding:.6rem .8rem;margin:.6rem 0 1.2rem;border-radius:4px}
aside.agent-note.hot,mark.agent.hot{outline:1px solid var(--noteb);outline-offset:2px}
aside.agent-note:not(.open){max-height:1.55em;overflow:hidden;cursor:pointer;opacity:.75;-webkit-mask-image:linear-gradient(90deg,#000 80%,transparent)}
aside.agent-note.open,mark.agent.open{outline:2px solid var(--noteb);outline-offset:2px}
aside.agent-note.hot,aside.agent-note.open{max-height:none;opacity:1;-webkit-mask-image:none;position:relative;z-index:5;box-shadow:0 4px 14px rgba(0,0,0,.18)}
mark.agent{cursor:pointer}
.turn{margin:0 -.8rem;padding:0 .8rem}
.turn+.turn{border-top:1px solid var(--noteb);margin-top:.5rem;padding-top:.5rem}
.byline{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.turn.by-author{background:var(--bg);padding-bottom:.5rem}
.turn.by-author+.turn{margin-top:0}
.turn.by-author:last-child{margin-bottom:-.6rem;padding-bottom:.6rem}
.turn.by-author .byline{color:var(--noteb)}
.anno{position:relative}
.warn{font:14px/1.5 system-ui,sans-serif;color:var(--warn)}
#unanchored blockquote{font-style:italic}
.mode-hint{display:none;position:sticky;top:0;z-index:1;margin:-3rem -1rem 1.5rem;padding:.45rem 1rem;font:13px/1.4 system-ui,sans-serif;color:var(--muted);background:var(--bg);border-bottom:1px solid var(--rule)}
.mode-hint.on{display:block}
.mode-hint.error{color:var(--warn)}
body.editing .blk{cursor:text;border-radius:3px}
body.editing .blk:hover{outline:1px dashed var(--muted);outline-offset:4px}
textarea.src-edit{display:block;box-sizing:border-box;width:100%;margin:1rem 0;padding:.6rem .7rem;font:14px/1.55 ui-monospace,monospace;color:var(--fg);background:var(--bg);border:1px solid var(--edit);border-radius:4px;outline:2px solid var(--edit);resize:vertical;overflow:hidden}
.edit-error{font:14px/1.5 system-ui,sans-serif;color:var(--warn);margin:-.5rem 0 1rem}
.edit-error button{margin-left:.5rem;font:inherit}
.blk{position:relative}
.chg-mod::before,.chg-add::before{content:"";position:absolute;left:-.8rem;top:.15rem;bottom:.15rem;width:3px;border-radius:2px;pointer-events:none}
.chg-mod::before{background:var(--chg-mod)}
.chg-add::before{background:var(--chg-add)}
li.chg-mod,li.chg-add,li.chg-del-before,li.chg-del-after{position:relative}
li.chg-mod::before,li.chg-add::before{left:calc(-.8rem - var(--depth)*40px)}
li.chg-del-before::after,li.chg-del-after::after{content:"";position:absolute;left:calc(-.8rem - var(--depth)*40px);border:5px solid transparent;border-left:6px solid var(--chg-del);pointer-events:none}
li.chg-del-before::after{top:-5px}
li.chg-del-after::after{bottom:-5px}
.chg-del{position:relative;height:0}
.chg-del::before{content:"";position:absolute;left:-.8rem;top:-5px;border:5px solid transparent;border-left:6px solid var(--chg-del);pointer-events:none}
@media (min-width:66rem){
  main{margin-left:max(0px,calc((100% - 66rem)/2))}
  .margin{position:absolute;top:0;left:calc(100% + 1.5rem);width:16rem}
  .margin aside.agent-note{margin:0 0 .6rem}
}
`;

const CLIENT = String.raw`
(() => {
  const main = document.querySelector('main');
  const data = JSON.parse(document.getElementById('review-data').textContent);

  // Wide tables scroll sideways instead of widening the page.
  for (const t of main.querySelectorAll('table')) {
    const w = document.createElement('div');
    w.className = 'tw';
    t.replaceWith(w);
    w.append(t);
  }

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  if (data.notesError) {
    main.querySelector('.src').before(el('p', 'warn', 'Notes file could not be read (' + data.notesError + '); showing the document without notes.'));
  }

  // Index the document's visible text with whitespace collapsed, remembering
  // which text node and offset each character came from.
  function indexText() {
    const chars = [];
    let text = '';
    const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest('.margin, #unanchored, .src, .warn, .mode-hint')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    for (let n; (n = walk.nextNode());) {
      for (let i = 0; i < n.data.length; i++) {
        const space = /\s/.test(n.data[i]);
        if (space && text.endsWith(' ')) continue;
        text += space ? ' ' : n.data[i];
        chars.push([n, i]);
      }
    }
    return { text, chars };
  }

  // Highlight the first occurrence of quote; return its <mark>s, or [] if absent.
  function highlight(quote) {
    const q = quote.replace(/\s+/g, ' ').trim();
    if (!q) return [];
    const { text, chars } = indexText();
    const at = text.indexOf(q);
    if (at < 0) return [];
    const spans = new Map();
    for (const [node, i] of chars.slice(at, at + q.length)) {
      const s = spans.get(node);
      if (s) s[1] = i + 1; else spans.set(node, [i, i + 1]);
    }
    const marks = [];
    for (const [node, [start, end]] of spans) {
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, end);
      const m = el('mark', 'agent');
      r.surroundContents(m);
      marks.push(m);
    }
    return marks;
  }

  // The margin column belongs to the top-level block that holds the mark.
  function marginFor(mark) {
    let block = mark;
    while (block.parentElement !== main) block = block.parentElement;
    if (block.classList.contains('anno')) return block.querySelector('.margin');
    const anno = el('div', 'anno');
    const margin = el('div', 'margin');
    block.replaceWith(anno);
    anno.append(block, margin);
    anchors.set(margin, mark);
    return margin;
  }

  // A note is plain text, or a thread: turns by the editor and the author,
  // each under a byline and separated by a divider.
  function noteBody(n) {
    if (n && Array.isArray(n.thread) && n.thread.length) {
      const f = document.createDocumentFragment();
      for (const t of n.thread) {
        const by = t && t.by === 'author' ? 'author' : 'editor';
        const turn = el('div', 'turn by-' + by);
        turn.append(el('div', 'byline', by === 'author' ? 'Author' : 'Editor'),
          el('div', '', t && typeof t.text === 'string' ? t.text : JSON.stringify(t)));
        f.append(turn);
      }
      return f;
    }
    return document.createTextNode(n && typeof n.note === 'string' ? n.note : JSON.stringify(n));
  }

  const anchors = new Map();
  const unanchored = [];
  for (const n of data.notes) {
    const quote = n && typeof n.quote === 'string' ? n.quote : '';
    const note = noteBody(n);
    const marks = quote ? highlight(quote) : [];
    if (!marks.length) {
      unanchored.push([quote, note]);
      continue;
    }
    // Hovering a note or any piece of its highlight outlines the whole pair.
    const aside = el('aside', 'agent-note');
    aside.append(note);
    const pair = [aside, ...marks];
    const link = on => () => pair.forEach(e => e.classList.toggle('hot', on));
    for (const e of pair) {
      e.addEventListener('mouseenter', link(true));
      e.addEventListener('mouseleave', link(false));
    }
    marginFor(marks[0]).append(aside);
    // Notes start collapsed to one line. Hovering a note or its highlight
    // expands it for reading; clicking pins it open and collapses the others.
    // A text selection inside a highlight is left alone so annotating works.
    const open = () => {
      document.querySelectorAll('.agent-note.open, mark.agent.open').forEach(e => e.classList.remove('open'));
      pair.forEach(e => e.classList.add('open'));
      stack();
    };
    // Lavish's annotator may swallow element click handlers, so clicks are
    // caught on window in the capture phase (below) and routed here.
    for (const e of pair) e._lavishOpen = open;
  }

  addEventListener('pointerup', ev => {
    const t = ev.target.closest && ev.target.closest('aside.agent-note, mark.agent');
    if (!t || !t._lavishOpen || t.classList.contains('open')) return;
    const sel = getSelection();
    if (t.tagName === 'MARK' && sel && !sel.isCollapsed) return;
    t._lavishOpen();
  }, true);

  if (unanchored.length) {
    const s = el('section');
    s.id = 'unanchored';
    s.append(el('h2', '', 'Notes that no longer match the text'),
      el('p', 'warn', 'The quoted passage was not found in the current document, usually because it was edited after the note was written.'));
    for (const [quote, note] of unanchored) {
      const aside = el('aside', 'agent-note');
      aside.append(note);
      s.append(el('blockquote', '', quote || '(no quote)'), aside);
    }
    main.append(s);
  }

  // On wide screens each margin column starts level with its first highlight,
  // pushed down when it would overlap the column above it. Columns are laid out
  // in document order, whatever order the notes file lists them in.
  const wide = matchMedia('(min-width:66rem)');
  function stack() {
    let bottom = -Infinity;
    const columns = [...anchors].sort(([a], [b]) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    for (const [m, mark] of columns) {
      m.style.top = '';
      if (!wide.matches) continue;
      const base = m.parentElement.getBoundingClientRect().top;
      const top = Math.max(mark.getBoundingClientRect().top, bottom + 12);
      m.style.top = (top - base) + 'px';
      bottom = m.getBoundingClientRect().bottom;
    }
  }
  stack();
  addEventListener('resize', stack);
  document.fonts && document.fonts.ready.then(stack);

  // Direct editing. Lavish ignores text selections inside editable elements
  // while annotating, so blocks open for editing only when the reviewer turns
  // Lavish's Annotate switch off. Lavish reports that switch to the page with a
  // "lavish:setAnnotationMode" message; outside Lavish no message arrives.
  // Saving goes to serve.mjs, which writes the markdown file and re-renders.
  const save = data.save;
  const source = save ? data.source.split('\n') : [];
  const hint = main.querySelector('.mode-hint');
  const key = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
  let annotating = true, helper = false, editor = null;

  function showHint(message, error) {
    hint.classList.add('on');
    hint.classList.toggle('error', !!error);
    if (message) { hint.textContent = message; return; }
    if (!helper) {
      hint.textContent = (annotating ? 'Annotating: select text to comment on it. ' : '') +
        'Direct editing is off because the save helper (serve.mjs) is not running.';
    } else if (annotating) {
      hint.textContent = 'Annotating: select text to comment on it. Turn Annotate off (top right, or ' + key + 'I) to edit the markdown directly.';
    } else {
      hint.textContent = 'Editing: click a block to edit its markdown. Enter adds a line; a blank line starts a new paragraph. Click away or press ' + key + 'Enter to save to ' + save.file + '; Esc cancels.';
    }
  }

  function post(route, body) {
    return fetch(save.url + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: save.token, ...body }),
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  }

  addEventListener('message', e => {
    if (e.source !== parent || !e.data || e.data.type !== 'lavish:setAnnotationMode') return;
    annotating = !!e.data.enabled;
    document.body.classList.toggle('editing', helper && !annotating);
    showHint();
  });

  if (save) {
    post('/ping', {}).then(r => { helper = r.status === 200; }, () => {}).then(() => {
      document.body.classList.toggle('editing', helper && !annotating);
      if (hint.classList.contains('on')) showHint();
    });
  }

  main.addEventListener('click', e => {
    if (annotating || !helper || editor || e.target.closest('a, .margin, textarea, .edit-error')) return;
    const blk = e.target.closest('.blk');
    if (blk) open(blk);
  });

  // While a block is open the helper holds off re-rendering on file changes, so
  // a live reload never discards text the reviewer is typing.
  const hold = on => post('/hold', { open: on }).catch(() => {});

  function open(blk) {
    const start = +blk.dataset.start, end = +blk.dataset.end;
    const original = source.slice(start, end).join('\n');
    const ta = el('textarea', 'src-edit');
    ta.value = original;
    ta.spellcheck = true;
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
    const holder = blk.parentElement.classList.contains('anno') ? blk.parentElement : blk;
    holder.style.display = 'none';
    holder.after(ta);
    editor = ta;
    hold(true);
    fit();
    ta.focus();
    let done = false;
    const close = () => { done = true; ta.remove(); holder.style.display = ''; editor = null; stack(); hold(false); };
    async function commit() {
      if (done) return;
      if (ta.value === original) return close();
      done = true;
      ta.readOnly = true;
      showHint('Saving to ' + save.file + '...');
      let r;
      try { r = await post('/save', { sha: save.sha, start, end, text: ta.value }); }
      catch { r = { status: 0, body: { error: 'The save helper did not answer. Is serve.mjs still running?' } }; }
      if (r.status === 200) {
        showHint('Saved to ' + save.file + '. The page reloads with your change.');
        setTimeout(() => location.reload(), 4000);
        return;
      }
      done = false;
      ta.readOnly = false;
      const msg = r.status === 409
        ? save.file + ' changed on disk since this page was rendered, so this edit was not saved. Copy your text if you need it, then reload.'
        : 'Not saved: ' + (r.body.error || 'the save helper refused the request') + '.';
      showHint(msg, true);
      ta.nextElementSibling?.classList.contains('edit-error') && ta.nextElementSibling.remove();
      const box = el('p', 'edit-error', msg);
      const reload = el('button', '', 'Reload');
      reload.type = 'button';
      reload.addEventListener('click', () => { hold(false); setTimeout(() => location.reload(), 1500); });
      box.append(reload);
      ta.after(box);
      if (r.status === 409) done = true;
    }
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); showHint(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
    });
    ta.addEventListener('blur', () => { if (!ta.nextElementSibling?.classList.contains('edit-error')) commit(); });
  }
})();
`;

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 3) {
    console.error('usage: render.mjs <document.md> [notes.json] [out.html]');
    process.exit(2);
  }
  if (!fs.statSync(args[0], { throwIfNoEntry: false })?.isFile()) {
    console.error(`render.mjs: no such file: ${args[0]}`);
    process.exit(1);
  }
  console.log(render(resolvePaths(args[0], args[1], args[2])));
}
