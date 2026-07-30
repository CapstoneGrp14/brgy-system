export const BOOKING_TIME_SLOTS = [
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '1:00 PM',
  '3:00 PM',
  '5:00 PM',
] as const;

/** Preferred slots for conflict suggestions (design: "shift to off-peak"). */
export const OFF_PEAK_SLOTS = ['1:00 PM', '3:00 PM', '5:00 PM'] as const;

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export interface FacilityDto {
  id: string;
  name: string;
  type: 'FACILITY' | 'EQUIPMENT';
  /** Admin config view only. */
  isActive?: boolean;
  blockedSlots?: Array<{ slot: string; title: string }>;
}

export interface BookingSlotDto {
  id: string;
  label: string;
  isOffPeak: boolean;
  isActive: boolean;
}

export interface BookingDto {
  id: string;
  facilityId: string;
  facilityName: string;
  purpose: string | null;
  /** YYYY-MM-DD */
  date: string;
  timeSlot: string;
  status: BookingStatus;
  decidedBy: string | null;
  createdAt: string;
  /** Staff view: who requested. */
  requestedBy?: string;
  /** Staff view: what this pending booking clashes with (null = no conflict). */
  conflictTitle?: string | null;
  /** Staff view: free slot the resolver recommends when conflicted. */
  suggestedSlot?: string | null;
}

/** 409 payload when a requested slot is taken. */
export interface BookingConflict {
  message: string;
  conflictTitle: string;
  suggestedSlot: string | null;
}
