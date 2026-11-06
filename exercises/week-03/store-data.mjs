import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { setTimeout } from 'node:timers/promises';

const [cli, out = 'evidence/week-03'] = process.argv.slice(2);
assert.ok(cli, 'Pass the OffCKB CLI path');
const require = createRequire(pathToFileURL(resolve(cli)));
const { ccc } = require('@ckb-ccc/core');
const root = fileURLToPath(new URL('../../', import.meta.url));
const launcher = join(root, 'exercises/week-01/offckb.mjs');
const endpoint = 'http://127.0.0.1:28114';
const calls = [];
const stringify = value => JSON.stringify(value, null, 2) + '\n';
async function rpc(method, params = []) {
  const request = { jsonrpc: '2.0', id: calls.length + 1, method, params };
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(8000) });
  assert.ok(response.ok, `RPC HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(body.id, request.id);
  assert.ok(!body.error, JSON.stringify(body.error));
  calls.push({ at: new Date().toISOString(), request, response: body });
  return body.result;
}
function offckb(args) {
  // Avoid surfacing the accounts command output on failure.
  try { return execFileSync(process.execPath, [launcher, cli, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 15000 }); }
  catch { throw new Error(`OffCKB ${args.includes('accounts') ? 'accounts' : 'system-scripts'} failed`); }
}
const chain = await rpc('get_blockchain_info');
assert.equal(chain.chain, 'ckb_dev');
const genesis = await rpc('get_block_hash', ['0x0']);
const expected = JSON.parse(await readFile(join(root, 'evidence/week-01/devnet-rpc.json'), 'utf8'));
assert.equal(genesis, expected.summary.genesis_hash, 'Expected the Week 1 Devnet genesis');
const exported = offckb(['system-scripts', '--export-style', 'ccc']);
const scripts = JSON.parse(exported.slice(exported.indexOf('{')));
const account = offckb(['--json', 'accounts', '--show-private-keys']).trim().split(/\r?\n/)
  .map(line => JSON.parse(line)).find(line => line.command === 'accounts' && line.forked === false)?.accounts[0];
assert.ok(account?.privkey, 'Expected a bundled, non-fork Devnet account');
const client = new ccc.ClientPublicTestnet({ url: endpoint, scripts, fallbacks: [] });
const signer = new ccc.SignerCkbPrivateKey(client, account.privkey);
const { script: lock } = await signer.getAddressObjSecp256k1();
const messages = ['CKBuilder: café', 'CKBuilder: café / revision 2'];
const shannons = 100_000_000n;
await mkdir(out, { recursive: true });
const checkpointFile = join(out, 'checkpoint.json');
let checkpoint = { genesis, hashes: [] };
try { checkpoint = JSON.parse(await readFile(checkpointFile, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
assert.equal(checkpoint.genesis, genesis);

async function committed(hash) {
  for (let i = 0; i < 60; i++) {
    const record = await rpc('get_transaction', [hash]);
    if (record?.tx_status.status === 'committed') return record;
    assert.notEqual(record?.tx_status.status, 'rejected');
    await setTimeout(1000);
  }
  throw new Error(`Commit not observed for ${hash}; rerun to check the saved hash.`);
}

const results = [];
for (const [index, message] of messages.entries()) {
  const data = '0x' + Buffer.from(message, 'utf8').toString('hex');
  const bytes = (data.length - 2) / 2;
  const minimum = BigInt(8 + 32 + 1 + (lock.args.length - 2) / 2 + bytes) * shannons;
  const previous = results.at(-1)?.out_point;
  let hash = checkpoint.hashes[index];
  if (!hash) {
    const tx = ccc.Transaction.from({ outputs: [{ lock, capacity: minimum }], outputsData: [data] });
    if (previous) tx.addInput({ previousOutput: { txHash: previous.tx_hash, index: previous.index } });
    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer, 1000);
    hash = await signer.sendTransaction(tx);
    checkpoint.hashes[index] = hash;
    await writeFile(checkpointFile, stringify(checkpoint), 'utf8');
    console.log(`Submitted ${hash}`);
  }
  const record = await committed(hash);
  const transaction = record.transaction;
  const out_point = { tx_hash: hash, index: '0x0' };
  assert.equal(transaction.outputs_data[0], data);
  assert.equal(BigInt(transaction.outputs[0].capacity), minimum);
  if (previous) assert.ok(transaction.inputs.some(({ previous_output: p }) => p.tx_hash === previous.tx_hash && p.index === previous.index));
  const live = await rpc('get_live_cell', [out_point, true]);
  // A resumed run may observe v1 already spent; its bytes remain in the committed transaction.
  if (index !== 0 || !checkpoint.hashes[1]) assert.equal(live.status, 'live');
  const readHex = live.cell?.data?.content ?? transaction.outputs_data[0];
  assert.equal(readHex, data);
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(readHex.slice(2), 'hex'));
  assert.equal(decoded, message);
  results.push({ version: index + 1, out_point, decoded, data, bytes, minimum_ckb: String(minimum / shannons), status: record.tx_status, read_from: live.status === 'live' ? 'live_cell' : 'committed_transaction' });
}
const replaced = await rpc('get_live_cell', [results[0].out_point, false]);
assert.ok(['dead', 'unknown'].includes(replaced.status));
const result = { recorded_at: new Date().toISOString(), network: chain.chain, genesis, node: process.version, ccc: require('@ckb-ccc/core/package.json').version, results, replaced_cell_status: replaced.status, rpc_calls: calls };
await writeFile(join(out, 'cell-data.json'), stringify(result), 'utf8');
console.log(stringify({ results, replaced_cell_status: replaced.status }));
