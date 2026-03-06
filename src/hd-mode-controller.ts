export type HdMode = "on" | "off";

const STORAGE_KEY = "memoryblox-hd-mode";

interface DeviceDetectionOptions {
  maxTouchPoints?: number;
  platform?: string;
}

// Device-detection tokens grouped by platform:
//   Android, iOS (iPad/iPhone/iPod), generic mobile/tablet,
//   Amazon Silk/Kindle, BlackBerry (BB10/PlayBook), webOS,
//   Opera Mini, IE Mobile, Windows Phone/CE.
const MOBILE_TABLET_PATTERN =
  /android|ipad|iphone|ipod|mobile|tablet|silk|kindle|playbook|bb10|webos|opera\s?mini|iemobile|windows\s?phone|windows\s?ce/iu;

const isDesktopClassIpad = (
  userAgent: string,
  options?: DeviceDetectionOptions,
): boolean => {
  if (!/macintosh/iu.test(userAgent)) {
    return false;
  }

  return options?.platform === "MacIntel" && (options.maxTouchPoints ?? 0) > 1;
};

export const detectDeviceType = (
  userAgent: string,
  options?: DeviceDetectionOptions,
): "mobile" | "desktop" => {
  if (isDesktopClassIpad(userAgent, options)) {
    return "mobile";
  }

  return MOBILE_TABLET_PATTERN.test(userAgent) ? "mobile" : "desktop";
};

export const getDefaultHdMode = (deviceType: "mobile" | "desktop"): HdMode => {
  return deviceType === "mobile" ? "off" : "on";
};

export const readStoredHdMode = (deviceType: "mobile" | "desktop"): HdMode => {
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "on" || stored === "off") {
    return stored;
  }

  return getDefaultHdMode(deviceType);
};

export const writeHdMode = (mode: HdMode): void => {
  window.localStorage.setItem(STORAGE_KEY, mode);
};

export const updateHdToggleButton = (
  button: HTMLButtonElement,
  mode: HdMode,
): void => {
  const isOn = mode === "on";
  const label = isOn ? "Disable HD mode" : "Enable HD mode";
  button.setAttribute("aria-pressed", String(isOn));
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
};

export const applyHdMode = (
  appShell: HTMLElement,
  mode: HdMode,
): void => {
  appShell.dataset.hdMode = mode;
};

/** Visible-for-testing internals. */
export const hdModeControllerTesting = {
  STORAGE_KEY,
  MOBILE_TABLET_PATTERN,
  isDesktopClassIpad,
};
