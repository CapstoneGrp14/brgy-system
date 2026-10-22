import { Role } from '@brgy/shared';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useActiveSos } from '../../api/realtime';
import { pageIcon, pageTitle } from '../../app/nav';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { roleHome, useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { Toasts } from '../ui/Toasts';
import { AssistantWidget } from './AssistantWidget';
import { Header } from './Header';
import { NotificationsDrawer } from './NotificationsDrawer';
import { PushOptInPrompt } from './PushOptInPrompt';
import { Sidebar } from './Sidebar';
import { StaffChatDrawer } from './StaffChatDrawer';

/** Red strip staff see everywhere while any SOS is active (FR-8.3). */
function SosAlertBanner({ portal }: { portal: Role }) {
  const { data: alerts } = useActiveSos();
  const location = useLocation();
  const t = useT();
  if (!alerts?.length) return null;
  const mapPath = portal === Role.ADMIN ? '/admin/sos-map' : '/employee/sos-map';
  const onMap = location.pathname === mapPath;
  const first = alerts[0];
  return (
    <div style={{ background: '#D64541', color: '#fff', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, fontWeight: 600 }}>
      <span style={{ animation: 'sosBlink 1.2s step-end infinite' }}>🆘</span>
      <span>
        {t('ACTIVE SOS')} — {first.residentName}
        {first.address ? ` (${first.address})` : ''}
        {alerts.length > 1 ? t(' +{n} more', { n: alerts.length - 1 }) : ''}
      </span>
      {!onMap && (
        <Link to={mapPath} style={{ color: '#fff', textDecoration: 'underline', fontWeight: 800, marginLeft: 'auto' }}>
          {t('View SOS Map →')}
        </Link>
      )}
      <style>{`@keyframes sosBlink { 50% { opacity: .25; } }`}</style>
    </div>
  );
}

/** Authenticated shell: role-checked sidebar + header + page outlet. */
export function PortalLayout({ role }: { role: Role }) {
  const { status, user } = useAuthStore();
  const notifOpen = useUiStore((s) => s.notifOpen);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUiStore((s) => s.closeMobileNav);
  const isMobile = useIsMobile();
  const location = useLocation();
  const t = useT();

  if (status === 'unknown') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748B' }}>
        {t('Loading session…')}
      </div>
    );
  }
  if (status === 'guest' || !user) return <Navigate to="/login" replace />;
  // The resident portal also admits staff with a linked resident profile (dual role).
  const allowed = role === Role.RESIDENT ? user.role === Role.RESIDENT || user.isResident : user.role === role;
  if (!allowed) return <Navigate to={roleHome(user.role)} replace />;

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      {/* Desktop: fixed sidebar. Mobile: slide-over drawer + backdrop. */}
      {!isMobile && <Sidebar user={user} portal={role} />}
      {isMobile && mobileNavOpen && (
        <>
          <div
            onClick={closeMobileNav}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,.55)', zIndex: 70 }}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 71, display: 'flex' }}>
            <Sidebar user={user} portal={role} mobile onNavigate={closeMobileNav} />
          </div>
        </>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header
          title={pageTitle(role, location.pathname)}
          icon={pageIcon(role, location.pathname)}
          user={user}
        />
        {role !== Role.RESIDENT && <SosAlertBanner portal={role} />}
        {/* Residents are the audience for urgent advisories, so the ask lives
            in their shell rather than on one page they may never open — which
            means it surfaces immediately after login. */}
        {role === Role.RESIDENT && <PushOptInPrompt />}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px 16px 28px' : '26px 30px' }}>
          <Outlet />
        </div>
      </main>
      {notifOpen && <NotificationsDrawer role={user.role} />}
      {role === Role.RESIDENT ? <AssistantWidget /> : <StaffChatDrawer />}
      <Toasts />
    </div>
  );
}
