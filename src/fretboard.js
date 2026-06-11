// Renders the interactive fretboard into a container element.
//
// Two interaction modes, driven by `state.mode`:
//   'explore' — click a position to highlight every occurrence of that note.
//   'chord'   — click a position to select that string's note; the per-string
//               label toggles the string between sounding and muted.
//
// A capo (`state.capo`, 0 = none) bars every string at that fret: it becomes
// the new playable "open" position, and frets behind it are disabled.
import { noteName, pitchClass } from './notes.js';

// Frets that get position-marker inlays. 12 & 24 get a double marker.
const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAYS = new Set([12, 24]);

export function renderFretboard(container, state, { onCellClick, onLabelClick }) {
  const { strings, frets, showAll, useFlats, showOctave, leftHanded, highlights, mode, chord } = state;
  const isChord = mode === 'chord';
  const capo = state.capo || 0;

  container.innerHTML = '';
  container.classList.toggle('left-handed', leftHanded);
  container.classList.toggle('chord-mode', isChord);
  container.style.setProperty('--fret-columns', String(frets + 1));

  const fretNumbers = Array.from({ length: frets + 1 }, (_, f) => f);

  // ---- Header row: fret numbers + inlay markers ----
  container.appendChild(cell('label header-cell', ''));
  for (const f of fretNumbers) {
    const head = cell('fret-head' + (f === 1 ? ' nut-edge' : '') + (f === capo && capo > 0 ? ' capo-head' : ''), '');
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

    container.appendChild(buildLabel(s, open, selectedFret, isMuted, isChord, capo, state, onLabelClick));

    for (const f of fretNumbers) {
      const midi = open + f;
      const pc = pitchClass(midi);
      const isOpenPos = f === capo;        // the playable "open" (capo fret, or nut when capo = 0)
      const behindCapo = capo > 0 && f < capo;
      const isCapoFret = capo > 0 && f === capo;

      const isHi = !isChord && !behindCapo && highlights.has(pc);
      const isSelected = isChord && selectedFret === f;
      const showName = !behindCapo && (showAll || isOpenPos || isHi || isSelected);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = behindCapo;
      btn.className = 'cell note-cell' +
        (f === 1 ? ' nut-edge' : '') +
        (f === 0 ? ' open-cell' : '') +
        (isCapoFret ? ' capo-cell' : '') +
        (behindCapo ? ' behind-capo' : '') +
        (isHi ? ' highlighted' : '') +
        (isSelected ? ' selected' : '') +
        (isMuted ? ' in-muted-row' : '');
      btn.dataset.string = String(s);
      btn.dataset.fret = String(f);
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.setAttribute('aria-label', behindCapo
        ? `String ${s + 1}, fret ${f}: behind capo (not playable)`
        : `String ${s + 1}, fret ${f}: ${noteName(midi, { useFlats, withOctave: true })}` +
          (isCapoFret ? ' (capo)' : ''));

      const inner = document.createElement('span');
      inner.className = 'cell-inner';
      const dot = document.createElement('span');
      dot.className = 'dot' + (isOpenPos ? ' open-dot' : '');
      dot.textContent = showName ? noteName(midi, { useFlats, withOctave: showOctave }) : '';
      if (!showName) dot.classList.add('empty');
      inner.appendChild(dot);
      btn.appendChild(inner);

      if (!behindCapo) btn.addEventListener('click', () => onCellClick(s, f));
      container.appendChild(btn);
    }
  }
}

function buildLabel(s, open, selectedFret, isMuted, isChord, capo, state, onLabelClick) {
  const { useFlats, showOctave } = state;
  // The sounding open note accounts for the capo (capo raises every open string).
  const openFret = isChord ? selectedFret : capo;
  const text = isMuted ? '✕' : noteName(open + openFret, { useFlats, withOctave: showOctave });
  const openLabel = noteName(open + capo, { useFlats, withOctave: true });
  const title = `String ${s + 1} (open ${openLabel}${capo > 0 ? `, capo ${capo}` : ''})`;

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
