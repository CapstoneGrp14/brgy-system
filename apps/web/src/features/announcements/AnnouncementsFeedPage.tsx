import { useEffect, useState } from 'react';
import { useAnnouncements } from '../../api/announcements';
import { disablePush, enablePush, pushState, type PushState } from '../../api/push';
import { card } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

/** Resident announcements feed (FR-9.3) with a year filter. */
export function AnnouncementsFeedPage() {
  const t = useT();
  const isMobile = useIsMobile();
  const [year, setYear] = useState<string>('all');
  const { data: feed } = useAnnouncements(year === 'all' ? undefined : Number(year));
  const items = (feed?.items ?? []).filter((a) => a.channelBanner || a.urgent);
  const years = feed?.years ?? [];

  // Opt-in for urgent push. Where it cannot work the card still renders and
  // says why — silence was indistinguishable from the feature being broken,
  // which is exactly how it read on a phone opening the portal over plain
  // http:// (no secure context, so no service worker, so no card at all).
  const toast = useUiStore((st) => st.toast);
  const [push, setPush] = useState<PushState>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    void pushState().then(setPush);
  }, []);

  const togglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const next = push === 'granted' ? await disablePush() : await enablePush();
      setPush(next);
      if (next === 'granted') toast(t('🔔 Urgent alerts on — we will notify this device.'));
      else if (next === 'denied') toast(t('Notifications are blocked in your browser settings.'));
      else if (push === 'granted') toast(t('🔕 Urgent alerts off for this device.'));
    } catch {
      toast(t('Could not change notification settings.'));
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780 }}>
      {(push === 'insecure' || push === 'unsupported' || push === 'disabled') && (
        <div style={{ ...card, padding: '14px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E3A5F' }}>
            {t('Urgent alerts are not available on this device')}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3, lineHeight: 1.55 }}>
            {push === 'insecure' &&
              t('Browsers only allow notifications over a secure (https) address. Open the portal at its https address — on a plain http address, including a local network IP, the browser blocks them before the portal is asked.')}
            {push === 'unsupported' &&
              t('This browser does not support web notifications. On iPhone, add the portal to your Home Screen first; on Android, use Chrome.')}
            {push === 'disabled' &&
              t('Notifications are not configured on this server yet. Ask the barangay IT staff to set the push keys.')}
          </div>
          <div style={{ fontSize: 12.5, color: '#8A97AB', marginTop: 6, lineHeight: 1.55 }}>
            {t('You will still see urgent announcements here, in the notification bell, and by email.')}
          </div>
        </div>
      )}

      {(push === 'default' || push === 'granted' || push === 'denied') && (
        <div style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E3A5F' }}>
              {t('Urgent alerts on this device')}
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2, lineHeight: 1.5 }}>
              {push === 'denied'
                ? t('Blocked in your browser settings — allow notifications for this site to turn them on.')
                : t('Get evacuation notices and emergency advisories even when the portal is closed.')}
            </div>
          </div>
          {push !== 'denied' && (
            <button
              onClick={() => void togglePush()}
              disabled={pushBusy}
              style={{
                flexShrink: 0,
                background: push === 'granted' ? '#fff' : '#1E3A5F',
                color: push === 'granted' ? '#C0392B' : '#fff',
                border: push === 'granted' ? '1.5px solid #E8B4AE' : 'none',
                borderRadius: 9,
                padding: '9px 16px',
                font: '700 12.5px Poppins, sans-serif',
                cursor: pushBusy ? 'wait' : 'pointer',
              }}
            >
              {pushBusy ? t('Working…') : push === 'granted' ? t('Turn Off') : t('Turn On')}
            </button>
          )}
        </div>
      )}

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
