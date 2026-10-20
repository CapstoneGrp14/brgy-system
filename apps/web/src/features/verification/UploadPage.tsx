import { VerificationStatus } from '@brgy/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocTypes, useMyVerification, useSubmitVerification } from '../../api/verification';
import { tryRefresh } from '../../api/client';
import { btnBusy, btnPrimary, card, label, successText } from '../../components/ui/kit';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { Select } from '../../components/ui/Select';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

export function UploadPage() {
  const user = useAuthStore((s) => s.user);
  const verified = user?.verificationStatus === VerificationStatus.VERIFIED;
  const toast = useUiStore((s) => s.toast);
  const t = useT();
  const { data: mine } = useMyVerification();
  const { data: docTypes } = useDocTypes();
  const submit = useSubmitVerification();
  const [docTypeId, setDocTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [params] = useSearchParams();
  const onboarding = params.get('onboarding') === '1' && !verified;

  // Default to the first configured document type once loaded.
  useEffect(() => {
    if (!docTypeId && docTypes?.length) setDocTypeId(docTypes[0].id);
  }, [docTypes, docTypeId]);

  // When staff approves, refresh the session so badges/locks flip everywhere.
  useEffect(() => {
    if (mine?.status === 'APPROVED' && !verified) void tryRefresh();
  }, [mine?.status, verified]);

  const onSubmit = async () => {
    if (!file) {
      toast(t('Attach your document first.'));
      return;
    }
    try {
      await submit.mutateAsync({ docTypeId, file });
      toast(t('📎 Document submitted — running OCR…'));
      setFile(null);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Upload failed — try again.'));
    }
  };

  const ocrRunning = mine && mine.ocrVerdict === 'PENDING' && mine.status === 'PENDING';
  const awaitingStaff = mine && mine.ocrVerdict !== 'PENDING' && mine.status === 'PENDING';
  const busyState = !!ocrRunning || !!awaitingStaff;

  return (
    <div style={{ maxWidth: 640 }}>
      {onboarding && (
        <div style={{ background: '#1E3A5F', color: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ font: '700 15px Poppins, sans-serif' }}>{t('🎉 Account created — Step 2 of 2')}</div>
          <div style={{ fontSize: 13, color: '#C2CFE0', marginTop: 4 }}>
            {t('Verify your identity now so staff can approve your account. Until then you can browse and file basic requests, but downloads and some services stay locked.')}
          </div>
        </div>
      )}
      <div style={{ ...card, padding: '28px 32px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Get Verified via OCR')}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 20px' }}>
          {t('Upload your documents. Our system uses OCR to extract information and cross-check it against the Barangay Census before final staff approval.')}
        </p>

        {verified ? (
          <div style={successText}>{t('🎉 Your account is verified — all services are unlocked.')}</div>
        ) : (
          <>
            <label style={label}>{t('Document Type')}</label>
            <Select
              value={docTypeId}
              onChange={setDocTypeId}
              options={(docTypes ?? []).map((d) => ({ value: d.id, labelText: t(d.labelText) }))}
              placeholder={t('Loading accepted documents…')}
              style={{ marginBottom: 14 }}
            />

            <label style={label}>{t('Supporting Document')}</label>
            <FileDropzone file={file} onFile={setFile} disabled={busyState} style={{ marginBottom: 16 }} />

            {ocrRunning && (
              <div style={{ background: '#EAF1FC', color: '#21409A', borderRadius: 9, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, marginBottom: 14, animation: 'pulse 1.4s ease infinite' }}>
                {t('🔎 Running OCR… cross-checking against the Barangay Census.')}
              </div>
            )}
            {awaitingStaff && (
              <div style={{ ...successText, marginBottom: 14 }}>
                {mine!.ocrVerdict === 'MATCH' && t("✅ {score}% Match — forwarded for final staff approval. You'll be notified once verified.", { score: mine!.matchScore ?? 0 })}
                {mine!.ocrVerdict === 'PARTIAL' && t('⚠ {score}% Match (some details differ) — forwarded for staff review.', { score: mine!.matchScore ?? 0 })}
                {mine!.ocrVerdict === 'NO_MATCH' && t('⚠ We could not confidently match your document — staff will review it manually.')}
                {mine!.ocrVerdict === 'MANUAL' && t('📄 PDF received — staff will review your document manually.')}
                {mine!.ocrVerdict === 'ERROR' && t('⚠ We could not read the file automatically — staff will review it manually.')}
              </div>
            )}
            {mine?.status === 'REJECTED' && (
              <div style={{ background: '#FBE4E1', color: '#C0392B', borderRadius: 9, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>
                {t('❌ Your last submission was rejected — upload a clearer photo or a different document.')}
                {/* Staff must now give a reason, so show it: the resident knows
                    exactly what to fix instead of guessing at a second upload. */}
                {mine.decisionNote && (
                  <div style={{ fontWeight: 500, lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0C4BE' }}>
                    <span style={{ fontWeight: 700 }}>{t('Reason:')}</span> {mine.decisionNote}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onSubmit}
              disabled={busyState}
              style={busyState ? { ...btnPrimary, background: '#DFE5EE', color: '#9AA6B7', cursor: 'not-allowed' } : submit.isPending ? btnBusy : btnPrimary}
            >
              {submit.isPending ? t('Uploading…') : awaitingStaff ? t('Awaiting Staff Approval') : t('Submit')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
