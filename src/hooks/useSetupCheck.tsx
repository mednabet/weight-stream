import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SetupStatus {
  configured: boolean;
  backendAvailable: boolean;
}

async function fetchSetupStatus(): Promise<SetupStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('/api/setup/status', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // If we get a 500 or other server error, treat as backend not available
    // (Lovable preview returns 500 because there's no Express backend)
    if (res.status >= 500) {
      console.log('[Setup] Backend returned 500 - mode démo activé');
      return { configured: true, backendAvailable: false };
    }

    // 404 means the route doesn't exist - no backend
    if (res.status === 404) {
      console.log('[Setup] Backend route not found - mode démo activé');
      return { configured: true, backendAvailable: false };
    }

    // For other errors (400, 401, 403), the backend exists but has issues
    if (!res.ok) {
      return { configured: false, backendAvailable: true };
    }

    const data = await res.json();
    return { configured: !!data.configured, backendAvailable: true };
  } catch {
    // Network error, timeout, etc. - backend not reachable
    console.log('[Setup] Backend MySQL non disponible - mode démo activé');
    return { configured: true, backendAvailable: false };
  }
}

/**
 * Hook to check if the app is initialized and redirect to setup if not.
 * In Lovable preview mode (no backend), it allows the app to run in demo mode.
 */
export function useSetupCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    // Always allow setup page without checking
    if (location.pathname === '/setup') {
      setIsChecking(false);
      setBackendAvailable(true);
      return;
    }

    (async () => {
      const status = await fetchSetupStatus();
      if (cancelled) return;

      setBackendAvailable(status.backendAvailable);

      // Only redirect to setup if backend IS available but NOT configured
      if (status.backendAvailable && !status.configured) {
        navigate('/setup', { replace: true });
      }
      
      setIsChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  return { isChecking, backendAvailable };
}

/**
 * Provider component to wrap the app and perform setup check
 */
export function SetupCheckProvider({ children }: { children: React.ReactNode }) {
  const { isChecking, backendAvailable } = useSetupCheck();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Connexion au serveur...</p>
        </div>
      </div>
    );
  }

  // Show demo mode banner if backend is not available
  if (backendAvailable === false) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-medium shadow-md">
          ⚠️ Mode Démo - Le backend MySQL n'est pas connecté. Déployez le serveur Node.js pour tester avec MySQL.
        </div>
        <div className="pt-10">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
