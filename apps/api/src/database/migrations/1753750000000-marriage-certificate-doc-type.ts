import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accept a marriage certificate, and give each document type its own field spec.
 *
 * A resident who married still lives in the barangay, but her birth certificate
 * carries her maiden surname — so verifying identity from a birth certificate
 * alone fails her through no fault of her own. The marriage certificate is the
 * document that bridges the two names, so NAME is deliberately NOT required on
 * it: a changed surname is the normal case there, and staff make the call.
 *
 * Specs also stop unrelated documents being judged against the same checklist —
 * proof of billing has no ID number, a birth certificate has no address.
 */
export class MarriageCertificateDocType1753750000000 implements MigrationInterface {
  name = 'MarriageCertificateDocType1753750000000';

  private static readonly SPECS: Record<string, unknown> = {
    'Birth Certificate (PSA)': [
      { key: 'NAME', weight: 45, required: true },
      { key: 'BIRTHDATE', weight: 35, required: false },
      { key: 'DOC_TITLE', weight: 20, required: false },
    ],
    'National ID (PhilSys)': [
      { key: 'NAME', weight: 40, required: true },
      { key: 'BIRTHDATE', weight: 20, required: false },
      { key: 'ADDRESS', weight: 20, required: false },
      { key: 'ID_NUMBER', weight: 20, required: false },
    ],
    UMID: [
      { key: 'NAME', weight: 45, required: true },
      { key: 'BIRTHDATE', weight: 25, required: false },
      { key: 'ID_NUMBER', weight: 30, required: false },
    ],
    "Voter's ID / Barangay ID": [
      { key: 'NAME', weight: 40, required: true },
      { key: 'ADDRESS', weight: 30, required: false },
      { key: 'BIRTHDATE', weight: 15, required: false },
      { key: 'ID_NUMBER', weight: 15, required: false },
    ],
    'Proof of Billing': [
      { key: 'NAME', weight: 45, required: true },
      { key: 'ADDRESS', weight: 55, required: false },
    ],
    // Name is NOT required: the surname legitimately differs from the census.
    'Marriage Certificate': [
      { key: 'DOC_TITLE', weight: 30, required: true },
      { key: 'NAME', weight: 40, required: false },
      { key: 'BIRTHDATE', weight: 30, required: false },
    ],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO verification_doc_types (id, label_text, is_active, created_by)
       SELECT UUID(), 'Marriage Certificate', 1, 'System Default'
       WHERE NOT EXISTS (SELECT 1 FROM verification_doc_types WHERE label_text = 'Marriage Certificate')`,
    );
    for (const [labelText, spec] of Object.entries(MarriageCertificateDocType1753750000000.SPECS)) {
      await queryRunner.query(`UPDATE verification_doc_types SET ocr_fields = ? WHERE label_text = ?`, [
        JSON.stringify(spec),
        labelText,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM verification_doc_types WHERE label_text = 'Marriage Certificate'`);
    await queryRunner.query(`UPDATE verification_doc_types SET ocr_fields = NULL`);
  }
}
