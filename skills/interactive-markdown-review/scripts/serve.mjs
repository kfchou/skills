#!/usr/bin/env node
// Save helper for visual mode: renders the review page, lets the page save edits
// to ONE markdown file, and re-renders whenever the markdown, notes, or baseline
// file changes on disk. Runs until stopped; on exit the page is re-rendered
// read-only.
//
// Usage: node serve.mjs <document.md> [notes.json] [out.html] [--port N]
//
// Security: the endpoint listens on 127.0.0.1 only, and any website open in the
// browser can reach a localhost port, so every request must
//   - carry Host 127.0.0.1:<port> or localhost:<port> (blocks DNS rebinding),
//   - come from Origin "null", the sandboxed Lavish artifact frame,
//   - be a JSON POST to /ping, /hold or /save carrying the random per-run token that
//     only the rendered page holds.
// /save only ever writes the one file this helper was started for, only replaces
// a line range inside it, and refuses when the file no longer matches the
// version the page was rendered from.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { render, resolvePaths, sha256 } from './render.mjs';

const args = process.argv.slice(2);
let port = 0;
const portAt = args.indexOf('--port');
if (portAt >= 0) port = Number(args.splice(portAt, 2)[1]);
if (args.length < 1 || args.length > 3 || !Number.isInteger(port)) {
  console.error('usage: serve.mjs <document.md> [notes.json] [out.html] [--port N]');
  process.exit(2);
}
if (!fs.statSync(args[0], { throwIfNoEntry: false })?.isFile()) {
  console.error(`serve.mjs: no such file: ${args[0]}`);
  process.exit(1);
}

const paths = resolvePaths(args[0], args[1], args[2]);
const target = fs.realpathSync(paths.src); // write through symlinks, never replace them
const token = crypto.randomBytes(32).toString('hex');
const MAX_BODY = 2 * 1024 * 1024;
let save = null;
let rendered = '';
let heldUntil = 0; // while the reviewer has a block open, file changes wait

const readOr = (file, fallback) => { try { return fs.readFileSync(file, 'utf8'); } catch { return fallback; } };

function rerender(force) {
  if (!force && Date.now() < heldUntil) return;
  const state = [target, paths.notes, paths.baseline].map(f => sha256(readOr(f, ''))).join('');
  if (!force && state === rendered) return;
  rendered = state;
  render(paths, save);
}

function replaceLines(text, start, end, replacement) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (end > lines.length) return null;
  const add = replacement.replace(/\r\n/g, '\n').replace(/\n+$/, '');
  lines.splice(start, end - start, ...(add ? add.split('\n') : []));
  return lines.join('\n').replace(/\n/g, eol);
}

// The reviewer's own saves are not changes to flag, so apply each one to the
// baseline too: replace the block's old text there, when it appears exactly once.
// A block the agent changed this turn isn't in the baseline and keeps its bar.
function foldIntoBaseline(oldText, newText) {
  const base = readOr(paths.baseline, null);
  if (base === null) return;
  const padded = `\n${base.replace(/\r\n/g, '\n')}\n`;
  const needle = `\n${oldText}\n`;
  const at = padded.indexOf(needle);
  if (at < 0 || padded.indexOf(needle, at + 1) >= 0) return;
  const add = newText.replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const updated = padded.slice(0, at) + `\n${add}\n` + padded.slice(at + needle.length);
  fs.writeFileSync(paths.baseline, updated.slice(1, -1));
}

function writeAtomically(file, text) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, text, { mode: fs.statSync(file).mode });
  fs.renameSync(tmp, file);
}

function handle(req, body) {
  if (req.url === '/ping') return [200, { ok: true }];
  if (req.url === '/hold') {
    heldUntil = body.open === true ? Date.now() + 10 * 60 * 1000 : 0;
    if (!heldUntil) rerender(false);
    return [200, { ok: true }];
  }
  const { sha, start, end, text } = body;
  if (typeof sha !== 'string' || typeof text !== 'string' ||
      !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
    return [400, { error: 'expected {sha, start, end, text}' }];
  }
  const current = fs.readFileSync(target, 'utf8');
  if (sha256(current) !== sha) return [409, { error: 'the file changed since the page was rendered' }];
  const updated = replaceLines(current, start, end, text);
  if (updated === null) return [400, { error: 'line range is outside the file' }];
  writeAtomically(target, updated);
  foldIntoBaseline(current.replace(/\r\n/g, '\n').split('\n').slice(start, end).join('\n'), text);
  heldUntil = 0;
  rerender(true);
  console.log(`saved lines ${start + 1}-${end} of ${paths.src}`);
  return [200, { ok: true, sha: sha256(updated) }];
}

const server = http.createServer((req, res) => {
  const reply = (status, obj) => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    if (req.headers.origin === 'null') headers['Access-Control-Allow-Origin'] = 'null';
    res.writeHead(status, headers).end(JSON.stringify(obj));
  };
  const { port: bound } = server.address();
  if (![`127.0.0.1:${bound}`, `localhost:${bound}`].includes(req.headers.host)) return reply(403, { error: 'bad host' });
  if (req.headers.origin !== 'null') return reply(403, { error: 'bad origin' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'null',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600',
    }).end();
    return;
  }
  if (req.method !== 'POST' || !['/ping', '/hold', '/save'].includes(req.url)) return reply(404, { error: 'not found' });
  if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return reply(415, { error: 'expected JSON' });
  let size = 0;
  const chunks = [];
  req.on('data', c => {
    size += c.length;
    if (size > MAX_BODY) { reply(413, { error: 'too large' }); req.destroy(); } else chunks.push(c);
  });
  req.on('end', () => {
    if (size > MAX_BODY) return;
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: 'invalid JSON' }); }
    const given = Buffer.from(typeof body?.token === 'string' ? body.token : '');
    const expected = Buffer.from(token);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return reply(403, { error: 'bad token' });
    try { reply(...handle(req, body)); } catch (e) { reply(500, { error: e.message }); }
  });
});

server.listen(port, '127.0.0.1', () => {
  save = { url: `http://127.0.0.1:${server.address().port}`, token };
  rerender(true);

  // Watch directories rather than files: editors often save by renaming over the file.
  let timer = null;
  const later = () => { clearTimeout(timer); timer = setTimeout(() => { try { rerender(false); } catch (e) { console.error(e.message); } }, 150); };
  const watchFor = (file) => {
    const name = path.basename(file);
    fs.watch(path.dirname(path.resolve(file)), (_, changed) => { if (!changed || changed === name) later(); });
  };
  watchFor(target);
  fs.mkdirSync(path.dirname(path.resolve(paths.notes)), { recursive: true });
  watchFor(paths.notes);
  watchFor(paths.baseline);

  console.log(`page: ${paths.out}`);
  console.log(`save helper: ${save.url} (pid ${process.pid}; the token is embedded in the page)`);
  console.log(`watching: ${paths.src}, ${paths.notes} and ${paths.baseline}`);
  console.log('stop with Ctrl+C or kill; the page then turns read-only.');
});

const stop = () => {
  save = null;
  try { render(paths, null); } catch {}
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
