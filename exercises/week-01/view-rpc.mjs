import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

// Read-only local view used to capture the running exercise in a browser.
const run = promisify(execFile);
const savedFile = new URL('../../evidence/week-01/devnet-rpc.json', import.meta.url);
const capacityFile = fileURLToPath(new URL('./capacity.mjs', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
async function rpc(method) {
  const response = await fetch('http://127.0.0.1:28114', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' || request.url !== '/') {
    response.writeHead(404).end();
    return;
  }
  try {
    const [info, tip, execution, file] = await Promise.all([
      rpc('get_blockchain_info'), rpc('get_tip_header'),
      run(process.execPath, [capacityFile], { timeout: 8000, windowsHide: true }),
      readFile(savedFile, 'utf8'),
    ]);
    const saved = JSON.parse(file);
    const captured = new Date().toISOString();
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(`<!doctype html><html lang="en"><meta charset="utf-8">
      <title>CKB Devnet RPC check</title>
      <style>body{font:16px/1.5 system-ui;margin:32px auto;max-width:1080px;padding:0 24px;color:#202124;background:#fafafa}h1{font-size:28px}h2{font-size:19px;margin:24px 0 8px}pre{background:white;border:1px solid #ddd;padding:14px;font:14px/1.45 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:160px 1fr;gap:6px 16px}dt{font-weight:600}dd{margin:0}.note{color:#555}</style>
      <h1>CKB Devnet RPC check</h1>
      <p class="note">Live queries to the local node · ${escape(captured)}</p>
      <dl><dt>RPC endpoint</dt><dd>http://127.0.0.1:28114</dd>
      <dt>Chain</dt><dd>${escape(info.result.chain)}</dd>
      <dt>Current height</dt><dd>${BigInt(tip.result.number)}</dd>
      <dt>Saved RPC run</dt><dd>${escape(saved.summary.first_height)} → ${escape(saved.summary.second_height)} · ${escape(saved.recorded_at)}</dd></dl>
      <h2>get_tip_header response</h2><pre>${escape(JSON.stringify(tip, null, 2))}</pre>
      <h2>Capacity exercise · executed on this page request</h2>
      <pre>${escape(execution.stdout)}${escape(execution.stderr)}</pre>
      <p class="note">Saved request/response pairs: evidence/week-01/devnet-rpc.json</p>
      </html>`);
  } catch (error) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' }).end(error.message);
  }
});
server.listen(18914, '127.0.0.1', () => console.log('RPC view: http://127.0.0.1:18914/'));
process.on('SIGINT', () => server.close());
