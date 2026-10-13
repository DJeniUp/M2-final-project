// Drawing only: shows the call stack as an HTML list.
import { formatCall } from './renderTree.js';

/**
 * state.stack stores the root first (like an array we push onto),
 * but people expect to see the top of the stack at the top, so we
 * render it in reverse.
 */
export function renderStack(listElement, state, stageLabels) {
  listElement.replaceChildren();

  if (state.stack.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = '(empty)';
    listElement.append(empty);
    return;
  }

  for (let i = state.stack.length - 1; i >= 0; i--) {
    const node = state.nodes.get(state.stack[i]);
    const frame = document.createElement('li');
    frame.className = 'frame';
    if (i === state.stack.length - 1) {
      frame.classList.add('top');
    }
    frame.textContent = formatFrame(node, stageLabels);
    listElement.append(frame);
  }
}

// e.g. "fib(4) · waiting for fib(n-2) · a = 2". Frames without a recorded
// stage (all recursive examples) just show the call.
function formatFrame(node, stageLabels) {
  const parts = [formatCall(node)];
  if (node.stage !== undefined && stageLabels) {
    parts.push(stageLabels[node.stage]);
  }
  if (node.locals) {
    for (const [name, value] of Object.entries(node.locals)) {
      parts.push(`${name} = ${JSON.stringify(value)}`);
    }
  }
  return parts.join(' · ');
}
