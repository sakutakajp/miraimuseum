# Landing Phase 1 — implementation notes

Scene 00–02 are implemented from `landing-page-scenes-00-02.md`. Scene 03 and later are intentionally outside this implementation.

## Routes

- `/`: Threshold → Scale Shift → Everything Is Connected.
- `/museum`: the existing museum, Dinosaur Dash, STAR DIVE, saved progress, language selection and discoveries. No game runtime or storage format was changed.

The opening keeps an always-available museum link and a quiet entry link at the end of Scene 02. Museum assets are not prefetched from the opening.

## Runtime

`LandingExperience.vue` renders all three content blocks, navigation, the static specimen and the decorative canvas on the server. It imports the Three.js enhancement separately. A single `ExperienceDirector` owns the animation frame, input snapshots, damped scroll timeline, CSS variables and rendering. It does not use the TresJS render loop or hijack scrolling.

The timeline follows 0–100 / 100–360 / 360–520 viewport-height units of **scroll travel**. The track includes the sticky viewport, so its document height is 620 viewport units. The same canvas, camera, specimen and particle field stay mounted across all three scenes. Camera composition has separate portrait presets. Browser chrome/viewport height changes preserve normalized scroll position.

CORE uses a procedural displaced icosphere, restrained grazing light, mineral microtexture, membrane response, crystal lattice and ordered machine bands. Its point shell shares the displacement function and dissolves along a coherent noise threshold. The resulting particles settle into a latent orbital figure behind the Scene 02 statement. The canvas background, particle palette and DOM color mode share one black-to-bone transition value. No external models, textures, videos or post-processing chain are required.

`QualityManager` starts from device characteristics, caps DPR, measures sustained frame intervals after warm-up, reduces resolution before detail, and only moves downward during a visit. WebGL initialization/import/shader failure, context loss or sustained poor performance switch to the static visual treatment without an error panel. Geometries, materials, renderer, audio and listeners are disposed when entering the museum.

Reduced motion disables pointer parallax, idle rotation, pulsing and camera travel; native scroll, copy order, material states and the gallery inversion remain. Canvas and decoration are hidden from assistive technology. Semantic blocks remain in DOM order without live announcements. The optional soundscape begins muted and creates its AudioContext only after a user gesture; both animation and audio pause when hidden.

## Verification

- `npm run typecheck`
- `npm test` — timeline boundaries, damping, viewport preservation and downward-only quality policy, plus existing game tests.
- `npm run build`
- `npx playwright test` — landing semantics, native/reverse scrolling, mobile/reduced motion, fallback, no-JavaScript entry, context loss/visibility, and existing game flows.
- `npm run test:star-dive` — existing runtime, score persistence, retry and renderer recovery.

Visual review uses 1440 × 900, 1280 × 800, 390 × 844 and 430 × 932 browser viewports, including forward/reverse transitions and static treatment. Physical iPhone Safari/GPU performance still requires a device check; Chromium viewport emulation does not substitute for that measurement.

All art-direction presets live under `app/experiences/landing`, and all landing styling is namespaced in `landing.css`. The legacy museum/game CSS remains intact.
