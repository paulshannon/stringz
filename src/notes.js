// Note math for Stringz.
//
// A pitch is represented internally as a MIDI number, where C-1 = 0 and
// C4 = 60 (scientific pitch notation). The pitch class is `midi % 12`.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_RE = /^([A-Ga-g])([#b♯♭]?)(-?\d+)?$/;
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Parse "E2", "C#3", "Db4", "F#" (octave optional → defaults to 4) into a MIDI number.
export function parseNote(str) {
  const m = String(str).trim().match(NOTE_RE);
  if (!m) return null;
  const [, letter, accidental, octaveStr] = m;
  let pc = LETTER_PC[letter.toUpperCase()];
  if (accidental === '#' || accidental === '♯') pc += 1;
  else if (accidental === 'b' || accidental === '♭') pc -= 1;
  const octave = octaveStr === undefined ? 4 : parseInt(octaveStr, 10);
  return midiOf(((pc % 12) + 12) % 12, octave);
}

export function midiOf(pitchClass, octave) {
  return (octave + 1) * 12 + pitchClass;
}

export function pitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

export function octaveOf(midi) {
  return Math.floor(midi / 12) - 1;
}

export function noteName(midi, { useFlats = false, withOctave = false } = {}) {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  const name = names[pitchClass(midi)];
  return withOctave ? `${name}${octaveOf(midi)}` : name;
}

export function transpose(midi, semitones) {
  return midi + semitones;
}
