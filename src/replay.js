/**
 * Rebuilds what the program looked like after the first k events.
 *
 * Trade-off: we replay from event 0 every time instead of updating the
 * previous state. That is O(k) per step, but event logs are at most a few
 * thousand entries, and a pure function of (events, k) is much easier to
 * reason about: stepping backwards needs no "undo" logic at all.
 *
 * Returns:
 *   nodes   Map<id, { id, parent, name, args, depth, status, value, children }>
 *           status is 'active' (on the stack), 'done' (returned) or 'memo'.
 *   stack   ids of frames on the call stack, root first.
 *   current top of the stack (the running call), or null.
 *   last    id of the node touched by event k-1, or null when k is 0.
 */
export function stateAt(events, k) {
  const nodes = new Map();
  const stack = [];
  let last = null;

  for (let i = 0; i < k; i++) {
    const event = events[i];
    if (event.type === 'call') {
      addNode(nodes, event, 'active');
      stack.push(event.id);
    } else if (event.type === 'memo-hit') {
      addNode(nodes, event, 'memo');
    } else if (event.type === 'return') {
      const node = nodes.get(event.id);
      node.status = 'done';
      node.value = event.value;
      stack.pop();
    }
    last = event.id;
  }

  const current = stack.length > 0 ? stack[stack.length - 1] : null;
  return { nodes, stack, current, last };
}

function addNode(nodes, event, status) {
  const parentNode = event.parent === null ? null : nodes.get(event.parent);
  const node = {
    id: event.id,
    parent: event.parent,
    name: event.name,
    args: event.args,
    depth: parentNode ? parentNode.depth + 1 : 0,
    status,
    // A memo hit already knows its value; a fresh call learns it on return.
    value: status === 'memo' ? event.value : undefined,
    children: [],
  };
  nodes.set(node.id, node);
  if (parentNode) {
    parentNode.children.push(node.id);
  }
}
