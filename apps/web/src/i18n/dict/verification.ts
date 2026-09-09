/** English → Filipino translations for the verification area. English is the key. */
export const verification: Record<string, string> = {
  // Accepted document type labels (from @brgy/shared)
  "Voter's ID / Barangay ID": "Voter's ID / Barangay ID",
  'Proof of Billing': 'Proof of Billing',
  'UMID / National ID': 'UMID / National ID',

  // Upload page — toasts
  'Attach your document first.': 'Ilakip muna ang iyong dokumento.',
  '📎 Document submitted — running OCR…': '📎 Naisumite na ang dokumento — nagpapatakbo ng OCR…',
  'Upload failed — try again.': 'Nabigo ang pag-upload — subukan ulit.',

  // Upload page — onboarding
  '🎉 Account created — Step 2 of 2': '🎉 Nagawa na ang account — Hakbang 2 ng 2',
  'Verify your identity now so staff can approve your account. Until then you can browse and file basic requests, but downloads and some services stay locked.':
    'I-verify na ang iyong pagkakakilanlan para ma-aprubahan ng staff ang iyong account. Hanggang doon, maaari kang mag-browse at magsumite ng basic na kahilingan, ngunit mananatiling naka-lock ang mga download at ilang serbisyo.',

  // Upload page — body
  'Get Verified via OCR': 'Magpa-verify sa Pamamagitan ng OCR',
  'Upload your documents. Our system uses OCR to extract information and cross-check it against the Barangay Census before final staff approval.':
    'I-upload ang iyong mga dokumento. Gumagamit ang aming sistema ng OCR para kunin ang impormasyon at itsek ito laban sa Barangay Census bago ang huling pag-apruba ng staff.',
  '🎉 Your account is verified — all services are unlocked.':
    '🎉 Verified na ang iyong account — bukas na ang lahat ng serbisyo.',
  'Document Type': 'Uri ng Dokumento',
  'Loading accepted documents…': 'Nilo-load ang mga tinatanggap na dokumento…',
  'Supporting Document': 'Sumusuportang Dokumento',
  '🔎 Running OCR… cross-checking against the Barangay Census.':
    '🔎 Nagpapatakbo ng OCR… itinatsek laban sa Barangay Census.',
  "✅ {score}% Match — forwarded for final staff approval. You'll be notified once verified.":
    '✅ {score}% Match — ipinasa para sa huling pag-apruba ng staff. Maaabisuhan ka kapag na-verify na.',
  '⚠ {score}% Match (some details differ) — forwarded for staff review.':
    '⚠ {score}% Match (may ilang detalyeng magkaiba) — ipinasa para sa pagsusuri ng staff.',
  '⚠ We could not confidently match your document — staff will review it manually.':
    '⚠ Hindi namin tiyak na naitugma ang iyong dokumento — susuriin ito nang manu-mano ng staff.',
  '📄 PDF received — staff will review your document manually.':
    '📄 Natanggap ang PDF — susuriin nang manu-mano ng staff ang iyong dokumento.',
  '⚠ We could not read the file automatically — staff will review it manually.':
    '⚠ Hindi namin awtomatikong nabasa ang file — susuriin ito nang manu-mano ng staff.',
  '❌ Your last submission was rejected — upload a clearer photo or a different document.':
    '❌ Tinanggihan ang huli mong isinumite — mag-upload ng mas malinaw na larawan o ibang dokumento.',
  'Uploading…': 'Ina-upload…',
  'Awaiting Staff Approval': 'Naghihintay ng Pag-apruba ng Staff',

  // Verification queue — OCR pills
  '✅ {score}% Match': '✅ {score}% Match',
  '⚠ {score}% — details differ': '⚠ {score}% — magkaiba ang detalye',
  '❌ No Match ({score}%)': '❌ Walang Tugma ({score}%)',
  '📄 Manual review (PDF)': '📄 Manu-manong pagsusuri (PDF)',
  '⚠ OCR failed — review manually': '⚠ Nabigo ang OCR — suriin nang manu-mano',
  '⏳ Running OCR…': '⏳ Nagpapatakbo ng OCR…',

  // Verification queue — toasts
  '✅ {name} is now a verified resident.': '✅ Verified nang residente si {name}.',
  "❌ {name}'s submission rejected.": '❌ Tinanggihan ang isinumite ni {name}.',
  'Action failed.': 'Nabigo ang aksyon.',

  // Verification queue — page
  'Verification Audit & Approval': 'Pag-audit at Pag-apruba ng Beripikasyon',
  'OCR extracts info and cross-checks against the Census database. Final approval is manual.':
    'Kinukuha ng OCR ang impormasyon at itinatsek laban sa Census database. Manu-mano ang huling pag-apruba.',
  '{n} awaiting review': '{n} naghihintay ng pagsusuri',
  'RESIDENT SIGN-UP': 'PAG-SIGN UP NG RESIDENTE',
  'UPLOADED DOCUMENT': 'INU-UPLOAD NA DOKUMENTO',
  'OCR STATUS (CENSUS CROSS-CHECK)': 'OCR STATUS (CENSUS CROSS-CHECK)',
  'DATE SUBMITTED': 'PETSA NG PAGSUSUMITE',
  'STAFF ACTION': 'AKSYON NG STAFF',
  'No verification submissions yet.': 'Wala pang isinumiteng beripikasyon.',
  'Approved ✓': 'Naaprubahan ✓',
  'Rejected ✕': 'Tinanggihan ✕',

  // Verification settings — toasts
  'Type the document name first.': 'I-type muna ang pangalan ng dokumento.',
  '📋 "{name}" added to accepted documents.':
    '📋 Naidagdag ang "{name}" sa mga tinatanggap na dokumento.',
  'Could not add the document type.': 'Hindi naidagdag ang uri ng dokumento.',
  'Could not update.': 'Hindi na-update.',

  // Verification settings — page
  'Accepted Supporting Documents': 'Mga Tinatanggap na Sumusuportang Dokumento',
  'Residents pick from this list when uploading their identity documents for verification. Disable a type to stop accepting it (existing submissions are unaffected).':
    'Pumipili ang mga residente mula sa listahang ito kapag nag-u-upload ng kanilang mga dokumento ng pagkakakilanlan para sa beripikasyon. I-disable ang isang uri para itigil ang pagtanggap nito (hindi maaapektuhan ang mga umiiral na isinumite).',
  'Add Document Type': 'Magdagdag ng Uri ng Dokumento',
  "e.g., Postal ID, Driver's License…": "hal., Postal ID, Driver's License…",
  'Adding…': 'Idinadagdag…',
  'Document Types': 'Mga Uri ng Dokumento',
  Active: 'Aktibo',
  Disabled: 'Naka-disable',
  'Added by {name}': 'Idinagdag ni {name}',
  '🚫 "{name}" disabled.': '🚫 Na-disable ang "{name}".',
  '✅ "{name}" enabled.': '✅ Na-enable ang "{name}".',
  Disable: 'I-disable',
  Enable: 'I-enable',
};
