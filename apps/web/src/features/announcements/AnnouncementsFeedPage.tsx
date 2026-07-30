import { useState } from 'react';
import { useAnnouncements } from '../../api/announcements';
import { card } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { fmtDateLong } from '../../components/ui/status';

/** Resident announcements feed (FR-9.3) with a year filter. */
export function AnnouncementsFeedPage() {
  const [year, setYear] = useState<string>('all');
  const { data: feed } = useAnnouncements(year === 'all' ? undefined : Number(year));
  const items = (feed?.items ?? []).filter((a) => a.channelBanner || a.urgent);
  const years = feed?.years ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12.5, color: '#7E8CA3', fontWeight: 700 }}>YEAR</span>
        <Select
          value={year}
          onChange={setYear}
          options={[
            { value: 'all', labelText: 'All years' },
            ...years.map((y) => ({ value: String(y), labelText: String(y) })),
          ]}
          style={{ width: 150 }}
        />
      </div>

      {items.length === 0 && (
        <div style={{ ...card, padding: '26px 28px', textAlign: 'center', color: '#8A97AB', fontSize: 13.5 }}>
          📭 No announcements {year === 'all' ? 'yet' : `in ${year}`} — barangay updates will appear here.
        </div>
      )}
      {items.map((a) => (
        <div
          key={a.id}
          style={{
            ...card,
            overflow: 'hidden',
            padding: 0,
            ...(a.urgent ? { background: '#FEF5F4', boxShadow: 'inset 4px 0 0 #D64541' } : {}),
          }}
        >
          {a.photoUrl && (
            <img
              src={a.photoUrl}
              alt={a.title}
              style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <h3 style={{ margin: 0, font: '700 15.5px Poppins, sans-serif', color: a.urgent ? '#C0392B' : '#1E3A5F' }}>
                {a.urgent ? '🚨 ' : '📢 '}
                {a.title}
              </h3>
              {a.urgent && (
                <span style={{ background: '#D64541', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '.05em' }}>
                  URGENT
                </span>
              )}
            </div>
            <p style={{ fontSize: 13.5, color: '#2E3A52', margin: '10px 0 12px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {a.body}
            </p>
            <div style={{ fontSize: 12, color: '#8A97AB' }}>
              Posted {fmtDateLong(a.createdAt)} · {a.authorLabel}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
