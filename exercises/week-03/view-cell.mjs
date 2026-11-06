import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const [artifact = 'evidence/week-03/cell-data.json'] = process.argv.slice(2);
const saved = JSON.parse(await readFile(artifact, 'utf8'));
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
async function lookup(point) {
  const r = await fetch('http://127.0.0.1:28114', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'get_live_cell', params: [point, true] }), signal: AbortSignal.timeout(5000) });
  const { result, error } = await r.json();
  if (error) throw new Error(error.message);
  return result;
}
createServer(async (req, res) => {
  if (req.url !== '/') { res.writeHead(404).end(); return; }
  try {
    const [old, current] = saved.results;
    const [oldLive, currentLive] = await Promise.all([lookup(old.out_point), lookup(current.out_point)]);
    if (currentLive.status !== 'live') throw new Error('Replacement Cell is not live');
    const data = currentLive.cell.data.content;
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(data.slice(2), 'hex'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><title>Week 3: Devnet Cell data</title>
<style>body{font:16px/1.55 system-ui;max-width:920px;margin:32px auto;padding:0 24px}section{border:1px solid #ccc;padding:14px 18px;margin:16px 0}h2{margin:0}code{overflow-wrap:anywhere}</style>
<h1>Week 3 · Devnet Cell data</h1><p>Live RPC query · ${new Date().toISOString()}</p>
<section><h2>Original Cell</h2><p><code>${esc(old.out_point.tx_hash)}:0</code></p><p>Committed payload: ${esc(old.decoded)} · ${old.bytes} UTF-8 bytes · ${old.minimum_ckb} CKB minimum</p><p>Current RPC status: <b>${esc(oldLive.status)}</b> (no longer live)</p></section>
<section><h2>Replacement Cell</h2><p><code>${esc(current.out_point.tx_hash)}:0</code></p><p>Decoded from live Cell: <b>${esc(decoded)}</b></p><p><code>${esc(data)}</code></p><p>${current.bytes} UTF-8 bytes · ${current.minimum_ckb} CKB minimum · <b>${esc(currentLive.status)}</b></p></section>`);
  } catch (e) { res.writeHead(503).end(e.message); }
}).listen(18916, '127.0.0.1', () => console.log('http://127.0.0.1:18916/'));
