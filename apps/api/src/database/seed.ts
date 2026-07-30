import 'reflect-metadata';
import { CensusCategory, Role, VerificationStatus } from '@brgy/shared';
import * as bcrypt from 'bcryptjs';
import { computeDueAt } from '../common/sla';
import dataSource from './data-source';
import { RequestStatus, RequestType, SlaClass } from '@brgy/shared';

/**
 * Demo seed — mirrors the sample data in the approved UI design so the app
 * demos like the mockup out of the box. Idempotent: safe to re-run.
 *
 *   npm run seed -w @brgy/api
 */

const CENSUS: Array<{
  fullName: string;
  address: string;
  purok: string;
  category: CensusCategory;
  lguEligibility: string | null;
  birthdate: string;
  householdCode: string;
}> = [
  { fullName: 'Antonette Potolin', address: '258-F Albina Teresa St. Sta. Mesa, Manila', purok: 'Purok 2', category: CensusCategory.REGULAR, lguEligibility: null, birthdate: '2004-03-14', householdCode: 'HH-0001' },
  { fullName: 'Miguel Potolin', address: '258-F Albina Teresa St. Sta. Mesa, Manila', purok: 'Purok 2', category: CensusCategory.REGULAR, lguEligibility: null, birthdate: '2013-08-02', householdCode: 'HH-0001' },
  { fullName: 'Ricardo Santos', address: '145 Old Sta. Mesa', purok: 'Purok 3', category: CensusCategory.SENIOR, lguEligibility: 'Eligible (Local)', birthdate: '1958-11-23', householdCode: 'HH-0002' },
  { fullName: 'Maria Tolentino', address: '112 Old Sta. Mesa', purok: 'Purok 3', category: CensusCategory.PWD, lguEligibility: 'Eligible (Local)', birthdate: '1979-06-10', householdCode: 'HH-0003' },
  { fullName: 'Lorna Cruz', address: 'Purok 4', purok: 'Purok 4', category: CensusCategory.SOLO_PARENT, lguEligibility: 'Eligible', birthdate: '1990-01-30', householdCode: 'HH-0004' },
  { fullName: 'Eduardo Reyes', address: 'Purok 3', purok: 'Purok 3', category: CensusCategory.SENIOR, lguEligibility: 'Not Eligible', birthdate: '1955-04-18', householdCode: 'HH-0005' },
  { fullName: 'Juan Dela Cruz', address: '102 Old Sta. Mesa', purok: 'Purok 1', category: CensusCategory.REGULAR, lguEligibility: null, birthdate: '1996-09-05', householdCode: 'HH-0006' },
  { fullName: 'Leonor Rivera', address: 'Purok 2', purok: 'Purok 2', category: CensusCategory.SOLO_PARENT, lguEligibility: 'Not Eligible', birthdate: '1988-12-12', householdCode: 'HH-0007' },
  { fullName: 'Crisostomo Ibarra', address: 'Purok 5', purok: 'Purok 5', category: CensusCategory.PWD, lguEligibility: 'Eligible (National)', birthdate: '1985-02-19', householdCode: 'HH-0008' },
  { fullName: 'Mark Reyes', address: 'Purok 1', purok: 'Purok 1', category: CensusCategory.REGULAR, lguEligibility: null, birthdate: '1999-07-07', householdCode: 'HH-0005' },
  // Staff who is also a resident (dual role demo).
  { fullName: 'William B. Castro', address: '77 Teresa St.', purok: 'Purok 1', category: CensusCategory.REGULAR, lguEligibility: null, birthdate: '1992-05-21', householdCode: 'HH-0009' },
  { fullName: 'Rosario Manalang', address: 'Purok 3', purok: 'Purok 3', category: CensusCategory.REGULAR, lguEligibility: null, birthdate: '1983-10-01', householdCode: 'HH-0003' },
];

const USERS: Array<{
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  verified?: boolean;
}> = [
  {
    email: 'antonette@gmail.com',
    fullName: 'Antonette Potolin',
    phone: '09947803740',
    role: Role.RESIDENT,
  },
  {
    email: 'w.castro@brgy591.gov.ph',
    fullName: 'William B. Castro',
    phone: null,
    role: Role.EMPLOYEE,
  },
  {
    email: 'chairman@brgy591.gov.ph',
    fullName: 'Adrian O. Perlas',
    phone: null,
    role: Role.ADMIN,
  },
  // Verified residents so the staff queue demos like the design.
  { email: 'ricardo@example.com', fullName: 'Ricardo Santos', phone: null, role: Role.RESIDENT, verified: true },
  { email: 'lorna@example.com', fullName: 'Lorna Cruz', phone: null, role: Role.RESIDENT, verified: true },
  { email: 'maria.t@example.com', fullName: 'Maria Tolentino', phone: null, role: Role.RESIDENT, verified: true },
  { email: 'juan@example.com', fullName: 'Juan Dela Cruz', phone: null, role: Role.RESIDENT, verified: true },
  { email: 'eduardo@example.com', fullName: 'Eduardo Reyes', phone: null, role: Role.RESIDENT, verified: true },
  { email: 'rosario@example.com', fullName: 'Rosario Manalang', phone: null, role: Role.RESIDENT, verified: true },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

/** Sample requests mirroring the design's queue rows. Seeded only when the table is empty. */
const SAMPLE_REQUESTS: Array<{
  email: string;
  type: RequestType;
  subtype: string;
  title: string;
  purpose: string | null;
  sla: SlaClass;
  status: RequestStatus;
  filedDaysAgo: number;
}> = [
  { email: 'antonette@gmail.com', type: RequestType.DOCUMENT, subtype: 'BARANGAY_CLEARANCE', title: 'Barangay Clearance', purpose: 'Employment', sla: SlaClass.SIMPLE_3, status: RequestStatus.PROCESSING, filedDaysAgo: 1 },
  { email: 'ricardo@example.com', type: RequestType.DOCUMENT, subtype: 'INDIGENCY_CERTIFICATE', title: 'Certificate of Indigency', purpose: 'Medical assistance', sla: SlaClass.SIMPLE_3, status: RequestStatus.PENDING, filedDaysAgo: 0 },
  // Filed long ago and still pending — the ARTA sweeper flags this OVERDUE.
  { email: 'lorna@example.com', type: RequestType.DOCUMENT, subtype: 'FTJS_CERTIFICATION', title: 'FTJS Certification', purpose: 'First Time Jobseeker', sla: SlaClass.COMPLEX_7, status: RequestStatus.PENDING, filedDaysAgo: 12 },
  { email: 'rosario@example.com', type: RequestType.CCTV, subtype: 'CCTV_FOOTAGE', title: 'CCTV Footage Request', purpose: 'Property damage dispute', sla: SlaClass.TECHNICAL_20, status: RequestStatus.PENDING, filedDaysAgo: 2 },
  { email: 'eduardo@example.com', type: RequestType.MEDICINE, subtype: 'PARACETAMOL', title: 'Free Medicine — Paracetamol', purpose: null, sla: SlaClass.SIMPLE_3, status: RequestStatus.READY, filedDaysAgo: 1 },
  { email: 'maria.t@example.com', type: RequestType.EQUIPMENT, subtype: 'NEBULIZER', title: 'Nebulizer Lending', purpose: null, sla: SlaClass.SIMPLE_3, status: RequestStatus.PENDING, filedDaysAgo: 2 },
  { email: 'juan@example.com', type: RequestType.DOCUMENT, subtype: 'RESIDENCY_CERTIFICATE', title: 'Certificate of Residency', purpose: 'School requirement', sla: SlaClass.SIMPLE_3, status: RequestStatus.PENDING, filedDaysAgo: 0 },
];

const DEMO_PASSWORD = 'password123';

async function main() {
  await dataSource.initialize();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const record of CENSUS) {
    let [household] = await dataSource.query('SELECT id FROM households WHERE code = ? LIMIT 1', [
      record.householdCode,
    ]);
    if (!household) {
      await dataSource.query(
        'INSERT INTO households (id, code, address, purok) VALUES (UUID(), ?, ?, ?)',
        [record.householdCode, record.address, record.purok],
      );
      [household] = await dataSource.query('SELECT id FROM households WHERE code = ?', [
        record.householdCode,
      ]);
      console.log(`household + ${record.householdCode}`);
    }

    const existing = await dataSource.query(
      'SELECT id FROM census_records WHERE full_name = ? LIMIT 1',
      [record.fullName],
    );
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO census_records (id, full_name, address, purok, category, lgu_eligibility, birthdate, household_id)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
        [record.fullName, record.address, record.purok, record.category, record.lguEligibility, record.birthdate, household.id],
      );
      console.log(`census + ${record.fullName}`);
    } else {
      // Backfill birthdate/household on records seeded before this schema existed.
      await dataSource.query(
        `UPDATE census_records SET birthdate = COALESCE(birthdate, ?), household_id = COALESCE(household_id, ?) WHERE id = ?`,
        [record.birthdate, household.id, existing[0].id],
      );
    }
  }

  for (const spec of USERS) {
    const existing = await dataSource.query('SELECT id FROM users WHERE email = ? LIMIT 1', [
      spec.email,
    ]);
    let userId: string;
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO users (id, email, phone, full_name, password_hash, role)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
        [spec.email, spec.phone, spec.fullName, passwordHash, spec.role],
      );
      const [row] = await dataSource.query('SELECT id FROM users WHERE email = ?', [spec.email]);
      userId = row.id;
      console.log(`user   + ${spec.email} (${spec.role})`);
    } else {
      userId = existing[0].id;
    }

    if (spec.role === Role.RESIDENT) {
      const profile = await dataSource.query(
        'SELECT id FROM resident_profiles WHERE user_id = ? LIMIT 1',
        [userId],
      );
      if (profile.length === 0) {
        const [census] = await dataSource.query(
          'SELECT id, address, purok FROM census_records WHERE full_name = ? LIMIT 1',
          [spec.fullName],
        );
        await dataSource.query(
          `INSERT INTO resident_profiles
             (id, user_id, census_record_id, verification_status, address, purok, birthdate, civil_status)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            census?.id ?? null,
            spec.verified ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
            census?.address ?? null,
            census?.purok ?? null,
            spec.email === 'antonette@gmail.com' ? '2004-03-14' : null,
            spec.email === 'antonette@gmail.com' ? 'Single' : null,
          ],
        );
        console.log(`profile+ ${spec.fullName}`);
      }
    }
  }

  // Dual-role demo: William (Employee) is also in the census → link a resident profile.
  const [william] = await dataSource.query(
    "SELECT id FROM users WHERE email = 'w.castro@brgy591.gov.ph'",
  );
  if (william) {
    const [existingProfile] = await dataSource.query(
      'SELECT id FROM resident_profiles WHERE user_id = ?',
      [william.id],
    );
    if (!existingProfile) {
      const [wCensus] = await dataSource.query(
        "SELECT id, address, purok, birthdate FROM census_records WHERE full_name = 'William B. Castro'",
      );
      if (wCensus) {
        await dataSource.query(
          `INSERT INTO resident_profiles (id, user_id, census_record_id, verification_status, address, purok, birthdate)
           VALUES (UUID(), ?, ?, 'VERIFIED', ?, ?, ?)`,
          [william.id, wCensus.id, wCensus.address, wCensus.purok, wCensus.birthdate],
        );
        console.log('profile+ William B. Castro (dual role staff+resident)');
      }
    }
  }

  const [{ n: requestCount }] = await dataSource.query(
    'SELECT COUNT(*) AS n FROM service_requests',
  );
  if (Number(requestCount) === 0) {
    for (const r of SAMPLE_REQUESTS) {
      const [user] = await dataSource.query('SELECT id, full_name FROM users WHERE email = ?', [
        r.email,
      ]);
      if (!user) continue;
      const filedAt = daysAgo(r.filedDaysAgo);
      const dueAt = computeDueAt(filedAt, r.sla);
      await dataSource.query(
        `INSERT INTO service_requests
           (id, user_id, type, subtype, title, purpose, sla_class, status, due_at, filed_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, r.type, r.subtype, r.title, r.purpose, r.sla, r.status, dueAt, filedAt],
      );
      const [req] = await dataSource.query(
        'SELECT id FROM service_requests WHERE user_id = ? AND title = ? LIMIT 1',
        [user.id, r.title],
      );
      await dataSource.query(
        `INSERT INTO request_events (request_id, actor_label, from_status, to_status, note, at)
         VALUES (?, ?, NULL, 'PENDING', ?, ?)`,
        [req.id, `${user.full_name} (Resident)`, r.purpose, filedAt],
      );
      console.log(`request+ ${r.title} (${r.status})`);
    }
  }

  console.log(`\nSeed complete. Demo password for all accounts: ${DEMO_PASSWORD}`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
