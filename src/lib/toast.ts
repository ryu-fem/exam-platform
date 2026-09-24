const TOAST_EVENT = "app:toast";

/** Publish a short-lived toast notification (rendered by <Toaster />). */
export function showToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export { TOAST_EVENT };