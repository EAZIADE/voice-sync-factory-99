
/**
 * Safely cast Supabase query results to application types
 * This helps bridge the gap between Supabase database types and our application types
 */

/**
 * Convert a Supabase result to a specific type with type safety
 */
export function asType<T>(data: unknown): T {
  return data as T;
}

/**
 * Ensure a project status is one of the valid options
 */
export function ensureValidStatus(status: string): 'draft' | 'processing' | 'completed' {
  if (status === 'draft' || status === 'processing' || status === 'completed') {
    return status as ('draft' | 'processing' | 'completed');
  }
  return 'draft';
}

/**
 * Helper to safely handle null or undefined values in optional chaining
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj ? obj[key] : undefined;
}
