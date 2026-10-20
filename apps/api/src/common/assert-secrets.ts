/**
 * Startup guard for signing secrets.
 *
 * JWT_ACCESS_SECRET / JWT_REFRESH_SECRET are read with a hardcoded fallback at
 * five call sites (jwt.strategy.ts, auth.service.ts). Without this check a
 * production deploy whose env file is missing either key starts up perfectly
 * normally and signs tokens with a string that is committed to this repository —
 * so anyone who has read the source can mint an admin session. Failing to boot
 * is the correct outcome: a loud crash beats a silent auth bypass.
 *
 * Development is exempt so `docker compose up` keeps working out of the box.
 */

/** Defaults that appear in the source — never acceptable outside development. */
const KNOWN_DEFAULTS = new Set(['dev-access-secret-change-me', 'dev-refresh-secret-change-me']);

const REQUIRED = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

/** Long enough that a leaked token can't be brute-forced back to its key. */
const MIN_LENGTH = 32;

export function assertSecrets(env: NodeJS.ProcessEnv = process.env): void {
  if ((env.NODE_ENV ?? 'development') !== 'production') return;

  const problems: string[] = [];
  for (const key of REQUIRED) {
    const value = env[key]?.trim();
    if (!value) {
      problems.push(`${key} is not set`);
    } else if (KNOWN_DEFAULTS.has(value)) {
      problems.push(`${key} is still the development default`);
    } else if (value.length < MIN_LENGTH) {
      problems.push(`${key} is only ${value.length} chars (need at least ${MIN_LENGTH})`);
    }
  }
  if (!problems.length) return;

  throw new Error(
    `Refusing to start in production:\n` +
      problems.map((p) => `  • ${p}`).join('\n') +
      `\n\nGenerate strong values and put them in .env.production:\n` +
      `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"\n`,
  );
}
