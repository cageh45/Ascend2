export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL &&
    /^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL) &&
    SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'),
);
