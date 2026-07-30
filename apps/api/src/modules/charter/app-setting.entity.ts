import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Generic key → JSON settings store (first tenant: the Citizen's Charter). */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ name: 'setting_key', type: 'varchar', length: 40 })
  key: string;

  @Column({ type: 'json' })
  value: unknown;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
