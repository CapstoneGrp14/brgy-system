import { BookingStatus, RequestStatus, SLA_META, VerificationStatus } from '@brgy/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAnnouncements } from '../../api/announcements';
import { useMyBookings } from '../../api/bookings';
import { useMyRequests } from '../../api/requests';
import { Modal } from '../../components/ui/Modal';
import { card, pill } from '../../components/ui/kit';
import { REQUEST_ICON, STATUS_PILL, deadlineChip, fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

const ACTIVE = [
  RequestStatus.PENDING,
  RequestStatus.PROCESSING,
  RequestStatus.READY,
  RequestStatus.OVERDUE,
  RequestStatus.ESCALATED,
];

const QUICK_ACTIONS: Array<{ icon: string; labelText: string; to: string; lock?: boolean }> = [
  { icon: '📋', labelText: 'Request Barangay Clearance', to: '/resident/documents' },
  { icon: '✏️', labelText: 'File a Complaint', to: '/resident/complaints' },
  { icon: '🏥', labelText: 'Request Free Medicine', to: '/resident/health' },
  { icon: '📅', labelText: 'Book Court / Venue', to: '/resident/bookings' },
  { icon: '🖨️', labelText: 'Free Printing (Students)', to: '/resident/student' },
  { icon: '🧾', labelText: 'Indigency Certificate', to: '/resident/documents', lock: true },
  { icon: '📜', labelText: 'FTJS Certification', to: '/resident/documents', lock: true },
  { icon: '📷', labelText: 'Request CCTV Footage', to: '/resident/complaints' },
];

export function ResidentDashboard() {
  const user = useAuthStore((s) => s.user);
  const verified = user?.verificationStatus === VerificationStatus.VERIFIED;
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const t = useT();
  const { data: requests } = useMyRequests();
  const { data: bookings } = useMyBookings();
  const { data: announcementFeed } = useAnnouncements();
  const bannerPost = (announcementFeed?.items ?? []).find((a) => a.channelBanner || a.urgent);
  const [posterOpen, setPosterOpen] = useState(false);
  const [allReqOpen, setAllReqOpen] = useState(false);

  const active = (requests ?? []).filter((r) => ACTIVE.includes(r.status)).slice(0, 3);
  const recent = (requests ?? []).slice(0, 4);
  const upcomingBookings = (bookings ?? [])
    .filter((b) => b.status !== BookingStatus.REJECTED && b.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* One-tap SOS banner */}
      <div style={{ background: '#C0392B', borderRadius: 12, padding: isMobile ? '18px 18px' : '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#fff', font: '700 16px Poppins, sans-serif' }}>{t('🆘 One-Tap Emergency Alert')}</div>
          <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, marginTop: 4 }}>
            {t('Sends your exact location to the nearest barangay officer immediately.')}
          </div>
        </div>
        <button
          onClick={() => navigate('/resident/sos')}
          style={{ background: '#fff', color: '#C0392B', border: 'none', borderRadius: 9, padding: '11px 20px', font: '700 14px Poppins, sans-serif', cursor: 'pointer' }}
        >
          {t('📍 Send SOS Now')}
        </button>
      </div>

      {/* Latest announcement banner (FR-9.3) — compact strip; poster opens in a lightbox */}
      {bannerPost && (
        <div
          onClick={() => (bannerPost.photoUrl ? setPosterOpen(true) : navigate('/resident/announcements'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            borderRadius: 12,
            padding: bannerPost.photoUrl ? '10px 20px 10px 10px' : '15px 20px',
            ...(bannerPost.urgent
              ? { background: '#FEF5F4', border: '2px solid #D64541' }
              : { background: '#F0F5FF', border: '2px solid #BFD2F0' }),
          }}
        >
          {bannerPost.photoUrl && (
            <img
              src={bannerPost.photoUrl}
              alt={bannerPost.title}
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 9, flex: 'none' }}
            />
          )}
          <div style={{ fontSize: 13.5, color: bannerPost.urgent ? '#C0392B' : '#1E3A5F', minWidth: 0, flex: 1 }}>
            <strong>{bannerPost.urgent ? t('🚨 URGENT: ') : '📢 '}{bannerPost.title}</strong>
            <span style={{ color: bannerPost.urgent ? '#B06060' : '#64748B' }}>
              {' '}· {fmtDateLong(bannerPost.createdAt)}
            </span>
          </div>
          <span style={{ font: '700 12.5px Poppins, sans-serif', color: bannerPost.urgent ? '#C0392B' : '#2E66D0', whiteSpace: 'nowrap' }}>
            {bannerPost.photoUrl ? t('🖼️ View poster') : t('Read more →')}
          </span>
        </div>
      )}

      {/* Poster lightbox */}
      {bannerPost && posterOpen && (
        <Modal title={bannerPost.urgent ? `🚨 ${bannerPost.title}` : `📢 ${bannerPost.title}`} onClose={() => setPosterOpen(false)} width={640}>
          {bannerPost.photoUrl && (
            <img
              src={bannerPost.photoUrl}
              alt={bannerPost.title}
              style={{ width: '100%', height: 'auto', borderRadius: 10, display: 'block', marginBottom: 14 }}
            />
          )}
          <p style={{ fontSize: 13.5, color: '#2E3A52', margin: '0 0 12px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {bannerPost.body}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#8A97AB' }}>
              {t('Posted {date} · {author}', { date: fmtDateLong(bannerPost.createdAt), author: bannerPost.authorLabel })}
            </span>
            <Link to="/resident/announcements" style={{ font: '700 12.5px Poppins, sans-serif', color: '#2E66D0', textDecoration: 'none' }}>
              {t('All announcements →')}
            </Link>
          </div>
        </Modal>
      )}

      {/* Verification nudge — services stay locked until staff approves */}
      {!verified && (
        <div style={{ background: '#FFF7DE', border: '2px solid #F5A81C', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13.5, color: '#7A611B' }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1.6s ease infinite', marginRight: 6 }}>⚠️</span>
            <strong>{t('Verification needed.')}</strong>{' '}
            {t('Barangay services are locked until staff verifies your identity — upload a valid ID or supporting document to unlock them.')}
          </div>
          <button
            onClick={() => navigate('/resident/upload')}
            style={{ background: '#F5A81C', color: '#16324F', border: 'none', borderRadius: 9, padding: '10px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t('📎 Upload Documents →')}
          </button>
        </div>
      )}

      {/* ARTA SLA tracker */}
      <div style={{ ...card, padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
          <h3 style={{ margin: 0, font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
            {t('⏱ ARTA SLA Tracker — My Active Requests')}
          </h3>
          <span style={{ fontSize: 12, color: '#8A97AB' }}>{t('3-day simple · 7-day complex · 20-day technical')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
          {active.length === 0 && (
            <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>{t('No active requests — file one from Quick Actions below.')}</p>
          )}
          {active.map((r) => {
            const chip = deadlineChip(r);
            const pct = Math.min(100, Math.round((r.slaDay / r.slaDays) * 100));
            const barColor = chip.kind === 'red' ? '#D64541' : chip.kind === 'yellow' ? '#F5A81C' : '#27AE60';
            return (
              <div key={r.id} style={{ border: '1px solid #E9EDF4', borderRadius: 10, padding: '15px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#8A97AB', margin: '3px 0 10px' }}>{t(SLA_META[r.slaClass].labelText)}</div>
                <div style={{ height: 6, borderRadius: 999, background: '#EDF1F7' }}>
                  <div style={{ height: 6, borderRadius: 999, width: `${r.overdueDays > 0 ? 100 : pct}%`, background: barColor }} />
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 9, color: chip.kind === 'red' ? '#C0392B' : chip.kind === 'yellow' ? '#C96A11' : '#1F8B4C' }}>
                  {r.overdueDays > 0
                    ? t(r.overdueDays > 1 ? '⚠ Overdue by {n} days' : '⚠ Overdue by {n} day', { n: r.overdueDays })
                    : `${chip.text} — ${chip.kind === 'yellow' ? t('⚠ Approaching deadline') : t('✓ On track')}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Quick Actions')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14 }}>
          {QUICK_ACTIONS.map((q) => {
            const isLocked = !verified;
            return (
              <button
                key={q.labelText}
                onClick={() =>
                  isLocked
                    ? toast(t('🔒 Locked until verification — upload your supporting documents first.'))
                    : navigate(q.to)
                }
                style={{ ...card, padding: '20px 12px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 26 }}>{isLocked ? '🔒' : q.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10, lineHeight: 1.35, color: isLocked ? '#9AA6B7' : '#33415E' }}>
                  {t(q.labelText)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent requests + bookings */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <div style={{ ...card, padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('My Recent Requests')}</h3>
            <button
              onClick={() => setAllReqOpen(true)}
              style={{ background: 'none', border: 'none', padding: 0, font: '700 13px Poppins, sans-serif', color: '#2E66D0', cursor: 'pointer' }}
            >
              {t('View all →')}
            </button>
          </div>
          {recent.length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB' }}>{t('Nothing filed yet.')}</p>}
          {recent.map((r) => {
            const status = STATUS_PILL[r.status];
            return (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {REQUEST_ICON[r.type] ?? '📄'} {r.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 3 }}>{t('Filed {date}', { date: fmtDateLong(r.filedAt) })}</div>
                </div>
                <span style={pill(status.kind)}>{t(status.labelText)}</span>
              </div>
            );
          })}
        </div>

        <div style={{ ...card, padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('My Upcoming Bookings')}</h3>
            <Link to="/resident/bookings" style={{ fontSize: 13, fontWeight: 700 }}>{t('+ New Booking')}</Link>
          </div>
          {upcomingBookings.length === 0 && (
            <p style={{ fontSize: 13.5, color: '#8A97AB' }}>{t('No upcoming bookings — reserve a facility or equipment.')}</p>
          )}
          {upcomingBookings.map((b) => (
            <div key={b.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
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
              <span style={pill(b.status === BookingStatus.CONFIRMED ? 'green' : 'yellow')}>
                {b.status === BookingStatus.CONFIRMED ? t('Confirmed') : t('Pending')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* All requests popup — full list without leaving the dashboard */}
      {allReqOpen && (
        <Modal title={t('📄 All My Requests')} onClose={() => setAllReqOpen(false)} width={640}>
          {(requests ?? []).length === 0 ? (
            <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>{t('Nothing filed yet.')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(requests ?? []).map((r) => {
                const status = STATUS_PILL[r.status];
                const chip = deadlineChip(r);
                return (
                  <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>
                        {REQUEST_ICON[r.type] ?? '📄'} {r.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 3 }}>
                        {t('Filed {date}', { date: fmtDateLong(r.filedAt) })}
                        {r.overdueDays > 0
                          ? ` · ${t(r.overdueDays > 1 ? '⚠ Overdue by {n} days' : '⚠ Overdue by {n} day', { n: r.overdueDays })}`
                          : chip.text ? ` · ${chip.text}` : ''}
                      </div>
                    </div>
                    <span style={pill(status.kind)}>{t(status.labelText)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
