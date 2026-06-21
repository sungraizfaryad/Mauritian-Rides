/**
 * Sanitize a post-auth `next` redirect target taken from URL/deep-link params.
 * Only same-app absolute paths are allowed — anything protocol-relative,
 * scheme-bearing, or backslash-tricked falls back to the rider home, so a
 * crafted `mr://...?next=https://evil.com` link can't bounce the user out.
 */
export function safeNextRoute(next: unknown, fallback = '/(rider)'): string {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
