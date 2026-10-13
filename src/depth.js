/**
 * Measurements for the "width vs depth" question. Pure functions, no DOM,
 * and no tracer: recording millions of events would be far too slow, so
 * these use plain recursion with counters instead.
 */

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
