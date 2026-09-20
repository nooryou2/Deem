// src/utils/validation.ts

/**
 * Practical email validation.
 *
 * Deliberately not trying to implement the full RFC 5322 grammar — that's
 * enormous and rejects almost nothing extra in practice. This catches the
 * mistakes people actually make: missing @, missing domain, missing TLD,
 * spaces, double dots, and stray punctuation.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value) return false;
  if (!EMAIL_PATTERN.test(value)) return false;
  // Reject consecutive dots and dots adjacent to the @ sign.
  if (value.includes('..')) return false;
  if (value.startsWith('.') || value.includes('.@') || value.includes('@.')) return false;
  return true;
}

/**
 * Returns a specific error message for an email, or null when it's fine.
 * Specific beats generic: telling someone "missing @" is more useful than
 * "invalid email".
 */
export function getEmailError(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Please enter your email address.';
  if (value.includes(' ')) return 'Email addresses cannot contain spaces.';
  if (!value.includes('@')) return "Email must include an '@' symbol.";
  if (value.split('@').length > 2) return "Email cannot contain more than one '@'.";

  const [local, domain] = value.split('@');
  if (!local) return 'Please enter the part before the @.';
  if (!domain) return 'Please enter the domain after the @ (e.g. gmail.com).';
  if (!domain.includes('.')) return 'The domain needs a dot (e.g. gmail.com).';
  if (domain.endsWith('.')) return 'Email cannot end with a dot.';

  const tld = domain.split('.').pop() ?? '';
  if (tld.length < 2) return 'That domain ending is not valid.';

  if (!isValidEmail(value)) return 'That email address is not valid.';
  return null;
}

/**
 * Password rule used at registration. Firebase enforces a 6-character minimum;
 * we surface it up front rather than after a failed round-trip.
 */
export function getPasswordError(password: string): string | null {
  if (!password) return 'Please enter a password.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}
