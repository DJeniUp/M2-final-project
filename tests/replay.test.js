import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracer } from '../src/tracer.js';
import { stateAt } from '../src/replay.js';
import { fibExplicit } from '../src/explicit.js';

function traceFib(n) {
  const tracer = createTracer();
  let fib = function (n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
  };
  fib = tracer.trace(fib, 'fib');
  fib(n);
  return tracer.events;
}

// Walk parent links from the current node up to the root.
function pathFromRoot(nodes, id) {
  const path = [];
  while (id !== null) {
    path.unshift(id);
    id = nodes.get(id).parent;
  }
  return path;
}

test('for fib(3), the stack equals the root-to-current path at every step', () => {
  const events = traceFib(3);
  for (let k = 0; k <= events.length; k++) {
    const { nodes, stack, current } = stateAt(events, k);
    assert.deepEqual(stack, pathFromRoot(nodes, current), `step ${k}`);
  }
});

test('final state: every node is done and the stack is empty', () => {
  const events = traceFib(3);
  const { nodes, stack, current } = stateAt(events, events.length);
  assert.equal(stack.length, 0);
  assert.equal(current, null);
  assert.equal(nodes.size, 5);
  for (const node of nodes.values()) {
    assert.equal(node.status, 'done');
  }
  assert.equal(nodes.get(0).value, 2);
});

test('last is the node touched by the previous event', () => {
  const events = traceFib(3);
  assert.equal(stateAt(events, 0).last, null);
  for (let k = 1; k <= events.length; k++) {
    assert.equal(stateAt(events, k).last, events[k - 1].id);
  }
});

test('resume events set stage and locals on the node', () => {
  const tracer = createTracer();
  fibExplicit(2, tracer);
  // Events: call 0, resume 0 stage 1, call 1, return 1, resume 0 stage 2 {a: 1}, ...
  const { nodes } = stateAt(tracer.events, 5);
  assert.equal(nodes.get(0).stage, 2);
  assert.deepEqual(nodes.get(0).locals, { a: 1 });
  assert.equal(nodes.get(1).stage, undefined);
});
