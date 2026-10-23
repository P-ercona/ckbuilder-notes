import assert from 'node:assert/strict';
// Offline learning fixture. Does not sign or broadcast a CKB transaction.
const CKB = 100_000_000n;
export function fee(inputs, outputs) {
  if ([...inputs,...outputs].some(x=>typeof x !== 'bigint'||x<0n)) throw new Error('Nonnegative bigint required');
  const delta=inputs.reduce((a,b)=>a+b,0n)-outputs.reduce((a,b)=>a+b,0n);
  if(delta<0n) throw new Error('Outputs exceed inputs');
  return delta;
}
assert.equal(fee([200n*CKB],[100n*CKB,99_999_00000n]),100_000n);
assert.throws(()=>fee([CKB],[2n*CKB]),/exceed/);
assert.throws(()=>fee([-CKB],[0n]),/Nonnegative/);
assert.equal(fee([100n*CKB,100n*CKB],[199n*CKB]),CKB);
console.log('PASS 4 checks: change/fee, overspend, negative input, multiple inputs');
console.log('Example: 200 CKB input = 100 CKB recipient + 99.999 CKB change + 0.001 CKB fee');
console.log('Offline arithmetic only; no chain validation or transfer performed.');

