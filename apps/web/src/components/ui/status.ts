import type { RequestDto } from '@brgy/shared';
import { RequestStatus } from '@brgy/shared';

type PillKind = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';

export const STATUS_PILL: Record<RequestStatus, { labelText: string; kind: PillKind }> = {
  [RequestStatus.PENDING]: { labelText: 'Pending', kind: 'yellow' },
  [RequestStatus.PROCESSING]: { labelText: 'Processing', kind: 'blue' },
  [RequestStatus.READY]: { labelText: 'Ready for Pickup', kind: 'green' },
  [RequestStatus.COMPLETED]: { labelText: 'Completed', kind: 'green' },
  [RequestStatus.CLAIMED]: { labelText: 'Claimed', kind: 'gray' },
  [RequestStatus.OVERDUE]: { labelText: 'Overdue', kind: 'red' },
  [RequestStatus.ESCALATED]: { labelText: 'Escalated', kind: 'purple' },
  [RequestStatus.REJECTED]: { labelText: 'Rejected', kind: 'red' },
  [RequestStatus.CLOSED]: { labelText: 'Closed', kind: 'gray' },
};

/** Status pill with equipment-lending overrides (On Lend / Returned). */
export function pillForRequest(r: Pick<RequestDto, 'type' | 'status'>): { labelText: string; kind: PillKind } {
  if (r.type === 'EQUIPMENT') {
    if (r.status === RequestStatus.CLAIMED) return { labelText: 'On Lend', kind: 'purple' };
    if (r.status === RequestStatus.CLOSED) return { labelText: 'Returned ✓', kind: 'green' };
  }
  return STATUS_PILL[r.status];
}

/** Deadline chip: "Day X / Y" (green→yellow) or "OVERDUE +Nd" (red). */
export function deadlineChip(r: RequestDto): { text: string; kind: PillKind } {
  if (r.overdueDays > 0) return { text: `OVERDUE +${r.overdueDays}d`, kind: 'red' };
  const ratio = r.slaDay / r.slaDays;
  return { text: `Day ${r.slaDay} / ${r.slaDays}`, kind: ratio >= 0.66 ? 'yellow' : 'green' };
}

export const REQUEST_ICON: Record<string, string> = {
  DOCUMENT: '📄',
  CCTV: '📷',
  MEDICINE: '💊',
  EQUIPMENT: '🩺',
  PRINTING: '🖨️',
};

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
