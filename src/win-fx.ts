import { clamp } from "./utils";
import {
  DEFAULT_WIN_FX_TEXT,
  DEFAULT_UI_RUNTIME_CONFIG,
  DEFAULT_WIN_FX_RUNTIME_CONFIG,
  type WinFxRuntimeConfig,
} from "./runtime-config";

interface WinFxElements {
  appWindowElement: HTMLElement;
  winFxLayerElement: HTMLElement;
  winFxParticlesElement: HTMLElement;
  winFxTextElement: HTMLElement;
}

interface WinFxConstructorOptions {
  elements: WinFxElements;
  isHdOn?: boolean;
}

/**
 * Selects a random win text from configured options.
 *
 * Falls back to `DEFAULT_WIN_FX_TEXT` when the list is empty or when a
 * random index lookup yields `undefined`.
 *
 * Note: When a single option is provided, that option will always be
 * selected. To get varied win text, provide multiple options.
 */
const pickWinFxText = (textOptions: readonly string[]): string => {
  if (textOptions.length === 0) {
    return DEFAULT_WIN_FX_TEXT;
  }
  const index = Math.floor(Math.random() * textOptions.length);
  // textOptions[index] is always defined here because index is in [0, length-1].
  // The ?? fallback is unreachable at runtime but satisfies the type checker,
  // which cannot narrow array element access to a non-undefined value.
  return textOptions[index] ?? DEFAULT_WIN_FX_TEXT;
};

export class WinFxController {
  private static readonly SHAPE_CLASS_OPTIONS = ["circle", "square", "diamond", "star"] as const;

  private static readonly DEFAULT_SHAPE_CLASS = "square" as const;

  private static readonly DEFAULT_PARTICLE_SYMBOL = "✦";

  private static readonly CENTER_FINALE_SYMBOL_OPTIONS = [
    WinFxController.DEFAULT_PARTICLE_SYMBOL,
    "★",
  ] as const;

  /** Duration of the CSS `win-fx-firework-burst` animation (must match styles.winfx.css). */
  private static readonly FIREWORK_CSS_ANIMATION_MS = 1660;

  // ── Firework spawn-area tuning ──────────────────────────────────────

  private static readonly FIREWORK_SPARKS_PER_BURST = 24;

  private static readonly FIREWORK_CORE_PER_BURST = 6;

  /** Inset from area edges for firework spawn X position (fraction of area width). */
  private static readonly FIREWORK_SPAWN_INSET_X = 0.1;

  /** Width of firework spawn zone relative to area width. */
  private static readonly FIREWORK_SPAWN_RANGE_X = 0.8;

  /** Inset from area top for firework spawn Y position (fraction of area height). */
  private static readonly FIREWORK_SPAWN_INSET_Y = 0.1;

  /** Height of firework spawn zone relative to area height. */
  private static readonly FIREWORK_SPAWN_RANGE_Y = 0.8;

  /** Base spread scale for firework burst particles. */
  private static readonly FIREWORK_BASE_SPREAD_SCALE = 2.7;

  /** Random spread scale jitter added to the base firework spread. */
  private static readonly FIREWORK_SPREAD_JITTER = 0.8;

  /** Random delay jitter (ms) for individual firework spark particles. */
  private static readonly FIREWORK_SPARK_DELAY_JITTER_MS = 120;

  /** Random delay jitter (ms) for individual firework core particles. */
  private static readonly FIREWORK_CORE_DELAY_JITTER_MS = 80;

  /** Spread scale multiplier for core particles relative to outer sparks. */
  private static readonly FIREWORK_CORE_SPREAD_FACTOR = 0.88;

  /** Delay between consecutive post-text firework bursts. */
  private static readonly FIREWORK_BURST_INTERVAL_MS = 220;

  /** Extra buffer to keep particles visible before final cleanup. */
  private static readonly CLEANUP_BUFFER_MS = 120;

  // ── Screen-level effect tuning ──────────────────────────────────────

  /** Delay before screen flash fires (ms from play start). */
  private static readonly SCREEN_FLASH_DELAY_MS = 0;

  /** Delay before app shake fires after firework phase starts. */
  private static readonly APP_SHAKE_DELAY_MS = 80;

  /** Delay before chroma aberration fires after center finale starts. */
  private static readonly CHROMA_DELAY_MS = 40;

  /** Duration of CSS app-shake animation (must match styles.winfx.css). */
  private static readonly APP_SHAKE_CSS_MS = 520;

  /** Duration of CSS screen-flash animation (must match styles.winfx.css). */
  private static readonly SCREEN_FLASH_CSS_MS = 600;

  /** Duration of CSS chroma animation (must match styles.winfx.css). */
  private static readonly CHROMA_CSS_MS = 900;

  /** Duration of CSS particles pulse animation (must match styles.winfx.css). */
  private static readonly PARTICLES_PULSE_CSS_MS = 800;

  // ── Shimmer dust tuning ──────────────────────────────────────

  private static readonly SHIMMER_DUST_COUNT = 18;

  /** Shimmer dust spawn spread relative to board dimensions. */
  private static readonly SHIMMER_SPREAD_FACTOR = 0.9;

  /** Shimmer dust delay jitter (ms). */
  private static readonly SHIMMER_DELAY_JITTER_MS = 600;

  // ── Rising embers tuning ──────────────────────────────────────

  private static readonly EMBER_COUNT = 12;

  /** Vertical distance embers rise (px). */
  private static readonly EMBER_RISE_DISTANCE = 320;

  /** Horizontal sway range for embers (px). */
  private static readonly EMBER_SWAY_RANGE = 140;

  /** Ember spawn delay jitter (ms). */
  private static readonly EMBER_DELAY_JITTER_MS = 800;

  private readonly appWindowElement: HTMLElement;

  private readonly winFxLayerElement: HTMLElement;

  private readonly winFxParticlesElement: HTMLElement;

  private readonly winFxTextElement: HTMLElement;

  private generation = 0;

  private cleanupTimeoutId: number | null = null;

  private deferredTimeoutIds: number[] = [];

  private animationSpeed = 1;

  private animationSpeedMin = DEFAULT_UI_RUNTIME_CONFIG.animationSpeed.minSpeed;

  private animationSpeedMax = DEFAULT_UI_RUNTIME_CONFIG.animationSpeed.maxSpeed;

  private runtimeConfig: WinFxRuntimeConfig = {
    options: {
      ...DEFAULT_WIN_FX_RUNTIME_CONFIG.options,
      colors: [...DEFAULT_WIN_FX_RUNTIME_CONFIG.options.colors],
    },
    textOptions: [...DEFAULT_WIN_FX_RUNTIME_CONFIG.textOptions],
    rainColors: [...DEFAULT_WIN_FX_RUNTIME_CONFIG.rainColors],
  };

  private isHdOn: boolean;

  public constructor(options: WinFxConstructorOptions) {
    this.appWindowElement = options.elements.appWindowElement;
    this.winFxLayerElement = options.elements.winFxLayerElement;
    this.winFxParticlesElement = options.elements.winFxParticlesElement;
    this.winFxTextElement = options.elements.winFxTextElement;
    this.isHdOn = options.isHdOn ?? true;
  }

  public clear(): void {
    this.generation += 1;

    if (this.cleanupTimeoutId !== null) {
      window.clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }

    for (const id of this.deferredTimeoutIds) {
      window.clearTimeout(id);
    }
    this.deferredTimeoutIds = [];

    this.winFxParticlesElement.style.removeProperty("clipPath");
    this.winFxTextElement.style.removeProperty("--win-fx-text-duration");

    // Remove screen-level effect classes applied during play.
    this.winFxLayerElement.classList.remove("win-fx-flash-active", "win-fx-vignette-active");
    this.appWindowElement.classList.remove("win-fx-shake-active");
    this.winFxParticlesElement.classList.remove(
      "win-fx-chroma-active",
      "win-fx-particles-pulse-active",
    );

    this.winFxLayerElement.hidden = true;
    this.winFxParticlesElement.replaceChildren();
  }

  public setAnimationSpeed(multiplier: number): void {
    this.animationSpeed = clamp(multiplier, this.animationSpeedMin, this.animationSpeedMax);
  }

  public setAnimationSpeedBounds(min: number, max: number): void {
    const nextMin = Math.min(min, max);
    const nextMax = Math.max(min, max);

    this.animationSpeedMin = nextMin;
    this.animationSpeedMax = nextMax;
    this.setAnimationSpeed(this.animationSpeed);
  }

  public configureRuntime(config: WinFxRuntimeConfig): void {
    this.runtimeConfig = {
      options: {
        ...config.options,
        colors: [...config.options.colors],
      },
      textOptions: [...config.textOptions],
      rainColors: [...config.rainColors],
    };
  }

  public setHdMode(hdOn: boolean): void {
    this.isHdOn = hdOn;
  }

  public play(
    onFinished?: () => void,
    textOverride?: string,
    winSoundDurationMs?: number,
  ): void {
    this.clear();

    const winFx = this.runtimeConfig.options;

    const generation = this.generation;
    const appRect = this.appWindowElement.getBoundingClientRect();
    const hasWinSoundDuration = typeof winSoundDurationMs === "number"
      && Number.isFinite(winSoundDurationMs)
      && winSoundDurationMs > 0;
    const baseCleanupDurationMs = hasWinSoundDuration
      ? Math.round(winSoundDurationMs)
      : 0;
    const celebrationTextDurationMs = this.scaleDuration(winFx.textDisplayDurationMs);

    // Bars are opaque with higher z-index (100 vs 90) so no clip path is
    // needed; particles that animate behind a bar are naturally hidden.
    this.winFxParticlesElement.style.removeProperty("clipPath");

    const nextWinText = textOverride?.trim();
    this.winFxTextElement.textContent = nextWinText !== undefined && nextWinText.length > 0
      ? nextWinText
      : pickWinFxText(this.runtimeConfig.textOptions);
    this.winFxTextElement.style.setProperty("--win-fx-text-duration", `${celebrationTextDurationMs}ms`);
    this.winFxLayerElement.hidden = false;

    // Allocate per-phase particle budgets up front so later phases are not
    // starved by earlier ones when maxParticles is low.
    const maxParticles = this.isHdOn ? winFx.maxParticles : winFx.maxParticlesLow;
    const maxParticlesKey = this.isHdOn ? "winFx.maxParticles" : "winFx.maxParticlesLow";
    const fireworkBurstSize = WinFxController.FIREWORK_SPARKS_PER_BURST
      + WinFxController.FIREWORK_CORE_PER_BURST;
    const requiredCenterPieces = winFx.centerFinaleWaves * winFx.centerFinaleCount;
    const requiredFireworkPieces = winFx.fireworkBursts * fireworkBurstSize;
    const requiredConfettiPieces = winFx.confettiRainCount;
    const requiredShimmerPieces = WinFxController.SHIMMER_DUST_COUNT;
    const requiredEmberPieces = WinFxController.EMBER_COUNT;

    let remainingBudget = maxParticles;
    const centerBudget = Math.min(requiredCenterPieces, remainingBudget);
    remainingBudget -= centerBudget;
    const fireworkBudget = Math.min(requiredFireworkPieces, remainingBudget);
    remainingBudget -= fireworkBudget;
    const confettiBudget = Math.min(requiredConfettiPieces, remainingBudget);
    remainingBudget -= confettiBudget;
    const shimmerBudget = Math.min(requiredShimmerPieces, remainingBudget);
    remainingBudget -= shimmerBudget;
    const emberBudget = Math.min(requiredEmberPieces, remainingBudget);

    let centerPiecesCreated = 0;
    let fireworkPiecesCreated = 0;
    let confettiPiecesCreated = 0;
    let shimmerPiecesCreated = 0;
    let emberPiecesCreated = 0;

    const totalRequired = requiredCenterPieces + requiredFireworkPieces
      + requiredConfettiPieces + requiredShimmerPieces + requiredEmberPieces;
    if (totalRequired > maxParticles) {
      console.warn(
        `[MEMORYBLOX] ${maxParticlesKey} is lower than requested celebration pieces; confetti may be reduced to preserve center finale and fireworks.`,
      );
    }

    // ── Phase 1 — Confetti Rain (after text appears) ────────────────
    const confettiRainDelayMs = this.scaleDuration(winFx.confettiRainDelayMs);
    {
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        const freshAppRect = this.appWindowElement.getBoundingClientRect();
        for (let index = 0; index < confettiBudget; index += 1) {
          if (confettiPiecesCreated >= confettiBudget) {
            break;
          }
          this.winFxParticlesElement.append(
            this.createWinFxRainPiece(freshAppRect.width, freshAppRect.height),
          );
          confettiPiecesCreated += 1;
        }
      }, confettiRainDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // ── Phase 2 — Center Finale Bouquet ─────────────────────────────
    const centerFinaleStartDelayMs = confettiRainDelayMs + this.scaleDuration(winFx.centerFinaleDelayMs);
    const centerFinaleWaveDelayMs = this.scaleDuration(winFx.centerFinaleWaveDelayMs);
    const centerX = appRect.width / 2;
    const centerY = appRect.height / 2;

    for (let waveIndex = 0; waveIndex < winFx.centerFinaleWaves; waveIndex += 1) {
      const waveDelayMs = centerFinaleStartDelayMs
        + (waveIndex * centerFinaleWaveDelayMs);
      const spreadScale = 2.2 + (waveIndex * 0.55);

      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        for (let index = 0; index < winFx.centerFinaleCount; index += 1) {
          if (centerPiecesCreated >= centerBudget) {
            break;
          }
          const spark = index % 2 === 0;
          const symbol = spark
            ? ""
            : this.pickRandomSymbol(
              WinFxController.CENTER_FINALE_SYMBOL_OPTIONS,
              WinFxController.DEFAULT_PARTICLE_SYMBOL,
            );

          this.winFxParticlesElement.append(
            this.createWinFxPiece(
              centerX,
              centerY,
              symbol,
              spark,
              0,
              spreadScale,
            ),
          );
          centerPiecesCreated += 1;
        }
      }, waveDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // ── Phase 3 — Fireworks after text disappears ───────────────────
    const centerFinaleWindowMs = centerFinaleStartDelayMs
      + ((Math.max(0, winFx.centerFinaleWaves - 1)) * centerFinaleWaveDelayMs);
    const fireworkDelayMs = Math.max(celebrationTextDurationMs, centerFinaleWindowMs);
    const fireworkBurstIntervalMs = this.scaleDuration(WinFxController.FIREWORK_BURST_INTERVAL_MS);
    for (let burstIndex = 0; burstIndex < winFx.fireworkBursts; burstIndex += 1) {
      const burstDelayMs = fireworkDelayMs + (burstIndex * fireworkBurstIntervalMs);
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        const freshAppRect = this.appWindowElement.getBoundingClientRect();
        const allowed = Math.min(fireworkBurstSize, fireworkBudget - fireworkPiecesCreated);
        if (allowed <= 0) {
          return;
        }

        this.createWinFxFireworkBurst(
          0,
          0,
          freshAppRect.width,
          freshAppRect.height,
          0,
          allowed,
        );
        fireworkPiecesCreated += allowed;
      }, burstDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // ── Phase 4 — Shimmer Dust (during firework phase) ──────────────
    {
      const shimmerDelayMs = fireworkDelayMs;
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        const freshAppRect = this.appWindowElement.getBoundingClientRect();
        for (let index = 0; index < shimmerBudget; index += 1) {
          if (shimmerPiecesCreated >= shimmerBudget) {
            break;
          }
          this.winFxParticlesElement.append(
            this.createShimmerDustPiece(
              0, 0,
              freshAppRect.width,
              freshAppRect.height,
            ),
          );
          shimmerPiecesCreated += 1;
        }
      }, shimmerDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // ── Phase 5 — Rising Embers (during firework phase) ─────────────
    {
      const emberDelayMs = fireworkDelayMs + this.scaleDuration(200);
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        const freshAppRect = this.appWindowElement.getBoundingClientRect();
        for (let index = 0; index < emberBudget; index += 1) {
          if (emberPiecesCreated >= emberBudget) {
            break;
          }
          this.winFxParticlesElement.append(
            this.createRisingEmberPiece(
              0, 0,
              freshAppRect.width,
              freshAppRect.height,
            ),
          );
          emberPiecesCreated += 1;
        }
      }, emberDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // ── Screen-level effects ────────────────────────────────────────

    // Flash at T=0 (immediate gold flash on play start).
    {
      const flashDelayMs = this.scaleDuration(WinFxController.SCREEN_FLASH_DELAY_MS);
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        this.winFxLayerElement.classList.add("win-fx-flash-active");
        // Auto-remove after CSS animation completes.
        const removeId = window.setTimeout(() => {
          this.winFxLayerElement.classList.remove("win-fx-flash-active");
        }, this.scaleDuration(WinFxController.SCREEN_FLASH_CSS_MS));
        this.deferredTimeoutIds.push(removeId);
      }, flashDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // Vignette (appears with text, stays through celebration).
    this.winFxLayerElement.classList.add("win-fx-vignette-active");

    // App shake at first firework burst.
    {
      const shakeDelayMs = fireworkDelayMs
        + this.scaleDuration(WinFxController.APP_SHAKE_DELAY_MS);
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        this.appWindowElement.classList.add("win-fx-shake-active");
        const removeId = window.setTimeout(() => {
          this.appWindowElement.classList.remove("win-fx-shake-active");
        }, this.scaleDuration(WinFxController.APP_SHAKE_CSS_MS));
        this.deferredTimeoutIds.push(removeId);
      }, shakeDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // Chromatic aberration on particles container at center finale.
    {
      const chromaDelayMs = centerFinaleStartDelayMs
        + this.scaleDuration(WinFxController.CHROMA_DELAY_MS);
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        this.winFxParticlesElement.classList.add("win-fx-chroma-active");
        const removeId = window.setTimeout(() => {
          this.winFxParticlesElement.classList.remove("win-fx-chroma-active");
        }, this.scaleDuration(WinFxController.CHROMA_CSS_MS));
        this.deferredTimeoutIds.push(removeId);
      }, chromaDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // Particles container pulse at firework start.
    {
      const pulseDelayMs = fireworkDelayMs;
      const timeoutId = window.setTimeout(() => {
        /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
        if (generation !== this.generation) {
          return;
        }
        this.winFxParticlesElement.classList.add("win-fx-particles-pulse-active");
        const removeId = window.setTimeout(() => {
          this.winFxParticlesElement.classList.remove("win-fx-particles-pulse-active");
        }, this.scaleDuration(WinFxController.PARTICLES_PULSE_CSS_MS));
        this.deferredTimeoutIds.push(removeId);
      }, pulseDelayMs);
      this.deferredTimeoutIds.push(timeoutId);
    }

    // ── Cleanup ───────────────────────────────────────────────────────
    const fireworkCssAnimMs = this.scaleDuration(WinFxController.FIREWORK_CSS_ANIMATION_MS);
    const fireworkWindowMs = winFx.fireworkBursts > 0
      ? fireworkDelayMs
        + ((winFx.fireworkBursts - 1) * fireworkBurstIntervalMs)
        + fireworkCssAnimMs
        + this.scaleDuration(WinFxController.CLEANUP_BUFFER_MS)
      : 0;
    const minPhaseWindowMs = Math.max(confettiRainDelayMs, centerFinaleStartDelayMs);
    const cleanupDurationMs = Math.max(
      baseCleanupDurationMs,
      celebrationTextDurationMs,
      fireworkWindowMs,
      minPhaseWindowMs + this.scaleDuration(WinFxController.CLEANUP_BUFFER_MS),
    );

    this.cleanupTimeoutId = window.setTimeout(() => {
      /* v8 ignore next 3 -- defensive: clear() cancels this timeout before it fires */
      if (generation !== this.generation) {
        return;
      }

      this.winFxLayerElement.hidden = true;
      this.winFxParticlesElement.replaceChildren();
      this.winFxTextElement.style.removeProperty("--win-fx-text-duration");
      this.winFxLayerElement.classList.remove("win-fx-flash-active", "win-fx-vignette-active");
      this.appWindowElement.classList.remove("win-fx-shake-active");
      this.winFxParticlesElement.classList.remove(
        "win-fx-chroma-active",
        "win-fx-particles-pulse-active",
      );
      this.cleanupTimeoutId = null;
      onFinished?.();
    }, cleanupDurationMs);
  }

  /**
   * Picks a random color from `palette`, falling back to a safe default white when the
   * palette is empty or when random selection yields an undefined value.
   */
  private static readonly FALLBACK_COLOR = "#ffffff" as const;

  private static pickRandomColor(palette: readonly string[]): string {
    if (palette.length === 0) {
      return WinFxController.FALLBACK_COLOR;
    }
    // Use nullish coalescing to guard against undefined elements in sparse arrays.
    // This ensures we always return a valid color string, falling back to FALLBACK_COLOR
    // if the randomly selected index returns undefined.
    return palette[Math.floor(Math.random() * palette.length)] ?? WinFxController.FALLBACK_COLOR;
  }

  private pickShapeClass(): "circle" | "square" | "diamond" | "star" {
    const shapeClassIndex = Math.floor(Math.random() * WinFxController.SHAPE_CLASS_OPTIONS.length);
    return WinFxController.SHAPE_CLASS_OPTIONS[shapeClassIndex]
      ?? WinFxController.DEFAULT_SHAPE_CLASS;
  }

  private pickRandomSymbol(options: readonly string[], fallback: string): string {
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex] ?? fallback;
  }

  private createWinFxPiece(
    x: number,
    y: number,
    symbol: string,
    spark: boolean,
    waveDelayMs: number,
    spreadScale: number,
    additionalClassName = "",
  ): HTMLElement {
    const element = document.createElement("span");
    element.className = spark ? "win-fx-piece win-fx-spark" : "win-fx-piece";

    if (additionalClassName.length > 0) {
      for (const className of additionalClassName.split(/\s+/u)) {
        if (className.length > 0) {
          element.classList.add(className);
        }
      }
    }

    const shapeClass = this.pickShapeClass();
    element.classList.add(`win-fx-${shapeClass}`);
    element.textContent = spark
      ? ""
      : this.pickRandomSymbol(
        [
          symbol,
          WinFxController.DEFAULT_PARTICLE_SYMBOL,
          WinFxController.DEFAULT_PARTICLE_SYMBOL,
        ],
        WinFxController.DEFAULT_PARTICLE_SYMBOL,
      );

    const hue = Math.floor(Math.random() * 360);
    const size = spark
      ? 7 + Math.floor(Math.random() * 6)
      : 28 + Math.floor(Math.random() * 16);
    const horizontalSpread = (spark ? 320 : 260) * spreadScale;
    const verticalUp = (spark ? 520 : 430) * spreadScale;

    const dx = (Math.random() - 0.5) * horizontalSpread;
    const dySign = Math.random() < 0.5 ? -1 : 1;
    const dy = dySign * (40 + Math.random() * verticalUp);
    const rotation = `${Math.floor((Math.random() - 0.5) * 900)}deg`;
    const drift = `${Math.floor((Math.random() - 0.5) * 160)}px`;
    const gravity = `${Math.floor(190 + (Math.random() * 380))}px`;
    const endScale = spark ? "0.18" : "0.26";
    const winFx = this.runtimeConfig.options;
    const colors =
      winFx.colors.length > 0
        ? winFx.colors
        : DEFAULT_WIN_FX_RUNTIME_CONFIG.options.colors;
    const color = WinFxController.pickRandomColor(colors);

    element.style.setProperty("--piece-hue", hue.toString());
    element.style.setProperty("--piece-color", color);
    element.style.setProperty("--piece-size", `${size}px`);
    element.style.setProperty("--piece-x", `${x}px`);
    element.style.setProperty("--piece-y", `${y}px`);
    element.style.setProperty("--piece-dx", `${dx}px`);
    element.style.setProperty("--piece-dy", `${dy}px`);
    element.style.setProperty("--piece-drift", drift);
    element.style.setProperty("--piece-gravity", gravity);
    element.style.setProperty("--piece-scale-end", endScale);
    element.style.setProperty("--piece-rot", rotation);
    const jitterMs = this.scaleDuration(winFx.particleDelayJitterMs);
    const pieceDelayMs = waveDelayMs + Math.floor(Math.random() * jitterMs);
    element.style.setProperty("--piece-delay", `${pieceDelayMs}ms`);

    return element;
  }

  private createWinFxFireworkBurst(
    areaX: number,
    areaY: number,
    areaWidth: number,
    areaHeight: number,
    burstDelayMs: number,
    allowedParticles: number,
  ): void {
    const x = areaX + (areaWidth * WinFxController.FIREWORK_SPAWN_INSET_X) + (Math.random() * areaWidth * WinFxController.FIREWORK_SPAWN_RANGE_X);
    const y = areaY + (areaHeight * WinFxController.FIREWORK_SPAWN_INSET_Y) + (Math.random() * areaHeight * WinFxController.FIREWORK_SPAWN_RANGE_Y);
    const spreadScale = WinFxController.FIREWORK_BASE_SPREAD_SCALE + (Math.random() * WinFxController.FIREWORK_SPREAD_JITTER);

    let created = 0;

    for (let sparkIndex = 0; sparkIndex < WinFxController.FIREWORK_SPARKS_PER_BURST; sparkIndex += 1) {
      if (created >= allowedParticles) {
        return;
      }
      const piece = this.createWinFxPiece(
        x,
        y,
        "",
        true,
        burstDelayMs + Math.floor(Math.random() * WinFxController.FIREWORK_SPARK_DELAY_JITTER_MS),
        spreadScale,
        "win-fx-firework",
      );
      this.winFxParticlesElement.append(piece);
      created += 1;
    }

    for (let coreIndex = 0; coreIndex < WinFxController.FIREWORK_CORE_PER_BURST; coreIndex += 1) {
      if (created >= allowedParticles) {
        return;
      }
      const piece = this.createWinFxPiece(
        x,
        y,
        this.pickRandomSymbol(["✶", "✹", "★"], "✶"),
        false,
        burstDelayMs + Math.floor(Math.random() * WinFxController.FIREWORK_CORE_DELAY_JITTER_MS),
        spreadScale * WinFxController.FIREWORK_CORE_SPREAD_FACTOR,
        "win-fx-firework win-fx-firework-core",
      );
      this.winFxParticlesElement.append(piece);
      created += 1;
    }
  }

  private createWinFxRainPiece(
    appWidth: number,
    appHeight: number,
  ): HTMLElement {
    const element = document.createElement("span");
    element.className = "win-fx-piece win-fx-fall";

    const shapeClass = this.pickShapeClass();
    element.classList.add(`win-fx-${shapeClass}`);

    const size = 11 + Math.floor(Math.random() * 18);
    const x = Math.random() * appWidth;
    const y = -20 - Math.floor(Math.random() * 120);
    const sizeRatio = (size - 11) / 17;
    const heavyBias = sizeRatio * sizeRatio;
    const fallSpeedScale = (0.58 + (Math.random() * 0.36)) - (heavyBias * 0.25);
    const spinScale = (0.52 + (Math.random() * 0.45)) - (heavyBias * 0.32);
    const dx = `${Math.floor((Math.random() - 0.5) * 240 * fallSpeedScale)}px`;
    const dy = `${Math.floor((appHeight + 220 + Math.floor(Math.random() * 120)) * fallSpeedScale)}px`;
    const rotation = `${Math.floor((Math.random() - 0.5) * 1440 * spinScale)}deg`;
    const rainColors = this.runtimeConfig.rainColors;
    const color = WinFxController.pickRandomColor(rainColors);
    const winFx = this.runtimeConfig.options;
    const confettiRainSpreadMs = this.scaleDuration(winFx.confettiRainSpreadMs);
    const delay = Math.floor(Math.random() * confettiRainSpreadMs);
    const fallDurationBase = 2444 + Math.floor((heavyBias * 1274) + (Math.random() * 806));
    const fallDuration = this.scaleDuration(fallDurationBase);
    const opacity = 0.62 + ((1 - heavyBias) * 0.34);
    const endScale = 0.34 + ((1 - heavyBias) * 0.22);

    element.style.setProperty("--piece-color", color);
    element.style.setProperty("--piece-size", `${size}px`);
    element.style.setProperty("--piece-x", `${x}px`);
    element.style.setProperty("--piece-y", `${y}px`);
    element.style.setProperty("--piece-dx", dx);
    element.style.setProperty("--piece-dy", dy);
    element.style.setProperty("--piece-rot", rotation);
    element.style.setProperty("--piece-delay", `${delay}ms`);
    element.style.setProperty("--piece-fall-duration", `${fallDuration}ms`);
    element.style.setProperty("--piece-opacity", opacity.toFixed(3));
    element.style.setProperty("--piece-scale-end", endScale.toFixed(3));

    return element;
  }

  private createShimmerDustPiece(
    areaX: number,
    areaY: number,
    areaWidth: number,
    areaHeight: number,
  ): HTMLElement {
    const element = document.createElement("span");
    element.className = "win-fx-piece win-fx-shimmer";

    const size = 3 + Math.floor(Math.random() * 3);
    const spreadW = areaWidth * WinFxController.SHIMMER_SPREAD_FACTOR;
    const spreadH = areaHeight * WinFxController.SHIMMER_SPREAD_FACTOR;
    const x = areaX + ((areaWidth - spreadW) / 2) + (Math.random() * spreadW);
    const y = areaY + ((areaHeight - spreadH) / 2) + (Math.random() * spreadH);
    const dx = (Math.random() - 0.5) * 60;
    const dy = (Math.random() - 0.5) * 60;

    const winFx = this.runtimeConfig.options;
    const colors =
      winFx.colors.length > 0
        ? winFx.colors
        : DEFAULT_WIN_FX_RUNTIME_CONFIG.options.colors;
    const color = WinFxController.pickRandomColor(colors);
    const delay = Math.floor(
      Math.random() * this.scaleDuration(WinFxController.SHIMMER_DELAY_JITTER_MS),
    );

    element.style.setProperty("--piece-color", color);
    element.style.setProperty("--piece-size", `${size}px`);
    element.style.setProperty("--piece-x", `${x}px`);
    element.style.setProperty("--piece-y", `${y}px`);
    element.style.setProperty("--piece-dx", `${dx}px`);
    element.style.setProperty("--piece-dy", `${dy}px`);
    element.style.setProperty("--piece-delay", `${delay}ms`);

    return element;
  }

  private static readonly EMBER_COLORS = ["#ff6b35", "#ffa62d", "#fcff42", "#ff5e3a"] as const;

  private createRisingEmberPiece(
    areaX: number,
    areaY: number,
    areaWidth: number,
    areaHeight: number,
  ): HTMLElement {
    const element = document.createElement("span");
    element.className = "win-fx-piece win-fx-ember";

    const size = 3 + Math.floor(Math.random() * 4);
    const x = areaX + (Math.random() * areaWidth);
    const y = areaY + (areaHeight * 0.5) + (Math.random() * areaHeight * 0.5);
    const dx = (Math.random() - 0.5) * WinFxController.EMBER_SWAY_RANGE;
    const dy = -(WinFxController.EMBER_RISE_DISTANCE * (0.6 + Math.random() * 0.4));
    const color = WinFxController.pickRandomColor(WinFxController.EMBER_COLORS);
    const delay = Math.floor(
      Math.random() * this.scaleDuration(WinFxController.EMBER_DELAY_JITTER_MS),
    );

    element.style.setProperty("--piece-color", color);
    element.style.setProperty("--piece-size", `${size}px`);
    element.style.setProperty("--piece-x", `${x}px`);
    element.style.setProperty("--piece-y", `${y}px`);
    element.style.setProperty("--piece-dx", `${dx}px`);
    element.style.setProperty("--piece-dy", `${dy}px`);
    element.style.setProperty("--piece-delay", `${delay}ms`);

    return element;
  }

  private scaleDuration(durationMs: number): number {
    return Math.max(1, Math.round(durationMs / this.animationSpeed));
  }
}
