import { useActiveSos, useResolveSos } from '../../api/realtime';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { card, pill } from '../../components/ui/kit';
import { SosMap } from '../../components/ui/SosMap';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

/** Staff live SOS map (FR-8.3/8.4) — pins arrive over the socket within seconds. */
export function SosMapPage() {
  const { data: alerts } = useActiveSos();
  const resolve = useResolveSos();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();

  const onResolve = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: 'Resolve SOS',
      message: `Mark ${name}'s alert as attended? The resident is notified and the action is logged.`,
      confirmText: 'Resolve',
      tone: 'primary',
    });
    if (!ok) return;
    try {
      await resolve.mutateAsync(id);
      toast(`✅ ${name}'s SOS resolved — all clear.`);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Could not resolve — try again.');
    }
  };

  const list = alerts ?? [];
  const pins = list
    .filter((a) => a.lat !== null && a.lng !== null)
    .map((a) => ({
      id: a.id,
      lat: a.lat as number,
      lng: a.lng as number,
      labelText: `🆘 ${a.residentName}${a.address ? ` — ${a.address}` : ''}`,
    }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: 22, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, padding: '18px 20px', background: list.length ? '#FEF5F4' : undefined, boxShadow: list.length ? 'inset 4px 0 0 #D64541' : undefined }}>
          <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: list.length ? '#C0392B' : '#1E3A5F' }}>
            {list.length ? `🆘 ${list.length} Active SOS Alert${list.length > 1 ? 's' : ''}` : '✅ All clear'}
          </h2>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 0' }}>
            {list.length
              ? 'Respond, then mark resolved — the resident is notified and the action is audited.'
              : 'No active emergencies. New alerts appear here live.'}
          </p>
        </div>

        {list.map((a) => (
          <div key={a.id} style={{ ...card, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ font: '700 14.5px Poppins, sans-serif', color: '#1E3A5F' }}>{a.residentName}</strong>
              <span style={pill('red')}>ACTIVE · {timeAgo(a.createdAt)}</span>
            </div>
            <div style={{ fontSize: 13, color: '#2E3A52', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>🏠 {a.address ?? 'Address on file: none'}</span>
              <span>📞 {a.phone ?? 'No phone on record'}</span>
              <span>
                📍 {a.lat !== null ? `${a.lat.toFixed(5)}, ${a.lng?.toFixed(5)} (±${a.accuracy ?? '—'} m)` : 'No GPS fix — call the resident'}
              </span>
            </div>
            <button
              onClick={() => onResolve(a.id, a.residentName)}
              style={{ marginTop: 12, background: '#27AE60', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}
            >
              ✓ Mark Resolved
            </button>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 16 }}>
        <SosMap height={isMobile ? 300 : 520} pins={pins} />
        <p style={{ fontSize: 12, color: '#8A97AB', margin: '10px 4px 0' }}>
          Live map — pins update in realtime as residents trigger or cancel alerts.
        </p>
      </div>
    </div>
  );
}
