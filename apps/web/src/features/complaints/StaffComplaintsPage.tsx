import type { ComplaintDto } from '@brgy/shared';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_META, ComplaintSource } from '@brgy/shared';
import { useState } from 'react';
import {
  useAdvanceComplaint,
  useAssignLupon,
  useComplaintActions,
  useComplaintsQueue,
  useEncodeBlotter,
} from '../../api/complaints';
import { card, cols, input, label, pill, tableFixed, td, th } from '../../components/ui/kit';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { DetailRow, Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { fmtDateLong } from '../../components/ui/status';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

const LUPON_MEMBERS = ['Kagawad Lucas', 'Kagawad Reyes', 'Lupon Chair Dizon', 'Ptm. Ty'];

const emptyBlotter = { caseTitle: '', category: COMPLAINT_CATEGORIES[0] as string, respondentName: '', description: '' };

export function StaffComplaintsPage() {
  const { data } = useComplaintsQueue();
  const { data: actionsMap } = useComplaintActions();
  const advance = useAdvanceComplaint();
  const assign = useAssignLupon();
  const encode = useEncodeBlotter();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const [showBlotter, setShowBlotter] = useState(false);
  const [blotter, setBlotter] = useState(emptyBlotter);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Resolve from live query data so status changes reflect while the modal is open.
  const detail: ComplaintDto | null = (data?.items ?? []).find((c) => c.id === detailId) ?? null;

  const submitBlotter = async () => {
    if (!blotter.caseTitle.trim() || blotter.description.trim().length < 10) {
      toast('Give the blotter a title and at least a short description.');
      return;
    }
    try {
      await encode.mutateAsync({
        caseTitle: blotter.caseTitle.trim(),
        category: blotter.category,
        respondentName: blotter.respondentName.trim() || 'N/A',
        description: blotter.description.trim(),
      });
      toast('📝 Blotter entry recorded.');
      setBlotter(emptyBlotter);
      setShowBlotter(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast(Array.isArray(msg) ? msg[0] : (msg ?? 'Encoding failed.'));
    }
  };

  const onAdvance = async (id: string, next: string, actionText: string, caseTitle: string) => {
    if (next === 'CFA_ISSUED') {
      const ok = await confirmDialog({
        title: 'Generate Certification to File Action?',
        message: `Mediation for "${caseTitle}" will close and the complainant may elevate the case to court. This cannot be undone.`,
        confirmText: 'Generate CFA',
        tone: 'danger',
      });
      if (!ok) return;
    }
    try {
      await advance.mutateAsync({ id, next: next as never });
      toast(`⚖️ ${actionText.replace(' →', '').replace(' ✓', '')} — ${caseTitle}`);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Action failed.');
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
            Katarungang Pambarangay & Dispute Resolution
          </h2>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 0' }}>
            {data?.activeCount ?? 0} active case{(data?.activeCount ?? 0) === 1 ? '' : 's'} · 20-day mediation clock per case
          </p>
        </div>
        <button
          onClick={() => setShowBlotter((v) => !v)}
          style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}
        >
          + Encode Police Report (Blotter)
        </button>
      </div>

      {showBlotter && (
        <div style={{ background: '#F7FAFF', border: '1px solid #DCE7F7', borderRadius: 10, padding: '16px 18px', marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr 1fr', gap: 12 }}>
            <div><label style={label}>Case Title</label><input style={input} placeholder="e.g., Turnover of Mendicants" value={blotter.caseTitle} onChange={(e) => setBlotter((b) => ({ ...b, caseTitle: e.target.value }))} /></div>
            <div><label style={label}>Category</label>
              <Select value={blotter.category} onChange={(v) => setBlotter((b) => ({ ...b, category: v }))} options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, labelText: c }))} />
            </div>
            <div><label style={label}>Respondent / Subject</label><input style={input} placeholder="Name or N/A" value={blotter.respondentName} onChange={(e) => setBlotter((b) => ({ ...b, respondentName: e.target.value }))} /></div>
          </div>
          <label style={{ ...label, marginTop: 12 }}>Incident Details</label>
          <textarea rows={3} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} value={blotter.description} onChange={(e) => setBlotter((b) => ({ ...b, description: e.target.value.slice(0, 1000) }))} />
          <button onClick={submitBlotter} style={{ marginTop: 12, background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}>
            {encode.isPending ? 'Saving…' : 'Record Blotter Entry'}
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={tableFixed(900)}>
          <colgroup>
            {cols('24%', '14%', '15%', '16%', '15%', '16%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>CASE DETAILS</th>
              <th style={th}>FILING TYPE</th>
              <th style={th}>MEDIATION TIMELINE</th>
              <th style={th}>LUPON ASSIGNED</th>
              <th style={th}>STATUS</th>
              <th style={th}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).length === 0 && (
              <tr><td style={{ ...td, color: '#8A97AB' }} colSpan={6}>No cases on record.</td></tr>
            )}
            {(data?.items ?? []).map((c) => {
              const meta = COMPLAINT_STATUS_META[c.status];
              const actions = actionsMap?.[c.status] ?? [];
              const timelineChip = c.mediationDay === null
                ? { text: 'N/A (Staff Blotter)', kind: 'gray' as const }
                : c.overdue
                  ? { text: `OVERDUE`, kind: 'red' as const }
                  : { text: `Day ${c.mediationDay} / ${c.mediationDays}`, kind: c.mediationDay >= 14 ? ('yellow' as const) : ('green' as const) };
              return (
                <tr key={c.id} style={c.overdue ? { background: '#FEF5F4', boxShadow: 'inset 3px 0 0 #D64541' } : {}}>
                  <td style={{ ...td, fontWeight: 700 }}>
                    <button
                      onClick={() => setDetailId(c.id)}
                      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 700, color: '#21409A', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {c.caseTitle}
                    </button>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A97AB', marginTop: 2 }}>
                      {c.category}
                      {c.complainantName && ` · by ${c.complainantName}`}
                      {' · '}
                      <button onClick={() => setDetailId(c.id)} style={{ background: 'none', border: 'none', padding: 0, color: '#2E66D0', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>
                        View Details →
                      </button>
                    </div>
                  </td>
                  <td style={td}>
                    {c.source === ComplaintSource.MANUAL_BLOTTER
                      ? 'Manual Blotter (Staff)'
                      : c.isAnonymous
                        ? 'Resident Form (Anonymous)'
                        : 'Resident Form (Named)'}
                  </td>
                  <td style={td}><span style={pill(timelineChip.kind)}>{timelineChip.text}</span></td>
                  <td style={td}>
                    {c.luponAssignee ?? (
                      <Select
                        compact
                        value=""
                        placeholder="Assign…"
                        options={LUPON_MEMBERS.map((m) => ({ value: m, labelText: m }))}
                        onChange={(m) =>
                          assign.mutateAsync({ id: c.id, luponAssignee: m }).then(() => toast(`👥 ${m} assigned to ${c.caseTitle}`))
                        }
                        style={{ width: 150 }}
                      />
                    )}
                  </td>
                  <td style={td}><span style={pill(meta.kind)}>{meta.labelText}</span></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                      {actions.length === 0 && <span style={{ color: '#9AA6B7', fontSize: 13 }}>—</span>}
                      {actions.map((a) => (
                        <button
                          key={a.next}
                          onClick={() => onAdvance(c.id, a.next, a.actionText, c.caseTitle)}
                          disabled={advance.isPending}
                          style={{ background: 'none', border: 'none', color: a.next === 'CFA_ISSUED' ? '#C0392B' : '#2E66D0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                        >
                          {a.actionText}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title={detail.caseTitle} onClose={() => setDetailId(null)}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span style={pill(COMPLAINT_STATUS_META[detail.status].kind)}>{COMPLAINT_STATUS_META[detail.status].labelText}</span>
            <span style={pill('gray')}>{detail.category}</span>
            {detail.overdue && <span style={pill('red')}>Mediation overdue</span>}
          </div>

          <DetailRow labelText="Incident Description">
            <div style={{ background: '#F8FAFD', border: '1px solid #EDF0F5', borderRadius: 9, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>
              {detail.description}
            </div>
          </DetailRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
            <DetailRow labelText="Filing Type">
              {detail.source === ComplaintSource.MANUAL_BLOTTER
                ? 'Manual Blotter (Staff-encoded)'
                : 'Resident Complaint Form'}
            </DetailRow>
            <DetailRow labelText="Filed">{fmtDateLong(detail.filedAt)}</DetailRow>
            <DetailRow labelText="Complainant">
              {detail.complainantName ?? <span style={{ color: '#9AA6B7' }}>—</span>}
            </DetailRow>
            <DetailRow labelText="Respondent">{detail.respondentName}</DetailRow>
            <DetailRow labelText="Contact Number">
              {detail.contactNumber ?? <span style={{ color: '#9AA6B7' }}>—</span>}
            </DetailRow>
            <DetailRow labelText="Lupon Assigned">
              {detail.luponAssignee ?? <span style={{ color: '#9AA6B7' }}>Not yet assigned</span>}
            </DetailRow>
            <DetailRow labelText="Mediation Timeline">
              {detail.mediationDay === null
                ? 'N/A — no mediation clock'
                : `Day ${detail.mediationDay} of ${detail.mediationDays}${detail.overdue ? ' (OVERDUE)' : ''}`}
            </DetailRow>
            <DetailRow labelText="Evidence">
              {detail.hasEvidence && detail.evidenceUrl ? (
                <a href={detail.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                  📎 Open attached evidence
                </a>
              ) : (
                <span style={{ color: '#9AA6B7' }}>None attached</span>
              )}
            </DetailRow>
          </div>

          {(() => {
            const modalActions = actionsMap?.[detail.status] ?? [];
            if (modalActions.length === 0) return null;
            return (
              <div style={{ display: 'flex', gap: 10, marginTop: 6, borderTop: '1px solid #EDF0F5', paddingTop: 16 }}>
                {modalActions.map((a) => (
                  <button
                    key={a.next}
                    onClick={() => onAdvance(detail.id, a.next, a.actionText, detail.caseTitle)}
                    disabled={advance.isPending}
                    style={{
                      background: a.next === 'CFA_ISSUED' ? '#C0392B' : '#1E3A5F',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 9,
                      padding: '10px 16px',
                      font: '700 13px Poppins, sans-serif',
                      cursor: 'pointer',
                    }}
                  >
                    {a.actionText}
                  </button>
                ))}
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
