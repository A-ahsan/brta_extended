import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Don't wait for profile fetch on SIGNED_IN event (handled by login/signup)
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            // Skip profile fetch, it's already done in signIn/signUp
            setLoading(false);
          } else {
            await fetchProfile(session.user.id);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist yet (new signup), retry up to 3 times
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log(`Profile not found, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return fetchProfile(userId, retryCount + 1);
        }
        throw error;
      }
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Set a minimal profile so app doesn't stay stuck
      setProfile({ id: userId, role: 'user' });
    } finally {
      setLoading(false);
    }
  };


  const signUp = async (email, password, fullName, phone) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'user',
            phone: phone
          },
          emailRedirectTo: undefined // Disable email confirmation
        }
      });

      if (error) throw error;

      if (data?.user) {
        // Set profile immediately so we don't wait for trigger
        setProfile({ id: data.user.id, email, full_name: fullName, role: 'user', phone });
        setUser(data.user);
        return { success: true, data, userName: fullName };
      }

      // Handle case where signup completes but no user returned
      return { success: false, error: new Error('Signup failed - no user returned') };
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to sign up');
      return { success: false, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        // Fetch profile with timeout to prevent hanging
        let profileData = null;
        try {
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          // Add 5 second timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
          );
          
          const result = await Promise.race([profilePromise, timeoutPromise]);
          profileData = result.data;
          
          if (result.error) {
            console.error('Profile fetch error:', result.error);
          }
        } catch (profileError) {
          console.error('Profile fetch failed:', profileError);
          // Continue with basic profile
        }

        const userName = profileData?.full_name || email.split('@')[0];
        
        // Set profile and user state immediately
        setProfile(profileData || { id: data.user.id, email, role: 'user' });
        setUser(data.user);
        
        toast.success(`Welcome back, ${userName}! 👋`);
        return { success: true, data, profile: profileData };
      }

      // Handle case where signin completes but no user returned
      return { success: false, error: new Error('Login failed - no user returned') };
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to sign in');
      return { success: false, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to sign out');
      return { success: false, error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isPolice: profile?.role === 'police',
    isUser: profile?.role === 'user'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
