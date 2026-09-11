import { SLA_META, type SlaClass } from '@brgy/shared';
import { useState } from 'react';
import { downloadArtaCsv, fetchArtaSummary, useArtaReport } from '../../api/analytics';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { REQUEST_ICON, STATUS_PILL, fmtDate } from '../../components/ui/status';
import { btnPrimary, card, cols, pill, tableFixed, td, th } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

/** ARTA SLA Report — per-request audit (FR-12.4) with year filter + AI summary. */
export function ArtaReportPage() {
  const t = useT();
  const toast = useUiStore((s) => s.toast);
  const [year, setYear] = useState<string>('all');
  const yearNum = year === 'all' ? undefined : Number(year);
  const { data } = useArtaReport(yearNum);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  const list = data?.items ?? [];
  const years = data?.years ?? [];
  const completed = list.filter((r) => r.completedAt);
  const onTime = completed.filter((r) => r.onTime).length;
  const overdueNow = list.filter((r) => r.overdueNow).length;

  const openSummary = async () => {
    if (summaryBusy) return;
    setSummaryBusy(true);
    try {
      setSummary(await fetchArtaSummary(yearNum));
    } catch {
      toast(t('Could not draft the summary — try again.'));
    } finally {
      setSummaryBusy(false);
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('ARTA SLA Report')}</h2>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
            {t('Per-request audit against the RA 11032 3-7-20 rule')} · {t(list.length === 1 ? '{n} request' : '{n} requests', { n: list.length })}
            {year !== 'all' && ` ${t('in {year}', { year })}`} ·{' '}
            {completed.length ? t('{pct}% completed on time', { pct: Math.round((onTime / completed.length) * 100) }) : t('no completions yet')}
            {overdueNow > 0 && ` · ${t('{n} currently overdue', { n: overdueNow })}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            value={year}
            onChange={setYear}
            options={[
              { value: 'all', labelText: t('All years') },
              ...years.map((y) => ({ value: String(y), labelText: String(y) })),
            ]}
            style={{ width: 130 }}
          />
          <button
            onClick={openSummary}
            style={{ background: '#fff', border: '2px solid #1E3A5F', color: '#1E3A5F', borderRadius: 9, padding: '9px 16px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
          >
            {summaryBusy ? t('Drafting…') : t('✨ AI Summary')}
          </button>
          <button onClick={() => void downloadArtaCsv(yearNum)} style={{ ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}>
            {t('⬇ Export CSV')}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(1000)}>
          <colgroup>
            {cols('24%', '15%', '15%', '10%', '12%', '12%', '12%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>{t('REQUEST')}</th>
              <th style={th}>{t('RESIDENT')}</th>
              <th style={th}>{t('SLA CLASS')}</th>
              <th style={th}>{t('FILED')}</th>
              <th style={th}>{t('ARTA TARGET')}</th>
              <th style={th}>{t('COMPLETED')}</th>
              <th style={th}>{t('VERDICT')}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td style={{ ...td, color: '#8A97AB' }} colSpan={7}>{year === 'all' ? t('No requests yet.') : t('No requests in {year}.', { year })}</td></tr>
            )}
            {list.map((r) => (
              <tr key={r.id} style={r.overdueNow ? { background: '#FEF5F4', boxShadow: 'inset 3px 0 0 #D64541' } : {}}>
                <td style={{ ...td, fontWeight: 700 }}>
                  {REQUEST_ICON[r.type as keyof typeof REQUEST_ICON] ?? '📄'} {r.title}
                </td>
                <td style={td}>{r.resident}</td>
                <td style={td}>{t(SLA_META[r.slaClass as SlaClass]?.labelText ?? r.slaClass)}</td>
                <td style={td}>{fmtDate(r.filedAt)}</td>
                <td style={td}>{fmtDate(r.dueAt)}</td>
                <td style={td}>{r.completedAt ? fmtDate(r.completedAt) : '—'}</td>
                <td style={td}>
                  {r.onTime === true && <span style={pill('green')}>{t('✓ On Time')}</span>}
                  {r.onTime === false && <span style={pill('red')}>{t('Late')}</span>}
                  {r.onTime === null && r.overdueNow && <span style={pill('red')}>{t('Overdue')}</span>}
                  {r.onTime === null && !r.overdueNow && (
                    <span style={pill(STATUS_PILL[r.status as keyof typeof STATUS_PILL]?.kind ?? 'blue')}>
                      {t(STATUS_PILL[r.status as keyof typeof STATUS_PILL]?.labelText ?? r.status)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary !== null && (
        <Modal title={t('✨ ARTA Summary — {label}', { label: year === 'all' ? t('All Years') : year })} onClose={() => setSummary(null)} width={620}>
          <p style={{ fontSize: 13.5, color: '#2E3A52', lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-line' }}>{summary}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: '#8A97AB' }}>
              {t('Drafted from live ARTA records — review before publishing.')}
            </span>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(summary);
                toast(t('📋 Summary copied to clipboard.'));
              }}
              style={{ ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}
            >
              {t('Copy to Clipboard')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
