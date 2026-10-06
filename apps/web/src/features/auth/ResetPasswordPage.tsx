import { useState } from 'react';
import { passwordProblem } from '@brgy/shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, label } from '../../components/ui/kit';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { PasswordRequirements } from '../../components/ui/PasswordRequirements';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { AuthCard } from './AuthCard';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(t(problem));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast(t('✅ Password updated — sign in with your new password.'));
      navigate('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? t('Reset failed — the link may have expired.')));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title={t('Reset password')}>
        <div style={errorText}>{t('This reset link is incomplete — use the link from your email.')}</div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('Reset password')} subtitle={t('Choose a new password that meets the requirements below.')}>
      <label style={label}>{t('New Password')}</label>
      <PasswordInput style={{ marginBottom: 8 }} value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordRequirements password={password} />
      <label style={label}>{t('Confirm New Password')}</label>
      <PasswordInput style={{ marginBottom: 14 }} value={confirm} onChange={setConfirm} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="new-password" />
      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
        {busy ? t('Updating…') : t('Update Password')}
      </button>
    </AuthCard>
  );
}
