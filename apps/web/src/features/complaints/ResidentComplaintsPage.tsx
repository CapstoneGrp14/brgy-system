import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_META, RequestType } from '@brgy/shared';
import { useState } from 'react';
import { useFileComplaint, useMyComplaints } from '../../api/complaints';
import { api } from '../../api/client';
import { useMyRequests } from '../../api/requests';
import { btnBusy, btnPrimary, card, input, label, pill, successText } from '../../components/ui/kit';
import { DatePicker } from '../../components/ui/DatePicker';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { Select } from '../../components/ui/Select';
import { STATUS_PILL, fmtDateLong } from '../../components/ui/status';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

export function ResidentComplaintsPage() {
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const { data: myComplaints } = useMyComplaints();
  const { data: myRequests } = useMyRequests();
  const fileComplaint = useFileComplaint();

  const [respondentName, setRespondentName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [compMsg, setCompMsg] = useState('');

  const [cctvWhen, setCctvWhen] = useState('');
  const [cctvLocation, setCctvLocation] = useState('');
  const [cctvMsg, setCctvMsg] = useState('');
  const [cctvBusy, setCctvBusy] = useState(false);

  const submitComplaint = async () => {
    if (fileComplaint.isPending) return;
    if (!description.trim()) {
      toast('Please describe the incident first.');
      return;
    }
    try {
      await fileComplaint.mutateAsync({
        respondentName: respondentName.trim() || 'Unknown',
        description: description.trim(),
        category,
        contactNumber: contactNumber || undefined,
        evidence,
      });
      setCompMsg('✅ Complaint filed. A Lupon member will be assigned — the 20-day mediation clock has started.');
      setDescription('');
      setRespondentName('');
      setEvidence(null);
      toast('⚖️ Complaint submitted');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast(Array.isArray(msg) ? msg[0] : (msg ?? 'Filing failed — try again.'));
    }
  };

  const submitCctv = async () => {
    if (cctvBusy) return;
    if (!cctvLocation.trim()) {
      toast('Please give the location of the incident.');
      return;
    }
    setCctvBusy(true);
    try {
      await api.post('/requests/cctv', { incidentAt: cctvWhen || null, location: cctvLocation.trim() });
      setCctvMsg('✅ CCTV footage request logged for review — technical requests may take up to 20 days.');
      setCctvLocation('');
      setCctvWhen('');
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Request failed — try again.');
    } finally {
      setCctvBusy(false);
    }
  };

  const myCctv = (myRequests ?? []).filter((r) => r.type === RequestType.CCTV).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: 22, alignItems: 'start' }}>
        {/* File a complaint */}
        <div style={{ ...card, padding: '26px 28px' }}>
          <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>
            File a Complaint (Complainant Statement)
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
            Your complaint enters Katarungang Pambarangay mediation with a 20-day clock.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Contact Number</label>
              <input style={{ ...input, marginBottom: 12 }} placeholder="e.g., 09123456789" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>
            <div>
              <label style={label}>Category</label>
              <Select value={category} onChange={setCategory} options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, labelText: c }))} style={{ marginBottom: 12 }} />
            </div>
          </div>

          <label style={label}>Respondent (person you are complaining against)</label>
          <input style={{ ...input, marginBottom: 12 }} placeholder="Name or 'Unknown'" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />

          <label style={label}>Facts / Incident Description</label>
          <textarea
            rows={5}
            placeholder="Ilarawan ang insidente…"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            style={{ ...input, resize: 'vertical', marginBottom: 4, fontFamily: 'inherit' }}
          />
          <div style={{ textAlign: 'right', fontSize: 12, color: '#8A97AB', marginBottom: 12 }}>{description.length} / 1000</div>

          <label style={label}>Attach Evidence (optional — photo, PDF, or video)</label>
          <FileDropzone file={evidence} onFile={setEvidence} accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" hint="photo, PDF, or MP4 · max 15 MB" style={{ marginBottom: 14 }} />

          <div style={{ background: '#F4F7FB', borderRadius: 9, padding: '10px 13px', fontSize: 12.5, color: '#4A5A74', marginBottom: 16 }}>
            ℹ️ Formal complaints are filed under your name — mediation is face-to-face, so your identity
            is disclosed at the hearing.
          </div>

          {compMsg && <div style={{ ...successText, marginBottom: 14 }}>{compMsg}</div>}
          <button onClick={submitComplaint} style={fileComplaint.isPending ? btnBusy : btnPrimary}>
            {fileComplaint.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>

        {/* CCTV request */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ ...card, padding: '26px 28px' }}>
            <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>Request CCTV Footage</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
              For cases such as littering, property damage, or disputes requiring evidence.
            </p>
            <label style={label}>Date and Time of Incident</label>
            <DatePicker withTime value={cctvWhen} onChange={setCctvWhen} style={{ marginBottom: 12 }} />
            <label style={label}>Location / Street</label>
            <input style={{ ...input, marginBottom: 16 }} placeholder="e.g., Old Sta. Mesa Ave." value={cctvLocation} onChange={(e) => setCctvLocation(e.target.value)} />
            {cctvMsg && <div style={{ ...successText, marginBottom: 14 }}>{cctvMsg}</div>}
            <button onClick={submitCctv} style={cctvBusy ? btnBusy : btnPrimary}>
              {cctvBusy ? 'Submitting…' : 'Submit'}
            </button>
            {myCctv.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {myCctv.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid #F0F3F8', fontSize: 12.5 }}>
                    <span style={{ color: '#64748B' }}>📷 Filed {fmtDateLong(r.filedAt)}</span>
                    <span style={pill(STATUS_PILL[r.status].kind)}>{STATUS_PILL[r.status].labelText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My cases */}
          <div style={{ ...card, padding: '24px 26px' }}>
            <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>My Cases</h3>
            {(myComplaints ?? []).length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>No complaints filed.</p>}
            {(myComplaints ?? []).map((c) => {
              const meta = COMPLAINT_STATUS_META[c.status];
              return (
                <div key={c.id} style={{ padding: '11px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#2E3A52' }}>⚖️ {c.caseTitle}</div>
                    <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 2 }}>
                      {c.category} · Filed {fmtDateLong(c.filedAt)}
                      {c.mediationDay !== null && ` · Day ${c.mediationDay}/${c.mediationDays}`}
                      {c.luponAssignee && ` · ${c.luponAssignee}`}
                    </div>
                  </div>
                  <span style={pill(meta.kind)}>{meta.labelText}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
