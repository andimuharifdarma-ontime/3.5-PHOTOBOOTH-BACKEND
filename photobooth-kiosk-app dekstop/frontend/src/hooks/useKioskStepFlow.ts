export type KioskStep =
  | "SETUP"
  | "WELCOME"
  | "SELECT_THEME"
  | "SELECT_FRAME"
  | "CAPTURE"
  | "SELECT_PHOTOS"
  | "FILTER"
  | "PRINT_QUANTITY"
  | "PAYMENT"
  | "REVIEW"
  | "DONE";

export type KioskSettings = {
  isPaymentEnabled?: boolean;
  isFrameSelectionEnabled?: boolean;
  isPhotoSessionEnabled?: boolean;
  isPhotoSelectionEnabled?: boolean;
  isPhotoFilterEnabled?: boolean;
  isResultEnabled?: boolean;
};

const FLOW: KioskStep[] = [
  "SETUP",
  "WELCOME",
  "SELECT_THEME",
  "SELECT_FRAME",
  "CAPTURE",
  "SELECT_PHOTOS",
  "FILTER",
  "PRINT_QUANTITY",
  "PAYMENT",
  "REVIEW",
  "DONE",
];

function isStepEnabled(step: KioskStep, settings: KioskSettings | null): boolean {
  if (!settings) return true;
  switch (step) {
    case "SELECT_THEME":
    case "SELECT_FRAME":
      return settings.isFrameSelectionEnabled !== false;
    case "CAPTURE":
      return settings.isPhotoSessionEnabled !== false;
    case "SELECT_PHOTOS":
      return settings.isPhotoSelectionEnabled !== false;
    case "FILTER":
      return settings.isPhotoFilterEnabled !== false;
    case "PRINT_QUANTITY":
      return settings.isPaymentEnabled !== true;
    case "PAYMENT":
      return settings.isPaymentEnabled === true;
    case "REVIEW":
    case "DONE":
      return settings.isResultEnabled !== false;
    default:
      return true;
  }
}

export function getNextEnabledStep(
  current: KioskStep,
  settings: KioskSettings | null
): KioskStep {
  const idx = FLOW.indexOf(current);
  for (let i = idx + 1; i < FLOW.length; i++) {
    if (isStepEnabled(FLOW[i], settings)) return FLOW[i];
  }
  return current;
}

export function getPrevEnabledStep(
  current: KioskStep,
  settings: KioskSettings | null
): KioskStep {
  const idx = FLOW.indexOf(current);
  for (let i = idx - 1; i >= 0; i--) {
    if (isStepEnabled(FLOW[i], settings)) return FLOW[i];
  }
  return current;
}

export function resolveStepAfterWelcome(settings: KioskSettings | null): KioskStep {
  return getNextEnabledStep("WELCOME", settings);
}

export function resolveStepAfterFilter(settings: KioskSettings | null): KioskStep {
  return getNextEnabledStep("FILTER", settings);
}
