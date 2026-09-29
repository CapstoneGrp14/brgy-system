/**
 * Password rules, kept in one place so every form that sets a password checks
 * the same thing the API's DTOs enforce (MinLength(8) / MaxLength(72)).
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

/**
 * Returns the English problem message for a new password, or null when it is
 * acceptable. Callers pass the result through `t()` so it stays translatable.
 */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Password must be at least 8 characters.';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'Password must be 72 characters or fewer.';
  }
  if (confirm !== undefined && password !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}
