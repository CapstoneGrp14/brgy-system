/** English → Filipino translations for the analytics area. English is the key. */
export const analytics: Record<string, string> = {
  // Shared across analytics pages
  'Could not draft the summary — try again.':
    'Hindi nagawa ang draft ng buod — subukan ulit.',
  'Drafting…': 'Ginagawa…',
  'Copy to Clipboard': 'Kopyahin sa Clipboard',
  '📋 Summary copied to clipboard.': '📋 Nakopya na ang buod sa clipboard.',

  // Admin Overview — header & controls
  'Loading analytics…': 'Nilo-load ang analytics…',
  MONTH: 'BUWAN',
  '✨ AI Summary Draft': '✨ AI na Draft ng Buod',
  '⬇ Export Report (CSV)': '⬇ I-export ang Ulat (CSV)',

  // Admin Overview — stat cards
  'Registered Residents': 'Mga Nakarehistrong Residente',
  'active accounts': 'aktibong account',
  'Documents Issued': 'Mga Dokumentong Naibigay',
  'Complaints Filed': 'Mga Naisampang Reklamo',
  'ARTA Compliance': 'Pagsunod sa ARTA',
  'on-time completions': 'natapos nang nasa oras',
  'Chatbot Queries': 'Mga Tanong sa Chatbot',
  '{n}% self-served': '{n}% nakatugon sa sarili',

  // Admin Overview — chart titles
  '⚖️ Complaint Trend — Filed vs Resolved (6 months)':
    '⚖️ Takbo ng Reklamo — Naisampa vs Naresolba (6 na buwan)',
  '🍩 Complaints by Category': '🍩 Mga Reklamo ayon sa Kategorya',
  '📅 Booking Busy Days (confirmed)': '📅 Mga Abalang Araw ng Reserbasyon (nakumpirma)',
  '🆓 Free-Service Demand (all time)': '🆓 Demand sa Libreng Serbisyo (buong panahon)',
  '📦 Inventory Levels vs Auto-Close Threshold':
    '📦 Antas ng Imbentaryo vs Auto-Close Threshold',

  // Chart legend / series labels
  Filed: 'Naisampa',
  Resolved: 'Naresolba',
  Bookings: 'Mga Reserbasyon',
  Requests: 'Mga Kahilingan',
  Stock: 'Stock',
  Threshold: 'Threshold',
  Cases: 'Mga Kaso',

  // Admin Overview — compliance table
  '⏱️ ARTA 3-7-20 Compliance (all time)': '⏱️ Pagsunod sa ARTA 3-7-20 (buong panahon)',
  'SERVICE CLASS': 'URI NG SERBISYO',
  FILED: 'NAISAMPA',
  COMPLETED: 'NATAPOS',
  'ON TIME': 'NASA ORAS',
  RATE: 'PORSYENTO',
  STATUS: 'KATAYUAN',
  Compliant: 'Sumusunod',
  'At Risk': 'Nanganganib',
  'Non-Compliant': 'Hindi Sumusunod',
  'No data': 'Walang datos',

  // Admin Overview — AI summary modal
  'Drafted from live portal statistics — review before publishing.':
    'Ginawa mula sa live na estadistika ng portal — suriin bago i-publish.',

  // Complaints Report
  'Loading report…': 'Nilo-load ang ulat…',
  'TOTAL CASES': 'KABUUANG KASO',
  'SETTLED (RESOLVED / CFA)': 'NAAYOS (NARESOLBA / CFA)',
  'ACTIVE MEDIATION': 'AKTIBONG MEDIASYON',
  'Katarungang Pambarangay · 20-day mediation clock':
    'Katarungang Pambarangay · 20-araw na relo ng mediasyon',
  'Filed vs Resolved (6 months)': 'Naisampa vs Naresolba (6 na buwan)',
  'By Category': 'Ayon sa Kategorya',
  'Status Mix': 'Halo ng Katayuan',

  // ARTA SLA Report
  'ARTA SLA Report': 'Ulat ng ARTA SLA',
  'Per-request audit against the RA 11032 3-7-20 rule':
    'Pagsusuri kada kahilingan batay sa RA 11032 3-7-20 na patakaran',
  '{n} request': '{n} kahilingan',
  '{n} requests': '{n} na kahilingan',
  'in {year}': 'noong {year}',
  '{pct}% completed on time': '{pct}% natapos nang nasa oras',
  'no completions yet': 'wala pang natapos',
  '{n} currently overdue': '{n} kasalukuyang lampas sa takda',
  'All years': 'Lahat ng taon',
  '✨ AI Summary': '✨ AI na Buod',
  '⬇ Export CSV': '⬇ I-export ang CSV',
  REQUEST: 'KAHILINGAN',
  RESIDENT: 'RESIDENTE',
  'SLA CLASS': 'URI NG SLA',
  'ARTA TARGET': 'TARGET NG ARTA',
  VERDICT: 'HATOL',
  'No requests yet.': 'Wala pang kahilingan.',
  'No requests in {year}.': 'Walang kahilingan noong {year}.',
  '✓ On Time': '✓ Nasa Oras',
  Late: 'Huli',
  '✨ ARTA Summary — {label}': '✨ Buod ng ARTA — {label}',
  'All Years': 'Lahat ng Taon',
  'Drafted from live ARTA records — review before publishing.':
    'Ginawa mula sa live na tala ng ARTA — suriin bago i-publish.',

  // Audit Log
  '🔒 Audit Log': '🔒 Talaan ng Audit',
  'Every significant action — user and system processes alike. Latest {n} entries.':
    'Bawat mahalagang aksyon — mula man sa user o proseso ng sistema. Pinakabagong {n} tala.',
  '⬇ Download CSV': '⬇ I-download ang CSV',
  '🔍 Search actor, action, or target…': '🔍 Maghanap ng aktor, aksyon, o target…',
  TIMESTAMP: 'TIMESTAMP',
  ACTOR: 'AKTOR',
  ACTION: 'AKSYON',
  TARGET: 'TARGET',
  'No matching entries.': 'Walang tugmang tala.',
};
