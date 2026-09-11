/** English → Filipino translations for the masterlist area. English is the key. */
export const masterlist: Record<string, string> = {
  // Category tags
  'Regular Resident': 'Regular na Residente',
  'Senior Citizen': 'Senior Citizen',
  'Solo Parent': 'Solo Parent',

  // Toasts
  '✅ {name} added to the census.': '✅ Naidagdag na si {name} sa census.',
  'Could not add the record.': 'Hindi naidagdag ang record.',
  '🔄 Census refreshed — {added} added, {updated} updated, {deactivated} deactivated.':
    '🔄 Na-refresh ang census — {added} naidagdag, {updated} na-update, {deactivated} na-deactivate.',
  '📥 Import done — {added} added, {skipped} skipped (already in census).':
    '📥 Tapos na ang import — {added} naidagdag, {skipped} nilaktawan (nasa census na).',
  'Import failed — check the CSV format.': 'Nabigo ang import — suriin ang format ng CSV.',
  '⬇ CSV download started': '⬇ Nagsimula na ang download ng CSV',

  // Header
  'Comprehensive Masterlist Registry': 'Komprehensibong Masterlist Registry',
  '{residents} residents · {households} households · used for queue priority and LGU eligibility only — no financial data':
    '{residents} residente · {households} sambahayan · ginagamit lang para sa priority ng pila at LGU eligibility — walang financial data',
  '📥 Import CSV': '📥 Mag-import ng CSV',
  'Twice-yearly sync: upload the full current census — updates matches, adds new people, deactivates anyone missing from the file':
    'Sync dalawang beses kada taon: i-upload ang buong kasalukuyang census — ina-update ang mga tugma, nagdadagdag ng bagong tao, at dine-deactivate ang sinumang wala sa file',
  '🔄 Census Refresh': '🔄 Census Refresh',
  '⬇ Download CSV': '⬇ I-download ang CSV',
  '+ Add Resident': '+ Magdagdag ng Residente',

  // Toolbar
  'Search by name, address, or household code…':
    'Maghanap ayon sa pangalan, tirahan, o household code…',
  'All Categories': 'Lahat ng Kategorya',
  'All Accounts': 'Lahat ng Account',
  'With Account': 'May Account',
  'No Account': 'Walang Account',
  'All Status': 'Lahat ng Katayuan',
  Active: 'Aktibo',
  Inactive: 'Hindi Aktibo',

  // Add form
  'Full Name': 'Buong Pangalan',
  Birthdate: 'Petsa ng Kapanganakan',
  Purok: 'Purok',
  'Household Code (blank = new household)': 'Household Code (blangko = bagong sambahayan)',
  'e.g., Purok 3': 'hal., Purok 3',
  'e.g., HH-0002': 'hal., HH-0002',
  'Saving…': 'Sine-save…',
  'Save Record': 'I-save ang Record',

  // Table headers
  HOUSEHOLD: 'SAMBAHAYAN',
  'RESIDENT NAME': 'PANGALAN NG RESIDENTE',
  'BIRTHDATE / AGE': 'KAPANGANAKAN / EDAD',
  'ADDRESS / ZONE': 'TIRAHAN / ZONE',
  'CATEGORY TAG': 'CATEGORY TAG',
  'QUEUE STATUS': 'KATAYUAN SA PILA',
  'LGU ELIGIBILITY': 'LGU ELIGIBILITY',
  ACCOUNT: 'ACCOUNT',

  // Table body
  'Hide history': 'Itago ang kasaysayan',
  'Show previous data': 'Ipakita ang nakaraang datos',
  '{n} yrs': '{n} taon',
  'Priority Queue': 'Priority na Pila',
  Standard: 'Standard',
  'Account disabled': 'Naka-disable ang account',
  Registered: 'Rehistrado',
  'No account': 'Walang account',
  'PREVIOUS DATA — {name}': 'NAKARAANG DATOS — {name}',
  'Loading history…': 'Nilo-load ang kasaysayan…',
  "No previous versions — this record hasn't been changed by a census refresh yet.":
    'Walang nakaraang bersyon — hindi pa nababago ang record na ito ng census refresh.',
  'was:': 'dati:',
  'was Inactive': 'dating Hindi Aktibo',
  'by {name}': 'ni {name}',

  // Import modal
  '🔄 Census Refresh (twice-yearly sync)': '🔄 Census Refresh (sync dalawang beses kada taon)',
  '📥 Import Census CSV': '📥 Mag-import ng Census CSV',
  '⚠️ The CSV is treated as the ': '⚠️ Ituturing na ang CSV bilang ',
  'full current census': 'buong kasalukuyang census',
  ': matched residents are updated, new people are added, and anyone missing from the file is marked ':
    ': ina-update ang mga tugmang residente, idinadagdag ang mga bagong tao, at minamarkahang ',
  '. Use plain Import for partial lists.':
    '. Gamitin ang karaniwang Import para sa bahagyang listahan.',
  'Adds new people only — existing records are never changed. Duplicates (same name and birthdate) are skipped.':
    'Nagdaragdag lang ng bagong tao — hindi kailanman binabago ang mga umiiral na record. Nilalaktawan ang mga duplicate (parehong pangalan at petsa ng kapanganakan).',
  'Columns:': 'Mga Column:',
  'CSV · max 2 MB': 'CSV · max 2 MB',
  'Importing…': 'Ini-import…',
  '🔄 Run Census Refresh': '🔄 Patakbuhin ang Census Refresh',
  '📥 Import Records': '📥 Mag-import ng mga Record',

  // Pagination
  'Showing {from}–{to} of {total} records': 'Ipinapakita ang {from}–{to} sa {total} record',
  '{n} per page': '{n} kada pahina',

  // Edit / delete a census record (staff + admin)
  'Edit Census Record': 'I-edit ang Census Record',
  'New Census Record': 'Bagong Census Record',
  'Edit': 'I-edit',
  'Delete': 'Tanggalin',
  ACTIONS: 'AKSYON',
  'Save Changes': 'I-save ang mga Pagbabago',
  Cancel: 'Kanselahin',
  '✅ {name} updated.': '✅ Na-update si {name}.',
  'Could not save the record.': 'Hindi na-save ang record.',
  'Full name and address are required.': 'Kailangan ang buong pangalan at address.',
  'Delete census record?': 'Tanggalin ang census record?',
  '{name} and their change history will be permanently removed. This cannot be undone.':
    'Permanenteng matatanggal si {name} at ang history ng mga pagbabago. Hindi na ito maibabalik.',
  '🗑️ {name} removed from the census.': '🗑️ Natanggal si {name} sa census.',
  'Could not delete the record.': 'Hindi natanggal ang record.',
  'Registered residents cannot be deleted — mark inactive instead.':
    'Hindi matatanggal ang mga rehistradong residente — markahang inactive na lang.',
};
