import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracer, MAX_EVENTS } from '../src/tracer.js';

test('factorial(3) records calls and returns in order with correct parents', () => {
  const tracer = createTracer();
  let factorial = function (n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
  };
  factorial = tracer.trace(factorial, 'factorial');

  assert.equal(factorial(3), 6);
  assert.deepEqual(tracer.events, [
    { type: 'call', id: 0, parent: null, name: 'factorial', args: [3] },
    { type: 'call', id: 1, parent: 0, name: 'factorial', args: [2] },
    { type: 'call', id: 2, parent: 1, name: 'factorial', args: [1] },
    { type: 'return', id: 2, value: 1 },
    { type: 'return', id: 1, value: 2 },
    { type: 'return', id: 0, value: 6 },
  ]);
});

test('active stack is empty after a call that throws', () => {
  const tracer = createTracer();
  let countdown = function (n) {
    if (n === 0) {
      throw new Error('boom');
    }
    return countdown(n - 1);
  };
  countdown = tracer.trace(countdown, 'countdown');

  assert.throws(() => countdown(3), /boom/);
  assert.equal(tracer.active.length, 0);
});

test('cache hits become memo-hit events and are not called again', () => {
  const tracer = createTracer();
  let fib = function (n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
  };
  fib = tracer.trace(fib, 'fib', new Map());

  assert.equal(fib(4), 3);
  const hits = tracer.events.filter((e) => e.type === 'memo-hit');
  assert.deepEqual(hits.map((e) => e.args[0]), [1, 2]);
});

test('throws a clear error after MAX_EVENTS', () => {
  const tracer = createTracer();
  let forever = function (n) {
    return forever(n + 1);
  };
  forever = tracer.trace(forever, 'forever');

  assert.throws(() => forever(0), /Trace limit reached/);
  assert.equal(tracer.events.length, MAX_EVENTS);
  assert.equal(tracer.active.length, 0);
});

test('resume events are recorded and count towards MAX_EVENTS', () => {
  const tracer = createTracer();
  const id = tracer.enter('fib', [2]);
  tracer.resume(id, 1, { a: 1 });
  tracer.exit(id, 1);
  assert.deepEqual(tracer.events[1], { type: 'resume', id: 0, stage: 1, locals: { a: 1 } });
  assert.equal(tracer.active.length, 0);

  assert.throws(() => {
    while (true) {
      tracer.resume(id, 1, {});
    }
  }, /Trace limit reached/);
  assert.equal(tracer.events.length, MAX_EVENTS);
});
