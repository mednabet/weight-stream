import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the user is authenticated with Supabase
 */
export function useSetupCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    // Allow login and signup pages without checking
    if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/setup') {
      setIsChecking(false);
      return;
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      // Redirect to login if not authenticated
      if (!session) {
        navigate('/login', { replace: true });
      }
      
      setIsChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  return { isChecking, backendAvailable: true };
}

/**
 * Provider component to wrap the app and perform setup check
 */
export function SetupCheckProvider({ children }: { children: React.ReactNode }) {
  const { isChecking } = useSetupCheck();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
