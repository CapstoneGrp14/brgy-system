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
