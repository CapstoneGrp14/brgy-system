import { Role } from '@brgy/shared';
import type { IconName } from '../components/ui/Icon';

export interface NavItem {
  path: string;
  /** Line-icon key; rendered by <Icon>. Replaced the old emoji strings. */
  icon: IconName;
  labelText: string;
  sos?: boolean;
}

export interface NavSection {
  labelText: string;
  items: NavItem[];
}

/** Sidebar structure per role — mirrors navFor() in the approved design. */
export const NAV: Record<Role, NavSection[]> = {
  [Role.RESIDENT]: [
    {
      labelText: 'OVERVIEW',
      items: [
        { path: '/resident/dashboard', icon: 'home', labelText: 'Dashboard' },
        { path: '/resident/announcements', icon: 'megaphone', labelText: 'Announcements' },
      ],
    },
    {
      labelText: 'MY REQUESTS',
      items: [
        { path: '/resident/documents', icon: 'document', labelText: 'Document Requests' },
        { path: '/resident/complaints', icon: 'scale', labelText: 'Complaints & Blotter' },
        { path: '/resident/bookings', icon: 'calendar', labelText: 'My Bookings' },
      ],
    },
    {
      labelText: 'SERVICES',
      items: [
        { path: '/resident/health', icon: 'pill', labelText: 'Health & Medicine' },
        { path: '/resident/student', icon: 'student', labelText: 'Student Support' },
        { path: '/resident/sos', icon: 'siren', labelText: 'Emergency SOS', sos: true },
      ],
    },
    {
      labelText: 'ACCOUNT',
      items: [
        { path: '/resident/profile', icon: 'user', labelText: 'My Profile' },
        { path: '/resident/upload', icon: 'paperclip', labelText: 'Upload Documents' },
      ],
    },
  ],
  [Role.EMPLOYEE]: [
    {
      labelText: 'GENERAL',
      items: [
        { path: '/employee/dashboard', icon: 'clipboard', labelText: 'Dashboard' },
        { path: '/employee/charter', icon: 'book', labelText: "Citizen's Charter" },
      ],
    },
    {
      labelText: 'WORKQUEUE',
      items: [
        { path: '/employee/complaints', icon: 'scale', labelText: 'Complaints & Blotter' },
        { path: '/employee/verification', icon: 'user', labelText: 'Resident Verification' },
        { path: '/employee/templates', icon: 'folder', labelText: 'Document Types' },
      ],
    },
    {
      labelText: 'SCHEDULING',
      items: [{ path: '/employee/calendar', icon: 'calendar', labelText: 'Booking Calendar' }],
    },
    {
      labelText: 'SERVICES',
      items: [
        { path: '/employee/health-queue', icon: 'pill', labelText: 'Health & Medicine' },
        { path: '/employee/inventory', icon: 'box', labelText: 'Inventory & Supplies' },
        { path: '/employee/masterlist', icon: 'people', labelText: 'Masterlist Registry' },
      ],
    },
    {
      labelText: 'STUDENT SERVICES',
      items: [{ path: '/employee/student', icon: 'student', labelText: 'Student Support' }],
    },
    {
      labelText: 'COMMUNICATION',
      items: [{ path: '/employee/post', icon: 'megaphone', labelText: 'Post Announcement' }],
    },
    {
      labelText: 'EMERGENCY',
      items: [{ path: '/employee/sos-map', icon: 'map', labelText: 'SOS Map', sos: true }],
    },
  ],
  [Role.ADMIN]: [
    {
      labelText: 'ANALYTICS',
      items: [
        { path: '/admin/overview', icon: 'chart', labelText: 'Dashboard Overview' },
        { path: '/admin/complaints-report', icon: 'report', labelText: 'Complaints Report' },
      ],
    },
    {
      labelText: 'COMPLIANCE',
      items: [
        { path: '/admin/charter', icon: 'book', labelText: "Citizen's Charter" },
        { path: '/admin/arta', icon: 'report', labelText: 'ARTA SLA Report' },
      ],
    },
    {
      labelText: 'RESIDENT REGISTRY',
      items: [{ path: '/admin/masterlist', icon: 'people', labelText: 'Masterlist Registry' }],
    },
    {
      labelText: 'OPERATIONS',
      items: [
        { path: '/admin/announcements', icon: 'megaphone', labelText: 'Announcements' },
        { path: '/admin/health-queue', icon: 'pill', labelText: 'Health & Medicine' },
        { path: '/admin/inventory', icon: 'box', labelText: 'Inventory Overview' },
        { path: '/admin/student', icon: 'student', labelText: 'Student Support' },
      ],
    },
    {
      labelText: 'SYSTEM',
      items: [
        { path: '/admin/staff', icon: 'staff', labelText: 'Staff Accounts' },
        { path: '/admin/templates', icon: 'folder', labelText: 'Document Templates' },
        { path: '/admin/booking-settings', icon: 'calendar', labelText: 'Booking Settings' },
        { path: '/admin/verification-settings', icon: 'shield', labelText: 'Verification Settings' },
        { path: '/admin/assistant-kb', icon: 'robot', labelText: 'Assistant Knowledge' },
        { path: '/admin/audit', icon: 'lock', labelText: 'Audit Log' },
      ],
    },
    {
      labelText: 'EMERGENCY',
      items: [{ path: '/admin/sos-map', icon: 'map', labelText: 'SOS Map', sos: true }],
    },
  ],
};

export function pageTitle(role: Role, pathname: string): string {
  for (const section of NAV[role]) {
    const hit = section.items.find((i) => pathname.startsWith(i.path));
    if (hit) return hit.labelText;
  }
  return 'Dashboard';
}

/** Employee pages show the nav icon next to the header title (per design). */
export function pageIcon(role: Role, pathname: string): IconName | null {
  if (role !== Role.EMPLOYEE) return null;
  for (const section of NAV[role]) {
    const hit = section.items.find((i) => pathname.startsWith(i.path));
    if (hit) return hit.icon;
  }
  return null;
}
