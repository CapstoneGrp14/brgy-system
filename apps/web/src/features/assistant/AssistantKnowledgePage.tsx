import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { btnBusy, btnPrimary, card, cols, tableFixed, td, th } from '../../components/ui/kit';
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

/** Admin: grounding knowledge for the 591 Assistant — .md files stored in MinIO. */
export function AssistantKnowledgePage() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

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
      toast(`🤖 ${file.name} added — the assistant now answers from it.`);
      setFile(null);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Upload failed — .md or .txt only, max 200 KB.');
    }
  };

  const doDelete = async (name: string) => {
    const ok = await confirmDialog({
      title: 'Remove Knowledge File',
      message: `Remove "${name}"? The assistant stops using it immediately${(files?.length ?? 0) <= 1 ? ' and falls back to the built-in service guide' : ''}.`,
      confirmText: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(name);
      toast(`🗑️ ${name} removed.`);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Could not remove the file.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
      <div style={{ ...card, padding: '24px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>🤖 Assistant Knowledge</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 16px', lineHeight: 1.6 }}>
          The 591 Assistant answers <strong>only</strong> from these Markdown files (plus the live Citizen's
          Charter). Upload service guides, FAQs, schedules — anything public residents may ask about.
          Changes apply within a minute, no restart needed. If no files are uploaded, the built-in service
          guide is used. <strong>Never include resident data</strong> — everything here can be quoted to any resident.
        </p>
        <FileDropzone
          file={file}
          onFile={setFile}
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          hint="Markdown (.md) or text (.txt) · max 200 KB per file"
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
          {upload.isPending ? 'Uploading…' : '⬆ Add to Knowledge Base'}
        </button>
      </div>

      <div style={{ ...card, padding: '22px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          Knowledge Files {files && files.length > 0 && `(${files.length})`}
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
                <th style={th}>FILE</th>
                <th style={th}>SIZE</th>
                <th style={th}>UPDATED</th>
                <th style={th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(files ?? []).length === 0 && (
                <tr>
                  <td style={{ ...td, color: '#8A97AB' }} colSpan={4}>
                    No files yet — the assistant is using the built-in service guide.
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
                        View
                      </a>
                      <button onClick={() => doDelete(f.name)} style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                        Remove
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
