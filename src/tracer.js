/**
 * The tracer records a recursive execution as a flat list of events.
 * Everything else in the app (replay, layout, rendering) only reads this list.
 *
 * @typedef {Object} CallEvent
 * @property {'call'} type
 * @property {number} id          Unique id of this call (one node in the call tree).
 * @property {number|null} parent Id of the caller, or null for the root call.
 * @property {string} name        Function name shown in the UI, e.g. 'fib'.
 * @property {Array} args         Copy of the arguments at call time.
 *
 * @typedef {Object} ReturnEvent
 * @property {'return'} type
 * @property {number} id          Id of the call that just finished.
 * @property {*} value            The value it returned.
 *
 * @typedef {Object} MemoHitEvent
 * @property {'memo-hit'} type
 * @property {number} id
 * @property {number|null} parent
 * @property {string} name
 * @property {Array} args
 * @property {*} value            The cached value that was returned.
 *
 * @typedef {CallEvent | ReturnEvent | MemoHitEvent} TraceEvent
 */

// Big enough for every example at its max input, small enough that the
// page can't freeze on an accidental exponential blow-up.
export const MAX_EVENTS = 3000;

export function createTracer() {
  const events = [];
  // Mirror of the real JavaScript call stack: ids of calls that have
  // started but not yet returned. Its top is the parent of the next call.
  const active = [];
  let nextId = 0;

  function record(event) {
    if (events.length >= MAX_EVENTS) {
      throw new Error(`Trace limit reached (${MAX_EVENTS} events). Try a smaller input.`);
    }
    events.push(event);
  }

  function topOfStack() {
    if (active.length === 0) {
      return null;
    }
    return active[active.length - 1];
  }

  function trace(fn, name, cache) {
    return function traced(...args) {
      // Copy the arguments so a later mutation by the function
      // can't rewrite history in the event log.
      const argsCopy = structuredClone(args);
      const key = String(args);

      // Works like a memoize decorator: on a cache hit the original function
      // is never called, so this node is a leaf that never goes on the stack.
      if (cache && cache.has(key)) {
        const value = cache.get(key);
        record({ type: 'memo-hit', id: nextId++, parent: topOfStack(), name, args: argsCopy, value });
        return value;
      }

      const id = nextId++;
      record({ type: 'call', id, parent: topOfStack(), name, args: argsCopy });
      active.push(id);
      let value;
      try {
        value = fn(...args);
      } finally {
        // finally runs even if fn throws, so `active` never keeps a dead frame.
        active.pop();
      }
      record({ type: 'return', id, value });
      if (cache) {
        cache.set(key, value);
      }
      return value;
    };
  }

  function reset() {
    events.length = 0;
    active.length = 0;
    nextId = 0;
  }

  return { trace, events, active, reset };
}
