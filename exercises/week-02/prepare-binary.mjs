import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const source = process.argv[2];
assert.ok(source, 'Pass the path to the CKB 0.210.0 Windows binary');
assert.match(execFileSync(source, ['--version'], { encoding: 'utf8', windowsHide: true }), /^ckb 0\.210\.0 /);
const root = fileURLToPath(new URL('../../.local/', import.meta.url));
const settingsFile = join(root, 'offckb/roaming/offckb-nodejs/Config/settings.json');
let settings = {};
try { settings = JSON.parse(await readFile(settingsFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
settings.bins = { ...settings.bins, rootFolder: join(root, 'bins'), defaultCKBVersion: '0.210.0' };
await mkdir(join(root, 'bins/0.210.0'), { recursive: true });
await mkdir(join(root, 'offckb/roaming/offckb-nodejs/Config'), { recursive: true });
await copyFile(source, join(root, 'bins/0.210.0/ckb.exe'));
await writeFile(settingsFile, JSON.stringify(settings, null, 2) + '\n');
console.log('Registered CKB 0.210.0 in this exercise\'s local OffCKB binary directory.');
