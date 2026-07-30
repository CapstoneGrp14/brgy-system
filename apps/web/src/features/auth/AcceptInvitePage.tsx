import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvite } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { roleHome } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { AuthCard } from './AuthCard';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
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
      const session = await acceptInvite({ token, password, phone: phone || undefined });
      toast(`🎉 Welcome aboard, ${session.user.fullName.split(' ')[0]}!`);
      navigate(roleHome(session.user.role));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Could not accept the invitation.'));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Staff invitation">
        <div style={errorText}>This invitation link is incomplete — use the link from your email.</div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set up your staff account" subtitle="Choose a password to activate your Barangay 591 staff access.">
      <label style={label}>Password</label>
      <input style={{ ...input, marginBottom: 12 }} type="password" placeholder="min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
      <label style={label}>Confirm Password</label>
      <input style={{ ...input, marginBottom: 12 }} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <label style={label}>Mobile Number (optional)</label>
      <input style={{ ...input, marginBottom: 14 }} placeholder="09XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
        {busy ? 'Activating…' : 'Activate Account'}
      </button>
    </AuthCard>
  );
}
