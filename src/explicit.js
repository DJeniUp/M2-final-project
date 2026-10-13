/**
 * sum and fib without recursion: we manage the call stack ourselves.
 *
 * This is what the machine does for a real call. A frame holds the
 * arguments, the local variables and where to continue when a child call
 * returns. Here `stage` plays the role of that return address, and `ret`
 * plays the role of the register that carries a child's return value.
 *
 * The difference: `frames` is an ordinary array on the heap, which can hold
 * millions of entries, while the real call stack only fits a few thousand.
 *
 * With a tracer, every push, pop and stage change is recorded with the
 * same ids and order as the recursive versions in examples.js.
 * With tracer = null nothing is recorded, so huge n is fine.
 */

function createMachine(name, tracer) {
  // frames and ret are read as m.frames / m.ret. Never destructure them:
  // finish() reassigns m.ret, and a destructured copy would never update.
  const m = { frames: [], ret: undefined };

  m.push = function (n) {
    const id = tracer ? tracer.enter(name, [n]) : null;
    m.frames.push({ id, n, stage: 0, a: undefined });
  };

  m.top = function () {
    return m.frames[m.frames.length - 1];
  };

  // Called before pushing a child, so the frame shows what it waits for.
  m.moveTo = function (frame, stage, locals) {
    frame.stage = stage;
    if (tracer) {
      tracer.resume(frame.id, stage, locals);
    }
  };

  m.finish = function (value) {
    const frame = m.frames.pop();
    if (tracer) {
      tracer.exit(frame.id, value);
    }
    m.ret = value;
  };

  return m;
}

// sum(n) = n === 0 ? 0 : n + sum(n - 1)
export function sumExplicit(n, tracer = null) {
  const m = createMachine('sum', tracer);
  m.push(n);
  while (m.frames.length > 0) {
    const frame = m.top();
    if (frame.stage === 0) {
      if (frame.n === 0) {
        m.finish(0);
      } else {
        m.moveTo(frame, 1, {});
        m.push(frame.n - 1);
      }
    } else {
      // stage 1: the child sum(n - 1) has returned into m.ret.
      m.finish(frame.n + m.ret);
    }
  }
  return m.ret;
}

// fib(n) = n < 2 ? n : fib(n - 1) + fib(n - 2)
export function fibExplicit(n, tracer = null) {
  const m = createMachine('fib', tracer);
  m.push(n);
  while (m.frames.length > 0) {
    const frame = m.top();
    if (frame.stage === 0) {
      if (frame.n < 2) {
        m.finish(frame.n);
      } else {
        m.moveTo(frame, 1, {});
        m.push(frame.n - 1);
      }
    } else if (frame.stage === 1) {
      // fib(n - 1) has returned. Save it in a local before the next
      // child overwrites m.ret, exactly like a real local variable.
      frame.a = m.ret;
      m.moveTo(frame, 2, { a: frame.a });
      m.push(frame.n - 2);
    } else {
      // stage 2: fib(n - 2) has returned too.
      m.finish(frame.a + m.ret);
    }
  }
  return m.ret;
}
