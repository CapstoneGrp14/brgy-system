import { useState } from 'react';
import { useAddDocType, useAllDocTypes, useToggleDocType } from '../../api/verification';
import { btnBusy, btnPrimary, card, input, label, pill } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

/** Admin: which supporting documents residents may submit for verification. */
export function VerificationSettingsPage() {
  const { data: docTypes } = useAllDocTypes();
  const add = useAddDocType();
  const toggle = useToggleDocType();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const [labelText, setLabelText] = useState('');

  const submit = async () => {
    if (!labelText.trim()) {
      toast(t('Type the document name first.'));
      return;
    }
    try {
      await add.mutateAsync(labelText.trim());
      toast(t('📋 "{name}" added to accepted documents.', { name: labelText.trim() }));
      setLabelText('');
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not add the document type.'));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.9fr 1.1fr', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '26px 28px' }}>
        <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Accepted Supporting Documents')}
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
          {t('Residents pick from this list when uploading their identity documents for verification. Disable a type to stop accepting it (existing submissions are unaffected).')}
        </p>
        <label style={label}>{t('Add Document Type')}</label>
        <input
          style={{ ...input, marginBottom: 14 }}
          placeholder={t("e.g., Postal ID, Driver's License…")}
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} style={add.isPending ? btnBusy : btnPrimary}>
          {add.isPending ? t('Adding…') : t('Add Document Type')}
        </button>
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>
          {t('Document Types')}
        </h3>
        {(docTypes ?? []).map((dt) => (
          <div key={dt.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: dt.isActive ? '#2E3A52' : '#9AA6B7' }}>
                {t(dt.labelText)} {dt.isActive ? <span style={{ ...pill('green'), marginLeft: 6 }}>{t('Active')}</span> : <span style={{ ...pill('gray'), marginLeft: 6 }}>{t('Disabled')}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 2 }}>{t('Added by {name}', { name: dt.createdBy ?? '' })}</div>
            </div>
            <button
              onClick={() =>
                toggle
                  .mutateAsync(dt.id)
                  .then(() => toast(dt.isActive ? t('🚫 "{name}" disabled.', { name: dt.labelText }) : t('✅ "{name}" enabled.', { name: dt.labelText })))
                  .catch((err: any) => toast(err?.response?.data?.message ?? t('Could not update.')))
              }
              style={{ background: 'none', border: 'none', color: dt.isActive ? '#C0392B' : '#1F8B4C', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {dt.isActive ? t('Disable') : t('Enable')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
