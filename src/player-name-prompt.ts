import { sanitizePlayerName } from "./utils";

const PLAYER_NAME_STORAGE_KEY = "memoryblox-player-name";

export const readStoredPlayerName = (): string | null => {
  const value = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const writeStoredPlayerName = (name: string): void => {
  window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
};

export interface PlayerNamePromptElements {
  overlay: HTMLElement;
  input: HTMLInputElement;
  okButton: HTMLButtonElement;
}

export interface PlayerNamePromptDeps {
  elements: PlayerNamePromptElements;
  getFadeOutMs: () => number;
}

export class PlayerNamePrompt {
  private readonly elements: PlayerNamePromptElements;
  private readonly getFadeOutMs: () => number;
  private pendingResolve: ((name: string) => void) | null = null;
  private pendingCleanup: (() => void) | null = null;

  constructor(deps: PlayerNamePromptDeps) {
    this.elements = deps.elements;
    this.getFadeOutMs = deps.getFadeOutMs;
  }

  close(resolvedName?: string): void {
    this.pendingCleanup?.();
    this.pendingCleanup = null;

    if (this.pendingResolve !== null) {
      const fallbackName = readStoredPlayerName() ?? "Player";
      this.pendingResolve(resolvedName ?? fallbackName);
      this.pendingResolve = null;
    }

    this.elements.overlay.classList.remove("is-hiding");
    this.elements.overlay.hidden = true;
    this.elements.overlay.setAttribute("aria-hidden", "true");
    this.elements.input.disabled = false;
    this.elements.okButton.disabled = false;
  }

  prompt(): Promise<string> {
    this.close();

    const storedName = readStoredPlayerName();
    this.elements.input.value = storedName ?? "";
    this.elements.input.disabled = false;
    this.elements.okButton.disabled = false;
    this.elements.overlay.hidden = false;
    this.elements.overlay.setAttribute("aria-hidden", "false");
    this.elements.overlay.classList.remove("is-hiding");

    return new Promise<string>((resolve) => {
      this.pendingResolve = resolve;

      const submit = (): void => {
        const sanitizedName = sanitizePlayerName(this.elements.input.value);
        const resolvedName = sanitizedName.length > 0
          ? sanitizedName
          : (storedName ?? "Player");

        writeStoredPlayerName(resolvedName);
        this.elements.input.disabled = true;
        this.elements.okButton.disabled = true;
        this.elements.overlay.classList.add("is-hiding");

        window.setTimeout(() => {
          this.close(resolvedName);
        }, this.getFadeOutMs());
      };

      const onInputKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        submit();
      };

      const onOkClick = (): void => {
        submit();
      };

      this.pendingCleanup = () => {
        this.elements.input.removeEventListener("keydown", onInputKeyDown);
        this.elements.okButton.removeEventListener("click", onOkClick);
      };

      this.elements.input.addEventListener("keydown", onInputKeyDown);
      this.elements.okButton.addEventListener("click", onOkClick);

      window.setTimeout(() => {
        if (this.pendingResolve === resolve) {
          this.elements.input.focus();
          this.elements.input.select();
        }
      }, 0);
    });
  }
}

/** Visible-for-testing internals. */
export const playerNamePromptTesting = {
  PLAYER_NAME_STORAGE_KEY,
};
