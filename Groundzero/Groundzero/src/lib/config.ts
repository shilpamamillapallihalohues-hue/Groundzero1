/**
 * Centralized application configuration.
 * All environment-dependent values are read here.
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

export const config = {
  isDev,
  isProd,

  /** Base URL of the running application (for auth redirects, etc.) */
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,

  /** Supabase */
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  },
} as const;

/** Validate that required env vars are present at startup */
export function validateConfig() {
  const required = [
    ['VITE_SUPABASE_URL', config.supabase.url],
    ['VITE_SUPABASE_PUBLISHABLE_KEY', config.supabase.anonKey],
  ] as const;

  for (const [name, value] of required) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
}
