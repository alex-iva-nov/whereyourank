const PASSWORD_RESET_REQUEST_KEY = "whereyourank.passwordResetRequestedAt";
const PASSWORD_RESET_REQUEST_MAX_AGE_MS = 60 * 60 * 1000;

export const markPasswordResetRequested = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PASSWORD_RESET_REQUEST_KEY, Date.now().toString());
  } catch {
    // Some browsers disable localStorage; the recovery URL token still handles the normal flow.
  }
};

export const hasRecentPasswordResetRequest = () => {
  if (typeof window === "undefined") return false;

  try {
    const requestedAt = Number(window.localStorage.getItem(PASSWORD_RESET_REQUEST_KEY));

    return Number.isFinite(requestedAt) && Date.now() - requestedAt <= PASSWORD_RESET_REQUEST_MAX_AGE_MS;
  } catch {
    return false;
  }
};

export const clearPasswordResetRequest = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(PASSWORD_RESET_REQUEST_KEY);
  } catch {
    // No-op: failure to clear the hint should not block the password update flow.
  }
};
