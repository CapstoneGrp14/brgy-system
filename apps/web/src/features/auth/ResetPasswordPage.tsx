import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { useUiStore } from '../../stores/ui';
import { AuthCard } from './AuthCard';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast('✅ Password updated — sign in with your new password.');
      navigate('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Reset failed — the link may have expired.'));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Reset password">
        <div style={errorText}>This reset link is incomplete — use the link from your email.</div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password" subtitle="Choose a new password (min. 8 characters).">
      <label style={label}>New Password</label>
      <input style={{ ...input, marginBottom: 12 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <label style={label}>Confirm New Password</label>
      <input style={{ ...input, marginBottom: 14 }} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
        {busy ? 'Updating…' : 'Update Password'}
      </button>
    </AuthCard>
  );
}
