import type { StaffModule } from '@brgy/shared';
import { Role, staffCanAccess } from '@brgy/shared';
import { STAFF_MODULES } from '@brgy/shared';
import { NoAccessPage } from '../../features/errors/ErrorPages';
import { useAuthStore } from '../../stores/auth';

/**
 * Route guard for a staff module.
 *
 * The sidebar already hides what an account may not use, but hiding a link is
 * not the same as blocking the page: a typed URL, a bookmark, or the browser's
 * back button would still mount the screen, which then fills with 403s from
 * every request it makes. That reads as a broken page rather than a withheld
 * one, so the section is named and the user told who can grant it.
 *
 * This is convenience and clarity, not security — the API enforces the same
 * grant independently, and that is what actually protects the data.
 */
export function RequireModule({
  module,
  children,
}: {
  module: StaffModule;
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();

  // Admins are never restricted, and residents never reach these routes.
  if (!user || user.role !== Role.EMPLOYEE) return <>{children}</>;
  if (staffCanAccess(user.allowedModules, module)) return <>{children}</>;

  const sectionText = STAFF_MODULES.find((m) => m.key === module)?.labelText;
  return <NoAccessPage sectionText={sectionText} />;
}
