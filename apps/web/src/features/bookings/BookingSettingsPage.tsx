import { useState } from 'react';
import { useBookingAdmin, useBookingConfig } from '../../api/bookings';
import { btnPrimary, card, input, label, pill } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

/** Admin: what can be booked and at which times. */
export function BookingSettingsPage() {
  const { data } = useBookingConfig();
  const { addFacility, toggleFacility, setBlock, addSlot, toggleSlot } = useBookingAdmin();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();

  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<'FACILITY' | 'EQUIPMENT'>('FACILITY');
  const [slotLabel, setSlotLabel] = useState('');
  const [slotOffPeak, setSlotOffPeak] = useState(false);
  const [blockFor, setBlockFor] = useState<string | null>(null);
  const [blockSlot, setBlockSlot] = useState('');
  const [blockTitle, setBlockTitle] = useState('');

  const err = (e: any, fallback: string) => {
    const m = e?.response?.data?.message;
    toast(Array.isArray(m) ? m[0] : (m ?? fallback));
  };

  const activeSlots = (data?.slots ?? []).filter((s) => s.isActive);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 22, alignItems: 'start' }}>
      {/* Facilities */}
      <div style={{ ...card, padding: '24px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Bookable Facilities & Equipment')}</h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
          {t('Disabled items are hidden from residents. Recurring reservations (e.g. a weekly class) block their slot every day.')}
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder={t('e.g., Multi-Purpose Room')} value={facilityName} onChange={(e) => setFacilityName(e.target.value)} />
          <Select value={facilityType} onChange={(v) => setFacilityType(v as 'FACILITY' | 'EQUIPMENT')} options={[{ value: 'FACILITY', labelText: t('Facility / Place') }, { value: 'EQUIPMENT', labelText: t('Equipment') }]} style={{ width: 160 }} />
          <button
            onClick={() =>
              facilityName.trim()
                ? addFacility.mutateAsync({ name: facilityName.trim(), type: facilityType }).then(() => { toast(t('🏟 "{name}" added.', { name: facilityName.trim() })); setFacilityName(''); }).catch((e) => err(e, t('Could not add facility.')))
                : toast(t('Type the facility name first.'))
            }
            style={{ ...btnPrimary, width: 'auto', padding: '11px 18px' }}
          >
            {t('+ Add')}
          </button>
        </div>

        {(data?.facilities ?? []).map((f) => (
          <div key={f.id} style={{ borderTop: '1px solid #F0F3F8', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: f.isActive ? '#2E3A52' : '#9AA6B7' }}>
                {f.name}{' '}
                <span style={pill(f.type === 'EQUIPMENT' ? 'purple' : 'blue')}>{f.type === 'EQUIPMENT' ? t('Equipment') : t('Facility')}</span>{' '}
                {!f.isActive && <span style={pill('gray')}>{t('Disabled')}</span>}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setBlockFor(blockFor === f.id ? null : f.id)} style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                  {t('+ Reserve slot')}
                </button>
                <button
                  onClick={() => toggleFacility.mutateAsync(f.id).then(() => toast(f.isActive ? t('🚫 {name} disabled.', { name: f.name }) : t('✅ {name} enabled.', { name: f.name }))).catch((e) => err(e, t('Failed.')))}
                  style={{ background: 'none', border: 'none', color: f.isActive ? '#C0392B' : '#1F8B4C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                >
                  {f.isActive ? t('Disable') : t('Enable')}
                </button>
              </div>
            </div>

            {(f.blockedSlots ?? []).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {(f.blockedSlots ?? []).map((b) => (
                  <span key={b.slot} style={{ ...pill('orange'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    🔁 {b.title} @ {b.slot}
                    <button
                      onClick={() => setBlock.mutateAsync({ id: f.id, slot: b.slot, remove: true }).then(() => toast(t('Removed {title} @ {slot}', { title: b.title, slot: b.slot }))).catch((e) => err(e, t('Failed.')))}
                      style={{ background: 'none', border: 'none', color: '#C96A11', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {blockFor === f.id && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', background: '#F8FAFD', borderRadius: 9, padding: '10px 12px' }}>
                <Select compact value={blockSlot} onChange={setBlockSlot} placeholder={t('Time slot…')} options={activeSlots.map((s) => ({ value: s.label, labelText: s.label }))} style={{ width: 130 }} />
                <input style={{ ...input, padding: '8px 12px', flex: 1, minWidth: 160, fontSize: 13 }} placeholder={t('Reservation title, e.g. Zumba Class')} value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} />
                <button
                  onClick={() =>
                    blockSlot && blockTitle.trim()
                      ? setBlock.mutateAsync({ id: f.id, slot: blockSlot, title: blockTitle.trim() }).then(() => { toast(t('🔁 Reserved {slot} for {title}.', { slot: blockSlot, title: blockTitle.trim() })); setBlockFor(null); setBlockSlot(''); setBlockTitle(''); }).catch((e) => err(e, t('Failed.')))
                      : toast(t('Pick a slot and give the reservation a title.'))
                  }
                  style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', font: '700 12px Poppins, sans-serif', cursor: 'pointer' }}
                >
                  {t('Reserve')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div style={{ ...card, padding: '24px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Booking Time Slots')}</h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
          {t('The conflict resolver suggests ')}<strong>{t('off-peak')}</strong>{t(' slots first. At least one slot must stay active.')}
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <input style={{ ...input, width: 130 }} placeholder="11:00 AM" value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} />
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0, cursor: 'pointer' }}>
            <input type="checkbox" checked={slotOffPeak} onChange={(e) => setSlotOffPeak(e.target.checked)} />
            {t('Off-peak')}
          </label>
          <button
            onClick={() =>
              addSlot.mutateAsync({ label: slotLabel, isOffPeak: slotOffPeak }).then(() => { toast(t('🕐 {label} added.', { label: slotLabel })); setSlotLabel(''); setSlotOffPeak(false); }).catch((e) => err(e, t('Could not add slot.')))
            }
            style={{ ...btnPrimary, width: 'auto', padding: '11px 18px' }}
          >
            {t('+ Add Slot')}
          </button>
        </div>

        {(data?.slots ?? []).map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #F0F3F8' }}>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 0, color: s.isActive ? '#2E3A52' : '#9AA6B7' }}>
              🕐 {s.label} {s.isOffPeak && <span style={pill('green')}>{t('Off-peak')}</span>}{' '}
              {!s.isActive && <span style={pill('gray')}>{t('Disabled')}</span>}
            </div>
            <button
              onClick={() => toggleSlot.mutateAsync(s.id).then(() => toast(s.isActive ? t('🚫 {name} disabled.', { name: s.label }) : t('✅ {name} enabled.', { name: s.label }))).catch((e) => err(e, t('Failed.')))}
              style={{ background: 'none', border: 'none', color: s.isActive ? '#C0392B' : '#1F8B4C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
            >
              {s.isActive ? t('Disable') : t('Enable')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
