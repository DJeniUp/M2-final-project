/**
 * Measurements for the "width vs depth" question. Pure functions, no DOM,
 * and no tracer: recording millions of events would be far too slow, so
 * these use plain recursion with counters instead.
 */
import { sumExplicit } from './explicit.js';

// Counts every call and the deepest the stack ever gets.
// depth goes up on entry and down on exit, so at any moment it equals the
// number of fib frames on the stack.
export function countFibCalls(n) {
  let calls = 0;
  let depth = 0;
  let maxDepth = 0;

  function fib(n) {
    calls += 1;
    depth += 1;
    maxDepth = Math.max(maxDepth, depth);
    let result;
    if (n < 2) {
      result = n;
    } else {
      result = fib(n - 1) + fib(n - 2);
    }
    depth -= 1;
    return result;
  }

  const result = fib(n);
  return { result, calls, maxDepth };
}

// The function from the question. Needs n + 1 frames at once, so for
// large n it throws RangeError: Maximum call stack size exceeded.
export function recursiveSum(n) {
  if (n === 0) {
    return 0;
  }
  return n + recursiveSum(n - 1);
}

// Recurse until the engine refuses, and report how deep we got.
// Only approximate: a function with more arguments or locals has bigger
// frames, so fewer of them fit than of this tiny one.
export function probeStackLimit() {
  let depth = 0;

  function dive() {
    depth += 1;
    dive();
  }

  try {
    dive();
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
  }
  return depth;
}

/**
 * Counts calls and depth for a plain recursive function, without the
 * tracer. Same pattern as the tracer: `let f = ...; f = counter.wrap(f);`
 * so the source shown in the cards contains no counting code.
 *
 * Note: the wrapper is itself a function, so every counted call uses two
 * JS frames (wrapper + original). A counted function therefore hits the
 * engine's stack limit at roughly half the depth it would reach without
 * counting. That doesn't change the lesson: depth is what crashes.
 */
export function createCounter() {
  let calls = 0;
  let depth = 0;
  let maxDepth = 0;

  function wrap(fn) {
    return function counted(...args) {
      // The counting sits inside `try`, and uses `if` instead of Math.max,
      // on purpose: near the stack limit even a call to Math.max can throw
      // RangeError. Outside the try, depth would go up and never come down.
      try {
        calls += 1;
        depth += 1;
        if (depth > maxDepth) {
          maxDepth = depth;
        }
        return fn(...args);
      } finally {
        // Runs on return and on a RangeError, so depth stays correct.
        depth -= 1;
      }
    };
  }

  function stats() {
    return { calls, depth, maxDepth };
  }

  return { wrap, stats };
}

// The functions shown in the cards. They are declared at the top level so
// run.toString() gives clean, nicely indented source.

function runFib(counter, n) {
  let fib = function (n) {
    if (n < 2) {
      return n;
    }
    return fib(n - 1) + fib(n - 2);
  };
  fib = counter.wrap(fib);
  return fib(n);
}

function runSum(counter, n) {
  let sum = function (n) {
    if (n === 0) {
      return 0;
    }
    return n + sum(n - 1);
  };
  sum = counter.wrap(sum);
  return sum(n);
}

// Returns { calls, maxDepth, result } or { calls, maxDepth, error }.
// calls and maxDepth are always real measurements: for a crash they show
// how far the function got before the engine stopped it.
function measureRecursive(run, n) {
  const counter = createCounter();
  const outcome = {};
  try {
    outcome.result = run(counter, n);
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    outcome.error = `${error.name}: ${error.message}`;
  }
  const { calls, maxDepth } = counter.stats();
  return { calls, maxDepth, ...outcome };
}

function measureExplicit(n) {
  const stats = { calls: 0, maxDepth: 0 };
  const result = sumExplicit(n, null, stats);
  return { calls: stats.calls, maxDepth: stats.maxDepth, result };
}

export const depthCards = [
  {
    id: 'fib',
    title: 'fib',
    run: runFib,
    defaultInput: 30,
    maxInput: 32,
    measure: (n) => measureRecursive(runFib, n),
  },
  {
    id: 'sum',
    title: 'sum',
    run: runSum,
    defaultInput: 100000,
    maxInput: 1000000,
    measure: (n) => measureRecursive(runSum, n),
  },
  {
    id: 'sum-explicit',
    title: 'The fix: explicit stack',
    run: sumExplicit,
    defaultInput: 100000,
    maxInput: 1000000,
    measure: measureExplicit,
    isFix: true,
  },
];
