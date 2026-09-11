import { useEffect, type ReactNode } from 'react';

/** Themed modal shell — backdrop, card, title bar with close. */
export function Modal({
  title,
  onClose,
  children,
  width = 560,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,22,40,.55)',
        zIndex: 150,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        animation: 'fadeIn .12s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: `min(${width}px, 94vw)`,
          maxHeight: '86vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 24px 70px rgba(0,0,0,.3)',
          animation: 'toastUp .16s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '18px 24px',
            borderBottom: '1px solid #EDF0F5',
            position: 'sticky',
            top: 0,
            background: '#fff',
            borderRadius: '14px 14px 0 0',
          }}
        >
          <h3 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F', minWidth: 0, lineHeight: 1.35, overflowWrap: 'break-word' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: '#F4F6FA', border: '1px solid #E3E8F0', borderRadius: 8, width: 30, height: 30, flexShrink: 0, cursor: 'pointer', color: '#64748B', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

/** Label/value row used inside detail modals. */
export function DetailRow({ labelText, children }: { labelText: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#7E8CA3', marginBottom: 4 }}>
        {labelText.toUpperCase()}
      </div>
      <div style={{ fontSize: 14, color: '#2E3A52', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}
