# Week 1 exercises

## Environment

These exercises were run on Windows x64 with Node.js v24.19.0, OffCKB 0.4.13, and CKB 0.210.0.

Download and extract the [CKB 0.210.0 Windows archive](https://github.com/nervosnetwork/ckb/releases/tag/v0.210.0), then install OffCKB:

```sh
npm install --prefix .local/tools @offckb/cli@0.4.13 --no-audit --no-fund
```

Run all commands below from the repository root. Make sure ports 8114 and 28114 are available before starting.

## Start the Devnet

In PowerShell, replace `$ckbBinary` with the path to the extracted `ckb.exe`:

```powershell
$offckbCli = (Resolve-Path '.local/tools/node_modules/@offckb/cli/build/index.js').Path
$ckbBinary = 'C:\path\to\ckb.exe'
node exercises/week-01/offckb.mjs $offckbCli node --binary-path $ckbBinary --daemon
```

The `offckb.mjs` launcher puts the child process's configuration and data under this repository's `.local/offckb` directory, keeping it separate from other projects' OffCKB settings. This launcher is for Windows.

## Run the exercises

```sh
node exercises/week-01/capacity.mjs
node exercises/week-01/rpc-check.mjs
```

The RPC check queries the chain name, block headers, and genesis hash. It waits for the block height to advance and looks up a header by hash. Raw requests and responses are saved to `evidence/week-01/devnet-rpc.json`.

By default, it uses the RPC proxy at `http://127.0.0.1:28114`. To query the node directly:

```sh
node exercises/week-01/rpc-check.mjs http://127.0.0.1:8114 evidence/week-01/direct-rpc.json
```

The generated miner configuration uses a 5-second block delay. The script polls once a second for up to 15 seconds so it doesn't fail simply because two queries fall within the same block.

## View the results

```sh
node exercises/week-01/view-rpc.mjs
```

Open `http://127.0.0.1:18914/` in a browser. The page queries the running node, displays its current tip header and the saved RPC results, and reruns the capacity exercise.

[View the screenshot from this run](../../evidence/week-01/devnet-rpc.png)

When finished, press Ctrl+C in the terminal running the viewer. To stop the Devnet, use the same launcher so it picks up the correct data directory:

```powershell
node exercises/week-01/offckb.mjs $offckbCli node stop
```

Chain data is kept after shutdown. Use the same startup command to resume.

On this Windows machine, WMIC wasn't installed, so OffCKB 0.4.13's `node stop` command couldn't identify the daemon. If you run into the same issue, use the fallback script below. It checks the PID, OffCKB command path, and child processes' data directory before stopping the process tree.

```powershell
& ./exercises/week-01/stop-devnet.ps1
```
