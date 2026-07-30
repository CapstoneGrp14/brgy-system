import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, input, label } from '../../components/ui/kit';
import { DatePicker } from '../../components/ui/DatePicker';
import { useUiStore } from '../../stores/ui';
import { AuthCard } from './AuthCard';

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const [form, setForm] = useState({ fullName: '', birthdate: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (busy) return;
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
      toast('✅ Account created — upload your supporting documents to get verified.');
      navigate('/resident/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Registration failed — please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create resident account"
      subtitle="Step 1 of 2 — your name and birthdate must match the Barangay Census (16+ only). Step 2 verifies your identity with an ID."
    >
      <label style={label}>Full Name (as registered in the census)</label>
      <input style={{ ...input, marginBottom: 12 }} placeholder="e.g., Juan Dela Cruz" value={form.fullName} onChange={set('fullName')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label}>Birthdate</label>
          <DatePicker
            value={form.birthdate}
            onChange={(v) => setForm((f) => ({ ...f, birthdate: v }))}
            placeholder="As registered in census"
            style={{ marginBottom: 12 }}
          />
        </div>
        <div>
          {/* short label — the long form wraps at half-width and misaligns the row */}
          <label style={{ ...label, whiteSpace: 'nowrap' }}>Mobile No. (optional)</label>
          <input style={{ ...input, marginBottom: 12 }} placeholder="09XXXXXXXXX" value={form.phone} onChange={set('phone')} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label}>Email</label>
          <input style={{ ...input, marginBottom: 12 }} placeholder="you@email.com" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label style={label}>Password</label>
          <input style={{ ...input, marginBottom: 12 }} type="password" placeholder="min. 8 characters" value={form.password} onChange={set('password')} />
        </div>
      </div>
      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} style={busy ? btnBusy : btnPrimary}>
        {busy ? 'Checking the census…' : 'Create Account'}
      </button>
      <p style={{ fontSize: 12, color: '#8A97AB', marginTop: 12, marginBottom: 0 }}>
        Not in the census yet? Visit the Barangay Hall to be registered first. After sign-up you'll
        still need to upload a valid ID for staff approval before full access unlocks.
      </p>
    </AuthCard>
  );
}
