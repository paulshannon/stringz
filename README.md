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

The site is served from the `gh-pages` branch:

- **Production** — pushes to `main` deploy the site to the root of `gh-pages`
  via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
- **PR previews** — each pull request is deployed to
  `gh-pages/pr-preview/pr-<number>/` by
  [`.github/workflows/preview.yml`](.github/workflows/preview.yml), which
  comments the preview URL on the PR and cleans it up when the PR closes.
  (Previews only run for branches in this repo; fork PRs get a read-only token.)

> **One-time setup:**
> 1. **Settings → Pages → Source**: *Deploy from a branch* → `gh-pages` / `(root)`.
> 2. **Settings → Actions → General → Workflow permissions**: *Read and write
>    permissions* (so the workflows can update the `gh-pages` branch).

## Roadmap

Interactive fretboard is the first feature. Possible future additions: scale &
chord overlays, a microphone-based tuner, and chord-diagram export.
