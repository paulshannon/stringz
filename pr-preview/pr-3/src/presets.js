// Tuning presets. Each tuning lists open-string notes from LOW to HIGH.
import { parseNote } from './notes.js';

const RAW_PRESETS = {
  'Guitar — Standard (E A D G B E)': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Guitar — Drop D': ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Guitar — DADGAD': ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
  'Guitar — Open G': ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
  'Guitar — Open D': ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
  'Guitar — Half-step down': ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
  '7-string Guitar (B E A D G B E)': ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Bass — 4 string (E A D G)': ['E1', 'A1', 'D2', 'G2'],
  'Bass — 5 string (B E A D G)': ['B0', 'E1', 'A1', 'D2', 'G2'],
  'Ukulele (G C E A)': ['G4', 'C4', 'E4', 'A4'],
  'Mandolin (G D A E)': ['G3', 'D4', 'A4', 'E5'],
  'Violin (G D A E)': ['G3', 'D4', 'A4', 'E5'],
};

// Materialize into MIDI-number arrays.
export const PRESETS = Object.fromEntries(
  Object.entries(RAW_PRESETS).map(([name, notes]) => [name, notes.map(parseNote)]),
);

export const DEFAULT_PRESET = 'Guitar — Standard (E A D G B E)';
