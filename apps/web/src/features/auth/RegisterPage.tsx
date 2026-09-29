import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { DatePicker, todayString } from '../../components/ui/DatePicker';
import { Modal } from '../../components/ui/Modal';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { passwordProblem } from './password';
import { TermsContent } from './TermsContent';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { AuthCard } from './AuthCard';

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const t = useT();
  const [form, setForm] = useState({ fullName: '', birthdate: '', email: '', phone: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (busy) return;
    if (!agreed) {
      setError(t('Please read and accept the Terms & Conditions to continue.'));
      return;
    }
    const weak = passwordProblem(form.password);
    if (weak) {
      setError(t(weak));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await register({
        fullName: form.fullName,
        birthdate: form.birthdate,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      toast(t('✅ Account created — upload your supporting documents to get verified.'));
      navigate('/resident/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? t('Registration failed — please try again.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('Create resident account')}
      subtitle={t('Step 1 of 2 — your name and birthdate must match the Barangay Census (16+ only). Step 2 verifies your identity with an ID.')}
    >
      <label style={label}>{t('Full Name (as registered in the census)')}</label>
      <input style={{ ...input, marginBottom: 12 }} placeholder={t('e.g., Juan Dela Cruz')} value={form.fullName} onChange={set('fullName')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={label}>{t('Birthdate')}</label>
          <DatePicker
            value={form.birthdate}
            onChange={(v) => setForm((f) => ({ ...f, birthdate: v }))}
            placeholder={t('As registered in census')}
            maxDate={todayString()}
            maxYear={new Date().getFullYear()}
            style={{ marginBottom: 12 }}
          />
        </div>
        <div>
          <label style={label}>{t('Mobile No. (optional)')}</label>
          <input style={{ ...input, marginBottom: 12 }} placeholder="09XXXXXXXXX" value={form.phone} onChange={set('phone')} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
        <div>
          <label style={label}>{t('Email')}</label>
          <input style={{ ...input, marginBottom: 12 }} placeholder="you@email.com" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label style={label}>{t('Password')}</label>
          <PasswordInput style={{ marginBottom: 12 }} placeholder={t('min. 8 characters')} value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password" />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#33415E', cursor: 'pointer', marginBottom: 14 }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          {t('I have read and agree to the')}{' '}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setTermsOpen(true); }}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#2E66D0', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t('Terms & Conditions')}
          </button>{' '}
          {t('and Data Privacy Notice.')}
        </span>
      </label>
      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} style={busy || !agreed ? btnBusy : btnPrimary} disabled={!agreed}>
        {busy ? t('Checking the census…') : t('Create Account')}
      </button>
      {termsOpen && (
        <Modal title={t('📄 Terms & Conditions')} onClose={() => setTermsOpen(false)} width={620}>
          <TermsContent />
          <button
            onClick={() => { setAgreed(true); setTermsOpen(false); }}
            style={{ ...btnPrimary, marginTop: 16 }}
          >
            {t('I Understand & Agree')}
          </button>
        </Modal>
      )}
      <p style={{ fontSize: 12, color: '#8A97AB', marginTop: 12, marginBottom: 0 }}>
        {t("Not in the census yet? Visit the Barangay Hall to be registered first. After sign-up you'll still need to upload a valid ID for staff approval before full access unlocks.")}
      </p>
    </AuthCard>
  );
}
