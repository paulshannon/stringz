// Renders the interactive fretboard into a container element.
//
// Two interaction modes, driven by `state.mode`:
//   'explore' — click a position to highlight every occurrence of that note.
//   'chord'   — click a position to select that string's note; the per-string
//               label toggles the string between sounding and muted.
import { noteName, pitchClass } from './notes.js';

// Frets that get position-marker inlays. 12 & 24 get a double marker.
const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAYS = new Set([12, 24]);

export function renderFretboard(container, state, { onCellClick, onLabelClick }) {
  const { strings, frets, showAll, useFlats, showOctave, leftHanded, highlights, mode, chord } = state;
  const isChord = mode === 'chord';

  container.innerHTML = '';
  container.classList.toggle('left-handed', leftHanded);
  container.classList.toggle('chord-mode', isChord);
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
    const selectedFret = isChord ? chord[s] : null; // null = muted
    const isMuted = isChord && selectedFret == null;

    container.appendChild(buildLabel(s, open, selectedFret, isMuted, isChord, state, onLabelClick));

    for (const f of fretNumbers) {
      const midi = open + f;
      const pc = pitchClass(midi);
      const isOpen = f === 0;

      const isHi = !isChord && highlights.has(pc);
      const isSelected = isChord && selectedFret === f;
      const showName = showAll || isOpen || isHi || isSelected;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell note-cell' +
        (f === 1 ? ' nut-edge' : '') +
        (isOpen ? ' open-cell' : '') +
        (isHi ? ' highlighted' : '') +
        (isSelected ? ' selected' : '') +
        (isMuted ? ' in-muted-row' : '');
      btn.dataset.string = String(s);
      btn.dataset.fret = String(f);
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-pressed', String(isSelected));
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

      btn.addEventListener('click', () => onCellClick(s, f));
      container.appendChild(btn);
    }
  }
}

function buildLabel(s, open, selectedFret, isMuted, isChord, state, onLabelClick) {
  const { useFlats, showOctave } = state;
  const text = isMuted
    ? '✕'
    : noteName(open + (isChord ? selectedFret : 0), { useFlats, withOctave: showOctave });
  const title = `String ${s + 1} (open ${noteName(open, { useFlats, withOctave: true })})`;

  if (!isChord) {
    const div = cell('label', text);
    div.title = title;
    return div;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'label label-btn' + (isMuted ? ' muted-string' : '');
  btn.textContent = text;
  btn.title = `${title} — click to ${isMuted ? 'unmute (play open)' : 'mute'}`;
  btn.setAttribute('aria-label', isMuted ? `String ${s + 1} muted` : `String ${s + 1} playing ${text}`);
  btn.addEventListener('click', () => onLabelClick(s));
  return btn;
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
