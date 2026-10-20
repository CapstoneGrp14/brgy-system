export enum ComplaintStatus {
  FILED = 'FILED',
  SUMMONS = 'SUMMONS',
  MEDIATION = 'MEDIATION',
  CFA_ISSUED = 'CFA_ISSUED',
  RESOLVED = 'RESOLVED',
}

export enum ComplaintSource {
  RESIDENT_FORM = 'RESIDENT_FORM',
  MANUAL_BLOTTER = 'MANUAL_BLOTTER',
}

export const COMPLAINT_CATEGORIES = [
  'Neighbor Dispute',
  'Noise',
  'Property',
  'Business/Delivery',
  'Other',
] as const;

/**
 * Offences outside Katarungang Pambarangay.
 *
 * Under the Local Government Code (RA 7160, ch. 7) the barangay mediates
 * disputes between neighbours; it has no authority over serious crimes, which
 * go to the PNP and the prosecutor. Nothing previously stopped a resident
 * filing a homicide as a barangay complaint, where it would sit in a 20-day
 * mediation queue instead of reaching the police.
 *
 * The list is deliberately narrow — only wording that cannot plausibly describe
 * a neighbour dispute — because a false block sends someone away from help.
 * Anything subtler is left to staff triage.
 */
export const KP_EXCLUDED_PATTERNS: ReadonlyArray<{ pattern: RegExp; labelText: string }> = [
  { pattern: /\b(murder|homicide|patay|pinatay|pumatay|napatay)\b/i, labelText: 'killing or homicide' },
  { pattern: /\b(rape|rapist|panggagahasa|ginahasa|molest(ed|ation)?)\b/i, labelText: 'rape or sexual assault' },
  { pattern: /\b(kidnap(ped|ping)?|dukot|dinukot)\b/i, labelText: 'kidnapping' },
  { pattern: /\b(drugs?|shabu|marijuana|illegal\s+drugs?|nagbebenta\s+ng\s+droga)\b/i, labelText: 'illegal drugs' },
  { pattern: /\b(arson|sinunog|panununog)\b/i, labelText: 'arson' },
  { pattern: /\b(human\s+traffick\w*)\b/i, labelText: 'human trafficking' },
  { pattern: /\b(carnap(ped|ping)?|robbery\s+in\s+band|armed\s+robbery)\b/i, labelText: 'armed robbery or carnapping' },
  { pattern: /\b(child\s+abuse|pang-?aabuso\s+sa\s+bata)\b/i, labelText: 'child abuse' },
];

/** First excluded offence mentioned, or null when the report looks in-scope. */
export function kpExclusion(text: string): string | null {
  for (const { pattern, labelText } of KP_EXCLUDED_PATTERNS) {
    if (pattern.test(text)) return labelText;
  }
  return null;
}

export const COMPLAINT_STATUS_META: Record<
  ComplaintStatus,
  { labelText: string; kind: 'blue' | 'yellow' | 'purple' | 'red' | 'gray' | 'green' }
> = {
  [ComplaintStatus.FILED]: { labelText: 'Filed — Awaiting Lupon', kind: 'blue' },
  [ComplaintStatus.SUMMONS]: { labelText: 'Summons Issued', kind: 'yellow' },
  [ComplaintStatus.MEDIATION]: { labelText: 'Under Mediation', kind: 'purple' },
  [ComplaintStatus.CFA_ISSUED]: { labelText: 'CFA Issued', kind: 'red' },
  [ComplaintStatus.RESOLVED]: { labelText: 'Resolved', kind: 'green' },
};

export interface ComplaintDto {
  id: string;
  caseTitle: string;
  category: string;
  description: string;
  respondentName: string;
  isAnonymous: boolean;
  source: ComplaintSource;
  status: ComplaintStatus;
  luponAssignee: string | null;
  /** Null for staff blotter entries (no mediation clock). */
  mediationDay: number | null;
  mediationDays: number;
  overdue: boolean;
  filedAt: string;
  /** Complainant name — hidden (null) when anonymous, except to staff. */
  complainantName: string | null;
  /** Staff view only. */
  contactNumber?: string | null;
  hasEvidence: boolean;
  evidenceUrl?: string | null;
}

export interface ComplaintsQueueResponse {
  items: ComplaintDto[];
  activeCount: number;
}
