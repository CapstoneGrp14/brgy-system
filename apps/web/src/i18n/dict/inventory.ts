/** English → Filipino translations for the inventory area. English is the key. */
export const inventory: Record<string, string> = {
  // Form validation toasts
  'Give the item a name.': 'Bigyan ng pangalan ang item.',
  'Enter the stock quantity.': 'Ilagay ang dami ng stock.',
  'Enter the auto-close threshold.': 'Ilagay ang auto-close na threshold.',

  // Save / add / update toasts
  ' — below threshold, resident requests closed': ' — mababa sa threshold, sarado na ang mga kahilingan ng residente',
  '✏️ {name} updated{suffix}.': '✏️ Na-update ang {name}{suffix}.',
  '📦 {name} added — now bookable under My Bookings.':
    '📦 Naidagdag ang {name} — maaari nang i-book sa Aking mga Reserbasyon.',
  '📦 {name} added — residents will see it under Health & Medicine.':
    '📦 Naidagdag ang {name} — makikita ito ng mga residente sa Kalusugan at Gamot.',
  'Could not save the changes.': 'Hindi ma-save ang mga pagbabago.',
  'Could not add the item.': 'Hindi maidagdag ang item.',

  // Delete
  'Delete Inventory Item': 'Burahin ang Item sa Imbentaryo',
  'Remove "{name}" from inventory? Its booking option will also be retired from My Bookings.':
    'Alisin ang "{name}" sa imbentaryo? Aalisin din ang booking option nito sa Aking mga Reserbasyon.',
  'Remove "{name}" from inventory? Residents will no longer see it under Health & Medicine.':
    'Alisin ang "{name}" sa imbentaryo? Hindi na ito makikita ng mga residente sa Kalusugan at Gamot.',
  '🗑️ {name} removed from inventory.': '🗑️ Inalis ang {name} sa imbentaryo.',
  'Could not delete the item.': 'Hindi mabura ang item.',

  // Restock
  'Enter how many units to add.': 'Ilagay kung ilang yunit ang idadagdag.',
  ' — resident requests re-opened.': ' — muling binuksan ang mga kahilingan ng residente.',
  '📦 {name} restocked to {qty} {unit}{suffix}': '📦 Na-restock ang {name} sa {qty} {unit}{suffix}',
  'Restock failed.': 'Nabigo ang pag-restock.',

  // Header
  'Asset & Inventory Oversight': 'Pangangasiwa ng Asset at Imbentaryo',
  'Digital Equipment & Medicine Inventory': 'Digital na Imbentaryo ng Kagamitan at Gamot',
  'When stock falls to the threshold, the resident request option automatically closes.':
    'Kapag bumaba ang stock sa threshold, awtomatikong nagsasara ang opsyon ng kahilingan ng residente.',
  '{n} item auto-closed': '{n} item ang awtomatikong nagsara',
  '{n} items auto-closed': '{n} item ang awtomatikong nagsara',
  '+ Add Item': '+ Magdagdag ng Item',

  // Add / edit form
  '✏️ Editing “{name}”': '✏️ Ine-edit ang “{name}”',
  'Item Name': 'Pangalan ng Item',
  'e.g. Wheelchair': 'hal. Wheelchair',
  'Category · Where Residents See It': 'Kategorya · Kung Saan Ito Makikita ng mga Residente',
  'Medicine — Health & Medicine (request)': 'Gamot — Kalusugan at Gamot (kahilingan)',
  'Medical Equipment — Health & Medicine (lending)': 'Medical Equipment — Kalusugan at Gamot (panghihiram)',
  'Event Supply — My Bookings (bookable)': 'Event Supply — Aking mga Reserbasyon (nabi-book)',
  'Stock on Hand': 'Natitirang Stock',
  'Starting Stock': 'Panimulang Stock',
  Unit: 'Yunit',
  Threshold: 'Threshold',
  '💊 Medicine & 🩺 medical equipment appear under': '💊 Gamot at 🩺 medical equipment ay lumilitaw sa',
  '; 🪑 event supplies become bookable under': '; 🪑 ang mga event supply ay nagiging nabi-book sa',
  '. Requests auto-close when stock falls to the threshold.':
    '. Awtomatikong nagsasara ang mga kahilingan kapag bumaba ang stock sa threshold.',
  'Stock changes here are recorded as a correction in the movement ledger.':
    'Ang mga pagbabago sa stock dito ay naitatala bilang pagwawasto sa movement ledger.',
  'Saving…': 'Sini-save…',
  'Add to Inventory': 'Idagdag sa Imbentaryo',

  // Table headers
  'ITEM / CATEGORY': 'ITEM / KATEGORYA',
  'QUANTITY LEFT': 'NATITIRANG DAMI',
  'THRESHOLD LIMIT': 'LIMITASYON NG THRESHOLD',
  'REQUEST STATUS': 'KATAYUAN NG KAHILINGAN',
  ACTION: 'AKSYON',

  // Category labels (CATEGORY_LABEL)
  Medicine: 'Gamot',
  Equipment: 'Kagamitan',
  Supply: 'Suplay',

  // Row cells & actions
  '(Empty)': '(Wala nang Laman)',
  Open: 'Bukas',
  'Auto-Closed': 'Awtomatikong Sarado',
  'Add Stock': 'Magdagdag ng Stock',
  'Restock Item': 'I-restock ang Item',
  'Edit item': 'I-edit ang item',
  'Delete item': 'Burahin ang item',
};
