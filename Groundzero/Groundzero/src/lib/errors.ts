/**
 * Centralized error handling utilities.
 * Provides consistent error messaging and logging.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly statusCode: number;

  constructor(opts: {
    message: string;
    code?: string;
    userMessage?: string;
    statusCode?: number;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = 'AppError';
    this.code = opts.code || 'UNKNOWN_ERROR';
    this.userMessage = opts.userMessage || 'Something went wrong. Please try again.';
    this.statusCode = opts.statusCode || 500;
  }
}

/**
 * Extract a user-friendly message from any error type.
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;

  if (error instanceof Error) {
    // Supabase auth errors
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Please verify your email address before signing in.';
    }
    if (error.message.includes('User already registered')) {
      return 'An account with this email already exists.';
    }
    if (error.message.includes('JWT expired') || error.message.includes('token is expired')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (error.message.includes('row-level security')) {
      return 'You do not have permission to perform this action.';
    }
    // Return the raw message for other known errors
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log errors in development, silently in production.
 * Production logging is handled by Vite's console stripping.
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}
