import { RequestStatus, RequestType, SlaClass } from './enums';

export const SLA_META: Record<SlaClass, { days: number; labelText: string }> = {
  [SlaClass.SIMPLE_3]: { days: 3, labelText: 'Simple (3-day limit)' },
  [SlaClass.COMPLEX_7]: { days: 7, labelText: 'Complex (7-day limit)' },
  [SlaClass.TECHNICAL_20]: { days: 20, labelText: 'Technical (20-day limit)' },
};

export interface DocumentTypeMeta {
  key: string;
  labelText: string;
  sla: SlaClass;
  /** Requires a VERIFIED resident account (shows a lock otherwise). */
  verifiedOnly: boolean;
}

/** The five document types from the design; FTJS waives NBI/Mayor's permit fees. */
export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  { key: 'BARANGAY_CLEARANCE', labelText: 'Barangay Clearance', sla: SlaClass.SIMPLE_3, verifiedOnly: false },
  { key: 'INDIGENCY_CERTIFICATE', labelText: 'Certificate of Indigency', sla: SlaClass.SIMPLE_3, verifiedOnly: true },
  { key: 'FTJS_CERTIFICATION', labelText: 'FTJS Certification', sla: SlaClass.COMPLEX_7, verifiedOnly: true },
  { key: 'RESIDENCY_CERTIFICATE', labelText: 'Certificate of Residency', sla: SlaClass.SIMPLE_3, verifiedOnly: false },
  { key: 'BUSINESS_PERMIT_ENDORSEMENT', labelText: 'Business Permit Endorsement', sla: SlaClass.SIMPLE_3, verifiedOnly: false },
];

/** Queue tab filters (design: All / Documents / Health / CCTV). */
export type QueueTab = 'all' | 'doc' | 'health' | 'cctv';

/**
 * A household member a head of family may file for. Minors cannot hold portal
 * accounts (registration requires 16+), so without this they would have to be
 * brought to the hall for every certificate.
 */
export interface DependantDto {
  censusRecordId: string;
  fullName: string;
  /** Years, from the census birthdate — shown so staff and head can sanity-check. */
  age: number;
}

export interface RequestDto {
  id: string;
  type: RequestType;
  subtype: string;
  title: string;
  purpose: string | null;
  slaClass: SlaClass;
  status: RequestStatus;
  filedAt: string;
  dueAt: string;
  completedAt: string | null;
  /** Business days elapsed / allowed, computed server-side. */
  slaDay: number;
  slaDays: number;
  overdueDays: number;
  /** A generated PDF exists (downloadable by verified residents for DIGITAL types; staff-print-only for PICKUP types). */
  hasDocument: boolean;
  /** True when this document type is released at the hall (seal/signature) — no resident download. */
  pickup: boolean;
  /** Digital documents: the signed & sealed scan hasn't been uploaded by staff yet. */
  awaitingSignedUpload: boolean;
  /** Staff action label for the current status, computed server-side. Null = no action. */
  actionText: string | null;
  residentName?: string;
  /** Set when the filer requested this for a minor in their household. */
  beneficiaryName?: string | null;
}

export enum ReleaseMode {
  DIGITAL = 'DIGITAL',
  PICKUP = 'PICKUP',
}

export interface QueueResponse {
  items: RequestDto[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<QueueTab, number>;
}

/** Staff action available for a status; server computes the transition. */
export const STATUS_ACTIONS: Partial<
  Record<RequestStatus, { actionText: string; next: RequestStatus }>
> = {
  [RequestStatus.PENDING]: { actionText: 'Review →', next: RequestStatus.PROCESSING },
  [RequestStatus.PROCESSING]: { actionText: 'Mark Processed →', next: RequestStatus.COMPLETED },
  [RequestStatus.READY]: { actionText: 'Mark Claimed →', next: RequestStatus.CLAIMED },
  [RequestStatus.OVERDUE]: { actionText: 'Escalate →', next: RequestStatus.ESCALATED },
  [RequestStatus.ESCALATED]: { actionText: 'Mark Processed →', next: RequestStatus.COMPLETED },
};

export interface NotificationDto {
  id: string;
  title: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
}
