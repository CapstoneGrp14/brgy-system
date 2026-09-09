import { useEffect } from 'react';
import { create } from 'zustand';
import { useT } from '../../i18n';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Danger styles the confirm button red; warn styles it gold. */
  tone?: 'danger' | 'warn' | 'primary';
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((ok: boolean) => void) | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: { title: '', message: '' },
  resolve: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      // Settle any dialog already showing as cancelled.
      get().resolve?.(false);
      set({ open: true, options, resolve });
    }),
  settle: (ok) => {
    get().resolve?.(ok);
    set({ open: false, resolve: null });
  },
}));

/** Imperative themed confirm — `if (await confirmDialog({...})) …` replaces window.confirm. */
export const confirmDialog = (options: ConfirmOptions) => useConfirmStore.getState().ask(options);

const TONE_STYLES = {
  danger: { background: '#C0392B', color: '#fff' },
  warn: { background: '#F5A81C', color: '#16324F' },
  primary: { background: '#1E3A5F', color: '#fff' },
} as const;

/** Mounted once in the app shell; renders the active confirm dialog. */
export function ConfirmDialogHost() {
  const { open, options, settle } = useConfirmStore();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
      if (e.key === 'Enter') settle(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, settle]);

  if (!open) return null;
  const tone = TONE_STYLES[options.tone ?? 'primary'];

  return (
    <div
      onClick={() => settle(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,22,40,.55)',
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        animation: 'fadeIn .12s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        style={{
          width: 'min(440px, 94vw)',
          background: '#fff',
          borderRadius: 14,
          padding: '26px 28px',
          boxShadow: '0 24px 70px rgba(0,0,0,.3)',
          animation: 'toastUp .16s ease',
        }}
      >
        <h3 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>
          {options.title}
        </h3>
        <p style={{ fontSize: 14, color: '#4A5A74', lineHeight: 1.6, margin: '10px 0 22px' }}>
          {options.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={() => settle(false)}
            style={{
              background: '#fff',
              color: '#33415E',
              border: '1.5px solid #DFE5EE',
              borderRadius: 9,
              padding: '10px 18px',
              font: '700 13.5px Poppins, sans-serif',
              cursor: 'pointer',
            }}
          >
            {options.cancelText ?? t('Cancel')}
          </button>
          <button
            autoFocus
            onClick={() => settle(true)}
            style={{
              ...tone,
              border: 'none',
              borderRadius: 9,
              padding: '10px 18px',
              font: '700 13.5px Poppins, sans-serif',
              cursor: 'pointer',
            }}
          >
            {options.confirmText ?? t('Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
