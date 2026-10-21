import type { AuthUser } from '@brgy/shared';
import { Role, VerificationStatus } from '@brgy/shared';
import { useState, type MouseEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';
import { NAV, navFor } from '../../app/nav';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** "Complaints & Blotter" -> "CB"; "Dashboard" -> "Da". */
function navInitials(labelText: string): string {
  const words = labelText.split(/[\s&/]+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? labelText).slice(0, 2).toUpperCase();
}

export function Sidebar({
  user,
  portal,
  mobile = false,
  onNavigate,
}: {
  user: AuthUser;
  /** Which portal's nav to render — may differ from user.role for dual-role staff. */
  portal: Role;
  /** Rendered as a slide-over drawer: always expanded, no collapse toggle. */
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const collapsed = useUiStore((s) => s.navCollapsed) && !mobile;
  const toggleNav = useUiStore((s) => s.toggleNav);
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const t = useT();
  /** Collapsed-rail tooltip (position: fixed — immune to the sidebar's overflow clipping). */
  const [tip, setTip] = useState<{ top: number; text: string } | null>(null);
  const tipHandlers = (text: string) =>
    collapsed
      ? {
          onMouseEnter: (e: MouseEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTip({ top: r.top + r.height / 2, text });
          },
          onMouseLeave: () => setTip(null),
        }
      : {};

  const portalLabel = t(
    portal === Role.RESIDENT ? 'BARANGAY' : portal === Role.EMPLOYEE ? 'EMPLOYEE PORTAL' : 'ADMIN PORTAL',
  );
  // Dual-role staff can hop between their staff portal and their own resident portal.
  const canSwitch = user.role !== Role.RESIDENT && user.isResident;
  const inResidentPortal = portal === Role.RESIDENT;

  const onSignOut = async () => {
    await logout();
    toast(t('You have been signed out.'));
    navigate('/login');
  };

  return (
    <aside
      className="no-scrollbar"
      style={{
        width: collapsed ? 74 : 264,
        minWidth: collapsed ? 74 : 264,
        // Vertical gradient rather than a flat fill: it deepens toward the
        // bottom so the long nav column reads as one surface, and separates
        // the sidebar from the page without needing a border.
        background: 'linear-gradient(180deg, #2B5181 0%, #1E3A5F 45%, #142B46 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width .2s ease, min-width .2s ease',
      }}
    >
      {collapsed && tip && (
        <div
          style={{
            position: 'fixed',
            left: 82,
            top: tip.top,
            transform: 'translateY(-50%)',
            background: '#1E3A5F',
            color: '#fff',
            padding: '7px 12px',
            borderRadius: 8,
            font: '600 12.5px Poppins, sans-serif',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 18px rgba(23,43,77,.35)',
            border: '1px solid rgba(255,255,255,.12)',
            zIndex: 120,
            pointerEvents: 'none',
            animation: 'fadeIn .12s ease',
          }}
        >
          {tip.text}
          <span
            style={{
              position: 'absolute',
              left: -5,
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: 9,
              height: 9,
              background: '#1E3A5F',
              borderLeft: '1px solid rgba(255,255,255,.12)',
              borderBottom: '1px solid rgba(255,255,255,.12)',
            }}
          />
        </div>
      )}
      <div
        style={{
          padding: collapsed ? '16px 10px 14px' : '20px 21px 16px',
          borderBottom: '1px solid rgba(255,255,255,.09)',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: collapsed ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div style={{ font: `800 ${collapsed ? 19 : 34}px Poppins, sans-serif`, color: '#F5A81C', lineHeight: 1 }}>
            591
          </div>
          {!collapsed && (
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: '#93A7C0', fontWeight: 700, marginTop: 4 }}>
              {portalLabel}
            </div>
          )}
        </div>
        <button
          onClick={mobile ? onNavigate : toggleNav}
          title={mobile ? t('Close menu') : collapsed ? t('Expand sidebar') : t('Collapse sidebar')}
          style={{
            background: 'rgba(255,255,255,.08)',
            border: 'none',
            color: '#C2CFE0',
            borderRadius: 7,
            width: 26,
            height: 26,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {mobile ? '✕' : collapsed ? '»' : '«'}
        </button>
      </div>

      <div
        style={{
          padding: collapsed ? '14px 10px' : '16px 21px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          borderBottom: '1px solid rgba(255,255,255,.09)',
        }}
      >
        <div
          style={{
            width: collapsed ? 38 : 44,
            height: collapsed ? 38 : 44,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `700 ${collapsed ? 13 : 15}px Poppins, sans-serif`,
            background: user.role === Role.EMPLOYEE ? '#27AE60' : '#F2A71B',
            color: user.role === Role.EMPLOYEE ? '#fff' : '#16324F',
          }}
        >
          {initials(user.fullName)}
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName}
            </div>
            {user.position && !inResidentPortal && (
              <div style={{ color: '#93A7C0', fontSize: 11.5, fontWeight: 600, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.position}
              </div>
            )}
            {(user.role === Role.RESIDENT || (canSwitch && inResidentPortal)) && (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 5,
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,.28)',
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: '.07em',
                  lineHeight: 1.35,
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  color: user.verificationStatus === VerificationStatus.VERIFIED ? '#6FDF9A' : '#FFC53D',
                }}
              >
                {t(user.verificationStatus === VerificationStatus.VERIFIED ? 'VERIFIED RESIDENT' : 'PENDING VERIFICATION')}
              </span>
            )}
          </div>
        )}
      </div>

      {canSwitch && (
        <button
          onClick={() => {
            navigate(inResidentPortal ? (user.role === Role.ADMIN ? '/admin/overview' : '/employee/dashboard') : '/resident/dashboard');
            onNavigate?.();
          }}
          {...tipHandlers(t(inResidentPortal ? 'Back to Staff Portal' : 'My Resident Portal'))}
          style={{
            margin: collapsed ? '10px 8px 0' : '12px 16px 0',
            padding: collapsed ? '9px 0' : '9px 12px',
            borderRadius: 8,
            border: '1px solid rgba(245,168,28,.45)',
            background: 'rgba(245,168,28,.12)',
            color: '#F5A81C',
            font: '700 12px Poppins, sans-serif',
            cursor: 'pointer',
            lineHeight: 1.35,
            overflowWrap: 'break-word',
          }}
          title={t(inResidentPortal ? 'Back to Staff Portal' : 'My Resident Portal')}
        >
          {collapsed ? '⇄' : t(inResidentPortal ? '⇄ Back to Staff Portal' : '⇄ My Resident Portal')}
        </button>
      )}

      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navFor(portal, user.allowedModules).map((section) => (
          <div key={section.labelText}>
            {!collapsed && (
              <div style={{ padding: '14px 21px 6px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#7E93AE', lineHeight: 1.35, overflowWrap: 'break-word' }}>
                {t(section.labelText)}
              </div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                {...tipHandlers(t(item.labelText))}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 12,
                  padding: collapsed ? '12px 0' : '11px 18px 11px 21px',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background .15s',
                  borderLeft: `3px solid ${isActive ? '#F5A81C' : 'transparent'}`,
                  background: isActive ? 'rgba(255,255,255,.07)' : 'transparent',
                  color: item.sos ? '#FF8B7E' : isActive ? '#fff' : '#C2CFE0',
                })}
              >
                {collapsed ? (
                  // Collapsed rail has no room for a label, and the icons are
                  // gone — initials keep each row identifiable and uniform.
                  <span style={{ font: '700 12px Poppins, sans-serif', letterSpacing: '.04em' }}>
                    {navInitials(t(item.labelText))}
                  </span>
                ) : (
                  <span style={{ minWidth: 0, lineHeight: 1.3, overflowWrap: 'break-word' }}>
                    {t(item.labelText)}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button
        onClick={onSignOut}
        {...tipHandlers(t('Sign Out'))}
        style={{
          padding: collapsed ? '14px 0' : '14px 21px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          color: '#C2CFE0',
          background: 'none',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,.09)',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span style={{ flexShrink: 0 }}>↩</span>
        {!collapsed && (
          <span style={{ minWidth: 0, lineHeight: 1.3, overflowWrap: 'break-word', textAlign: 'left' }}>
            {t('Sign Out')}
          </span>
        )}
      </button>
    </aside>
  );
}
