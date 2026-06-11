// Renders the interactive fretboard into a container element.
import { noteName, pitchClass } from './notes.js';

// Frets that get position-marker inlays. 12 & 24 get a double marker.
const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAYS = new Set([12, 24]);

export function renderFretboard(container, state, { onToggle }) {
  const { strings, frets, showAll, useFlats, showOctave, leftHanded, highlights } = state;

  container.innerHTML = '';
  container.classList.toggle('left-handed', leftHanded);
  container.style.setProperty('--fret-columns', String(frets + 1));

  const fretNumbers = Array.from({ length: frets + 1 }, (_, f) => f);

  // ---- Header row: fret numbers + inlay markers ----
  container.appendChild(cell('label header-cell', ''));
  for (const f of fretNumbers) {
    const head = cell('fret-head' + (f === 1 ? ' nut-edge' : ''), '');
    const num = document.createElement('span');
    num.className = 'fret-num';
    num.textContent = f === 0 ? '' : f;
    head.appendChild(num);
    if (SINGLE_INLAYS.has(f)) head.appendChild(inlay());
    if (DOUBLE_INLAYS.has(f)) {
      head.appendChild(inlay('inlay-double'));
      head.appendChild(inlay('inlay-double'));
    }
    container.appendChild(head);
  }

  // ---- String rows: highest string on top → iterate high to low ----
  for (let s = strings.length - 1; s >= 0; s--) {
    const open = strings[s];

    const label = cell('label', '');
    label.textContent = noteName(open, { useFlats, withOctave: showOctave });
    label.title = `String ${s + 1} (open)`;
    container.appendChild(label);

    for (const f of fretNumbers) {
      const midi = open + f;
      const pc = pitchClass(midi);
      const isHi = highlights.has(pc);
      const isOpen = f === 0;
      const showName = showAll || isHi || isOpen;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell note-cell' +
        (f === 1 ? ' nut-edge' : '') +
        (isOpen ? ' open-cell' : '') +
        (isHi ? ' highlighted' : '');
      btn.dataset.string = String(s);
      btn.dataset.fret = String(f);
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label',
        `String ${s + 1}, fret ${f}: ${noteName(midi, { useFlats, withOctave: true })}`);

      const inner = document.createElement('span');
      inner.className = 'cell-inner';
      const dot = document.createElement('span');
      dot.className = 'dot' + (isOpen ? ' open-dot' : '');
      dot.textContent = showName ? noteName(midi, { useFlats, withOctave: showOctave }) : '';
      if (!showName) dot.classList.add('empty');
      inner.appendChild(dot);
      btn.appendChild(inner);

      btn.addEventListener('click', () => onToggle(pc));
      container.appendChild(btn);
    }
  }
}

function cell(className, text) {
  const el = document.createElement('div');
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

function inlay(extra = '') {
  const d = document.createElement('span');
  d.className = 'inlay ' + extra;
  return d;
}
