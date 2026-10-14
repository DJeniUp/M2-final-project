import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCounter, depthCards } from '../src/depth.js';
import { sumExplicit } from '../src/explicit.js';

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
