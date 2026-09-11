import { STAFF_POSITIONS } from '@brgy/shared';
import { useState } from 'react';
import {
  useDemoteStaff,
  useInviteStaff,
  usePromoteResident,
  useRevokeInvite,
  useStaff,
} from '../../api/staff';
import { useAuthStore } from '../../stores/auth';
import { btnBusy, btnPrimary, card, input, label, pill } from '../../components/ui/kit';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { Select } from '../../components/ui/Select';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

export function StaffPage() {
  const { data } = useStaff();
  const invite = useInviteStaff();
  const promote = usePromoteResident();
  const demote = useDemoteStaff();
  const revoke = useRevokeInvite();
  const me = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'EMPLOYEE' as 'EMPLOYEE' | 'ADMIN',
    position: 'Administrative Staff' as string,
  });
  const [error, setError] = useState('');
  const [promotable, setPromotable] = useState<string | null>(null);

  const submit = async () => {
    if (invite.isPending) return;
    setError('');
    setPromotable(null);
    try {
      await invite.mutateAsync(form);
      toast(t('📧 Invitation sent to {email}', { email: form.email }));
      setForm({ fullName: '', email: '', role: 'EMPLOYEE', position: 'Administrative Staff' });
    } catch (err: any) {
      const data = err?.response?.data;
      const raw = data?.message;
      // NestJS wraps object exceptions: the payload may sit at data or data.message.
      const payload = typeof raw === 'object' && raw !== null ? raw : data;
      if (payload?.promotable) {
        setPromotable(payload.fullName ?? form.email);
        setError('');
        return;
      }
      const msg = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : (payload?.message ?? t('Invite failed.'));
      setError(msg);
    }
  };

  const doPromote = async () => {
    try {
      const result = await promote.mutateAsync({ email: form.email, fullName: form.fullName, role: form.role, position: form.position });
      toast(t('⬆️ {name} is now {position} — same login, dual role.', { name: result.fullName, position: form.position }));
      setPromotable(null);
      setForm({ fullName: '', email: '', role: 'EMPLOYEE', position: 'Administrative Staff' });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('Promotion failed.'));
      setPromotable(null);
    }
  };

  const pendingInvites = (data?.invites ?? []).filter((i) => !i.acceptedAt && !i.revokedAt);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Invite Staff Member')}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          {t("Staff accounts are created by invitation only. The invitee gets an email link (valid 7 days) to set their password. If they're also in the Barangay Census, their resident profile links automatically — one email, both portals.")}
        </p>
        <label style={label}>{t('Full Name')}</label>
        <input style={{ ...input, marginBottom: 12 }} placeholder={t('e.g., Kagawad Juan Lucas')} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        <label style={label}>{t('Email')}</label>
        <input style={{ ...input, marginBottom: 12 }} placeholder="name@brgy591.gov.ph" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <label style={label}>{t('Position')}</label>
        <Select
          value={form.position}
          onChange={(v) => {
            // Chairman gets admin access by default; everyone else defaults to staff.
            setForm((f) => ({ ...f, position: v, role: v.startsWith('Punong Barangay') ? 'ADMIN' : f.role }));
          }}
          options={STAFF_POSITIONS.map((p) => ({ value: p, labelText: t(p) }))}
          style={{ marginBottom: 12 }}
        />
        <label style={label}>{t('Portal Access')}</label>
        <Select
          value={form.role}
          onChange={(v) => setForm((f) => ({ ...f, role: v as 'EMPLOYEE' | 'ADMIN' }))}
          options={[
            { value: 'EMPLOYEE', labelText: t('Employee Portal (Staff)') },
            { value: 'ADMIN', labelText: t('Admin Portal (full oversight)') },
          ]}
          style={{ marginBottom: 16 }}
        />
        {error && <div style={{ background: '#FBE4E1', color: '#C0392B', borderRadius: 9, padding: '10px 13px', fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
        {promotable && (
          <div style={{ background: '#FFF7DE', border: '1px solid #F2DFA4', borderRadius: 9, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, color: '#7A611B', marginBottom: 10 }}>
              <strong>{promotable}</strong> {t('already has a resident account with this email. Promote that account to')}{' '}
              <strong>{form.role === 'ADMIN' ? t('Admin') : t('Employee')}</strong> {t('instead? They keep the same login and their resident portal (dual role).')}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={doPromote} disabled={promote.isPending} style={{ background: '#F5A81C', color: '#16324F', border: 'none', borderRadius: 8, padding: '9px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}>
                {promote.isPending ? t('Promoting…') : t('⬆️ Promote to {role}', { role: form.role === 'ADMIN' ? t('Admin') : t('Employee') })}
              </button>
              <button onClick={() => setPromotable(null)} style={{ background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('Cancel')}
              </button>
            </div>
          </div>
        )}
        <button onClick={submit} style={invite.isPending ? btnBusy : btnPrimary}>
          {invite.isPending ? t('Sending…') : t('Send Invitation')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ ...card, padding: '24px 26px' }}>
          <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Active Staff')}</h3>
          {(data?.staff ?? []).map((s) => (
            <div key={s.id} style={{ padding: '11px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>{s.fullName}</div>
                <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 2 }}>
                  {s.position ? `${s.position} · ` : ''}{s.email}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={pill(s.role === 'ADMIN' ? 'purple' : 'green')}>{s.role === 'ADMIN' ? t('Admin') : t('Employee')}</span>
                {s.id !== me?.id && (
                  <button
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: t('Demote to resident?'),
                        message: t('{name} will lose {role} access and keep only their resident account. You can promote them again anytime.', { name: s.fullName, role: s.role === 'ADMIN' ? t('Admin') : t('Employee') }),
                        confirmText: t('Demote'),
                        tone: 'danger',
                      });
                      if (!ok) return;
                      demote
                        .mutateAsync(s.email)
                        .then(() => toast(t('⬇️ {name} demoted to resident.', { name: s.fullName })))
                        .catch((err: any) => toast(err?.response?.data?.message ?? t('Demotion failed.')));
                    }}
                    style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                  >
                    {t('Demote')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: '24px 26px' }}>
          <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Pending Invitations')}</h3>
          {pendingInvites.length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>{t('No pending invitations.')}</p>}
          {pendingInvites.map((i) => (
            <div key={i.id} style={{ padding: '11px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>{i.fullName} <span style={pill(i.role === 'ADMIN' ? 'purple' : 'blue')}>{i.role}</span></div>
                <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 2 }}>
                  {i.position ? `${i.position} · ` : ''}{i.email} · {t('expires')} {new Date(i.expiresAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => revoke.mutateAsync(i.id).then(() => toast(t('🗑 Invitation revoked.')))} style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('Revoke')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
