/**
 * Utility functions for comparing objects and detecting changes
 * Used for smart state diffing to avoid unnecessary re-renders
 */

/**
 * Deep equality check for objects and arrays
 * Returns true if objects are deeply equal
 */
export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  // Same reference or both null/undefined
  if (obj1 === obj2) return true;
  
  // Different types or one is null
  if (typeof obj1 !== typeof obj2 || obj1 === null || obj2 === null) {
    return false;
  }
  
  // Handle non-object types
  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }
  
  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }
  
  // Handle objects
  const keys1 = Object.keys(obj1 as object);
  const keys2 = Object.keys(obj2 as object);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => {
    const val1 = (obj1 as Record<string, unknown>)[key];
    const val2 = (obj2 as Record<string, unknown>)[key];
    return deepEqual(val1, val2);
  });
}

/**
 * Check if specific fields in objects have changed
 * Useful for comparing game state objects
 */
export function hasChanged<T extends Record<string, unknown>>(
  oldState: T | null,
  newState: T | null,
  fields: (keyof T)[]
): boolean {
  if (!oldState || !newState) return true;
  
  return fields.some(field => !deepEqual(oldState[field], newState[field]));
}

/**
 * Get a hash/signature of an object for quick comparison
 * Useful for detecting changes without deep comparison
 */
export function getStateSignature(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}
