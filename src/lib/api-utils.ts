import { toast } from '@/hooks/use-toast';

interface InvokeOptions {
  body?: Record<string, unknown>;
  redirectOnUnauthorized?: boolean;
}

/**
 * Supabase edge functions removed in MySQL mode.
 * Kept for compatibility; always returns an error.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  _options: InvokeOptions = {}
): Promise<{ data: T | null; error: string | null }> {
  toast({
    title: 'Fonction indisponible',
    description: `Edge function "${functionName}" n'est plus utilisée (mode MySQL).`,
    variant: 'destructive',
  });
  return { data: null, error: 'EDGE_FUNCTIONS_DISABLED' };
}
