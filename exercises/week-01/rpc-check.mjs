import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const endpoint = process.argv[2] ?? 'http://127.0.0.1:28114';
const output = process.argv[3] ?? 'evidence/week-01/devnet-rpc.json';
const url = new URL(endpoint);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use a local Devnet RPC');

const calls = [];
async function rpc(method, params = []) {
  const request = { jsonrpc: '2.0', id: calls.length + 1, method, params };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(8000),
  });
  assert.ok(response.ok, `HTTP ${response.status}`);
  const body = await response.json();
  calls.push({ observed_at: new Date().toISOString(), request, response: body });
  assert.equal(body.id, request.id);
  assert.equal(body.jsonrpc, '2.0');
  assert.ok(!body.error, JSON.stringify(body.error));
  assert.ok(Object.hasOwn(body, 'result'), 'Missing RPC result');
  return body.result;
}

try {
  const info = await rpc('get_blockchain_info');
  assert.match(info.chain, /dev/i, 'Expected a Devnet chain');
  const first = await rpc('get_tip_header');
  let second = first;
  const deadline = Date.now() + 15000;
  while (BigInt(second.number) === BigInt(first.number) && Date.now() < deadline) {
    await setTimeout(1000);
    second = await rpc('get_tip_header');
  }
  const header = await rpc('get_header', [first.hash]);
  const genesisHash = await rpc('get_block_hash', ['0x0']);
  assert.equal(header.hash, first.hash);
  assert.equal(header.number, first.number);
  assert.match(genesisHash, /^0x[0-9a-f]{64}$/);
  assert.ok(BigInt(second.number) > BigInt(first.number), 'Block height did not advance');

  const result = {
    recorded_at: new Date().toISOString(),
    endpoint,
    network: info.chain,
    runtime_version: process.version,
    command: `node exercises/week-01/rpc-check.mjs ${endpoint} ${output}`,
    summary: {
      first_height: BigInt(first.number).toString(),
      second_height: BigInt(second.number).toString(),
      second_block_hash: second.hash,
      genesis_hash: genesisHash,
      checks: { chain_is_devnet: true, blocks_advance: true, header_lookup_matches: true, genesis_query: true },
    },
    calls,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`Devnet: ${info.chain}`);
  console.log(`RPC: ${endpoint}`);
  console.log(`Block height: ${result.summary.first_height} -> ${result.summary.second_height}`);
  console.log(`Tip hash: ${second.hash}`);
  console.log('PASS: chain identity, block growth, header lookup, genesis query');
  console.log(`Saved ${calls.length} RPC request/response pairs to ${output}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
