# Recursion: the call tree and the call stack

An interactive demo that shows one recursive execution in two synchronized views:
a **call tree** that grows branch by branch, and the **call stack** with frames
being pushed and popped.

**Live demo:** https://djeniup.github.io/M2-final-project/

## The core insight

Every recursive call is a node in the call tree, and every running call is a
frame on the call stack. At any moment, **the call stack is exactly the path from
the root of the tree to the call that is running right now**. The demo highlights
that path in the tree, so you can watch it match the stack step by step.

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

`parent` is the id of the caller (the top of the stack at call time), or `null`
for the first call.

## Data flow

```
examples → tracer → events → replay → layout → render
```

## Modules

- **`src/tracer.js`**: wraps a function so every call records `call` / `return`
  events. An internal `active` array mirrors the real call stack. An optional cache
  turns repeated calls into `memo-hit` events. Stops after 3000 events.
- **`src/replay.js`**: `stateAt(events, k)` replays the first `k` events and returns
  the tree nodes, the stack, the current call (top of the stack) and the last
  node touched.
- **`src/layout.js`**: `layout(nodes, rootId)` gives every node an x/y position:
  leaves left to right, each parent centered over its children, y = depth.
- **`src/renderTree.js`**: draws the call tree as SVG and highlights the
  root-to-current path.
- **`src/renderStack.js`**: draws the call stack as a list, top frame first.
- **`src/examples.js`**: factorial, naive fib, memoized fib and permutations.
- **`src/main.js`**: connects the controls, the player, the stats and the
  naive-vs-memoized comparison.
- **`tests/`**: tests for the tracer, replay and layout.
