# CKBuilder Notes

CKB learning notes, exercises, and development logs.

- [Week 3: Storing and replacing Cell data](weekly-reports/week-03.md)
- [Week 2: Transfer and change](weekly-reports/week-02.md)
- [Week 1: Cells and transaction capacity](weekly-reports/week-01.md)
- [Capacity calculation exercise](exercises/week-01/capacity.mjs)
- [Setup and running the exercises](exercises/week-01/README.md)
- [Devnet RPC results](evidence/week-01/devnet-rpc.json)
- [Screenshot](evidence/week-01/devnet-rpc.png)

So far, I've worked through the introductory material, completed the capacity calculation exercise, and started a local Devnet with working RPC queries. The first 100 CKB Devnet transfer is now confirmed, with its recipient, change, and fee checked. Week 3 verified a UTF-8 message stored on the local Devnet and replaced it in a second transaction.

The capacity exercise requires Node.js 20 or later. Run `node exercises/week-01/capacity.mjs` from the repository root. See the setup instructions above for installing, starting, and querying the Devnet.

Updates follow the work as it happens, including problems, fixes, test results, and screenshots.
