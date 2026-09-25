/**
 * Bridge: map clicks → CustomEvents for external dashboard charts/modals
 */
export function emitDashboardEvent(type, detail) {
  const event = new CustomEvent(`coned:map:${type}`, {
    detail,
    bubbles: true,
  });
  window.dispatchEvent(event);
  document.dispatchEvent(event);
}

/**
 * Subscribe helpers used by the demo sidebar / chart panel
 */
export function onMapEvent(type, handler) {
  const listener = (e) => handler(e.detail);
  window.addEventListener(`coned:map:${type}`, listener);
  return () => window.removeEventListener(`coned:map:${type}`, listener);
}
