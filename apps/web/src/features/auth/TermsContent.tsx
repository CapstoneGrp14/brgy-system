import { useT } from '../../i18n';

/** Barangay 591 e-Services Portal — Terms & Conditions and Data Privacy Notice. */
export function TermsContent() {
  const t = useT();
  const h: React.CSSProperties = { font: '700 14px Poppins, sans-serif', color: '#1E3A5F', margin: '16px 0 6px' };
  const p: React.CSSProperties = { fontSize: 13, color: '#2E3A52', lineHeight: 1.6, margin: '0 0 8px' };
  return (
    <div style={{ maxHeight: '52vh', overflowY: 'auto', paddingRight: 6 }}>
      <p style={{ ...p, marginTop: 0 }}>
        {t('Welcome to the Barangay 591 e-Services Portal. By creating an account, you agree to the terms below. Please read them carefully before continuing.')}
      </p>

      <h4 style={{ ...h, marginTop: 4 }}>{t('1. Eligibility & Accurate Information')}</h4>
      <p style={p}>
        {t('This portal is for bona fide residents of Barangay 591 (Zone 58, District VI, Sta. Mesa, Manila). You must be at least 16 years old, and the name and birthdate you provide must match the official Barangay Census. Submitting false or misleading information may result in the suspension of your account and denial of services.')}
      </p>

      <h4 style={h}>{t('2. Identity Verification')}</h4>
      <p style={p}>
        {t('Access to barangay services stays locked until staff verify your identity. You agree to upload a valid government or barangay-issued ID for review, and you confirm that the document you upload genuinely belongs to you.')}
      </p>

      <h4 style={h}>{t('3. Acceptable Use')}</h4>
      <p style={p}>
        {t('You agree to use this portal only for lawful barangay transactions — requesting documents, filing complaints, booking facilities, requesting medicine or equipment, and emergency SOS. Filing false complaints, malicious blotter entries, or fraudulent document requests is prohibited and may carry legal consequences.')}
      </p>

      <h4 style={h}>{t('4. Emergency SOS')}</h4>
      <p style={p}>
        {t('The One-Tap SOS feature shares your live location with barangay responders. It is intended for genuine emergencies within Barangay 591 territory only. Abuse of the SOS feature (false alarms) is a punishable offense.')}
      </p>

      <h4 style={h}>{t('5. Data Privacy Notice')}</h4>
      <p style={p}>
        {t('In compliance with the Data Privacy Act of 2012 (RA 10173), the Barangay collects and processes your personal information (name, birthdate, address, contact details, and uploaded documents) solely to deliver barangay services, verify your identity, and keep official records. Your data is stored securely, is not sold to third parties, and is shared only with authorized barangay officials or as required by law. You may request access to or correction of your data at the Barangay Hall.')}
      </p>

      <h4 style={h}>{t('6. Account Responsibility')}</h4>
      <p style={p}>
        {t('You are responsible for keeping your password confidential and for all activity under your account. Notify the Barangay immediately if you suspect unauthorized use.')}
      </p>

      <h4 style={h}>{t('7. Service Availability')}</h4>
      <p style={p}>
        {t('The Barangay aims to process requests within the ARTA-mandated timelines (3-day simple, 7-day complex, 20-day technical) but does not guarantee uninterrupted availability of the online portal. On-site services at the Barangay Hall remain available as a fallback.')}
      </p>

      <p style={{ ...p, marginTop: 12, color: '#64748B' }}>
        {t('By checking the agreement box, you acknowledge that you have read, understood, and accepted these Terms & Conditions and the Data Privacy Notice.')}
      </p>
    </div>
  );
}
