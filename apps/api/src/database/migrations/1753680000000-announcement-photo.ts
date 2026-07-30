import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnnouncementPhoto1753680000000 implements MigrationInterface {
  name = 'AnnouncementPhoto1753680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE announcements ADD COLUMN photo_key VARCHAR(255) NULL AFTER channel_email`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE announcements DROP COLUMN photo_key`);
  }
}
