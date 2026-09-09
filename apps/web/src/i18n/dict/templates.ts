/** English → Filipino translations for the templates area. English is the key. */
export const templates: Record<string, string> = {
  // SLA processing-class options
  'Simple — 3 working days': 'Simple — 3 araw ng trabaho',
  'Complex — 7 working days': 'Complex — 7 araw ng trabaho',
  'Highly Technical — 20 working days': 'Highly Technical — 20 araw ng trabaho',

  // Add Document Type card
  '➕ Add Document Type': '➕ Magdagdag ng Uri ng Dokumento',
  'Offer a new document residents can request — it appears on the resident form immediately.':
    'Mag-alok ng bagong dokumento na maihihiling ng mga residente — agad itong lalabas sa form ng residente.',
  'Document Name': 'Pangalan ng Dokumento',
  'e.g. Barangay ID, Solo Parent Certification':
    'hal. Barangay ID, Solo Parent Certification',
  'ARTA Processing Class': 'ARTA Processing Class',
  'Release Mode': 'Paraan ng Paglabas',
  '🏛 Pickup at Hall (sealed & signed)': '🏛 Kunin sa Hall (naka-selyo at nakapirma)',
  '⬇ Digital Download': '⬇ Digital na Download',
  'Adding…': 'Idinadagdag…',
  'Add Document Type': 'Magdagdag ng Uri ng Dokumento',

  // Upload Template card
  'Upload Template': 'Mag-upload ng Template',
  "Upload the barangay's official Word (.docx) layout per document type. Newly uploaded templates become active immediately; issued documents are generated from the active template.":
    "Mag-upload ng opisyal na Word (.docx) na layout ng barangay kada uri ng dokumento. Ang mga bagong na-upload na template ay agad na nagiging aktibo; ang mga inisyung dokumento ay nililikha mula sa aktibong template.",
  'Document Type': 'Uri ng Dokumento',
  'Template Name (optional)': 'Pangalan ng Template (opsyonal)',
  'e.g., Official Clearance letterhead v2':
    'hal., Opisyal na Clearance letterhead v2',
  'Template File (.docx)': 'Template File (.docx)',
  'Word (.docx) · max 5 MB': 'Word (.docx) · hanggang 5 MB',
  'Uploading…': 'Ina-upload…',
  'Upload & Activate': 'I-upload at I-activate',
  'SUPPORTED PLACEHOLDERS': 'MGA SUPORTADONG PLACEHOLDER',
  "Put these anywhere in your Word file — they're replaced with the resident's details at issuance. Types without an active template use the built-in certificate layout.":
    "Ilagay ang mga ito kahit saan sa iyong Word file — papalitan ang mga ito ng detalye ng residente sa pag-isyu. Ang mga uring walang aktibong template ay gumagamit ng built-in na certificate layout.",

  // Release Mode per Document Type card
  'Release Mode per Document Type': 'Paraan ng Paglabas kada Uri ng Dokumento',
  'Pickup at Hall': 'Kunin sa Hall',
  " is for documents that carry the barangay's dry seal and wet signature — staff prints the generated PDF for signing, and the resident claims it in person (no download link). ":
    ' ay para sa mga dokumentong may dry seal at wet signature ng barangay — pinipili-print ng staff ang nalikhang PDF para pirmahan, at kinukuha ito ng residente nang personal (walang download link). ',
  Digital: 'Digital',
  ' documents are downloadable from the portal.':
    ' na mga dokumento ay maaaring i-download mula sa portal.',
  Custom: 'Custom',
  Disabled: 'Naka-disable',
  Disable: 'I-disable',
  Enable: 'I-enable',
  'Digital Download': 'Digital na Download',
  '🏛 Pickup at Hall': '🏛 Kunin sa Hall',
  '⬇ Digital': '⬇ Digital',

  // Toasts
  'Give the new document a descriptive name.':
    'Bigyan ng malinaw na pangalan ang bagong dokumento.',
  '📄 "{label}" added — residents can request it now.':
    '📄 Naidagdag ang "{label}" — maaari na itong hilingin ng mga residente.',
  'Could not add the document type.': 'Hindi maidagdag ang uri ng dokumento.',
  'Attach a .docx template file first.':
    'Maglakip muna ng .docx na template file.',
  '📁 Template uploaded — now active for {label}.':
    '📁 Na-upload ang template — aktibo na para sa {label}.',
  'Upload failed — is it a .docx file?':
    'Nabigo ang pag-upload — .docx ba ang file?',
  '🚫 {label} disabled.': '🚫 Na-disable ang {label}.',
  '✅ {label} re-enabled.': '✅ Muling na-enable ang {label}.',
  '⚙️ {label} → {mode}': '⚙️ {label} → {mode}',
  '✅ Template activated.': '✅ Na-activate ang template.',
  '🗑 Template deleted.': '🗑 Nabura ang template.',

  // Uploaded Templates card
  'Uploaded Templates': 'Mga Na-upload na Template',
  'No templates yet — all documents currently use the built-in certificate layout.':
    'Wala pang template — kasalukuyang gumagamit ang lahat ng dokumento ng built-in na certificate layout.',
  ACTIVE: 'AKTIBO',
  'by {name}': 'ni {name}',
  Activate: 'I-activate',

  // Document type labels (release-mode meta)
  'Barangay Clearance': 'Barangay Clearance',
  'Certificate of Indigency': 'Certificate of Indigency',
  'FTJS Certification': 'FTJS Certification',
  'Certificate of Residency': 'Certificate of Residency',
  'Business Permit Endorsement': 'Business Permit Endorsement',
};
