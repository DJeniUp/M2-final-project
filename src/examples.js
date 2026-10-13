/**
 * The recursive functions the demo can visualize.
 *
 * Every example uses the same pattern:
 *
 *   let fib = function (n) { ... fib(n - 1) ... };
 *   fib = tracer.trace(fib, 'fib');
 *
 * Why this works: the inner call `fib(n - 1)` looks up the variable `fib`
 * when it runs, not when the function is defined. By then we have
 * reassigned `fib` to the traced wrapper, so every recursive call goes
 * through the wrapper and gets recorded, not only the first one.
 *
 * Why it breaks otherwise:
 *   - with `const fib`, the reassignment is a TypeError;
 *   - with `const tracedFib = tracer.trace(fib, 'fib')`, the outer call
 *     is recorded but the inner calls still use the plain `fib`, so the
 *     tree would only ever show the root.
 *
 * The run functions are declared at the top level (not inline in the
 * objects) so that run.toString() gives nicely indented source for display.
 * Explicit-stack examples set `source` to show the stack machine instead
 * of their one-line run function.
 */
import { sumExplicit, fibExplicit } from './explicit.js';

function runSum(tracer, n) {
  let sum = function (n) {
    if (n === 0) {
      return 0;
    }
    return n + sum(n - 1);
  };
  sum = tracer.trace(sum, 'sum');
  return sum(n);
}

function runFib(tracer, n) {
  let fib = function (n) {
    if (n < 2) {
      return n;
    }
    return fib(n - 1) + fib(n - 2);
  };
  fib = tracer.trace(fib, 'fib');
  return fib(n);
}

function runFibMemo(tracer, n) {
  let fib = function (n) {
    if (n < 2) {
      return n;
    }
    return fib(n - 1) + fib(n - 2);
  };
  const cache = new Map();
  fib = tracer.trace(fib, 'fib', cache);
  return fib(n);
}

function runPermutations(tracer, n) {
  // Returns how many complete permutations were found below this call.
  let permute = function (chosen, remaining) {
    if (remaining.length === 0) {
      return 1;
    }
    let count = 0;
    for (const item of remaining) {
      const rest = remaining.filter((x) => x !== item);
      count += permute([...chosen, item], rest);
    }
    return count;
  };
  permute = tracer.trace(permute, 'permute');

  const items = [];
  for (let i = 1; i <= n; i++) {
    items.push(i);
  }
  return permute([], items);
}

function runSumExplicit(tracer, n) {
  return sumExplicit(n, tracer);
}

function runFibExplicit(tracer, n) {
  return fibExplicit(n, tracer);
}

export const examples = [
  {
    id: 'sum',
    title: 'sum(n)',
    description: 'Linear recursion: each call makes exactly one recursive call, so the tree is a single line and the stack grows to n + 1 frames.',
    defaultInput: 5,
    maxInput: 15,
    run: runSum,
  },
  {
    id: 'sum-explicit',
    title: 'sum(n), explicit stack',
    description: 'The same sum without recursion: frames live in an ordinary array. Each frame remembers its stage, which plays the role of the return address.',
    defaultInput: 5,
    maxInput: 15,
    run: runSumExplicit,
    source: sumExplicit,
    stageLabels: ['start', 'waiting for sum(n-1)'],
  },
  {
    id: 'fib',
    title: 'fib(n) naive',
    description: 'Two recursive calls per step: the tree grows exponentially and the same subtrees are computed again and again.',
    defaultInput: 6,
    maxInput: 10,
    run: runFib,
  },
  {
    id: 'fib-memo',
    title: 'fib(n) memoized',
    description: 'The same function with a cache. Repeated calls are answered from the cache (dashed nodes) and never go on the stack.',
    defaultInput: 6,
    maxInput: 10,
    run: runFibMemo,
  },
  {
    id: 'fib-explicit',
    title: 'fib(n), explicit stack',
    description: 'The same fib without recursion. The frame saves fib(n-1) in a local a while it waits for fib(n-2), just like a real stack frame.',
    defaultInput: 6,
    maxInput: 10,
    run: runFibExplicit,
    source: fibExplicit,
    stageLabels: ['start', 'waiting for fib(n-1)', 'waiting for fib(n-2)'],
  },
  {
    id: 'permutations',
    title: 'permutations of [1..n]',
    description: 'Backtracking: each call picks one remaining item, recurses, then returns to try the next choice.',
    defaultInput: 3,
    maxInput: 4,
    run: runPermutations,
  },
];
