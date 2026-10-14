import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countFibCalls, recursiveSum, probeStackLimit, createCounter, depthCards } from '../src/depth.js';
import { sumExplicit } from '../src/explicit.js';

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

test('counter on fib(10) counts 177 calls with max depth 10', () => {
  const fibCard = depthCards.find((card) => card.id === 'fib');
  assert.deepEqual(fibCard.measure(10), { calls: 177, maxDepth: 10, result: 55 });
});

test('counter keeps depth correct and reports the crash for sum(100000)', () => {
  const counter = createCounter();
  let sum = function (n) {
    return n === 0 ? 0 : n + sum(n - 1);
  };
  sum = counter.wrap(sum);
  assert.throws(() => sum(100000), RangeError);
  assert.equal(counter.stats().depth, 0);

  const outcome = depthCards.find((card) => card.id === 'sum').measure(100000);
  assert.match(outcome.error, /^RangeError/);
  assert.ok(outcome.maxDepth > 0 && outcome.maxDepth < 100001);
});

test('sumExplicit(100000) fills in stats: 100001 calls, max depth 100001', () => {
  const stats = { calls: 0, maxDepth: 0 };
  assert.equal(sumExplicit(100000, null, stats), 5000050000);
  assert.deepEqual(stats, { calls: 100001, maxDepth: 100001 });
});
