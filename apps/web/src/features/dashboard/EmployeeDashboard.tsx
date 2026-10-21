import type { QueueTab, RequestDto } from '@brgy/shared';
import { Icon, type IconName } from '../../components/ui/Icon';
import { SLA_META } from '@brgy/shared';
import { useState } from 'react';
import {
  downloadQueueCsv,
  useAdvanceRequest,
  useQueue,
  useQueueStats,
  type QueueDeadline,
  useUploadSignedDocument,
} from '../../api/requests';
import { openPrintWindow, printDocument } from '../../api/print';
import { useComplaintsQueue } from '../../api/complaints';
import { useInventory } from '../../api/inventory';
import { useVerificationQueue } from '../../api/verification';
import { card, cols, input, pill, tableFixed, td, th } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { DetailRow, Modal } from '../../components/ui/Modal';
import { REQUEST_ICON, STATUS_PILL, deadlineChip, fmtDate, fmtDateLong } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

const TABS: Array<{ id: QueueTab; labelText: string }> = [
  { id: 'all', labelText: 'All' },
  { id: 'doc', labelText: 'Documents' },
  { id: 'health', labelText: 'Health' },
  { id: 'cctv', labelText: 'CCTV' },
];

export function EmployeeDashboard() {
  const [tab, setTab] = useState<QueueTab>('all');
  const [page, setPage] = useState(1);
  // Filters live beside the tabs and are applied server-side — the queue is
  // paginated at five rows, so narrowing the visible page would misrepresent
  // how much work is actually outstanding.
  const [search, setSearch] = useState('');
  const [deadline, setDeadline] = useState<QueueDeadline>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const uploadSigned = useUploadSignedDocument();
  const { data } = useQueue(tab, page, search, deadline);
  const { data: stats } = useQueueStats();
  const { data: verifQueue } = useVerificationQueue();
  const { data: complaintsQueue } = useComplaintsQueue();
  const { data: inventoryItems } = useInventory();
  const advance = useAdvanceRequest();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();

  const counts = data?.counts ?? { all: 0, doc: 0, health: 0, cctv: 0 };
  const detail: RequestDto | null = (data?.items ?? []).find((r) => r.id === detailId) ?? null;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 5));
  const overdueOnPage = (data?.items ?? []).filter((r) => r.overdueDays > 0).length;

  // Design stat cards: value + colored footnote. Complaints/verification/stock go live in Phases 3–6.
  const foot = {
    warn: { color: '#C96A11' },
    bad: { color: '#C0392B' },
    ok: { color: '#1F8B4C' },
    muted: { color: '#8A97AB' },
  };
  const statCards = [
    {
      icon: 'document' as IconName,
      labelText: 'Pending Requests (ARTA)',
      value: stats?.openTotal ?? counts.all,
      footText:
        (stats?.dueSoon ?? 0) > 0
          ? t('⚠ {n} due within 24 hrs', { n: stats!.dueSoon })
          : (stats?.overdue ?? 0) > 0
            ? t('⚠ {n} overdue', { n: stats!.overdue })
            : t('✓ Nothing due within 24 hrs'),
      footStyle: (stats?.dueSoon ?? 0) > 0 ? foot.warn : (stats?.overdue ?? 0) > 0 ? foot.bad : foot.ok,
    },
    {
      icon: 'scale' as IconName,
      labelText: 'Active Complaints',
      value: complaintsQueue?.activeCount ?? 0,
      footText: (() => {
        const overdue = (complaintsQueue?.items ?? []).filter((c) => c.overdue).length;
        return overdue > 0 ? t('⚠ {n} past the 20-day clock', { n: overdue }) : t('✓ All within mediation window');
      })(),
      footStyle: (complaintsQueue?.items ?? []).some((c) => c.overdue) ? foot.bad : foot.ok,
    },
    {
      icon: 'user' as IconName,
      labelText: 'Pending Verification',
      value: verifQueue?.pendingCount ?? 0,
      footText:
        (verifQueue?.pendingCount ?? 0) > 0
          ? t('⚠ {n} flagged by OCR', { n: verifQueue!.items.filter((i) => i.status === 'PENDING' && i.ocrVerdict !== 'MATCH' && i.ocrVerdict !== 'PENDING').length })
          : t('✓ Queue clear'),
      footStyle: (verifQueue?.pendingCount ?? 0) > 0 ? foot.warn : foot.ok,
    },
    {
      icon: 'box' as IconName,
      labelText: 'Low-Stock Items',
      value: (inventoryItems ?? []).filter((i) => !i.isOpen).length,
      footText: (() => {
        const low = (inventoryItems ?? []).filter((i) => !i.isOpen).map((i) => i.name.split(' ')[0]);
        return low.length > 0 ? `⚠ ${low.slice(0, 2).join(' · ')}` : t('✓ All stock above thresholds');
      })(),
      footStyle: (inventoryItems ?? []).some((i) => !i.isOpen) ? foot.bad : foot.ok,
    },
  ];

  const onAction = async (id: string) => {
    try {
      const updated = await advance.mutateAsync(id);
      toast(t('✅ {title} → {status}', { title: updated.title, status: t(STATUS_PILL[updated.status].labelText) }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Action failed — try again.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SOS status banner — live alerts arrive with Phase 7's SOS module. */}
      <div style={{ background: '#E4F5EB', border: '1px solid #BFE6CE', borderRadius: 12, padding: '14px 20px', fontSize: 13.5, fontWeight: 700, color: '#1F8B4C' }}>
        {t('✅ No active SOS alerts — all clear.')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        {statCards.map((s) => (
          <div key={s.labelText} style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 700 }}>
              <Icon name={s.icon} size={17} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 7 }} />{t(s.labelText)}
            </div>
            <div style={{ font: '800 28px Poppins, sans-serif', color: '#1E3A5F', marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, ...s.footStyle }}>{s.footText}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: '18px 26px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
            {t('Requests Queue — ARTA SLA Tracker')}
          </h3>
          <span style={{ fontSize: 12, color: '#8A97AB' }}>{t('3-day simple · 7-day complex · 20-day technical')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 22, overflowX: 'auto' }}>
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => {
                  setTab(tb.id);
                  setPage(1);
                }}
                style={{
                  padding: '14px 2px',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: `2.5px solid ${tab === tb.id ? '#21409A' : 'transparent'}`,
                  color: tab === tb.id ? '#21409A' : '#64748B',
                }}
              >
                {t(tb.labelText)} ({counts[tb.id]})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748B' }}>
            {!isMobile && (
              <span>
                <span style={{ color: '#D64541' }}>●</span> {t('Overdue')}&nbsp;&nbsp;
                <span style={{ color: '#F5A81C' }}>●</span> {t('Due soon')}&nbsp;&nbsp;
                <span style={{ color: '#27AE60' }}>●</span> {t('On track')}
              </span>
            )}
            <button
              onClick={() => downloadQueueCsv().then(() => toast(t('⬇ Queue exported as CSV')))}
              style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              {t('Export CSV')}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '4px 0 14px' }}>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('Search request or resident…')}
            aria-label={t('Search request or resident')}
            style={{ ...input, width: isMobile ? '100%' : 260, marginBottom: 0 }}
          />
          <Select
            value={deadline}
            onChange={(v) => {
              setDeadline(v as QueueDeadline);
              setPage(1);
            }}
            options={[
              { value: 'all', labelText: t('All deadlines') },
              { value: 'overdue', labelText: t('Overdue') },
              { value: 'soon', labelText: t('Due soon (24h)') },
              { value: 'ontrack', labelText: t('On track') },
            ]}
            style={{ width: isMobile ? '100%' : 190 }}
          />
          {(search.trim() || deadline !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setDeadline('all');
                setPage(1);
              }}
              style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: '6px 2px' }}
            >
              {t('Clear filters')}
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#8A97AB' }}>
            {t('{n} matching', { n: data?.total ?? 0 })}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableFixed(880)}>
            <colgroup>
              {cols('25%', '16%', '9%', '13%', '13%', '24%').map((c) => (
                <col key={c.key} style={c.style} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={th}>{t('REQUEST')}</th>
                <th style={th}>{t('RESIDENT')}</th>
                <th style={th}>{t('FILED')}</th>
                <th style={th}>{t('ARTA DEADLINE')}</th>
                <th style={th}>{t('STATUS')}</th>
                <th style={th}>{t('ACTION')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((r) => {
                const chip = deadlineChip(r);
                const status = STATUS_PILL[r.status];
                const rowBg =
                  chip.kind === 'red'
                    ? { background: '#FEF5F4', boxShadow: 'inset 3px 0 0 #D64541' }
                    : chip.kind === 'yellow'
                      ? { background: '#FFFDF3', boxShadow: 'inset 3px 0 0 #F5A81C' }
                      : {};
                return (
                  <tr key={r.id} style={rowBg}>
                    <td style={{ ...td, fontWeight: 700 }}>
                      <button
                        onClick={() => setDetailId(r.id)}
                        title={t('View details')}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 700, color: '#21409A', cursor: 'pointer', textAlign: 'left' }}
                      >
                        {r.title}
                      </button>
                      <div style={{ marginTop: 2 }}>
                        <button
                          onClick={() => setDetailId(r.id)}
                          style={{ background: 'none', border: 'none', padding: 0, color: '#2E66D0', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}
                        >
                          {t('View Details →')}
                        </button>
                      </div>
                    </td>
                    <td style={td}>{r.residentName}</td>
                    <td style={td}>{fmtDate(r.filedAt)}</td>
                    <td style={td}>
                      <span style={pill(chip.kind)}>{chip.text}</span>
                    </td>
                    <td style={td}>
                      <span style={pill(status.kind)}>{t(status.labelText)}</span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {r.actionText ? (
                          <button
                            onClick={() => onAction(r.id)}
                            disabled={advance.isPending}
                            style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3, flexShrink: 0 }}
                          >
                            {t(r.actionText)}
                          </button>
                        ) : (
                          <span style={{ color: '#9AA6B7', fontSize: 13 }}>—</span>
                        )}
                        {r.hasDocument && (
                          <button
                            title={t('Download the generated PDF for printing (seal + signature)')}
                            onClick={() =>
                              (() => {
                                const win = openPrintWindow();
                                if (!win) {
                                  toast(t('Allow pop-ups for this site to print.'));
                                  return;
                                }
                                printDocument(win, r.id).catch(() => {
                                  win.close();
                                  toast(t('Print failed — try again.'));
                                });
                              })()
                            }
                            style={{ background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3, flexShrink: 0 }}
                          >
                            {t('⎙ Print')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(data?.items ?? []).length === 0 && (
                <tr>
                  <td style={{ ...td, color: '#8A97AB' }} colSpan={6}>
                    {/* "Nothing matched" must not read as "queue is clear" —
                        staff would conclude the backlog is empty. */}
                    {search.trim() || deadline !== 'all'
                      ? t('No requests match this search or filter.')
                      : t('Queue is clear — no open requests in this tab. 🎉')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: '#8A97AB' }}>
            {t('Showing {from}–{to} of {total} records', { from: data && data.total > 0 ? (page - 1) * 5 + 1 : 0, to: Math.min(page * 5, data?.total ?? 0), total: data?.total ?? 0 })}
            {overdueOnPage > 0 && t(' · {n} overdue on this page', { n: overdueOnPage })}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ border: '1px solid #DFE5EE', background: page > 1 ? '#fff' : '#F7F9FC', borderRadius: 7, padding: '6px 11px', font: '700 12px Poppins, sans-serif', cursor: page > 1 ? 'pointer' : 'default', color: page > 1 ? '#33415E' : '#C3CBD8' }}
            >
              {t('Prev')}
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  border: `1px solid ${page === i + 1 ? '#1E3A5F' : '#DFE5EE'}`,
                  background: page === i + 1 ? '#1E3A5F' : '#fff',
                  color: page === i + 1 ? '#fff' : '#33415E',
                  borderRadius: 7,
                  padding: '6px 12px',
                  font: '700 12px Poppins, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ border: '1px solid #DFE5EE', background: page < totalPages ? '#fff' : '#F7F9FC', borderRadius: 7, padding: '6px 11px', font: '700 12px Poppins, sans-serif', cursor: page < totalPages ? 'pointer' : 'default', color: page < totalPages ? '#33415E' : '#C3CBD8' }}
            >
              {t('Next')}
            </button>
          </div>
        </div>
      </div>

      {detail && (
        <Modal title={`${REQUEST_ICON[detail.type] ?? '📄'} ${detail.title}`} onClose={() => setDetailId(null)}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span style={pill(STATUS_PILL[detail.status].kind)}>{t(STATUS_PILL[detail.status].labelText)}</span>
            <span style={pill(deadlineChip(detail).kind)}>{deadlineChip(detail).text}</span>
            {detail.pickup && <span style={pill('orange')}>{t('🏛 Pickup at Hall')}</span>}
          </div>

          <DetailRow labelText={t('Purpose / Details')}>
            <div style={{ background: '#F8FAFD', border: '1px solid #EDF0F5', borderRadius: 9, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>
              {detail.purpose ?? '—'}
            </div>
          </DetailRow>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0 18px' }}>
            <DetailRow labelText={t('Resident')}>{detail.residentName ?? '—'}</DetailRow>
            <DetailRow labelText={t('Request Type')}>{detail.subtype.replaceAll('_', ' ')}</DetailRow>
            <DetailRow labelText={t('Filed')}>{fmtDateLong(detail.filedAt)}</DetailRow>
            <DetailRow labelText={t('ARTA Deadline')}>
              {fmtDateLong(detail.dueAt)} · {t(SLA_META[detail.slaClass].labelText)}
            </DetailRow>
            <DetailRow labelText={t('Completed')}>
              {detail.completedAt ? fmtDateLong(detail.completedAt) : <span style={{ color: '#9AA6B7' }}>{t('Not yet')}</span>}
            </DetailRow>
            <DetailRow
              labelText={detail.pickup ? t('Print Copy') : detail.awaitingSignedUpload ? t('Signing Draft') : t('Issued Document')}
            >
              {detail.hasDocument ? (
                <button
                  onClick={() =>
                    (() => {
                      const win = openPrintWindow();
                      if (!win) {
                        toast(t('Allow pop-ups for this site to print.'));
                        return;
                      }
                      printDocument(win, detail.id).catch(() => {
                        win.close();
                        toast(t('Print failed — try again.'));
                      });
                    })()
                  }
                  style={{ background: 'none', border: 'none', padding: 0, color: '#2E66D0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  {detail.pickup
                    ? t('⎙ Print for signing & release')
                    : detail.awaitingSignedUpload
                      ? t('⎙ Print draft for signing')
                      : t('📄 Open signed copy')}
                </button>
              ) : (
                <span style={{ color: '#9AA6B7' }}>{t('Generated at Review')}</span>
              )}
            </DetailRow>
          </div>

          {/* Digital documents: the resident receives the staff-uploaded signed scan. */}
          {detail.type === 'DOCUMENT' && !detail.pickup && detail.status !== 'CLAIMED' && (
            detail.awaitingSignedUpload ? (
              <div style={{ background: '#FFF7DE', border: '1px solid #F2DFA4', borderRadius: 10, padding: '14px 16px', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7A611B', marginBottom: 8 }}>
                  {t("✍️ Upload the signed & sealed copy — this is what gets emailed to the resident. Completion is locked until it's attached.")}
                </div>
                <FileDropzone
                  file={signedFile}
                  onFile={setSignedFile}
                  accept="application/pdf,image/jpeg,image/png"
                  hint={t('PDF or JPG/PNG scan · max 10 MB')}
                  style={{ marginBottom: 10 }}
                />
                <button
                  onClick={() =>
                    signedFile &&
                    uploadSigned
                      .mutateAsync({ id: detail.id, file: signedFile })
                      .then(() => {
                        setSignedFile(null);
                        toast(t('✅ Signed copy attached — you can now mark the request processed.'));
                      })
                      .catch((err: any) => toast(err?.response?.data?.message ?? t('Upload failed.')))
                  }
                  disabled={!signedFile || uploadSigned.isPending}
                  style={{
                    background: signedFile ? '#27AE60' : '#DFE5EE',
                    color: signedFile ? '#fff' : '#9AA6B7',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 16px',
                    font: '700 13px Poppins, sans-serif',
                    cursor: signedFile ? 'pointer' : 'not-allowed',
                  }}
                >
                  {uploadSigned.isPending ? t('Uploading…') : t('📤 Attach Signed Copy')}
                </button>
              </div>
            ) : (
              <div style={{ background: '#E4F5EB', border: '1px solid #BFE6CE', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#1F8B4C', marginBottom: 6 }}>
                {t('✅ Signed & sealed copy on file — this is what the resident receives.')}
              </div>
            )
          )}

          {detail.actionText && (
            <div style={{ display: 'flex', gap: 10, marginTop: 6, borderTop: '1px solid #EDF0F5', paddingTop: 16 }}>
              <button
                onClick={() => onAction(detail.id)}
                disabled={advance.isPending}
                style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}
              >
                {t(detail.actionText)}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
