import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracer } from '../src/tracer.js';
import { stateAt } from '../src/replay.js';
import { layout } from '../src/layout.js';

function fullFibTree(n) {
  const tracer = createTracer();
  let fib = function (n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
  };
  fib = tracer.trace(fib, 'fib');
  fib(n);
  return stateAt(tracer.events, tracer.events.length).nodes;
}

test("a parent's x is the midpoint of its first and last child", () => {
  const nodes = fullFibTree(4);
  const positions = layout(nodes, 0);
  for (const node of nodes.values()) {
    if (node.children.length === 0) {
      continue;
    }
    const firstX = positions.get(node.children[0]).x;
    const lastX = positions.get(node.children[node.children.length - 1]).x;
    assert.equal(positions.get(node.id).x, (firstX + lastX) / 2);
  }
});

test('leaves have distinct x and y equals depth', () => {
  const nodes = fullFibTree(4);
  const positions = layout(nodes, 0);
  const leafXs = [];
  for (const node of nodes.values()) {
    assert.equal(positions.get(node.id).y, node.depth);
    if (node.children.length === 0) {
      leafXs.push(positions.get(node.id).x);
    }
  }
  assert.equal(new Set(leafXs).size, leafXs.length);
});
