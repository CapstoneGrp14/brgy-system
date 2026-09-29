import type { CSSProperties } from 'react';
import type { AuthUser } from '@brgy/shared';
import { Role } from '@brgy/shared';
import { useNotifications } from '../../api/requests';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';
import { Select } from '../ui/Select';

export function Header({ title, icon, user }: { title: string; icon?: string | null; user: AuthUser }) {
  const toggleNotif = useUiStore((s) => s.toggleNotif);
  const openMobileNav = useUiStore((s) => s.openMobileNav);
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const { data: notifications } = useNotifications();
  const hasUnread = (notifications?.unreadCount ?? 0) > 0;
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const t = useT();

  const now = new Date();
  const dateText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const subtitle =
    user.role === Role.EMPLOYEE
      ? `${dateText} · ${t(greeting)}, ${user.fullName.split(' ')[0]}`
      : user.role === Role.ADMIN
        ? `Barangay 591 · ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · ${t('Chairman View')}`
        : null;

  const menuButton = isMobile && (
    <button
      onClick={openMobileNav}
      title={t('Menu')}
      style={{ background: '#F4F6FA', border: '1px solid #E3E8F0', borderRadius: 9, width: 38, height: 38, cursor: 'pointer', fontSize: 17, flexShrink: 0 }}
    >
      ☰
    </button>
  );

  const titleBlock = (
    <div style={{ minWidth: 0 }}>
      <h1
        style={{
          margin: 0,
          font: `700 ${isMobile ? 17 : 21}px Poppins, sans-serif`,
          color: '#1E3A5F',
          lineHeight: 1.25,
          // Wrap between words only. Squeezed beside the header controls this
          // used to break mid-word — "Announcement" with a lone "s" beneath —
          // so on mobile the title also gets a full-width row of its own.
          overflowWrap: 'normal',
        }}
      >
        {icon ? `${icon} ` : ''}
        {t(title)}
      </h1>
      {subtitle && !isMobile && <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>{subtitle}</div>}
    </div>
  );

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, flexShrink: 0 }}>
      <Select
        compact
        value={language}
        options={[
          { value: 'en', labelText: `🌐 ${t('English')}` },
          { value: 'fil', labelText: `🌐 ${t('Filipino')}` },
        ]}
        onChange={(v) => {
          setLanguage(v as 'en' | 'fil');
          toast(
            v === 'fil'
              ? '🌐 Nakatakda na sa Filipino ang buong sistema.'
              : '🌐 Language set to English across the system.',
          );
        }}
        style={{ width: isMobile ? 108 : 128 }}
      />
      <button
        onClick={toggleNotif}
        title={t('Notifications')}
        style={{ position: 'relative', background: '#F4F6FA', border: '1px solid #E3E8F0', borderRadius: 9, width: 38, height: 38, cursor: 'pointer', fontSize: 16 }}
      >
        🔔
        {hasUnread && (
          <span style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#D64541' }} />
        )}
      </button>
    </div>
  );

  const shell: CSSProperties = {
    background: '#fff',
    borderBottom: '1px solid #E3E8F0',
    flexShrink: 0,
  };

  // Mobile: controls on top, page title on its own full-width line below.
  // Desktop: one row, title left / controls right.
  if (isMobile) {
    return (
      <header style={{ ...shell, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {menuButton}
          {actions}
        </div>
        {titleBlock}
      </header>
    );
  }

  return (
    <header
      style={{
        ...shell,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '16px 30px',
      }}
    >
      {titleBlock}
      {actions}
    </header>
  );
}
