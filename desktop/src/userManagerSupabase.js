import { createClient } from '@supabase/supabase-js';
import { getRank } from "./rankingSystem.js";
// Initialize Supabase client
// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate a unique session token
const generateSessionToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

// Get or create session token for this browser tab
const getOrCreateSessionToken = () => {
  let sessionToken = sessionStorage.getItem('dualmath_session_token');
  if (!sessionToken) {
    sessionToken = generateSessionToken();
    sessionStorage.setItem('dualmath_session_token', sessionToken);
  }
  return sessionToken;
};

// Helper function to get the base URL for redirects
// This works for any deployment (localhost, Vercel, Netlify, etc.)

// const getRedirectBaseUrl = () => {
//   return import.meta.env.VITE_APP_URL || "https://dual-math.vercel.app";
// };

const getRedirectBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  return  "https://dual-math.vercel.app";
};



export const userManager = {
  // Get current user from Supabase auth session
  getCurrentUser: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        localStorage.removeItem('dualmath_current_user');
        return null;
      }

      const userId = session.user.id;
      const currentSessionToken = getOrCreateSessionToken();

      // Check if email is verified - MUST check email_confirmed_at
      const emailVerified = session.user.email_confirmed_at !== null;
      
      console.log('📧 Email verification status:', {
        email: session.user.email,
        email_confirmed_at: session.user.email_confirmed_at,
        emailVerified: emailVerified
      });
      
      // Check if this is a recovery session (password reset flow)
      // Recovery sessions should not be subject to session conflict checks
      const isRecoverySession = session.user?.recovery_sent_at || 
                                window.location.hash.includes('type=recovery') ||
                                localStorage.getItem('dualmath_password_recovery_mode') === 'true';
      
      // Fetch user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Check for session conflict (another device/tab logged in)
      // Skip this check for recovery sessions
      if (!isRecoverySession && profile?.active_session_token && profile.active_session_token !== currentSessionToken) {
        console.log('⚠️ Session conflict detected - logging out this session');
        await supabase.auth.signOut();
        localStorage.removeItem('dualmath_current_user');
        sessionStorage.removeItem('dualmath_session_token');
        return null;
      }

      // Update active session token if not set or if it's this session
      // Skip for recovery sessions
      if (!isRecoverySession && (!profile?.active_session_token || profile.active_session_token === currentSessionToken)) {
        await supabase
          .from('profiles')
          .update({ 
            active_session_token: currentSessionToken,
            last_active: new Date().toISOString()
          })
          .eq('id', userId);
      }

      const user = {
        id: userId,
        username: profile?.username || session.user.user_metadata?.username || 'Player',
        email: session.user.email,
        emailVerified: emailVerified,
        avatarData: profile?.avatar_data || null,
        rankPoints: profile?.rank_points || 0,
        wins: profile?.wins || 0,
        losses: profile?.losses || 0,
        totalGames: profile?.total_games || 0,
        createdAt: profile?.created_at || session.user.created_at,
      };

      // Cache locally for quick access
      localStorage.setItem('dualmath_current_user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Synchronous version for immediate UI (uses cached data)
  getCurrentUserSync: () => {
    try {
      const cached = localStorage.getItem('dualmath_current_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  },

  // Check if email is verified - refresh from Supabase to get latest status
  isEmailVerified: async () => {
    try {
      // Force refresh the session to get the latest user data
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('📧 isEmailVerified: No user found');
        return false;
      }
      
      const verified = user.email_confirmed_at !== null;
      console.log('📧 isEmailVerified check:', {
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        verified: verified
      });
      
      return verified;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  },

  // Resend verification email
  resendVerificationEmail: async (emailAddress = null) => {
    try {
      // Try to get email from multiple sources
      let email = emailAddress;
      
      if (!email) {
        // Try from current session
        const { data: { session } } = await supabase.auth.getSession();
        email = session?.user?.email;
      }
      
      if (!email) {
        // Try from cached user
        const cached = localStorage.getItem('dualmath_current_user');
        if (cached) {
          const user = JSON.parse(cached);
          email = user?.email;
        }
      }
      
      if (!email) {
        // Try from pending verification email
        email = localStorage.getItem('dualmath_pending_verification_email');
      }
      
      if (!email) {
        return { success: false, message: 'No email address found. Please try logging in again.' };
      }

      console.log('📧 Attempting to resend verification email to:', email);

      // Use the resend method with signup type
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getRedirectBaseUrl(),
        }
      });

      if (error) {
        console.error('📧 Resend verification error:', error);
        
        // If error says user is already confirmed, that's actually good
        if (error.message?.includes('already confirmed') || 
            error.message?.includes('already registered')) {
          return { success: true, message: 'Email is already verified! Please refresh the page.' };
        }
        
        // Rate limit error
        if (error.message?.includes('rate') || error.message?.includes('limit') || error.message?.includes('60')) {
          return { success: false, message: 'Please wait a minute before requesting another email.' };
        }

        // For other errors, try OTP method as fallback
        console.log('📧 Trying signInWithOtp as fallback...');
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: getRedirectBaseUrl(),
          }
        });

        if (otpError) {
          console.error('📧 OTP fallback error:', otpError);
          return { success: false, message: error.message || 'Failed to send verification email.' };
        }
      }

      console.log('📧 Verification email sent successfully');
      return { success: true, message: 'Verification email sent! Check your inbox (and spam folder).' };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, message: 'Failed to send verification email. Please try again.' };
    }
  },

  // Sign up new user
  signupUser: async (username, email, password) => {
    try {
      // First check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        return { success: false, message: 'Username already taken' };
      }

      // Get the redirect URL dynamically based on current deployment
      const redirectUrl = getRedirectBaseUrl();
      console.log('📧 Signup email redirect URL:', redirectUrl);

      // Sign up with Supabase Auth - this sends verification email automatically
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Signup failed' };
      }

      // Check if user already exists (Supabase returns user but with identities = [] if email exists)
      if (data.user.identities && data.user.identities.length === 0) {
        return { success: false, message: 'An account with this email already exists. Please login instead.' };
      }

      const sessionToken = getOrCreateSessionToken();

      // Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: username.toLowerCase(),
          display_name: username,
          email: email, // Store email for username login lookup
          rank_points: 0,
          wins: 0,
          losses: 0,
          total_games: 0,
          active_session_token: sessionToken,
          last_active: new Date().toISOString(),
        });

      if (profileError) {
  console.error("saveUser profile update error:", profileError);

  const message = String(profileError.message || "").toLowerCase();

  if (
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    message.includes("profiles_username_key")
  ) {
    return {
      success: false,
      message: "That username is already taken.",
    };
  }

  if (message.includes("username_changed_at")) {
    return {
      success: false,
      message: "Please complete the sign up form to continue.",
    };
  }

  return {
    success: false,
    message: "Please complete the sign up form to continue.",
  };
}

      const user = {
        id: data.user.id,
        username: username,
        email: email,
        emailVerified: false, // Not verified yet - ALWAYS false on signup
        avatarData: null,
        rankPoints: 0,
        wins: 0,
        losses: 0,
        totalGames: 0,
      };

      localStorage.setItem('dualmath_current_user', JSON.stringify(user));
      // Store email for resend verification (in case session isn't available)
      localStorage.setItem('dualmath_pending_verification_email', email);

      return { 
        success: true, 
        user, 
        message: 'Account created! Please check your email to verify your account.',
        requiresVerification: true
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Signup failed. Please try again.' };
    }
  },

  // Login user
  loginUser: async (emailOrUsername, password) => {
    try {
      let email = emailOrUsername;

      // If not an email, look up by username
      if (!emailOrUsername.includes('@')) {
        // Get email from profiles table (we store it there during signup)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername.toLowerCase())
          .single();

        if (profileError || !profile) {
          return { success: false, message: 'User not found' };
        }
        
        if (!profile.email) {
          return { success: false, message: 'Please login with your email address' };
        }
        
        email = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Login failed' };
      }

      const sessionToken = getOrCreateSessionToken();
      
      // IMPORTANT: Check email_confirmed_at directly from the auth response
      // This is the source of truth for email verification
      const emailVerified = data.user.email_confirmed_at !== null;
      
      console.log('📧 Login - Email verification check:', {
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        emailVerified: emailVerified
      });

      // Update the active session token - this will invalidate other sessions
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          active_session_token: sessionToken,
          last_active: new Date().toISOString()
        })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('Failed to update session token:', updateError);
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const user = {
        id: data.user.id,
        username: profile?.username || data.user.user_metadata?.username || 'Player',
        email: data.user.email,
        emailVerified: emailVerified, // Use the value from auth, not profile
        avatarData: profile?.avatar_data || null,
        rankPoints: profile?.rank_points || 0,
        wins: profile?.wins || 0,
        losses: profile?.losses || 0,
        totalGames: profile?.total_games || 0,
      };

      localStorage.setItem('dualmath_current_user', JSON.stringify(user));
      
      // Store email for resend verification if not verified
      if (!emailVerified) {
        localStorage.setItem('dualmath_pending_verification_email', data.user.email);
        console.log('📧 User not verified, storing email for resend:', data.user.email);
      } else {
        localStorage.removeItem('dualmath_pending_verification_email');
      }

      return { 
        success: true, 
        user,
        requiresVerification: !emailVerified 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  },

  // Logout user
  logoutUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        // Clear the active session token
        await supabase
          .from('profiles')
          .update({ active_session_token: null })
          .eq('id', session.user.id);
      }

      await supabase.auth.signOut();
      localStorage.removeItem('dualmath_current_user');
      localStorage.removeItem('dualmath_pending_verification_email');
      sessionStorage.removeItem('dualmath_session_token');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email) => {
    try {
      // Get the redirect URL dynamically based on current deployment
      const redirectUrl = getRedirectBaseUrl();
      console.log('📧 Password reset redirect URL:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Password reset email sent! Check your inbox.' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Failed to send reset email. Please try again.' };
    }
  },

  // Update password (after clicking reset link)
  updatePassword: async (newPassword) => {
    try {
      console.log('🔐 Attempting to update password...');
      
      // The PASSWORD_RECOVERY event should have established a session
      // Let's check for it with retries
      let session = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!session && attempts < maxAttempts) {
        const { data, error } = await supabase.auth.getSession();
        session = data?.session;
        
        console.log(`🔐 Session check attempt ${attempts + 1}:`, { 
          hasSession: !!session,
          userId: session?.user?.id,
          error: error?.message 
        });
        
        if (!session && attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        attempts++;
      }
      
      if (!session) {
        return { 
          success: false, 
          message: 'Session expired. Please request a new password reset link and try again quickly after clicking it.' 
        };
      }

      // Update the password
      console.log('🔐 Updating password for user:', session.user?.id);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        return { success: false, message: error.message };
      }

      console.log('✅ Password updated successfully');

      // Clear recovery mode flag
      localStorage.removeItem('dualmath_password_recovery_mode');
      
      // Clear the hash from URL after successful reset
      window.history.replaceState(null, '', window.location.pathname);

      // Sign out after password change so user logs in fresh
      await supabase.auth.signOut();
      localStorage.removeItem('dualmath_current_user');
      localStorage.removeItem('dualmath_pending_verification_email');
      sessionStorage.removeItem('dualmath_session_token');

      return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, message: 'Failed to update password. Please request a new reset link.' };
    }
  },

  // Save/update user data
  saveUser: async (user) => {
  try {
    const { error: profileError } = await supabase
      .from("profiles")
.update({
  username: (user.username || "").trim().toLowerCase(),
  display_name: (user.username || "").trim(),
  rank_points: user.rankPoints || 0,
  wins: user.wins || 0,
  losses: user.losses || 0,
  total_games: user.totalGames || 0,
  avatar_data: user.avatarData || null,
  coins: user.coins ?? 2000,
  // username_changed_at: user.usernameChangedAt || null,
  last_active: new Date().toISOString(),
})
      .eq("id", user.id);

   if (profileError) {
  console.error("signup profile insert error:", profileError);

  return {
    success: false,
    message: profileError.message || "Could not create profile.",
  };


      const message = String(profileError.message || "").toLowerCase();

      if (
        message.includes("duplicate key") ||
        message.includes("unique constraint") ||
        message.includes("profiles_username_key")
      ) {
        return {
          success: false,
          message: "That username is already taken.",
        };
      }

      return {
        success: false,
        message: "Could not update username.",
      };
    }

    localStorage.setItem("dualmath_current_user", JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    console.error("saveUser error:", error);
return { success: false, message: "Please complete the sign up form to continue." };  }
},

  // Update avatar
  updateAvatar: async (username, avatarData) => {
    try {
      console.log('🖼️ Updating avatar for user...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error in updateAvatar:', sessionError);
        return false;
      }
      
      if (!session?.user) {
        console.error('No session found in updateAvatar');
        return false;
      }

      console.log('🖼️ Session found, updating profile for user:', session.user.id);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_data: avatarData })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating avatar in database:', error);
        return false;
      }

      console.log('✅ Avatar updated in database');

      // Update local cache
      const cached = localStorage.getItem('dualmath_current_user');
      if (cached) {
        const user = JSON.parse(cached);
        user.avatarData = avatarData;
        localStorage.setItem('dualmath_current_user', JSON.stringify(user));
      }

      return true;
    } catch (error) {
      console.error('Update avatar error:', error);
      return false;
    }
  },

  // Get user rank based on points
  // getUserRank: (user) => {
  //   const points = user?.rankPoints || 0;
  //   let rank = 'Novice';
    
  //   for (const threshold of RANK_THRESHOLDS) {
  //     if (points >= threshold.min) {
  //       rank = threshold.name;
  //     }
  //   }
    
  //   return rank;
  // },
  getUserRank: (user) => {
    return getRank(user?.rankPoints || 0);
  },

  // Get user stats
  getUserStats: (user) => {
    if (!user) return null;
    
    const totalGames = (user.wins || 0) + (user.losses || 0);
    const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;
    
    return {
      rank: userManager.getUserRank(user),
      rankPoints: user.rankPoints || 0,
      wins: user.wins || 0,
      losses: user.losses || 0,
      totalGames: totalGames,
      winRate: winRate,
    };
  },

  // Listen for auth state changes (for real-time session invalidation)
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      // Handle password recovery - set flag so UI knows to show reset form
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔐 Password recovery session detected - setting recovery flag');
        localStorage.setItem('dualmath_password_recovery_mode', 'true');
        // Don't call callback - let the Auth component handle this
        return;
      }
      
      // Check if we're in recovery mode
      const isRecoveryMode = localStorage.getItem('dualmath_password_recovery_mode') === 'true';
      
      if (event === 'SIGNED_OUT') {
        // Only clear if not in recovery mode
        if (!isRecoveryMode && !window.location.hash.includes('type=recovery')) {
          localStorage.removeItem('dualmath_current_user');
          sessionStorage.removeItem('dualmath_session_token');
          callback(null);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Skip if in recovery mode - don't log them into the app
        if (isRecoveryMode || window.location.hash.includes('type=recovery')) {
          console.log('🔐 In recovery mode - not logging into app');
          return;
        }
        userManager.getCurrentUser().then(callback);
      } else if (event === 'USER_UPDATED') {
        // After password is updated, clear recovery mode
        localStorage.removeItem('dualmath_password_recovery_mode');
        userManager.getCurrentUser().then(callback);
      }
    });
  },

  // Check if in password recovery mode
  isInRecoveryMode: () => {
    return localStorage.getItem('dualmath_password_recovery_mode') === 'true' ||
           window.location.hash.includes('type=recovery');
  },

  // Clear recovery mode (call after successful password reset)
  clearRecoveryMode: () => {
    localStorage.removeItem('dualmath_password_recovery_mode');
  },

  // Check if session is still valid (call periodically)
  validateSession: async () => {
    try {
      // Skip validation during password recovery
      const isRecoveryMode = localStorage.getItem('dualmath_password_recovery_mode') === 'true' ||
                             window.location.hash.includes('type=recovery');
      if (isRecoveryMode) {
        return { valid: true, reason: 'recovery_mode' };
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return { valid: false, reason: 'no_session' };
      }

      const currentSessionToken = getOrCreateSessionToken();

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_session_token')
        .eq('id', session.user.id)
        .single();

      if (profile?.active_session_token && profile.active_session_token !== currentSessionToken) {
        // Session was invalidated by another login
        await supabase.auth.signOut();
        localStorage.removeItem('dualmath_current_user');
        sessionStorage.removeItem('dualmath_session_token');
        return { valid: false, reason: 'session_replaced' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, reason: 'error' };
    }
  },

  // Force refresh email verification status from Supabase
  refreshEmailVerificationStatus: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { verified: false, error: 'No user found' };
      }
      
      const verified = user.email_confirmed_at !== null;
      
      // Update local cache
      const cached = localStorage.getItem('dualmath_current_user');
      if (cached) {
        const cachedUser = JSON.parse(cached);
        cachedUser.emailVerified = verified;
        localStorage.setItem('dualmath_current_user', JSON.stringify(cachedUser));
      }
      
      return { verified, user };
    } catch (error) {
      console.error('Error refreshing verification status:', error);
      return { verified: false, error: error.message };
    }
  },

  getUserByUsername: async (username) => {
  try {
    const normalized = username.trim().toLowerCase();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", normalized)
      .maybeSingle();

    if (error) {
      console.error("getUserByUsername error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("getUserByUsername catch error:", error);
    return null;
  }
},
};

export { supabase };