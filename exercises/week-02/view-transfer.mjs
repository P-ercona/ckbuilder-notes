import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const server = createServer(async (req, res) => {
  if (req.url !== '/') { res.writeHead(404).end(); return; }
  try {
    const saved = JSON.parse(await readFile(new URL('../../evidence/week-02/transfer.json', import.meta.url), 'utf8'));
    const response = await fetch('http://127.0.0.1:28114', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'get_transaction', params: [saved.tx_hash] }) });
    const live = await response.json();
    if (live.error) throw new Error(JSON.stringify(live.error));
    const escaped = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(`<html><title>CKB transfer check</title><style>body{font:16px/1.5 system-ui;max-width:1000px;margin:30px auto;padding:20px}pre{background:#f4f4f4;padding:20px;white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:26px}</style><h1>Week 2 · Devnet transfer</h1><p>Live RPC query: ${new Date().toISOString()}</p><p>Network: ckb_dev · Amount: 100 CKB</p><p>Transaction: ${escaped(saved.tx_hash)}</p><p>Current status: <b>${escaped(live.result.tx_status.status)}</b></p><h2>Capacity reconciliation (shannons)</h2><pre>${escaped(JSON.stringify(saved.summary, null, 2))}</pre><h2>Confirmed outputs</h2><pre>${escaped(JSON.stringify(live.result.transaction.outputs, null, 2))}</pre></html>`);
  } catch (error) { res.writeHead(503).end(error.message); }
});
server.listen(18915, '127.0.0.1', () => console.log('http://127.0.0.1:18915/'));
process.on('SIGINT', () => server.close());
