import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate similarity between two strings (0-100%)
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const editDistance = levenshteinDistance(longer, shorter);
  const similarity = (longer.length - editDistance) / longer.length * 100;

  return Math.round(similarity);
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[str1.length][str2.length];
}

// Format date in a standardized format (dd/mm/yyyy or dd/mm/yyyy, hh:mm AM/PM)
export function formatDate(date: string | Date, includeTime: boolean = true): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();

  if (!includeTime) {
    return `${day}/${month}/${year}`;
  }

  return dateObj.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}

// Count words in a string
export function countWords(str: string): number {
  if (!str) return 0;

  // Split by whitespace and filter out empty strings
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// Highlight matching parts in two strings
export function highlightMatches(source: string, target: string): {
  sourceHighlighted: string;
  targetHighlighted: string;
} {
  // This is a simplified implementation
  // A more sophisticated version would use sequence alignment

  return {
    sourceHighlighted: source,
    targetHighlighted: target
  };
}

// Format a file size in bytes to a human-readable string
export function formatFileSize(bytes: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
// Maximum safe timeout value (32-bit signed integer)
export const MAX_SAFE_TIMEOUT = 2147483647;

/**
 * Creates a safe timeout that won't exceed JavaScript's maximum 32-bit integer limit
 * @param ms Desired timeout in milliseconds
 * @returns Clamped timeout value
 */
export const getSafeTimeout = (ms: number): number => {
  return Math.min(Math.max(0, ms), MAX_SAFE_TIMEOUT);
};

/**
 * Safe version of setTimeout that prevents integer overflow
 */
export const safeSetTimeout = (callback: () => void, ms: number): NodeJS.Timeout => {
  const safeMs = getSafeTimeout(ms);
  return setTimeout(callback, safeMs);
};
```

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate similarity between two strings (0-100%)
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const editDistance = levenshteinDistance(longer, shorter);
  const similarity = (longer.length - editDistance) / longer.length * 100;

  return Math.round(similarity);
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[str1.length][str2.length];
}

// Format date in a standardized format (dd/mm/yyyy or dd/mm/yyyy, hh:mm AM/PM)
export function formatDate(date: string | Date, includeTime: boolean = true): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();

  if (!includeTime) {
    return `${day}/${month}/${year}`;
  } else {
    const hour = dateObj.getHours().toString().padStart(2, '0');
    const minute = dateObj.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year}, ${hour}:${minute}`;
  }
}

// Count words in a string
export function countWords(str: string): number {
  if (!str) return 0;

  // Split by whitespace and filter out empty strings
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// Highlight matching parts in two strings
export function highlightMatches(source: string, target: string): {
  sourceHighlighted: string;
  targetHighlighted: string;
} {
  // This is a simplified implementation
  // A more sophisticated version would use sequence alignment

  return {
    sourceHighlighted: source,
    targetHighlighted: target
  };
}

// Format a file size in bytes to a human-readable string
export function formatFileSize(bytes: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
// Maximum safe timeout value (32-bit signed integer)
export const MAX_SAFE_TIMEOUT = 2147483647;

/**
 * Creates a safe timeout that won't exceed JavaScript's maximum 32-bit integer limit
 * @param ms Desired timeout in milliseconds
 * @returns Clamped timeout value
 */
export const getSafeTimeout = (ms: number): number => {
  return Math.min(Math.max(0, ms), MAX_SAFE_TIMEOUT);
};

/**
 * Safe version of setTimeout that prevents integer overflow
 */
export const safeSetTimeout = (callback: () => void, ms: number): NodeJS.Timeout => {
  const safeMs = getSafeTimeout(ms);
  return setTimeout(callback, safeMs);
};