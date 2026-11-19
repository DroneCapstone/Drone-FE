export const DEFAULT_API_BASE_URL =
  "https://droneoptai.id.vn/api/v1";

function normalizeApiBaseUrl(value: string) {
  const url = value.trim().replace(/\/+$/, "");

  if (/\/api\/v1$/i.test(url)) {
    return url;
  }

  if (/\/docs$/i.test(url)) {
    return `${url.slice(0, -"/docs".length)}/api/v1`;
  }

  return `${url}/api/v1`;
}

/**
 * Single API base URL shared by every HTTP client in the application.
 *
 * VITE_API_BASE_URL may be the server origin, its /docs URL, or the complete
 * /api/v1 URL. It is normalized so feature services only append endpoint paths.
 */
export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
    DEFAULT_API_BASE_URL,
);

export const API_WITH_CREDENTIALS =
  import.meta.env.VITE_API_WITH_CREDENTIALS ===
  "true";
