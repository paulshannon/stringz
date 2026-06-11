// Chord identification.
//
// Given a set of sounding notes (MIDI numbers), find the best-fit chord name.
// Notes are matched by reducing the played pitch classes to interval sets
// relative to each candidate root and looking them up in a chord table.
import { SHARP_NAMES, FLAT_NAMES, pitchClass } from './notes.js';

// Each definition: `sym` is the suffix appended to the root name, `q` is a
// human-readable quality, `ivals` are semitone intervals above the root.
const CHORD_DEFS = [
  { sym: '5', q: 'power chord', ivals: [0, 7] },
  { sym: '', q: 'major', ivals: [0, 4, 7] },
  { sym: 'm', q: 'minor', ivals: [0, 3, 7] },
  { sym: 'dim', q: 'diminished', ivals: [0, 3, 6] },
  { sym: 'aug', q: 'augmented', ivals: [0, 4, 8] },
  { sym: 'sus2', q: 'suspended 2nd', ivals: [0, 2, 7] },
  { sym: 'sus4', q: 'suspended 4th', ivals: [0, 5, 7] },
  { sym: '6', q: 'major 6th', ivals: [0, 4, 7, 9] },
  { sym: 'm6', q: 'minor 6th', ivals: [0, 3, 7, 9] },
  { sym: '7', q: 'dominant 7th', ivals: [0, 4, 7, 10] },
  { sym: 'maj7', q: 'major 7th', ivals: [0, 4, 7, 11] },
  { sym: 'm7', q: 'minor 7th', ivals: [0, 3, 7, 10] },
  { sym: 'mMaj7', q: 'minor-major 7th', ivals: [0, 3, 7, 11] },
  { sym: 'dim7', q: 'diminished 7th', ivals: [0, 3, 6, 9] },
  { sym: 'm7b5', q: 'half-diminished 7th', ivals: [0, 3, 6, 10] },
  { sym: '7#5', q: 'augmented 7th', ivals: [0, 4, 8, 10] },
  { sym: '7sus4', q: 'dominant 7th sus4', ivals: [0, 5, 7, 10] },
  { sym: 'add9', q: 'added 9th', ivals: [0, 2, 4, 7] },
  { sym: '6/9', q: '6 add 9', ivals: [0, 2, 4, 7, 9] },
  { sym: '9', q: 'dominant 9th', ivals: [0, 2, 4, 7, 10] },
  { sym: 'maj9', q: 'major 9th', ivals: [0, 2, 4, 7, 11] },
  { sym: 'm9', q: 'minor 9th', ivals: [0, 2, 3, 7, 10] },
  // common voicings with the 5th omitted (frequent on guitar)
  { sym: '7', q: 'dominant 7th (no 5th)', ivals: [0, 4, 10] },
  { sym: 'maj7', q: 'major 7th (no 5th)', ivals: [0, 4, 11] },
  { sym: 'm7', q: 'minor 7th (no 5th)', ivals: [0, 3, 10] },
];

const keyOf = (ivals) => [...ivals].sort((a, b) => a - b).join(',');
const TABLE = new Map(CHORD_DEFS.map((d) => [keyOf(d.ivals), d]));

/**
 * Identify a chord from a list of sounding MIDI notes.
 * Returns null if nothing is sounding, otherwise an object describing the chord.
 */
export function identifyChord(midis, { useFlats = false } = {}) {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  const sounding = midis.filter((m) => m != null);
  if (!sounding.length) return null;

  const ordered = [...sounding].sort((a, b) => a - b);
  const bassPc = pitchClass(ordered[0]);
  const pcs = [...new Set(ordered.map(pitchClass))].sort((a, b) => a - b);
  const noteNames = ordered.map((m) => names[pitchClass(m)]);

  if (pcs.length === 1) {
    return { symbol: names[pcs[0]], quality: 'single note', notes: noteNames, pcs, root: pcs[0], bassPc };
  }

  let best = null;
  for (const root of pcs) {
    const key = keyOf(pcs.map((p) => (p - root + 12) % 12));
    const def = TABLE.get(key);
    if (!def) continue;
    const isBass = root === bassPc;
    // Prefer the interpretation rooted on the bass note; otherwise it's a slash chord.
    const score = (isBass ? 100 : 0) + def.ivals.length;
    if (!best || score > best.score) best = { root, def, isBass, score };
  }

  if (!best) {
    return { symbol: '?', quality: `${pcs.length} notes — no match`, notes: noteNames, pcs, root: null, bassPc };
  }

  let symbol = names[best.root] + best.def.sym;
  if (!best.isBass) symbol += `/${names[bassPc]}`;
  return { symbol, quality: best.def.q, notes: noteNames, pcs, root: best.root, bassPc };
}
