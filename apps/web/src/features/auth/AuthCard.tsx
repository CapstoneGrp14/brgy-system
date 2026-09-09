import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Toasts } from '../../components/ui/Toasts';
import { useT } from '../../i18n';

/** Centered navy-background card used by register / forgot / reset pages. */
export function AuthCard({ title, subtitle, children, width = 440 }: { title: string; subtitle?: string; children: ReactNode; width?: number }) {
  const t = useT();
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#1E3A5F', padding: 30 }}>
      <div style={{ width, maxWidth: '94vw', background: '#fff', borderRadius: 16, padding: '32px 34px 26px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ font: '800 30px Poppins, sans-serif', color: '#F5A81C', lineHeight: 1 }}>591</div>
        <h1 style={{ margin: '14px 0 4px', font: '700 21px Poppins, sans-serif', color: '#1E3A5F' }}>{title}</h1>
        {subtitle && <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748B' }}>{subtitle}</p>}
        {children}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 18, marginBottom: 0 }}>
          <Link to="/login" style={{ fontWeight: 700 }}>{t('← Back to sign in')}</Link>
        </p>
      </div>
      <Toasts />
    </div>
  );
}
