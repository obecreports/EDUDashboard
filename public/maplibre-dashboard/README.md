# ConED MapLibre — Thailand-scoped school network map

Standalone MapLibre view that mirrors the legacy ConED `ThailandMap` layout (map + detail panel), scoped to Thailand, driven by live Supabase `School_Basic` data.

## Run

```bash
npx serve maplibre-dashboard
```

Credentials: `js/env.local.js` (already wired to your project URL/anon key).

## What’s included

1. **Thailand-only mask** — outside landmass muted via mask polygon + `maxBounds`
2. **Active province highlighting** — sky fill only where DB has schools; others desaturated
3. **Detail panel** — national province list → province stats/districts/schools (legacy layout)
4. **Namespaced IDs** — `coned-ml-*` sources/layers/CSS under `.coned-maplibre-root` for side-by-side use with the D3 map

## Hover sync & view switcher

- **District ↔ Area toggle** in the province detail panel re-aggregates schools by อำเภอ or เขตพื้นที่การศึกษา.
- **Panel → map**: school / district / area row hover uses `setFeatureState({ glow, hover })` (amber pulse, no setData).
- **Map → panel**: hovering a school pin or district polygon highlights the matching list row and `scrollIntoView`.

Module: `js/hover-bridge.js`.
