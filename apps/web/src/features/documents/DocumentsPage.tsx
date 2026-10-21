import { RequestType, SLA_META, VerificationStatus, type SlaClass } from '@brgy/shared';
import { useEffect, useState } from 'react';
import { useCreateDocumentRequest, useDependants, useMyRequests } from '../../api/requests';
import { fetchDownloadUrl, useDocumentTypes } from '../../api/templates';
import { btnBusy, btnPrimary, card, input, label, pill, successText } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { STATUS_PILL, deadlineChip, fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

export function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const verified = user?.verificationStatus === VerificationStatus.VERIFIED;
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const { data: myRequests } = useMyRequests();
  const { data: docTypes } = useDocumentTypes(); // server-driven: built-ins + staff-added types
  const create = useCreateDocumentRequest();

  const [documentType, setDocumentType] = useState('');
  // Heads of family may file for the minors in their household; everyone else
  // gets an empty list and never sees the picker.
  const { data: dependants } = useDependants();
  const [beneficiary, setBeneficiary] = useState('');
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
      toast(t('Please state the purpose of your request.'));
      return;
    }
    try {
      await create.mutateAsync({
        documentType,
        purpose: purpose.trim(),
        ...(beneficiary ? { beneficiaryCensusRecordId: beneficiary } : {}),
      });
      setSuccessMsg(
        t('✅ Request submitted! Your ARTA clock has started ({sla}). Track it on your Dashboard.', {
          sla: t(SLA_META[selected!.sla as SlaClass].labelText).toLowerCase(),
        }),
      );
      setPurpose('');
      setBeneficiary('');
      toast(t('📄 {label} request filed', { label: t(selected!.labelText) }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Something went wrong — please try again.'));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.05fr) minmax(0, 0.95fr)', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Online Request Form')}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          {t("Select a document type. Note: FTJS Certification waives NBI and Mayor's permit fees.")}
        </p>

        <label style={label}>{t('Document Type')}</label>
        <Select
          value={documentType}
          onChange={(v) => {
            setDocumentType(v);
            setSuccessMsg('');
          }}
          options={(docTypes ?? []).map((d) => ({
            value: d.key,
            labelText: `${!verified ? '🔒 ' : ''}${t(d.labelText)} — ${t(SLA_META[d.sla as SlaClass].labelText)}`,
          }))}
          style={{ marginBottom: 6 }}
        />
        {locked && (
          <p style={{ fontSize: 12.5, color: '#C96A11', fontWeight: 600, margin: '4px 0 10px' }}>
            {t('🔒 Unlocked after verification — upload your documents to get verified.')}
          </p>
        )}

        {/* Only heads of family receive a non-empty list, so this control is
            absent for everyone else rather than shown disabled. */}
        {(dependants?.length ?? 0) > 0 && (
          <>
            <label style={{ ...label, marginTop: 10 }}>{t('Who is this for?')}</label>
            <Select
              value={beneficiary}
              onChange={setBeneficiary}
              options={[
                { value: '', labelText: t('Myself') },
                ...(dependants ?? []).map((d) => ({
                  value: d.censusRecordId,
                  labelText: t('{name} — age {age}', { name: d.fullName, age: d.age }),
                })),
              ]}
              style={{ marginBottom: 6 }}
            />
            <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 10px', lineHeight: 1.55 }}>
              {t('As head of the family you may request for the minors in your household — they do not need their own account.')}
            </p>
          </>
        )}

        <label style={{ ...label, marginTop: 10 }}>{t('Purpose of Request')}</label>
        <input
          style={{ ...input, marginBottom: 16 }}
          placeholder={t('e.g., Employment, School Requirement, etc.')}
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
          {create.isPending ? t('Submitting…') : t('Submit')}
        </button>
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 14px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('My Document Requests')}
        </h3>
        {myDocs.length === 0 && (
          <p style={{ fontSize: 13.5, color: '#8A97AB' }}>{t('No document requests yet — file your first one.')}</p>
        )}
        {myDocs.map((r) => {
          const chip = deadlineChip(r);
          const status = STATUS_PILL[r.status];
          const download = async () => {
            if (!verified) {
              toast(t('🔒 Document downloads unlock after verification — upload your documents to get verified.'));
              return;
            }
            try {
              window.open(await fetchDownloadUrl(r.id), '_blank');
            } catch (err: any) {
              toast(err?.response?.data?.message ?? t('Download failed — try again.'));
            }
          };
          return (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>📄 {r.title}</div>
                <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 3 }}>
                  {r.hasDocument
                    ? r.pickup
                      ? t('🏛 Released at the Barangay Hall (sealed & signed) — bring one valid ID to claim')
                      : t('Issued — download your PDF or claim a printed copy at the Barangay Hall')
                    : `${t('Filed {date}', { date: fmtDateLong(r.filedAt) })} · ${chip.text}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {r.hasDocument && !r.pickup && (
                  <button
                    onClick={download}
                    style={{ background: verified ? '#1E3A5F' : '#EEF1F6', color: verified ? '#fff' : '#9AA6B7', border: 'none', borderRadius: 8, padding: '7px 13px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {verified ? t('⬇ Download PDF') : t('🔒 Download PDF')}
                  </button>
                )}
                <span style={pill(status.kind)}>{t(status.labelText)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
