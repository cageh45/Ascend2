import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  processLock,
  SupabaseClient,
} from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import {
  SUPABASE_CONFIGURED,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '../config/services';
import type { Database } from './database.types';

export const isSupabaseConfigured = SUPABASE_CONFIGURED;

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Online services are not configured. Add the public Supabase URL and publishable key, then rebuild Ascend.',
    );
  }
  return supabase;
}
