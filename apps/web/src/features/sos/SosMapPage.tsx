import { useActiveSos, useResolveSos, useSosHotspot } from '../../api/realtime';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { card } from '../../components/ui/kit';
import { SosMap } from '../../components/ui/SosMap';
import { useT, type TFunc } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

function timeAgo(iso: string, t: TFunc): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('just now');
  if (mins < 60) return t('{n} min ago', { n: mins });
  return t('{h}h {m}m ago', { h: Math.floor(mins / 60), m: mins % 60 });
}

/** Staff live SOS map (FR-8.3/8.4) — pins arrive over the socket within seconds. */
export function SosMapPage() {
  const { data: alerts } = useActiveSos();
  const { data: hotspot } = useSosHotspot();
  const resolve = useResolveSos();
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();

  const onResolve = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: t('Resolve SOS'),
      message: t("Mark {name}'s alert as attended? The resident is notified and the action is logged.", { name }),
      confirmText: t('Resolve'),
      tone: 'primary',
    });
    if (!ok) return;
    try {
      await resolve.mutateAsync(id);
      toast(t("✅ {name}'s SOS resolved — all clear.", { name }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not resolve — try again.'));
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
  const heat = (hotspot ?? []).map((p) => ({ lat: p.lat, lng: p.lng }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '360px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, padding: '16px 18px', background: list.length ? '#FEF5F4' : undefined, boxShadow: list.length ? 'inset 3px 0 0 #D64541' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: list.length ? '#D64541' : '#27AE60', flexShrink: 0 }} />
            <h2 style={{ margin: 0, font: '700 15px Poppins, sans-serif', color: list.length ? '#C0392B' : '#1E3A5F' }}>
              {list.length
                ? t(list.length > 1 ? '{n} Active SOS Alerts' : '{n} Active SOS Alert', { n: list.length })
                : t('All clear')}
            </h2>
          </div>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '6px 0 0' }}>
            {list.length
              ? t('Respond, then mark resolved — the resident is notified and the action is audited.')
              : t('No active emergencies. New alerts appear here live.')}
          </p>
        </div>

        {list.map((a) => (
          <div key={a.id} style={{ ...card, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ font: '700 14.5px Poppins, sans-serif', color: '#1E3A5F' }}>{a.residentName}</strong>
              <span style={{ fontSize: 11.5, color: '#C0392B', fontWeight: 700 }}>{t('ACTIVE')} · {timeAgo(a.createdAt, t)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.5 }}>
              <span>{a.address ?? t('Address on file: none')}</span>
              <span>{a.phone ?? t('No phone on record')}</span>
              <span>
                {a.lat !== null ? `${a.lat.toFixed(5)}, ${a.lng?.toFixed(5)} · ±${a.accuracy ?? '—'} m` : t('No GPS fix — call the resident')}
              </span>
            </div>
            <button
              onClick={() => onResolve(a.id, a.residentName)}
              style={{ marginTop: 12, background: 'none', color: '#1F8B4C', border: '1.5px solid #BFE3CD', borderRadius: 8, padding: '8px 14px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
            >
              {t('Mark Resolved')}
            </button>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 16 }}>
        <SosMap height={isMobile ? 300 : 520} pins={pins} heat={heat} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '10px 4px 0' }}>
          <p style={{ fontSize: 12, color: '#8A97AB', margin: 0 }}>
            {t('Live map — pins update in realtime as residents trigger or cancel alerts.')}
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#8A97AB' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(214,69,65,.35)', boxShadow: '0 0 0 4px rgba(214,69,65,.15)' }} />
            {t('Incident hotspots ({n})', { n: heat.length })}
          </span>
        </div>
      </div>
    </div>
  );
}
