import { useState } from 'react';
import { useAnnouncements } from '../../api/announcements';
import { card } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';

/** Resident announcements feed (FR-9.3) with a year filter. */
export function AnnouncementsFeedPage() {
  const t = useT();
  const isMobile = useIsMobile();
  const [year, setYear] = useState<string>('all');
  const { data: feed } = useAnnouncements(year === 'all' ? undefined : Number(year));
  const items = (feed?.items ?? []).filter((a) => a.channelBanner || a.urgent);
  const years = feed?.years ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12.5, color: '#7E8CA3', fontWeight: 700, flexShrink: 0 }}>{t('YEAR')}</span>
        <Select
          value={year}
          onChange={setYear}
          options={[
            { value: 'all', labelText: t('All years') },
            ...years.map((y) => ({ value: String(y), labelText: String(y) })),
          ]}
          // Narrow phones: take the rest of the row rather than overflow it.
          style={{ width: isMobile ? 'auto' : 150, flex: isMobile ? 1 : undefined, maxWidth: 200 }}
        />
      </div>

      {items.length === 0 && (
        <div style={{ ...card, padding: isMobile ? '22px 18px' : '26px 28px', textAlign: 'center', color: '#8A97AB', fontSize: 13.5 }}>
          {year === 'all'
            ? t('📭 No announcements yet — barangay updates will appear here.')
            : t('📭 No announcements in {year} — barangay updates will appear here.', { year })}
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
              style={{ width: '100%', maxHeight: isMobile ? 200 : 260, objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{ padding: isMobile ? '16px 16px 18px' : '20px 24px' }}>
            {/* The URGENT pill sits on its own line on phones — sharing the
                row squeezed the title until it broke mid-word. */}
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                gap: isMobile ? 7 : 10,
                flexWrap: 'wrap',
                alignItems: isMobile ? 'flex-start' : 'center',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  font: `700 ${isMobile ? 15 : 15.5}px Poppins, sans-serif`,
                  color: a.urgent ? '#C0392B' : '#1E3A5F',
                  lineHeight: 1.4,
                  minWidth: 0,
                  overflowWrap: 'break-word',
                }}
              >
                {a.urgent ? '🚨 ' : '📢 '}
                {a.title}
              </h3>
              {a.urgent && (
                <span style={{ background: '#D64541', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '.05em', flexShrink: 0 }}>
                  {t('URGENT')}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13.5, color: '#2E3A52', margin: '10px 0 12px', whiteSpace: 'pre-line', lineHeight: 1.6, overflowWrap: 'break-word' }}>
              {a.body}
            </p>
            <div style={{ fontSize: 12, color: '#8A97AB', lineHeight: 1.5 }}>
              {t('Posted {date} · {author}', { date: fmtDateLong(a.createdAt), author: a.authorLabel })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
