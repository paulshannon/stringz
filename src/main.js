// Stringz — interactive fretboard. Entry point: state, controls, persistence.
import { SHARP_NAMES, FLAT_NAMES, midiOf, pitchClass, octaveOf, noteName } from './notes.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';
import { renderFretboard } from './fretboard.js';

const STORAGE_KEY = 'stringz.state.v1';
const THEME_KEY = 'stringz.theme';
const MIN_OCTAVE = 0;
const MAX_OCTAVE = 8;

const state = {
  strings: [...PRESETS[DEFAULT_PRESET]],
  frets: 15,
  showAll: true,
  useFlats: false,
  showOctave: false,
  leftHanded: false,
  highlights: new Set(),
};

const els = {
  preset: document.getElementById('preset'),
  frets: document.getElementById('frets'),
  fretCount: document.getElementById('fret-count'),
  showAll: document.getElementById('show-all'),
  useFlats: document.getElementById('use-flats'),
  showOctave: document.getElementById('show-octave'),
  leftHanded: document.getElementById('left-handed'),
  stringList: document.getElementById('string-list'),
  stringCount: document.getElementById('string-count'),
  addString: document.getElementById('add-string'),
  removeString: document.getElementById('remove-string'),
  reset: document.getElementById('reset'),
  fretboard: document.getElementById('fretboard'),
  clearHighlights: document.getElementById('clear-highlights'),
  selectionInfo: document.getElementById('selection-info'),
  themeToggle: document.getElementById('theme-toggle'),
};

// ---------- persistence ----------
function save() {
  const data = {
    strings: state.strings,
    frets: state.frets,
    showAll: state.showAll,
    useFlats: state.useFlats,
    showOctave: state.showOctave,
    leftHanded: state.leftHanded,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.strings) && data.strings.length) state.strings = data.strings;
    if (Number.isFinite(data.frets)) state.frets = clampFrets(data.frets);
    state.showAll = !!data.showAll;
    state.useFlats = !!data.useFlats;
    state.showOctave = !!data.showOctave;
    state.leftHanded = !!data.leftHanded;
  } catch { /* ignore corrupt state */ }
}

const clampFrets = (n) => Math.min(24, Math.max(5, Math.round(n)));

// ---------- preset detection ----------
function matchingPresetName() {
  for (const [name, tuning] of Object.entries(PRESETS)) {
    if (tuning.length === state.strings.length &&
        tuning.every((m, i) => m === state.strings[i])) {
      return name;
    }
  }
  return null;
}

// ---------- rendering ----------
function render() {
  // sync simple controls to state
  els.frets.value = String(state.frets);
  els.fretCount.textContent = String(state.frets);
  els.showAll.checked = state.showAll;
  els.useFlats.checked = state.useFlats;
  els.showOctave.checked = state.showOctave;
  els.leftHanded.checked = state.leftHanded;
  els.preset.value = matchingPresetName() ?? '__custom__';
  els.stringCount.textContent = `(${state.strings.length})`;
  els.removeString.disabled = state.strings.length <= 1;

  renderStringList();
  renderFretboard(els.fretboard, state, { onToggle: toggleHighlight });
  renderSelectionInfo();
  save();
}

function renderStringList() {
  els.stringList.innerHTML = '';
  const names = state.useFlats ? FLAT_NAMES : SHARP_NAMES;

  // top = highest-pitched string, to match the board orientation
  for (let i = state.strings.length - 1; i >= 0; i--) {
    const midi = state.strings[i];
    const li = document.createElement('li');
    li.className = 'string-row';

    const noteSel = document.createElement('select');
    noteSel.className = 'note-select';
    noteSel.setAttribute('aria-label', `String ${i + 1} note`);
    names.forEach((nm, pc) => {
      const opt = new Option(nm, String(pc));
      if (pc === pitchClass(midi)) opt.selected = true;
      noteSel.add(opt);
    });
    noteSel.addEventListener('change', () => {
      state.strings[i] = midiOf(Number(noteSel.value), octaveOf(state.strings[i]));
      render();
    });

    const octSel = document.createElement('select');
    octSel.className = 'octave-select';
    octSel.setAttribute('aria-label', `String ${i + 1} octave`);
    for (let o = MIN_OCTAVE; o <= MAX_OCTAVE; o++) {
      const opt = new Option(String(o), String(o));
      if (o === octaveOf(midi)) opt.selected = true;
      octSel.add(opt);
    }
    octSel.addEventListener('change', () => {
      state.strings[i] = midiOf(pitchClass(state.strings[i]), Number(octSel.value));
      render();
    });

    const idx = document.createElement('span');
    idx.className = 'string-idx muted';
    idx.textContent = noteName(midi, { useFlats: state.useFlats, withOctave: true });

    li.append(noteSel, octSel, idx);
    els.stringList.appendChild(li);
  }
}

function renderSelectionInfo() {
  if (!state.highlights.size) {
    els.selectionInfo.textContent = '';
    els.clearHighlights.disabled = true;
    return;
  }
  const names = [...state.highlights]
    .sort((a, b) => a - b)
    .map((pc) => (state.useFlats ? FLAT_NAMES : SHARP_NAMES)[pc]);
  els.selectionInfo.textContent = `Highlighting: ${names.join(', ')}`;
  els.clearHighlights.disabled = false;
}

// ---------- actions ----------
function toggleHighlight(pc) {
  if (state.highlights.has(pc)) state.highlights.delete(pc);
  else state.highlights.add(pc);
  render();
}

function addString() {
  // add a string a perfect fourth (5 semitones) above the current highest
  const highest = Math.max(...state.strings);
  state.strings.push(highest + 5);
  render();
}

function removeString() {
  if (state.strings.length <= 1) return;
  // remove the highest-pitched string (the one shown at the top)
  const hiIndex = state.strings.indexOf(Math.max(...state.strings));
  state.strings.splice(hiIndex, 1);
  render();
}

function applyPreset(name) {
  if (name === '__custom__' || !PRESETS[name]) return;
  state.strings = [...PRESETS[name]];
  render();
}

// ---------- theme ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

// ---------- init ----------
function populatePresets() {
  for (const name of Object.keys(PRESETS)) els.preset.add(new Option(name, name));
  els.preset.add(new Option('Custom', '__custom__'));
}

function bindControls() {
  els.preset.addEventListener('change', () => applyPreset(els.preset.value));
  els.frets.addEventListener('input', () => { state.frets = clampFrets(Number(els.frets.value)); render(); });
  els.showAll.addEventListener('change', () => { state.showAll = els.showAll.checked; render(); });
  els.useFlats.addEventListener('change', () => { state.useFlats = els.useFlats.checked; render(); });
  els.showOctave.addEventListener('change', () => { state.showOctave = els.showOctave.checked; render(); });
  els.leftHanded.addEventListener('change', () => { state.leftHanded = els.leftHanded.checked; render(); });
  els.addString.addEventListener('click', addString);
  els.removeString.addEventListener('click', removeString);
  els.clearHighlights.addEventListener('click', () => { state.highlights.clear(); render(); });
  els.reset.addEventListener('click', () => {
    state.strings = [...PRESETS[DEFAULT_PRESET]];
    state.frets = 15;
    state.highlights.clear();
    render();
  });
  els.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

function init() {
  const savedTheme = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
  applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  populatePresets();
  load();
  bindControls();
  render();
}

init();
