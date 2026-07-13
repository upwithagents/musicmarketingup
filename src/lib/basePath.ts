// When the app runs behind the upwithagents-portal proxy it is served under
// a basePath (e.g. "/musicmarketingup"). Next rewrites page/asset/Link URLs
// automatically, but NOT raw fetch() calls — so client-side calls to the
// app's own API must be prefixed with the same basePath. Standalone (no
// portal, no NEXT_PUBLIC_BASE_PATH) this is the empty string and apiFetch
// behaves exactly like fetch.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix an app-relative path with the configured basePath. */
export function apiPath(path: string): string {
  return BASE_PATH + path;
}

/** fetch() to the app's own API, basePath-aware. Drop-in for fetch(path, init). */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiPath(path), init);
}
