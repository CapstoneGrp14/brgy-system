import type { BookingConflict } from '@brgy/shared';
import { BookingStatus } from '@brgy/shared';
import { useEffect, useState } from 'react';
import {
  conflictFromError,
  useBookingSlots,
  useCreateBooking,
  useFacilities,
  useMyBookings,
} from '../../api/bookings';
import { btnBusy, btnPrimary, card, input, label, pill, successText } from '../../components/ui/kit';
import { DatePicker } from '../../components/ui/DatePicker';
import { Select } from '../../components/ui/Select';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

const STATUS_PILL: Record<BookingStatus, { text: string; kind: 'green' | 'yellow' | 'red' }> = {
  [BookingStatus.CONFIRMED]: { text: 'Confirmed', kind: 'green' },
  [BookingStatus.PENDING]: { text: 'Pending', kind: 'yellow' },
  [BookingStatus.REJECTED]: { text: 'Rejected', kind: 'red' },
};

export function BookingsPage() {
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const { data: facilities } = useFacilities();
  const { data: slots } = useBookingSlots();
  const { data: myBookings } = useMyBookings();
  const create = useCreateBooking();

  const [facilityId, setFacilityId] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [conflict, setConflict] = useState<BookingConflict | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!facilityId && facilities?.length) setFacilityId(facilities[0].id);
  }, [facilities, facilityId]);
  useEffect(() => {
    if (!timeSlot && slots?.length) setTimeSlot(slots[0].label);
  }, [slots, timeSlot]);

  const submit = async (slot: string, fromSuggestion = false) => {
    if (create.isPending) return;
    if (!date) {
      toast(t('Pick a requested date first.'));
      return;
    }
    setSuccessMsg('');
    try {
      const booking = await create.mutateAsync({
        facilityId,
        date,
        timeSlot: slot,
        purpose: purpose || undefined,
        fromSuggestion,
      });
      setConflict(null);
      setSuccessMsg(
        fromSuggestion
          ? t('✅ Rebooked at {slot} (off-peak) — no conflicts. Status: pending staff confirmation.', { slot: booking.timeSlot })
          : t('✅ Booking request sent — no conflicts detected. Status: pending staff confirmation.'),
      );
      setPurpose('');
    } catch (err: any) {
      const c = conflictFromError(err);
      if (c) {
        setConflict(c);
        return;
      }
      const msg = err?.response?.data?.message;
      toast(Array.isArray(msg) ? msg[0] : (msg ?? t('Booking failed — try again.')));
    }
  };

  const upcoming = (myBookings ?? []).filter(
    (b) => b.status !== BookingStatus.REJECTED && b.date >= new Date().toISOString().slice(0, 10),
  );
  const past = (myBookings ?? []).filter((b) => !upcoming.includes(b));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Facility & Equipment Booking')}
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          {t('Our smart conflict resolver will suggest an alternative if your slot overlaps an existing booking.')}
        </p>

        <label style={label}>{t('Service / Facility Type')}</label>
        <Select
          value={facilityId}
          onChange={(v) => {
            setFacilityId(v);
            setConflict(null);
            setSuccessMsg('');
          }}
          options={(facilities ?? []).map((f) => ({ value: f.id, labelText: f.name }))}
          placeholder={t('Loading facilities…')}
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>{t('Requested Date')}</label>
            <DatePicker value={date} onChange={(v) => { setDate(v); setConflict(null); }} style={{ marginBottom: 12 }} />
          </div>
          <div>
            <label style={label}>{t('Preferred Time')}</label>
            <Select
              value={timeSlot}
              onChange={(v) => { setTimeSlot(v); setConflict(null); }}
              options={(slots ?? []).map((s) => ({ value: s.label, labelText: s.label }))}
              placeholder={t('Loading slots…')}
              style={{ marginBottom: 12 }}
            />
          </div>
        </div>

        <label style={label}>{t('Purpose (optional)')}</label>
        <input
          style={{ ...input, marginBottom: 16 }}
          placeholder={t('e.g., Basketball Practice, Birthday Party…')}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />

        {conflict && (
          <div style={{ background: '#FBE4E1', border: '1px solid #EFB9B2', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#C0392B' }}>
              {t('⚠ Conflict Detected:')} {conflict.message}
            </div>
            {conflict.suggestedSlot && (
              <div style={{ fontSize: 13, color: '#7A3B33', marginTop: 6 }}>
                💡 <strong>{t('Smart Suggestion:')}</strong> {t('shift to off-peak hour ({slot}) — conflict-free, then awaits staff confirmation.', { slot: conflict.suggestedSlot })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {conflict.suggestedSlot && (
                <button
                  onClick={() => submit(conflict.suggestedSlot!, true)}
                  style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 15px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                >
                  {t('Accept Suggestion ({slot})', { slot: conflict.suggestedSlot })}
                </button>
              )}
              <button
                onClick={() => setConflict(null)}
                style={{ background: '#fff', color: '#33415E', border: '1.5px solid #DFE5EE', borderRadius: 8, padding: '9px 15px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
              >
                {t('Choose Another Time')}
              </button>
            </div>
          </div>
        )}

        {successMsg && <div style={{ ...successText, marginBottom: 14 }}>{successMsg}</div>}

        <button onClick={() => submit(timeSlot)} style={create.isPending ? btnBusy : btnPrimary}>
          {create.isPending ? t('Checking availability…') : t('Submit')}
        </button>
        <p style={{ fontSize: 12, color: '#8A97AB', marginTop: 12, marginBottom: 0 }}>
          {t('Tip: Covered Court at 10:00 AM overlaps the recurring Zumba Class — try it to see the resolver.')}
        </p>
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('My Upcoming Bookings')}
        </h3>
        {upcoming.length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB' }}>{t('Nothing booked yet.')}</p>}
        {upcoming.map((b) => (
          <div key={b.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: '#7E8CA3' }}>
                {b.facilityName.split(' (')[0].toUpperCase()}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52', marginTop: 2 }}>
                {b.purpose ?? b.facilityName.split(' (')[0]}
              </div>
              <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 2 }}>
                {new Date(b.date + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {b.timeSlot}
              </div>
            </div>
            <span style={pill(STATUS_PILL[b.status].kind)}>{t(STATUS_PILL[b.status].text)}</span>
          </div>
        ))}
        {past.length > 0 && (
          <>
            <h4 style={{ margin: '18px 0 8px', font: '700 12px Poppins, sans-serif', color: '#7E8CA3', letterSpacing: '.06em' }}>
              {t('PAST / REJECTED')}
            </h4>
            {past.slice(0, 5).map((b) => (
              <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, color: '#8A97AB' }}>
                <span>{b.facilityName.split(' (')[0]} · {b.date} {b.timeSlot}</span>
                <span style={pill(STATUS_PILL[b.status].kind)}>{t(STATUS_PILL[b.status].text)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
