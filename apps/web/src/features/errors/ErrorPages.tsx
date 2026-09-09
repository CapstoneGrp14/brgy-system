import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router-dom';
import { btnPrimary } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { roleHome, useAuthStore } from '../../stores/auth';

function ErrorShell({
  code,
  titleText,
  message,
  children,
  fullPage,
}: {
  code: string;
  titleText: string;
  message: string;
  children?: React.ReactNode;
  fullPage?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: fullPage ? '100dvh' : '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        ...(fullPage ? { background: '#F0F4FA' } : {}),
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #E3E8F0',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(23,43,77,.10)',
          padding: '46px 42px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ font: '800 22px Poppins, sans-serif', color: '#F4A62A', letterSpacing: 1 }}>
          591 <span style={{ font: '600 10px Poppins, sans-serif', color: '#7E8CA3', letterSpacing: 2 }}>BARANGAY PORTAL</span>
        </div>
        <div
          style={{
            font: '800 84px Poppins, sans-serif',
            color: '#1E3A5F',
            lineHeight: 1.1,
            marginTop: 18,
            textShadow: '4px 4px 0 #F0F5FF',
          }}
        >
          {code}
        </div>
        <h1 style={{ margin: '10px 0 0', font: '700 18px Poppins, sans-serif', color: '#1E3A5F' }}>{titleText}</h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: '10px 0 24px', lineHeight: 1.65 }}>{message}</p>
        {children}
        <p style={{ fontSize: 11.5, color: '#9AA6B7', margin: '22px 0 0' }}>
          Barangay 591 · Zone 58, District VI, Sta. Mesa, Manila
        </p>
      </div>
    </div>
  );
}

/** 404 — unknown routes, inside or outside the portal shell. */
export function NotFoundPage({ inShell = false }: { inShell?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const home = user ? roleHome(user.role) : '/login';
  const t = useT();

  return (
    <ErrorShell
      code="404"
      titleText={t('Page not found po')}
      message={t(
        "The page you're looking for doesn't exist or may have been moved. Check the address, or head back to your dashboard.",
      )}
      fullPage={!inShell}
    >
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to={home} style={{ ...btnPrimary, width: 'auto', padding: '11px 22px', textDecoration: 'none', display: 'inline-block' }}>
          🏠 {user ? t('Go to Dashboard') : t('Go to Sign In')}
        </Link>
        <button
          onClick={() => navigate(-1)}
          style={{ background: '#fff', border: '2px solid #DCE3EE', color: '#2E3A52', borderRadius: 9, padding: '11px 20px', font: '700 13.5px Poppins, sans-serif', cursor: 'pointer' }}
        >
          {t('← Go Back')}
        </button>
      </div>
    </ErrorShell>
  );
}

/** Route error boundary — render/runtime crashes and thrown responses. */
export function ErrorBoundaryPage() {
  const error = useRouteError();
  const user = useAuthStore((s) => s.user);
  const home = user ? roleHome(user.role) : '/login';
  const t = useT();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  const detail =
    isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : error instanceof Error
        ? error.message
        : t('Unknown error');

  return (
    <ErrorShell
      code="Oops"
      titleText={t('Something went wrong')}
      message={t(
        'An unexpected error occurred while loading this page. Try again — if it keeps happening, please report it at the barangay hall front desk.',
      )}
      fullPage
    >
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => window.location.reload()} style={{ ...btnPrimary, width: 'auto', padding: '11px 22px' }}>
          {t('🔄 Try Again')}
        </button>
        <Link
          to={home}
          onClick={() => setTimeout(() => window.location.assign(home), 0)}
          style={{ background: '#fff', border: '2px solid #DCE3EE', color: '#2E3A52', borderRadius: 9, padding: '11px 20px', font: '700 13.5px Poppins, sans-serif', textDecoration: 'none', display: 'inline-block' }}
        >
          🏠 {user ? t('Go to Dashboard') : t('Go to Sign In')}
        </Link>
      </div>
      <details style={{ marginTop: 18, textAlign: 'left' }}>
        <summary style={{ fontSize: 12, color: '#8A97AB', cursor: 'pointer' }}>{t('Technical details')}</summary>
        <pre
          style={{
            margin: '8px 0 0',
            padding: '10px 12px',
            background: '#F7F9FC',
            border: '1px solid #E9EDF4',
            borderRadius: 8,
            fontSize: 11.5,
            color: '#C0392B',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {detail}
        </pre>
      </details>
    </ErrorShell>
  );
}
