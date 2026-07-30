import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import dataSource from './data-source';

/**
 * Production seed — creates ONE admin and ONE employee account, nothing else.
 * No demo residents, no census rows, no sample requests.
 *
 *   npm run seed:admin -w @brgy/api
 *
 * Configure via env (all optional):
 *   ADMIN_EMAIL        default admin@brgy591.gov.ph
 *   ADMIN_NAME         default Barangay Administrator
 *   ADMIN_POSITION     default Punong Barangay (Chairman)
 *   ADMIN_PASSWORD     default: random 16 chars, printed ONCE below
 *   EMPLOYEE_EMAIL     default staff@brgy591.gov.ph
 *   EMPLOYEE_NAME      default Barangay Staff
 *   EMPLOYEE_POSITION  default Barangay Secretary
 *   EMPLOYEE_PASSWORD  default: random 16 chars, printed ONCE below
 *
 * Idempotent per role: each account is only created when no active account of
 * that role exists yet; safe to re-run.
 */

interface SeedAccount {
  role: 'ADMIN' | 'EMPLOYEE';
  email: string;
  fullName: string;
  position: string;
  password: string;
  generated: boolean;
}

async function seedAccount(acc: SeedAccount): Promise<boolean> {
  const [{ n }] = await dataSource.query(
    `SELECT COUNT(*) AS n FROM users WHERE role = ? AND is_active = 1`,
    [acc.role],
  );
  if (Number(n) > 0) {
    console.log(`✋ An active ${acc.role.toLowerCase()} account already exists (${n}) — skipped.`);
    return false;
  }
  const [{ taken }] = await dataSource.query(`SELECT COUNT(*) AS taken FROM users WHERE email = ?`, [acc.email]);
  if (Number(taken) > 0) {
    console.error(`✗ ${acc.email} already exists with a different role — pick a different ${acc.role}_EMAIL.`);
    process.exitCode = 1;
    return false;
  }

  const hash = await bcrypt.hash(acc.password, 10);
  await dataSource.query(
    `INSERT INTO users (id, email, full_name, password_hash, role, position, is_active)
     VALUES (UUID(), ?, ?, ?, ?, ?, 1)`,
    [acc.email, acc.fullName, hash, acc.role, acc.position],
  );

  console.log(`✓ ${acc.role === 'ADMIN' ? 'Admin' : 'Employee'} account created:`);
  console.log(`  Email:    ${acc.email}`);
  console.log(`  Name:     ${acc.fullName} — ${acc.position}`);
  if (acc.generated) {
    console.log(`  Password: ${acc.password}`);
    console.log('  ⚠ Save this now — it is generated and will NOT be shown again.');
  } else {
    console.log(`  Password: (from ${acc.role}_PASSWORD env)`);
  }
  return true;
}

async function main(): Promise<void> {
  const accounts: SeedAccount[] = [
    {
      role: 'ADMIN',
      email: (process.env.ADMIN_EMAIL ?? 'admin@brgy591.gov.ph').trim().toLowerCase(),
      fullName: process.env.ADMIN_NAME ?? 'Barangay Administrator',
      position: process.env.ADMIN_POSITION ?? 'Punong Barangay (Chairman)',
      generated: !process.env.ADMIN_PASSWORD,
      password: process.env.ADMIN_PASSWORD ?? randomBytes(12).toString('base64url').slice(0, 16),
    },
    {
      role: 'EMPLOYEE',
      email: (process.env.EMPLOYEE_EMAIL ?? 'staff@brgy591.gov.ph').trim().toLowerCase(),
      fullName: process.env.EMPLOYEE_NAME ?? 'Barangay Staff',
      position: process.env.EMPLOYEE_POSITION ?? 'Barangay Secretary',
      generated: !process.env.EMPLOYEE_PASSWORD,
      password: process.env.EMPLOYEE_PASSWORD ?? randomBytes(12).toString('base64url').slice(0, 16),
    },
  ];

  await dataSource.initialize();
  try {
    let created = 0;
    for (const acc of accounts) {
      if (await seedAccount(acc)) created++;
    }
    if (created > 0) {
      console.log('— No demo data seeded.');
      console.log('  Next: invite more staff from Staff Accounts; residents self-register against the census.');
    } else {
      console.log('   Additional staff should be invited from Staff Accounts inside the portal.');
    }
  } finally {
    await dataSource.destroy();
  }
}

void main();
