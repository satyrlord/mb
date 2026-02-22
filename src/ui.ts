/**
 * HUD view for game-time display updates (time, attempts, status text).
 *
 * Scoped to display output only: the constructor accepts three DOM elements
 * (`timeValue`, `attemptsValue`, `statusMessage`) and exposes setter methods
 * for the controller layer to push updates. No user-input events or
 * interactive element parameters are accepted; all event wiring lives in the
 * bootstrap layer (`src/index.ts`).
 *
 * @remarks
 * Event wiring (restart, keyboard, resize, tile selection) is handled
 * exclusively in the bootstrap layer (`src/index.ts`). Display views must
 * not accept event callbacks or wire interactive behaviour directly.
 */
export class UiView {
  private readonly timeValue: HTMLElement;

  private readonly attemptsValue: HTMLElement;

  private readonly statusMessage: HTMLElement;

  /**
   * @param timeValue - Element whose text content receives the formatted elapsed time.
   * @param attemptsValue - Element whose text content receives the attempt count.
   * @param statusMessage - Element whose text content receives status/win messages.
   */
  public constructor(
    timeValue: HTMLElement,
    attemptsValue: HTMLElement,
    statusMessage: HTMLElement,
  ) {
    this.timeValue = timeValue;
    this.attemptsValue = attemptsValue;
    this.statusMessage = statusMessage;
  }

  public setTime(value: string): void {
    this.timeValue.textContent = value;
  }

  public setAttempts(value: number): void {
    this.attemptsValue.textContent = value.toString();
  }

  public setStatus(message: string): void {
    this.statusMessage.textContent = message;
  }
}
