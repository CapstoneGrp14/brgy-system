import { useState } from 'react';
import { useCancelSos, useMySos, useTriggerSos } from '../../api/realtime';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { card } from '../../components/ui/kit';
import { SosMap } from '../../components/ui/SosMap';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

type Phase = 'idle' | 'sending';

/** Resident One-Tap SOS (FR-8). Works even before verification by design. */
export function SosPage() {
  const toast = useUiStore((s) => s.toast);
  const isMobile = useIsMobile();
  const t = useT();
  const { data: alert } = useMySos();
  const trigger = useTriggerSos();
  const cancel = useCancelSos();
  const [phase, setPhase] = useState<Phase>('idle');

  const fire = () => {
    if (phase === 'sending' || alert) return;
    setPhase('sending');
    const send = async (coords: { lat?: number; lng?: number; accuracy?: number }) => {
      try {
        await trigger.mutateAsync(coords);
        toast(t('🆘 Alert transmitted — the barangay duty officer has been notified.'));
      } catch (err: any) {
        toast(err?.response?.data?.message ?? t('Could not send the alert — try again.'));
      } finally {
        setPhase('idle');
      }
    };
    if (!navigator.geolocation) {
      void send({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void send({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      () => {
        toast(t('📡 GPS unavailable — sending the alert without coordinates.'));
        void send({});
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onCancel = async () => {
    const ok = await confirmDialog({
      title: t('Cancel SOS'),
      message: t('Mark yourself safe and stand down the alert?'),
      confirmText: t('I am safe — cancel it'),
      tone: 'warn',
    });
    if (!ok) return;
    try {
      await cancel.mutateAsync();
      toast(t('✅ Alert cancelled — glad you are safe po.'));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not cancel — try again.'));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile || !alert ? '1fr' : '380px 1fr', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '30px 28px', textAlign: 'center' }}>
        {!alert ? (
          <>
            <h2 style={{ margin: 0, font: '700 18px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Emergency SOS')}</h2>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: '8px 0 26px' }}>
              {t('One tap transmits your GPS location to the barangay duty officer in real time.')}
            </p>
            <button
              onClick={fire}
              disabled={phase === 'sending'}
              style={{
                width: 190,
                height: 190,
                borderRadius: '50%',
                border: '10px solid #FBE4E1',
                background: phase === 'sending' ? '#E67E22' : '#D64541',
                color: '#fff',
                font: '800 30px Poppins, sans-serif',
                letterSpacing: '.04em',
                cursor: 'pointer',
                boxShadow: '0 12px 30px rgba(214,69,65,.4)',
                animation: phase === 'sending' ? 'none' : 'sosPulse 1.6s ease-in-out infinite',
              }}
            >
              {phase === 'sending' ? '📡' : 'SOS'}
            </button>
            <p style={{ fontSize: 13, color: phase === 'sending' ? '#C96A11' : '#8A97AB', marginTop: 24, fontWeight: phase === 'sending' ? 700 : 500 }}>
              {phase === 'sending' ? t('Requesting GPS location…') : t('Press only in a real emergency.')}
            </p>
            <p style={{ fontSize: 12, color: '#8A97AB', margin: '14px 0 0' }}>
              {t('For life-threatening situations, also call ')}<strong>911</strong>.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 46 }}>🆘</div>
            <h2 style={{ margin: '6px 0 0', font: '700 18px Poppins, sans-serif', color: '#C0392B' }}>{t('Alert Active')}</h2>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: '10px 0 4px' }}>
              {alert.lat !== null
                ? t('Coordinates transmitted — barangay responders can see your pinned location.')
                : t('Alert transmitted without GPS — responders were notified and may call you.')}
            </p>
            <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '0 0 22px' }}>
              {t('Keep your phone with you. Help is on the way.')}
            </p>
            <button
              onClick={onCancel}
              style={{ background: '#fff', color: '#C0392B', border: '2px solid #F1C7C3', borderRadius: 10, padding: '12px 22px', font: '700 13.5px Poppins, sans-serif', cursor: 'pointer' }}
            >
              {t('I am safe — cancel the alert')}
            </button>
          </>
        )}
      </div>

      {alert && alert.lat !== null && alert.lng !== null && (
        <div style={{ ...card, padding: 16 }}>
          <SosMap
            height={isMobile ? 280 : 420}
            pins={[{ id: alert.id, lat: alert.lat, lng: alert.lng, labelText: t('Your transmitted location') }]}
          />
          <p style={{ fontSize: 12, color: '#8A97AB', margin: '10px 4px 0' }}>
            {t('📍 Accuracy ~{acc} m · transmitted {time}', { acc: alert.accuracy ?? '—', time: new Date(alert.createdAt).toLocaleTimeString() })}
          </p>
        </div>
      )}

      <style>{`@keyframes sosPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </div>
  );
}
