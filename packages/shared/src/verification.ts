export const VERIFICATION_DOC_TYPES = [
  { key: 'VOTERS_ID', labelText: "Voter's ID / Barangay ID" },
  { key: 'PROOF_OF_BILLING', labelText: 'Proof of Billing' },
  { key: 'UMID_NATIONAL_ID', labelText: 'UMID / National ID' },
] as const;

export type OcrVerdict = 'PENDING' | 'MATCH' | 'PARTIAL' | 'NO_MATCH' | 'MANUAL' | 'ERROR';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Fields the OCR cross-check looks for on an ID.
 *
 * The old score was `name * 0.8 + address * 0.2`, so a document carrying only
 * the resident's name always read as exactly 80% — high-looking, but evidence
 * of one field. Each document type now declares which fields it should contain
 * and what each is worth, so the number reflects how much of the ID was
 * actually corroborated.
 */
export type OcrFieldKey = 'NAME' | 'BIRTHDATE' | 'ADDRESS' | 'ID_NUMBER' | 'DOC_TITLE';

export const OCR_FIELD_LABELS: Record<OcrFieldKey, string> = {
  NAME: 'Full name',
  BIRTHDATE: 'Date of birth',
  ADDRESS: 'Address',
  ID_NUMBER: 'ID / document number',
  DOC_TITLE: 'Document title',
};

/** One field a document type expects, and its share of the total score. */
export interface OcrFieldSpec {
  key: OcrFieldKey;
  /** Percentage points this field contributes when detected. Specs sum to 100. */
  weight: number;
  /** Required fields gate the MATCH verdict regardless of total score. */
  required: boolean;
}

/** Per-field outcome, shown to staff as a checklist under "Show more". */
export interface OcrFieldResult {
  key: OcrFieldKey;
  labelText: string;
  weight: number;
  required: boolean;
  detected: boolean;
  /** What the cross-check looked for, e.g. the census name or birthdate. */
  expected: string | null;
  /** What it found in the OCR text, when that differs from expected. */
  found: string | null;
}

/**
 * Default field spec, used by document types that have not been configured.
 * Name still dominates because it is the identity claim, but it can no longer
 * reach MATCH on its own — the verdict needs corroborating evidence.
 */
export const DEFAULT_OCR_FIELDS: OcrFieldSpec[] = [
  { key: 'NAME', weight: 45, required: true },
  { key: 'BIRTHDATE', weight: 20, required: false },
  { key: 'ADDRESS', weight: 20, required: false },
  { key: 'ID_NUMBER', weight: 15, required: false },
];

export interface MyVerificationDto {
  id: string;
  docType: string;
  ocrVerdict: OcrVerdict;
  matchScore: number | null;
  status: SubmissionStatus;
  createdAt: string;
  decidedAt: string | null;
  /** Staff's reason for the decision — shown to the resident on a rejection. */
  decisionNote: string | null;
}

/** Score breakdown for the staff "Show more OCR information" panel. */
export interface OcrBreakdown {
  fields: OcrFieldResult[];
  /** Sum of detected field weights — what matchScore reports. */
  score: number;
  /** Required fields that were not found; non-empty blocks a MATCH verdict. */
  missingRequired: OcrFieldKey[];
}

export interface VerificationQueueRow {
  id: string;
  residentName: string;
  docType: string;
  fileName: string;
  /** Presigned preview URL (1 hour). */
  fileUrl: string;
  /**
   * The resident declared a surname change by marriage, so the primary
   * document's maiden surname differing from the census is expected.
   */
  surnameChangedByMarriage: boolean;
  /** Marriage certificate backing that declaration, if one was attached. */
  supportingFileName: string | null;
  supportingFileUrl: string | null;
  ocrVerdict: OcrVerdict;
  matchScore: number | null;
  status: SubmissionStatus;
  decidedBy: string | null;
  createdAt: string;
  /** Per-field checklist; null for PDFs and pre-upgrade submissions. */
  ocrBreakdown: OcrBreakdown | null;
}

export interface VerificationQueueResponse {
  items: VerificationQueueRow[];
  pendingCount: number;
}
