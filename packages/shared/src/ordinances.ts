/**
 * City ordinances the barangay actually enforces.
 *
 * Residents routinely bring matters the barangay has no authority over, wait on
 * a 20-day mediation clock, and only then learn they should have gone to the
 * police or the city. Publishing the list in the complaint form is the cheapest
 * way to set that expectation before anything is filed.
 *
 * Scope note: this is what the barangay can act on directly. Disputes between
 * neighbours still go through Katarungang Pambarangay regardless; serious
 * crimes are refused at submission and routed to the PNP.
 */

export interface Ordinance {
  /** Citation as printed on notices, e.g. "Ordinance No. 8572". */
  reference: string;
  /** What it actually covers, in words a resident would use. */
  covers: string;
}

export interface OrdinanceGroup {
  labelText: string;
  items: Ordinance[];
}

export const BARANGAY_ORDINANCES: ReadonlyArray<OrdinanceGroup> = [
  {
    labelText: 'Noise Disturbances (Anti-Noise Ordinance)',
    items: [
      {
        reference: 'Ordinance No. 4708 / R.O. 1600 (Section 848)',
        covers:
          'Loud or boisterous noise, and high-volume equipment such as videoke or jukeboxes, between 9:00 PM and 6:00 AM and during siesta hours from 1:00 PM to 3:00 PM.',
      },
    ],
  },
  {
    labelText: 'Public Nuisance, Obstruction, and Sanitation',
    items: [
      {
        reference: 'Ordinance No. 8572',
        covers:
          'Illegal garbage disposal, public urination, littering, and pet defecation outside property lines.',
      },
      {
        reference: 'Ordinance No. 8354',
        covers:
          'All forms of road and sidewalk obstruction, particularly near hospitals and public areas.',
      },
      {
        reference: 'MMDA Resolution 02-28',
        covers:
          'Personal or commercial use of sidewalks — hanging laundry, vehicle repair, or setting up animal cages.',
      },
    ],
  },
  {
    labelText: 'Public Order and Safety',
    items: [
      {
        reference: 'Ordinance No. 8548',
        covers:
          'Gender-based street harassment, including catcalling and wolf-whistling in public spaces.',
      },
      {
        reference: 'Ordinance No. 8563 (OVR System)',
        covers:
          'How violations are processed: the violator receives an Ordinance Violation Receipt and must settle the fine or complete community service within 5 days to avoid detention.',
      },
    ],
  },
];
