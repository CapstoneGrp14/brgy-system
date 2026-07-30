export interface HealthStatus {
  status: 'ok';
  service: 'api' | 'worker';
  db: 'up' | 'down';
  queue: 'up' | 'down';
  time: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

import type { Role, VerificationStatus } from './enums';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** True for RESIDENT accounts and for staff linked to a census record (dual role). */
  isResident: boolean;
  /** Barangay position for staff accounts (e.g. Punong Barangay, Secretary). */
  position?: string | null;
  /** Present when the account has a resident profile. */
  verificationStatus?: VerificationStatus;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse extends AuthUser {
  phone: string | null;
  address: string | null;
  purok: string | null;
  birthdate: string | null;
  civilStatus: string | null;
}

export interface MasterlistRow {
  id: string;
  fullName: string;
  address: string;
  purok: string | null;
  birthdate: string | null;
  category: string;
  lguEligibility: string | null;
  householdCode: string | null;
  /** A portal account is linked to this census record. */
  registered: boolean;
  /** Login status of the linked account (null when no account). */
  accountActive: boolean | null;
  /** False = missing from the latest census refresh (moved away / deceased). */
  isActive: boolean;
  /** Previous versions exist (drives the history accordion toggle). */
  hasHistory: boolean;
}

export interface CensusHistoryRow {
  id: string;
  address: string;
  purok: string | null;
  category: string;
  lguEligibility: string | null;
  householdCode: string | null;
  wasActive: boolean;
  note: string;
  changedBy: string;
  changedAt: string;
}

export interface MasterlistResponse {
  items: MasterlistRow[];
  total: number;
  page: number;
  pageSize: number;
  householdCount: number;
}

/** Barangay positions assignable to staff accounts (used by document templates). */
export const STAFF_POSITIONS = [
  'Punong Barangay (Chairman)',
  'Barangay Secretary',
  'Barangay Treasurer',
  'Barangay Kagawad',
  'SK Chairperson',
  'Lupon Tagapamayapa',
  'Barangay Tanod',
  'Administrative Staff',
] as const;

export interface StaffInviteRow {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  position: string | null;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
