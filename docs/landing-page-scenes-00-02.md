# MIRAI MUSEUM — Landing Page Scenes 00–02 Implementation Specification

> **2026-10-09 更新:** エンジン選定・フル3D化・11ゲーム構成は [Babylon.js / フル3D共通仕様](babylon-full3d-spec.md) を優先する。本書のThree.js / Phaser / TresJSおよび2D描画の記述は移行前の設計・実装記録であり、新規実装の採用指示ではない。既存のゲーム固有要件は共通仕様と矛盾しない範囲で維持する。記載された過去のテスト結果はBabylon.js版の検証結果ではない。


Version: 1.0  
Date: 2026-10-06  
Status: Ready for implementation  
Parent spec: docs/landing-page-experience.md

## 0. Purpose and precedence

This document turns the first three scenes of the MIRAI MUSEUM landing experience into an implementation-ready Nuxt specification.

The target is not a conventional hero section. The first 15–20 seconds must already feel like an exhibit: quiet, tactile, cinematic, and technically confident.

If existing README visual guidance conflicts with this document, this document takes precedence for the landing page and brand shell. Existing game usability requirements remain valid.


---

## 1. Phase 1 deliverable

Implement these three scenes as one continuous experience:

1. Scene 00 — Threshold: first contact with MIRAI CORE.
2. Scene 01 — Scale Shift: the same object appears to move through scales of knowledge.
3. Scene 02 — Everything Is Connected: the dark spatial scene resolves into the museum's thesis.

The user should not perceive three separate components loading. There is one visual world, one canvas, one CORE, and one continuous camera.

### Definition of done

- Desktop 1440 × 900 feels authored rather than template-driven.
- Mobile 390 × 844 is a first-class composition, not a reduced desktop layout.
- Scroll is smooth at normal trackpad, mouse-wheel, and touch speeds.
- No visible WebGL flash, layout shift, or hydration mismatch.
- Reduced-motion mode remains elegant and understandable.
- A WebGL failure still leaves a complete branded opening, never a blank page.
- Existing games and routes continue to work.
- Typecheck, unit tests, and relevant browser tests pass.

---

## 2. Dependencies and constraints

### Required

- Nuxt 4 / Vue 3 / TypeScript: keep current project foundation.
- three: add as a runtime dependency.
- @tresjs/core: add as a runtime dependency.

Use versions compatible with the current Nuxt/Vue stack at implementation time. Do not pin a version in this document.

### Intentionally not required for Phase 1

- GSAP
- Lenis or another smooth-scroll hijacker
- a physics engine
- a large animation framework
- a CMS
- @tresjs/cientos

Use native scroll position plus requestAnimationFrame and damped interpolation. The experience must respect browser scroll behavior instead of replacing it.

Three's own examples modules may be used for a minimal post-processing chain, but Scene 00–02 must still look intentional with post-processing disabled.

---

## 3. Proposed file structure

Keep landing-specific visual code separate from game code.

    app/
      components/
        landing/
          LandingExperience.client.vue
          LandingDomLayer.vue
          LandingSoundToggle.vue
          MiraiCoreCanvas.client.vue
          scenes/
            ThresholdContent.vue
            ScaleShiftLabels.vue
            ConnectedStatement.vue
      composables/
        useReducedMotion.ts
      experiences/
        landing/
          ExperienceDirector.ts
          QualityManager.ts
          config.ts
          types.ts
          math.ts
          three/
            MiraiCore.ts
            MiraiParticles.ts
            MuseumCamera.ts
            materials/
              coreMaterial.ts
      app.vue

Names may be adapted to existing project conventions, but preserve the separation of responsibilities.

Do not move or refactor Phaser game code as part of this phase.

---

## 4. Page topology

The first phase occupies approximately 520vh.

    LandingExperience
      visual canvas: sticky 100dvh
      DOM overlay: sticky 100dvh
      scroll track:
        0–100vh     Scene 00 Threshold
        100–360vh   Scene 01 Scale Shift
        360–520vh   Scene 02 Connected

The exact px height is derived from viewport height. Use logical normalized progress for animation; never encode animations against a single device's pixels.

The canvas remains mounted through all three scenes.

---

## 5. Runtime state

The director owns one mutable runtime state object:

    type LandingScene = 'threshold' | 'scale-shift' | 'connected'

    type LandingRuntimeState = {
      globalProgress: number
      scene: LandingScene
      sceneProgress: number
      scrollVelocity: number
      pointerX: number
      pointerY: number
      pointerActive: boolean
      viewportWidth: number
      viewportHeight: number
      dpr: number
      reducedMotion: boolean
      quality: 'high' | 'medium' | 'low' | 'static'
    }

All progress values are clamped to 0…1.

High-frequency animation state must not flow through Vue reactivity every frame. ExperienceDirector updates Three objects directly inside one requestAnimationFrame loop. Vue receives only low-frequency semantic state when the active scene or accessibility-visible content changes.

---

## 6. ExperienceDirector contract

ExperienceDirector is the single clock for scroll, pointer, camera, CORE, particles, and DOM motion.

### Inputs

- current scrollY
- viewport dimensions
- pointer/touch position
- prefers-reduced-motion
- tab visibility
- QualityManager tier

### Per-frame order

1. Read the most recent input snapshot.
2. Convert scrollY into global and scene progress.
3. Apply damped interpolation to the visual progress.
4. Update camera transform.
5. Update MIRAI CORE state and material uniforms.
6. Update particles.
7. Update DOM CSS custom properties.
8. Render once.

Only one requestAnimationFrame owner is allowed for the landing experience.

### Damping

Use time-corrected exponential damping, not a fixed lerp factor:

    next = damp(current, target, lambda, deltaSeconds)

Recommended starting values:

- scroll visual progress: lambda 10–14
- pointer parallax: lambda 7–10
- camera target: lambda 6–9
- CORE rotation response: lambda 4–7

Clamp delta after a background-tab resume so one long frame cannot jump the entire animation.

### DOM communication

Expose CSS custom properties on the landing root:

    --landing-progress
    --scene-progress
    --scroll-velocity
    --pointer-x
    --pointer-y

DOM transforms should prefer these properties and CSS transforms/opacity over reactive inline-style churn.

---

## 7. MIRAI CORE: Earth as the persistent object

MIRAI CORE is Earth.

This replaces the earlier ambiguous procedural orb direction. The visual concept is no longer that one mysterious object morphs into unrelated forms. The new rule is:

> The Earth does not change. The way we see it changes.

Keep one recognizable Earth silhouette, rotation axis, and spatial identity through Scene 00 and Scene 01. SPACE, LIFE, MATTER, and MACHINE are observation layers applied to the same world.

This decision is a conceptual constraint, not just an asset swap.

### Earth construction

Build the Earth as a small set of coordinated render layers:

- base Earth sphere: restrained ocean / continent response
- cloud shell: independently slow rotating, low-contrast
- atmosphere shell: thin Fresnel / scattering rim
- night-side light layer: subtle, not a glowing city-map billboard
- observation layer shell(s): LIFE / MATTER / MACHINE masks and graphics
- point / contour representation used only near CONNECTED dissolution

The first frame should be dark enough that the visitor initially reads a mysterious spherical exhibit. Scroll/light reveals that it is Earth.

Do not use a bright stock Blue Marble look.

### State vocabulary

| State | What remains constant | What changes |
|---|---|---|
| Threshold | Earth silhouette | only atmosphere rim, cloud edges, small specular clues |
| SPACE | Earth | atmosphere, ocean, clouds, night side become legible |
| LIFE | Earth | biosphere / vegetation / organic surface patterns invade the surface |
| MATTER | Earth | local surface masks reveal geology, plates, mineral/crystal structures |
| MACHINE | Earth | city light, orbital/infrastructure/communication abstractions form an artificial layer |
| CONNECTED | Earth until the final beat | all layers briefly coexist, then the sphere dissolves into points/contours |

### Required shader / material controls

The exact shader architecture may change, but the visual system needs equivalent controls for:

    uTime
    uObservationProgress
    uLifeMix
    uMatterMix
    uMachineMix
    uDissolve
    uNightMix
    uAtmosphereStrength
    uPointer
    uVelocity

If textures are used, load only the resolutions justified by the current quality tier.

### LIFE

LIFE must not be a neon-green Earth.

Prefer:

- muted biosphere response
- organic branching / cell-like microstructure close to the surface
- subtle ocean particle activity
- a short moment where the planet can be perceived as one living system

### MATTER

MATTER must not replace Earth with a crystal.

Prefer:

- localized surface erosion / masks
- geological bands or plate boundaries
- mineral/crystal lattice invading only parts of the surface
- transition from planetary scale toward material scale while the globe silhouette remains

Do not make a literal schoolbook cross-section unless a later exhibition specifically requires one.

### MACHINE

MACHINE must not become a generic blue network globe.

Prefer:

- night-side human light
- sparse orbital traces
- infrastructure and communication as a fine artificial layer
- an impression that civilization has added another geological layer to Earth

Avoid dozens of glowing arcs joining capitals.

### CONNECTED / dissolve

Only after SPACE, LIFE, MATTER, and MACHINE have all been experienced may Earth begin to lose its physical surface.

Dissolution should:

1. preserve the sphere silhouette for the first half of the transition;
2. detach points/contours from the surface coherently;
3. allow fragments to carry hints of all four observation layers;
4. prepare the Bone White Scene 02 composition.

Do not replace the Earth with another hero mesh before this point.

---

## 8. Camera and composition

Use a perspective camera with a restrained field of view. Starting point:

- desktop FOV: approximately 34–40°
- mobile FOV: approximately 42–48°
- near plane: 0.1
- far plane: only as large as the scene needs

Do not animate FOV aggressively. Create scale changes primarily with camera distance, object position, and CORE surface state.

### Desktop

- Scene 00 CORE sits slightly right of optical center.
- Brand text occupies the left/lower-left negative space.
- Scene 01 CORE can cross center as scale states change.
- Scene 02 particles recede behind the statement rather than competing with it.

### Mobile portrait

- CORE lives in the upper 45–55% during text-heavy moments.
- Copy occupies the lower field with safe-area padding.
- The camera path is authored separately; do not merely multiply desktop positions by an aspect-ratio factor.

All camera presets belong in config.ts as named data, not scattered magic numbers.

---

## 9. Scene 00 — Threshold

Range: 0–100vh.

### Required copy

    MIRAI MUSEUM
    みらい博物館

    EXPLORE THE WORLD OF KNOWLEDGE.

    SCROLL TO ENTER

Do not add a paragraph explaining the museum here.

### Visual premise

The visitor is already looking at Earth, but should not identify it immediately.

The composition keeps the current premium dark opening: a huge sphere sits in darkness to the right of the title. Only a narrow atmosphere rim, cloud edge, and tiny ocean/specular clues are visible.

The reveal should create a delayed recognition:

> mysterious exhibit → sphere → Earth

Do not make the first frame a conventional bright blue planet.

### Initial load choreography

| Time | Visual |
|---|---|
| 0.0–0.3s | near-black field |
| 0.3–0.8s | narrow atmosphere rim appears |
| 0.65–1.15s | MIRAI MUSEUM resolves |
| 0.9–1.4s | Japanese name and English line appear |
| 1.25–1.8s | SCROLL TO ENTER appears |
| 1.8s+ | barely visible Earth rotation / cloud drift |

### Scroll choreography

0.00–0.35:

- Earth remains extremely dark.
- title stays fully readable.
- atmosphere and cloud shell provide the main evidence of form.

0.35–0.70:

- SCROLL TO ENTER leaves first.
- key light moves enough to reveal hints of ocean and continent.
- Earth identity becomes readable without becoming bright.

0.70–1.00:

- brand copy exits through mask/clip.
- camera/light transition flows directly into SPACE.
- same Earth instance, same rotation, no scene swap.

### Pointer / touch

Desktop pointer may influence Earth/light by only a small amount:

- maximum visual rotation response roughly 2–3°
- never make Earth behave like a draggable product model
- no cursor-following glow blob

Touch must never block vertical scroll.

### Sound

Sound is opt-in.

If enabled:

- quiet room tone
- extremely low atmospheric / planetary resonance
- no voiceover

The page loses no meaning while muted.

---

## 10. Scene 01 — Scale Shift

Range: 100–360vh.  
Behavior: sticky 100dvh visual stage.

This is Phase 1's conceptual and technical centerpiece.

The visitor does not watch Earth turn into other objects. The visitor watches the same Earth become legible through four different disciplines.

### Progress map

| Progress | View | Label | Primary visual change |
|---|---|---|---|
| 0.00–0.20 | Earth / cosmic | SPACE | atmosphere, clouds, ocean, night side become legible |
| 0.20–0.40 | Biosphere | LIFE | organic / ecological layer spreads across the same surface |
| 0.40–0.60 | Geology / material | MATTER | geological and mineral structures invade localized regions |
| 0.60–0.82 | Civilization | MACHINE | human light, orbit and infrastructure form an artificial layer |
| 0.82–1.00 | Synthesis | CONNECTED | all layers coexist briefly; Earth dissolves into points/contours |

There must be overlap. Never make the sequence feel like four slides or texture swaps.

### Labels

SPACE / LIFE / MATTER / MACHINE are classification marks.

Optional secondary vocabulary:

    ATMOSPHERE
    BIOSPHERE
    LITHOSPHERE
    TECHNOSPHERE

Use sparingly. The visitor should look at Earth, not read a diagram.

### SPACE

- retain the dark premium look
- make atmosphere thin and physically plausible in scale
- clouds move independently and slowly
- restrained night-side city light is allowed
- stars stay secondary to Earth

### LIFE

- preserve the underlying continents/ocean
- bring in muted biosphere color and organic microstructure
- allow ocean micro-particles or subtle biological activity
- do not pulse the whole planet like a heart
- no bright green glow

### MATTER

- keep globe silhouette unchanged
- reveal geology through localized masks
- plate / strata / mineral patterns may cross scale
- crystal lattice is an overlay/interpretation, not a replacement sphere
- avoid literal textbook cutaway

### MACHINE

- build from human night-side activity into finer infrastructure
- use sparse orbital information only when it helps composition
- present technology as a layer humanity added to Earth
- no generic globe covered in blue arcs

### CONNECTED

- SPACE / LIFE / MATTER / MACHINE briefly coexist
- do not turn this into visual clutter; use controlled masking and depth
- Earth stays recognizable at the start of the dissolve
- points/contours detach coherently from its surface
- final fragments already adopt the composition needed by Scene 02

### Interaction response

Scroll velocity may add only restrained energy:

- very small layer lag
- slight point drift near CONNECTED
- tiny camera lag

Scroll velocity must not distort the Earth itself into a rubber object.

When scroll stops, settle within roughly 500–900ms.

Fast scroll and reverse scroll must produce coherent layer ordering with no flicker.

---

## 11. Scene 02 — Everything Is Connected

Range: 360–520vh.

Scene 02 is the answer to Scene 01.

### Required headline

    すべての学問は、
    つながっている。

Secondary line:

    EVERYTHING IS CONNECTED.

Supporting copy:

    宇宙も、生命も、数も、機械も。
    見方を変えれば、同じ世界の一部になる。

The meaning should now be literal: the visitor has just seen those views coexist on one Earth.

### Background transition

At entry, shift decisively from Obsidian Black to Bone White / ivory.

Canvas, DOM color mode, particles, and residual Earth fragments use one normalized transition value.

Target:

- 0.00–0.14: black → bone
- 0.10–0.34: headline first line resolves
- 0.25–0.52: second line resolves
- 0.38–0.65: supporting copy arrives
- 0.55–0.85: Earth fragments settle into a quiet multi-disciplinary field
- 0.85–1.00: hold

### Typography behavior

- clipping / line reveal
- no character-by-character gimmick
- no generic scale-up landing animation
- generous negative space

### Residual field

The background is made from the fragments of Earth, not a new decorative atom icon.

Fragments may briefly suggest:

- orbital geometry
- cell clustering
- geological / crystal structure
- network / infrastructure

Do not reduce the final graphic to a single generic atomic orbit symbol. The point is plurality of viewpoints.

At the end, keep enough of the point/contour field alive that future Scene 03 portals can attract it.

---

## 12. DOM / WebGL layering

The DOM remains the authoritative source for:

- all readable copy
- navigation
- sound control
- accessibility labels
- future route links
- SEO content

Canvas is visual enhancement and should be aria-hidden unless it later contains genuinely interactive semantic content.

Recommended stacking:

1. page background
2. WebGL canvas
3. decorative film grain/noise at very low opacity
4. DOM copy
5. navigation / sound control

Use pointer-events carefully. The canvas should not accidentally consume page scroll/touch.

---

## 13. Visual finish

### Grain

A very subtle monochrome grain layer may be used to prevent sterile gradients.

- low opacity
- no large downloaded video texture
- disabled or reduced on low quality

### Bloom / post effects

If used:

- selective and low intensity
- never wash black into gray across the whole page
- never make body text glow

High quality should come first from lighting, composition, geometry, material response, and timing.

### Color management

Use Three's current color-management conventions. Verify output on sRGB displays. Do not compensate by arbitrarily oversaturating shader colors.

---

## 14. QualityManager

QualityManager chooses a tier once at startup and may step down if sustained performance is poor.

### High

- devicePixelRatio capped around 1.75–2
- full CORE resolution
- full particle target
- optional minimal post-processing

### Medium

- DPR around 1.25–1.5
- fewer particles
- simplified shadow/lighting work
- lower shader octave count

### Low

- DPR around 1
- materially reduced particle count
- no post-processing
- simpler material response

### Static

Used when WebGL cannot initialize, repeatedly loses context, or reduced-motion plus device constraints make WebGL inappropriate.

- DOM experience remains complete
- CSS background and a simple static CORE substitute maintain composition
- no error message shown to ordinary visitors

### Runtime downgrade

Measure a rolling frame-time window after initial stabilization.

If performance remains below the target for several seconds, step down one tier at a time. Do not oscillate between tiers. Never upgrade again during the same visit.

Preferred degradation order:

1. DPR
2. particle count
3. post-processing
4. shader complexity
5. secondary decorative layers
6. static fallback

---

## 15. Performance budgets

Phase 1 targets:

- smooth 60fps on a modern desktop and high-end recent phone
- interaction response visible within roughly 100ms
- no long main-thread work during scroll
- no per-frame Vue component rerender
- no per-frame object allocation in the hot path where avoidable
- pause or heavily reduce rendering when document.visibilityState is hidden
- resize work debounced/coalesced to animation frame

Keep initial Scene 00–02 visual payload small. Procedural construction is preferred in this phase precisely because it gives a premium look without large GLB/texture downloads.

If large external assets are introduced, the parent spec's compressed 3D asset target applies.

---

## 16. Mobile behavior

Mobile is not desktop with fewer particles.

### Required adaptations

- use 100dvh rather than 100vh where appropriate
- respect safe-area insets
- separate mobile camera presets
- keep headline line breaks authored for narrow portrait
- keep touch scrolling native
- remove hover-only affordances
- reduce decorative particle density before reducing CORE quality

The scene must survive browser chrome expanding/collapsing without jumping the animation progress dramatically.

When viewport height changes because mobile chrome moves, preserve normalized scene progress and update measurements on the next animation frame.

---

## 17. Accessibility and reduced motion

### Reduced motion

When prefers-reduced-motion: reduce is active:

- disable pointer parallax
- remove continuous idle rotation/pulsing
- replace long camera travel with a few restrained cross-state transitions
- keep normal browser scrolling
- keep Scene 00–02 copy and ordering identical
- keep black-to-bone thematic transition

Do not replace the experience with an apology or blank static page.

### Keyboard

- sound control is keyboard accessible
- focus ring has strong contrast in both dark and bone modes
- no scroll trap
- no keyboard focus lands inside decorative canvas

### Screen readers

The three semantic content blocks exist in DOM order even while sticky positioning overlaps them visually.

Avoid aria-live for scene changes triggered by scrolling.

---

## 18. Audio contract

Build audio as an optional enhancement, not a Phase 1 blocker.

The UI can ship with a sound toggle while the detailed soundscape is iterated later.

Rules:

- master gain starts at zero / muted
- user gesture is required to enable
- remember the explicit choice in localStorage if appropriate
- ramp gain rather than hard-starting/stopping
- pause/suspend on hidden tab
- no essential instructions communicated only by sound

Sound state must not be coupled to WebGL state.

---

## 19. Failure handling

The opening must degrade gracefully.

Handle at minimum:

- dynamic import failure
- WebGL initialization failure
- lost WebGL context
- shader compilation failure during development
- zero/abnormal viewport dimensions during hydration

LandingExperience.client.vue owns the enhancement boundary. The server-rendered DOM opening must exist before the WebGL client code is ready.

On failure, switch a root data attribute such as data-renderer="static" and render the static visual treatment. Do not leave an exception that prevents the museum UI from mounting.

---

## 20. Testing

### Unit tests

Add tests for pure math/state logic:

- global progress clamping
- scene selection at boundaries
- scene-local progress
- damp() stability with large delta
- QualityManager only steps downward

Suggested boundary checks:

- 0vh → threshold / 0
- 100vh crossing → scale-shift
- 360vh crossing → connected
- 520vh → connected / 1

Do not encode tests so tightly to exact decorative values that art-direction tuning becomes painful.

### Browser tests

Add stable selectors:

    data-testid="landing-experience"
    data-testid="landing-threshold"
    data-testid="landing-scale-shift"
    data-testid="landing-connected"
    data-testid="landing-sound-toggle"

Browser tests should verify:

1. opening text is visible without waiting for WebGL semantics;
2. scrolling advances the active scene marker;
3. Scene 02 headline becomes available;
4. reduced-motion mode preserves all content;
5. no horizontal overflow at 390px;
6. existing game entry remains reachable after landing changes.

Canvas pixel snapshots are optional. Prefer testing semantic state and manual visual review for shader output.

---

## 21. Manual visual QA

Review at:

- 1440 × 900 desktop
- 1280 × 800 laptop
- 390 × 844 mobile portrait
- 430 × 932 large mobile portrait

For each:

- reload at top
- slow scroll through every transition
- fast flick/trackpad scroll through Scene 01
- reverse scroll back to Scene 00
- resize/rotate where applicable
- enable reduced motion
- simulate WebGL failure/static fallback
- background the tab and return

Reject the implementation if any transition only works in the forward direction.

---

## 22. Art-direction rejection list

Do not ship the Phase 1 opening if it reads as:

- a generic glowing sphere on a black SaaS website
- a particle demo with text layered on top
- a Three.js portfolio clone
- a cyberpunk HUD
- a children's science site
- a sequence of full-screen fade-in sections
- a scroll-jacked cinematic that fights the browser

The strongest test is whether a still frame looks composed and whether motion gives the object new meaning.

---

## 23. Implementation sequence

### Step A — Foundation

- add Three/Tres dependencies
- create landing folder structure
- SSR DOM skeleton for the three scenes
- make current application entry coexist with the landing experience

### Step B — Director

- normalized progress model
- one rAF loop
- input snapshots
- damping
- reduced-motion branch
- tests for mapping logic

### Step C — CORE

- single persistent Three/Tres canvas
- procedural geometry/material
- camera presets
- pointer response
- static fallback

### Step D — Scene choreography

- Scene 00 time + scroll choreography
- Scene 01 five visual states and transitions
- Scene 02 shared color transition and typography

### Step E — Quality

- QualityManager
- visibility pause
- mobile tuning
- performance profiling

### Step F — Verification

- unit/type tests
- Playwright semantic tests
- manual desktop/mobile visual pass
- verify existing game flows

Do not start Scene 03 until Scene 00–02 pass the manual quality gate.

---

## 24. Code quality rules for Codex

- Keep shader/math constants named and grouped.
- Keep art-direction configuration separate from runtime mechanics.
- Prefer pure functions for progress mapping.
- Avoid watchers for frame-by-frame work.
- Avoid adding global event listeners without cleanup.
- Dispose Three geometries, materials, render targets, and listeners on unmount.
- Handle devicePixelRatio changes and resize.
- Preserve existing public behavior outside the landing page.
- Do not refactor unrelated game code.
- Do not add placeholder stock imagery.
- Do not use emoji as interface icons.

---

## 25. Phase 1 acceptance checklist

### Experience

- [ ] The first frame feels like an intentional museum threshold.
- [ ] MIRAI CORE remains recognizably the same entity across all three scenes.
- [ ] Scene 01 communicates SPACE → LIFE → MATTER → MACHINE → POINTS without slide cuts.
- [ ] Scene 02 lands the thesis “すべての学問は、つながっている。” with visual calm.
- [ ] Reverse scroll is as coherent as forward scroll.

### Engineering

- [ ] One persistent canvas; no canvas remount between scenes.
- [ ] One animation loop.
- [ ] No per-frame Vue rerender dependency.
- [ ] WebGL/static fallback works.
- [ ] Reduced motion works.
- [ ] Quality tiers work and only downgrade during a visit.
- [ ] Mobile layout works at 390px width with no horizontal overflow.
- [ ] Existing game routes/features still work.
- [ ] Typecheck and tests pass.

### Quality gate before Scene 03

The team should be willing to keep a visitor on only these first 520vh and still call the experience complete enough to show. If the opening still feels like “the intro before the real site,” Phase 1 is not finished.

