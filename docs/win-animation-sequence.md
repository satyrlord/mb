# Win Animation Sequence

Full timeline of the MEMORYBLOX win celebration animation as
orchestrated by `WinSequenceController.play()` in `src/win-sequence-controller.ts`,
which performs the board fade handoff and then delegates the particle/text
celebration to `WinFxController.play()` in `src/win-fx.ts`.

All timings shown at **1x animation speed**. Divide by the speed
multiplier for 2x / 3x values.

> **Note:** Numeric values below are symbolic references to
> `config/win-fx.cfg` keys and `WinFxController` constants.
> See the Configuration Reference at the bottom for the
> current defaults. Actual timings depend on those values.

---

## Timeline Overview

```text
T                                    Event
---                                  --------------------------
0                                    Matched-pair pause + disappear window begins
matchedDisappearPauseMs +
matchedDisappearDurationMs            Active game canvas fades out
matchedDisappearPauseMs +
matchedDisappearDurationMs +
winCanvasFadeDurationMs              Win text appears (bounce-in + glow pulse)
matchedDisappearPauseMs +
matchedDisappearDurationMs +
winCanvasFadeDurationMs              Win sound starts (same tick as text when available)
matchedDisappearPauseMs +
matchedDisappearDurationMs +
winCanvasFadeDurationMs              Screen flash (gold overlay)
matchedDisappearPauseMs +
matchedDisappearDurationMs +
winCanvasFadeDurationMs              Vignette overlay appears
celebrationStart + confettiRainDelayMs  Phase 1 — Confetti rain
celebrationStart + confettiRainDelayMs +
centerFinaleDelayMs                  Phase 2 — Center finale bouquet
celebrationStart + confettiRainDelayMs +
centerFinaleDelayMs + CHROMA_DELAY_MS  Chroma aberration
celebrationStart + textDisplayDurationMs  Phase 3 — Firework bursts begin (post-text)
celebrationStart + textDisplayDurationMs  Phase 4 — Shimmer dust spawns
celebrationStart + textDisplayDurationMs + APP_SHAKE_DELAY_MS  App shake
celebrationStart + textDisplayDurationMs  Particles pulse
celebrationStart + textDisplayDurationMs + 200  Phase 5 — Rising embers spawn
max(winSoundDurationMs, firework window)
after celebrationStart               Cleanup — particles removed, classes reset
```

---

## Phase Details

### Pre-Celebration Handoff

Before any particle/text effect starts, `WinSequenceController` waits for the
matched-pair disappearance window to complete, then fades out the active game
canvas (`gameFrame` or `debugTilesFrame`) using the runtime-configured
`gameplay.winCanvasFadeDurationMs` value.

- **Tile animation window**: `matchedDisappearPauseMs + matchedDisappearDurationMs`
- **Canvas fade**: `winCanvasFadeDurationMs`
- **Abort behavior**: the sequence is cancelled if the active game changes or
  the controller is cleared during either timeout stage.

### Phase 0 — Text + Sound (celebrationStart)

- **Win text display** — Duration: `textDisplayDurationMs`;
  `win-fx-title-display` (bounce-in: scale 0.3 → 1.08 → 0.96 →
  1.02 → 1), visible immediately
- **Win text glow pulse** — Secondary looping animation
  `win-fx-text-glow-pulse` on `.win-fx-text`
- **Win sound** — Duration: WAV/asset duration;
  Started by `soundManager.playWin()` callback

`WinSequenceController` starts win text and win sound on the same tick after
the canvas-fade handoff completes. The sound callback passes the resolved sound
duration into `WinFxController.play(...)`, which writes it to
`--win-fx-text-duration`.

If no win sound is available, `WinSequenceController` still starts the visual
celebration through the fallback path so the user does not lose the win text or
particles.

### Phase 1 — Confetti Rain

Colored pieces fall from above the viewport with physics-based
sizing. Created lazily via `setTimeout` at the rain start delay.

- **Start delay**: `confettiRainDelayMs`
- **Spread window**: `confettiRainSpreadMs`
- **Piece count**: `confettiRainCount`
- **Size range**: 11-29 px (11 + random 0-18)
- **Fall duration**: Biased by heavyBias
- **Opacity**: Inverse to heavyBias

CSS animation: `win-fx-confetti-fall`.

### Phase 2 — Center Finale Bouquet

Dense burst from the center of the board. Multiple waves of
alternating sparks and symbol particles.

- **Start delay**: `confettiRainDelayMs + centerFinaleDelayMs`
- **Waves**: `centerFinaleWaves`
- **Wave spacing**: `centerFinaleWaveDelayMs`
- **Per wave**: `centerFinaleCount`
- **Spread scale**: 2.2 + (wave × 0.55)
- **Total**: waves × count

Symbols alternate: even indices are sparks, odd
indices use special characters.

### Phase 3 — Firework Bursts

Firework bursts spawn after the congratulations text disappears.
Each burst is scheduled lazily via `setTimeout`.

- **Start**: `textDisplayDurationMs` after win text appears
- **Burst count**: `fireworkBursts`
- **Sparks per burst**: `FIREWORK_SPARKS_PER_BURST`
- **Core per burst**: `FIREWORK_CORE_PER_BURST`
- **Burst spacing**: `FIREWORK_BURST_INTERVAL_MS`
- **Total**: `fireworkBursts × (sparks + core)`

Spawn area: 10-90% of board width, 10-60% of board height.
Spread scale: `FIREWORK_BASE_SPREAD_SCALE` ±
`FIREWORK_SPREAD_JITTER`.
Spark delay jitter: ± `FIREWORK_SPARK_DELAY_JITTER_MS`.
Core delay jitter: ± `FIREWORK_CORE_DELAY_JITTER_MS`.

CSS animation: `win-fx-firework-burst`
(`FIREWORK_CSS_ANIMATION_MS`).
Core particles also play a secondary `sparkle-twinkle` animation.

### Phase 4 — Shimmer Dust

Small twinkling particles scattered across the board area during
the firework phase. Adds ambient sparkle without significant
performance cost.

- **Start**: same as firework phase (`textDisplayDurationMs`)
- **Count**: `SHIMMER_DUST_COUNT` (18)
- **Size range**: 3-5 px
- **Spread**: `SHIMMER_SPREAD_FACTOR` (0.9) of board dimensions
- **Delay jitter**: `SHIMMER_DELAY_JITTER_MS` (600 ms)
- **Movement**: ± 30 px horizontal and vertical drift

CSS animation: `win-fx-shimmer-drift`.
CSS class: `.win-fx-shimmer`.

### Phase 5 — Rising Embers

Warm-colored particles that rise upward from the lower half of
the board, simulating heat embers from the firework explosions.

- **Start**: firework phase + 200 ms
- **Count**: `EMBER_COUNT` (12)
- **Size range**: 3-7 px
- **Rise distance**: `EMBER_RISE_DISTANCE` (320 px)
- **Sway range**: `EMBER_SWAY_RANGE` (140 px)
- **Delay jitter**: `EMBER_DELAY_JITTER_MS` (800 ms)
- **Colors**: Fixed warm palette (`#ff6b35`, `#ffa62d`,
  `#fcff42`, `#ff5e3a`)

CSS animation: `win-fx-ember-rise`.
CSS class: `.win-fx-ember`.

### Screen-Level Effects

These effects use CSS classes on existing container elements
(no new DOM elements) for zero-allocation visual impact.

- **Screen flash** — Gold `::before` overlay on `winFxLayerElement`.
  Fires at T = `SCREEN_FLASH_DELAY_MS` (0 ms). Auto-removes
  after `SCREEN_FLASH_CSS_MS` (600 ms).
  Class: `.win-fx-flash-active`.
- **Vignette** — Dark radial `::after` overlay on
  `winFxLayerElement`. Applied immediately on `play()`, stays
  through celebration. Uses `win-fx-vignette-fade` keyframe.
  Class: `.win-fx-vignette-active`.
- **App shake** — CSS keyframe shake on `appWindowElement`.
  Starts at first firework burst + `APP_SHAKE_DELAY_MS` (80 ms).
  Auto-removes after `APP_SHAKE_CSS_MS` (520 ms).
  Class: `.win-fx-shake-active`.
- **Chroma aberration** — RGB text-shadow shimmer on
  `winFxParticlesElement`. Fires at center finale +
  `CHROMA_DELAY_MS` (40 ms). Auto-removes after
  `CHROMA_CSS_MS` (900 ms).
  Class: `.win-fx-chroma-active`.
- **Particles pulse** — Scale pulse on `winFxParticlesElement`.
  Fires at firework start. Auto-removes after
  `PARTICLES_PULSE_CSS_MS` (800 ms).
  Class: `.win-fx-particles-pulse-active`.

### Cleanup

Computed as `max(winSoundDurationMs, firework window,
phase-start window + CLEANUP_BUFFER_MS)` after the celebration handoff begins.

Actions at cleanup:

1. Hide the `win-fx-layer`
2. `replaceChildren()` — batch-remove all particle DOM elements
3. Remove screen-level effect classes (`win-fx-flash-active`,
   `win-fx-vignette-active`, `win-fx-shake-active`,
   `win-fx-chroma-active`, `win-fx-particles-pulse-active`)
4. Fire `onFinished` callback (typically shows the menu)

---

## Global Particle Limit

A hard cap is enforced across all phases. When HD mode is on,
`winFx.maxParticles` is used; when HD mode is off,
`winFx.maxParticlesLow` is used instead. Each phase checks the
running count before creating new elements and stops early if
the limit is reached.

## Particle Count Summary

Totals depend on current `config/win-fx.cfg` values:

- **Confetti rain**: `confettiRainCount`
- **Center finale**: `centerFinaleWaves` × `centerFinaleCount`
- **Firework bursts**: `fireworkBursts × (FIREWORK_SPARKS_PER_BURST + FIREWORK_CORE_PER_BURST)`
- **Shimmer dust**: `SHIMMER_DUST_COUNT` (18)
- **Rising embers**: `EMBER_COUNT` (12)

All phases use lazy `setTimeout`-based creation to spread DOM
insertion over time and avoid a heavy layout spike.

---

## Configuration Reference

Runtime-configurable values (`config/win-fx.cfg`):

- `winFx.textDisplayDurationMs` — Win text visibility duration before fireworks
- `winFx.maxParticles` — Global particle cap across all phases (HD-on)
- `winFx.maxParticlesLow` — Global particle cap when HD mode is off
  (low-performance / mobile fallback)
- `winFx.particleDelayJitterMs` — Random delay jitter per particle
- `winFx.centerFinaleDelayMs` — Delay before center finale starts
- `winFx.centerFinaleWaves` — Number of center finale waves
- `winFx.centerFinaleWaveDelayMs` — Delay between center finale waves
- `winFx.centerFinaleCount` — Particles per center finale wave
- `winFx.confettiRainDelayMs` — Delay before confetti rain starts
- `winFx.confettiRainCount` — Number of confetti rain pieces
- `winFx.confettiRainSpreadMs` — Time window over which rain pieces are spread
- `winFx.fireworkBursts` — Number of post-text firework bursts
- `winFx.colors` — Particle color palette (comma-separated hex)
- `winFx.textOptions` — Win text variations (comma-separated)
- `winFx.rainColors` — Confetti rain color palette (comma-separated hex)

Hardcoded constants in `WinFxController` (`src/win-fx.ts`):

- `FIREWORK_SPARKS_PER_BURST` — Outer spark particles per firework burst
- `FIREWORK_CORE_PER_BURST` — Core symbol particles per firework burst
- `FIREWORK_CSS_ANIMATION_MS` — Duration of `win-fx-firework-burst` CSS animation
- `FIREWORK_BASE_SPREAD_SCALE` — Base spread radius for firework particles
- `FIREWORK_SPREAD_JITTER` — Random jitter added to spread scale
- `FIREWORK_SPARK_DELAY_JITTER_MS` — Per-spark random delay jitter
- `FIREWORK_CORE_DELAY_JITTER_MS` — Per-core random delay jitter
- `FIREWORK_CORE_SPREAD_FACTOR` — Core spread multiplier relative to sparks
- `FIREWORK_BURST_INTERVAL_MS` — Delay between consecutive firework bursts
- `CLEANUP_BUFFER_MS` — Safety buffer before cleanup
- `SHIMMER_DUST_COUNT` — Number of shimmer dust particles
- `SHIMMER_SPREAD_FACTOR` — Shimmer spread relative to board size
- `SHIMMER_DELAY_JITTER_MS` — Per-shimmer random delay jitter
- `EMBER_COUNT` — Number of rising ember particles
- `EMBER_RISE_DISTANCE` — Vertical rise distance for embers (px)
- `EMBER_SWAY_RANGE` — Horizontal sway range for embers (px)
- `EMBER_DELAY_JITTER_MS` — Per-ember random delay jitter
- `SCREEN_FLASH_DELAY_MS` — Delay before screen flash fires
- `SCREEN_FLASH_CSS_MS` — Duration of screen flash CSS animation
- `APP_SHAKE_DELAY_MS` — Delay before app shake fires
- `APP_SHAKE_CSS_MS` — Duration of app shake CSS animation
- `CHROMA_DELAY_MS` — Delay before chroma aberration fires
- `CHROMA_CSS_MS` — Duration of chroma aberration CSS animation
- `PARTICLES_PULSE_CSS_MS` — Duration of particles pulse CSS animation
