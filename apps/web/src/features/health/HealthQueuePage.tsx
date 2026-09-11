import type { RequestDto } from '@brgy/shared';
import { RequestType } from '@brgy/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAdvanceRequest } from '../../api/requests';
import { card, cols, pill, tableFixed, td, th } from '../../components/ui/kit';
import { STATUS_PILL, deadlineChip, fmtDate, pillForRequest } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

function useHealthQueue() {
  return useQuery({
    queryKey: ['requests', 'health-queue'],
    queryFn: async () => (await api.get<RequestDto[]>('/requests/health-queue')).data,
    refetchInterval: 30_000,
  });
}

/** Staff/Admin: medicine + equipment lifecycle incl. on-lend returns. */
export function HealthQueuePage() {
  const { data: items } = useHealthQueue();
  const advance = useAdvanceRequest();
  const toast = useUiStore((s) => s.toast);
  const t = useT();

  const onAction = async (id: string) => {
    try {
      const updated = await advance.mutateAsync(id);
      toast(t('✅ {title} → {status}', { title: updated.title, status: t(pillForRequest(updated).labelText) }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Action failed — try again.'));
    }
  };

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
        {t('Health & Medicine Requests')}
      </h2>
      <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
        {t('Free medicine and equipment lending — releasing dispenses stock; marking equipment')}
        <strong> {t('Returned')}</strong> {t('puts the unit back into inventory.')}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(900)}>
          <colgroup>
            {cols('25%', '16%', '9%', '13%', '13%', '24%').map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>{t('REQUEST')}</th>
              <th style={th}>{t('RESIDENT')}</th>
              <th style={th}>{t('FILED')}</th>
              <th style={th}>{t('ARTA DEADLINE')}</th>
              <th style={th}>{t('STATUS')}</th>
              <th style={th}>{t('ACTION')}</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).length === 0 && (
              <tr><td style={{ ...td, color: '#8A97AB' }} colSpan={6}>{t('No health requests. 🎉')}</td></tr>
            )}
            {(items ?? []).map((r) => {
              const chip = deadlineChip(r);
              const status = pillForRequest(r);
              const settled = r.status === 'CLOSED' || r.status === 'REJECTED';
              return (
                <tr key={r.id} style={settled ? { opacity: 0.6 } : chip.kind === 'red' && r.status !== 'CLAIMED' ? { background: '#FEF5F4', boxShadow: 'inset 3px 0 0 #D64541' } : {}}>
                  <td style={{ ...td, fontWeight: 700 }}>
                    {r.type === RequestType.MEDICINE ? '💊' : '🩺'} {r.title}
                    {r.purpose && (
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A97AB', marginTop: 2 }}>{r.purpose}</div>
                    )}
                  </td>
                  <td style={td}>{r.residentName}</td>
                  <td style={td}>{fmtDate(r.filedAt)}</td>
                  <td style={td}>
                    {r.status === 'CLAIMED' || settled
                      ? <span style={{ color: '#9AA6B7' }}>—</span>
                      : <span style={pill(chip.kind)}>{chip.text}</span>}
                  </td>
                  <td style={td}><span style={pill(status.kind)}>{t(status.labelText)}</span></td>
                  <td style={td}>
                    {r.actionText ? (
                      <button
                        onClick={() => onAction(r.id)}
                        disabled={advance.isPending}
                        style={{ background: 'none', border: 'none', color: '#2E66D0', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3 }}
                      >
                        {t(r.actionText)}
                      </button>
                    ) : (
                      <span style={{ color: '#9AA6B7', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
