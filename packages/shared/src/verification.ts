export const VERIFICATION_DOC_TYPES = [
  { key: 'VOTERS_ID', labelText: "Voter's ID / Barangay ID" },
  { key: 'PROOF_OF_BILLING', labelText: 'Proof of Billing' },
  { key: 'UMID_NATIONAL_ID', labelText: 'UMID / National ID' },
] as const;

export type OcrVerdict = 'PENDING' | 'MATCH' | 'PARTIAL' | 'NO_MATCH' | 'MANUAL' | 'ERROR';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MyVerificationDto {
  id: string;
  docType: string;
  ocrVerdict: OcrVerdict;
  matchScore: number | null;
  status: SubmissionStatus;
  createdAt: string;
  decidedAt: string | null;
}

export interface VerificationQueueRow {
  id: string;
  residentName: string;
  docType: string;
  fileName: string;
  /** Presigned preview URL (1 hour). */
  fileUrl: string;
  ocrVerdict: OcrVerdict;
  matchScore: number | null;
  status: SubmissionStatus;
  decidedBy: string | null;
  createdAt: string;
}

export interface VerificationQueueResponse {
  items: VerificationQueueRow[];
  pendingCount: number;
}
