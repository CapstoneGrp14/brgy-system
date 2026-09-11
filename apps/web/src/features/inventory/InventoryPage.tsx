import { Role, type InventoryCategory, type InventoryItemDto } from '@brgy/shared';
import { useState } from 'react';
import { useAddItem, useDeleteItem, useInventory, useRestock, useUpdateItem } from '../../api/inventory';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { btnBusy, btnPrimary, card, cols, input, label, pill, tableFixed, td, th } from '../../components/ui/kit';
import { Select } from '../../components/ui/Select';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

const CATEGORY_LABEL = { MEDICINE: 'Medicine', EQUIPMENT: 'Equipment', SUPPLY: 'Supply' } as const;

/** Where each category surfaces for residents — shown so admins pick the right one. */
const CATEGORY_OPTIONS = [
  { value: 'MEDICINE', labelText: 'Medicine — Health & Medicine (request)' },
  { value: 'EQUIPMENT', labelText: 'Medical Equipment — Health & Medicine (lending)' },
  { value: 'SUPPLY', labelText: 'Event Supply — My Bookings (bookable)' },
];

/** Employee: read-only stock view. Admin: adds the Restock action (FR-6.5). */
export function InventoryPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;
  const isMobile = useIsMobile();
  const { data: items } = useInventory();
  const restock = useRestock();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const toast = useUiStore((s) => s.toast);
  const t = useT();
  const [restockFor, setRestockFor] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryCategory>('MEDICINE');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('Pcs');
  const [newThreshold, setNewThreshold] = useState('');
  const saving = addItem.isPending || updateItem.isPending;

  const resetForm = () => {
    setEditFor(null);
    setNewName(''); setNewCategory('MEDICINE'); setNewQty(''); setNewUnit('Pcs'); setNewThreshold('');
  };

  const startEdit = (i: InventoryItemDto) => {
    setEditFor(i.id);
    setNewName(i.name);
    setNewCategory(i.category);
    setNewQty(String(i.stockQty));
    setNewUnit(i.unit);
    setNewThreshold(String(i.threshold));
    setShowForm(true);
  };

  const doSave = async () => {
    if (saving) return;
    if (!newName.trim()) return toast(t('Give the item a name.'));
    const stockQty = Number(newQty);
    const threshold = Number(newThreshold);
    if (!Number.isInteger(stockQty) || stockQty < 0) return toast(t('Enter the stock quantity.'));
    if (!Number.isInteger(threshold) || threshold < 0) return toast(t('Enter the auto-close threshold.'));
    const body = {
      name: newName.trim(),
      category: newCategory,
      stockQty,
      unit: newUnit.trim() || 'Pcs',
      threshold,
    };
    try {
      if (editFor) {
        const updated = await updateItem.mutateAsync({ id: editFor, ...body });
        const suffix = updated.isOpen ? '' : t(' — below threshold, resident requests closed');
        toast(t('✏️ {name} updated{suffix}.', { name: updated.name, suffix }));
      } else {
        const created = await addItem.mutateAsync(body);
        toast(
          newCategory === 'SUPPLY'
            ? t('📦 {name} added — now bookable under My Bookings.', { name: created.name })
            : t('📦 {name} added — residents will see it under Health & Medicine.', { name: created.name }),
        );
      }
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? (editFor ? t('Could not save the changes.') : t('Could not add the item.')));
    }
  };

  const doDelete = async (id: string, name: string, category: InventoryCategory) => {
    const ok = await confirmDialog({
      title: t('Delete Inventory Item'),
      message:
        category === 'SUPPLY'
          ? t('Remove "{name}" from inventory? Its booking option will also be retired from My Bookings.', { name })
          : t('Remove "{name}" from inventory? Residents will no longer see it under Health & Medicine.', { name }),
      confirmText: t('Delete'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteItem.mutateAsync(id);
      toast(t('🗑️ {name} removed from inventory.', { name }));
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not delete the item.'));
    }
  };

  const doRestock = async (id: string, name: string) => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1) {
      toast(t('Enter how many units to add.'));
      return;
    }
    try {
      const updated = await restock.mutateAsync({ id, qty: n });
      const suffix = updated.isOpen ? t(' — resident requests re-opened.') : '.';
      toast(t('📦 {name} restocked to {qty} {unit}{suffix}', { name, qty: updated.stockQty, unit: updated.unit, suffix }));
      setRestockFor(null);
      setQty('');
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Restock failed.'));
    }
  };

  const lowCount = (items ?? []).filter((i) => !i.isOpen).length;

  return (
    <div style={{ ...card, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
            {isAdmin ? t('Asset & Inventory Oversight') : t('Digital Equipment & Medicine Inventory')}
          </h2>
          <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 14px' }}>
            {t('When stock falls to the threshold, the resident request option automatically closes.')}
            {lowCount > 0 && ` · ${t(lowCount === 1 ? '{n} item auto-closed' : '{n} items auto-closed', { n: lowCount })}`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { if (showForm) resetForm(); setShowForm((v) => !v); }}
            style={{ ...btnPrimary, width: 'auto', padding: '10px 18px' }}
          >
            {showForm ? t('Close') : t('+ Add Item')}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div style={{ background: '#F7F9FC', border: '1px solid #E9EDF4', borderRadius: 12, padding: '18px 20px', marginBottom: 18 }}>
          {editFor && (
            <div style={{ font: '700 13px Poppins, sans-serif', color: '#1E3A5F', marginBottom: 12 }}>{t('✏️ Editing “{name}”', { name: newName })}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={label}>{t('Item Name')}</label>
              <input style={input} placeholder={t('e.g. Wheelchair')} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label style={label}>{t('Category · Where Residents See It')}</label>
              <Select value={newCategory} onChange={(v) => setNewCategory(v as InventoryCategory)} options={CATEGORY_OPTIONS.map((o) => ({ ...o, labelText: t(o.labelText) }))} />
            </div>
            <div>
              <label style={label}>{editFor ? t('Stock on Hand') : t('Starting Stock')}</label>
              <input style={input} type="number" min={0} placeholder="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            </div>
            <div>
              <label style={label}>{t('Unit')}</label>
              <input style={input} placeholder="Pcs" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
            </div>
            <div>
              <label style={label}>{t('Threshold')}</label>
              <input style={input} type="number" min={0} placeholder="0" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#8A97AB', margin: '10px 0 12px' }}>
            {t('💊 Medicine & 🩺 medical equipment appear under')} <strong>{t('Health & Medicine')}</strong>{t('; 🪑 event supplies become bookable under')} <strong>{t('My Bookings')}</strong>{t('. Requests auto-close when stock falls to the threshold.')}
            {editFor && ' ' + t('Stock changes here are recorded as a correction in the movement ledger.')}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={doSave} style={saving ? { ...btnBusy, width: 'auto', padding: '10px 20px' } : { ...btnPrimary, width: 'auto', padding: '10px 20px' }}>
              {saving ? t('Saving…') : editFor ? t('Save Changes') : t('Add to Inventory')}
            </button>
            {editFor && (
              <button
                onClick={() => { resetForm(); setShowForm(false); }}
                style={{ background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {t('Cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={tableFixed(760)}>
          <colgroup>
            {(isAdmin ? cols('28%', '15%', '15%', '18%', '24%') : cols('34%', '20%', '20%', '26%')).map((c) => (
              <col key={c.key} style={c.style} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>{t('ITEM / CATEGORY')}</th>
              <th style={th}>{t('QUANTITY LEFT')}</th>
              <th style={th}>{t('THRESHOLD LIMIT')}</th>
              <th style={th}>{t('REQUEST STATUS')}</th>
              {isAdmin && <th style={th}>{t('ACTION')}</th>}
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((i) => (
              <tr key={i.id} style={!i.isOpen ? { background: '#FEF5F4', boxShadow: 'inset 3px 0 0 #D64541' } : {}}>
                <td style={{ ...td, fontWeight: 700 }}>
                  {i.name}
                  <span style={{ fontWeight: 500, color: '#8A97AB' }}> ({t(CATEGORY_LABEL[i.category])})</span>
                </td>
                <td style={{ ...td, fontWeight: 700, color: i.isOpen ? '#2E3A52' : '#C0392B' }}>
                  {i.stockQty} {i.unit}
                  {!i.isOpen && i.stockQty === 0 && ` ${t('(Empty)')}`}
                </td>
                <td style={td}>{i.threshold} {i.unit}</td>
                <td style={td}>
                  {i.isOpen ? <span style={pill('green')}>{t('Open')}</span> : <span style={pill('red')}>{t('Auto-Closed')}</span>}
                </td>
                {isAdmin && (
                  <td style={td}>
                    {restockFor === i.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          style={{ ...input, width: 90, padding: '7px 10px', fontSize: 13 }}
                          type="number"
                          min={1}
                          placeholder={`+ ${i.unit}`}
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          autoFocus
                        />
                        <button onClick={() => doRestock(i.id, i.name)} style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 12px', font: '700 12px Poppins, sans-serif', cursor: 'pointer' }}>
                          {restock.isPending ? '…' : t('Add')}
                        </button>
                        <button onClick={() => { setRestockFor(null); setQty(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          onClick={() => { setRestockFor(i.id); setQty(''); }}
                          style={{ background: 'none', border: 'none', color: i.isOpen ? '#2E66D0' : '#C0392B', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: 96, textAlign: 'left', padding: 0, flex: 'none' }}
                        >
                          {i.isOpen ? t('Add Stock') : t('Restock Item')}
                        </button>
                        <button
                          onClick={() => startEdit(i)}
                          title={t('Edit item')}
                          style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', padding: 0, width: 24, textAlign: 'center', flex: 'none' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => doDelete(i.id, i.name, i.category)}
                          title={t('Delete item')}
                          style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', padding: 0, width: 24, textAlign: 'center', flex: 'none' }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
