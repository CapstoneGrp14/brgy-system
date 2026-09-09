/** English → Filipino translations for the resident & employee dashboards. */
export const dashboard: Record<string, string> = {
  // Resident dashboard — SOS banner
  '🆘 One-Tap Emergency Alert': '🆘 One-Tap na Emergency Alert',
  'Sends your exact location to the nearest barangay officer immediately.':
    'Ipinapadala kaagad ang eksaktong lokasyon mo sa pinakamalapit na barangay officer.',
  '📍 Send SOS Now': '📍 Magpadala ng SOS Ngayon',

  // Announcement banner
  '🚨 URGENT: ': '🚨 URGENT: ',
  '🖼️ View poster': '🖼️ Tingnan ang poster',
  'Read more →': 'Magbasa pa →',
  'All announcements →': 'Lahat ng anunsyo →',
  'Posted {date} · {author}': 'Na-post noong {date} · {author}',

  // Verification nudge
  'Verification needed.': 'Kailangan ng beripikasyon.',
  'Barangay services are locked until staff verifies your identity — upload a valid ID or supporting document to unlock them.':
    'Naka-lock ang mga serbisyo ng barangay hanggang ma-verify ng staff ang iyong pagkakakilanlan — mag-upload ng valid na ID o sumusuportang dokumento para ma-unlock ang mga ito.',
  '📎 Upload Documents →': '📎 Mag-upload ng Dokumento →',

  // ARTA SLA tracker
  '⏱ ARTA SLA Tracker — My Active Requests': '⏱ ARTA SLA Tracker — Aking mga Aktibong Kahilingan',
  '3-day simple · 7-day complex · 20-day technical':
    '3-araw simple · 7-araw complex · 20-araw technical',
  'No active requests — file one from Quick Actions below.':
    'Walang aktibong kahilingan — magsumite mula sa Quick Actions sa ibaba.',
  '⚠ Overdue by {n} day': '⚠ Lampas nang {n} araw',
  '⚠ Overdue by {n} days': '⚠ Lampas nang {n} araw',
  '⚠ Approaching deadline': '⚠ Malapit na ang deadline',
  '✓ On track': '✓ Nasa oras',

  // Quick actions
  'Quick Actions': 'Mabilisang Aksyon',
  'Request Barangay Clearance': 'Humiling ng Barangay Clearance',
  'File a Complaint': 'Magsampa ng Reklamo',
  'Request Free Medicine': 'Humiling ng Libreng Gamot',
  'Book Court / Venue': 'Mag-book ng Court / Venue',
  'Free Printing (Students)': 'Libreng Printing (Estudyante)',
  'Indigency Certificate': 'Certificate of Indigency',
  'FTJS Certification': 'FTJS Certification',
  'Request CCTV Footage': 'Humiling ng CCTV Footage',
  '🔒 Locked until verification — upload your supporting documents first.':
    '🔒 Naka-lock hanggang ma-verify — mag-upload muna ng iyong sumusuportang dokumento.',

  // Recent requests
  'My Recent Requests': 'Aking mga Kamakailang Kahilingan',
  'Nothing filed yet.': 'Wala pang naisumite.',
  'Filed {date}': 'Isinumite {date}',

  // Bookings
  'My Upcoming Bookings': 'Aking mga Paparating na Reserbasyon',
  '+ New Booking': '+ Bagong Reserbasyon',
  'No upcoming bookings — reserve a facility or equipment.':
    'Walang paparating na reserbasyon — mag-reserba ng pasilidad o kagamitan.',
  Pending: 'Nakabinbin',

  // All requests popup
  '📄 All My Requests': '📄 Lahat ng Aking mga Kahilingan',

  // ── Employee dashboard ──────────────────────────────────────────────
  // SOS banner + tabs
  '✅ No active SOS alerts — all clear.': '✅ Walang aktibong SOS alert — all clear.',
  Documents: 'Mga Dokumento',
  Health: 'Kalusugan',
  CCTV: 'CCTV',

  // Stat cards
  'Pending Requests (ARTA)': 'Mga Nakabinbing Kahilingan (ARTA)',
  '⚠ {n} due within 24 hrs': '⚠ {n} ang dapat matapos sa loob ng 24 oras',
  '⚠ {n} overdue': '⚠ {n} ang lampas na sa takdang panahon',
  '✓ Nothing due within 24 hrs': '✓ Walang dapat matapos sa loob ng 24 oras',
  'Active Complaints': 'Mga Aktibong Reklamo',
  '⚠ {n} past the 20-day clock': '⚠ {n} ang lampas na sa 20-araw na takda',
  '✓ All within mediation window': '✓ Lahat ay nasa loob pa ng mediation window',
  'Pending Verification': 'Mga Nakabinbing Beripikasyon',
  '⚠ {n} flagged by OCR': '⚠ {n} ang na-flag ng OCR',
  '✓ Queue clear': '✓ Malinis ang queue',
  'Low-Stock Items': 'Mga Item na Kulang sa Stock',
  '✓ All stock above thresholds': '✓ Lahat ng stock ay nasa itaas ng threshold',

  // Requests queue
  'Requests Queue — ARTA SLA Tracker': 'Queue ng mga Kahilingan — ARTA SLA Tracker',
  'Due soon': 'Malapit nang matapos',
  'On track': 'Nasa oras',
  '⬇ Queue exported as CSV': '⬇ Na-export ang queue bilang CSV',

  // Queue table headers
  REQUEST: 'KAHILINGAN',
  RESIDENT: 'RESIDENTE',
  FILED: 'ISINUMITE',
  'ARTA DEADLINE': 'ARTA DEADLINE',
  STATUS: 'KATAYUAN',
  ACTION: 'AKSYON',
  'View details': 'Tingnan ang detalye',
  'View Details →': 'Tingnan ang Detalye →',

  // Staff request actions (from STATUS_ACTIONS)
  'Review →': 'I-review →',
  'Mark Processed →': 'Markahang Naproseso →',
  'Mark Claimed →': 'Markahang Nakuha →',
  'Escalate →': 'I-eskalate →',

  // Print + empty state
  'Download the generated PDF for printing (seal + signature)':
    'I-download ang generated na PDF para i-print (selyo + pirma)',
  '⎙ Print': '⎙ I-print',
  'Print download failed — try again.': 'Hindi na-download para i-print — subukan ulit.',
  'Queue is clear — no open requests in this tab. 🎉':
    'Malinis ang queue — walang bukas na kahilingan sa tab na ito. 🎉',

  // Pagination
  'Showing {from}–{to} of {total} records':
    'Ipinapakita ang {from}–{to} sa {total} na record',
  ' · {n} overdue on this page': ' · {n} ang lampas sa pahinang ito',
  Prev: 'Nakaraan',

  // Detail modal
  'Purpose / Details': 'Layunin / Detalye',
  Resident: 'Residente',
  'Request Type': 'Uri ng Kahilingan',
  Filed: 'Isinumite',
  'ARTA Deadline': 'ARTA Deadline',
  '🏛 Pickup at Hall': '🏛 Kunin sa Hall',
  'Print Copy': 'Print Copy',
  'Signing Draft': 'Draft para Pirmahan',
  'Issued Document': 'Naibigay na Dokumento',
  'Not yet': 'Wala pa',
  '⎙ Print for signing & release': '⎙ I-print para pirmahan & i-release',
  '⎙ Print draft for signing': '⎙ I-print ang draft para pirmahan',
  '📄 Open signed copy': '📄 Buksan ang nilagdaang kopya',
  'Generated at Review': 'Gagawin sa Review',
  "✍️ Upload the signed & sealed copy — this is what gets emailed to the resident. Completion is locked until it's attached.":
    '✍️ I-upload ang nilagdaan at may selyong kopya — ito ang ipapadala sa email ng residente. Naka-lock ang pagkumpleto hanggang hindi ito nakalakip.',
  'PDF or JPG/PNG scan · max 10 MB': 'PDF o JPG/PNG scan · max 10 MB',
  '📤 Attach Signed Copy': '📤 Ilakip ang Nilagdaang Kopya',
  'Uploading…': 'Ina-upload…',
  '✅ Signed copy attached — you can now mark the request processed.':
    '✅ Nailakip ang nilagdaang kopya — pwede mo nang markahang naproseso ang kahilingan.',
  'Upload failed.': 'Hindi na-upload.',
  '✅ Signed & sealed copy on file — this is what the resident receives.':
    '✅ Naka-file na ang nilagdaan at may selyong kopya — ito ang matatanggap ng residente.',

  // Queue toasts
  '✅ {title} → {status}': '✅ {title} → {status}',
  'Action failed — try again.': 'Hindi naisagawa ang aksyon — subukan ulit.',
};
