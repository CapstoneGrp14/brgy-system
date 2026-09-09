import { VerificationStatus } from '@brgy/shared';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { card } from '../ui/kit';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/auth';

/**
 * Gates resident service pages: unverified accounts see a verification prompt
 * instead of the feature. SOS, announcements, profile, and upload stay open.
 */
export function RequireVerified({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const t = useT();

  if (user?.verificationStatus === VerificationStatus.VERIFIED) return <>{children}</>;

  return (
    <div style={{ ...card, maxWidth: 560, margin: '40px auto', padding: '36px 38px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, animation: 'pulse 1.6s ease infinite' }}>🔒</div>
      <h2 style={{ font: '700 19px Poppins, sans-serif', color: '#1E3A5F', margin: '14px 0 8px' }}>
        {t('Verification required')}
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 20px' }}>
        {t(
          'This service unlocks once barangay staff verifies your identity. Upload a valid ID or supporting document — our OCR cross-checks it against the Barangay Census, then staff approves your account.',
        )}
      </p>
      <button
        onClick={() => navigate('/resident/upload')}
        style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 22px', font: '700 14px Poppins, sans-serif', cursor: 'pointer' }}
      >
        {t('📎 Upload Supporting Documents →')}
      </button>
    </div>
  );
}
