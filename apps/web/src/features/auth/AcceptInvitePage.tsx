import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvite } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { roleHome } from '../../stores/auth';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { AuthCard } from './AuthCard';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (password !== confirm) {
      setError(t('Passwords do not match.'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      const session = await acceptInvite({ token, password, phone: phone || undefined });
      toast(t('🎉 Welcome aboard, {name}!', { name: session.user.fullName.split(' ')[0] }));
      navigate(roleHome(session.user.role));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? t('Could not accept the invitation.')));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title={t('Staff invitation')}>
        <div style={errorText}>{t('This invitation link is incomplete — use the link from your email.')}</div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('Set up your staff account')} subtitle={t('Choose a password to activate your Barangay 591 staff access.')}>
      <label style={label}>{t('Password')}</label>
      <PasswordInput style={{ marginBottom: 12 }} placeholder={t('min. 8 characters')} value={password} onChange={setPassword} autoComplete="new-password" />
      <label style={label}>{t('Confirm Password')}</label>
      <PasswordInput style={{ marginBottom: 12 }} value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <label style={label}>{t('Mobile Number (optional)')}</label>
      <input style={{ ...input, marginBottom: 14 }} placeholder="09XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
        {busy ? t('Activating…') : t('Activate Account')}
      </button>
    </AuthCard>
  );
}
