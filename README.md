# Recursion: width costs time, depth costs stack

> fib(30) makes about 2.7 million calls and runs fine. sum(100000) makes only
> 100,000 calls and crashes with "Maximum call stack size exceeded". Why?

**Live demo:** https://djeniup.github.io/M2-final-project/

## The answer

Every call is a node in the **call tree**, but the **call stack** only ever holds
the path from the root of that tree to the call that is running right now. So the
stack's memory depends on the tree's **depth**, not its size. fib(30) has millions
of nodes but is only 30 deep. sum(100000) is a single line 100,001 calls deep, far
more than the few thousand frames a JavaScript engine allows.

Width costs time, depth costs stack. Each has its own fix:

- **Too wide:** memoization. Repeated calls are answered from a cache.
- **Too deep:** an explicit stack. Keep the frames in an ordinary array on the heap,
  which can hold millions of entries, instead of on the call stack.

The demo shows one execution as a tree and a stack side by side, highlighting the
root-to-current path so you can watch it match the stack step by step. The
"Width vs depth" panel runs the three cases from the question in your browser.

## Running locally

ES modules don't load from `file://`, so serve the folder:

```sh
python3 -m http.server
```

Then open http://localhost:8000. No build step, no dependencies.

Run the tests (Node 18+, uses the built-in `node:test`):

```sh
node --test
```

With no arguments, Node finds every `*.test.js` file itself. (`node --test tests/`
does not work on Node 22, because Node treats the folder as a file to run.)

## Controls

- **Width vs depth → Run the experiment** fills the table. It only runs on click,
  because it deliberately overflows the stack and takes a moment.
- Choose an example and `n`, then press **Run** (or Enter).
- **Back / Forward** step one event; **Play** steps automatically at the chosen speed.
- The long slider jumps to any step. **Reset** goes back to step 0.
- Keyboard: `←` / `→` step, `Space` plays/pauses.

## Event format

The tracer records an execution as a flat list of events:

| Event | Fields | Meaning |
|-------|--------|---------|
| `call` | `id, parent, name, args` | A call started and was pushed onto the stack. |
| `return` | `id, value` | That call finished and was popped. |
| `memo-hit` | `id, parent, name, args, value` | A call answered from the cache. It is a leaf and never goes on the stack. |
| `resume` | `id, stage, locals` | An explicit-stack frame continued at a new stage with these local variables. |

`parent` is the id of the caller (the top of the stack at call time), or `null`
for the first call.

`resume` only comes from the explicit-stack examples. A real stack frame holds the
arguments, the local variables and the return address (where to continue when a
child call returns). In `explicit.js` the `stage` number plays the role of that
return address. A `resume` event records a frame moving to a new stage, e.g.
`fib(4)` going from "waiting for fib(n-1)" to "waiting for fib(n-2)" with `a = 2`
saved. The tree ignores these events; the stack panel shows the stage and locals.

## Data flow

```
examples ─┬─ recursive functions ─┐
          └─ explicit.js ─────────┴→ tracer → events → replay → layout → render

depth.js → width-vs-depth panel   (no tracer: millions of calls)
```

## Modules

- **`src/tracer.js`**: records events. `enter` / `exit` record a call and its
  return and keep an `active` array that mirrors the call stack. `resume` records a
  stage change. `trace(fn, name, cache?)` wraps a recursive function using
  `enter` / `exit`, and turns cache hits into `memo-hit` events. Stops after 3000
  events.
- **`src/explicit.js`**: `sumExplicit` and `fibExplicit` with no recursion. A
  `frames` array holds `{ id, n, stage, a }` and `ret` holds the latest child's
  return value. With a tracer, they record the same calls and returns as the
  recursive versions, plus `resume` events. Without one, they handle n = 100000
  easily.
- **`src/depth.js`**: plain functions for the panel: `countFibCalls(n)` (calls and
  max depth), `recursiveSum(n)` (the function that crashes) and
  `probeStackLimit()` (roughly how many nested calls this engine allows).
- **`src/replay.js`**: `stateAt(events, k)` replays the first `k` events and returns
  the tree nodes (with stage and locals for explicit frames), the stack, the current
  call and the last node touched.
- **`src/layout.js`**: `layout(nodes, rootId)` gives every node an x/y position:
  leaves left to right, each parent centered over its children, y = depth.
- **`src/renderTree.js`**: draws the call tree as SVG and highlights the
  root-to-current path.
- **`src/renderStack.js`**: draws the call stack as a list, top frame first, with
  stage and locals for explicit frames.
- **`src/examples.js`**: sum, naive fib, memoized fib, permutations, and the
  explicit-stack sum and fib.
- **`src/main.js`**: connects the controls, the player, the stats, the
  naive-vs-memoized comparison and the width-vs-depth panel.
- **`tests/`**: tests for the tracer, replay, layout, the explicit-stack versions
  (their event logs must match the recursive ones exactly) and depth.js.
