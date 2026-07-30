import { useUiStore } from '../../stores/ui';

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: '#1E3A5F',
            color: '#fff',
            padding: '11px 20px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 600,
            boxShadow: '0 8px 22px rgba(23,43,77,.3)',
            animation: 'toastUp .22s ease',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
