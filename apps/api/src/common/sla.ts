import { SLA_META, SlaClass } from '@brgy/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** Due date = filed + N working days (weekends skipped; PH holidays out of scope for v1). */
export function computeDueAt(filedAt: Date, slaClass: SlaClass): Date {
  let remaining = SLA_META[slaClass].days;
  const due = new Date(filedAt);
  while (remaining > 0) {
    due.setTime(due.getTime() + DAY_MS);
    if (!isWeekend(due)) remaining--;
  }
  return due;
}

/** Working days elapsed between two instants (partial days round up, min 1). */
export function businessDaysElapsed(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    if (!isWeekend(cursor)) count++;
    cursor.setTime(cursor.getTime() + DAY_MS);
  }
  return Math.max(1, count);
}

export function slaSnapshot(filedAt: Date, dueAt: Date, slaClass: SlaClass, now = new Date()) {
  const slaDays = SLA_META[slaClass].days;
  const slaDay = Math.min(businessDaysElapsed(filedAt, now), slaDays);
  const overdueDays = now > dueAt ? businessDaysElapsed(dueAt, now) : 0;
  return { slaDay, slaDays, overdueDays };
}
