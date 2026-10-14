// Drawing only: the code cards for the question at the top of the page.

function formatNumber(value) {
  return value.toLocaleString('en-US');
}

/** Builds one card and returns the elements main.js needs to wire up. */
export function buildCard(card) {
  const element = document.createElement('section');
  element.className = 'panel card';

  const title = document.createElement('h2');
  title.textContent = card.title;

  const source = document.createElement('pre');
  source.textContent = card.run.toString();

  const label = document.createElement('label');
  label.textContent = 'n ';
  const input = document.createElement('input');
  input.type = 'number';
  input.min = 0;
  input.max = card.maxInput;
  input.value = card.defaultInput;
  label.append(input);

  const button = document.createElement('button');
  button.textContent = 'Run';

  const output = document.createElement('dl');
  output.className = 'card-output';

  element.append(title, source, label, button, output);
  return { element, input, button, output };
}

function addRow(list, term, value, className) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  dd.className = className;
  list.append(dt, dd);
}

// For a crash, calls and max depth show how far it got before the engine
// stopped it, and the error message takes the place of the result.
export function showOutcome(output, outcome) {
  output.replaceChildren();
  addRow(output, 'calls', formatNumber(outcome.calls), '');
  addRow(output, 'max depth', formatNumber(outcome.maxDepth), '');
  if (outcome.error) {
    addRow(output, 'error', outcome.error, 'crashed');
  } else {
    addRow(output, 'result', formatNumber(outcome.result), '');
  }
}
