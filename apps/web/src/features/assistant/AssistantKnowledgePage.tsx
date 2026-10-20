import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { btnBusy, btnPrimary, card, cols, input, label, tableFixed, td, th } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

interface KbFile {
  name: string;
  size: number;
  updatedAt: string;
  url: string;
}

const fmtSize = (b: number) => (b >= 1024 ? `${Math.ceil(b / 1024)} KB` : `${b} B`);
const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });


/** One question/answer pair the composer turns into a Markdown section. */
interface Entry {
  question: string;
  answer: string;
}

/**
 * Compose Markdown from form entries.
 *
 * Panel feedback was that the barangay secretary is not technical and should
 * not be editing Markdown by hand. Staff fill in a topic and a set of
 * question/answer pairs; this produces the file the assistant actually reads,
 * so the stored knowledge stays plain reviewable text.
 */
function composeMarkdown(topic: string, entries: Entry[]): string {
  const body = entries
    .filter((e) => e.question.trim() && e.answer.trim())
    .map((e) => `## ${e.question.trim()}\n\n${e.answer.trim()}\n`)
    .join('\n');
  return `# ${topic.trim()}\n\n${body}`;
}

/** Safe, lowercase file name derived from the topic. */
function fileNameFor(topic: string): string {
  const slug = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'knowledge'}.md`;
}

/** Admin: grounding knowledge for the 591 Assistant — .md files stored in MinIO. */
export function AssistantKnowledgePage() {
  const t = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'guided' | 'upload'>('guided');
  const [topic, setTopic] = useState('');
  const [entries, setEntries] = useState<Entry[]>([{ question: '', answer: '' }]);
  const [preview, setPreview] = useState(false);

  const filled = entries.filter((e) => e.question.trim() && e.answer.trim());
  const canPublish = topic.trim().length >= 3 && filled.length > 0;
  const markdown = composeMarkdown(topic, entries);

  const setEntry = (i: number, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const publishGuided = async () => {
    if (!canPublish || upload.isPending) return;
    const name = fileNameFor(topic);
    try {
      // Same endpoint as a manual upload — the composer only removes the need
      // to author the file by hand, it does not bypass the review path.
      await upload.mutateAsync(new File([markdown], name, { type: 'text/markdown' }));
      toast(t('🤖 {name} published — the assistant now answers from it.', { name }));
      setTopic('');
      setEntries([{ question: '', answer: '' }]);
      setPreview(false);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not publish — check the content and try again.'));
    }
  };

  const { data: files } = useQuery({
    queryKey: ['assistant-kb'],
    queryFn: async () => (await api.get<KbFile[]>('/assistant/kb')).data,
  });

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('file', f);
      return (await api.post('/assistant/kb', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assistant-kb'] }),
  });

  const remove = useMutation({
    mutationFn: async (name: string) => (await api.delete(`/assistant/kb/${encodeURIComponent(name)}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assistant-kb'] }),
  });

  const doUpload = async () => {
    if (!file || upload.isPending) return;
    try {
      await upload.mutateAsync(file);
      toast(t('🤖 {name} added — the assistant now answers from it.', { name: file.name }));
      setFile(null);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Upload failed — .md or .txt only, max 200 KB.'));
    }
  };

  const doDelete = async (name: string) => {
    const ok = await confirmDialog({
      title: t('Remove Knowledge File'),
      message:
        (files?.length ?? 0) <= 1
          ? t('Remove "{name}"? The assistant stops using it immediately and falls back to the built-in service guide.', { name })
          : t('Remove "{name}"? The assistant stops using it immediately.', { name }),
      confirmText: t('Remove'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(name);
      toast(t('🗑️ {name} removed.', { name }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not remove the file.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
      <div style={{ ...card, padding: '24px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('🤖 Assistant Knowledge')}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 16px', lineHeight: 1.6 }}>
          {t('The 591 Assistant answers')} <strong>{t('only')}</strong>{' '}
          {t("from these Markdown files (plus the live Citizen's Charter). Upload service guides, FAQs, schedules — anything public residents may ask about. Changes apply within a minute, no restart needed. If no files are uploaded, the built-in service guide is used.")}{' '}
          <strong>{t('Never include resident data')}</strong>{' '}
          {t('— everything here can be quoted to any resident.')}
        </p>
        {/* Two ways in. "Write it here" is the default because staff should not
            need to know Markdown; the file upload stays for anyone who already
            has a prepared document. */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #E8EDF4' }}>
          {([['guided', 'Write it here'], ['upload', 'Upload a file']] as const).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              style={{
                padding: '9px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                font: '700 13.5px Poppins, sans-serif',
                color: mode === id ? '#1E3A5F' : '#8A97AB',
                borderBottom: `2.5px solid ${mode === id ? '#F5A81C' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t(lbl)}
            </button>
          ))}
        </div>

        {mode === 'guided' ? (
          <>
            <label style={label} htmlFor="kb-topic">{t('What is this about?')}</label>
            <input
              id="kb-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('e.g. Barangay Clearance')}
              style={{ ...input, marginBottom: 18 }}
            />

            {entries.map((e, i) => (
              <div key={i} style={{ border: '1px solid #E8EDF4', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: '#FBFCFE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ font: '700 11.5px Poppins, sans-serif', letterSpacing: '.06em', color: '#8A97AB' }}>
                    {t('QUESTION {n}', { n: i + 1 })}
                  </span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => setEntries((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', color: '#C0392B', font: '700 12px Poppins, sans-serif', cursor: 'pointer' }}
                    >
                      {t('Remove')}
                    </button>
                  )}
                </div>
                <input
                  value={e.question}
                  onChange={(ev) => setEntry(i, { question: ev.target.value })}
                  placeholder={t('What might a resident ask? e.g. How much does it cost?')}
                  style={{ ...input, marginBottom: 8 }}
                />
                <textarea
                  value={e.answer}
                  onChange={(ev) => setEntry(i, { answer: ev.target.value })}
                  rows={3}
                  placeholder={t('The answer in plain words. e.g. It is free. Bring one valid ID.')}
                  style={{ ...input, minHeight: 78, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}
                />
              </div>
            ))}

            <button
              onClick={() => setEntries((prev) => [...prev, { question: '', answer: '' }])}
              style={{ background: 'none', border: '1.5px dashed #CBD6E4', borderRadius: 9, padding: '10px 16px', color: '#2E66D0', font: '700 13px Poppins, sans-serif', cursor: 'pointer', width: '100%' }}
            >
              {t('+ Add another question')}
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 16 }}>
              <button
                onClick={publishGuided}
                disabled={!canPublish || upload.isPending}
                style={
                  upload.isPending
                    ? { ...btnBusy, width: 'auto', padding: '10px 20px' }
                    : { ...btnPrimary, width: 'auto', padding: '10px 20px', ...(canPublish ? {} : { background: '#DFE5EE', color: '#9AA6B7', cursor: 'not-allowed', boxShadow: 'none' }) }
                }
              >
                {upload.isPending ? t('Publishing…') : t('Publish to Assistant')}
              </button>
              {canPublish && (
                <button
                  onClick={() => setPreview((v) => !v)}
                  style={{ background: 'none', border: 'none', color: '#2E66D0', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}
                >
                  {preview ? t('Hide preview') : t('Preview what gets saved')}
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#8A97AB' }}>
                {canPublish
                  ? t('Saves as {name}', { name: fileNameFor(topic) })
                  : t('Add a topic and at least one question')}
              </span>
            </div>

            {preview && canPublish && (
              <pre style={{ marginTop: 14, padding: '14px 16px', background: '#F7F9FC', border: '1px solid #E8EDF4', borderRadius: 9, fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#2E3A52' }}>
                {markdown}
              </pre>
            )}
          </>
        ) : (
          <>
            <FileDropzone
              file={file}
              onFile={setFile}
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              hint={t('Markdown (.md) or text (.txt) · max 200 KB per file')}
            />
            <button
              onClick={doUpload}
              disabled={!file}
              style={
                upload.isPending
                  ? { ...btnBusy, width: 'auto', padding: '10px 20px', marginTop: 12 }
                  : { ...btnPrimary, width: 'auto', padding: '10px 20px', marginTop: 12, ...(file ? {} : { background: '#DFE5EE', color: '#9AA6B7', cursor: 'not-allowed' }) }
              }
            >
              {upload.isPending ? t('Uploading…') : t('⬆ Add to Knowledge Base')}
            </button>
          </>
        )}
      </div>

      <div style={{ ...card, padding: '22px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Knowledge Files')} {files && files.length > 0 && `(${files.length})`}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableFixed(560)}>
            <colgroup>
              {cols('40%', '14%', '24%', '22%').map((c) => (
                <col key={c.key} style={c.style} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={th}>{t('FILE')}</th>
                <th style={th}>{t('SIZE')}</th>
                <th style={th}>{t('UPDATED')}</th>
                <th style={th}>{t('ACTIONS')}</th>
              </tr>
            </thead>
            <tbody>
              {(files ?? []).length === 0 && (
                <tr>
                  <td style={{ ...td, color: '#8A97AB' }} colSpan={4}>
                    {t('No files yet — the assistant is using the built-in service guide.')}
                  </td>
                </tr>
              )}
              {(files ?? []).map((f) => (
                <tr key={f.name}>
                  <td style={{ ...td, fontWeight: 700 }}>📄 {f.name}</td>
                  <td style={td}>{fmtSize(f.size)}</td>
                  <td style={td}>{fmtStamp(f.updatedAt)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ color: '#2E66D0', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                        {t('View')}
                      </a>
                      <button onClick={() => doDelete(f.name)} style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                        {t('Remove')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
