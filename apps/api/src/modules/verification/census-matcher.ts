/**
 * Fuzzy cross-check of OCR text against a census record. Token-based:
 * each name token must appear in the OCR text (exactly or within edit
 * distance 1) — tolerant of OCR noise, strict enough for identity checks.
 */

function normalize(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

export interface MatchResult {
  score: number;
  verdict: 'MATCH' | 'PARTIAL' | 'NO_MATCH';
}

export function matchAgainstCensus(
  ocrText: string,
  fullName: string,
  address: string | null,
): MatchResult {
  const words = new Set(normalize(ocrText).split(' ').filter((w) => w.length > 1));
  const tokenFound = (token: string) => {
    if (words.has(token)) return true;
    for (const w of words) if (editDistance(token, w) <= 1) return true;
    return false;
  };

  const nameTokens = normalize(fullName).split(' ').filter((t) => t.length > 1);
  const nameHits = nameTokens.filter(tokenFound).length;
  const nameScore = nameTokens.length ? nameHits / nameTokens.length : 0;

  const addressTokens = normalize(address ?? '').split(' ').filter((t) => t.length > 2);
  const addressHits = addressTokens.filter(tokenFound).length;
  const addressScore = addressTokens.length ? addressHits / addressTokens.length : 0;

  // Name dominates (identity), address is corroboration.
  const score = Math.round((nameScore * 0.8 + addressScore * 0.2) * 100);
  const verdict = nameScore === 1 && score >= 80 ? 'MATCH' : score >= 50 ? 'PARTIAL' : 'NO_MATCH';
  return { score, verdict };
}
