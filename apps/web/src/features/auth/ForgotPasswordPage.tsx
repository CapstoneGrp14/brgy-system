import { useState } from 'react';
import { forgotPassword } from '../../api/auth';
import { btnBusy, btnPrimary, input, label, successText } from '../../components/ui/kit';
import { AuthCard } from './AuthCard';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (busy || !email) return;
    setBusy(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot password" subtitle="We'll email you a link to reset it (valid for 30 minutes).">
      {sent ? (
        <div style={successText}>
          📧 If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <>
          <label style={label}>Email</label>
          <input
            style={{ ...input, marginBottom: 14 }}
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
            {busy ? 'Sending…' : 'Send Reset Link'}
          </button>
        </>
      )}
    </AuthCard>
  );
}
