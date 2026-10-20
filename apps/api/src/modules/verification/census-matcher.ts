import {
  DEFAULT_OCR_FIELDS,
  OCR_FIELD_LABELS,
  type OcrBreakdown,
  type OcrFieldKey,
  type OcrFieldResult,
  type OcrFieldSpec,
} from '@brgy/shared';

/**
 * Per-field cross-check of OCR text against a census record.
 *
 * The previous formula was `nameScore * 0.8 + addressScore * 0.2`, which meant a
 * document carrying only the resident's name scored exactly 80% — high enough to
 * look convincing while evidencing a single field. Scoring is now a sum of the
 * fields a document type declares, so the number says how much of the ID was
 * actually corroborated, and staff see which boxes ticked.
 *
 * Token matching stays deliberately tolerant (edit distance 1) because OCR
 * routinely confuses O/0 and I/1; the per-field weighting, not stricter
 * matching, is what stops a thin match from reading as a strong one.
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

/** Reference values a field can be checked against. */
export interface CensusReference {
  fullName: string;
  address: string | null;
  /** ISO yyyy-mm-dd. */
  birthdate: string | null;
  /** Document type label, e.g. "Driver's License" — matched against the header. */
  docLabel: string | null;
}

export interface MatchResult extends OcrBreakdown {
  verdict: 'MATCH' | 'PARTIAL' | 'NO_MATCH';
}

/** Dates print in many layouts, so compare the parts rather than the format. */
function birthdateVariants(iso: string): string[] {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return [];
  const mi = Number(m);
  const di = Number(d);
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];
  const mon = months[mi - 1] ?? '';
  return [
    `${m}/${d}/${y}`, `${mi}/${di}/${y}`,
    `${d}/${m}/${y}`, `${di}/${mi}/${y}`,
    `${y}-${m}-${d}`,
    `${mon} ${di} ${y}`, `${mon.slice(0, 3)} ${di} ${y}`,
    `${di} ${mon} ${y}`, `${di} ${mon.slice(0, 3)} ${y}`,
  ].map((v) => normalize(v));
}

/** Any run of 6+ digits/letters that looks like a serial, e.g. N01-23-456789. */
const ID_NUMBER_RE = /\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{5,}\b/;

export function matchAgainstCensus(
  ocrText: string,
  reference: CensusReference,
  fields: OcrFieldSpec[] = DEFAULT_OCR_FIELDS,
): MatchResult {
  const flat = normalize(ocrText);
  const words = new Set(flat.split(' ').filter((w) => w.length > 1));
  const tokenFound = (token: string) => {
    if (words.has(token)) return true;
    for (const w of words) if (editDistance(token, w) <= 1) return true;
    return false;
  };
  /** Proportion of a phrase's tokens present in the OCR text. */
  const coverage = (phrase: string | null, minLen = 1) => {
    const tokens = normalize(phrase ?? '').split(' ').filter((t) => t.length > minLen);
    if (!tokens.length) return null;
    return tokens.filter(tokenFound).length / tokens.length;
  };

  const results: OcrFieldResult[] = fields.map((spec) => {
    let detected = false;
    let expected: string | null = null;
    let found: string | null = null;

    switch (spec.key) {
      case 'NAME': {
        expected = reference.fullName;
        const c = coverage(reference.fullName, 1);
        // Every name part must appear — a partial name is not an identity match.
        detected = c === 1;
        // But say *how* partial it was. A married woman's birth certificate
        // carries her maiden surname, so given names match and the surname does
        // not; "2 of 3 name parts matched" tells staff to ask for a marriage
        // certificate, where a bare empty checkbox tells them nothing.
        if (!detected && c !== null && c > 0) {
          const tokens = normalize(reference.fullName).split(' ').filter((x) => x.length > 1);
          found = `${Math.round(c * tokens.length)} of ${tokens.length} name parts matched`;
        }
        break;
      }
      case 'ADDRESS': {
        expected = reference.address;
        const c = coverage(reference.address, 2);
        // Addresses OCR poorly and abbreviate, so a majority is enough.
        detected = c !== null && c >= 0.6;
        break;
      }
      case 'BIRTHDATE': {
        expected = reference.birthdate;
        const hit = reference.birthdate
          ? birthdateVariants(reference.birthdate).find((v) => flat.includes(v))
          : undefined;
        detected = !!hit;
        found = hit ?? null;
        break;
      }
      case 'ID_NUMBER': {
        // No reference value to compare — presence of a serial is the signal.
        const m = ID_NUMBER_RE.exec(flat);
        detected = !!m;
        found = m?.[0] ?? null;
        break;
      }
      case 'DOC_TITLE': {
        expected = reference.docLabel;
        const c = coverage(reference.docLabel, 2);
        detected = c !== null && c >= 0.5;
        break;
      }
    }

    return {
      key: spec.key,
      labelText: OCR_FIELD_LABELS[spec.key],
      weight: spec.weight,
      required: spec.required,
      detected,
      expected,
      found,
    };
  });

  const total = fields.reduce((sum, f) => sum + f.weight, 0) || 100;
  const earned = results.filter((r) => r.detected).reduce((sum, r) => sum + r.weight, 0);
  const score = Math.round((earned / total) * 100);
  const missingRequired = results.filter((r) => r.required && !r.detected).map((r) => r.key);

  // A missing required field blocks MATCH however high the rest scored — the
  // point of the rewrite is that a number alone can no longer carry the verdict.
  const verdict: MatchResult['verdict'] =
    missingRequired.length === 0 && score >= 80 ? 'MATCH' : score >= 45 ? 'PARTIAL' : 'NO_MATCH';

  return { fields: results, score, missingRequired, verdict };
}
