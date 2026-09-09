import { CensusCategory, Role } from '@brgy/shared';
import { useState } from 'react';
import {
  downloadMasterlistCsv,
  useAddRecord,
  useCensusHistory,
  useImportCsv,
  useMasterlist,
} from '../../api/masterlist';
import { card, cols, input, label, pill, tableFixed, td, th } from '../../components/ui/kit';
import { DatePicker } from '../../components/ui/DatePicker';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

const CATEGORY_PILL: Record<string, { text: string; kind: 'gray' | 'yellow' | 'purple' }> = {
  REGULAR: { text: 'Regular Resident', kind: 'gray' },
  SENIOR: { text: 'Senior Citizen', kind: 'yellow' },
  PWD: { text: 'PWD', kind: 'purple' },
  SOLO_PARENT: { text: 'Solo Parent', kind: 'purple' },
};

const emptyForm = { fullName: '', birthdate: '', address: '', purok: '', category: 'REGULAR', lguEligibility: '', householdCode: '' };

export function MasterlistPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [importMode, setImportMode] = useState<'append' | 'refresh' | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: historyRows, isLoading: historyLoading } = useCensusHistory(expandedId);
  const { data } = useMasterlist({ search, category, account, status, page, pageSize });
  const addRecord = useAddRecord();
  const importCsv = useImportCsv();

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitAdd = async () => {
    try {
      await addRecord.mutateAsync({
        fullName: form.fullName,
        birthdate: form.birthdate || undefined,
        address: form.address,
        purok: form.purok || undefined,
        category: form.category,
        lguEligibility: form.lguEligibility || undefined,
        householdCode: form.householdCode || undefined,
      });
      toast(t('✅ {name} added to the census.', { name: form.fullName }));
      setForm(emptyForm);
      setShowAdd(false);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not add the record.'));
    }
  };

  const runImport = async () => {
    if (!importFile || !importMode || importCsv.isPending) return;
    try {
      const r = await importCsv.mutateAsync({ file: importFile, mode: importMode });
      toast(
        importMode === 'refresh'
          ? t('🔄 Census refreshed — {added} added, {updated} updated, {deactivated} deactivated.', { added: r.added, updated: r.updated, deactivated: r.deactivated })
          : t('📥 Import done — {added} added, {skipped} skipped (already in census).', { added: r.added, skipped: r.skipped }),
      );
      setImportMode(null);
      setImportFile(null);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Import failed — check the CSV format.'));
    }
  };

  return (
    <div style={{ ...card, padding: '20px 26px' }}>
      {/* Title row: heading left, actions right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Comprehensive Masterlist Registry')}</h2>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 0' }}>
            {t('{residents} residents · {households} households · used for queue priority and LGU eligibility only — no financial data', { residents: data?.total ?? 0, households: data?.householdCount ?? 0 })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setImportMode('append'); setImportFile(null); }}
            style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t('📥 Import CSV')}
          </button>
          <button
            onClick={() => { setImportMode('refresh'); setImportFile(null); }}
            title={t('Twice-yearly sync: upload the full current census — updates matches, adds new people, deactivates anyone missing from the file')}
            style={{ background: 'none', border: 'none', color: '#C96A11', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t('🔄 Census Refresh')}
          </button>
          {isAdmin && (
            <button onClick={() => downloadMasterlistCsv().then(() => toast(t('⬇ CSV download started')))} style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t('⬇ Download CSV')}
            </button>
          )}
          <button onClick={() => setShowAdd((v) => !v)} style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t('+ Add Resident')}
          </button>
        </div>
      </div>

      {/* Toolbar row: roomy search + filters */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 260 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9AA6B7', pointerEvents: 'none' }}>
            🔍
          </span>
          <input
            style={{ ...input, width: '100%', padding: '11px 13px 11px 38px' }}
            placeholder={t('Search by name, address, or household code…')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          options={[
            { value: '', labelText: t('All Categories') },
            ...Object.values(CensusCategory).map((c) => ({ value: c, labelText: t(CATEGORY_PILL[c].text) })),
          ]}
          style={{ minWidth: isMobile ? 'calc(50% - 6px)' : 180, flex: isMobile ? 1 : undefined }}
        />
        <Select
          value={account}
          onChange={(v) => { setAccount(v); setPage(1); }}
          options={[
            { value: '', labelText: t('All Accounts') },
            { value: 'registered', labelText: t('With Account') },
            { value: 'none', labelText: t('No Account') },
          ]}
          style={{ minWidth: isMobile ? 'calc(50% - 6px)' : 160, flex: isMobile ? 1 : undefined }}
        />
        <Select
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: '', labelText: t('All Status') },
            { value: 'active', labelText: t('Active') },
            { value: 'inactive', labelText: t('Inactive') },
          ]}
          style={{ minWidth: isMobile ? '100%' : 140 }}
        />
      </div>

      {showAdd && (
        <div style={{ background: '#F7FAFF', border: '1px solid #DCE7F7', borderRadius: 10, padding: '16px 18px', marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            <div><label style={label}>{t('Full Name')}</label><input style={input} value={form.fullName} onChange={set('fullName')} /></div>
            <div><label style={label}>{t('Birthdate')}</label><DatePicker value={form.birthdate} onChange={(v) => setForm((f) => ({ ...f, birthdate: v }))} /></div>
            <div><label style={label}>{t('Category')}</label>
              <Select
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                options={Object.values(CensusCategory).map((c) => ({ value: c, labelText: t(CATEGORY_PILL[c].text) }))}
              />
            </div>
            <div><label style={label}>{t('Address')}</label><input style={input} value={form.address} onChange={set('address')} /></div>
            <div><label style={label}>{t('Purok')}</label><input style={input} placeholder={t('e.g., Purok 3')} value={form.purok} onChange={set('purok')} /></div>
            <div><label style={label}>{t('Household Code (blank = new household)')}</label><input style={input} placeholder={t('e.g., HH-0002')} value={form.householdCode} onChange={set('householdCode')} /></div>
          </div>
          <button onClick={submitAdd} style={{ marginTop: 14, background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}>
            {addRecord.isPending ? t('Saving…') : t('Save Record')}
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={tableFixed(980)}>
          <colgroup>
            {cols('9%', '16%', '12%', '17%', '13%', '11%', '12%', '10%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>{t('HOUSEHOLD')}</th>
              <th style={th}>{t('RESIDENT NAME')}</th>
              <th style={th}>{t('BIRTHDATE / AGE')}</th>
              <th style={th}>{t('ADDRESS / ZONE')}</th>
              <th style={th}>{t('CATEGORY TAG')}</th>
              <th style={th}>{t('QUEUE STATUS')}</th>
              <th style={th}>{t('LGU ELIGIBILITY')}</th>
              <th style={th}>{t('ACCOUNT')}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r, i, arr) => {
              const cat = CATEGORY_PILL[r.category] ?? CATEGORY_PILL.REGULAR;
              const priority = r.category !== 'REGULAR';
              const firstOfHousehold = i === 0 || arr[i - 1].householdCode !== r.householdCode;
              const expanded = expandedId === r.id;
              return (
                <>
                <tr key={r.id} style={r.isActive ? {} : { opacity: 0.55 }}>
                  <td style={{ ...td, fontWeight: 700, color: '#21409A' }}>{firstOfHousehold ? (r.householdCode ?? '—') : ''}</td>
                  <td style={{ ...td, fontWeight: 700 }}>
                    {r.hasHistory && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                        title={expanded ? t('Hide history') : t('Show previous data')}
                        style={{ background: 'none', border: 'none', padding: 0, marginRight: 8, cursor: 'pointer', color: '#64748B', fontSize: 11, verticalAlign: 'middle' }}
                      >
                        {expanded ? '▼' : '▶'}
                      </button>
                    )}
                    {r.fullName}
                    {!r.isActive && <span style={{ ...pill('gray'), marginLeft: 8 }}>{t('Inactive')}</span>}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {r.birthdate ? (
                      <>
                        {new Date(r.birthdate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span style={{ color: '#8A97AB' }}>
                          {' '}· {t('{n} yrs', { n: Math.floor((Date.now() - new Date(r.birthdate + 'T00:00').getTime()) / (365.25 * 24 * 3600 * 1000)) })}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#9AA6B7' }}>—</span>
                    )}
                  </td>
                  <td style={td}>{r.address}{r.purok ? ` · ${r.purok}` : ''}</td>
                  <td style={td}><span style={pill(cat.kind)}>{t(cat.text)}</span></td>
                  <td style={td}><span style={pill(priority ? 'orange' : 'gray')}>{priority ? t('Priority Queue') : t('Standard')}</span></td>
                  <td style={td}>{r.lguEligibility ? <span style={pill(r.lguEligibility.startsWith('Eligible') ? 'green' : 'yellow')}>{r.lguEligibility}</span> : <span style={{ color: '#9AA6B7' }}>N/A</span>}</td>
                  <td style={td}>
                    {r.registered ? (
                      r.accountActive === false ? (
                        <span style={pill('red')}>{t('Account disabled')}</span>
                      ) : (
                        <span style={pill('green')}>{t('Registered')}</span>
                      )
                    ) : (
                      <span style={{ color: '#9AA6B7', fontSize: 12.5 }}>{t('No account')}</span>
                    )}
                  </td>
                </tr>
                {expanded && (
                  <tr key={`${r.id}-history`}>
                    <td colSpan={8} style={{ padding: 0, borderBottom: '1px solid #F0F3F8' }}>
                      <div style={{ background: '#F8FAFD', padding: '14px 20px 14px 46px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#7E8CA3', marginBottom: 8 }}>
                          {t('PREVIOUS DATA — {name}', { name: r.fullName.toUpperCase() })}
                        </div>
                        {historyLoading && <div style={{ fontSize: 12.5, color: '#8A97AB' }}>{t('Loading history…')}</div>}
                        {!historyLoading && (historyRows ?? []).length === 0 && (
                          <div style={{ fontSize: 12.5, color: '#8A97AB' }}>
                            {t("No previous versions — this record hasn't been changed by a census refresh yet.")}
                          </div>
                        )}
                        {(historyRows ?? []).map((h) => (
                          <div key={h.id} style={{ display: 'flex', gap: 14, padding: '8px 0', borderTop: '1px solid #EDF0F5', fontSize: 12.5, flexWrap: 'wrap' }}>
                            <span style={{ color: '#21409A', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {new Date(h.changedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span style={{ color: '#C96A11', fontWeight: 600, whiteSpace: 'nowrap' }}>{h.note}</span>
                            <span style={{ color: '#4A5A74' }}>
                              {t('was:')} {h.address}
                              {h.purok ? ` · ${h.purok}` : ''} · {t((CATEGORY_PILL[h.category] ?? CATEGORY_PILL.REGULAR).text)}
                              {h.householdCode ? ` · ${h.householdCode}` : ''}
                              {h.lguEligibility ? ` · ${h.lguEligibility}` : ''}
                              {!h.wasActive ? ` · ${t('was Inactive')}` : ''}
                            </span>
                            <span style={{ color: '#9AA6B7', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{t('by {name}', { name: h.changedBy })}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {importMode && (
        <Modal
          title={importMode === 'refresh' ? t('🔄 Census Refresh (twice-yearly sync)') : t('📥 Import Census CSV')}
          onClose={() => { setImportMode(null); setImportFile(null); }}
          width={520}
        >
          {importMode === 'refresh' ? (
            <div style={{ background: '#FFF7DE', border: '1px solid #F2DFA4', borderRadius: 9, padding: '12px 14px', fontSize: 13, color: '#7A611B', marginBottom: 16, lineHeight: 1.55 }}>
              {t('⚠️ The CSV is treated as the ')}<strong>{t('full current census')}</strong>{t(': matched residents are updated, new people are added, and anyone missing from the file is marked ')}<strong>{t('Inactive')}</strong>{t('. Use plain Import for partial lists.')}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.55 }}>
              {t('Adds new people only — existing records are never changed. Duplicates (same name and birthdate) are skipped.')}
            </p>
          )}
          <p style={{ fontSize: 12, color: '#8A97AB', margin: '0 0 10px' }}>
            {t('Columns:')} <code style={{ background: '#F4F6FA', padding: '2px 6px', borderRadius: 5 }}>fullName, birthdate, address, purok, category, lguEligibility, householdCode</code>
          </p>
          <FileDropzone
            file={importFile}
            onFile={setImportFile}
            accept=".csv,text/csv"
            hint={t('CSV · max 2 MB')}
            style={{ marginBottom: 16 }}
          />
          <button
            onClick={runImport}
            disabled={!importFile || importCsv.isPending}
            style={{
              width: '100%',
              padding: '12px 0',
              border: 'none',
              borderRadius: 9,
              background: !importFile ? '#DFE5EE' : importMode === 'refresh' ? '#F5A81C' : '#1E3A5F',
              color: !importFile ? '#9AA6B7' : importMode === 'refresh' ? '#16324F' : '#fff',
              font: '700 14px Poppins, sans-serif',
              cursor: !importFile ? 'not-allowed' : 'pointer',
            }}
          >
            {importCsv.isPending ? t('Importing…') : importMode === 'refresh' ? t('🔄 Run Census Refresh') : t('📥 Import Records')}
          </button>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: '#8A97AB' }}>
            {t('Showing {from}–{to} of {total} records', { from: data && data.total > 0 ? (page - 1) * pageSize + 1 : 0, to: Math.min(page * pageSize, data?.total ?? 0), total: data?.total ?? 0 })}
          </span>
          <Select
            compact
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            options={[8, 15, 30, 50].map((n) => ({ value: String(n), labelText: t('{n} per page', { n }) }))}
            style={{ width: 120 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} style={{ border: `1px solid ${page === i + 1 ? '#1E3A5F' : '#DFE5EE'}`, background: page === i + 1 ? '#1E3A5F' : '#fff', color: page === i + 1 ? '#fff' : '#33415E', borderRadius: 7, padding: '6px 12px', font: '700 12px Poppins, sans-serif', cursor: 'pointer' }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
