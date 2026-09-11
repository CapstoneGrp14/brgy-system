import { MEDICINE_QUANTITIES, RequestType } from '@brgy/shared';
import { useEffect, useState } from 'react';
import {
  useAvailableItems,
  useCreateEquipmentRequest,
  useCreateMedicineRequest,
} from '../../api/inventory';
import { useMyRequests } from '../../api/requests';
import { btnBusy, btnPrimary, card, label, pill, successText } from '../../components/ui/kit';
import { DatePicker } from '../../components/ui/DatePicker';
import { Select } from '../../components/ui/Select';
import { fmtDateLong, pillForRequest } from '../../components/ui/status';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

export function HealthPage() {
  const toast = useUiStore((s) => s.toast);
  const t = useT();
  const isMobile = useIsMobile();
  const { data: medicines } = useAvailableItems('MEDICINE');
  const { data: equipment } = useAvailableItems('EQUIPMENT');
  const { data: myRequests } = useMyRequests();
  const createMed = useCreateMedicineRequest();
  const createEq = useCreateEquipmentRequest();

  const [medItemId, setMedItemId] = useState('');
  const [quantity, setQuantity] = useState<string>(MEDICINE_QUANTITIES[0]);
  const [medMsg, setMedMsg] = useState('');
  const [eqItemId, setEqItemId] = useState('');
  const [borrowDate, setBorrowDate] = useState('');
  const [eqMsg, setEqMsg] = useState('');

  useEffect(() => {
    if (!medItemId && medicines?.length) setMedItemId(medicines[0].id);
  }, [medicines, medItemId]);
  useEffect(() => {
    if (!eqItemId && equipment?.length) setEqItemId(equipment[0].id);
  }, [equipment, eqItemId]);

  const submitMed = async () => {
    if (createMed.isPending || !medItemId) return;
    try {
      await createMed.mutateAsync({ itemId: medItemId, quantity });
      setMedMsg(t('✅ Medicine request filed — subject to stock limits. Pickup at the Barangay Health Center once approved.'));
      toast(t('💊 Medicine request submitted'));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Request failed — try again.'));
    }
  };

  const submitEq = async () => {
    if (createEq.isPending || !eqItemId) return;
    if (!borrowDate) {
      toast(t('Pick a borrow date first.'));
      return;
    }
    try {
      await createEq.mutateAsync({ itemId: eqItemId, borrowDate });
      setEqMsg(t('✅ Lending request filed — bring one valid ID when picking up the equipment.'));
      toast(t('🩺 Lending request submitted'));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Request failed — try again.'));
    }
  };

  const myHealth = (myRequests ?? []).filter(
    (r) => r.type === RequestType.MEDICINE || r.type === RequestType.EQUIPMENT,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
        <div style={{ ...card, padding: '26px 28px' }}>
          <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Free Medicine Request')}</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
            {t('Request over-the-counter or maintenance medications (subject to digital inventory limits). Out-of-stock items are hidden until restocked.')}
          </p>
          <label style={label}>{t('Medicine Needed')}</label>
          <Select
            value={medItemId}
            onChange={setMedItemId}
            options={(medicines ?? []).map((m) => ({ value: m.id, labelText: t('{name} ({qty} {unit} left)', { name: m.name, qty: m.stockQty, unit: m.unit }) }))}
            placeholder={medicines?.length === 0 ? t('All medicines are currently out of stock') : t('Loading…')}
            style={{ marginBottom: 12 }}
          />
          <label style={label}>{t('Quantity')}</label>
          <Select
            value={quantity}
            onChange={setQuantity}
            options={MEDICINE_QUANTITIES.map((q) => ({ value: q, labelText: t(q) }))}
            style={{ marginBottom: 16 }}
          />
          {medMsg && <div style={{ ...successText, marginBottom: 14 }}>{medMsg}</div>}
          <button onClick={submitMed} disabled={!medicines?.length} style={!medicines?.length ? { ...btnPrimary, background: '#DFE5EE', color: '#9AA6B7', cursor: 'not-allowed' } : createMed.isPending ? btnBusy : btnPrimary}>
            {createMed.isPending ? t('Submitting…') : medicines?.length ? t('Submit') : t('Closed — low stock')}
          </button>
        </div>

        <div style={{ ...card, padding: '26px 28px' }}>
          <h2 style={{ margin: 0, font: '700 17px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Medical Equipment Lending')}</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
            {t('Borrow barangay-owned medical equipment temporarily. Fully lent-out items are hidden.')}
          </p>
          <label style={label}>{t('Equipment Type')}</label>
          <Select
            value={eqItemId}
            onChange={setEqItemId}
            options={(equipment ?? []).map((e) => ({ value: e.id, labelText: t('{name} ({qty} available)', { name: e.name, qty: e.stockQty }) }))}
            placeholder={equipment?.length === 0 ? t('All equipment currently lent out') : t('Loading…')}
            style={{ marginBottom: 12 }}
          />
          <label style={label}>{t('Borrow Date')}</label>
          <DatePicker value={borrowDate} onChange={setBorrowDate} style={{ marginBottom: 16 }} />
          {eqMsg && <div style={{ ...successText, marginBottom: 14 }}>{eqMsg}</div>}
          <button onClick={submitEq} disabled={!equipment?.length} style={!equipment?.length ? { ...btnPrimary, background: '#DFE5EE', color: '#9AA6B7', cursor: 'not-allowed' } : createEq.isPending ? btnBusy : btnPrimary}>
            {createEq.isPending ? t('Submitting…') : equipment?.length ? t('Submit') : t('Closed — none available')}
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('My Health Requests')}</h3>
        {myHealth.length === 0 && <p style={{ fontSize: 13.5, color: '#8A97AB', margin: 0 }}>{t('No health requests yet.')}</p>}
        {myHealth.map((r) => (
          <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid #F0F3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, color: '#2E3A52' }}>
              <strong>{r.type === RequestType.MEDICINE ? '💊' : '🩺'} {r.title}</strong>
              <span style={{ color: '#8A97AB' }}> · {t('Filed {date}', { date: fmtDateLong(r.filedAt) })}</span>
            </div>
            <span style={pill(pillForRequest(r).kind)}>{t(pillForRequest(r).labelText)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
