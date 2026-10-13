import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countFibCalls, recursiveSum, probeStackLimit } from '../src/depth.js';

test('countFibCalls(10) makes 177 calls with max depth 10', () => {
  assert.deepEqual(countFibCalls(10), { result: 55, calls: 177, maxDepth: 10 });
});

test('recursiveSum(100000) overflows the call stack', () => {
  assert.throws(() => recursiveSum(100000), RangeError);
});

test('recursiveSum works when the depth is small', () => {
  assert.equal(recursiveSum(100), 5050);
});

test('probeStackLimit returns a positive number', () => {
  const limit = probeStackLimit();
  assert.ok(limit > 0, `got ${limit}`);
});
