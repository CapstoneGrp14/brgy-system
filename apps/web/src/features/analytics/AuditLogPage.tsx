import { useState } from 'react';
import { downloadAuditCsv, useAuditLog } from '../../api/analytics';
import { btnPrimary, card, cols, input, tableFixed, td, th } from '../../components/ui/kit';

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Admin Audit Log (FR-13.1) — every significant action, searchable, CSV export. */
export function AuditLogPage() {
  const [q, setQ] = useState('');
  const { data: rows } = useAuditLog(q);

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>🔒 Audit Log</h2>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
            Every significant action — user and system processes alike. Latest {rows?.length ?? 0} entries.
          </p>
        </div>
        <button onClick={() => void downloadAuditCsv(q)} style={{ ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}>
          ⬇ Download CSV
        </button>
      </div>

      <input
        style={{ ...input, maxWidth: 420, marginBottom: 16 }}
        placeholder="🔍 Search actor, action, or target…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(860)}>
          <colgroup>
            {cols('16%', '22%', '26%', '36%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>TIMESTAMP</th>
              <th style={th}>ACTOR</th>
              <th style={th}>ACTION</th>
              <th style={th}>TARGET</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 && (
              <tr><td style={{ ...td, color: '#8A97AB' }} colSpan={4}>No matching entries.</td></tr>
            )}
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, whiteSpace: 'nowrap', color: '#64748B' }}>{fmtStamp(r.at)}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r.actorLabel}</td>
                <td style={td}>{r.action}</td>
                <td style={{ ...td, color: '#64748B' }}>{r.target ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
