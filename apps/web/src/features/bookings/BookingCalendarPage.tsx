import { BookingStatus } from '@brgy/shared';
import { useState } from 'react';
import { useBookingsQueue, useDecideBooking } from '../../api/bookings';
import { card, pill } from '../../components/ui/kit';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { Select } from '../../components/ui/Select';
import { Pagination, TableToolbar } from '../../components/ui/TableToolbar';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useTableView } from '../../hooks/useTableView';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

const fmt = (d: string) =>
  new Date(d + 'T00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export function BookingCalendarPage() {
  const { data: bookings } = useBookingsQueue();
  const decide = useDecideBooking();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();

  const pending = (bookings ?? []).filter((b) => b.status === BookingStatus.PENDING);
  const decided = (bookings ?? []).filter((b) => b.status !== BookingStatus.PENDING);

  // Conflicts are the queue's real work — they need a decision rather than a
  // click-through — so they get their own filter alongside the name search.
  const [conflictOnly, setConflictOnly] = useState('all');
  const pendingView = useTableView(
    pending,
    (b) => `${b.requestedBy ?? ''} ${b.facilityName} ${b.purpose ?? ''} ${b.timeSlot} ${b.date}`,
    {
      pageSize: 6,
      resetKey: conflictOnly,
      filters: [
        conflictOnly === 'conflict' && ((b) => !!b.conflictTitle),
        conflictOnly === 'clear' && ((b) => !b.conflictTitle),
      ],
    },
  );

  // Previously hard-capped at ten rows, which quietly hid the rest of the
  // history. Paging shows the same ten at a time and admits there are more.
  const [outcome, setOutcome] = useState('all');
  const decidedView = useTableView(
    decided,
    (b) => `${b.requestedBy ?? ''} ${b.facilityName} ${b.purpose ?? ''} ${b.decidedBy ?? ''} ${b.date}`,
    {
      resetKey: outcome,
      filters: [outcome !== 'all' && ((b) => b.status === outcome)],
    },
  );

  const onDecide = async (id: string, approve: boolean, useSuggestion: boolean, who: string, slot?: string | null) => {
    if (!approve) {
      const ok = await confirmDialog({
        title: t('Reject this booking?'),
        message: t('{who} will be notified that the slot was not approved.', { who }),
        confirmText: t('Reject'),
        tone: 'danger',
      });
      if (!ok) return;
    }
    try {
      const updated = await decide.mutateAsync({ id, approve, useSuggestion });
      toast(
        approve
          ? useSuggestion
            ? t('📧 Rescheduled to {slot} — {who} notified via email + dashboard.', { slot: updated.timeSlot, who })
            : t('📧 Confirmed — {who} notified via email + dashboard.', { who })
          : t('Booking rejected — {who} has been notified.', { who }),
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast(typeof msg === 'object' ? msg.message : (msg ?? t('Action failed.')));
    }
    void slot;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card, padding: '22px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Smart Scheduling & Conflict Resolver')}
        </h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 16px' }}>
          {t(
            pending.length === 1
              ? '{count} booking awaiting review · accepted bookings notify the resident via Gmail + dashboard'
              : '{count} bookings awaiting review · accepted bookings notify the resident via Gmail + dashboard',
            { count: pending.length },
          )}
        </p>

        {pending.length > 0 && (
          <TableToolbar view={pendingView} placeholder={t('Search resident, facility, or purpose…')}>
            <Select
              value={conflictOnly}
              onChange={setConflictOnly}
              compact
              options={[
                { value: 'all', labelText: t('All pending') },
                { value: 'conflict', labelText: t('Conflicts only') },
                { value: 'clear', labelText: t('No conflict') },
              ]}
              style={{ width: 170 }}
            />
          </TableToolbar>
        )}

        {pending.length === 0 && (
          <div style={{ background: '#E4F5EB', border: '1px solid #BFE6CE', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, color: '#1F8B4C' }}>
            {t('✅ No pending bookings — the calendar is clear.')}
          </div>
        )}

        {pending.length > 0 && pendingView.rows.length === 0 && (
          <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>
            {t('No pending bookings match this search or filter.')}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {pendingView.rows.map((b) => (
            <div key={b.id} style={{ border: '1px solid #E3E8F0', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
                {b.facilityName.split(' (')[0]}
                {b.purpose ? ` — ${b.purpose}` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                {t('Requested by:')} <strong>{b.requestedBy}</strong> · {fmt(b.date)} @ {b.timeSlot}
              </div>

              {b.conflictTitle ? (
                <div style={{ background: '#FBE4E1', borderRadius: 9, padding: '10px 12px', marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C0392B' }}>
                    {t('⚠ Conflict: "{title}" is already confirmed for this time.', { title: b.conflictTitle })}
                  </div>
                  {b.suggestedSlot && (
                    <div style={{ fontSize: 12, color: '#7A3B33', marginTop: 4 }}>
                      {t('💡 Smart Suggestion: shift to off-peak hour ({slot})', { slot: b.suggestedSlot })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1F8B4C', marginTop: 10 }}>
                  {t('✓ No conflicts for this slot')}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {b.conflictTitle && b.suggestedSlot ? (
                  <button
                    onClick={() => onDecide(b.id, true, true, b.requestedBy ?? t('the resident'), b.suggestedSlot)}
                    disabled={decide.isPending}
                    style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                  >
                    {t('Accept Suggestion & Notify User')}
                  </button>
                ) : (
                  <button
                    onClick={() => onDecide(b.id, true, false, b.requestedBy ?? t('the resident'))}
                    disabled={decide.isPending}
                    style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                  >
                    {t('Accept & Notify User')}
                  </button>
                )}
                <button
                  onClick={() => onDecide(b.id, false, false, b.requestedBy ?? t('the resident'))}
                  disabled={decide.isPending}
                  style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #E8B4AE', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                >
                  {t('Reject Booking')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <Pagination view={pendingView} />
      </div>

      <div style={{ ...card, padding: '22px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Recent Decisions')}</h3>

        {decided.length > 0 && (
          <TableToolbar view={decidedView} placeholder={t('Search resident or facility…')}>
            <Select
              value={outcome}
              onChange={setOutcome}
              compact
              options={[
                { value: 'all', labelText: t('Confirmed & rejected') },
                { value: BookingStatus.CONFIRMED, labelText: t('Confirmed only') },
                { value: BookingStatus.REJECTED, labelText: t('Rejected only') },
              ]}
              style={{ width: 190 }}
            />
          </TableToolbar>
        )}

        {decidedView.rows.length === 0 && (
          <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>
            {decidedView.total === 0
              ? t('No decided bookings yet.')
              : t('No decisions match this search or filter.')}
          </p>
        )}
        {decidedView.rows.map((b) => (
          <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, color: '#2E3A52' }}>
              <strong>{b.facilityName.split(' (')[0]}</strong>
              {b.purpose ? ` — ${b.purpose}` : ''} · {b.requestedBy} · {fmt(b.date)} @ {b.timeSlot}
              {b.decidedBy && <span style={{ color: '#8A97AB' }}> {t('· by {name}', { name: b.decidedBy.split(' ')[0] })}</span>}
            </div>
            <span style={pill(b.status === BookingStatus.CONFIRMED ? 'green' : 'red')}>
              {b.status === BookingStatus.CONFIRMED ? t('Confirmed') : t('Rejected')}
            </span>
          </div>
        ))}

        <Pagination view={decidedView} />
      </div>
    </div>
  );
}
