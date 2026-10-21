import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Head of family, and requests filed on a minor's behalf.
 *
 * Barangays maintain households so they can see who lives where and who depends
 * on whom. The registry already grouped census records into households; this
 * names the head, and lets that head transact for the minors in their household
 * without those children needing portal accounts of their own — which the
 * account age limit prevents anyway.
 *
 * `beneficiary_census_record_id` is the person the document is FOR. Null means
 * the filer requested it for themselves, which is every existing row.
 */
export class HouseholdHeadAndBeneficiary1753760000000 implements MigrationInterface {
  name = 'HouseholdHeadAndBeneficiary1753760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE households
      ADD COLUMN head_census_record_id VARCHAR(36) NULL AFTER purok,
      ADD CONSTRAINT fk_households_head
        FOREIGN KEY (head_census_record_id) REFERENCES census_records(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE service_requests
      ADD COLUMN beneficiary_census_record_id VARCHAR(36) NULL AFTER user_id,
      ADD CONSTRAINT fk_requests_beneficiary
        FOREIGN KEY (beneficiary_census_record_id) REFERENCES census_records(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE service_requests DROP FOREIGN KEY fk_requests_beneficiary`);
    await queryRunner.query(`ALTER TABLE service_requests DROP COLUMN beneficiary_census_record_id`);
    await queryRunner.query(`ALTER TABLE households DROP FOREIGN KEY fk_households_head`);
    await queryRunner.query(`ALTER TABLE households DROP COLUMN head_census_record_id`);
  }
}
