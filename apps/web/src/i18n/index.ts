import { useUiStore, type PortalLanguage } from '../stores/ui';
import { dict } from './dict';

export type { PortalLanguage } from '../stores/ui';

/** Replace {name}-style placeholders in a resolved string. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

/**
 * Translate an English source string to the given language. English is the key:
 * when `lang === 'fil'` we look the phrase up in the Filipino dictionary and
 * fall back to the original English if it hasn't been translated yet — so the
 * UI never shows a blank or a raw key.
 */
export function translate(
  en: string,
  lang: PortalLanguage,
  vars?: Record<string, string | number>,
): string {
  if (lang === 'fil') {
    const fil = dict[en] ?? dict[en.trim()];
    if (fil) return interpolate(fil, vars);
  }
  return interpolate(en, vars);
}

export type TFunc = (en: string, vars?: Record<string, string | number>) => string;

/**
 * Translation hook — `const t = useT()` then wrap any user-facing English
 * string as `t('Sign in')` or `t('Welcome back, {name}!', { name })`.
 * Re-renders automatically when the resident/staff switches language.
 */
export function useT(): TFunc {
  const lang = useUiStore((s) => s.language);
  return (en, vars) => translate(en, lang, vars);
}
