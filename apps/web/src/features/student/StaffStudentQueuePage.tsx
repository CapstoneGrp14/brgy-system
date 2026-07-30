import { useAdvanceRequest } from '../../api/requests';
import { openPrintFile, usePrintingQueue } from '../../api/inventory';
import { card, cols, pill, tableFixed, td, th } from '../../components/ui/kit';
import { STATUS_PILL, fmtDateLong } from '../../components/ui/status';
import { useUiStore } from '../../stores/ui';

export function StaffStudentQueuePage() {
  const { data: rows } = usePrintingQueue();
  const advance = useAdvanceRequest();
  const toast = useUiStore((s) => s.toast);

  const onAction = async (id: string, title: string) => {
    try {
      const updated = await advance.mutateAsync(id);
      toast(`✅ ${title} → ${STATUS_PILL[updated.status].labelText} — student notified.`);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Action failed.');
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>Student Support Module</h2>
      <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
        Free Printing & Laminating Queue — manage requests submitted by resident students.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(760)}>
          <colgroup>
            {cols('32%', '20%', '13%', '15%', '20%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>STUDENT REQUEST</th>
              <th style={th}>RESIDENT / STUDENT NAME</th>
              <th style={th}>FILED</th>
              <th style={th}>STATUS</th>
              <th style={th}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 && (
              <tr><td style={{ ...td, color: '#8A97AB' }} colSpan={5}>No student requests yet.</td></tr>
            )}
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 700 }}>
                  🖨️ {r.title}
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A97AB', marginTop: 2, overflowWrap: 'anywhere' }}>
                    {r.fileUrl ? `📎 ${r.fileName}` : 'Drop-off at front desk (no file uploaded)'}
                  </div>
                </td>
                <td style={td}>{r.residentName}</td>
                <td style={td}>{fmtDateLong(r.filedAt)}</td>
                <td style={td}>
                  <span style={pill(STATUS_PILL[r.status].kind)}>{STATUS_PILL[r.status].labelText}</span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {r.fileUrl && (
                      <button
                        onClick={() =>
                          openPrintFile(r.id).catch(() => toast('Could not open the file — try again.'))
                        }
                        title={`Open ${r.fileName ?? 'file'} to print (docx auto-converts to PDF)`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#1E3A5F',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 12px',
                          font: '700 12px Poppins, sans-serif',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        🖨️ View & Print
                      </button>
                    )}
                    {r.actionText ? (
                      <button
                        onClick={() => onAction(r.id, r.title)}
                        disabled={advance.isPending}
                        style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {r.actionText}
                      </button>
                    ) : (
                      <span style={{ color: '#1F8B4C', fontWeight: 700, fontSize: 13 }}>✓ Done</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
