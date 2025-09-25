// lib/utils/server-client-bridge.ts
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Type-safe wrapper to ensure server data is properly serialized for client components
 * This prevents the "Decimal objects are not supported" error
 */
export function serializeForClient<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key: string, value: unknown) => {
    // Convert Decimal to number
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    // Convert Date to ISO string (optional, but good practice)
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

/**
 * Wrapper for server actions that return data to client components
 * Use this to wrap any server action return value that might contain Prisma objects
 */
export function withClientSerialization<T extends (...args: unknown[]) => Promise<unknown>>(
  serverAction: T
): T {
  return (async (...args: Parameters<T>) => {
    const result = await serverAction(...args);
    return serializeForClient(result);
  }) as T;
}

/**
 * Type guard to check if an object contains Decimal fields
 */
export function hasDecimalFields(obj: unknown): boolean {
  if (obj instanceof Decimal) return true;
  
  if (Array.isArray(obj)) {
    return obj.some(item => hasDecimalFields(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).some(value => hasDecimalFields(value));
  }
  
  return false;
}