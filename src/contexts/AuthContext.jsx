import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { validateEmail } from '../utils/emailValidation';

const AuthContext = createContext({});

// Named export for HMR compatibility
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { useAuth };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Initialize auth state
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Session found on init:', session.user.email);
          // SET USER IMMEDIATELY - don't wait for profile
          setUser(session.user);
          
          // Fetch profile in background
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!mounted) return;

            if (profileError) {
              console.error('Profile fetch error:', profileError);
              // Set minimal profile to allow app to work
              setProfile({ id: session.user.id, email: session.user.email, role: 'user' });
            } else {
              console.log('Profile fetched:', profileData?.email);
              setProfile(profileData);
            }
          } catch (profileError) {
            console.error('Profile fetch exception:', profileError);
            if (mounted) {
              setProfile({ id: session.user.id, email: session.user.email, role: 'user' });
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        } else {
          console.log('No session found');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Init auth error:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event, session?.user?.email || 'no user');
        
        // Handle SIGNED_OUT
        if (event === 'SIGNED_OUT') {
          console.log('SIGNED_OUT event - clearing user state');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }
        
        // Handle TOKEN_REFRESHED - keep existing state
        if (event === 'TOKEN_REFRESHED') {
          console.log('TOKEN_REFRESHED event - keeping existing state');
          if (mounted && session?.user) {
            setUser(session.user);
          }
          return;
        }
        
        // Handle SIGNED_IN - don't refetch profile, it's set in signIn function
        if (event === 'SIGNED_IN') {
          console.log('SIGNED_IN event - profile already set in signIn');
          return;
        }
        
        // Handle INITIAL_SESSION - session already restored in initAuth
        if (event === 'INITIAL_SESSION') {
          console.log('INITIAL_SESSION event - session already restored');
          return;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId, retryCount = 0) => {
    try {
      console.log('Fetching profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist yet (new signup), retry up to 3 times
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log(`Profile not found, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        throw error;
      }
      
      console.log('Profile fetched:', data?.email);
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Set a minimal profile so app doesn't stay stuck
      const minimalProfile = { id: userId, role: 'user' };
      setProfile(minimalProfile);
      return minimalProfile;
    }
  };


  const signUp = async (email, password, fullName, phone) => {
    try {
      // Validate email before signup
      const emailValidation = validateEmail(email);
      
      if (!emailValidation.isValid) {
        toast.error(emailValidation.message);
        return { success: false, error: new Error(emailValidation.message) };
      }
      
      // Show warning if there's a typo suggestion
      if (emailValidation.warning && emailValidation.suggestion) {
        toast.error(emailValidation.message);
        return { 
          success: false, 
          error: new Error(emailValidation.message),
          suggestion: emailValidation.suggestion
        };
      }
      
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
        // Don't show toast here - let the page handle it
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

  const signIn = async (email, password, remember = true) => {
    try {
      console.log('SignIn called with remember:', remember);
      
      // ALWAYS use the main supabase client (it already has persistSession: true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        console.log('Login successful:', data.user.email);
        
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
        
        console.log('User state set, profile:', profileData?.email || 'minimal');
        
        // Only show welcome toast on actual login, not on session restore
        return { success: true, data, profile: profileData, userName };
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
      
      // Explicitly clear state
      setUser(null);
      setProfile(null);
      
      toast.success('Signed out successfully!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to sign out');
      return { success: false, error };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error };
    }
  };

  const updateEmail = async (newEmail) => {
    try {
      // Validate email format before sending to Supabase
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        throw new Error('Invalid email format');
      }

      // Check if trying to update to the same email
      if (user?.email && newEmail.toLowerCase() === user.email.toLowerCase()) {
        throw new Error('New email must be different from current email');
      }

      // Supabase requires email confirmation by default
      // This will send a confirmation email to the new address
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });
      
      if (error) {
        console.error('Supabase email update error:', error);
        throw error;
      }
      
      // Update profile table immediately (email will be pending confirmation)
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: newEmail })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't fail the whole operation if profile update fails
        }
      }
      
      // Note: In production, the email change requires confirmation
      // For now, we'll consider it successful even if confirmation is pending
      return { success: true, requiresConfirmation: true };
    } catch (error) {
      console.error('Email update error:', error);
      return { success: false, error };
    }
  };

  const updatePhone = async (newPhone) => {
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ phone: newPhone })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update local profile state
      setProfile(prev => ({ ...prev, phone: newPhone }));
      
      return { success: true };
    } catch (error) {
      console.error('Phone update error:', error);
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
    updatePassword,
    updateEmail,
    updatePhone,
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
