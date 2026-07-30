import { VERIFICATION_DOC_TYPES } from '@brgy/shared';
import { useDecideVerification, useVerificationQueue } from '../../api/verification';
import { card, cols, pill, tableFixed, td, th } from '../../components/ui/kit';
import { fmtDateLong } from '../../components/ui/status';
import { useUiStore } from '../../stores/ui';

/** Submissions store the label directly now; legacy rows stored enum-style keys. */
const docLabel = (value: string) =>
  VERIFICATION_DOC_TYPES.find((d) => d.key === value)?.labelText ?? value;

function ocrPill(verdict: string, score: number | null) {
  switch (verdict) {
    case 'MATCH':
      return <span style={pill('green')}>✅ {score}% Match</span>;
    case 'PARTIAL':
      return <span style={pill('yellow')}>⚠ {score}% — details differ</span>;
    case 'NO_MATCH':
      return <span style={pill('red')}>❌ No Match ({score}%)</span>;
    case 'MANUAL':
      return <span style={pill('gray')}>📄 Manual review (PDF)</span>;
    case 'ERROR':
      return <span style={pill('orange')}>⚠ OCR failed — review manually</span>;
    default:
      return <span style={pill('blue')}>⏳ Running OCR…</span>;
  }
}

export function VerificationPage() {
  const { data } = useVerificationQueue();
  const decide = useDecideVerification();
  const toast = useUiStore((s) => s.toast);

  const onDecide = async (id: string, approve: boolean, name: string) => {
    try {
      await decide.mutateAsync({ id, approve });
      toast(approve ? `✅ ${name} is now a verified resident.` : `❌ ${name}'s submission rejected.`);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Action failed.');
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
        Verification Audit & Approval
      </h2>
      <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
        OCR extracts info and cross-checks against the Census database. Final approval is manual.
        {data && data.pendingCount > 0 && ` · ${data.pendingCount} awaiting review`}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(760)}>
          <colgroup>
            {cols('18%', '28%', '22%', '13%', '19%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>RESIDENT SIGN-UP</th>
              <th style={th}>UPLOADED DOCUMENT</th>
              <th style={th}>OCR STATUS (CENSUS CROSS-CHECK)</th>
              <th style={th}>DATE SUBMITTED</th>
              <th style={th}>STAFF ACTION</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td style={{ ...td, color: '#8A97AB' }} colSpan={5}>No verification submissions yet.</td>
              </tr>
            )}
            {(data?.items ?? []).map((s) => (
              <tr key={s.id}>
                <td style={{ ...td, fontWeight: 700 }}>{s.residentName}</td>
                <td style={td}>
                  <a href={s.fileUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                    {s.fileName}
                  </a>
                  <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 2 }}>{docLabel(s.docType)}</div>
                </td>
                <td style={td}>{ocrPill(s.ocrVerdict, s.matchScore)}</td>
                <td style={td}>{fmtDateLong(s.createdAt)}</td>
                <td style={td}>
                  {s.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onDecide(s.id, true, s.residentName)}
                        disabled={decide.isPending}
                        style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onDecide(s.id, false, s.residentName)}
                        disabled={decide.isPending}
                        style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #E8B4AE', borderRadius: 7, padding: '7px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span style={pill(s.status === 'APPROVED' ? 'green' : 'red')}>
                      {s.status === 'APPROVED' ? 'Approved ✓' : 'Rejected ✕'}
                      {s.decidedBy ? ` · ${s.decidedBy.split(' ')[0]}` : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
