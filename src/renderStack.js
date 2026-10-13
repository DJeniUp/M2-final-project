// Drawing only: shows the call stack as an HTML list.
import { formatCall } from './renderTree.js';

/**
 * state.stack stores the root first (like an array we push onto),
 * but people expect to see the top of the stack at the top, so we
 * render it in reverse.
 */
export function renderStack(listElement, state) {
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
    frame.textContent = formatCall(node);
    listElement.append(frame);
  }
}
