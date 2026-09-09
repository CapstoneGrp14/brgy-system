import { card } from '../../components/ui/kit';
import { useT } from '../../i18n';

/** Stand-in for screens scheduled in later phases (see docs/plan.md). */
export function PlaceholderPage({ phase, feature }: { phase: number; feature: string }) {
  const t = useT();
  return (
    <div style={{ ...card, maxWidth: 560, padding: '36px 38px', textAlign: 'center', margin: '40px auto' }}>
      <div style={{ fontSize: 40 }}>🏗️</div>
      <h2 style={{ font: '700 19px Poppins, sans-serif', color: '#1E3A5F', margin: '12px 0 6px' }}>{feature}</h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
        {t('This module ships in')} <strong>{t('Phase {phase}', { phase })}</strong> {t('of the implementation plan.')}
      </p>
    </div>
  );
}
