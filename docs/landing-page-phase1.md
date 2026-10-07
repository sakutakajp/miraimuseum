# Landing Phase 1 — implementation notes

Scene 00–02 are implemented from `landing-page-scenes-00-02.md`. Scene 03 and later are intentionally outside this implementation.

## Routes

- `/`: Threshold → Scale Shift → Everything Is Connected.

The opening keeps an always-available museum link and a quiet entry link at the end of Scene 02. Museum assets are not prefetched from the opening.

## Runtime

`LandingExperience.vue` renders all three content blocks, navigation, the static specimen and the decorative canvas on the server. It imports the Three.js enhancement separately. A single `ExperienceDirector` owns the animation frame, input snapshots, damped scroll timeline, CSS variables and rendering. It does not use the TresJS render loop or hijack scrolling.

The timeline follows 0–100 / 100–360 / 360–520 viewport-height units of **scroll travel**. The track includes the sticky viewport, so its document height is 620 viewport units. The same canvas, camera, specimen and particle field stay mounted across all three scenes. Camera composition has separate portrait presets. Browser chrome/viewport height changes preserve normalized scroll position.

MIRAI CORE is now one persistent Earth: **the planet stays the same; the observation changes**. Its sphere, geographic coordinates, silhouette and object identity remain stable from Threshold through SPACE / LIFE / MATTER / MACHINE. Threshold begins almost black; a uniform fade reveals the same geographic colors and clouds as scrolling continues. LIFE adds muted vegetation and ocean filaments; MATTER adds localized strata and mineral seams inside the surface; MACHINE adds warm city patterns at actual locations and a single incomplete orbital trace. No cell, crystal or machine replaces the planet.

`earth.ts` owns pure, reversible observational weights. Scene 01 retains the specification's four label ranges. A short CONNECTED interval shows all observations together; dissolution remains zero until 87% of Scene 01. Only then do surface fragments and sampled points leave the Earth. The point field and its fine line segments inherit the same sphere coordinates, coherent breakup threshold and geographic colors. Scene 02 briefly suggests orbit, membrane/cell, crystal, sparse network and geographic contour through five precomputed target families. Its headline and supporting copy, typography, margins and DOM reveal timing are retained. The canvas background, particle palette and DOM color mode still share the original black-to-bone transition value.

The Earth is unlit to preserve the reference photograph's colors. Its materials bypass the renderer's filmic tone mapping and apply only the normal linear-to-sRGB output conversion. Ocean colors range from `#26336f` to `#3b4b95` according to the source map, clouds use `#e4e6ee`, and geographic greens, ochres and snow retain the NASA image's original colors. There is no directional light, artificial day/night boundary, cloud shadow, ocean or mineral specular reflection, or color cast from a surface rim. Threshold darkness is a uniform brightness fade of these same colors. The separate atmospheric outline is thin and nondirectional. Fine cloud opacity and cirrus are baked into one texture; its height channel is retained as authoring data but is not used to relight clouds. The SVG fallback uses the same unlit palette and whole-globe opening fade, with no directional gradients, cast shadows or glints. Camera composition, observational overlays and Scene 02 retain their existing behavior.

Four local WebP textures total about 1.45 MiB. NASA Blue Marble geography and Earth at Night supply the day surface and city locations; Natural Earth supplies the land mask. The 2048 × 1024 cloud texture and illustrative relief/vegetation channels are authored derivatives, not live weather or scientific elevation data. Source revisions, checksums, licensing and texture contracts are documented in [the asset notes](../public/landing-earth/README.md). The offline script `scripts/build-landing-earth-assets.py` regenerates them; build/runtime require neither Python nor external requests. There are no external models, videos or post-processing chains.

`QualityManager` starts from device characteristics, caps DPR, measures sustained frame intervals after warm-up, reduces resolution before detail, and only moves downward during a visit. WebGL initialization/import/shader failure, context loss or sustained poor performance switch to the static visual treatment without an error panel. Geometries, materials, renderer, audio and listeners are disposed when entering the museum.

Reduced motion disables pointer parallax, idle rotation, cloud drift, particle drift and camera travel; native scroll, copy order, observational cross-state changes and the gallery inversion remain. Quality tiers reduce resolution, sampling and surface embellishments while retaining Earth geography and all observations. The static treatment uses an orthographically projected SVG Earth with the same layers and varied Scene 02 contours, rather than a stone or atomic icon. Canvas and decoration are hidden from assistive technology. Semantic blocks remain in DOM order without live announcements. The optional soundscape begins muted and creates its AudioContext only after a user gesture; both animation and audio pause when hidden.

## Verification

- `npm run typecheck`
- `npm test` — timeline boundaries, damping, viewport preservation, downward-only quality policy, intact Earth/connected-before-breakup and normalized reversible figure weights, plus existing game tests.
- `npm run build`
- `npx playwright test` — landing semantics, stable Earth UUID and canvas through observations, connected-before-breakup, five figure families, native/reverse scrolling, mobile/reduced motion, fallback, no-JavaScript entry, context loss/visibility, and existing game flows.

Visual review uses 1440 × 900, 1280 × 800, 390 × 844 and 430 × 932 browser viewports, including forward/reverse transitions and static treatment. Physical iPhone Safari/GPU performance still requires a device check; Chromium viewport emulation does not substitute for that measurement.

Earth and unlit photographic palette verification: typecheck and production build passed; all 84 unit tests and 12 production Playwright cases passed. Visual review covered all observations, connected structures, portrait composition, low quality, reduced motion and SVG fallback, with no page errors. Palette review covered all four viewport sizes and both WebGL and SVG rendering. A cloud-free ocean sample in the WebGL screenshot measured `#26336f`, matching the input palette without a lighting or tone-mapping shift. The cloud texture regenerated deterministically; day, night and relief maps remained unchanged. The atmospheric shell renders only its outer rim, uses separate reduced geometry and skips unused breakup calculations to retain the existing timeline budgets under concurrent software-GPU tests.

All art-direction presets live under `app/experiences/landing`, and all landing styling is namespaced in `landing.css`. The legacy museum/game CSS remains intact.
