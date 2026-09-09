/** English → Filipino translations for the complaints area. English is the key. */
export const complaints: Record<string, string> = {
  // Complaint categories (from @brgy/shared COMPLAINT_CATEGORIES)
  'Neighbor Dispute': 'Alitan ng Magkapitbahay',
  Noise: 'Ingay',
  Property: 'Ari-arian',
  'Business/Delivery': 'Negosyo/Delivery',
  Other: 'Iba pa',

  // Complaint statuses (from @brgy/shared COMPLAINT_STATUS_META)
  'Filed — Awaiting Lupon': 'Naisampa — Naghihintay ng Lupon',
  'Summons Issued': 'Naglabas ng Summons',
  'Under Mediation': 'Nasa Mediation',
  'CFA Issued': 'Naglabas ng CFA',
  Resolved: 'Naresolba',

  // ── Resident complaints page ──────────────────────────────────────────────
  // Toasts / messages
  'Please describe the incident first.': 'Pakilarawan muna ang insidente.',
  '⚖️ Complaint submitted': '⚖️ Naisumite ang reklamo',
  'Filing failed — try again.': 'Nabigo ang pagsampa — subukan muli.',
  'Please give the location of the incident.': 'Pakibigay ang lokasyon ng insidente.',
  'Request failed — try again.': 'Nabigo ang kahilingan — subukan muli.',
  '✅ Complaint filed. A Lupon member will be assigned — the 20-day mediation clock has started.':
    '✅ Naisampa ang reklamo. May Lupon member na itatalaga — nagsimula na ang 20-araw na mediation clock.',
  '✅ CCTV footage request logged for review — technical requests may take up to 20 days.':
    '✅ Naitala na para sa pagsusuri ang kahilingan sa CCTV footage — maaaring umabot ng 20 araw ang mga technical na kahilingan.',

  // File a complaint form
  'File a Complaint (Complainant Statement)': 'Magsampa ng Reklamo (Salaysay ng Nagrereklamo)',
  'Your complaint enters Katarungang Pambarangay mediation with a 20-day clock.':
    'Papasok ang iyong reklamo sa Katarungang Pambarangay mediation na may 20-araw na takdang panahon.',
  'Contact Number': 'Numero ng Kontak',
  'e.g., 09123456789': 'hal., 09123456789',
  'Respondent (person you are complaining against)': 'Respondent (taong isinasampa mo ng reklamo)',
  "Name or 'Unknown'": "Pangalan o 'Unknown'",
  'Facts / Incident Description': 'Mga Detalye / Paglalarawan ng Insidente',
  'Attach Evidence (optional — photo, PDF, or video)':
    'Maglakip ng Ebidensya (opsyonal — larawan, PDF, o video)',
  'photo, PDF, or MP4 · max 15 MB': 'larawan, PDF, o MP4 · max 15 MB',
  'ℹ️ Formal complaints are filed under your name — mediation is face-to-face, so your identity is disclosed at the hearing.':
    'ℹ️ Ang mga pormal na reklamo ay isinasampa sa ilalim ng iyong pangalan — harapan ang mediation, kaya ihahayag ang iyong pagkakakilanlan sa pagdinig.',
  'Submitting…': 'Isinusumite…',

  // CCTV request
  'Request CCTV Footage': 'Humiling ng CCTV Footage',
  'For cases such as littering, property damage, or disputes requiring evidence.':
    'Para sa mga kaso tulad ng pagkakalat, pinsala sa ari-arian, o mga alitang nangangailangan ng ebidensya.',
  'Date and Time of Incident': 'Petsa at Oras ng Insidente',
  'Location / Street': 'Lokasyon / Kalye',
  'e.g., Old Sta. Mesa Ave.': 'hal., Old Sta. Mesa Ave.',
  '📷 Filed {date}': '📷 Isinumite {date}',

  // My cases
  'My Cases': 'Aking mga Kaso',
  'No complaints filed.': 'Walang naisampang reklamo.',
  'Day {d}/{total}': 'Araw {d}/{total}',

  // ── Staff complaints page ─────────────────────────────────────────────────
  // Toasts / messages
  'Give the blotter a title and at least a short description.':
    'Bigyan ng pamagat ang blotter at kahit maikling paglalarawan.',
  '📝 Blotter entry recorded.': '📝 Naitala ang blotter entry.',
  'Encoding failed.': 'Nabigo ang pag-encode.',
  '👥 {name} assigned to {caseTitle}': '👥 Itinalaga si {name} sa {caseTitle}',
  'Action failed.': 'Nabigo ang aksyon.',

  // Confirm dialog — CFA
  'Generate Certification to File Action?': 'Bumuo ng Certification to File Action?',
  'Mediation for "{caseTitle}" will close and the complainant may elevate the case to court. This cannot be undone.':
    'Magsasara ang mediation para sa "{caseTitle}" at maaaring iakyat ng nagrereklamo ang kaso sa korte. Hindi na ito mababawi.',
  'Generate CFA': 'Bumuo ng CFA',

  // Header + blotter form
  'Katarungang Pambarangay & Dispute Resolution': 'Katarungang Pambarangay at Paglutas ng Alitan',
  '{n} active case · 20-day mediation clock per case':
    '{n} aktibong kaso · 20-araw na mediation clock bawat kaso',
  '{n} active cases · 20-day mediation clock per case':
    '{n} aktibong kaso · 20-araw na mediation clock bawat kaso',
  '+ Encode Police Report (Blotter)': '+ Mag-encode ng Police Report (Blotter)',
  'Case Title': 'Pamagat ng Kaso',
  'e.g., Turnover of Mendicants': 'hal., Turnover of Mendicants',
  'Respondent / Subject': 'Respondent / Paksa',
  'Name or N/A': 'Pangalan o N/A',
  'Incident Details': 'Mga Detalye ng Insidente',
  'Saving…': 'Sini-save…',
  'Record Blotter Entry': 'Itala ang Blotter Entry',

  // Table headers
  'CASE DETAILS': 'DETALYE NG KASO',
  'FILING TYPE': 'URI NG PAGSAMPA',
  'MEDIATION TIMELINE': 'TIMELINE NG MEDIATION',
  'LUPON ASSIGNED': 'NAKATALAGANG LUPON',
  STATUS: 'KATAYUAN',
  ACTIONS: 'MGA AKSYON',

  // Table body
  'No cases on record.': 'Walang naitalang kaso.',
  'View Details →': 'Tingnan ang Detalye →',
  'by {name}': 'ni {name}',
  'Manual Blotter (Staff)': 'Manwal na Blotter (Staff)',
  'Resident Form (Anonymous)': 'Form ng Residente (Anonymous)',
  'Resident Form (Named)': 'Form ng Residente (May Pangalan)',
  'N/A (Staff Blotter)': 'N/A (Blotter ng Staff)',
  OVERDUE: 'LAMPAS SA TAKDA',
  'Day {d} / {total}': 'Araw {d} / {total}',
  'Assign…': 'Magtalaga…',

  // Advance actions (buttons + toast)
  'Issue Summons →': 'Maglabas ng Summons →',
  'Start Mediation →': 'Simulan ang Mediation →',
  'Mark Resolved ✓': 'Markahang Naresolba ✓',
  'Generate CFA →': 'Bumuo ng CFA →',
  'Issue Summons': 'Maglabas ng Summons',
  'Start Mediation': 'Simulan ang Mediation',
  'Mark Resolved': 'Markahang Naresolba',
  '⚖️ {action} — {caseTitle}': '⚖️ {action} — {caseTitle}',

  // Detail modal
  'Mediation overdue': 'Lampas na sa takda ang mediation',
  'Incident Description': 'Paglalarawan ng Insidente',
  'Filing Type': 'Uri ng Pagsampa',
  Filed: 'Isinumite',
  Complainant: 'Nagrereklamo',
  Respondent: 'Respondent',
  'Lupon Assigned': 'Nakatalagang Lupon',
  'Mediation Timeline': 'Timeline ng Mediation',
  Evidence: 'Ebidensya',
  'Manual Blotter (Staff-encoded)': 'Manwal na Blotter (Staff-encoded)',
  'Resident Complaint Form': 'Form ng Reklamo ng Residente',
  'Not yet assigned': 'Hindi pa naitatalaga',
  'N/A — no mediation clock': 'N/A — walang mediation clock',
  'Day {d} of {total}': 'Araw {d} ng {total}',
  '(OVERDUE)': '(LAMPAS SA TAKDA)',
  '📎 Open attached evidence': '📎 Buksan ang nakalakip na ebidensya',
  'None attached': 'Walang nakalakip',
};
