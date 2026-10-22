import { VERIFICATION_DOC_TYPES, type OcrBreakdown } from '@brgy/shared';
import { useState } from 'react';
import { useDecideVerification, useVerificationQueue } from '../../api/verification';
import { btnBusy, btnPrimary, card, cols, errorText, input, label, pill, tableFixed, td, th } from '../../components/ui/kit';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Pagination, TableToolbar } from '../../components/ui/TableToolbar';
import { fmtDateLong } from '../../components/ui/status';
import { useTableView } from '../../hooks/useTableView';
import { useT, type TFunc } from '../../i18n';
import { useUiStore } from '../../stores/ui';

/** A rejection reason is emailed to the resident, so it must actually explain
 *  the problem; an approval comment only has to exist for the audit trail. */
const REJECT_NOTE_MIN = 10;
const APPROVE_NOTE_MIN = 3;

/** Submissions store the label directly now; legacy rows stored enum-style keys. */
const docLabel = (t: TFunc, value: string) =>
  t(VERIFICATION_DOC_TYPES.find((d) => d.key === value)?.labelText ?? value);

/**
 * Per-field checklist behind the score. The blended number used to hide what it
 * was built from — a name-only document read as 80% — so staff can now see
 * which fields the cross-check actually corroborated before deciding.
 */
function OcrChecklist({ breakdown, t }: { breakdown: OcrBreakdown; t: TFunc }) {
  return (
    <div style={{ marginTop: 8, background: '#F7F9FC', border: '1px solid #E6ECF4', borderRadius: 8, padding: '10px 12px' }}>
      {breakdown.fields.map((f) => (
        <div
          key={f.key}
          style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, lineHeight: 1.7, color: f.detected ? '#2E3A52' : '#8A97AB' }}
        >
          <span aria-hidden style={{ color: f.detected ? '#27AE60' : '#C7D0DC' }}>{f.detected ? '☑' : '☐'}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {t(f.labelText)}
            {f.required && (
              <span style={{ color: '#C0392B', fontWeight: 700 }} title={t('Required for a full match')}> *</span>
            )}
            {/* Shown when missed too: "2 of 3 name parts matched" is the cue to
                ask for a marriage certificate rather than reject outright. */}
            {f.found && <span style={{ color: '#8A97AB' }}> — {f.found}</span>}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: f.detected ? 700 : 400 }}>
            {f.detected ? `+${f.weight}` : `0/${f.weight}`}
          </span>
        </div>
      ))}
      {breakdown.missingRequired.length > 0 && (
        <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid #E6ECF4', fontSize: 11.5, color: '#C0392B', fontWeight: 600 }}>
          {t('A required field is missing — this cannot be a full match on OCR alone.')}
        </div>
      )}
    </div>
  );
}

function ocrPill(t: TFunc, verdict: string, score: number | null) {
  switch (verdict) {
    case 'MATCH':
      return <span style={pill('green')}>{t('✅ {score}% Match', { score: score ?? 0 })}</span>;
    case 'PARTIAL':
      return <span style={pill('yellow')}>{t('⚠ {score}% — details differ', { score: score ?? 0 })}</span>;
    case 'NO_MATCH':
      return <span style={pill('red')}>{t('❌ No Match ({score}%)', { score: score ?? 0 })}</span>;
    case 'MANUAL':
      return <span style={pill('gray')}>{t('📄 Manual review (PDF)')}</span>;
    case 'ERROR':
      return <span style={pill('orange')}>{t('⚠ OCR failed — review manually')}</span>;
    default:
      return <span style={pill('blue')}>{t('⏳ Running OCR…')}</span>;
  }
}

export function VerificationPage() {
  const { data } = useVerificationQueue();
  const decide = useDecideVerification();
  const toast = useUiStore((s) => s.toast);
  const t = useT();

  // Staff confirm in a dialog rather than deciding on a single click: verifying
  // the wrong resident unlocks every service for them, and rejecting without a
  // reason leaves the resident guessing what to re-upload.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; approve: boolean; name: string } | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const minLen = pending?.approve ? APPROVE_NOTE_MIN : REJECT_NOTE_MIN;

  // The queue keeps the last 30 decisions alongside what is still pending, so
  // the default view is "awaiting review" — otherwise yesterday's approvals
  // crowd out the work. Verdict filtering matters separately: a reviewer who
  // only has ten minutes takes the clean matches first.
  const [stage, setStage] = useState('PENDING');
  const [verdict, setVerdict] = useState('all');
  const view = useTableView(
    data?.items,
    (s) => `${s.residentName} ${s.docType} ${s.fileName}`,
    {
      resetKey: `${stage}|${verdict}`,
      filters: [
        stage !== 'all' && ((s) => s.status === stage),
        verdict === 'match' && ((s) => s.ocrVerdict === 'MATCH'),
        verdict === 'needs-eyes' && ((s) => s.ocrVerdict === 'PARTIAL' || s.ocrVerdict === 'NO_MATCH'),
        verdict === 'unread' && ((s) => s.ocrVerdict === 'MANUAL' || s.ocrVerdict === 'ERROR'),
        verdict === 'marriage' && ((s) => s.surnameChangedByMarriage),
      ],
    },
  );

  const closeDialog = () => {
    setPending(null);
    setNote('');
    setNoteError('');
  };

  const confirmDecision = async () => {
    if (!pending || decide.isPending) return;
    const trimmed = note.trim();
    if (trimmed.length < minLen) {
      setNoteError(
        pending.approve
          ? t('Add a short comment for the audit log.')
          : t('Explain what is wrong — the resident is shown this reason so they know what to fix.'),
      );
      return;
    }
    try {
      await decide.mutateAsync({ id: pending.id, approve: pending.approve, note: trimmed });
      toast(
        pending.approve
          ? t('✅ {name} is now a verified resident.', { name: pending.name })
          : t("❌ {name}'s submission rejected.", { name: pending.name }),
      );
      closeDialog();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setNoteError(Array.isArray(msg) ? msg[0] : (msg ?? t('Action failed.')));
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
        {t('Verification Audit & Approval')}
      </h2>
      <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
        {t('OCR extracts info and cross-checks against the Census database. Final approval is manual.')}
        {data && data.pendingCount > 0 && ` · ${t('{n} awaiting review', { n: data.pendingCount })}`}
      </p>

      <TableToolbar view={view} placeholder={t('Search resident or document…')}>
        <Select
          value={stage}
          onChange={setStage}
          compact
          options={[
            { value: 'PENDING', labelText: t('Awaiting review') },
            { value: 'APPROVED', labelText: t('Approved') },
            { value: 'REJECTED', labelText: t('Rejected') },
            { value: 'all', labelText: t('All submissions') },
          ]}
          style={{ width: 170 }}
        />
        <Select
          value={verdict}
          onChange={setVerdict}
          compact
          options={[
            { value: 'all', labelText: t('Any OCR result') },
            { value: 'match', labelText: t('Clean match') },
            { value: 'needs-eyes', labelText: t('Partial or no match') },
            { value: 'unread', labelText: t('Could not be read') },
            { value: 'marriage', labelText: t('Surname changed by marriage') },
          ]}
          style={{ width: 210 }}
        />
      </TableToolbar>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(760)}>
          <colgroup>
            {cols('18%', '28%', '22%', '13%', '19%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>{t('RESIDENT SIGN-UP')}</th>
              <th style={th}>{t('UPLOADED DOCUMENT')}</th>
              <th style={th}>{t('OCR STATUS (CENSUS CROSS-CHECK)')}</th>
              <th style={th}>{t('DATE SUBMITTED')}</th>
              <th style={th}>{t('STAFF ACTION')}</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.length === 0 && (
              <tr>
                <td style={{ ...td, color: '#8A97AB' }} colSpan={5}>
                  {view.total === 0
                    ? t('No verification submissions yet.')
                    : t('No submissions match this search or filter.')}
                </td>
              </tr>
            )}
            {view.rows.map((s) => (
              <tr key={s.id}>
                <td style={{ ...td, fontWeight: 700 }}>{s.residentName}</td>
                <td style={td}>
                  <a href={s.fileUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                    {s.fileName}
                  </a>
                  <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 2 }}>{docLabel(t, s.docType)}</div>
                  {/* The declaration is why a surname mismatch was tolerated,
                      so it is stated on the row rather than left for staff to
                      infer from the checklist note. */}
                  {s.surnameChangedByMarriage && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #E4EAF3' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#C96A11' }}>
                        {t('Surname changed by marriage')}
                      </div>
                      {s.supportingFileUrl ? (
                        <a
                          href={s.supportingFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, fontWeight: 600 }}
                        >
                          {s.supportingFileName ?? t('Marriage certificate')}
                        </a>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#8A97AB' }}>
                          {t('No certificate attached')}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td style={td}>
                  {ocrPill(t, s.ocrVerdict, s.matchScore)}
                  {s.ocrBreakdown && (
                    <>
                      <button
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                        aria-expanded={expanded === s.id}
                        style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', padding: 0, font: '600 11.5px Poppins, sans-serif', color: '#1E3A5F', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {expanded === s.id ? t('Hide OCR details') : t('Show more OCR information')}
                      </button>
                      {expanded === s.id && <OcrChecklist breakdown={s.ocrBreakdown} t={t} />}
                    </>
                  )}
                </td>
                <td style={td}>{fmtDateLong(s.createdAt)}</td>
                <td style={td}>
                  {s.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setPending({ id: s.id, approve: true, name: s.residentName })}
                        disabled={decide.isPending}
                        style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                      >
                        {t('Approve')}
                      </button>
                      <button
                        onClick={() => setPending({ id: s.id, approve: false, name: s.residentName })}
                        disabled={decide.isPending}
                        style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #E8B4AE', borderRadius: 7, padding: '7px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
                      >
                        {t('Reject')}
                      </button>
                    </div>
                  ) : (
                    <span style={pill(s.status === 'APPROVED' ? 'green' : 'red')}>
                      {s.status === 'APPROVED' ? t('Approved ✓') : t('Rejected ✕')}
                      {s.decidedBy ? ` · ${s.decidedBy.split(' ')[0]}` : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination view={view} />

      {pending && (
        <Modal
          title={
            pending.approve
              ? t('Verify {name}?', { name: pending.name })
              : t('Reject {name}’s submission?', { name: pending.name })
          }
          onClose={closeDialog}
          width={520}
        >
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#5A6A80', lineHeight: 1.6 }}>
            {pending.approve
              ? t('This unlocks every portal service for this resident. Your name and comment are recorded in the audit log.')
              : t('The resident stays unverified and can upload again. Your reason is emailed to them and recorded in the audit log.')}
          </p>

          <label style={label} htmlFor="decision-note">
            {pending.approve ? t('Comment') : t('Reason for rejection')}
          </label>
          <textarea
            id="decision-note"
            value={note}
            autoFocus
            rows={3}
            maxLength={500}
            onChange={(e) => {
              setNote(e.target.value);
              if (noteError) setNoteError('');
            }}
            placeholder={
              pending.approve
                ? t('e.g. Name and address match the census record.')
                : t('e.g. The photo is too blurry to read the name — please upload a clearer copy.')
            }
            style={{ ...input, minHeight: 84, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '6px 0 18px' }}>
            <span style={{ fontSize: 11.5, color: noteError ? '#C0392B' : '#8A97AB' }}>
              {noteError || t('At least {n} characters.', { n: minLen })}
            </span>
            <span style={{ fontSize: 11.5, color: '#8A97AB' }}>{note.trim().length}/500</span>
          </div>
          {noteError && <div style={{ ...errorText, marginBottom: 14 }}>{noteError}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={closeDialog}
              disabled={decide.isPending}
              style={{ background: '#fff', color: '#5A6A80', border: '1.5px solid #E3E8F0', borderRadius: 8, padding: '10px 18px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}
            >
              {t('Cancel')}
            </button>
            <button
              onClick={confirmDecision}
              disabled={decide.isPending}
              style={{
                ...(decide.isPending ? btnBusy : btnPrimary),
                width: 'auto',
                padding: '10px 20px',
                background: decide.isPending ? undefined : pending.approve ? '#27AE60' : '#C0392B',
              }}
            >
              {decide.isPending
                ? t('Saving…')
                : pending.approve
                  ? t('Confirm & Verify')
                  : t('Confirm Rejection')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
