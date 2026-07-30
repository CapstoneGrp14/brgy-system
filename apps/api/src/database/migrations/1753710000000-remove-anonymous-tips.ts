import { MigrationInterface, QueryRunner } from 'typeorm';

/** Drops the retired anonymous-tip feature: purges tip rows and removes the enum value. */
export class RemoveAnonymousTips1753710000000 implements MigrationInterface {
  name = 'RemoveAnonymousTips1753710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM complaints WHERE source = 'ANONYMOUS_TIP'`);
    await queryRunner.query(`
      ALTER TABLE complaints
        MODIFY source ENUM('RESIDENT_FORM','MANUAL_BLOTTER') NOT NULL DEFAULT 'RESIDENT_FORM'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE complaints
        MODIFY source ENUM('RESIDENT_FORM','MANUAL_BLOTTER','ANONYMOUS_TIP') NOT NULL DEFAULT 'RESIDENT_FORM'
    `);
  }
}
