import { VerificationStatus } from '@brgy/shared';
import { useMe } from '../../api/auth';
import { card } from '../../components/ui/kit';

function Field({ labelText, value }: { labelText: string; value: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '.04em', marginBottom: 6 }}>
        {labelText.toUpperCase()}
      </div>
      <div style={{ background: '#F4F6FA', border: '1px solid #E9EDF4', borderRadius: 9, padding: '11px 13px', fontSize: 14.5, color: '#2E3A52', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) return <div style={{ color: '#64748B' }}>Loading profile…</div>;

  const verified = me.verificationStatus === VerificationStatus.VERIFIED;
  const age = me.birthdate
    ? Math.floor((Date.now() - new Date(me.birthdate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div style={{ ...card, maxWidth: 640, padding: '30px 34px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 26 }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#F2A71B', color: '#16324F', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 26px Poppins, sans-serif' }}>
          {me.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <h2 style={{ margin: 0, font: '700 22px Poppins, sans-serif', color: '#1E3A5F' }}>{me.fullName}</h2>
          <span
            style={{
              display: 'inline-block',
              marginTop: 7,
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.06em',
              background: verified ? '#E4F5EB' : '#FCF3D7',
              color: verified ? '#1F8B4C' : '#A17F1A',
            }}
          >
            {verified ? '● VERIFIED RESIDENT' : '● PENDING VERIFICATION'}
          </span>
        </div>
      </div>

      <Field labelText="Address" value={me.address ?? '—'} />
      <Field labelText="Contact Number" value={me.phone ?? '—'} />
      <Field labelText="Email" value={me.email} />
      <Field labelText="Age / Civil Status" value={`${age ?? '—'} / ${me.civilStatus ?? '—'}`} />

      <p style={{ fontSize: 12.5, color: '#8A97AB', marginTop: 4, marginBottom: 0 }}>
        Core details are matched against the Barangay Census and cannot be changed manually. Contact the office for corrections.
      </p>
    </div>
  );
}
