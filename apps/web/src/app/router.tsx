import { Role } from '@brgy/shared';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PortalLayout } from '../components/shell/PortalLayout';
import { RequireModule } from '../components/shell/RequireModule';
import { RequireVerified } from '../components/shell/RequireVerified';
import { BookingCalendarPage } from '../features/bookings/BookingCalendarPage';
import { BookingSettingsPage } from '../features/bookings/BookingSettingsPage';
import { BookingsPage } from '../features/bookings/BookingsPage';
import { HealthPage } from '../features/health/HealthPage';
import { HealthQueuePage } from '../features/health/HealthQueuePage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { StaffStudentQueuePage } from '../features/student/StaffStudentQueuePage';
import { StudentSupportPage } from '../features/student/StudentSupportPage';
import { ResidentComplaintsPage } from '../features/complaints/ResidentComplaintsPage';
import { StaffComplaintsPage } from '../features/complaints/StaffComplaintsPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { AcceptInvitePage } from '../features/auth/AcceptInvitePage';
import { AdminOverviewPage } from '../features/analytics/AdminOverviewPage';
import { ArtaReportPage } from '../features/analytics/ArtaReportPage';
import { AuditLogPage } from '../features/analytics/AuditLogPage';
import { ComplaintsReportPage } from '../features/analytics/ComplaintsReportPage';
import { AnnouncementsFeedPage } from '../features/announcements/AnnouncementsFeedPage';
import { ErrorBoundaryPage, NotFoundPage } from '../features/errors/ErrorPages';
import { AssistantKnowledgePage } from '../features/assistant/AssistantKnowledgePage';
import { PostAnnouncementPage } from '../features/announcements/PostAnnouncementPage';
import { CharterPage } from '../features/charter/CharterPage';
import { ResidentDashboard } from '../features/dashboard/ResidentDashboard';
import { EmployeeDashboard } from '../features/dashboard/EmployeeDashboard';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { MasterlistPage } from '../features/masterlist/MasterlistPage';
import { PlaceholderPage } from '../features/placeholder/PlaceholderPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SosMapPage } from '../features/sos/SosMapPage';
import { SosPage } from '../features/sos/SosPage';
import { StaffPage } from '../features/staff/StaffPage';
import { TemplatesPage } from '../features/templates/TemplatesPage';
import { UploadPage } from '../features/verification/UploadPage';
import { VerificationPage } from '../features/verification/VerificationPage';
import { VerificationSettingsPage } from '../features/verification/VerificationSettingsPage';

const ph = (phase: number, feature: string) => <PlaceholderPage phase={phase} feature={feature} />;

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },

  {
    path: '/resident',
    element: <PortalLayout role={Role.RESIDENT} />,
    errorElement: <ErrorBoundaryPage />,
    children: [
      { index: true, element: <Navigate to="/resident/dashboard" replace /> },
      { path: 'dashboard', element: <ResidentDashboard /> },
      { path: 'announcements', element: <AnnouncementsFeedPage /> },
      { path: 'documents', element: <RequireVerified><DocumentsPage /></RequireVerified> },
      { path: 'complaints', element: <RequireVerified><ResidentComplaintsPage /></RequireVerified> },
      { path: 'bookings', element: <RequireVerified><BookingsPage /></RequireVerified> },
      { path: 'health', element: <RequireVerified><HealthPage /></RequireVerified> },
      { path: 'student', element: <RequireVerified><StudentSupportPage /></RequireVerified> },
      { path: 'sos', element: <SosPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'upload', element: <UploadPage /> },
      { path: '*', element: <NotFoundPage inShell /> },
    ],
  },
  {
    path: '/employee',
    element: <PortalLayout role={Role.EMPLOYEE} />,
    errorElement: <ErrorBoundaryPage />,
    children: [
      { index: true, element: <Navigate to="/employee/dashboard" replace /> },
      { path: 'dashboard', element: <EmployeeDashboard /> },
      { path: 'charter', element: <RequireModule module="charter"><CharterPage /></RequireModule> },
      { path: 'complaints', element: <RequireModule module="complaints"><StaffComplaintsPage /></RequireModule> },
      { path: 'verification', element: <RequireModule module="verification"><VerificationPage /></RequireModule> },
      { path: 'calendar', element: <RequireModule module="calendar"><BookingCalendarPage /></RequireModule> },
      { path: 'health-queue', element: <RequireModule module="health"><HealthQueuePage /></RequireModule> },
      { path: 'inventory', element: <RequireModule module="inventory"><InventoryPage /></RequireModule> },
      { path: 'masterlist', element: <RequireModule module="masterlist"><MasterlistPage /></RequireModule> },
      { path: 'student', element: <RequireModule module="student"><StaffStudentQueuePage /></RequireModule> },
      { path: 'post', element: <RequireModule module="announcements"><PostAnnouncementPage /></RequireModule> },
      { path: 'templates', element: <RequireModule module="templates"><TemplatesPage /></RequireModule> },
      { path: 'sos-map', element: <RequireModule module="sos"><SosMapPage /></RequireModule> },
      { path: '*', element: <NotFoundPage inShell /> },
    ],
  },
  {
    path: '/admin',
    element: <PortalLayout role={Role.ADMIN} />,
    errorElement: <ErrorBoundaryPage />,
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: 'overview', element: <AdminOverviewPage /> },
      { path: 'complaints-report', element: <ComplaintsReportPage /> },
      { path: 'charter', element: <CharterPage /> },
      { path: 'arta', element: <ArtaReportPage /> },
      { path: 'masterlist', element: <MasterlistPage /> },
      { path: 'announcements', element: <PostAnnouncementPage /> },
      { path: 'health-queue', element: <HealthQueuePage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'student', element: <StaffStudentQueuePage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'booking-settings', element: <BookingSettingsPage /> },
      { path: 'verification-settings', element: <VerificationSettingsPage /> },
      { path: 'assistant-kb', element: <AssistantKnowledgePage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'sos-map', element: <SosMapPage /> },
      { path: 'audit', element: <AuditLogPage /> },
      { path: '*', element: <NotFoundPage inShell /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
