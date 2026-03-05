/**
 * Audio asset loading and caching utility.
 *
 * Loads audio files from URLs, decodes them to AudioBuffer using Web Audio API,
 * and caches loaded buffers to avoid redundant fetches.
 */
export class AudioLoader {
  private readonly context: AudioContext;

  private readonly cache: Map<string, AudioBuffer>;

  /**
   * @param context - Web Audio API context for decoding audio data.
   */
  public constructor(context: AudioContext) {
    this.context = context;
    this.cache = new Map();
  }

  /**
   * Load and decode an audio file from a URL.
   *
   * If the file was previously loaded, returns the cached AudioBuffer.
   * Otherwise, fetches the file, decodes it, caches it, and returns the buffer.
   *
   * @param url - URL of the audio file to load (relative or absolute).
   * @returns Promise that resolves to the decoded AudioBuffer.
   * @throws Error if fetch fails or audio decoding fails.
   */
  public async load(url: string): Promise<AudioBuffer> {
    const cached = this.cache.get(url);

    if (cached !== undefined) {
      return cached;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.cache.set(url, audioBuffer);

      return audioBuffer;
    } catch (loadError: unknown) {
      // Wrap error with context and preserve original error information
      const errorMessage = loadError instanceof Error
        ? loadError.message
        : String(loadError);

      const wrappedError = new Error(
        `Failed to load audio from ${url}: ${errorMessage}`,
      );

      throw Object.assign(wrappedError, {
        cause: loadError instanceof Error ? loadError : undefined,
      });
    }
  }

  /**
   * Preload multiple audio files.
   *
   * Loads all URLs in parallel and caches the results. If any load fails,
   * logs an error but continues loading the rest.
   *
   * @param urls - Array of audio file URLs to preload.
   * @returns Promise that resolves when all loads complete (or fail).
   */
  public async preload(urls: string[]): Promise<void> {
    const results = await Promise.allSettled(
      urls.map((url) => this.load(url)),
    );

    // Log failed loads but don't throw
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      if (result.status === "rejected") {
        console.error(`[AudioLoader] Failed to preload ${urls[i]}:`, result.reason);
      }
    }
  }

  /**
   * Clear all cached audio buffers.
   *
   * Useful for memory management if many audio files are loaded and no longer needed.
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if a URL is already cached.
   *
   * @param url - URL to check.
   * @returns True if the audio buffer is cached, false otherwise.
   */
  public isCached(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Get the number of cached audio buffers.
   *
   * @returns Number of cached buffers.
   */
  public getCacheSize(): number {
    return this.cache.size;
  }
}
