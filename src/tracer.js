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
 * @typedef {Object} ResumeEvent
 * Only recorded by the explicit-stack versions (see explicit.js).
 * The tree ignores it; the stack panel uses it to show why a frame paused.
 * @property {'resume'} type
 * @property {number} id          Id of the frame that continued.
 * @property {number} stage       The stage it continues at (its "return address").
 * @property {Object} locals      Its local variables at that point, e.g. { a: 2 }.
 *
 * @typedef {CallEvent | ReturnEvent | MemoHitEvent | ResumeEvent} TraceEvent
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

  // enter/exit are the low-level hooks: trace() uses them for real
  // recursion, and explicit.js calls them directly for its own frames.
  // Either way there is only one code path that records calls and returns.
  function enter(name, args) {
    const id = nextId++;
    // Copy the arguments so a later mutation by the function
    // can't rewrite history in the event log.
    record({ type: 'call', id, parent: topOfStack(), name, args: structuredClone(args) });
    active.push(id);
    return id;
  }

  function exit(id, value) {
    active.pop();
    record({ type: 'return', id, value });
  }

  function resume(id, stage, locals) {
    record({ type: 'resume', id, stage, locals: structuredClone(locals) });
  }

  function trace(fn, name, cache) {
    return function traced(...args) {
      const key = String(args);

      // Works like a memoize decorator: on a cache hit the original function
      // is never called, so this node is a leaf that never goes on the stack.
      if (cache && cache.has(key)) {
        const value = cache.get(key);
        record({ type: 'memo-hit', id: nextId++, parent: topOfStack(), name, args: structuredClone(args), value });
        return value;
      }

      const id = enter(name, args);
      let value;
      try {
        value = fn(...args);
      } catch (error) {
        // Not `finally`: on success exit() already pops, and popping twice
        // would remove the caller's frame too. Only a throw skips exit().
        active.pop();
        throw error;
      }
      exit(id, value);
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

  return { trace, enter, exit, resume, events, active, reset };
}
