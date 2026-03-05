import { clamp } from "./utils.js";
import {
  DEFAULT_WIN_FX_TEXT,
  DEFAULT_UI_RUNTIME_CONFIG,
  DEFAULT_WIN_FX_RUNTIME_CONFIG,
  type WinFxRuntimeConfig,
} from "./runtime-config.js";

interface WinFxElements {
  appWindowElement: HTMLElement;
  boardElement: HTMLElement;
  winFxLayerElement: HTMLElement;
  winFxParticlesElement: HTMLElement;
  winFxTextElement: HTMLElement;
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

  private static readonly TITLE_FADE_OUT_MS = 4992;

  private static readonly FIREWORK_BURST_COUNT = 7;

  private static readonly FIREWORK_BURST_INTERVAL_MS = 180;

  private static readonly FIREWORK_SPARKS_PER_BURST = 24;

  private static readonly FIREWORK_CORE_PER_BURST = 6;

  /** Duration of the CSS `win-fx-firework-burst` animation (must match styles.winfx.css). */
  private static readonly FIREWORK_CSS_ANIMATION_MS = 1660;

  /** Time window after the title fades out during which post-fade bursts are spread. */
  private static readonly POST_TITLE_FIREWORK_WINDOW_MS = 1200;

  private static readonly POST_TITLE_FIREWORK_BURSTS = 5;

  // ── Firework spawn-area tuning ──────────────────────────────────────

  /** Inset from area edges for firework spawn X position (fraction of area width). */
  private static readonly FIREWORK_SPAWN_INSET_X = 0.1;

  /** Width of firework spawn zone relative to area width. */
  private static readonly FIREWORK_SPAWN_RANGE_X = 0.8;

  /** Inset from area top for firework spawn Y position (fraction of area height). */
  private static readonly FIREWORK_SPAWN_INSET_Y = 0.1;

  /** Height of firework spawn zone relative to area height. */
  private static readonly FIREWORK_SPAWN_RANGE_Y = 0.5;

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

  private readonly appWindowElement: HTMLElement;

  private readonly boardElement: HTMLElement;

  private readonly winFxLayerElement: HTMLElement;

  private readonly winFxParticlesElement: HTMLElement;

  private readonly winFxTextElement: HTMLElement;

  private generation = 0;

  private cleanupTimeoutId: number | null = null;

  private postFadeTimeoutIds: number[] = [];

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

  public constructor(elements: WinFxElements) {
    this.appWindowElement = elements.appWindowElement;
    this.boardElement = elements.boardElement;
    this.winFxLayerElement = elements.winFxLayerElement;
    this.winFxParticlesElement = elements.winFxParticlesElement;
    this.winFxTextElement = elements.winFxTextElement;
  }

  public clear(): void {
    this.generation += 1;

    if (this.cleanupTimeoutId !== null) {
      window.clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }

    for (const id of this.postFadeTimeoutIds) {
      window.clearTimeout(id);
    }
    this.postFadeTimeoutIds = [];

    this.winFxParticlesElement.style.clipPath = "";

    this.appWindowElement.classList.remove("win-fx-active");
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

  public play(
    onFinished?: () => void,
    textOverride?: string,
    durationOverrideMs?: number,
  ): void {
    this.clear();

    const winFx = this.runtimeConfig.options;

    const generation = this.generation;
    const waveDelayMsUnit = this.scaleDuration(winFx.waveDelayMs);
    const centerFinaleDelayMs = this.scaleDuration(winFx.centerFinaleDelayMs);
    const centerFinaleWaveDelayMs = this.scaleDuration(winFx.centerFinaleWaveDelayMs);
    const appRect = this.appWindowElement.getBoundingClientRect();
    const tileButtons = Array.from(
      this.boardElement.querySelectorAll<HTMLButtonElement>(".tile"),
    );
    const tileStep = Math.max(1, Math.ceil(tileButtons.length / winFx.maxTilePieces));

    // Clip particle canvas to the board area so nothing flies over the topbar or bottombar.
    const boardRect = this.boardElement.getBoundingClientRect();
    const clipTop = Math.max(0, boardRect.top - appRect.top);
    const clipBottom = Math.max(0, appRect.bottom - boardRect.bottom);
    this.winFxParticlesElement.style.clipPath = `inset(${clipTop}px 0 ${clipBottom}px 0)`;

    const nextWinText = textOverride?.trim();
    this.winFxTextElement.textContent = nextWinText !== undefined && nextWinText.length > 0
      ? nextWinText
      : pickWinFxText(this.runtimeConfig.textOptions);
    this.winFxLayerElement.hidden = false;
    this.appWindowElement.classList.add("win-fx-active");

    for (let index = 0; index < tileButtons.length; index += tileStep) {
      const button = tileButtons[index];

      // Guard against potential undefined access if Array.from() somehow includes a sparse index
      // or if the DOM changes between query execution and this loop iteration.
      if (button === undefined) {
        continue;
      }

      const buttonRect = button.getBoundingClientRect();
      const x = buttonRect.left - appRect.left + (buttonRect.width / 2);
      const y = buttonRect.top - appRect.top + (buttonRect.height / 2);

      const symbol =
        button.querySelector<HTMLElement>(".tile-back")?.textContent?.trim()
        ?? WinFxController.DEFAULT_PARTICLE_SYMBOL;

      for (let waveIndex = 0; waveIndex < winFx.wavesPerTile; waveIndex += 1) {
        const waveDelayMs = waveIndex * waveDelayMsUnit;
        const spreadScale = 1 + (waveIndex * 0.22);

        this.winFxParticlesElement.append(
          this.createWinFxPiece(x, y, symbol, false, waveDelayMs, spreadScale),
        );

        for (let sparkIndex = 0; sparkIndex < winFx.sparksPerTile; sparkIndex += 1) {
          this.winFxParticlesElement.append(
            this.createWinFxPiece(x, y, symbol, true, waveDelayMs, spreadScale),
          );
        }
      }
    }

    const centerX = boardRect.left - appRect.left + (boardRect.width / 2);
    const centerY = boardRect.top - appRect.top + (boardRect.height / 2);

    for (let waveIndex = 0; waveIndex < winFx.centerFinaleWaves; waveIndex += 1) {
      const waveDelayMs = centerFinaleDelayMs
        + (waveIndex * centerFinaleWaveDelayMs);
      const spreadScale = 2.2 + (waveIndex * 0.55);

      for (let index = 0; index < winFx.centerFinaleCount; index += 1) {
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
            waveDelayMs,
            spreadScale,
          ),
        );
      }
    }

    for (let index = 0; index < winFx.confettiRainCount; index += 1) {
      this.winFxParticlesElement.append(
        this.createWinFxRainPiece(appRect.width, appRect.height),
      );
    }

    const hasExplicitDurationOverride = typeof durationOverrideMs === "number"
      && Number.isFinite(durationOverrideMs)
      && durationOverrideMs > 0;

    const baseCleanupDurationMs = hasExplicitDurationOverride
      ? Math.round(durationOverrideMs)
      : this.scaleDuration(winFx.durationMs);

    const titleFadeOutDelayMs = this.scaleDuration(WinFxController.TITLE_FADE_OUT_MS);
    const fireworkCssAnimMs = this.scaleDuration(WinFxController.FIREWORK_CSS_ANIMATION_MS);

    // --- Pre-baked firework bursts (CSS animation-delay based) ---
    // These fire during the main animation while particles, text and confetti are visible.
    // End them slightly before the title fades out so there is a brief visual gap
    // before the dedicated post-fade finale begins.
    const scaledBurstIntervalMs = this.scaleDuration(WinFxController.FIREWORK_BURST_INTERVAL_MS);
    const baseBurstCount = WinFxController.FIREWORK_BURST_COUNT;
    const fireworksStartDelayMs = hasExplicitDurationOverride
      ? this.scaleDuration(240)
      : Math.min(titleFadeOutDelayMs, this.scaleDuration(920));
    const fireworksEndDelayMs = hasExplicitDurationOverride
      ? Math.max(fireworksStartDelayMs, baseCleanupDurationMs - this.scaleDuration(320))
      : Math.max(fireworksStartDelayMs, titleFadeOutDelayMs - this.scaleDuration(500));
    const preBakedWindow = fireworksEndDelayMs - fireworksStartDelayMs;
    const dynamicBurstCount = Math.max(
      baseBurstCount,
      preBakedWindow > 0 ? Math.floor(preBakedWindow / scaledBurstIntervalMs) : baseBurstCount,
    );

    // Board-relative bounds for firework spawn (offset from app top-left).
    const boardAreaLeft = boardRect.left - appRect.left;
    const boardAreaTop = boardRect.top - appRect.top;
    const boardAreaWidth = boardRect.width;
    const boardAreaHeight = boardRect.height;

    for (let burstIndex = 0; burstIndex < dynamicBurstCount; burstIndex += 1) {
      const progress = dynamicBurstCount <= 1
        ? 0
        : (burstIndex / (dynamicBurstCount - 1));
      const burstDelayMs = Math.round(
        fireworksStartDelayMs + ((fireworksEndDelayMs - fireworksStartDelayMs) * progress),
      );
      this.createWinFxFireworkBurst(
        boardAreaLeft, boardAreaTop, boardAreaWidth, boardAreaHeight, burstDelayMs,
      );
    }

    // --- Post-fade firework bursts (setTimeout-based) ---
    // These fire AFTER the title text has fully faded out (TITLE_FADE_OUT_MS),
    // delivering a dedicated fireworks-only finale the player can focus on.
    const postFadeStartMs = titleFadeOutDelayMs;
    const postFadeWindowMs = this.scaleDuration(WinFxController.POST_TITLE_FIREWORK_WINDOW_MS);
    const postFadeCount = WinFxController.POST_TITLE_FIREWORK_BURSTS;
    const postFadeSpacingMs = postFadeCount <= 1
      ? 0
      : Math.round(postFadeWindowMs / (postFadeCount - 1));
    const lastPostFadeBurstMs = postFadeStartMs + ((postFadeCount - 1) * postFadeSpacingMs);

    for (let burstIndex = 0; burstIndex < postFadeCount; burstIndex += 1) {
      const scheduledDelayMs = postFadeStartMs + (burstIndex * postFadeSpacingMs);
      const timeoutId = window.setTimeout(() => {
        if (generation !== this.generation) {
          return;
        }
        const freshAppRect = this.appWindowElement.getBoundingClientRect();
        const freshBoardRect = this.boardElement.getBoundingClientRect();
        this.createWinFxFireworkBurst(
          freshBoardRect.left - freshAppRect.left,
          freshBoardRect.top - freshAppRect.top,
          freshBoardRect.width,
          freshBoardRect.height,
          0,
        );
      }, scheduledDelayMs);
      this.postFadeTimeoutIds.push(timeoutId);
    }

    // --- Cleanup ---
    // Must wait until the last post-fade burst's CSS animation has fully played out.
    // Without this, replaceChildren() would remove firework particles mid-animation.
    const minCleanupForPostFade = lastPostFadeBurstMs + fireworkCssAnimMs
      + this.scaleDuration(200);
    const cleanupDurationMs = Math.max(baseCleanupDurationMs, minCleanupForPostFade);

    this.cleanupTimeoutId = window.setTimeout(() => {
      if (generation !== this.generation) {
        return;
      }

      this.appWindowElement.classList.remove("win-fx-active");
      this.winFxLayerElement.hidden = true;
      this.winFxParticlesElement.replaceChildren();
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
    const dy = -40 - Math.random() * verticalUp;
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
  ): void {
    const x = areaX + (areaWidth * WinFxController.FIREWORK_SPAWN_INSET_X) + (Math.random() * areaWidth * WinFxController.FIREWORK_SPAWN_RANGE_X);
    const y = areaY + (areaHeight * WinFxController.FIREWORK_SPAWN_INSET_Y) + (Math.random() * areaHeight * WinFxController.FIREWORK_SPAWN_RANGE_Y);
    const spreadScale = WinFxController.FIREWORK_BASE_SPREAD_SCALE + (Math.random() * WinFxController.FIREWORK_SPREAD_JITTER);

    for (let sparkIndex = 0; sparkIndex < WinFxController.FIREWORK_SPARKS_PER_BURST; sparkIndex += 1) {
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
    }

    for (let coreIndex = 0; coreIndex < WinFxController.FIREWORK_CORE_PER_BURST; coreIndex += 1) {
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
    const confettiRainDelayMs = this.scaleDuration(winFx.confettiRainDelayMs);
    const confettiRainSpreadMs = this.scaleDuration(winFx.confettiRainSpreadMs);
    const delay = confettiRainDelayMs + Math.floor(Math.random() * confettiRainSpreadMs);
    const fallDurationBase = 2444 + Math.floor((heavyBias * 1274) + (Math.random() * 806));
    const colorCycleDurationBase = 910 + Math.floor(Math.random() * 494);
    const twinkleDurationBase = 247 + Math.floor(Math.random() * 221);
    const fallDuration = this.scaleDuration(fallDurationBase);
    const colorCycleDuration = this.scaleDuration(colorCycleDurationBase);
    const twinkleDuration = this.scaleDuration(twinkleDurationBase);
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
    element.style.setProperty("--piece-color-cycle-duration", `${colorCycleDuration}ms`);
    element.style.setProperty("--piece-twinkle-duration", `${twinkleDuration}ms`);
    element.style.setProperty("--piece-opacity", opacity.toFixed(3));
    element.style.setProperty("--piece-scale-end", endScale.toFixed(3));

    return element;
  }

  private scaleDuration(durationMs: number): number {
    return Math.max(1, Math.round(durationMs / this.animationSpeed));
  }
}
