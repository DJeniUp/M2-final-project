// Wiring: connects the controls to the pure modules and the renderers.
// Data flow: examples -> tracer -> events -> replay -> layout -> render.
import { examples } from './examples.js';
import { createTracer } from './tracer.js';
import { stateAt } from './replay.js';
import { layout } from './layout.js';
import { renderTree } from './renderTree.js';
import { renderStack } from './renderStack.js';

const ui = {
  exampleSelect: document.getElementById('example'),
  input: document.getElementById('input'),
  runButton: document.getElementById('run'),
  description: document.getElementById('description'),
  error: document.getElementById('error'),
  resetButton: document.getElementById('reset'),
  backButton: document.getElementById('back'),
  playButton: document.getElementById('play'),
  forwardButton: document.getElementById('forward'),
  speed: document.getElementById('speed'),
  scrubber: document.getElementById('scrubber'),
  stats: document.getElementById('stats'),
  comparison: document.getElementById('comparison'),
  tree: document.getElementById('tree'),
  stack: document.getElementById('stack'),
  source: document.getElementById('source'),
};

// Everything about the current run. Layout is computed once per run
// from the complete tree, so nodes never move while stepping.
let events = [];
let fullNodes = new Map();
let positions = new Map();
let step = 0;
let timer = null;

function selectedExample() {
  return examples.find((example) => example.id === ui.exampleSelect.value);
}

function clampInput(example) {
  let n = Math.round(Number(ui.input.value));
  if (Number.isNaN(n) || n < 0) {
    n = 0;
  }
  if (n > example.maxInput) {
    n = example.maxInput;
  }
  ui.input.value = n;
  return n;
}

function runExample() {
  pause();
  const example = selectedExample();
  const n = clampInput(example);
  const tracer = createTracer();
  ui.error.textContent = '';

  try {
    example.run(tracer, n);
  } catch (error) {
    // Keep the partial log: it still shows what happened up to the error.
    ui.error.textContent = error.message;
  }

  events = tracer.events;
  fullNodes = stateAt(events, events.length).nodes;
  positions = events.length > 0 ? layout(fullNodes, events[0].id) : new Map();

  ui.description.textContent = example.description;
  const shownCode = example.source || example.run;
  ui.source.textContent = shownCode.toString();
  ui.scrubber.max = events.length;
  renderComparison(example, n);
  showStep(0);
}

function showStep(k) {
  step = Math.max(0, Math.min(k, events.length));
  const state = stateAt(events, step);
  renderTree(ui.tree, fullNodes, positions, state);
  renderStack(ui.stack, state, selectedExample().stageLabels);
  renderStats(state);
  ui.scrubber.value = step;
}

function countEvents(eventList) {
  let calls = 0;
  let memoHits = 0;
  for (const event of eventList) {
    if (event.type === 'call') {
      calls += 1;
    } else if (event.type === 'memo-hit') {
      memoHits += 1;
    }
  }
  return { calls, memoHits };
}

function renderStats(state) {
  const { calls, memoHits } = countEvents(events);

  let maxDepth = 0;
  for (const node of state.nodes.values()) {
    maxDepth = Math.max(maxDepth, node.depth + 1);
  }

  const memoText = memoHits > 0 ? ` (+${memoHits} memo hits)` : '';
  ui.stats.textContent =
    `step ${step} / ${events.length} · total calls: ${calls}${memoText}` +
    ` · current depth: ${state.stack.length} · max depth so far: ${maxDepth}`;
}

// Counts every invocation of fib: real calls plus calls answered from the cache.
function countCalls(exampleId, n) {
  const example = examples.find((candidate) => candidate.id === exampleId);
  const tracer = createTracer();
  example.run(tracer, n);
  return countEvents(tracer.events);
}

function renderComparison(example, n) {
  const isFib = example.id === 'fib' || example.id === 'fib-memo';
  ui.comparison.hidden = !isFib;
  if (!isFib) {
    return;
  }
  const naive = countCalls('fib', n);
  const memo = countCalls('fib-memo', n);
  ui.comparison.textContent =
    `fib(${n}): naive makes ${naive.calls} calls · memoized makes ` +
    `${memo.calls + memo.memoHits} calls (${memo.memoHits} answered from the cache)`;
}

function stepForward() {
  if (step >= events.length) {
    pause();
    return;
  }
  showStep(step + 1);
}

function stepBack() {
  pause();
  showStep(step - 1);
}

function play() {
  if (step >= events.length) {
    showStep(0);
  }
  const stepsPerSecond = Number(ui.speed.value);
  timer = setInterval(stepForward, 1000 / stepsPerSecond);
  ui.playButton.textContent = '⏸ Pause';
}

function pause() {
  clearInterval(timer);
  timer = null;
  ui.playButton.textContent = '▶ Play';
}

function togglePlay() {
  if (timer === null) {
    play();
  } else {
    pause();
  }
}

function onExampleChange() {
  const example = selectedExample();
  ui.input.value = example.defaultInput;
  ui.input.max = example.maxInput;
  runExample();
}

function onSpeedChange() {
  // Restart the timer so the new interval takes effect immediately.
  if (timer !== null) {
    pause();
    play();
  }
}

function onKeyDown(event) {
  // Inputs, sliders and the selector need the arrow keys themselves.
  if (event.target.matches('input, select')) {
    return;
  }
  if (event.key === 'ArrowRight') {
    pause();
    stepForward();
  } else if (event.key === 'ArrowLeft') {
    stepBack();
  } else if (event.key === ' ') {
    // Stops the page from scrolling and a focused button from being clicked.
    event.preventDefault();
    togglePlay();
  }
}

function setup() {
  for (const example of examples) {
    const option = document.createElement('option');
    option.value = example.id;
    option.textContent = example.title;
    ui.exampleSelect.append(option);
  }

  ui.exampleSelect.addEventListener('change', onExampleChange);
  ui.runButton.addEventListener('click', runExample);
  ui.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      runExample();
    }
  });
  ui.resetButton.addEventListener('click', () => {
    pause();
    showStep(0);
  });
  ui.backButton.addEventListener('click', stepBack);
  ui.forwardButton.addEventListener('click', () => {
    pause();
    stepForward();
  });
  ui.playButton.addEventListener('click', togglePlay);
  ui.speed.addEventListener('input', onSpeedChange);
  ui.scrubber.addEventListener('input', () => {
    pause();
    showStep(Number(ui.scrubber.value));
  });
  document.addEventListener('keydown', onKeyDown);

  onExampleChange();
}

setup();
