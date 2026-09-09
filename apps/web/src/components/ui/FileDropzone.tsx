import { useRef, useState, type CSSProperties } from 'react';
import { useT } from '../../i18n';

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

const fileIcon = (mime: string) =>
  mime === 'application/pdf' ? '📄' : mime.startsWith('image/') ? '🖼️' : '📎';

/**
 * Themed drag-and-drop file picker — replaces native file inputs so upload
 * surfaces match the design system.
 */
export function FileDropzone({
  file,
  onFile,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  hint,
  disabled = false,
  style,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const t = useT();
  const hintText = hint ?? t('JPG, PNG, WebP, or PDF · max 8 MB');

  const pick = (f: File | undefined) => {
    if (f) onFile(f);
  };

  if (file) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1.5px solid #BFE6CE',
          background: '#F2FBF5',
          borderRadius: 10,
          padding: '13px 16px',
          ...style,
        }}
      >
        <span style={{ fontSize: 24 }}>{fileIcon(file.type)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1F8B4C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{fmtSize(file.size)} · {t('ready to submit')}</div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
          >
            {t('✕ Remove')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) pick(e.dataTransfer.files?.[0]);
      }}
      style={{
        border: `2px dashed ${dragOver ? '#2E66D0' : '#C5D0E0'}`,
        background: dragOver ? '#EAF1FC' : '#F8FAFD',
        borderRadius: 12,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color .15s, background .15s',
        ...style,
      }}
    >
      <div style={{ fontSize: 30 }}>📤</div>
      <div style={{ font: '700 14px Poppins, sans-serif', color: '#1E3A5F', marginTop: 8 }}>
        {dragOver ? t('Drop your file here') : t('Drag & drop your file here')}
      </div>
      <div style={{ fontSize: 12.5, color: '#8A97AB', marginTop: 4 }}>
        {t('or')} <span style={{ color: '#2E66D0', fontWeight: 700 }}>{t('browse from your device')}</span> · {hintText}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
