import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

async function fetchSetupStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/setup/status');
    const data = await res.json();
    return !!data.configured;
  } catch {
    // If backend unreachable, allow app to render (dev mode)
    return true;
  }
}

/**
 * Hook to check if the app is initialized and redirect to setup if not.
 * This checks the backend configuration (MySQL) instead of localStorage.
 */
export function useSetupCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    // Skip check if already on setup page
    if (location.pathname === '/setup') {
      setIsChecking(false);
      return;
    }

    (async () => {
      const configured = await fetchSetupStatus();
      if (cancelled) return;

      if (!configured) {
        navigate('/setup', { replace: true });
      }
      setIsChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  return { isChecking };
}

/**
 * Provider component to wrap the app and perform setup check
 */
export function SetupCheckProvider({ children }: { children: React.ReactNode }) {
  const { isChecking } = useSetupCheck();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return <>{children}</>;
}
