/**
 * Password policy — the single source of truth for the API's validators and
 * the web forms, so the rules the resident sees while typing are exactly the
 * ones the server enforces.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt silently ignores anything past 72 bytes, so refuse it outright. */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Visible ASCII punctuation. A space is deliberately NOT a special character:
 * it would satisfy the rule invisibly, so "Password1 " would look compliant
 * while being nothing of the sort.
 */
const SPECIAL_CHARACTERS = /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/;

export interface PasswordRule {
  id: 'length' | 'uppercase' | 'special';
  /** English label for the live checklist; pass it through t() to translate. */
  label: string;
  isMet: (password: string) => boolean;
}

/** Checklist order is the order the form renders them in. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    isMet: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter (A–Z)',
    isMet: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'special',
    label: 'One special character (! @ # $ …)',
    isMet: (p) => SPECIAL_CHARACTERS.test(p),
  },
];

/** The rules this password does not satisfy yet. Empty means it is acceptable. */
export function unmetPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.isMet(password));
}

export const isStrongPassword = (password: string): boolean =>
  password.length <= PASSWORD_MAX_LENGTH && unmetPasswordRules(password).length === 0;

/**
 * One English sentence naming everything still missing, or null when the
 * password passes. `confirm`, when supplied, must match.
 */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }

  const unmet = unmetPasswordRules(password);
  if (unmet.length > 0) {
    const needs = unmet.map((rule) =>
      rule.id === 'length'
        ? `at least ${PASSWORD_MIN_LENGTH} characters`
        : rule.id === 'uppercase'
          ? 'one uppercase letter'
          : 'one special character',
    );
    const list =
      needs.length === 1
        ? needs[0]
        : `${needs.slice(0, -1).join(', ')} and ${needs[needs.length - 1]}`;
    return `Password must contain ${list}.`;
  }

  if (confirm !== undefined && password !== confirm) return 'Passwords do not match.';
  return null;
}
