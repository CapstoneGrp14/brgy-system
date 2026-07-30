import { Role } from '@brgy/shared';

export interface NavItem {
  path: string;
  icon: string;
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
        { path: '/resident/dashboard', icon: '🏠', labelText: 'Dashboard' },
        { path: '/resident/announcements', icon: '📢', labelText: 'Announcements' },
      ],
    },
    {
      labelText: 'MY REQUESTS',
      items: [
        { path: '/resident/documents', icon: '📄', labelText: 'Document Requests' },
        { path: '/resident/complaints', icon: '⚖️', labelText: 'Complaints & Blotter' },
        { path: '/resident/bookings', icon: '📅', labelText: 'My Bookings' },
      ],
    },
    {
      labelText: 'SERVICES',
      items: [
        { path: '/resident/health', icon: '💊', labelText: 'Health & Medicine' },
        { path: '/resident/student', icon: '🎓', labelText: 'Student Support' },
        { path: '/resident/sos', icon: '🆘', labelText: 'Emergency SOS', sos: true },
      ],
    },
    {
      labelText: 'ACCOUNT',
      items: [
        { path: '/resident/profile', icon: '👤', labelText: 'My Profile' },
        { path: '/resident/upload', icon: '📎', labelText: 'Upload Documents' },
      ],
    },
  ],
  [Role.EMPLOYEE]: [
    {
      labelText: 'GENERAL',
      items: [
        { path: '/employee/dashboard', icon: '📋', labelText: 'Dashboard' },
        { path: '/employee/charter', icon: '📖', labelText: "Citizen's Charter" },
      ],
    },
    {
      labelText: 'WORKQUEUE',
      items: [
        { path: '/employee/complaints', icon: '⚖️', labelText: 'Complaints & Blotter' },
        { path: '/employee/verification', icon: '👤', labelText: 'Resident Verification' },
        { path: '/employee/templates', icon: '📁', labelText: 'Document Types' },
      ],
    },
    {
      labelText: 'SCHEDULING',
      items: [{ path: '/employee/calendar', icon: '📅', labelText: 'Booking Calendar' }],
    },
    {
      labelText: 'SERVICES',
      items: [
        { path: '/employee/health-queue', icon: '💊', labelText: 'Health & Medicine' },
        { path: '/employee/inventory', icon: '📦', labelText: 'Inventory & Supplies' },
        { path: '/employee/masterlist', icon: '👥', labelText: 'Masterlist Registry' },
      ],
    },
    {
      labelText: 'STUDENT SERVICES',
      items: [{ path: '/employee/student', icon: '🎓', labelText: 'Student Support' }],
    },
    {
      labelText: 'COMMUNICATION',
      items: [{ path: '/employee/post', icon: '📢', labelText: 'Post Announcement' }],
    },
    {
      labelText: 'EMERGENCY',
      items: [{ path: '/employee/sos-map', icon: '🆘', labelText: 'SOS Map', sos: true }],
    },
  ],
  [Role.ADMIN]: [
    {
      labelText: 'ANALYTICS',
      items: [
        { path: '/admin/overview', icon: '📊', labelText: 'Dashboard Overview' },
        { path: '/admin/complaints-report', icon: '⚖️', labelText: 'Complaints Report' },
      ],
    },
    {
      labelText: 'COMPLIANCE',
      items: [
        { path: '/admin/charter', icon: '📖', labelText: "Citizen's Charter" },
        { path: '/admin/arta', icon: '📑', labelText: 'ARTA SLA Report' },
      ],
    },
    {
      labelText: 'RESIDENT REGISTRY',
      items: [{ path: '/admin/masterlist', icon: '👥', labelText: 'Masterlist Registry' }],
    },
    {
      labelText: 'OPERATIONS',
      items: [
        { path: '/admin/announcements', icon: '📢', labelText: 'Announcements' },
        { path: '/admin/health-queue', icon: '💊', labelText: 'Health & Medicine' },
        { path: '/admin/inventory', icon: '📦', labelText: 'Inventory Overview' },
        { path: '/admin/student', icon: '🎓', labelText: 'Student Support' },
      ],
    },
    {
      labelText: 'SYSTEM',
      items: [
        { path: '/admin/staff', icon: '🧑‍💼', labelText: 'Staff Accounts' },
        { path: '/admin/templates', icon: '📁', labelText: 'Document Templates' },
        { path: '/admin/booking-settings', icon: '🗓️', labelText: 'Booking Settings' },
        { path: '/admin/verification-settings', icon: '🪪', labelText: 'Verification Settings' },
        { path: '/admin/assistant-kb', icon: '🤖', labelText: 'Assistant Knowledge' },
        { path: '/admin/audit', icon: '🔒', labelText: 'Audit Log' },
      ],
    },
    {
      labelText: 'EMERGENCY',
      items: [{ path: '/admin/sos-map', icon: '🆘', labelText: 'SOS Map', sos: true }],
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
export function pageIcon(role: Role, pathname: string): string | null {
  if (role !== Role.EMPLOYEE) return null;
  for (const section of NAV[role]) {
    const hit = section.items.find((i) => pathname.startsWith(i.path));
    if (hit) return hit.icon;
  }
  return null;
}
