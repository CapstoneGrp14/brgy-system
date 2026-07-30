import { CharterContent } from '@brgy/shared';

/** Transcribed from the official Barangay 591 Citizens' Charter board (Zone 58, Dist. 6). */
export const DEFAULT_CHARTER: CharterContent = {
  vision:
    'A model Barangay that leads its Constituents for growth, development and God centered.',
  mission:
    'To practice Good Governance with confidence and trust to a better community that lives peacefully.',
  email: 'brgy591dist6@gmail.com',
  address: '290 Teresa St., Sta. Mesa, Manila',
  services: [
    {
      service: 'Barangay Certification and Certificate of Indigency',
      requirement: 'One (1) valid ID',
      client: 'Constituents with 6 months residency',
      officer: 'Punong Barangay / Barangay Secretary / Treasurer or Duty Officer of the Day',
      steps: [
        'Verify if included in the list of Records of Barangay Inhabitants (RBI)',
        'Bring one valid I.D.',
        'Fill up the request form',
        'Short interview of the applicant',
      ],
      fees: 'FREE',
      processingTime: 'One (1) day (except Sunday)',
      form: 'Basic Information Form',
    },
    {
      service: 'Properties and Equipment (tent, tables, chairs, and nebulizer)',
      requirement: 'One (1) valid ID',
      client: 'Barangay 591 constituents exclusively',
      officer: 'Duty Officer of the Day, Punong Barangay, and Barangay Caretaker',
      steps: [
        'Bring one valid I.D.',
        'Fill up the request form — complete the details needed, especially the purpose of the request',
        'Reserve at least one week before the event or activity',
        'Sign the terms and conditions for the properties',
      ],
      fees: 'FREE',
      processingTime: 'One week before the event/activity (penalty or fine for late return and damaged items)',
      form: "Borrower's Form",
    },
    {
      service: 'Issuance of Barangay ID',
      requirement: 'Database form & ID picture',
      client: 'Constituents',
      officer: 'Punong Barangay / Barangay Secretary',
      steps: [
        'Verify if included in the list of Records of Barangay Inhabitants (RBI)',
        'Get and fill up the database form from the Secretary',
      ],
      fees: 'FREE',
      processingTime: 'One (1) week',
      form: 'Basic Information Form',
    },
    {
      service: 'Filing of Blotter / Complaints',
      requirement: 'Blotter / Complaint form',
      client: 'Complainant',
      officer: 'Punong Barangay, Secretary, VAWC Desk Officer & Duty Officer of the Day',
      steps: ['Fill up the blotter form', 'Brief interview of the complainant'],
      fees: 'FREE',
      processingTime: 'Within the day',
      form: 'Blotter & Complaint Form',
    },
  ],
};
