# Week 3 exercise: Store data on a Cell

Start the same local Devnet as in [Week 1](../week-01/README.md). If needed, [register the CKB binary](../week-02/README.md) before running this exercise. The script uses the CCC package installed alongside OffCKB 0.4.13 (CCC Core 1.14.0).

From the repository root, with `$offckbCli` pointing to the installed CLI entry point:

```powershell
node exercises/week-03/store-data.mjs $offckbCli .local/week-03-run
node exercises/week-03/view-cell.mjs .local/week-03-run/cell-data.json
```

Open `http://127.0.0.1:18916/` to see a fresh live-cell query for both outpoints. Stop the viewer with Ctrl+C and then [stop the Devnet](../week-01/README.md).

The script checks the local chain name and genesis hash before signing with a bundled development account. It records submitted hashes in the run directory, so a retry with the same directory resumes verification instead of sending the same exercise again. Use a new run directory if deliberately repeating the exercise on a freshly initialized copy of the matching Devnet.
