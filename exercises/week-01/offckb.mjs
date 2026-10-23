import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep this exercise's OffCKB configuration separate from other projects.
const [cli, ...args] = process.argv.slice(2);
if (!cli || args.length === 0) {
  console.error('Usage: node exercises/week-01/offckb.mjs <offckb/build/index.js> <command> [options]');
  process.exit(1);
}
if (process.platform !== 'win32') {
  console.error('This launcher isolates the Windows AppData directories. On other systems, use offckb directly.');
  process.exit(1);
}

const root = fileURLToPath(new URL('../../.local/offckb/', import.meta.url));
const roaming = resolve(root, 'roaming');
const local = resolve(root, 'local');
mkdirSync(roaming, { recursive: true });
mkdirSync(local, { recursive: true });
const child = spawn(process.execPath, [resolve(cli), ...args], {
  env: { ...process.env, APPDATA: roaming, LOCALAPPDATA: local },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => { process.exitCode = code ?? 1; });
