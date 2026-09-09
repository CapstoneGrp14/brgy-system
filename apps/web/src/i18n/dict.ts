/**
 * Merged English → Filipino dictionary. Each area contributes its own file
 * under ./dict/ so translations stay close to the feature they belong to and
 * multiple areas can be edited without collisions. Later spreads win on key
 * collisions, so keep shared/common phrases in `common`.
 */
import { common } from './dict/common';
import { shell } from './dict/shell';
import { auth } from './dict/auth';
import { dashboard } from './dict/dashboard';
import { documents } from './dict/documents';
import { complaints } from './dict/complaints';
import { bookings } from './dict/bookings';
import { health } from './dict/health';
import { inventory } from './dict/inventory';
import { masterlist } from './dict/masterlist';
import { verification } from './dict/verification';
import { announcements } from './dict/announcements';
import { charter } from './dict/charter';
import { analytics } from './dict/analytics';
import { sos } from './dict/sos';
import { staff } from './dict/staff';
import { student } from './dict/student';
import { templates } from './dict/templates';
import { assistant } from './dict/assistant';
import { profile } from './dict/profile';
import { misc } from './dict/misc';

export const dict: Record<string, string> = {
  ...common,
  ...shell,
  ...auth,
  ...dashboard,
  ...documents,
  ...complaints,
  ...bookings,
  ...health,
  ...inventory,
  ...masterlist,
  ...verification,
  ...announcements,
  ...charter,
  ...analytics,
  ...sos,
  ...staff,
  ...student,
  ...templates,
  ...assistant,
  ...profile,
  ...misc,
};
