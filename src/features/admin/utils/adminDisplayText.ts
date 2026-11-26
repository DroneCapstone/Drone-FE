import { adminResourceJson } from './adminAssetFields';

/** Presentation-only helpers. Keep original responses, log records and filters unchanged. */
export function adminDisplayText(value: string | null | undefined, fallback = '—'): string {
  if (!value?.trim()) return fallback;
  return value
    .replace(/(^|[^a-z0-9])(?:back[ -]?end|BE)(?=[_-]|$)/g, '$1system')
    .replace(/(^|[^a-z0-9])back[ -]?end(?=[_-]|$)/gi, '$1system')
    .replace(/\b(?:the )?back[ -]?end\b/gi, 'system')
    .replace(/\bBE\b/g, 'system')
    .replace(/\b(?:API endpoint|API response|API request)\b/gi, 'system request')
    .replace(/\bAPI\b/g, 'service');
}

/** Keep actionable business messages, but don't expose transport/implementation errors. */
export function adminErrorText(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = error instanceof Error ? error.message.trim() : '';
  const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
  if (status === 401 || /\b(?:HTTP\s*401|unauthorized|token expired)\b/i.test(message)) return 'Your session has expired. Please sign in again.';
  if (status === 403 || /\b(?:HTTP\s*403|forbidden)\b/i.test(message)) return 'You do not have permission to perform this action.';
  if (status === 0 || /failed to fetch|network error|cannot connect|network request failed|load failed/i.test(message)) return 'Unable to connect. Check your connection and try again.';
  if ((status !== undefined && status >= 500) || /\b(?:HTTP\s*5\d\d|internal server error|bad gateway|service unavailable|gateway timeout)\b/i.test(message)) return 'The service is temporarily unavailable. Please try again.';
  if (status === 429 || /\bHTTP\s*429\b/i.test(message)) return 'Too many requests. Please try again shortly.';
  if (!message || /unexpected (?:list|response|api|backend|error)|unexpected .*response structure|no documented|no demo data|request failed|HTTP\s*\d{3}|JSON|SyntaxError|TypeError|stack trace|traceback|SQLSTATE|https?:\/\/|\/api\//i.test(message)) return fallback;
  return adminDisplayText(message, fallback);
}

/** Render nested record details without modifying the stored values. */
export function adminDetailText(value: unknown): string {
  return adminDisplayText(adminResourceJson(value, 2));
}
