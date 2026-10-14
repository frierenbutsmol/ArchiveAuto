// Client-side checks that mirror the server rules in mongodb/server/src/validate.js.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Returns '' when the email is fine, otherwise a short message for the user.
export function emailError(value) {
  const s = (value || '').trim();
  if (!s) return 'Email is required.';
  if (!EMAIL_RE.test(s)) return 'Enter a valid email, like you@example.com.';
  return '';
}