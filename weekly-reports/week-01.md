# Week 1: Getting familiar with Cells and transactions

October 23, 2026

I started with the CKB introduction and quick-start guide, then read through the CCC introduction. The main topics were Cells, transaction inputs and outputs, and the difference between Lock Scripts and Type Scripts.

The key idea was how Cell updates work: you consume the old Cell and create a new one, rather than changing its data in place. A Lock Script controls who can spend a Cell, while a Type Script defines rules for changes to its data or assets. I'll put this into practice in the data-storage exercise.

## Capacity calculation

The first exercise was a simple transfer calculation. Starting with a 200 CKB input, 100 CKB goes to the recipient, 99.999 CKB comes back as change, and the remaining 0.001 CKB is the fee. The code uses BigInt to keep the calculation in integer units and avoid floating-point rounding.

I also checked outputs exceeding inputs, negative inputs, and adding multiple inputs together. All four checks passed.

- [Exercise code](../exercises/week-01/capacity.mjs)
- [Run output](../evidence/week-01/run.json)
- Runtime: Node.js v24.19.0

Run from the repository root:

```sh
node exercises/week-01/capacity.mjs
```

## Local Devnet and RPC

I set up the local environment with OffCKB 0.4.13 and CKB 0.210.0. Configuration and chain data live under the repository's `.local` directory, and the startup command points to the local `ckb.exe`. The node serves RPC on port 8114, with OffCKB's proxy on port 28114.

The query script checks the chain name, reads the tip header, looks up a header by its hash, and queries the genesis hash. The chain name came back as `ckb_dev`, and the block height advanced from 20 to 21 during the check.

The first attempt failed because the height hadn't changed after a 3.5-second wait. Looking at the generated miner configuration, the block delay was set to 5 seconds. I changed the check to poll once a second for up to 15 seconds, and it passed.

- [Setup and startup instructions](../exercises/week-01/README.md)
- [RPC query script](../exercises/week-01/rpc-check.mjs)
- [Raw requests and responses](../evidence/week-01/devnet-rpc.json)
- [Environment versions](../evidence/week-01/devnet-environment.json)
- [Startup log](../evidence/week-01/devnet-startup.log)
- [First attempt](../evidence/week-01/rpc-first-attempt.txt)

I added a small local viewer to inspect the results. Opening the page queries the node again and reruns the capacity exercise. By the time I took the screenshot, the block height was 38.

I also queried the node directly on port 8114. The height advanced from 82 to 83, and its genesis hash matched the one returned through the proxy.

![Local Devnet RPC responses and capacity exercise output](../evidence/week-01/devnet-rpc.png)

There was one Windows issue when shutting down: `offckb node stop` uses WMIC to identify the process, but WMIC isn't installed on this machine. I added a fallback script that checks the process with `Get-CimInstance` before stopping it.

After stopping and restarting the Devnet, the height continued from 106 to 107, so the chain data was preserved. The [queries after restart](../evidence/week-01/resume-rpc.json) and [startup and shutdown output](../evidence/week-01/restart-check.json) are saved as well. Both the Devnet and local viewer were stopped after verification.

## Next steps

The environment and queries are working. I haven't sent a transaction yet. Next up is a transfer with change, following how the input Cell is consumed and how the recipient and change Cells are created.

One possible project idea is to store a file hash in a Cell, then read it back later to check whether the file has changed. I'll finish the basic exercises before settling on the implementation.

## References

- [How CKB Works](https://docs.nervos.org/docs/getting-started/how-ckb-works)
- [Quick Start](https://docs.nervos.org/docs/getting-started/quick-start)
- [CCC Introduction](https://docs.ckbccc.com/en/docs/getting-started/introduction)
- [OffCKB](https://docs.nervos.org/docs/sdk-and-devtool/offckb)
