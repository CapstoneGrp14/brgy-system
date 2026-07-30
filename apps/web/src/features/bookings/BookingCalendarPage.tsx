import { BookingStatus } from '@brgy/shared';
import { useBookingsQueue, useDecideBooking } from '../../api/bookings';
import { card, pill } from '../../components/ui/kit';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

const fmt = (d: string) =>
  new Date(d + 'T00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export function BookingCalendarPage() {
  const { data: bookings } = useBookingsQueue();
  const decide = useDecideBooking();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();

  const pending = (bookings ?? []).filter((b) => b.status === BookingStatus.PENDING);
  const decided = (bookings ?? []).filter((b) => b.status !== BookingStatus.PENDING);

  const onDecide = async (id: string, approve: boolean, useSuggestion: boolean, who: string, slot?: string | null) => {
    if (!approve) {
      const ok = await confirmDialog({
        title: 'Reject this booking?',
        message: `${who} will be notified that the slot was not approved.`,
        confirmText: 'Reject',
        tone: 'danger',
      });
      if (!ok) return;
    }
    try {
      const updated = await decide.mutateAsync({ id, approve, useSuggestion });
      toast(
        approve
          ? useSuggestion
            ? `📧 Rescheduled to ${updated.timeSlot} — ${who} notified via email + dashboard.`
            : `📧 Confirmed — ${who} notified via email + dashboard.`
          : `Booking rejected — ${who} has been notified.`,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast(typeof msg === 'object' ? msg.message : (msg ?? 'Action failed.'));
    }
    void slot;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card, padding: '22px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
          Smart Scheduling & Conflict Resolver
        </h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 16px' }}>
          {pending.length} booking{pending.length === 1 ? '' : 's'} awaiting review · accepted bookings notify the resident via Gmail + dashboard
        </p>

        {pending.length === 0 && (
          <div style={{ background: '#E4F5EB', border: '1px solid #BFE6CE', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, color: '#1F8B4C' }}>
            ✅ No pending bookings — the calendar is clear.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14 }}>
          {pending.map((b) => (
            <div key={b.id} style={{ border: '1px solid #E3E8F0', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
                {b.facilityName.split(' (')[0]}
                {b.purpose ? ` — ${b.purpose}` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                Requested by: <strong>{b.requestedBy}</strong> · {fmt(b.date)} @ {b.timeSlot}
              </div>

              {b.conflictTitle ? (
                <div style={{ background: '#FBE4E1', borderRadius: 9, padding: '10px 12px', marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C0392B' }}>
                    ⚠ Conflict: "{b.conflictTitle}" is already confirmed for this time.
                  </div>
                  {b.suggestedSlot && (
                    <div style={{ fontSize: 12, color: '#7A3B33', marginTop: 4 }}>
                      💡 Smart Suggestion: shift to off-peak hour ({b.suggestedSlot})
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1F8B4C', marginTop: 10 }}>
                  ✓ No conflicts for this slot
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {b.conflictTitle && b.suggestedSlot ? (
                  <button
                    onClick={() => onDecide(b.id, true, true, b.requestedBy ?? 'the resident', b.suggestedSlot)}
                    disabled={decide.isPending}
                    style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                  >
                    Accept Suggestion & Notify User
                  </button>
                ) : (
                  <button
                    onClick={() => onDecide(b.id, true, false, b.requestedBy ?? 'the resident')}
                    disabled={decide.isPending}
                    style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                  >
                    Accept & Notify User
                  </button>
                )}
                <button
                  onClick={() => onDecide(b.id, false, false, b.requestedBy ?? 'the resident')}
                  disabled={decide.isPending}
                  style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #E8B4AE', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                >
                  Reject Booking
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, padding: '22px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>Recent Decisions</h3>
        {decided.length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>No decided bookings yet.</p>}
        {decided.slice(0, 10).map((b) => (
          <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, color: '#2E3A52' }}>
              <strong>{b.facilityName.split(' (')[0]}</strong>
              {b.purpose ? ` — ${b.purpose}` : ''} · {b.requestedBy} · {fmt(b.date)} @ {b.timeSlot}
              {b.decidedBy && <span style={{ color: '#8A97AB' }}> · by {b.decidedBy.split(' ')[0]}</span>}
            </div>
            <span style={pill(b.status === BookingStatus.CONFIRMED ? 'green' : 'red')}>
              {b.status === BookingStatus.CONFIRMED ? 'Confirmed' : 'Rejected'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
