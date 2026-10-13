import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracer } from '../src/tracer.js';
import { examples } from '../src/examples.js';
import { sumExplicit, fibExplicit } from '../src/explicit.js';

// Trace the recursive version exactly as the demo shows it.
function recursiveEvents(exampleId, n) {
  const example = examples.find((candidate) => candidate.id === exampleId);
  const tracer = createTracer();
  example.run(tracer, n);
  return tracer.events;
}

// 'resume' only exists in the explicit version; everything else must match.
function explicitEvents(explicitFn, n) {
  const tracer = createTracer();
  explicitFn(n, tracer);
  return tracer.events.filter((event) => event.type !== 'resume');
}

test('sumExplicit records the same calls and returns as recursive sum', () => {
  for (let n = 0; n <= 20; n++) {
    assert.deepEqual(explicitEvents(sumExplicit, n), recursiveEvents('sum', n), `n = ${n}`);
  }
});

test('fibExplicit records the same calls and returns as recursive fib', () => {
  for (let n = 0; n <= 10; n++) {
    assert.deepEqual(explicitEvents(fibExplicit, n), recursiveEvents('fib', n), `n = ${n}`);
  }
});

test('fibExplicit records stages and the saved local a', () => {
  const tracer = createTracer();
  assert.equal(fibExplicit(2, tracer), 1);
  const resumes = tracer.events.filter((event) => event.type === 'resume');
  assert.deepEqual(resumes, [
    { type: 'resume', id: 0, stage: 1, locals: {} },
    { type: 'resume', id: 0, stage: 2, locals: { a: 1 } },
  ]);
});

test('sumExplicit(100000) without a tracer does not overflow', () => {
  assert.equal(sumExplicit(100000), 5000050000);
});
