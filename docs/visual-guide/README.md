# الدليل المصوّر — Ekklesia Visual Guide

An RTL, Arabic, low-literacy-friendly visual walkthrough of the entire app.
Every step has: an icon, ONE short spoken-Arabic sentence, real Arabic voiceover
audio (macOS "Majed" voice), an annotated screenshot captured from the running
app (amber ring + arrow baked in), and — for interactive steps — a short real
screen-recording clip.

## Viewing
Open `index.html` directly in a browser, or serve the folder:
    python3 -m http.server 4200   # then open http://localhost:4200

## Regenerating media (all real, from the live app)
1. `npm run build && npx next start -p 4100`  (uses the seeded sim DB)
2. `node docs/visual-guide/capture.mjs`        # screenshots + per-step video clips
3. `node docs/visual-guide/audio.mjs`          # Arabic voiceover (needs macOS `say` + Majed voice)
4. `node docs/visual-guide/build.mjs`          # rebuilds index.html

`capture.mjs [n]` recaptures a single section. The step definitions (Arabic
narration, selectors, actions) live in `manifest.mjs` — the single source of truth.
