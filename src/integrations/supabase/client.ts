/**
 * DEPRECATED: This file is kept for compatibility only.
 * The application now uses MySQL with the Express backend.
 * All API calls should use apiClient from @/lib/api-client.
 * 
 * DO NOT import this file in new code.
 */

// Stub export to prevent import errors
export const supabase = null;

console.warn(
  '[DEPRECATED] supabase client is no longer used. ' +
  'This application runs on MySQL. Use apiClient from @/lib/api-client instead.'
);
