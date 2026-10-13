// Drawing only: turns replay state + layout positions into SVG.
// The whole tree is redrawn on every step; it has at most a few hundred
// nodes, so this is fast enough and avoids keeping DOM and state in sync.

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHAR_WIDTH = 7.5; // approximate width of one monospace character at 12px
const NODE_HEIGHT = 36;
const LEVEL_GAP = 70;
const PADDING = 20;

/** Label used by both the tree and the stack, e.g. "fib(3)". */
export function formatCall(node) {
  const args = node.args.map((arg) => JSON.stringify(arg));
  return `${node.name}(${args.join(', ')})`;
}

function svgElement(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}

function nodeWidth(node) {
  return formatCall(node).length * CHAR_WIDTH + 16;
}

/**
 * fullNodes: nodes of the complete run (used for layout and sizing).
 * positions: output of layout(), in grid units.
 * state: output of stateAt() for the current step.
 */
export function renderTree(svg, fullNodes, positions, state) {
  svg.replaceChildren();

  // One grid unit must fit the widest label, so neighbours never overlap.
  let widest = 0;
  for (const node of fullNodes.values()) {
    widest = Math.max(widest, nodeWidth(node));
  }
  const unitX = widest + 12;

  function toPixels(id) {
    const position = positions.get(id);
    return { x: position.x * unitX, y: position.y * LEVEL_GAP };
  }

  const origin = fitViewBox(svg, fullNodes, toPixels, widest);

  // The stack is exactly the root-to-current path, so the edge into
  // every stack frame (except the root) is part of the highlighted path.
  const onStack = new Set(state.stack);

  const edgeLayer = svgElement('g', { class: 'edges' });
  const nodeLayer = svgElement('g', { class: 'nodes' });
  svg.append(edgeLayer, nodeLayer);

  for (const node of state.nodes.values()) {
    if (node.parent !== null) {
      edgeLayer.append(drawEdge(toPixels(node.parent), toPixels(node.id), onStack.has(node.id)));
    }
    nodeLayer.append(drawNode(node, toPixels(node.id), state));
  }

  scrollToFocus(svg.parentElement, state, toPixels, origin);
}

// Big trees are wider than the panel. Keep the node that matters right
// now (the running call, or the one that just changed) in the middle.
function scrollToFocus(container, state, toPixels, origin) {
  const focus = state.current !== null ? state.current : state.last;
  if (focus === null) {
    container.scrollLeft = 0;
    container.scrollTop = 0;
    return;
  }
  // At 1:1 scale, a point's offset inside the SVG is just its distance
  // from the viewBox's top-left corner.
  const point = toPixels(focus);
  container.scrollLeft = point.x - origin.left - container.clientWidth / 2;
  container.scrollTop = point.y - origin.top - container.clientHeight / 2;
}

function fitViewBox(svg, fullNodes, toPixels, widest) {
  let maxX = 0;
  let maxY = 0;
  for (const id of fullNodes.keys()) {
    const point = toPixels(id);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const left = -widest / 2 - PADDING;
  const top = -NODE_HEIGHT / 2 - PADDING;
  const width = maxX + widest + 2 * PADDING;
  const height = maxY + NODE_HEIGHT + 2 * PADDING;
  svg.setAttribute('viewBox', `${left} ${top} ${width} ${height}`);
  // Draw at 1:1 scale instead of shrinking to fit: text stays readable
  // and wide trees scroll inside their panel.
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  return { left, top };
}

function drawEdge(from, to, onPath) {
  return svgElement('line', {
    x1: from.x,
    y1: from.y + NODE_HEIGHT / 2,
    x2: to.x,
    y2: to.y - NODE_HEIGHT / 2,
    class: onPath ? 'edge on-path' : 'edge',
  });
}

function drawNode(node, point, state) {
  const classes = ['node', node.status];
  if (node.id === state.current) {
    classes.push('current');
  }
  if (node.id === state.last) {
    classes.push('last');
  }

  const group = svgElement('g', {
    class: classes.join(' '),
    transform: `translate(${point.x}, ${point.y})`,
  });
  const width = nodeWidth(node);
  group.append(svgElement('rect', {
    x: -width / 2,
    y: -NODE_HEIGHT / 2,
    width,
    height: NODE_HEIGHT,
    rx: 6,
  }));

  const hasValue = node.value !== undefined;
  const label = svgElement('text', { y: hasValue ? -3 : 4 });
  label.textContent = formatCall(node);
  group.append(label);

  if (hasValue) {
    const value = svgElement('text', { y: 12, class: 'value' });
    value.textContent = `= ${JSON.stringify(node.value)}`;
    group.append(value);
  }
  return group;
}
