/**
 * Runtime credentials for the MapLibre map.
 * Priority: parent Vite inject → window globals (env.local.js) → empty.
 */
function readParentEnv() {
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      return window.parent.__CONED_MAP_ENV__ || null;
    }
  } catch {
    /* cross-origin — ignore */
  }
  return null;
}

const parentEnv = readParentEnv();

export const ENV = {
  SUPABASE_URL:
    (parentEnv && parentEnv.SUPABASE_URL) ||
    (typeof window !== 'undefined' && window.CONED_SUPABASE_URL) ||
    '',
  SUPABASE_ANON_KEY:
    (parentEnv && parentEnv.SUPABASE_ANON_KEY) ||
    (typeof window !== 'undefined' && window.CONED_SUPABASE_ANON_KEY) ||
    '',
  /** Optional REST fallback, e.g. '/api/schools' */
  SCHOOLS_API_URL:
    (parentEnv && parentEnv.SCHOOLS_API_URL) ||
    (typeof window !== 'undefined' && window.CONED_SCHOOLS_API_URL) ||
    '',
};
