import { Role, SlaClass } from '@brgy/shared';
import { useEffect, useState } from 'react';
import {
  useActivateTemplate,
  useAddDocumentType,
  useDeleteTemplate,
  useSetReleaseMode,
  useTemplates,
  useToggleDocumentType,
  useUploadTemplate,
} from '../../api/templates';
import { btnBusy, btnPrimary, card, input, label, pill } from '../../components/ui/kit';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { Select } from '../../components/ui/Select';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

const SLA_OPTIONS = [
  { value: SlaClass.SIMPLE_3, labelText: 'Simple — 3 working days' },
  { value: SlaClass.COMPLEX_7, labelText: 'Complex — 7 working days' },
  { value: SlaClass.TECHNICAL_20, labelText: 'Highly Technical — 20 working days' },
];

export function TemplatesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;
  const { data } = useTemplates();
  const upload = useUploadTemplate();
  const activate = useActivateTemplate();
  const remove = useDeleteTemplate();
  const setMode = useSetReleaseMode();
  const addType = useAddDocumentType();
  const toggleType = useToggleDocumentType();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();

  const typeLabel = (key: string) =>
    data?.releaseModes.find((m) => m.documentType === key)?.labelText ?? key;

  const [documentType, setDocumentType] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocSla, setNewDocSla] = useState<string>(SlaClass.SIMPLE_3);
  const [newDocMode, setNewDocMode] = useState<'DIGITAL' | 'PICKUP'>('PICKUP');

  useEffect(() => {
    if (!documentType && data?.releaseModes.length) setDocumentType(data.releaseModes[0].documentType);
  }, [data, documentType]);

  const addDocType = async () => {
    if (addType.isPending) return;
    if (newDocLabel.trim().length < 4) return toast(t('Give the new document a descriptive name.'));
    try {
      const created = await addType.mutateAsync({ labelText: newDocLabel.trim(), slaClass: newDocSla, releaseMode: newDocMode });
      toast(t('📄 "{label}" added — residents can request it now.', { label: created.labelText }));
      setNewDocLabel('');
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not add the document type.'));
    }
  };

  const submit = async () => {
    if (!file) {
      toast(t('Attach a .docx template file first.'));
      return;
    }
    try {
      await upload.mutateAsync({ documentType, name, file });
      toast(t('📁 Template uploaded — now active for {label}.', { label: t(typeLabel(documentType)) }));
      setName('');
      setFile(null);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Upload failed — is it a .docx file?'));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.9fr 1.1fr', gap: 22, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ ...card, padding: '24px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>{t('➕ Add Document Type')}</h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '6px 0 14px' }}>
          {t('Offer a new document residents can request — it appears on the resident form immediately.')}
        </p>
        <label style={label}>{t('Document Name')}</label>
        <input
          style={{ ...input, marginBottom: 12 }}
          placeholder={t('e.g. Barangay ID, Solo Parent Certification')}
          value={newDocLabel}
          onChange={(e) => setNewDocLabel(e.target.value)}
        />
        <label style={label}>{t('ARTA Processing Class')}</label>
        <Select value={newDocSla} onChange={setNewDocSla} options={SLA_OPTIONS.map((o) => ({ ...o, labelText: t(o.labelText) }))} style={{ marginBottom: 12 }} />
        <label style={label}>{t('Release Mode')}</label>
        <Select
          value={newDocMode}
          onChange={(v) => setNewDocMode(v as 'DIGITAL' | 'PICKUP')}
          options={[
            { value: 'PICKUP', labelText: t('🏛 Pickup at Hall (sealed & signed)') },
            { value: 'DIGITAL', labelText: t('⬇ Digital Download') },
          ]}
          style={{ marginBottom: 14 }}
        />
        <button onClick={addDocType} style={addType.isPending ? { ...btnBusy, width: 'auto', padding: '10px 18px' } : { ...btnPrimary, width: 'auto', padding: '10px 18px' }}>
          {addType.isPending ? t('Adding…') : t('Add Document Type')}
        </button>
      </div>

      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Upload Template')}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          {t("Upload the barangay's official Word (.docx) layout per document type. Newly uploaded templates become active immediately; issued documents are generated from the active template.")}
        </p>

        <label style={label}>{t('Document Type')}</label>
        <Select
          value={documentType}
          onChange={setDocumentType}
          options={(data?.releaseModes ?? []).filter((m) => m.isActive).map((m) => ({ value: m.documentType, labelText: t(m.labelText) }))}
          style={{ marginBottom: 14 }}
        />

        <label style={label}>{t('Template Name (optional)')}</label>
        <input
          style={{ ...input, marginBottom: 14 }}
          placeholder={t('e.g., Official Clearance letterhead v2')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label style={label}>{t('Template File (.docx)')}</label>
        <FileDropzone
          file={file}
          onFile={setFile}
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hint={t('Word (.docx) · max 5 MB')}
          style={{ marginBottom: 16 }}
        />

        <button onClick={submit} style={upload.isPending ? btnBusy : btnPrimary}>
          {upload.isPending ? t('Uploading…') : t('Upload & Activate')}
        </button>

        <div style={{ marginTop: 20, background: '#F4F7FB', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#33415E', marginBottom: 8 }}>
            {t('SUPPORTED PLACEHOLDERS')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(data?.placeholders ?? []).map((p) => (
              <code key={p} style={{ background: '#fff', border: '1px solid #DFE5EE', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#21409A' }}>
                {p}
              </code>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#8A97AB', margin: '10px 0 0' }}>
            {t("Put these anywhere in your Word file — they're replaced with the resident's details at issuance. Types without an active template use the built-in certificate layout.")}
          </p>
        </div>
      </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {isAdmin && (
      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 6px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Release Mode per Document Type')}
        </h3>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '0 0 14px' }}>
          <strong>{t('Pickup at Hall')}</strong>
          {t(" is for documents that carry the barangay's dry seal and wet signature — staff prints the generated PDF for signing, and the resident claims it in person (no download link). ")}
          <strong>{t('Digital')}</strong>
          {t(' documents are downloadable from the portal.')}
        </p>
        {(data?.releaseModes ?? []).map((m) => (
          <div key={m.documentType} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F0F3F8', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: m.isActive ? '#2E3A52' : '#9AA6B7' }}>
              {t(m.labelText)}
              {m.isCustom && <span style={{ ...pill(m.isActive ? 'blue' : 'gray'), marginLeft: 8 }}>{m.isActive ? t('Custom') : t('Disabled')}</span>}
              {m.isCustom && (
                <button
                  onClick={() => toggleType.mutateAsync(m.documentType).then(() => toast(m.isActive ? t('🚫 {label} disabled.', { label: t(m.labelText) }) : t('✅ {label} re-enabled.', { label: t(m.labelText) })))}
                  style={{ background: 'none', border: 'none', color: m.isActive ? '#C0392B' : '#1F8B4C', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginLeft: 8 }}
                >
                  {m.isActive ? t('Disable') : t('Enable')}
                </button>
              )}
            </span>
            <div style={{ display: 'flex', background: '#F1F4F9', borderRadius: 8, padding: 3 }}>
              {(['DIGITAL', 'PICKUP'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() =>
                    m.releaseMode !== mode &&
                    setMode
                      .mutateAsync({ documentType: m.documentType, releaseMode: mode })
                      .then(() => toast(t('⚙️ {label} → {mode}', { label: t(m.labelText), mode: mode === 'PICKUP' ? t('Pickup at Hall') : t('Digital Download') })))
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    font: '700 12px Poppins, sans-serif',
                    cursor: 'pointer',
                    background: m.releaseMode === mode ? (mode === 'PICKUP' ? '#C96A11' : '#1E3A5F') : 'transparent',
                    color: m.releaseMode === mode ? '#fff' : '#64748B',
                  }}
                >
                  {mode === 'PICKUP' ? t('🏛 Pickup at Hall') : t('⬇ Digital')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 14px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Uploaded Templates')}
        </h3>
        {(data?.items ?? []).length === 0 && (
          <p style={{ fontSize: 13.5, color: '#8A97AB' }}>
            {t('No templates yet — all documents currently use the built-in certificate layout.')}
          </p>
        )}
        {(data?.items ?? []).map((tpl) => (
          <div key={tpl.id} style={{ padding: '13px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3A52' }}>
                {tpl.name} {tpl.isActive && <span style={{ ...pill('green'), marginLeft: 6 }}>{t('ACTIVE')}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#8A97AB', marginTop: 3 }}>
                {t(typeLabel(tpl.documentType))} · {tpl.originalFilename} · {t('by {name}', { name: tpl.uploadedBy })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              {!tpl.isActive && (
                <button
                  onClick={() => activate.mutateAsync(tpl.id).then(() => toast(t('✅ Template activated.')))}
                  style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {t('Activate')}
                </button>
              )}
              <button
                onClick={() => remove.mutateAsync(tpl.id).then(() => toast(t('🗑 Template deleted.')))}
                style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {t('Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
