import { useAdvanceRequest } from '../../api/requests';
import { openPrintFile, usePrintingQueue } from '../../api/inventory';
import { card, cols, pill, tableFixed, td, th } from '../../components/ui/kit';
import { STATUS_PILL, fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

export function StaffStudentQueuePage() {
  const { data: rows } = usePrintingQueue();
  const advance = useAdvanceRequest();
  const toast = useUiStore((s) => s.toast);
  const t = useT();

  const onAction = async (id: string, title: string) => {
    try {
      const updated = await advance.mutateAsync(id);
      toast(t('✅ {title} → {status} — student notified.', { title, status: t(STATUS_PILL[updated.status].labelText) }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Action failed.'));
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Student Support Module')}</h2>
      <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
        {t('Free Printing & Laminating Queue — manage requests submitted by resident students.')}
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
              <th style={th}>{t('STUDENT REQUEST')}</th>
              <th style={th}>{t('RESIDENT / STUDENT NAME')}</th>
              <th style={th}>{t('FILED')}</th>
              <th style={th}>{t('STATUS')}</th>
              <th style={th}>{t('ACTION')}</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 && (
              <tr><td style={{ ...td, color: '#8A97AB' }} colSpan={5}>{t('No student requests yet.')}</td></tr>
            )}
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 700 }}>
                  🖨️ {r.title}
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A97AB', marginTop: 2, overflowWrap: 'anywhere' }}>
                    {r.fileUrl ? `📎 ${r.fileName}` : t('Drop-off at front desk (no file uploaded)')}
                  </div>
                </td>
                <td style={td}>{r.residentName}</td>
                <td style={td}>{fmtDateLong(r.filedAt)}</td>
                <td style={td}>
                  <span style={pill(STATUS_PILL[r.status].kind)}>{t(STATUS_PILL[r.status].labelText)}</span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {r.fileUrl && (
                      <button
                        onClick={() =>
                          openPrintFile(r.id).catch(() => toast(t('Could not open the file — try again.')))
                        }
                        title={t('Open {name} to print (docx auto-converts to PDF)', { name: r.fileName ?? t('file') })}
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
                        {t('🖨️ View & Print')}
                      </button>
                    )}
                    {r.actionText ? (
                      <button
                        onClick={() => onAction(r.id, r.title)}
                        disabled={advance.isPending}
                        style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {t(r.actionText)}
                      </button>
                    ) : (
                      <span style={{ color: '#1F8B4C', fontWeight: 700, fontSize: 13 }}>{t('✓ Done')}</span>
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
