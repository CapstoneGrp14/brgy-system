import { Role, type CharterContent, type CharterService } from '@brgy/shared';
import { useState } from 'react';
import { useCharter, useUpdateCharter } from '../../api/charter';
import { btnBusy, btnPrimary, card, cols, input, label, pill, tableFixed, td, th } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

const emptyService: CharterService = {
  service: '',
  requirement: '',
  client: '',
  officer: '',
  steps: [],
  fees: 'FREE',
  processingTime: '',
  form: '',
};

const smallBtn = (danger = false) => ({
  background: 'none',
  border: 'none',
  color: danger ? '#C0392B' : '#2E66D0',
  font: '700 12.5px Poppins, sans-serif',
  cursor: 'pointer',
  padding: 0,
});

/**
 * Citizen's Charter — content transcribed from the official Barangay 591
 * charter board (Zone 58, Dist. 6) and editable by the admin (stored in DB).
 */
export function CharterPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;
  const t = useT();
  const toast = useUiStore((s) => s.toast);
  const { data: charter } = useCharter();
  const save = useUpdateCharter();
  const [draft, setDraft] = useState<CharterContent | null>(null);

  if (!charter) return <div style={{ color: '#8A97AB', fontSize: 13.5 }}>{t('Loading charter…')}</div>;

  const editing = draft !== null;
  const view = draft ?? charter;

  const patchService = (i: number, patch: Partial<CharterService>) =>
    setDraft((d) => d && { ...d, services: d.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const onSave = async () => {
    if (!draft || save.isPending) return;
    try {
      await save.mutateAsync(draft);
      setDraft(null);
      toast(t("📖 Citizen's Charter updated."));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not save the charter.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>
              {t("📖 Barangay Citizens' Charter — Barangay 591, Zone 58, District VI")}
            </h2>
            <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '6px 0 0' }}>
              {t('R.A. 11032 (Ease of Doing Business Act) service standards · all frontline services are FREE.')}
            </p>
          </div>
          {isAdmin && !editing && (
            <button onClick={() => setDraft(JSON.parse(JSON.stringify(charter)))} style={{ ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}>
              {t('✏️ Edit Charter')}
            </button>
          )}
          {isAdmin && editing && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onSave} style={save.isPending ? { ...btnBusy, width: 'auto', padding: '9px 16px' } : { ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}>
                {save.isPending ? t('Saving…') : t('💾 Save Charter')}
              </button>
              <button onClick={() => setDraft(null)} style={{ background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('Cancel')}
              </button>
            </div>
          )}
        </div>

        {/* Vision / Mission — from the charter board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
          <div style={{ background: '#F0F5FF', border: '1.5px solid #BFD2F0', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ font: '800 11.5px Poppins, sans-serif', color: '#2E66D0', letterSpacing: '.06em' }}>{t('VISION')}</div>
            {editing ? (
              <textarea style={{ ...input, marginTop: 8, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} value={view.vision} onChange={(e) => setDraft((d) => d && { ...d, vision: e.target.value })} />
            ) : (
              <p style={{ fontSize: 13, color: '#2E3A52', margin: '6px 0 0', fontStyle: 'italic' }}>{view.vision}</p>
            )}
          </div>
          <div style={{ background: '#FFF7DE', border: '1.5px solid #F5D77E', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ font: '800 11.5px Poppins, sans-serif', color: '#A17F1A', letterSpacing: '.06em' }}>{t('MISSION')}</div>
            {editing ? (
              <textarea style={{ ...input, marginTop: 8, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} value={view.mission} onChange={(e) => setDraft((d) => d && { ...d, mission: e.target.value })} />
            ) : (
              <p style={{ fontSize: 13, color: '#2E3A52', margin: '6px 0 0', fontStyle: 'italic' }}>{view.mission}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap', fontSize: 12.5, color: '#64748B', alignItems: 'center' }}>
          {editing ? (
            <>
              <span>📧 <input style={{ ...input, width: 220, padding: '6px 10px', fontSize: 12.5 }} value={view.email} onChange={(e) => setDraft((d) => d && { ...d, email: e.target.value })} /></span>
              <span>📍 <input style={{ ...input, width: 260, padding: '6px 10px', fontSize: 12.5 }} value={view.address} onChange={(e) => setDraft((d) => d && { ...d, address: e.target.value })} /></span>
            </>
          ) : (
            <>
              <span>📧 {view.email}</span>
              <span>📍 {view.address}</span>
              <span>🕗 {t('Mon–Sat, 8:00 AM – 5:00 PM')}</span>
            </>
          )}
        </div>
      </div>

      {/* Frontline services — read: charter-board table · edit: card per service */}
      {!editing ? (
        <div style={{ ...card, padding: '22px 26px' }}>
          <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Frontline Services')}</h3>
          <div style={{ overflowX: 'auto' }}>
            {/* 8 charter columns need real width — roomier than the viewport, scrolls horizontally */}
            <table style={tableFixed(1420)}>
              <colgroup>
                {cols('15%', '10%', '10%', '14%', '27%', '5%', '10%', '9%').map((c) => (
                  <col key={c.key} style={c.style} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={th}>{t('FRONTLINE SERVICE')}</th>
                  <th style={th}>{t('REQUIREMENT')}</th>
                  <th style={th}>{t('CLIENT')}</th>
                  <th style={th}>{t('OFFICER RESPONSIBLE')}</th>
                  <th style={th}>{t('STEPS / PROCEDURES')}</th>
                  <th style={th}>{t('FEES')}</th>
                  <th style={th}>{t('PROCESSING TIME')}</th>
                  <th style={th}>{t('FORM')}</th>
                </tr>
              </thead>
              <tbody>
                {view.services.map((s, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 700 }}>{s.service}</td>
                    <td style={td}>{s.requirement}</td>
                    <td style={td}>{s.client}</td>
                    <td style={td}>{s.officer}</td>
                    <td style={td}>
                      <ol style={{ margin: 0, paddingLeft: 16 }}>
                        {s.steps.map((step, j) => (
                          <li key={j} style={{ marginBottom: 3 }}>{step}</li>
                        ))}
                      </ol>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: '#1F8B4C' }}>{s.fees}</td>
                    <td style={td}>
                      {/* wrapping badge: soft corners so multi-line content stays a tidy box, not a blob */}
                      <span
                        style={{
                          ...pill('blue'),
                          whiteSpace: 'normal',
                          display: 'inline-block',
                          lineHeight: 1.5,
                          borderRadius: 8,
                          padding: '6px 10px',
                        }}
                      >
                        {s.processingTime}
                      </span>
                    </td>
                    <td style={td}>{s.form}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: '#8A97AB', margin: '12px 0 0' }}>
            {t('💻 These frontline services are also available online through this portal — documents, equipment lending, and complaints can be filed from the resident dashboard.')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {view.services.map((s, i) => (
            <div key={i} style={{ ...card, padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ font: '700 13px Poppins, sans-serif', color: '#7E8CA3' }}>{t('SERVICE #{n}', { n: i + 1 })}</span>
                <button onClick={() => setDraft((d) => d && { ...d, services: d.services.filter((_, j) => j !== i) })} style={smallBtn(true)}>
                  {t('🗑️ Remove')}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div><label style={label}>{t('Frontline Service')}</label><input style={input} value={s.service} onChange={(e) => patchService(i, { service: e.target.value })} /></div>
                <div><label style={label}>{t('Documentary Requirement')}</label><input style={input} value={s.requirement} onChange={(e) => patchService(i, { requirement: e.target.value })} /></div>
                <div><label style={label}>{t('Client / Requesting Party')}</label><input style={input} value={s.client} onChange={(e) => patchService(i, { client: e.target.value })} /></div>
                <div><label style={label}>{t('Officer / Person Responsible')}</label><input style={input} value={s.officer} onChange={(e) => patchService(i, { officer: e.target.value })} /></div>
                <div><label style={label}>{t('Fees')}</label><input style={input} value={s.fees} onChange={(e) => patchService(i, { fees: e.target.value })} /></div>
                <div><label style={label}>{t('Processing Time')}</label><input style={input} value={s.processingTime} onChange={(e) => patchService(i, { processingTime: e.target.value })} /></div>
                <div><label style={label}>{t('Form to Fill Up')}</label><input style={input} value={s.form} onChange={(e) => patchService(i, { form: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={label}>{t('Steps / Procedures (one per line)')}</label>
                <textarea
                  style={{ ...input, minHeight: 92, resize: 'vertical', fontFamily: 'inherit' }}
                  value={s.steps.join('\n')}
                  onChange={(e) => patchService(i, { steps: e.target.value.split('\n') })}
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => setDraft((d) => d && { ...d, services: [...d.services, { ...emptyService }] })}
            style={{ ...card, padding: '14px 20px', border: '2px dashed #BFD2F0', background: '#F7FAFF', color: '#2E66D0', font: '700 13px Poppins, sans-serif', cursor: 'pointer', textAlign: 'center' }}
          >
            {t('+ Add Frontline Service')}
          </button>
        </div>
      )}
    </div>
  );
}
