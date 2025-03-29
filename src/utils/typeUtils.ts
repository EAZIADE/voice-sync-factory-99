
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
export function ensureValidStatus(status: string): 'draft' | 'processing' | 'completed' | 'deleted' {
  if (status === 'draft' || status === 'processing' || status === 'completed' || status === 'deleted') {
    return status as ('draft' | 'processing' | 'completed' | 'deleted');
  }
  return 'draft';
}

/**
 * Helper to safely handle null or undefined values in optional chaining
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj ? obj[key] : undefined;
}

/**
 * Convert Supabase data to a strongly typed application model
 */
export function convertToAppModel<T>(data: any): T {
  if (!data) return null as unknown as T;
  
  // Handle potential error responses from Supabase
  if (data.error === true) {
    console.error("Error in Supabase data:", data);
    return null as unknown as T;
  }
  
  return data as T;
}

/**
 * Check if a value is a valid non-empty string
 */
export function isValidString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
