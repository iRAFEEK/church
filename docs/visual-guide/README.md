# Visual Guide Pipeline — "دليل الاستخدام"

Generates the media + data for the in-app visual guide at **/help**
(pages: app/(app)/help, data: lib/help/guide-data.ts, media: public/help-guide).

## Regenerating (all real, from the live app)
1. `npm run build && npx next start -p 4100`   # uses the seeded DB
2. `node docs/visual-guide/capture.mjs`         # screenshots + per-step MP4 clips → public/help-guide
3. `node docs/visual-guide/audio.mjs`           # Arabic voiceover (macOS `say`, voice: Majed)
4. `node docs/visual-guide/gen-app-data.mjs`    # regenerates lib/help/guide-data.ts

`capture.mjs [n]` recaptures one section. `manifest.mjs` is the single source of
truth: Arabic narration, icons, selectors, actions, and role gating derive from it.
