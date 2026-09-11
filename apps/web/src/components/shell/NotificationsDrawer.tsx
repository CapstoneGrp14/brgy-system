import { Role } from '@brgy/shared';
import { useEffect } from 'react';
import { useMarkAllRead, useNotifications } from '../../api/requests';
import { useT, type TFunc } from '../../i18n';
import { useUiStore } from '../../stores/ui';

function timeAgo(iso: string, t: TFunc): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('Just now');
  if (mins < 60) return t('{n} min ago', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t(hours > 1 ? '{n} hours ago' : '{n} hour ago', { n: hours });
  const days = Math.floor(hours / 24);
  return t(days > 1 ? '{n} days ago' : '{n} day ago', { n: days });
}

export function NotificationsDrawer({ role }: { role: Role }) {
  const closeNotif = useUiStore((s) => s.closeNotif);
  const soundsMuted = useUiStore((s) => s.soundsMuted);
  const toggleSounds = useUiStore((s) => s.toggleSounds);
  const { data } = useNotifications();
  const markAllRead = useMarkAllRead();
  const t = useT();

  // Opening the drawer marks everything read (clears the bell dot).
  useEffect(() => {
    if (data && data.unreadCount > 0) markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.unreadCount]);

  const items = data?.items ?? [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 66,
        right: 12,
        width: 'min(310px, calc(100vw - 24px))',
        maxHeight: '70vh',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #E3E8F0',
        borderRadius: 12,
        boxShadow: '0 10px 30px rgba(23,43,77,.14)',
        zIndex: 60,
        animation: 'fadeIn .18s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid #EDF0F5', position: 'sticky', top: 0, background: '#fff' }}>
        <strong style={{ font: '700 14px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Notifications')}</strong>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={toggleSounds}
            title={soundsMuted ? t('Unmute notification sounds') : t('Mute notification sounds')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            {soundsMuted ? '🔇' : '🔊'}
          </button>
          <button onClick={closeNotif} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 15 }}>
            ✕
          </button>
        </div>
      </div>
      {items.length === 0 && (
        <div style={{ padding: '18px 16px', fontSize: 13, color: '#8A97AB' }}>
          {role === Role.RESIDENT ? t('Nothing yet — updates on your requests will land here.') : t('All clear — nothing needs your attention.')}
        </div>
      )}
      {items.map((n) => (
        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F2F4F9', background: n.readAt ? '#fff' : '#F7FAFF' }}>
          <div style={{ fontSize: 13.5, fontWeight: n.readAt ? 500 : 700, color: '#2E3A52' }}>{n.title}</div>
          <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 3 }}>{timeAgo(n.createdAt, t)}</div>
        </div>
      ))}
    </div>
  );
}
