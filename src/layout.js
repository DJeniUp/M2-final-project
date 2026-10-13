/**
 * Assigns each tree node a position in abstract "grid units":
 * x counts leaves from left to right, y is the depth.
 * The renderer scales these units to pixels.
 *
 * Call this once on the complete tree (after all events) so nodes keep
 * the same position while the user steps; unvisited nodes are just hidden.
 *
 * Returns Map<id, { x, y }>.
 */
export function layout(nodes, rootId) {
  const positions = new Map();
  let nextLeafX = 0;

  // This layout is itself recursive: a post-order traversal places all
  // children before their parent, so the parent can center itself over them.
  function place(id) {
    const node = nodes.get(id);
    if (node.children.length === 0) {
      positions.set(id, { x: nextLeafX, y: node.depth });
      nextLeafX += 1;
      return;
    }
    for (const childId of node.children) {
      place(childId);
    }
    const firstX = positions.get(node.children[0]).x;
    const lastX = positions.get(node.children[node.children.length - 1]).x;
    positions.set(id, { x: (firstX + lastX) / 2, y: node.depth });
  }

  place(rootId);
  return positions;
}
