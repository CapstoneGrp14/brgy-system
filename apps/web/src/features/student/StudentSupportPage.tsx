import { PRINTING_SERVICES, RequestType } from '@brgy/shared';
import { useState } from 'react';
import { useCreatePrintingRequest } from '../../api/inventory';
import { useMyRequests } from '../../api/requests';
import { btnBusy, btnPrimary, card, input, label, pill, successText } from '../../components/ui/kit';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { Select } from '../../components/ui/Select';
import { STATUS_PILL, fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

export function StudentSupportPage() {
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const { data: myRequests } = useMyRequests();
  const create = useCreatePrintingRequest();

  const [serviceType, setServiceType] = useState<string>(PRINTING_SERVICES[0]);
  const [copies, setCopies] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const isLaminating = serviceType === 'Laminating';

  const submit = async () => {
    if (create.isPending) return;
    const n = Number(copies);
    if (!Number.isInteger(n) || n < 1) {
      toast(t('Enter a valid number of copies.'));
      return;
    }
    if (!file && !isLaminating) {
      toast(t('Attach the file you want printed.'));
      return;
    }
    try {
      await create.mutateAsync({ serviceType, copies: n, file });
      setSuccessMsg(
        isLaminating && !file
          ? t('✅ Laminating request filed — drop off your document at the Barangay Hall front desk.')
          : t('✅ Sent to the print queue! Claim at the Barangay Hall front desk once notified.'),
      );
      setFile(null);
      setCopies('1');
      toast(t('🖨️ Request submitted'));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast(Array.isArray(msg) ? msg[0] : (msg ?? t('Request failed — try again.')));
    }
  };

  const myPrinting = (myRequests ?? []).filter((r) => r.type === RequestType.PRINTING);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Free Printing & Laminating')}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          {t('Upload your file to have it printed or laminated at the Barangay Hall — free for student residents.')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 130px', gap: 12 }}>
          <div>
            <label style={label}>{t('Service Type')}</label>
            <Select
              value={serviceType}
              onChange={(v) => { setServiceType(v); setSuccessMsg(''); }}
              options={PRINTING_SERVICES.map((s) => ({ value: s, labelText: t(s) }))}
              style={{ marginBottom: 12 }}
            />
          </div>
          <div>
            <label style={label}>{t('Copies')}</label>
            <input
              style={{ ...input, marginBottom: 12 }}
              type="number"
              min={1}
              max={100}
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
            />
          </div>
        </div>

        <label style={label}>
          {t('Upload Document (PDF or Word')}{isLaminating ? t(' · optional — you may drop off instead') : ''})
        </label>
        <FileDropzone
          file={file}
          onFile={setFile}
          accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hint={t('PDF or Word · max 20 MB')}
          style={{ marginBottom: 16 }}
        />

        {successMsg && <div style={{ ...successText, marginBottom: 14 }}>{successMsg}</div>}
        <button onClick={submit} style={create.isPending ? btnBusy : btnPrimary}>
          {create.isPending ? t('Submitting…') : t('Submit')}
        </button>
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('My Print Jobs')}</h3>
        {myPrinting.length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>{t('Nothing in the queue yet.')}</p>}
        {myPrinting.map((r) => (
          <div key={r.id} style={{ padding: '11px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#2E3A52' }}>🖨️ {r.title}</div>
              <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 2 }}>
                {r.purpose} · {t('Filed {date}', { date: fmtDateLong(r.filedAt) })}
              </div>
            </div>
            <span style={pill(STATUS_PILL[r.status].kind)}>{t(STATUS_PILL[r.status].labelText)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
