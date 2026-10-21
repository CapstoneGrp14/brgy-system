import { useState } from 'react';
import { isTwoFactorChallenge, type LoginResponse, type TwoFactorChallenge } from '@brgy/shared';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Toasts } from '../../components/ui/Toasts';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { roleHome, useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { TwoFactorStep } from './TwoFactorStep';

export function LoginPage() {
  const { status, user } = useAuthStore();
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Set once the password checks out and a code has been emailed — the form
  // is then swapped for the code step (no session exists yet).
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);

  if (status === 'authed' && user) return <Navigate to={roleHome(user.role)} replace />;

  const enter = (session: LoginResponse) => {
    toast(t('👋 Welcome back, {name}!', { name: session.user.fullName.split(' ')[0] }));
    navigate(roleHome(session.user.role));
  };

  const submit = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const result = await login({ email, password, rememberMe });
      if (isTwoFactorChallenge(result)) {
        setChallenge(result);
        return;
      }
      enter(result);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('Sign-in failed — please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 20px' : '48px 20px',
        // White at the top easing into barangay blue at the foot of the page.
        // The stops bunch toward the bottom so the upper half stays light
        // enough for the dark heading to sit on it without a panel behind.
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2F6FC 28%, #D4E0F2 56%, #9DB7DE 80%, #5C83C3 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Masthead sits on the gradient itself, above the card */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/brgy591-logo.png"
            alt={t('Barangay 591')}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
              margin: '0 auto 12px',
            }}
          />
          <h1 style={{ margin: 0, font: '700 19px Poppins, sans-serif', color: '#1E3A5F' }}>
            {t('Welcome Back')}
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#64748B' }}>
            {t('Log in to access Barangay 591 E-Services')}
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            padding: isMobile ? '22px 20px' : '26px 28px',
            // Soft and wide rather than tight and dark: the card should lift
            // off the gradient, not look outlined against it.
            boxShadow: '0 1px 2px rgba(23,43,77,.04), 0 12px 32px -14px rgba(23,43,77,.22)',
          }}
        >
          {challenge ? (
            <TwoFactorStep
              challenge={challenge}
              onChallengeRefreshed={setChallenge}
              onVerified={enter}
              onCancel={(reason) => {
                setChallenge(null);
                setPassword('');
                setError(reason ?? '');
              }}
            />
          ) : (
            <>
              <label style={label}>{t('Mobile Number or Email')}</label>
              <input
                style={{ ...input, marginBottom: 14 }}
                placeholder={t('e.g. 09123456789')}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#64748B', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  {t('Remember me')}
                </label>
                <Link to="/forgot-password" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {t('Forgot Password?')}
                </Link>
              </div>

              {error && <div style={{ ...errorText, marginBottom: 14 }}>{error}</div>}

              <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
                {busy ? t('Signing in…') : t('Log In to Portal')}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12.5, color: '#64748B', margin: '16px 0 0' }}>
                {t("Don't have an account yet?")}{' '}
                <Link to="/register" style={{ fontWeight: 700 }}>
                  {t('Sign Up')}
                </Link>
              </p>
            </>
          )}
        </div>

        {/* The mockup had "Back to Homepage" here, but "/" redirects straight
            back to /login — there is no public landing page — so the link would
            loop on itself. Restore it if a homepage is ever added. */}
      </div>
      <Toasts />
    </div>
  );
}
