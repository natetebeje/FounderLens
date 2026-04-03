import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { productionLogger } from '@/utils/productionLogger';

// Helper function to clean up user-specific localStorage
const clearUserSpecificStorage = (userId: string) => {
  const keysToRemove = [
    `smartDiscoveryAnswers_${userId}`,
    `hasGeneratedOpportunities_${userId}`,
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  });
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  forceSignOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean }>;
  refreshSession: () => Promise<Session | null>;
  checkAdminStatus: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else if (!data) {
        // Profile may not exist yet for new users (DB trigger latency)
        // Don't sign out — just default to non-admin
        setIsAdmin(false);
      } else {
        setIsAdmin(data.is_admin || false);
      }
    } catch (error) {
      console.error('Error in admin status check:', error);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Set up the single auth state listener for the entire app
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        productionLogger.info('Auth state changed', 'auth', {
          event,
          userId: newSession?.user?.id,
          hasSession: !!newSession,
        });

        // Handle logout cleanup
        if (event === 'SIGNED_OUT') {
          if (user?.id) {
            clearUserSpecificStorage(user.id);
          }
          setIsAdmin(false);
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Check admin status when user changes
        if (newSession?.user) {
          setTimeout(() => checkAdminStatus(newSession.user.id), 0);
        }
      }
    );

    // Check for existing session on mount
    const checkInitialSession = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else if (isMounted && existingSession) {
          // Verify session is not expired
          const now = Math.floor(Date.now() / 1000);
          if (existingSession.expires_at && existingSession.expires_at < now) {
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (refreshed.session) {
              setSession(refreshed.session);
              setUser(refreshed.session.user);
            } else {
              setSession(null);
              setUser(null);
            }
          } else {
            setSession(existingSession);
            setUser(existingSession.user);
          }

          if (existingSession?.user) {
            setTimeout(() => checkAdminStatus(existingSession.user.id), 0);
          }
        }
      } catch (error) {
        console.error('Error in initial session check:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signOut = useCallback(async () => {
    try {
      if (user?.id) {
        clearUserSpecificStorage(user.id);
      }

      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timeout')), 5000)
        )
      ]) as any;

      if (error) {
        console.error('Supabase signOut error:', error);
        await forceSignOut();
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      await forceSignOut();
    }
  }, [user?.id]);

  const forceSignOut = useCallback(async () => {
    try {
      try {
        localStorage.clear();
      } catch (storageError) {
        console.error('Error clearing localStorage:', storageError);
      }

      if (user?.id) {
        clearUserSpecificStorage(user.id);
      }

      await supabase.auth.signOut({ scope: 'global' });

      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLoading(false);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Force sign out failed:', error);
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      localStorage.clear();
      throw error;
    }
  }, [user?.id]);

  const deleteAccount = useCallback(async () => {
    if (!user) {
      throw new Error('No user authenticated');
    }

    clearUserSpecificStorage(user.id);

    const { error } = await supabase.functions.invoke('delete-account', {
      body: { confirmation: 'DELETE' }
    });

    if (error) {
      console.error('Error deleting account:', error);
      throw error;
    }

    await supabase.auth.signOut();
  }, [user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) {
      throw new Error('No user authenticated');
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    return { success: true };
  }, [user]);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      throw error;
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      return data.session;
    }

    return null;
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    signOut,
    forceSignOut,
    deleteAccount,
    changePassword,
    refreshSession,
    checkAdminStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
