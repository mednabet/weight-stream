/**
 * API utilities for the self-hosted MySQL backend.
 * All external API calls should go through apiClient.
 */

// This file is kept for backward compatibility.
// Edge functions are not available in self-hosted MySQL mode.
// Use apiClient from @/lib/api-client for all API calls.

export function logApiError(context: string, error: unknown): void {
  console.error(`[API Error - ${context}]:`, error);
}

export function handleApiResponse<T>(
  response: { data?: T; error?: string | null },
  context: string
): T | null {
  if (response.error) {
    logApiError(context, response.error);
    return null;
  }
  return response.data ?? null;
}
