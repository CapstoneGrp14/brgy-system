/** English → Filipino translations for the health area. English is the key. */
export const health: Record<string, string> = {
  // Free medicine request card
  'Free Medicine Request': 'Humiling ng Libreng Gamot',
  'Request over-the-counter or maintenance medications (subject to digital inventory limits). Out-of-stock items are hidden until restocked.':
    'Humiling ng over-the-counter o maintenance na gamot (napapailalim sa limitasyon ng digital na imbentaryo). Nakatago ang mga ubos na item hanggang mapunan muli.',
  'Medicine Needed': 'Gamot na Kailangan',
  '{name} ({qty} {unit} left)': '{name} ({qty} {unit} natitira)',
  'All medicines are currently out of stock': 'Ubos na ang lahat ng gamot sa ngayon',
  Quantity: 'Dami',
  // Medicine quantity options (MEDICINE_QUANTITIES)
  '1 piece / strip': '1 piraso / strip',
  '1 box': '1 kahon',
  '1 bottle': '1 bote',
  'Closed — low stock': 'Sarado — kulang ang stock',
  '✅ Medicine request filed — subject to stock limits. Pickup at the Barangay Health Center once approved.':
    '✅ Naisumite ang kahilingan sa gamot — napapailalim sa limitasyon ng stock. Kunin sa Barangay Health Center kapag naaprubahan na.',
  '💊 Medicine request submitted': '💊 Naisumite ang kahilingan sa gamot',
  'Request failed — try again.': 'Nabigo ang kahilingan — subukang muli.',

  // Medical equipment lending card
  'Medical Equipment Lending': 'Pagpapahiram ng Medical Equipment',
  'Borrow barangay-owned medical equipment temporarily. Fully lent-out items are hidden.':
    'Manghiram pansamantala ng medical equipment na pag-aari ng barangay. Nakatago ang mga item na lubos nang nakapahiram.',
  'Equipment Type': 'Uri ng Kagamitan',
  '{name} ({qty} available)': '{name} ({qty} ang available)',
  'All equipment currently lent out': 'Lahat ng kagamitan ay nakapahiram sa ngayon',
  'Borrow Date': 'Petsa ng Panghihiram',
  'Closed — none available': 'Sarado — walang available',
  '✅ Lending request filed — bring one valid ID when picking up the equipment.':
    '✅ Naisumite ang kahilingan sa panghihiram — magdala ng isang valid na ID kapag kukunin ang kagamitan.',
  '🩺 Lending request submitted': '🩺 Naisumite ang kahilingan sa panghihiram',
  'Pick a borrow date first.': 'Pumili muna ng petsa ng panghihiram.',

  // Shared submit label
  'Submitting…': 'Isinusumite…',

  // My health requests list
  'My Health Requests': 'Aking mga Kahilingang Pangkalusugan',
  'No health requests yet.': 'Wala pang kahilingang pangkalusugan.',
  'Filed {date}': 'Isinumite {date}',

  // Staff health queue
  '✅ {title} → {status}': '✅ {title} → {status}',
  'Action failed — try again.': 'Nabigo ang aksyon — subukang muli.',
  'Health & Medicine Requests': 'Mga Kahilingan sa Kalusugan at Gamot',
  'Free medicine and equipment lending — releasing dispenses stock; marking equipment':
    'Libreng gamot at pagpapahiram ng kagamitan — ang pagbibigay ay nagbabawas sa stock; ang pagmarka sa kagamitan bilang',
  Returned: 'Naibalik',
  'puts the unit back into inventory.': 'ay ibinabalik ang yunit sa imbentaryo.',
  REQUEST: 'KAHILINGAN',
  RESIDENT: 'RESIDENTE',
  FILED: 'ISINUMITE',
  'ARTA DEADLINE': 'ARTA DEADLINE',
  STATUS: 'KATAYUAN',
  ACTION: 'AKSYON',
  'No health requests. 🎉': 'Walang kahilingang pangkalusugan. 🎉',
  // Staff action buttons (server-provided actionText)
  'Approve →': 'Aprubahan →',
  'Mark Released →': 'Markahan bilang Naibigay →',
  'Mark Returned ✓': 'Markahan bilang Naibalik ✓',
  'Mark Claimed →': 'Markahan bilang Nakuha →',

  // Filters and pagination added with the queue toolbars.
  'Past ARTA deadline': 'Lipas na sa ARTA deadline',
  'Closed or rejected': 'Sarado o tinanggihan',
  'Medicine & equipment': 'Gamot at kagamitan',
  'Medicine only': 'Gamot lamang',
  'Equipment only': 'Kagamitan lamang',
};
