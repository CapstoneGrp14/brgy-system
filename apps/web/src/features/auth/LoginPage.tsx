import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { login } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Toasts } from '../../components/ui/Toasts';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { roleHome, useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

export function LoginPage() {
  const { status, user } = useAuthStore();
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const t = useT();
  // Live public aggregates for the hero — falls back to placeholders while loading.
  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => (await api.get<{ residents: number; artaCompliance: number | null }>('/public/stats')).data,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (status === 'authed' && user) return <Navigate to={roleHome(user.role)} replace />;

  const submit = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const session = await login({ email, password, rememberMe });
      toast(t('👋 Welcome back, {name}!', { name: session.user.fullName.split(' ')[0] }));
      navigate(roleHome(session.user.role));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('Sign-in failed — please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: '#1E3A5F' }}>
      {/* Branding panel (navy) */}
      <div
        style={{
          flex: isMobile ? undefined : 1.1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isMobile ? '30px 26px 26px' : '64px 72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!isMobile && (
          <>
            <div style={{ position: 'absolute', right: -120, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'rgba(245,168,28,.07)' }} />
            <div style={{ position: 'absolute', left: -100, bottom: -140, width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
          </>
        )}
        <img
          src="/brgy591-logo.jpeg"
          alt="Barangay 591"
          style={{
            width: isMobile ? 64 : 96,
            height: isMobile ? 64 : 96,
            borderRadius: '50%',
            objectFit: 'cover',
            // The seal sits on a navy panel; a thin gold ring keeps its white
            // background from reading as a hard square edge.
            border: '2px solid rgba(245,168,28,.55)',
            boxShadow: '0 6px 18px rgba(0,0,0,.28)',
          }}
        />
        <div style={{ fontSize: 12, letterSpacing: '.18em', color: '#93A7C0', fontWeight: 700, marginTop: 10 }}>
          {t('BARANGAY E-SERVICES PORTAL')}
        </div>
        <h2 style={{ font: `700 ${isMobile ? 20 : 30}px Poppins, sans-serif`, color: '#fff', margin: isMobile ? '14px 0 6px' : '26px 0 10px', maxWidth: 460 }}>
          {t('Serbisyong mabilis, malinaw, at maaasahan.')}
        </h2>
        {!isMobile && (
          <>
            <p style={{ color: '#AFC0D6', fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>
              {t('Request documents, file complaints, book facilities, and reach your barangay — online, anytime.')}
            </p>
            <div style={{ display: 'flex', gap: 26, marginTop: 34 }}>
              {[
                [stats ? stats.residents.toLocaleString() : '—', 'Registered Residents'],
                [stats ? (stats.artaCompliance === null ? 'ARTA' : `${stats.artaCompliance}%`) : '—', stats?.artaCompliance === null ? '3-7-20 Tracked' : 'ARTA Compliance'],
                ['24/7', 'One-Tap SOS'],
              ].map(([v, l]) => (
                <div key={l}>
                  <div style={{ font: '800 24px Poppins, sans-serif', color: '#F5A81C' }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#93A7C0', fontWeight: 600 }}>{t(l)}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ marginTop: isMobile ? 12 : 40, fontSize: 12, color: '#7E93AE', fontWeight: 600 }}>
          📍 Zone 58, District VI · Manila
        </div>
      </div>

      {/* Form panel (white) — clean division from the navy branding side */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '30px 22px 40px' : 40,
          background: '#fff',
          borderLeft: isMobile ? 'none' : '1px solid #E3E8F0',
          borderTopLeftRadius: isMobile ? 22 : 0,
          borderTopRightRadius: isMobile ? 22 : 0,
        }}
      >
        <div style={{ width: isMobile ? '100%' : 400, maxWidth: 440 }}>
          <h1 style={{ margin: 0, font: '700 22px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Sign in')}</h1>
          <p style={{ margin: '6px 0 20px', fontSize: 13.5, color: '#64748B' }}>
            {t('Welcome back — your portal opens based on your account.')}
          </p>

          <label style={label}>{t('Email or Mobile Number')}</label>
          <input
            style={{ ...input, marginBottom: 14 }}
            placeholder={t('e.g., antonette@gmail.com')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="username"
          />
          <label style={label}>{t('Password')}</label>
          <PasswordInput
            style={{ marginBottom: 14 }}
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="current-password"
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#33415E', cursor: 'pointer' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              {t('Remember me')}
            </label>
            <Link to="/forgot-password" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('Forgot password?')}
            </Link>
          </div>

          {error && <div style={{ ...errorText, marginBottom: 14 }}>{error}</div>}

          <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
            {busy ? t('Signing in…') : t('Sign In')}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 18, marginBottom: 0 }}>
            {t('New resident?')} <Link to="/register" style={{ fontWeight: 700 }}>{t('Create an account')}</Link>
          </p>
        </div>
      </div>
      <Toasts />
    </div>
  );
}
