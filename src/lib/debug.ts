const DEBUG_STORAGE_KEY = "pf2e-cards:debug";

function hasWindow() {
  return typeof window !== "undefined";
}

export function isDebugEnabled() {
  if (import.meta.env.DEV) {
    return true;
  }

  if (!hasWindow()) {
    return false;
  }

  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

export function setDebugEnabled(enabled: boolean) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(DEBUG_STORAGE_KEY, String(enabled));
}

export function maskSecret(secret: string) {
  if (!secret) {
    return "(empty)";
  }

  if (secret.length <= 8) {
    return `${secret.slice(0, 2)}***`;
  }

  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export function debugLog(scope: string, message: string, details?: unknown) {
  if (!isDebugEnabled()) {
    return;
  }

  const prefix = `[pf2e-cards:${scope}]`;
  if (details === undefined) {
    console.info(prefix, message);
    return;
  }

  console.groupCollapsed(`${prefix} ${message}`);
  console.log(details);
  console.groupEnd();
}

export function debugError(scope: string, message: string, error: unknown, details?: unknown) {
  if (!isDebugEnabled()) {
    return;
  }

  const prefix = `[pf2e-cards:${scope}]`;
  console.group(`${prefix} ${message}`);
  console.error(error);
  if (details !== undefined) {
    console.log(details);
  }
  console.groupEnd();
}
