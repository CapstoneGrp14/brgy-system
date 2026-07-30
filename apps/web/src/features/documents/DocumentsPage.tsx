import { RequestType, SLA_META, VerificationStatus, type SlaClass } from '@brgy/shared';
import { useEffect, useState } from 'react';
import { useCreateDocumentRequest, useMyRequests } from '../../api/requests';
import { fetchDownloadUrl, useDocumentTypes } from '../../api/templates';
import { btnBusy, btnPrimary, card, input, label, pill, successText } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { STATUS_PILL, deadlineChip, fmtDateLong } from '../../components/ui/status';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

export function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const verified = user?.verificationStatus === VerificationStatus.VERIFIED;
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const { data: myRequests } = useMyRequests();
  const { data: docTypes } = useDocumentTypes(); // server-driven: built-ins + staff-added types
  const create = useCreateDocumentRequest();

  const [documentType, setDocumentType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!documentType && docTypes?.length) setDocumentType(docTypes[0].key);
  }, [docTypes, documentType]);

  const selected = (docTypes ?? []).find((d) => d.key === documentType);
  const locked = !verified; // filing any document requires verification (server-enforced)
  const myDocs = (myRequests ?? []).filter((r) => r.type === RequestType.DOCUMENT);

  const submit = async () => {
    if (create.isPending || !selected) return;
    if (!purpose.trim()) {
      toast('Please state the purpose of your request.');
      return;
    }
    try {
      await create.mutateAsync({ documentType, purpose: purpose.trim() });
      setSuccessMsg(
        `✅ Request submitted! Your ARTA clock has started (${SLA_META[selected!.sla as SlaClass].labelText.toLowerCase()}). Track it on your Dashboard.`,
      );
      setPurpose('');
      toast(`📄 ${selected!.labelText} request filed`);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Something went wrong — please try again.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>Online Request Form</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          Select a document type. Note: FTJS Certification waives NBI and Mayor's permit fees.
        </p>

        <label style={label}>Document Type</label>
        <Select
          value={documentType}
          onChange={(v) => {
            setDocumentType(v);
            setSuccessMsg('');
          }}
          options={(docTypes ?? []).map((d) => ({
            value: d.key,
            labelText: `${!verified ? '🔒 ' : ''}${d.labelText} — ${SLA_META[d.sla as SlaClass].labelText}`,
          }))}
          style={{ marginBottom: 6 }}
        />
        {locked && (
          <p style={{ fontSize: 12.5, color: '#C96A11', fontWeight: 600, margin: '4px 0 10px' }}>
            🔒 Unlocked after verification — upload your documents to get verified.
          </p>
        )}

        <label style={{ ...label, marginTop: 10 }}>Purpose of Request</label>
        <input
          style={{ ...input, marginBottom: 16 }}
          placeholder="e.g., Employment, School Requirement, etc."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !locked && submit()}
        />

        {successMsg && <div style={{ ...successText, marginBottom: 14 }}>{successMsg}</div>}

        <button
          onClick={submit}
          disabled={locked}
          style={
            locked
              ? { ...btnPrimary, background: '#DFE5EE', color: '#9AA6B7', cursor: 'not-allowed' }
              : create.isPending
                ? btnBusy
                : btnPrimary
          }
        >
          {create.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 14px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          My Document Requests
        </h3>
        {myDocs.length === 0 && (
          <p style={{ fontSize: 13.5, color: '#8A97AB' }}>No document requests yet — file your first one.</p>
        )}
        {myDocs.map((r) => {
          const chip = deadlineChip(r);
          const status = STATUS_PILL[r.status];
          const download = async () => {
            if (!verified) {
              toast('🔒 Document downloads unlock after verification — upload your documents to get verified.');
              return;
            }
            try {
              window.open(await fetchDownloadUrl(r.id), '_blank');
            } catch (err: any) {
              toast(err?.response?.data?.message ?? 'Download failed — try again.');
            }
          };
          return (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>📄 {r.title}</div>
                <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 3 }}>
                  {r.hasDocument
                    ? r.pickup
                      ? '🏛 Released at the Barangay Hall (sealed & signed) — bring one valid ID to claim'
                      : 'Issued — download your PDF or claim a printed copy at the Barangay Hall'
                    : `Filed ${fmtDateLong(r.filedAt)} · ${chip.text}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {r.hasDocument && !r.pickup && (
                  <button
                    onClick={download}
                    style={{ background: verified ? '#1E3A5F' : '#EEF1F6', color: verified ? '#fff' : '#9AA6B7', border: 'none', borderRadius: 8, padding: '7px 13px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {verified ? '⬇ Download PDF' : '🔒 Download PDF'}
                  </button>
                )}
                <span style={pill(status.kind)}>{status.labelText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
