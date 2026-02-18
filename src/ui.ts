export class UiView {
  private readonly timeValue: HTMLElement;

  private readonly attemptsValue: HTMLElement;

  private readonly statusMessage: HTMLElement;

  private readonly restartButton: HTMLButtonElement;

  public constructor(
    timeValue: HTMLElement,
    attemptsValue: HTMLElement,
    statusMessage: HTMLElement,
    restartButton: HTMLButtonElement,
  ) {
    this.timeValue = timeValue;
    this.attemptsValue = attemptsValue;
    this.statusMessage = statusMessage;
    this.restartButton = restartButton;
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

  public bindRestart(onRestart: () => void): void {
    this.restartButton.addEventListener("click", onRestart);
  }
}
