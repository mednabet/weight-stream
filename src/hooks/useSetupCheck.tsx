import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to check setup status - simplified for Supabase mode
 */
export function useSetupCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // In Supabase mode, setup is always complete
    setIsChecking(false);
  }, [location.pathname]);

  return { isChecking: false, backendAvailable: true };
}

/**
 * Provider component - just renders children in Supabase mode
 */
export function SetupCheckProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}