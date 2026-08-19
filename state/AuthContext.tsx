import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Linking } from 'react-native';

import { isSupabaseConfigured, supabase } from '../services/supabase';

export type AuthStatus =
  | 'unconfigured'
  | 'checking'
  | 'signedOut'
  | 'connecting'
  | 'authenticated'
  | 'error';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  errorMessage: string | null;
  enableOnlineAccount: () => Promise<boolean>;
  sendEmailCode: (email: string, mode: 'link' | 'signIn') => Promise<boolean>;
  verifyEmailCode: (
    email: string,
    token: string,
    mode: 'link' | 'signIn',
  ) => Promise<boolean>;
  deleteOnlineAccount: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'checking' : 'unconfigured',
  );
  const [session, setSession] = useState<Session | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'signedOut');
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'signedOut');
      setErrorMessage(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    async function handleAuthUrl(url: string | null) {
      if (!url?.startsWith('ascend://auth/callback')) return;
      try {
        const parsed = new URL(url);
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const errorDescription =
          hash.get('error_description') ?? parsed.searchParams.get('error_description');
        if (errorDescription) throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const code = parsed.searchParams.get('code');
        const tokenHash = parsed.searchParams.get('token_hash');
        const type = parsed.searchParams.get('type');

        if (accessToken && refreshToken) {
          const { error } = await supabase!.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase!.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase!.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'email' | 'email_change',
          });
          if (error) throw error;
        } else {
          throw new Error('This verification link is incomplete. Request a new code in Ascend.');
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'The sign-in link could not be verified.',
        );
      }
    }

    void Linking.getInitialURL().then(handleAuthUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });
    return () => subscription.remove();
  }, []);

  const enableOnlineAccount = useCallback(async () => {
    if (!supabase) {
      setStatus('unconfigured');
      setErrorMessage('The Supabase project variables are missing.');
      return false;
    }
    if (session) return true;

    setStatus('connecting');
    setErrorMessage(null);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      setStatus('error');
      setErrorMessage(error?.message ?? 'Online account creation failed.');
      return false;
    }
    setSession(data.session);
    setStatus('authenticated');
    return true;
  }, [session]);

  const sendEmailCode = useCallback(async (
    email: string,
    mode: 'link' | 'signIn',
  ) => {
    if (!supabase) {
      setErrorMessage('Online accounts are not configured in this build.');
      return false;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrorMessage('Enter a valid email address.');
      return false;
    }
    setErrorMessage(null);
    setStatus('connecting');

    const { error } = mode === 'link' && session?.user.is_anonymous
      ? await supabase.auth.updateUser(
          { email: cleanEmail },
          { emailRedirectTo: 'ascend://auth/callback' },
        )
      : await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: 'ascend://auth/callback',
            shouldCreateUser: false,
          },
        });
    if (error) {
      setStatus(session ? 'authenticated' : 'error');
      setErrorMessage(error.message);
      return false;
    }
    setStatus(session ? 'authenticated' : 'signedOut');
    return true;
  }, [session]);

  const verifyEmailCode = useCallback(async (
    email: string,
    token: string,
    mode: 'link' | 'signIn',
  ) => {
    if (!supabase) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.replace(/\s/g, '');
    if (!cleanEmail || !cleanToken) return false;
    setStatus('connecting');
    setErrorMessage(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: mode === 'link' ? 'email_change' : 'email',
    });
    if (error) {
      setStatus(session ? 'authenticated' : 'error');
      setErrorMessage(error.message);
      return false;
    }
    if (data.session) setSession(data.session);
    setStatus('authenticated');
    return true;
  }, [session]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSession(null);
    setStatus('signedOut');
  }, []);

  const deleteOnlineAccount = useCallback(async () => {
    if (!supabase || !session?.user) return false;
    setErrorMessage(null);
    const { error } = await supabase.functions.invoke('delete-account', {
      body: {},
    });
    if (error) {
      setErrorMessage(error.message);
      return false;
    }

    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setStatus('signedOut');
    return true;
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      errorMessage,
      enableOnlineAccount,
      sendEmailCode,
      verifyEmailCode,
      deleteOnlineAccount,
      signOut,
    }),
    [deleteOnlineAccount, enableOnlineAccount, errorMessage, sendEmailCode, session, signOut, status, verifyEmailCode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
