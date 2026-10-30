# Week 2: Devnet transfer

Uses the Windows setup from [week 1](../week-01/README.md): OffCKB 0.4.13 and CKB 0.210.0. This run used Node.js v24.22.1.

Start the same local Devnet using the week-1 launcher. Before transferring, register your extracted CKB binary for OffCKB's system-script lookup:

```powershell
node exercises/week-02/prepare-binary.mjs $ckbBinary
node exercises/week-02/transfer.mjs $offckbCli
```

The transfer script only accepts `ckb_dev` with the genesis hash saved in week 1. It sends 100 CKB between the first two bundled development accounts, waits for confirmation, resolves the input capacity, and checks the recipient, change, fee, and Cell status. The bundled signing key is read into memory and never written into the evidence files.

`transfer-command.json` saves the submitted transaction hash. A retry after submission resumes verification of that transaction. Once `transfer.json` exists, the script refuses another run. To reproduce from a clean checkout, restore the matching local chain data or intentionally initialize a separate test run; don't delete the saved hash just to retry a pending transaction.

Evidence is in [evidence/week-02](../../evidence/week-02). Parent-transaction RPC entries save an explicitly marked output-only excerpt, omitting bulky binary data. Other RPC entries include the requests and responses.

To view the saved reconciliation alongside a fresh transaction-status query:

```sh
node exercises/week-02/view-transfer.mjs
```

Open `http://127.0.0.1:18915/`. Stop the viewer with Ctrl+C, then stop the Devnet using the [Windows fallback script](../week-01/stop-devnet.ps1).
