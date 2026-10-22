import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bookings on behalf of a minor in the household.
 *
 * Printing requests already carry a beneficiary because they are service
 * requests; bookings are their own table and needed the same column. A parent
 * reserving the covered court for a child's event is the ordinary case, and
 * without this the booking records only the adult who filed it.
 */
export class BookingBeneficiary1753790000000 implements MigrationInterface {
  name = 'BookingBeneficiary1753790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD COLUMN beneficiary_census_record_id VARCHAR(36) NULL AFTER user_id,
      ADD CONSTRAINT fk_bookings_beneficiary
        FOREIGN KEY (beneficiary_census_record_id) REFERENCES census_records(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bookings DROP FOREIGN KEY fk_bookings_beneficiary`);
    await queryRunner.query(`ALTER TABLE bookings DROP COLUMN beneficiary_census_record_id`);
  }
}
