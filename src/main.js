// Stringz — interactive fretboard. Entry point: state, controls, persistence.
import { SHARP_NAMES, FLAT_NAMES, midiOf, pitchClass, octaveOf, noteName } from './notes.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';
import { renderFretboard } from './fretboard.js';
import { identifyChord } from './chords.js';

const STORAGE_KEY = 'stringz.state.v1';
const THEME_KEY = 'stringz.theme';
const COLLAPSE_KEY = 'stringz.configCollapsed';
const MIN_OCTAVE = 0;
const MAX_OCTAVE = 8;

const state = {
  strings: [...PRESETS[DEFAULT_PRESET]],
  frets: 15,
  capo: 0, // 0 = no capo; otherwise the barred fret (new "open")
  showAll: true,
  useFlats: false,
  showOctave: false,
  leftHanded: false,
  highlights: new Set(),
  mode: 'explore', // 'explore' | 'chord'
  chord: [], // per-string selected fret; null = muted. Length tracks strings.
};

const els = {
  preset: document.getElementById('preset'),
  frets: document.getElementById('frets'),
  fretCount: document.getElementById('fret-count'),
  capo: document.getElementById('capo'),
  capoCount: document.getElementById('capo-count'),
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
  modeExplore: document.getElementById('mode-explore'),
  modeChord: document.getElementById('mode-chord'),
  exploreBar: document.getElementById('explore-bar'),
  chordBar: document.getElementById('chord-bar'),
  clearHighlights: document.getElementById('clear-highlights'),
  selectionInfo: document.getElementById('selection-info'),
  chordName: document.getElementById('chord-name'),
  chordQuality: document.getElementById('chord-quality'),
  muteAll: document.getElementById('mute-all'),
  chordDetails: document.getElementById('chord-details'),
  chordNotes: document.getElementById('chord-notes'),
  chordShape: document.getElementById('chord-shape'),
  boardHint: document.getElementById('board-hint'),
  themeToggle: document.getElementById('theme-toggle'),
  configPanel: document.getElementById('config-panel'),
  configToggle: document.getElementById('config-toggle'),
};

const HINTS = {
  explore: 'Click any position to highlight every occurrence of that note across the neck. Click a fret number to set a capo.',
  chord: 'Pick a fret on each string. Click a string’s label (✕ / note) to mute or unmute it. Click a fret number to set a capo.',
};

// ---------- persistence ----------
function save() {
  const data = {
    strings: state.strings,
    frets: state.frets,
    capo: state.capo,
    showAll: state.showAll,
    useFlats: state.useFlats,
    showOctave: state.showOctave,
    leftHanded: state.leftHanded,
    mode: state.mode,
    chord: state.chord,
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
    if (Number.isFinite(data.capo)) state.capo = clampCapo(data.capo, state.frets);
    state.showAll = !!data.showAll;
    state.useFlats = !!data.useFlats;
    state.showOctave = !!data.showOctave;
    state.leftHanded = !!data.leftHanded;
    if (data.mode === 'chord' || data.mode === 'explore') state.mode = data.mode;
    if (Array.isArray(data.chord)) state.chord = data.chord;
  } catch { /* ignore corrupt state */ }
}

const clampFrets = (n) => Math.min(24, Math.max(5, Math.round(n)));
// A capo can sit anywhere from 0 (off) up to one fret short of the neck end,
// leaving at least one fretted position available.
const clampCapo = (n, frets) => Math.min(Math.max(0, Math.round(n)), Math.max(0, frets - 1));

// Keep the chord selection array consistent with the strings, neck, and capo.
function ensureChordLength() {
  const n = state.strings.length;
  if (state.chord.length > n) state.chord.length = n;
  while (state.chord.length < n) state.chord.push(null);
  state.capo = clampCapo(state.capo, state.frets);
  // Selections must stay within the playable range [capo, frets]; a capo
  // raises any open/behind-the-capo selection up to the barred fret.
  state.chord = state.chord.map((f) =>
    (f == null ? null : Math.min(Math.max(f, state.capo), state.frets)));
}

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
  ensureChordLength();

  // sync simple controls to state
  els.frets.value = String(state.frets);
  els.fretCount.textContent = String(state.frets);
  els.capo.max = String(Math.max(1, state.frets - 1));
  els.capo.value = String(state.capo);
  els.capoCount.textContent = state.capo === 0 ? 'Off' : `Fret ${state.capo}`;
  els.showAll.checked = state.showAll;
  els.useFlats.checked = state.useFlats;
  els.showOctave.checked = state.showOctave;
  els.leftHanded.checked = state.leftHanded;
  els.preset.value = matchingPresetName() ?? '__custom__';
  els.stringCount.textContent = `(${state.strings.length})`;
  els.removeString.disabled = state.strings.length <= 1;

  // mode UI
  const isChord = state.mode === 'chord';
  els.modeExplore.setAttribute('aria-pressed', String(!isChord));
  els.modeChord.setAttribute('aria-pressed', String(isChord));
  els.exploreBar.hidden = isChord;
  els.chordBar.hidden = !isChord;
  els.chordDetails.hidden = !isChord;
  els.boardHint.textContent = isChord ? HINTS.chord : HINTS.explore;

  renderStringList();
  renderFretboard(els.fretboard, state, { onCellClick, onLabelClick, onSetCapo });
  if (isChord) renderChordReadout();
  else renderSelectionInfo();
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

function renderChordReadout() {
  // sounding notes, low string → high string
  const midis = state.strings.map((open, s) => (state.chord[s] == null ? null : open + state.chord[s]));
  const result = identifyChord(midis, { useFlats: state.useFlats });

  // shape string, low → high: 'x' for muted, otherwise (absolute) fret number
  const shape = state.chord.map((f) => (f == null ? 'x' : String(f))).join(' ');
  els.chordShape.textContent = state.capo > 0 ? `${shape}  (capo ${state.capo})` : shape;

  const anySounding = state.chord.some((f) => f != null);
  els.muteAll.disabled = !anySounding;

  if (!result) {
    els.chordName.textContent = '—';
    els.chordQuality.textContent = 'All strings muted';
    els.chordNotes.textContent = '—';
    return;
  }
  els.chordName.textContent = result.symbol;
  els.chordQuality.textContent = result.quality;
  els.chordNotes.textContent = result.notes.join(' ');
}

// ---------- actions ----------
function onCellClick(s, f) {
  if (state.mode === 'chord') {
    // clicking the already-selected fret mutes the string
    state.chord[s] = state.chord[s] === f ? null : f;
  } else {
    const pc = pitchClass(state.strings[s] + f);
    if (state.highlights.has(pc)) state.highlights.delete(pc);
    else state.highlights.add(pc);
  }
  render();
}

function onLabelClick(s) {
  if (state.mode !== 'chord') return;
  // toggle muted <-> open
  state.chord[s] = state.chord[s] == null ? 0 : null;
  render();
}

// Clicking a fret number sets the capo there; clicking the current capo fret
// (or fret 0) removes it.
function onSetCapo(f) {
  applyCapo(f === state.capo ? 0 : f);
}

// Move the capo, transposing the whole fingered shape with it: every selection
// keeps its offset relative to the capo (a barred-open string stays open, a note
// fretted two above the capo stays two above it), clamped to the playable range.
function applyCapo(next) {
  next = clampCapo(next, state.frets);
  const delta = next - state.capo;
  if (delta !== 0) {
    state.chord = state.chord.map((f) =>
      (f == null ? null : Math.min(Math.max(f + delta, next), state.frets)));
  }
  state.capo = next;
  render();
}

function setMode(mode) {
  state.mode = mode;
  render();
}

function addString() {
  const highest = Math.max(...state.strings);
  state.strings.push(highest + 5);
  state.chord.push(null);
  render();
}

function removeString() {
  if (state.strings.length <= 1) return;
  const hiIndex = state.strings.indexOf(Math.max(...state.strings));
  state.strings.splice(hiIndex, 1);
  state.chord.splice(hiIndex, 1);
  render();
}

function applyPreset(name) {
  if (name === '__custom__' || !PRESETS[name]) return;
  state.strings = [...PRESETS[name]];
  state.chord = state.strings.map(() => null);
  render();
}

// ---------- theme ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

// ---------- collapse config ----------
// Kept out of the main render path: toggling shouldn't rebuild the fretboard.
function applyConfigCollapsed(collapsed) {
  els.configPanel.classList.toggle('collapsed', collapsed);
  els.configToggle.setAttribute('aria-expanded', String(!collapsed));
  try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
}

// ---------- init ----------
function populatePresets() {
  for (const name of Object.keys(PRESETS)) els.preset.add(new Option(name, name));
  els.preset.add(new Option('Custom', '__custom__'));
}

function bindControls() {
  els.preset.addEventListener('change', () => applyPreset(els.preset.value));
  els.frets.addEventListener('input', () => { state.frets = clampFrets(Number(els.frets.value)); render(); });
  els.capo.addEventListener('input', () => applyCapo(Number(els.capo.value)));
  els.showAll.addEventListener('change', () => { state.showAll = els.showAll.checked; render(); });
  els.useFlats.addEventListener('change', () => { state.useFlats = els.useFlats.checked; render(); });
  els.showOctave.addEventListener('change', () => { state.showOctave = els.showOctave.checked; render(); });
  els.leftHanded.addEventListener('change', () => { state.leftHanded = els.leftHanded.checked; render(); });
  els.addString.addEventListener('click', addString);
  els.removeString.addEventListener('click', removeString);
  els.modeExplore.addEventListener('click', () => setMode('explore'));
  els.modeChord.addEventListener('click', () => setMode('chord'));
  els.clearHighlights.addEventListener('click', () => { state.highlights.clear(); render(); });
  els.muteAll.addEventListener('click', () => { state.chord = state.strings.map(() => null); render(); });
  els.reset.addEventListener('click', () => {
    state.strings = [...PRESETS[DEFAULT_PRESET]];
    state.frets = 15;
    state.capo = 0;
    state.highlights.clear();
    state.chord = state.strings.map(() => null);
    render();
  });
  els.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
  els.configToggle.addEventListener('click', () => {
    applyConfigCollapsed(!els.configPanel.classList.contains('collapsed'));
  });
}

function init() {
  const savedTheme = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
  applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const savedCollapsed = (() => { try { return localStorage.getItem(COLLAPSE_KEY); } catch { return null; } })();
  applyConfigCollapsed(savedCollapsed === '1');
  populatePresets();
  load();
  bindControls();
  render();
}

init();
