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
  /** Staff modules this account may use; null/absent = unrestricted. */
  allowedModules?: StaffModule[] | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/** Digits in the emailed login code (FR-1.x two-factor sign-in). */
export const TWO_FACTOR_CODE_LENGTH = 6;

/**
 * Returned by POST /auth/login when the password checked out but the account
 * still has to prove control of its inbox. No tokens are issued yet — the
 * client posts `challengeId` + the emailed code to /auth/login/verify.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
  /** Masked recipient (e.g. "an****te@gmail.com") — safe to show on screen. */
  maskedEmail: string;
  /** Seconds until the code expires. */
  expiresInSeconds: number;
  /** Seconds before "Resend code" becomes available again. */
  resendAfterSeconds: number;
}

/** POST /auth/login either signs you in or hands back a 2FA challenge. */
export type LoginResult = LoginResponse | TwoFactorChallenge;

export const isTwoFactorChallenge = (r: LoginResult): r is TwoFactorChallenge =>
  (r as TwoFactorChallenge).twoFactorRequired === true;

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
  /** This record is the registered head of its household. */
  isHouseholdHead: boolean;
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

/**
 * Staff-side modules an administrator can grant or withhold per employee.
 *
 * Barangay staff hold different offices — a Lupon member has no business in the
 * SOS map, an SK chairperson none in the resident registry — but the portal
 * previously showed every employee the same menu. These keys name the areas an
 * administrator can switch off for an individual account.
 *
 * Admins are not constrained: oversight of the whole system is the role.
 */
export type StaffModule =
  | 'complaints'
  | 'verification'
  | 'templates'
  | 'calendar'
  | 'health'
  | 'inventory'
  | 'masterlist'
  | 'student'
  | 'announcements'
  | 'sos'
  | 'charter';

export const STAFF_MODULES: ReadonlyArray<{ key: StaffModule; labelText: string; hint: string }> = [
  { key: 'complaints',    labelText: 'Complaints & Blotter',  hint: 'File and advance Katarungang Pambarangay cases' },
  { key: 'verification',  labelText: 'Resident Verification', hint: 'Approve or reject identity documents' },
  { key: 'masterlist',    labelText: 'Masterlist Registry',   hint: 'View and edit the barangay census' },
  { key: 'calendar',      labelText: 'Booking Calendar',      hint: 'Confirm facility and equipment bookings' },
  { key: 'health',        labelText: 'Health & Medicine',     hint: 'Medicine requests and equipment lending' },
  { key: 'inventory',     labelText: 'Inventory & Supplies',  hint: 'Stock levels and restocking' },
  { key: 'student',       labelText: 'Student Support',       hint: 'Printing and laminating queue' },
  { key: 'announcements', labelText: 'Post Announcement',     hint: 'Publish advisories to residents' },
  { key: 'templates',     labelText: 'Document Types',        hint: 'Certificate templates and settings' },
  { key: 'charter',       labelText: "Citizen's Charter",     hint: 'Published list of frontline services' },
  { key: 'sos',           labelText: 'SOS Map',               hint: 'Live emergency alerts from residents' },
];

/** Every module — what a staff account gets when no restriction is set. */
export const ALL_STAFF_MODULES: StaffModule[] = STAFF_MODULES.map((m) => m.key);

/**
 * Null means unrestricted, which is how every existing account behaves. An
 * empty array is a real choice (dashboard only), so it must not be conflated
 * with null.
 */
export function staffModulesFor(allowed: StaffModule[] | null | undefined): StaffModule[] {
  return allowed ?? ALL_STAFF_MODULES;
}

export function staffCanAccess(
  allowed: StaffModule[] | null | undefined,
  moduleKey: StaffModule,
): boolean {
  return staffModulesFor(allowed).includes(moduleKey);
}
