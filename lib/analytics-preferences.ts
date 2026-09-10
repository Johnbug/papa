const key = 'papa-analytics';
let currentPagePreference: boolean | null = null;
let memoryOnly = false;
export function analyticsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (memoryOnly) return currentPagePreference ?? true;
  try { return window.localStorage.getItem(key) !== 'off'; }
  catch { return currentPagePreference ?? true; }
}
export function saveAnalyticsPreference(enabled: boolean) {
  currentPagePreference = enabled;
  try { window.localStorage.setItem(key, enabled ? 'on' : 'off'); memoryOnly = false; }
  catch { memoryOnly = true; }
}
export function shouldSendAnalytics(): boolean {
  return analyticsAllowed();
}
