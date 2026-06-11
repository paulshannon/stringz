# 🎸 Stringz

An interactive guitar fretboard that runs entirely in your browser. Configure
any number of strings, tune each one to any note, and explore the neck.

**No build step, no dependencies, no network calls** — just static HTML, CSS,
and vanilla ES-module JavaScript, deployed to GitHub Pages.

## Features

- **Configurable strings** — add or remove strings (works for 4-string bass,
  6-string guitar, 7-string, ukulele, mandolin, and beyond).
- **Arbitrary tunings** — set each string's note and octave independently, or
  pick from built-in presets (Standard, Drop D, DADGAD, Open G/D, half-step
  down, bass, ukulele, mandolin, violin…).
- **Adjustable neck length** — 5 to 24 frets, with position-marker inlays.
- **Note highlighting** — click any position to highlight every occurrence of
  that note across the whole neck.
- **Display options** — show all note names, sharps vs. flats, octave numbers,
  and a left-handed view.
- **Persistent** — your configuration and theme are saved in `localStorage`.

## Running locally

Because it uses ES modules, open it through a local web server rather than the
`file://` protocol:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

```
index.html        markup + control elements
styles.css        all styling, light/dark themes via CSS variables
src/
  main.js         state, controls, persistence, wiring (entry point)
  notes.js        note math (MIDI numbers, pitch classes, naming)
  presets.js      built-in tuning presets
  fretboard.js    fretboard rendering + interaction
```

## Deployment

Pushes to `main` are deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

> **One-time setup:** in the repository settings under **Pages**, set the
> source to **GitHub Actions**.

## Roadmap

Interactive fretboard is the first feature. Possible future additions: scale &
chord overlays, a microphone-based tuner, and chord-diagram export.
