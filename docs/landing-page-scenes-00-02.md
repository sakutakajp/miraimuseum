# MIRAI MUSEUM — Landing Page Scenes 00–02 Implementation Specification

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

## 7. MIRAI CORE: Phase 1 visual construction

MIRAI CORE is the visual anchor of the entire future landing page. Do not implement Scene 00 with a disposable hero object.

For Phase 1, build a procedural CORE that is art-directable without external 3D assets:

- high-enough-resolution icosphere as the base volume
- custom shader displacement driven by coherent 3D noise
- controlled Fresnel/rim response
- restrained internal glow
- a second shell or point layer used only during transitions
- instanced/points particle field for dissolution

The goal is mineral / celestial / biological ambiguity. It should not look like a glossy SaaS orb, generic wireframe globe, or neon plasma ball.

### Material parameters

The material interface should support:

    uTime
    uMorph
    uDissolve
    uNoiseScale
    uNoiseStrength
    uRimStrength
    uColorA
    uColorB
    uPointer
    uVelocity

Do not make scroll velocity produce large wobble. It may contribute a very small transient energy response.

### State vocabulary

The same CORE moves through these visual states:

| State | Read | Surface behavior | Color tendency |
|---|---|---|---|
| Void | object emerging from darkness | almost no displacement | black / cold white |
| Planet | macro/cosmic | slow broad terrain noise | graphite / mineral blue |
| Life | membrane/cell | soft low-frequency pulse | bone / muted green |
| Matter | crystal/lattice | faceted, sharper response | clear white / amber hint |
| Machine | engineered system | ordered bands and fine lines | graphite / controlled cyan |
| Points | knowledge becoming data | surface breaks into particles | white / theme accents |

These are perceptual states, not six separate loaded scenes.

### Transition strategy

Prefer parameter morphs and particle-shell reveals. If two geometries are necessary, keep both in the same scene and cross-dissolve using a noise threshold so the swap has no obvious opacity fade.

Avoid visible model popping.

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

### Initial load choreography

Use elapsed time for the initial reveal, then blend control into scroll.

| Time | Visual |
|---|---|
| 0.0–0.3s | near-black field, no hard loader flash |
| 0.3–0.8s | a narrow CORE rim becomes visible |
| 0.65–1.15s | MIRAI MUSEUM resolves with slight tracking motion |
| 0.9–1.4s | Japanese name and English line appear |
| 1.25–1.8s | SCROLL TO ENTER appears |
| 1.8s+ | idle breathing state |

The loader, if needed, must visually belong to the opening. Never display a generic spinner.

### Scroll choreography

Scene progress 0.0–0.35:

- CORE stays mostly stable.
- title remains fully readable.
- camera advances imperceptibly.

0.35–0.70:

- SCROLL TO ENTER fades first.
- brand copy moves no more than 24px equivalent.
- CORE surface noise reveals more structure.
- light shifts from pure edge light toward mineral relief.

0.70–1.0:

- brand copy exits with a mask/clip reveal, not a global fade.
- camera moves into the CORE.
- black space becomes surface texture.
- Scene 01 starts before Scene 00 feels fully gone.

### Pointer / touch

Desktop pointer may affect CORE rotation and light vector by a small amount only:

- maximum visual rotation: roughly 2–3°
- no cursor-following blob
- no magnetic text

On touch, use the latest touch position only while the user is actively touching. Never block vertical scroll.

### Sound

Sound is opt-in.

Show a small sound control after the first visual has stabilized. Do not trigger audio playback before a user gesture.

If enabled:

- quiet room tone
- very low CORE resonance
- no voiceover

The page must lose no meaning while muted.

---

## 10. Scene 01 — Scale Shift

Range: 100–360vh.  
Behavior: sticky 100dvh visual stage while the document advances.

This is the technical centerpiece of Phase 1.

The user should feel that one object has become different ways of seeing reality, not that a carousel is switching slides.

### Progress map

| Scene progress | State | Small label | Primary action |
|---|---|---|---|
| 0.00–0.18 | Planet | SPACE | travel along a dark mineral surface |
| 0.18–0.38 | Life | LIFE | relief softens into membrane-like motion |
| 0.38–0.58 | Matter | MATTER | form sharpens into crystal/lattice |
| 0.58–0.79 | Machine | MACHINE | ordered structure appears |
| 0.79–1.00 | Points | — | surface dissolves into point field |

Allow a small overlap around each boundary. There should be no exact instant that reads as a slide cut.

### Labels

SPACE / LIFE / MATTER / MACHINE are museum classification markers, not section headlines.

- small uppercase mono
- subtle numbering may be added later
- never center them like presentation slides
- position should remain calm while the CORE changes

### Planet

- large-scale, slow displacement
- directional grazing light
- camera close enough to make the sphere sometimes read as terrain
- star background extremely restrained

### Life

- decrease hard specular response
- introduce subtle pulse in displacement, not whole-object scaling
- use muted organic color, never bright toxic green
- particulate micro-motion may gather toward the CORE

### Matter

- sharpen normals/facets or blend toward a faceted response
- introduce a controlled lattice motif
- use glints sparsely; no full-screen bloom

### Machine

- transition from irregular lattice to ordered bands/paths
- use fine emissive lines at low intensity
- visual reference is precision instrument, not cyberpunk interface

### Points

- particles inherit positions/colors from the CORE before moving away
- reveal breakup with coherent noise rather than random alpha
- particle field must already prepare the composition used in Scene 02

### Interaction response

Scroll velocity may temporarily:

- increase particle drift by at most a restrained multiplier
- add a tiny camera lag
- add a short energy response to the CORE

When the user stops scrolling, settle smoothly within roughly 500–900ms.

Fast scrolling must not cause flicker between material states.

---

## 11. Scene 02 — Everything Is Connected

Range: 360–520vh.

Scene 02 is the emotional resolution of the opening. It needs more silence than motion.

### Required headline

    すべての学問は、
    つながっている。

English brand statement may appear as a restrained secondary line:

    EVERYTHING IS CONNECTED.

Supporting copy should be no more than two short lines. Recommended:

    宇宙も、生命も、数も、機械も。
    見方を変えれば、同じ世界の一部になる。

Copy can be refined later without changing the scene architecture.

### Background transition

At Scene 02 entry, shift from Obsidian Black to Bone White / ivory.

Do not animate the CSS background independently from the Three scene. The canvas clear color, fog/background treatment, particle color, and DOM color mode must derive from the same normalized transition value.

Target:

- 0.00–0.14: decisive black → bone transition
- 0.10–0.34: headline first line resolves
- 0.25–0.52: second line resolves
- 0.38–0.65: supporting copy arrives
- 0.55–0.85: particles settle into a quiet constellation / latent figure
- 0.85–1.00: hold; prepare handoff to future Scene 03

The background change should feel architectural, like entering another gallery, not like a theme toggle.

### Typography behavior

- use clipping/masking or line reveal
- keep letter opacity close to solid during the reveal
- avoid each-character stagger
- avoid scale-from-90%-to-100% landing-page animation
- large headline should retain generous empty space

### Point field

Scene 01's CORE particles become the background grammar for Scene 02.

They may briefly suggest multiple forms — orbit, cell cluster, lattice, network — but must never become a literal educational infographic.

At the end of Scene 02, leave the point field in a reusable state so Scene 03 can later attract it toward exhibition portals.

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

