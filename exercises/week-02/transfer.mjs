import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const run = promisify(execFile);
const cli = process.argv[2];
assert.ok(cli, 'Pass the path to offckb/build/index.js');
const evidence = new URL('../../evidence/week-02/', import.meta.url);
const saved = new URL('transfer.json', evidence);
try { await access(saved); throw new Error('transfer.json already exists; refusing to send another transfer'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(evidence, { recursive: true });
const launcher = fileURLToPath(new URL('../week-01/offckb.mjs', import.meta.url));
const calls = [];
async function rpc(method, params = [], outputsOnly = false) {
  const request = { jsonrpc: '2.0', id: calls.length + 1, method, params };
  const response = await fetch('http://127.0.0.1:28114', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request), signal: AbortSignal.timeout(10000),
  });
  assert.ok(response.ok);
  const body = await response.json();
  calls.push(outputsOnly
    ? { recorded_at: new Date().toISOString(), request, response_excerpt: { outputs: body.result?.transaction?.outputs }, note: 'Parent transaction outputs only; binary data and other fields omitted.' }
    : { recorded_at: new Date().toISOString(), request, response: body });
  assert.ok(!body.error, JSON.stringify(body.error));
  return body.result;
}
async function command(args, extraEnv = {}) {
  const result = await run(process.execPath, [launcher, cli, '--json', ...args], { env: { ...process.env, ...extraEnv }, timeout: 180000, windowsHide: true, maxBuffer: 2000000 });
  const events = result.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
  return { exit_code: 0, events, stderr: result.stderr };
}
const chain = await rpc('get_blockchain_info');
assert.equal(chain.chain, 'ckb_dev');
const previous = JSON.parse(await readFile(new URL('../week-01/devnet-rpc.json', evidence), 'utf8'));
assert.equal(await rpc('get_block_hash', ['0x0']), previous.summary.genesis_hash);
const accountsRun = await command(['accounts']);
const accounts = accountsRun.events.find(event => event.command === 'accounts').accounts;
const [sender, recipient] = accounts;
const lock = a => ({ code_hash: a.lockScript.codeHash, hash_type: a.lockScript.hashType, args: a.lockScript.args });
const cells = a => rpc('get_cells', [{ script: lock(a), script_type: 'lock', script_search_mode: 'exact' }, 'asc', '0x64']);
const beforeSender = await cells(sender);
const beforeRecipient = await cells(recipient);
// Load only the bundled local-development key, keep it in memory, and never save it.
const keyRun = await command(['accounts', '--show-private-keys']);
const key = keyRun.events.find(event => event.command === 'accounts').accounts[0].privkey;
assert.ok(key, 'Bundled Devnet key not found');
let transferRun;
try { transferRun = JSON.parse(await readFile(new URL('transfer-command.json', evidence), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
transferRun ??= await command(['transfer', recipient.address, '100', '--network', 'devnet', '--proxy-rpc'], { OFFCKB_PRIVATE_KEY: key });
assert.ok(!JSON.stringify(transferRun).includes(key), 'CLI output unexpectedly contains a key');
await writeFile(new URL('transfer-command.json', evidence), JSON.stringify(transferRun, null, 2) + '\n');
const txHash = transferRun.events.find(event => event.command === 'transfer')?.txHash;
assert.match(txHash ?? '', /^0x[0-9a-f]{64}$/);
let transaction;
for (let i = 0; i < 60; i++) {
  transaction = await rpc('get_transaction', [txHash]);
  if (transaction?.tx_status.status === 'committed') break;
  await setTimeout(1000);
}
assert.equal(transaction?.tx_status.status, 'committed');
const tx = transaction.transaction;
const inputs = [];
for (const input of tx.inputs) {
  const parent = await rpc('get_transaction', [input.previous_output.tx_hash], true);
  const output = parent.transaction.outputs[Number(BigInt(input.previous_output.index))];
  assert.equal(output.lock.args, sender.lockArg);
  inputs.push({ out_point: input.previous_output, output });
}
const amount = 100n * 100_000_000n;
const sum = values => values.reduce((a, b) => a + b, 0n);
const inputCapacity = sum(inputs.map(cell => BigInt(cell.output.capacity)));
const outputCapacity = sum(tx.outputs.map(cell => BigInt(cell.capacity)));
const recipientCapacity = sum(tx.outputs.filter(cell => cell.lock.args === recipient.lockArg).map(cell => BigInt(cell.capacity)));
const changeCapacity = sum(tx.outputs.filter(cell => cell.lock.args === sender.lockArg).map(cell => BigInt(cell.capacity)));
assert.equal(recipientCapacity, amount);
assert.ok(inputCapacity > outputCapacity);
assert.equal(outputCapacity, recipientCapacity + changeCapacity);
const consumed = [];
for (const input of inputs) {
  const result = await rpc('get_live_cell', [input.out_point, false]);
  assert.notEqual(result.status, 'live'); consumed.push(result);
}
const created = [];
for (let i = 0; i < tx.outputs.length; i++) {
  const result = await rpc('get_live_cell', [{ tx_hash: txHash, index: '0x' + i.toString(16) }, false]);
  assert.equal(result.status, 'live'); created.push(result);
}
const result = {
  recorded_at: new Date().toISOString(), network: chain.chain,
  scheduled_date: '2026-10-30', actual_date_shanghai: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()),
  sender_address: sender.address, recipient_address: recipient.address,
  tx_hash: txHash, status: transaction.tx_status, transaction: tx, resolved_inputs: inputs,
  summary: { input_capacity_shannons: inputCapacity.toString(), recipient_capacity_shannons: recipientCapacity.toString(), change_capacity_shannons: changeCapacity.toString(), fee_shannons: (inputCapacity - outputCapacity).toString(), input_count: inputs.length, output_count: tx.outputs.length, consumed_inputs_not_live: true, created_outputs_live: true },
  sender_snapshot_at_verification: beforeSender, recipient_snapshot_at_verification: beforeRecipient, consumed, created, rpc_calls: calls,
};
await writeFile(saved, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ tx_hash: txHash, status: result.status.status, ...result.summary }, null, 2));
