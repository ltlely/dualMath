import { createClient } from '@supabase/supabase-js';
import { getRank } from "./rankingSystem.js";
// Initialize Supabase client
// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: true,
    storageKey: "dualmath-supabase-auth",
  },
});

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
  sendFriendMessage: async (senderId, receiverId, text) => {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, message: "Message cannot be empty." };
    }

    const { error } = await supabase
      .from("friend_messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: trimmed,
        is_read: false,
      });

    if (error) {
      console.error("sendFriendMessage error:", error);
      return {
        success: false,
        message: error.message || "Could not send message.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("sendFriendMessage catch error:", error);
    return { success: false, message: "Could not send message." };
  }
},

getFriendMessages: async (
  currentUserId,
  otherUserId,
  currentUsername = "You",
  otherUsername = "Friend"
) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("friend_messages")
      .select("id, sender_id, receiver_id, message_text, created_at")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getFriendMessages error:", error);
      return [];
    }

    return (data || []).map((msg) => ({
      id: msg.id,
      sender: msg.sender_id === currentUserId ? currentUsername : otherUsername,
      text: msg.message_text,
      side: msg.sender_id === currentUserId ? "right" : "left",
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      createdAt: msg.created_at,
    }));
  } catch (error) {
    console.error("getFriendMessages catch error:", error);
    return [];
  }
},

deleteExpiredMessages: async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { error } = await supabase
      .from("friend_messages")
      .delete()
      .lt("created_at", sevenDaysAgo.toISOString());

    if (error) {
      console.error("deleteExpiredMessages error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("deleteExpiredMessages catch error:", error);
    return false;
  }
},

sendFriendRequest: async (_senderId, username) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authUser = userData?.user;

    console.log("auth user id:", authUser?.id);
    console.log("passed sender id:", _senderId);

    if (userError || !authUser?.id) {
      return { success: false, message: "Please log in again." };
    }

    const senderId = authUser.id;
    const normalizedUsername = username.trim().toLowerCase();

    const { data: receiver, error: receiverError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (receiverError) {
      console.error("sendFriendRequest receiver lookup error:", receiverError);
      return { success: false, message: receiverError.message || "Could not find user." };
    }

    if (!receiver) {
      return { success: false, message: "User not found." };
    }

    if (receiver.id === senderId) {
      return { success: false, message: "You cannot add yourself." };
    }

    const { data: existingFriendRows, error: existingFriendError } = await supabase
  .from("friends")
  .select("id, user_id, friend_id")
  .or(
    `and(user_id.eq.${senderId},friend_id.eq.${receiver.id}),and(user_id.eq.${receiver.id},friend_id.eq.${senderId})`
  );

if (existingFriendError) {
  console.error("sendFriendRequest existingFriend lookup error:", existingFriendError);
  return {
    success: false,
    message: existingFriendError.message || "Could not verify friendship.",
  };
}

if ((existingFriendRows || []).length > 0) {
  return { success: false, message: "Already friends." };
}

const { data: existingRequestRows, error: existingRequestError } = await supabase
  .from("friend_requests")
  .select("id, sender_id, receiver_id, status")
  .or(
    `and(sender_id.eq.${senderId},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${senderId})`
  );

if (existingRequestError) {
  console.error("sendFriendRequest existingRequest lookup error:", existingRequestError);
  return {
    success: false,
    message: existingRequestError.message || "Could not verify existing requests.",
  };
}

const pendingOutgoing = (existingRequestRows || []).find(
  (row) =>
    row.sender_id === senderId &&
    row.receiver_id === receiver.id &&
    row.status === "pending"
);

if (pendingOutgoing) {
  return { success: false, message: "Friend request already sent." };
}

const pendingIncoming = (existingRequestRows || []).find(
  (row) =>
    row.sender_id === receiver.id &&
    row.receiver_id === senderId &&
    row.status === "pending"
);

if (pendingIncoming) {
  return { success: false, message: `${receiver.username} already sent you a friend request.` };
}

const oldResolvedRows = (existingRequestRows || []).filter(
  (row) => row.status && row.status !== "pending"
);

if (oldResolvedRows.length > 0) {
  await supabase
    .from("friend_requests")
    .delete()
    .in("id", oldResolvedRows.map((row) => row.id));
}

    const { error: insertError } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: senderId,
        receiver_id: receiver.id,
        status: "pending",
      });

    if (insertError) {
      console.error("sendFriendRequest insert error:", insertError);
      return { success: false, message: insertError.message || "Could not send request." };
    }

    return {
      success: true,
      message: `Friend request sent to ${receiver.username}.`,
    };
  } catch (error) {
    console.error("sendFriendRequest catch error:", error);
    return { success: false, message: "Could not send request." };
  }
},


getFriendRequests: async (userId) => {
  try {
    const [{ data, error }, { data: blockedByRows, error: blockedByError }] = await Promise.all([
      supabase
        .from("friend_requests")
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!friend_requests_sender_id_fkey (
            id,
            username,
            avatar_data,
            wins,
            losses,
            total_games,
            rank_points,
            status,
            last_seen,
            profile_bg_color,
profile_text_color
          )
        `)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),

      supabase
        .from("blocked_users")
        .select("user_id")
        .eq("blocked_user_id", userId),
    ]);

    if (error) {
      console.error("getFriendRequests error:", error);
      return [];
    }

    if (blockedByError) {
      console.error("getFriendRequests blockedBy error:", blockedByError);
      return [];
    }

    const blockedBySet = new Set((blockedByRows || []).map((row) => row.user_id));

    const { data: existingFriends, error: friendsError } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", userId);

    if (friendsError) {
      console.error("getFriendRequests existingFriends error:", friendsError);
      return [];
    }

    const friendIds = new Set((existingFriends || []).map((row) => row.friend_id));

    return (data || [])
      .filter((row) => !friendIds.has(row.sender_id))
      .map((row) => {
        const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
        const wins = sender?.wins || 0;
        const losses = sender?.losses || 0;
        const totalGames = sender?.total_games || 0;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        return {
          id: row.id,
          senderId: row.sender_id,
          username: sender?.username || "Unknown",
          avatarData: sender?.avatar_data || null,
          wins,
          losses,
          totalGames,
          rankPoints: sender?.rank_points || 0,
          winRate,
          status: sender?.status || "offline",
          last_seen: sender?.last_seen || null,
          isBlockedByCurrentUser: blockedBySet.has(row.sender_id),
          profileBgColor: sender?.profile_bg_color || "#dbdbdb",
profileTextColor: sender?.profile_text_color || "#5f4c79",
        };
      });
  } catch (error) {
    console.error("getFriendRequests error:", error);
    return [];
  }
},

refreshPresence: async (userId) => {
  try {
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .single();

    if (readError) {
      console.error("refreshPresence read error:", readError);
      return false;
    }

    const currentStatus = profile?.status || "online";

    const { error } = await supabase
      .from("profiles")
      .update({
        status: currentStatus,
        last_active: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("refreshPresence update error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("refreshPresence catch:", err);
    return false;
  }
},


getFriends: async (userId) => {
  try {
    const friendsPromise = supabase
      .from("friends")
      .select(`
        id,
        friend_id,
        friend:profiles!friends_friend_id_fkey (
          id,
          username,
          avatar_data,
          wins,
          losses,
          total_games,
          rank_points,
          profile_status,
          status,
          last_seen,
          profile_bg_color,
profile_text_color
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const blockedByMePromise = userId
      ? supabase
          .from("blocked_users")
          .select("blocked_user_id")
          .eq("user_id", userId)
      : Promise.resolve({ data: [], error: null });

    const blockedMePromise = userId
      ? supabase
          .from("blocked_users")
          .select("user_id")
          .eq("blocked_user_id", userId)
      : Promise.resolve({ data: [], error: null });

    const [
      { data, error },
      { data: blockedByMeRows, error: blockedByMeError },
      { data: blockedMeRows, error: blockedMeError },
    ] = await Promise.all([
      friendsPromise,
      blockedByMePromise,
      blockedMePromise,
    ]);

    if (error) {
      console.error("getFriends error:", error);
      return { success: false, data: [], message: error.message || "Could not load friends." };
    }

    if (blockedByMeError) {
      console.error("getFriends blockedByMeError:", blockedByMeError);
      return { success: false, data: [], message: "Could not load friends." };
    }

    if (blockedMeError) {
      console.error("getFriends blockedMeError:", blockedMeError);
      return { success: false, data: [], message: "Could not load friends." };
    }

    const blockedByMeSet = new Set(
      (blockedByMeRows || []).map((row) => row.blocked_user_id)
    );

    const blockedMeSet = new Set(
      (blockedMeRows || []).map((row) => row.user_id)
    );

    const mapped = (data || []).map((row) => {
      const friend = Array.isArray(row.friend) ? row.friend[0] : row.friend;
      const wins = friend?.wins || 0;
      const losses = friend?.losses || 0;
      const totalGames = friend?.total_games || 0;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return {
        id: friend?.id,
        username: friend?.username || "Unknown",
        avatarData: friend?.avatar_data || null,
        wins,
        losses,
        totalGames,
        rankPoints: friend?.rank_points || 0,
        winRate,
        profileStatus: friend?.profile_status || "",
        status: friend?.status || "offline",
        last_seen: friend?.last_seen || null,
        isBlockedByMe: blockedByMeSet.has(friend?.id),
        isBlockedByCurrentUser: blockedMeSet.has(friend?.id),
        profileBgColor: friend?.profile_bg_color || "#dbdbdb",
profileTextColor: friend?.profile_text_color || "#5f4c79",
      };
    });

    return { success: true, data: mapped };
  } catch (error) {
    console.error("getFriends catch error:", error);
    return { success: false, data: [], message: "Could not load friends." };
  }
},

removeFriend: async (currentUserId, friendId) => {
  try {
    const { error: errorA } = await supabase
      .from("friends")
      .delete()
      .eq("user_id", currentUserId)
      .eq("friend_id", friendId);

    const { error: errorB } = await supabase
      .from("friends")
      .delete()
      .eq("user_id", friendId)
      .eq("friend_id", currentUserId);

    if (errorA || errorB) {
      console.error("removeFriend error:", errorA || errorB);
      return { success: false, message: "Could not remove friend." };
    }

    return { success: true, message: "Friend removed." };
  } catch (error) {
    console.error("removeFriend catch error:", error);
    return { success: false, message: "Could not remove friend." };
  }
},

getLeaderboard: async (currentUserId) => {
  try {
    const profilesPromise = supabase
      .from("profiles")
     .select(`
  id,
  username,
  avatar_data,
  wins,
  losses,
  total_games,
  rank_points,
  profile_status,
  profile_bg_color,
profile_text_color
`)

    const blockedByMePromise = currentUserId
      ? supabase
          .from("blocked_users")
          .select("blocked_user_id")
          .eq("user_id", currentUserId)
      : Promise.resolve({ data: [], error: null });

    const blockedMePromise = currentUserId
      ? supabase
          .from("blocked_users")
          .select("user_id")
          .eq("blocked_user_id", currentUserId)
      : Promise.resolve({ data: [], error: null });

    const [
      { data, error },
      { data: blockedByMeRows, error: blockedByMeError },
      { data: blockedMeRows, error: blockedMeError },
    ] = await Promise.all([
      profilesPromise,
      blockedByMePromise,
      blockedMePromise,
    ]);

    if (error) {
      console.error("getLeaderboard error:", error);
      return [];
    }

    if (blockedByMeError) {
      console.error("getLeaderboard blockedByMeError:", blockedByMeError);
      return [];
    }

    if (blockedMeError) {
      console.error("getLeaderboard blockedMeError:", blockedMeError);
      return [];
    }

    const blockedByMeSet = new Set(
      (blockedByMeRows || []).map((row) => String(row.blocked_user_id))
    );

    const blockedMeSet = new Set(
      (blockedMeRows || []).map((row) => String(row.user_id))
    );

return (data || []).map((player) => ({
  id: player.id,
  username: player.username || "Unknown",
  avatarData: player.avatar_data || null,
  wins: player.wins || 0,
  losses: player.losses || 0,
  totalGames: player.total_games || 0,
  rankPoints: player.rank_points || 0,
  profileStatus: player.profile_status || "",
  isBlockedByMe: blockedByMeSet.has(String(player.id)),
  isBlockedByCurrentUser: blockedMeSet.has(String(player.id)),
  profileBgColor: player.profile_bg_color || "#dbdbdb",
profileTextColor: player.profile_text_color || "#5f4c79",
}));
  } catch (error) {
    console.error("getLeaderboard catch error:", error);
    return [];
  }
},
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

      if (!isRecoverySession && !profile?.active_session_token) {
  await supabase
    .from("profiles")
    .update({
      active_session_token: currentSessionToken,
      last_active: new Date().toISOString(),
    })
    .eq("id", userId);
}

 const user = {
  id: userId,
  username: profile?.username || session.user.user_metadata?.username || 'Player',
  email: session.user.email,
  emailVerified: emailVerified,
  avatarData: profile?.avatar_data || null,

  starterCharacter: profile?.starter_character || null,
  equippedHair: profile?.equipped_hair || null,
  equippedTop: profile?.equipped_top || null,
  equippedBottom: profile?.equipped_bottom || null,
  equippedOutfit: profile?.equipped_outfit || "",
  equippedShoes: profile?.equipped_shoes || null,
  equippedAccessory: profile?.equipped_accessory || "",
  ownedItems: profile?.owned_items || [],
  skinTone: profile?.skin_tone || "light",
  coins: profile?.coins ?? 2000,
  rankPoints: profile?.rank_points || 0,
  wins: profile?.wins || 0,
  losses: profile?.losses || 0,
  totalGames: profile?.total_games || 0,
  createdAt: profile?.created_at || session.user.created_at,
  profileStatus: profile?.profile_status || "",
  dailyRewardDay: profile?.daily_reward_day || 1,
dailyRewardLastClaimDate: profile?.daily_reward_last_claim_date || null,
dailyRewardClaimedDays: profile?.daily_reward_claimed_days || [],
profileBgColor: profile?.profile_bg_color || "#dbdbdb",
profileTextColor: profile?.profile_text_color || "#5f4c79",
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
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingUsername } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (existingUsername) {
      return { success: false, message: "Username already taken" };
    }

    const { data: existingEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingEmail) {
      return { success: false, message: "An account with this email already exists. Please login instead." };
    }

    const redirectUrl = getRedirectBaseUrl();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return { success: false, message: "An account with this email already exists. Please login instead." };
      }
      return { success: false, message: error.message };
    }

    if (!data.user) return { success: false, message: "Signup failed" };

    if (data.user.identities && data.user.identities.length === 0) {
      return { success: false, message: "An account with this email already exists. Please login instead." };
    }

   // Trigger created the profile row — update it with our data
const sessionToken = getOrCreateSessionToken();

// Retry up to 5 times in case the trigger hasn't fired yet
let updateSuccess = false;
for (let i = 0; i < 5; i++) {
  await new Promise((res) => setTimeout(res, 300));
  
  const { error: profileError, data: updateData } = await supabase
    .from("profiles")
    .update({
      username: normalizedUsername,
      display_name: username.trim(),
      email: normalizedEmail,
      rank_points: 0,
      wins: 0,
      losses: 0,
      total_games: 0,
      avatar_data: null,
      starter_character: null,
      equipped_hair: null,
      equipped_top: null,
      equipped_bottom: null,
      equipped_shoes: null,
      equipped_outfit: "",
      equipped_accessory: "",
      owned_items: [],
      coins: 2000,
      skin_tone: "light",
      active_session_token: sessionToken,
      last_active: new Date().toISOString(),
     profile_status: "",
     daily_reward_day: 1,
daily_reward_last_claim_date: null,
daily_reward_claimed_days: [],
    })
    .eq("id", data.user.id)
    .select();

  if (!profileError && updateData?.length > 0) {
    updateSuccess = true;
    break;
  }
}

if (!updateSuccess) {
  console.warn("Profile update after signup may have failed — trigger may be delayed");
}

    const user = {
      id: data.user.id,
      username: username.trim(),
      email: normalizedEmail,
      emailVerified: false,
      avatarData: null,
      starterCharacter: null,
      equippedHair: null,
      equippedTop: null,
      equippedBottom: null,
      equippedOutfit: "",
      equippedShoes: null,
      equippedAccessory: "",
      ownedItems: [],
      coins: 2000,
      rankPoints: 0,
      wins: 0,
      losses: 0,
      totalGames: 0,
      skinTone: "light",
      profileStatus: "",
      dailyRewardDay: 1,
dailyRewardLastClaimDate: null,
dailyRewardClaimedDays: [],
    };

    localStorage.setItem("dualmath_current_user", JSON.stringify(user));
    localStorage.setItem("dualmath_pending_verification_email", normalizedEmail);

    return {
      success: true,
      user,
      message: "Account created!",
      requiresVerification: true,
    };
  } catch (error) {
    console.error("Signup error:", error);
    return { success: false, message: "Signup failed. Please try again." };
  }
},

async getMyTribe(userId) {
  try {
    if (!userId) {
      return { success: false, message: "Missing user id." };
    }

    const { data: myMembership, error: membershipError } = await supabase
      .from("tribe_members")
      .select("tribe_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("getMyTribe membership error:", membershipError);
      return { success: false, message: "Could not load tribe." };
    }

    if (!myMembership?.tribe_id) {
      return { success: true, tribe: null, members: [] };
    }

    const { data: tribe, error: tribeError } = await supabase
      .from("tribes")
      .select("*")
      .eq("id", myMembership.tribe_id)
      .maybeSingle();

    if (tribeError) {
      console.error("getMyTribe tribe error:", tribeError);
      return { success: false, message: "Could not load tribe." };
    }

    const { data: memberRows, error: membersError } = await supabase
      .from("tribe_members")
      .select(`
        user_id,
        role,
        joined_at,
profiles:user_id (
  id,
  username,
  avatar_data,
  rank_points,
  wins,
  losses,
  total_games,
  profile_status,
  profile_bg_color,
  profile_text_color
)
      `)
      .eq("tribe_id", myMembership.tribe_id)
      .order("joined_at", { ascending: true });

    if (membersError) {
      console.error("getMyTribe members error:", membersError);
      return { success: false, message: "Could not load tribe members." };
    }

const members = (memberRows || []).map((row) => {
  const profile = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles;

  return {
    id: row.user_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,

    username: profile?.username || "Unknown",
    avatarData: profile?.avatar_data || null,

    wins: profile?.wins || 0,
    losses: profile?.losses || 0,
    totalGames: profile?.total_games || 0,
    rankPoints: profile?.rank_points || 0,

    profileStatus: profile?.profile_status || "",
    profileBgColor: profile?.profile_bg_color || "#dbdbdb",
    profileTextColor: profile?.profile_text_color || "#5f4c79",
  };
});

    return {
      success: true,
      tribe,
      members,
    };
  } catch (err) {
    console.error("getMyTribe catch error:", err);
    return { success: false, message: "Could not load tribe." };
  }
},

async getUserTribeBadge(userId) {
  try {
    if (!userId) {
      return { success: false, tribe: null };
    }

    const { data: membershipRows, error: membershipError } = await supabase
      .from("tribe_members")
      .select("tribe_id, role")
      .eq("user_id", userId)
      .limit(1);

    if (membershipError) {
      console.error("getUserTribeBadge membership error:", membershipError);
      return { success: false, tribe: null, message: membershipError.message };
    }

    const membership = membershipRows?.[0];

    if (!membership?.tribe_id) {
      return { success: true, tribe: null };
    }

    const { data: tribe, error: tribeError } = await supabase
      .from("tribes")
      .select("id, name, owner_id")
      .eq("id", membership.tribe_id)
      .maybeSingle();

    if (tribeError) {
      console.error("getUserTribeBadge tribe error:", tribeError);
      return { success: false, tribe: null, message: tribeError.message };
    }

    return {
      success: true,
      tribe: tribe
        ? {
            id: tribe.id,
            name: tribe.name,
            role: membership.role,
            ownerId: tribe.owner_id,
          }
        : null,
    };
  } catch (err) {
    console.error("getUserTribeBadge catch error:", err);
    return { success: false, tribe: null };
  }
},

async createTribe({ ownerId, name }) {
  try {
    if (!ownerId || !name?.trim()) {
      return { success: false, message: "Missing tribe name." };
    }

    const cleanName = name.trim();

    const { data: existingMembership } = await supabase
      .from("tribe_members")
      .select("id")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, message: "You are already in a tribe." };
    }

    const { data: tribe, error: tribeError } = await supabase
      .from("tribes")
      .insert({
        name: cleanName,
        owner_id: ownerId,
      })
      .select("*")
      .single();

    if (tribeError) {
      console.error("createTribe tribe error:", tribeError);
      return {
        success: false,
        message:
          tribeError.code === "23505"
            ? "That tribe name is already taken."
            : "Could not create tribe.",
      };
    }

    const { error: memberError } = await supabase.from("tribe_members").insert({
      tribe_id: tribe.id,
      user_id: ownerId,
      role: "owner",
    });

    if (memberError) {
      console.error("createTribe member error:", memberError);

      await supabase.from("tribes").delete().eq("id", tribe.id);

      return { success: false, message: "Could not add owner to tribe." };
    }

    return { success: true, tribe };
  } catch (err) {
    console.error("createTribe catch error:", err);
    return { success: false, message: "Could not create tribe." };
  }
},

async addTribeMemberByUsername({ tribeId, actorId, username }) {
  try {
    if (!tribeId || !actorId || !username?.trim()) {
      return { success: false, message: "Missing information." };
    }

    const actorCheck = await this.getTribeMemberRole({ tribeId, userId: actorId });

    if (!actorCheck.success || !["owner", "officer"].includes(actorCheck.role)) {
      return { success: false, message: "You cannot add members." };
    }

    const cleanUsername = username.trim();

    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (userError) {
      console.error("addTribeMemberByUsername user error:", userError);
      return { success: false, message: "Could not find user." };
    }

    if (!targetUser?.id) {
      return { success: false, message: "User not found." };
    }

    const { data: existingMembership } = await supabase
      .from("tribe_members")
      .select("id")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, message: "This user is already in a tribe." };
    }

    const { error: insertError } = await supabase.from("tribe_members").insert({
      tribe_id: tribeId,
      user_id: targetUser.id,
      role: "member",
    });

    if (insertError) {
      console.error("addTribeMemberByUsername insert error:", insertError);
      return { success: false, message: "Could not add member." };
    }

    return { success: true };
  } catch (err) {
    console.error("addTribeMemberByUsername catch error:", err);
    return { success: false, message: "Could not add member." };
  }
},

async getTribeMemberRole({ tribeId, userId }) {
  try {
    const { data, error } = await supabase
      .from("tribe_members")
      .select("role")
      .eq("tribe_id", tribeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("getTribeMemberRole error:", error);
      return { success: false };
    }

    return {
      success: !!data,
      role: data?.role || null,
    };
  } catch (err) {
    console.error("getTribeMemberRole catch error:", err);
    return { success: false };
  }
},

async kickTribeMember({ tribeId, actorId, targetUserId }) {
  try {
    if (!tribeId || !actorId || !targetUserId) {
      return { success: false, message: "Missing information." };
    }

    if (String(actorId) === String(targetUserId)) {
      return { success: false, message: "Use Leave Tribe instead." };
    }

    const actorCheck = await this.getTribeMemberRole({ tribeId, userId: actorId });

    if (!actorCheck.success || !["owner", "officer"].includes(actorCheck.role)) {
      return { success: false, message: "You cannot kick members." };
    }

    const targetCheck = await this.getTribeMemberRole({
      tribeId,
      userId: targetUserId,
    });

    if (targetCheck.role === "owner") {
      return { success: false, message: "You cannot kick the owner." };
    }

    if (actorCheck.role === "officer" && targetCheck.role === "officer") {
      return { success: false, message: "Officers cannot kick other officers." };
    }

    const { error } = await supabase
      .from("tribe_members")
      .delete()
      .eq("tribe_id", tribeId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("kickTribeMember error:", error);
      return { success: false, message: "Could not kick member." };
    }

    await this.logTribeActivity({
    tribeId,
    actorId,
    targetId: targetUserId,
    action: "kicked",
    details: "User was kicked from the tribe.",
  });

    return { success: true };
  } catch (err) {
    console.error("kickTribeMember catch error:", err);
    return { success: false, message: "Could not kick member." };
  }
},

async updateTribeMemberRole({ tribeId, actorId, targetUserId, role }) {
  try {
    if (!["member", "officer"].includes(role)) {
      return { success: false, message: "Invalid role." };
    }

    const actorCheck = await this.getTribeMemberRole({
      tribeId,
      userId: actorId,
    });

    if (!actorCheck?.success || actorCheck.role !== "owner") {
      return { success: false, message: "Only owner can change roles." };
    }

    const targetCheck = await this.getTribeMemberRole({
      tribeId,
      userId: targetUserId,
    });

    if (!targetCheck?.success) {
      return { success: false, message: "Target member not found." };
    }

    if (targetCheck.role === "owner") {
      return { success: false, message: "Cannot change owner role." };
    }

    const { error } = await supabase
      .from("tribe_members")
      .update({ role })
      .eq("tribe_id", tribeId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("updateTribeMemberRole error:", error);
      return { success: false, message: error.message || "Could not update role." };
    }

    const action = role === "officer" ? "promoted" : "demoted";

    const logResult = await this.logTribeActivity({
      tribeId,
      actorId,
      targetId: targetUserId,
      action,
      details:
        role === "officer"
          ? "User was promoted to officer."
          : "User was demoted to member.",
    });

    if (!logResult?.success) {
      console.warn("Role updated, but activity log failed:", logResult?.message);
    }

    return { success: true };
  } catch (err) {
    console.error("updateTribeMemberRole catch error:", err);
    return { success: false, message: "Could not update role." };
  }
},

async leaveTribe({ tribeId, userId }) {
  try {
    const roleCheck = await this.getTribeMemberRole({ tribeId, userId });

    if (roleCheck.role === "owner") {
      return {
        success: false,
        message: "Owner cannot leave. Delete the tribe instead.",
      };
    }

    const { error } = await supabase
      .from("tribe_members")
      .delete()
      .eq("tribe_id", tribeId)
      .eq("user_id", userId);

    if (error) {
      console.error("leaveTribe error:", error);
      return { success: false, message: "Could not leave tribe." };
    }

    await this.logTribeActivity({
  tribeId,
  actorId: userId,
  targetId: userId,
  action: "left",
  details: "User left the tribe.",
});

    return { success: true };
  } catch (err) {
    console.error("leaveTribe catch error:", err);
    return { success: false, message: "Could not leave tribe." };
  }
},

async deleteTribe({ tribeId, ownerId }) {
  try {
    const { data: tribe, error: tribeError } = await supabase
      .from("tribes")
      .select("owner_id")
      .eq("id", tribeId)
      .maybeSingle();

    if (tribeError || !tribe) {
      return { success: false, message: "Tribe not found." };
    }

    if (String(tribe.owner_id) !== String(ownerId)) {
      return { success: false, message: "Only owner can delete tribe." };
    }

    const { error } = await supabase
      .from("tribes")
      .delete()
      .eq("id", tribeId)
      .eq("owner_id", ownerId);

    if (error) {
      console.error("deleteTribe error:", error);
      return { success: false, message: "Could not delete tribe." };
    }

    await this.logTribeActivity({
  tribeId,
  actorId: ownerId,
  targetId: null,
  action: "tribe_deleted",
  details: "Tribe was deleted by the owner.",
});

    return { success: true };
  } catch (err) {
    console.error("deleteTribe catch error:", err);
    return { success: false, message: "Could not delete tribe." };
  }
},

async getTribeAnnouncements(tribeId) {
  try {
    const { data, error } = await supabase
      .from("tribe_announcements")
      .select(`
        id,
        tribe_id,
        author_id,
        message,
        created_at,
        profiles!tribe_announcements_author_id_fkey (
          username
        )
      `)
      .eq("tribe_id", tribeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getTribeAnnouncements error:", error);
      return { success: false, message: error.message };
    }

    const announcements = (data || []).map((item) => ({
      ...item,
      author_username: item.profiles?.username || "Unknown",
    }));

    return { success: true, announcements };
  } catch (err) {
    console.error("getTribeAnnouncements unexpected error:", err);
    return { success: false, message: "Could not load tribe announcements." };
  }
},

async postTribeAnnouncement({ tribeId, actorId, message }) {
  try {
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return { success: false, message: "Message is required." };
    }

    const { error } = await supabase
      .from("tribe_announcements")
      .insert([
        {
          tribe_id: tribeId,
          author_id: actorId,
          message: cleanMessage,
        },
      ]);

    if (error) {
      console.error("postTribeAnnouncement error:", error);
      return { success: false, message: error.message };
    }

    const logResult = await this.logTribeActivity({
      tribeId,
      actorId,
      targetId: actorId,
      action: "announcement_updated",
      details: "Updated the tribe announcement.",
    });

    if (!logResult?.success) {
      console.warn(
        "Announcement saved, but activity log failed:",
        logResult?.message
      );
    }

    return { success: true };
  } catch (err) {
    console.error("postTribeAnnouncement unexpected error:", err);
    return { success: false, message: "Could not post tribe announcement." };
  }
},

logTribeActivity: async ({ tribeId, actorId, targetId = null, action, details = "" }) => {
  try {
    const { error } = await supabase.from("tribe_activity").insert({
      tribe_id: tribeId,
      actor_id: actorId,
      target_id: targetId,
      action,
      details,
    });

    if (error) {
      console.error("logTribeActivity error:", error);
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("logTribeActivity catch error:", err);
    return { success: false, message: "Could not log tribe activity." };
  }
},
async sendTribeRequestByUsername({ tribeId, senderId, username }) {
  try {
    if (!tribeId || !senderId || !username?.trim()) {
      return { success: false, message: "Missing information." };
    }

    const actorCheck = await this.getTribeMemberRole({
      tribeId,
      userId: senderId,
    });

    if (!actorCheck.success || !["owner", "officer"].includes(actorCheck.role)) {
      return { success: false, message: "Only owner or officers can invite users." };
    }

    const cleanUsername = username.trim();

    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (userError || !targetUser?.id) {
      return { success: false, message: "User not found." };
    }

    if (String(targetUser.id) === String(senderId)) {
      return { success: false, message: "You cannot invite yourself." };
    }

    const { data: existingMembership } = await supabase
      .from("tribe_members")
      .select("id")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, message: "This user is already in a tribe." };
    }

    const { data: existingRequest } = await supabase
      .from("tribe_requests")
      .select("id, status")
      .eq("tribe_id", tribeId)
      .eq("receiver_id", targetUser.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return { success: false, message: "This user already has a pending tribe request." };
    }

    const { error: insertError } = await supabase.from("tribe_requests").insert({
      tribe_id: tribeId,
      sender_id: senderId,
      receiver_id: targetUser.id,
      status: "pending",
    });

    if (insertError) {
      console.error("sendTribeRequestByUsername error:", insertError);
      return { success: false, message: "Could not send tribe request." };
    }

    await this.logTribeActivity({
      tribeId,
      actorId: senderId,
      targetId: targetUser.id,
      action: "invite_sent",
      details: `Tribe request sent to ${targetUser.username}.`,
    });

    return { success: true };
  } catch (err) {
    console.error("sendTribeRequestByUsername catch error:", err);
    return { success: false, message: "Could not send tribe request." };
  }
},

getTribeRequests: async (userId) => {
  try {
    const { data, error } = await supabase
      .from("tribe_requests")
      .select(`
        id,
        tribe_id,
        sender_id,
        receiver_id,
        status,
        created_at,
        sender:sender_id (
          id,
          username,
          avatar_data,
          rank_points,
          wins,
          losses,
          total_games
        )
      `)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getTribeRequests error:", error);
      return [];
    }

    const tribeIds = [...new Set((data || []).map((row) => row.tribe_id))];

    const { data: tribeRows, error: tribeError } = await supabase
      .from("tribes")
      .select("id, name, owner_id")
      .in("id", tribeIds);

    if (tribeError) {
      console.error("getTribeRequests tribe lookup error:", tribeError);
    }

    const tribeMap = new Map(
      (tribeRows || []).map((tribe) => [String(tribe.id), tribe])
    );

    return (data || []).map((request) => {
      const sender = Array.isArray(request.sender)
        ? request.sender[0]
        : request.sender;

      const tribe = tribeMap.get(String(request.tribe_id));

      return {
        id: request.id,
        tribeId: request.tribe_id,
        tribeName: tribe?.name || "Unknown Tribe",
        senderId: request.sender_id,
        senderUsername: sender?.username || "Unknown",
        senderAvatarData: sender?.avatar_data || null,
        senderRankPoints: sender?.rank_points ?? 0,
        createdAt: request.created_at,
      };
    });
  } catch (err) {
    console.error("getTribeRequests catch error:", err);
    return [];
  }
},

acceptTribeRequest: async (requestId, userId) => {
  try {
    const { data: request, error: requestError } = await supabase
      .from("tribe_requests")
      .select("id, tribe_id, sender_id, receiver_id, status")
      .eq("id", requestId)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError || !request) {
      return { success: false, message: "Tribe request not found." };
    }

    const { data: existingMembership, error: existingError } = await supabase
      .from("tribe_members")
      .select("id, tribe_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("acceptTribeRequest existing membership error:", existingError);
      return { success: false, message: "Could not check tribe membership." };
    }

    if (existingMembership) {
      return { success: false, message: "You are already in a tribe." };
    }

    const { error: memberError } = await supabase
      .from("tribe_members")
      .insert({
        tribe_id: request.tribe_id,
        user_id: userId,
        role: "member",
      });

    if (memberError) {
      console.error("acceptTribeRequest member insert error:", memberError);
      return {
        success: false,
        message: memberError.message || "Could not join tribe.",
      };
    }

    const { error: deleteError } = await supabase
      .from("tribe_requests")
      .delete()
      .eq("id", requestId)
      .eq("receiver_id", userId);

    if (deleteError) {
      console.warn("Accepted tribe request, but could not remove request:", deleteError);
    }

    try {
      await this.logTribeActivity({
        tribeId: request.tribe_id,
        actorId: userId,
        targetId: userId,
        action: "joined",
        details: "Accepted tribe request and joined the tribe.",
      });
    } catch (logErr) {
      console.warn("Joined tribe, but activity log failed:", logErr);
    }

    return {
      success: true,
      message: "Joined tribe.",
      tribeId: request.tribe_id,
    };
  } catch (err) {
    console.error("acceptTribeRequest catch error:", err);
    return { success: false, message: "Could not accept tribe request." };
  }
},

declineTribeRequest: async (requestId, userId) => {
  try {
    const { data: request, error: requestError } = await supabase
      .from("tribe_requests")
      .select("id, tribe_id, receiver_id")
      .eq("id", requestId)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    // If it is already gone, treat it as declined.
    if (!request) {
      if (requestError) {
        console.warn("declineTribeRequest request lookup warning:", requestError);
      }

      return {
        success: true,
        message: "Tribe request declined.",
      };
    }

    const { error: deleteError } = await supabase
      .from("tribe_requests")
      .delete()
      .eq("id", requestId)
      .eq("receiver_id", userId);

    if (deleteError) {
      console.error("declineTribeRequest delete error:", deleteError);
      return {
        success: false,
        message: deleteError.message || "Could not decline tribe request.",
      };
    }

    // Log activity, but do not fail the decline if logging fails.
    try {
      const logResult = await this.logTribeActivity({
        tribeId: request.tribe_id,
        actorId: userId,
        targetId: userId,
        action: "invite_declined",
        details: "Declined tribe request.",
      });

      if (!logResult?.success) {
        console.warn(
          "Tribe request declined, but activity log failed:",
          logResult?.message
        );
      }
    } catch (logErr) {
      console.warn("Tribe request declined, but activity log threw:", logErr);
    }

    return {
      success: true,
      message: "Tribe request declined.",
    };
  } catch (err) {
    console.error("declineTribeRequest catch error:", err);
    return {
      success: false,
      message: "Could not decline tribe request.",
    };
  }
},

async getTribeActivity(tribeId) {
  try {
    const { data, error } = await supabase
      .from("tribe_activity")
      .select(`
        id,
        tribe_id,
        actor_id,
        target_id,
        action,
        details,
        created_at,
        actor:actor_id (
          username
        ),
        target:target_id (
          username
        )
      `)
      .eq("tribe_id", tribeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getTribeActivity error:", error);
      return { success: false, activity: [] };
    }

    const activity = (data || []).map((item) => ({
      id: item.id,
      action: item.action,
      details: item.details,
      createdAt: item.created_at,
      actorUsername: item.actor?.username || "Unknown",
      targetUsername: item.target?.username || null,
    }));

    return { success: true, activity };
  } catch (err) {
    console.error("getTribeActivity catch error:", err);
    return { success: false, activity: [] };
  }
},

getUserById: async (userId) => {
  
  try {
    const isUuid =
      typeof userId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

    if (!isUuid) {
      console.warn("getUserById called with non-UUID:", userId);
      return null;
    } 
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        avatar_data,
        wins,
        losses,
        total_games,
        rank_points,
        profile_status,
        status,
        last_seen,
        profile_bg_color,
profile_text_color
      `)
      .eq("id", userId)
      .single();

    if (error) {
      console.error("getUserById error:", error);
      return null;
    }

    return {
      id: data.id,
      username: data.username || "Unknown",
      avatarData: data.avatar_data || null,
      wins: data.wins || 0,
      losses: data.losses || 0,
      totalGames: data.total_games || 0,
      rankPoints: data.rank_points || 0,
      profileStatus: data.profile_status || "",
      status: data.status || "offline",
      last_seen: data.last_seen || null,
      profileBgColor: data.profile_bg_color || "#dbdbdb",
profileTextColor: data.profile_text_color || "#5f4c79",
    };
  } catch (error) {
    console.error("getUserById catch error:", error);
    return null;
  }
},
  // Login user
 loginUser: async (emailOrUsername, password) => {
    try {
      let email = emailOrUsername;
      let foundProfile = null;
 
      // If not an email, look up by username
      if (!emailOrUsername.includes("@")) {
        const normalizedUsername = emailOrUsername.trim().toLowerCase();
 
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, active_session_token, active_device_id, last_active")
          .eq("username", normalizedUsername)
          .maybeSingle();
 
        if (profileError || !profile) {
          return { success: false, message: "User not found" };
        }
 
        if (!profile.email) {
          return { success: false, message: "Please login with your email address" };
        }
 
        foundProfile = profile;
        email = profile.email;
      } else {
        const normalizedEmail = emailOrUsername.trim().toLowerCase();
 
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, active_session_token, active_device_id, last_active")
          .eq("email", normalizedEmail)
          .maybeSingle();
 
        if (profileError) {
          return { success: false, message: "Login failed. Please try again." };
        }
 
        foundProfile = profile || null;
        email = normalizedEmail;
      }
 
      // ── Device-based session check ──────────────────────────────────────────
      // Allow login freely if:
      //   (a) no active session exists, OR
      //   (b) the request is coming from the same browser (same device_id), OR
      //   (c) the existing session has gone stale (> 2 min since last_active)
      //
      // Block only when a *different* device/browser has an active, fresh session.
      if (foundProfile?.active_session_token && foundProfile?.active_device_id) {
        const currentDeviceId = getOrCreateDeviceId();
        const isSameDevice = foundProfile.active_device_id === currentDeviceId;
 
        if (!isSameDevice) {
          const lastActiveMs = foundProfile.last_active
            ? new Date(foundProfile.last_active).getTime()
            : 0;
          const SESSION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
          const isSessionFresh = Date.now() - lastActiveMs < SESSION_TIMEOUT_MS;
 
          if (isSessionFresh) {
            return { success: false, message: "This account is already logged in on another device." };
          }
 
          // Stale session on a different device — clear it and proceed
          await supabase
            .from("profiles")
            .update({
              active_session_token: null,
              active_device_id: null,
              status: "offline",
              last_seen: new Date().toISOString(),
            })
            .eq("id", foundProfile.id);
        }
        // Same device → fall through and let them log in normally
      } else if (foundProfile?.active_session_token && !foundProfile?.active_device_id) {
        // Legacy row without device_id: fall back to the old time-based check
        const lastActiveMs = foundProfile.last_active
          ? new Date(foundProfile.last_active).getTime()
          : 0;
        const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
        const isSessionFresh = Date.now() - lastActiveMs < SESSION_TIMEOUT_MS;
 
        if (isSessionFresh) {
          return { success: false, message: "User is already logged in." };
        }
 
        await supabase
          .from("profiles")
          .update({
            active_session_token: null,
            status: "offline",
            last_seen: new Date().toISOString(),
          })
          .eq("id", foundProfile.id);
      }
      // ───────────────────────────────────────────────────────────────────────
 
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
 
      if (error) {
        return { success: false, message: error.message };
      }
 
      if (!data.user) {
        return { success: false, message: "Login failed" };
      }
 
      const sessionToken = getOrCreateSessionToken();
      const deviceId = getOrCreateDeviceId();
      const emailVerified = data.user.email_confirmed_at !== null;
 
      await supabase
        .from("profiles")
        .update({
          active_session_token: sessionToken,
          active_device_id: deviceId,
          last_active: new Date().toISOString(),
          status: "online",
        })
        .eq("id", data.user.id);
 
      const { data: fullProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
 
      const user = {
        id: data.user.id,
        username: fullProfile?.username || data.user.user_metadata?.username || "Player",
        email: data.user.email,
        emailVerified,
        avatarData: fullProfile?.avatar_data || null,
        skinTone: fullProfile?.skin_tone || "light",
        starterCharacter: fullProfile?.starter_character || null,
        equippedHair: fullProfile?.equipped_hair || null,
        equippedTop: fullProfile?.equipped_top || null,
        equippedBottom: fullProfile?.equipped_bottom || null,
        equippedOutfit: fullProfile?.equipped_outfit || "",
        equippedShoes: fullProfile?.equipped_shoes || null,
        equippedAccessory: fullProfile?.equipped_accessory || "",
        ownedItems: fullProfile?.owned_items || [],
        coins: fullProfile?.coins ?? 2000,
        rankPoints: fullProfile?.rank_points || 0,
        wins: fullProfile?.wins || 0,
        losses: fullProfile?.losses || 0,
        totalGames: fullProfile?.total_games || 0,
        profileStatus: fullProfile?.profile_status || "",
        dailyRewardDay: fullProfile?.daily_reward_day || 1,
dailyRewardLastClaimDate: fullProfile?.daily_reward_last_claim_date || null,
dailyRewardClaimedDays: fullProfile?.daily_reward_claimed_days || [],
profileBgColor: fullProfile?.profile_bg_color || "#dbdbdb",
profileTextColor: fullProfile?.profile_text_color || "#5f4c79",
      };
 
      localStorage.setItem("dualmath_current_user", JSON.stringify(user));
 
      if (!emailVerified) {
        localStorage.setItem("dualmath_pending_verification_email", data.user.email);
      } else {
        localStorage.removeItem("dualmath_pending_verification_email");
      }
 
      return {
        success: true,
        user,
        requiresVerification: !emailVerified,
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed. Please try again." };
    }
  },

  // Logout user
  logoutUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        await supabase
          .from("profiles")
          .update({
            active_session_token: null,
            active_device_id: null,
            status: "offline",
            last_seen: new Date().toISOString(),
            last_active: new Date().toISOString(),
          })
          .eq("id", session.user.id);
      }
 
      await supabase.auth.signOut();
      localStorage.removeItem('dualmath_current_user');
      localStorage.removeItem('dualmath_pending_verification_email');
      sessionStorage.removeItem('dualmath_session_token');
      // NOTE: we intentionally do NOT remove dualmath_device_id so the same
      // browser can log back in without being blocked by its own stale session.
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
    const payload = {
      username: (user.username || "").trim().toLowerCase(),
      display_name: (user.username || "").trim(),
      rank_points: user.rankPoints || 0,
      wins: user.wins || 0,
      losses: user.losses || 0,
      total_games: user.totalGames || 0,
      avatar_data: user.avatarData || null,
      coins: user.coins ?? 2000,
skin_tone: user.skinTone || "light",
      starter_character: user.starterCharacter || null,
      equipped_hair: user.equippedHair || null,
      equipped_top: user.equippedTop || null,
      equipped_bottom: user.equippedBottom || null,
      equipped_outfit: user.equippedOutfit || "",
      equipped_shoes: user.equippedShoes || null,
      equipped_accessory: user.equippedAccessory || "",
      owned_items: user.ownedItems || [],
      profile_status: user.profileStatus || "",
      daily_reward_day: user.dailyRewardDay || 1,
daily_reward_last_claim_date: user.dailyRewardLastClaimDate || null,
daily_reward_claimed_days: user.dailyRewardClaimedDays || [],
      last_active: new Date().toISOString(),
      profile_bg_color: user.profileBgColor || "#dbdbdb",
profile_text_color: user.profileTextColor || "#5f4c79",
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (profileError) {
      console.error("saveUser profile update error:", profileError);

      return {
        success: false,
        message: profileError.message || "Could not save profile.",
      };
    }

   const mergedUser = {
  ...user,
  avatarData: payload.avatar_data,
  coins: payload.coins,
   skinTone: payload.skin_tone,
  starterCharacter: payload.starter_character,
  equippedHair: payload.equipped_hair,
  equippedTop: payload.equipped_top,
  equippedBottom: payload.equipped_bottom,
  equippedOutfit: payload.equipped_outfit,
  equippedShoes: payload.equipped_shoes,
  equippedAccessory: payload.equipped_accessory,
  ownedItems: payload.owned_items,
  profileStatus: payload.profile_status,
  dailyRewardDay: payload.daily_reward_day,
dailyRewardLastClaimDate: payload.daily_reward_last_claim_date,
dailyRewardClaimedDays: payload.daily_reward_claimed_days,
profileBgColor: payload.profile_bg_color,
profileTextColor: payload.profile_text_color
};

localStorage.setItem("dualmath_current_user", JSON.stringify(mergedUser));
return { success: true, user: mergedUser };
  } catch (error) {
    console.error("saveUser error:", error);
    return { success: false, message: "Please complete the sign up form to continue." };
  }
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
      const currentDeviceId = getOrCreateDeviceId();
 
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_session_token, active_device_id')
        .eq('id', session.user.id)
        .single();
 
      // Session is invalid only if another *different* device has taken over
      if (
        profile?.active_session_token &&
        profile.active_session_token !== currentSessionToken &&
        profile?.active_device_id &&
        profile.active_device_id !== currentDeviceId
      ) {
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

getAllPlayers: async (currentUserId) => {
  try {
    const playersPromise = supabase
      .from("profiles")
      .select(`
        id,
        username,
        avatar_data,
        wins,
        losses,
        total_games,
        rank_points,
        profile_status,
        status,
        last_seen,
        profile_bg_color,
profile_text_color
      `)
      .order("username", { ascending: true });

    const blockedByMePromise = currentUserId
      ? supabase
          .from("blocked_users")
          .select("blocked_user_id")
          .eq("user_id", currentUserId)
      : Promise.resolve({ data: [], error: null });

    const blockedMePromise = currentUserId
      ? supabase
          .from("blocked_users")
          .select("user_id")
          .eq("blocked_user_id", currentUserId)
      : Promise.resolve({ data: [], error: null });

    const [
      { data: players, error: playersError },
      { data: blockedByMeRows, error: blockedByMeError },
      { data: blockedMeRows, error: blockedMeError },
    ] = await Promise.all([
      playersPromise,
      blockedByMePromise,
      blockedMePromise,
    ]);

    console.log("getAllPlayers currentUserId:", currentUserId);
console.log("blockedByMeRows:", blockedByMeRows);
console.log("blockedMeRows:", blockedMeRows);

    if (playersError) {
      console.error("getAllPlayers playersError:", playersError);
      return [];
    }

    if (blockedByMeError) {
      console.error("getAllPlayers blockedByMeError:", blockedByMeError);
      return [];
    }

    if (blockedMeError) {
      console.error("getAllPlayers blockedMeError:", blockedMeError);
      return [];
    }

    const blockedByMeSet = new Set(
  (blockedByMeRows || []).map((row) => String(row.blocked_user_id))
);
    const blockedMeSet = new Set(
  (blockedMeRows || []).map((row) => String(row.user_id))
);

    return (players || []).map((player) => {
      const wins = player.wins || 0;
      const losses = player.losses || 0;
      const totalGames = player.total_games || 0;
      const winRate =
        totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return {
        id: player.id,
        username: player.username || "Unknown",
        avatarData: player.avatar_data || null,
        wins,
        losses,
        totalGames,
        rankPoints: player.rank_points || 0,
        profileStatus: player.profile_status || "",
        status: player.status || "offline",
        last_seen: player.last_seen || null,
        winRate,
isBlockedByMe: blockedByMeSet.has(String(player.id)),
isBlockedByCurrentUser: blockedMeSet.has(String(player.id)),
profileBgColor: player.profile_bg_color || "#dbdbdb",
profileTextColor: player.profile_text_color || "#5f4c79",
      };
    });
  } catch (error) {
    console.error("getAllPlayers error:", error);
    return [];
  }

  console.log("blockedByMeRows:", blockedByMeRows);
console.log("blockedMeRows:", blockedMeRows);
console.log("blockedMeSet:", [...blockedMeSet]);
console.log("players with block flags:", players?.map(p => ({
  id: p.id,
  username: p.username,
  isBlockedByMe: blockedByMeSet.has(String(p.id)),
  isBlockedByCurrentUser: blockedMeSet.has(String(p.id)),
})));
},

updateStatus: async (userId, status) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        status,
        last_seen: new Date().toISOString(),
        last_active: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("updateStatus error:", error);
      return false;
    }

    const cached = localStorage.getItem("dualmath_current_user");
    if (cached) {
      const user = JSON.parse(cached);
      if (user.id === userId) {
        user.status = status;
        user.last_seen = new Date().toISOString();
        localStorage.setItem("dualmath_current_user", JSON.stringify(user));
      }
    }

    return true;
  } catch (err) {
    console.error("updateStatus catch:", err);
    return false;
  }
},

getUnreadChatSummary: async (currentUserId) => {
  try {
    const { data, error } = await supabase
      .from("friend_messages")
      .select("sender_id")
      .eq("receiver_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error("getUnreadChatSummary error:", error);
      return { unreadSenders: [], unreadCount: 0 };
    }

    const senderIds = [...new Set((data || []).map((row) => row.sender_id))];

    return {
      unreadSenders: senderIds,
      unreadCount: senderIds.length,
    };
  } catch (error) {
    console.error("getUnreadChatSummary catch error:", error);
    return { unreadSenders: [], unreadCount: 0 };
  }
},

markChatAsRead: async (currentUserId, otherUserId) => {
  try {
    const { error } = await supabase
      .from("friend_messages")
      .update({ is_read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", otherUserId)
      .eq("is_read", false);

    if (error) {
      console.error("markChatAsRead error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("markChatAsRead catch error:", error);
    return false;
  }
},

markAllChatsAsRead: async (currentUserId) => {
  try {
    const { error, data } = await supabase
      .from("friend_messages")
      .update({ is_read: true })
      .eq("receiver_id", currentUserId)
      .eq("is_read", false)
      .select();

    console.log("markAllChatsAsRead result:", { currentUserId, data, error });

    if (error) {
      console.error("markAllChatsAsRead error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("markAllChatsAsRead catch error:", error);
    return false;
  }
},

blockUserByUsername: async (currentUserId, username) => {
  try {
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername) {
      return { success: false, message: "Username is required." };
    }

    const { data: targetUser, error: targetError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (targetError) {
      console.error("blockUserByUsername lookup error:", targetError);
      return {
        success: false,
        message: targetError.message || "Could not find user.",
      };
    }

    if (!targetUser?.id) {
      return { success: false, message: "User not found." };
    }

    if (String(targetUser.id) === String(currentUserId)) {
      return { success: false, message: "You cannot block yourself." };
    }

    return await userManager.blockUser(currentUserId, targetUser.id);
  } catch (error) {
    console.error("blockUserByUsername catch error:", error);
    return { success: false, message: "Could not block user." };
  }
},


markChatAsRead: async (currentUserId, otherUserId) => {
  try {
    const { error, data } = await supabase
      .from("friend_messages")
      .update({ is_read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", otherUserId)
      .eq("is_read", false)
      .select();

    console.log("markChatAsRead result:", { currentUserId, otherUserId, data, error });

    if (error) {
      console.error("markChatAsRead error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("markChatAsRead catch error:", error);
    return false;
  }
},

getFriendLastMessages: async (currentUserId, friendIds = []) => {
  try {
    if (!currentUserId || !friendIds.length) return {};

    const { data, error } = await supabase
      .from("friend_messages")
      .select("sender_id, receiver_id, message_text, created_at")
      .or(
        friendIds
          .map(
            (friendId) =>
              `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
          )
          .join(",")
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getFriendLastMessages error:", error);
      return {};
    }

    const map = {};

    for (const row of data || []) {
      const otherId =
        row.sender_id === currentUserId ? row.receiver_id : row.sender_id;

      if (!map[otherId]) {
        map[otherId] = {
          text: row.message_text,
          createdAt: row.created_at,
        };
      }
    }

    return map;
  } catch (error) {
    console.error("getFriendLastMessages catch error:", error);
    return {};
  }
},

getBlockedUsers: async (userId) => {
  try {
    const { data, error } = await supabase
      .from("blocked_users")
      .select(`
        id,
        blocked_user_id,
        blocked:profiles!blocked_users_blocked_user_id_fkey (
          id,
          username,
          avatar_data,
          wins,
          losses,
          total_games,
          rank_points,
          status
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getBlockedUsers error:", error);
      return [];
    }

    return (data || []).map((row) => {
      const blocked = Array.isArray(row.blocked) ? row.blocked[0] : row.blocked;
      const wins = blocked?.wins || 0;
      const losses = blocked?.losses || 0;
      const totalGames = blocked?.total_games || 0;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return {
        blockId: row.id,
        id: blocked?.id,
        username: blocked?.username || "Unknown",
        avatarData: blocked?.avatar_data || null,
        wins,
        losses,
        totalGames,
        rankPoints: blocked?.rank_points || 0,
        winRate,
        status: blocked?.status || "offline",
      };
    });
  } catch (error) {
    console.error("getBlockedUsers catch error:", error);
    return [];
  }
},

unblockUser: async (userId, blockedUserId) => {
  try {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", userId)
      .eq("blocked_user_id", blockedUserId);

    if (error) {
      console.error("unblockUser error:", error);
      return { success: false, message: "Could not unblock user." };
    }

    return { success: true, message: "User unblocked." };
  } catch (error) {
    console.error("unblockUser catch error:", error);
    return { success: false, message: "Could not unblock user." };
  }
},

blockUser: async (userId, blockedUserId) => {
  try {
    const { error } = await supabase
      .from("blocked_users")
      .insert({
        user_id: userId,
        blocked_user_id: blockedUserId,
      });

    if (error) {
      console.error("blockUser error:", error);
      return { success: false, message: error.message || "Could not block user." };
    }

    // Also remove the friendship both ways
    await supabase
      .from("friends")
      .delete()
      .eq("user_id", userId)
      .eq("friend_id", blockedUserId);

    await supabase
      .from("friends")
      .delete()
      .eq("user_id", blockedUserId)
      .eq("friend_id", userId);

    return { success: true, message: "User blocked." };
  } catch (error) {
    console.error("blockUser catch error:", error);
    return { success: false, message: "Could not block user." };
  }
},

declineFriendRequest: async (requestId) => {
  try {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      console.error("declineFriendRequest error:", error);
      return {
        success: false,
        message: error.message || "Could not decline request.",
      };
    }

    return { success: true, message: "Request declined." };
  } catch (error) {
    console.error("declineFriendRequest catch error:", error);
    return { success: false, message: "Could not decline request." };
  }
},

acceptFriendRequest: async (requestId, currentUserId, senderId) => {
  try {
    const { data: existingFriendRows, error: existingFriendError } = await supabase
      .from("friends")
      .select("id, user_id, friend_id")
      .or(
        `and(user_id.eq.${currentUserId},friend_id.eq.${senderId}),and(user_id.eq.${senderId},friend_id.eq.${currentUserId})`
      );

    if (existingFriendError) {
      console.error("acceptFriendRequest existingFriend lookup error:", existingFriendError);
      return {
        success: false,
        message: existingFriendError.message || "Could not verify friendship.",
      };
    }

    const existingPairs = new Set(
      (existingFriendRows || []).map((row) => `${row.user_id}:${row.friend_id}`)
    );

    const rowsToInsert = [];
    if (!existingPairs.has(`${currentUserId}:${senderId}`)) {
      rowsToInsert.push({ user_id: currentUserId, friend_id: senderId });
    }
    if (!existingPairs.has(`${senderId}:${currentUserId}`)) {
      rowsToInsert.push({ user_id: senderId, friend_id: currentUserId });
    }

    if (rowsToInsert.length > 0) {
      const { error: friendsError } = await supabase
        .from("friends")
        .insert(rowsToInsert);

      if (friendsError) {
        console.error("acceptFriendRequest insert error:", friendsError);
        return {
          success: false,
          message: friendsError.message || "Could not create friendship.",
        };
      }
    }

    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${senderId})`
      );

    if (updateError) {
      console.error("acceptFriendRequest update error:", updateError);
      return { success: false, message: updateError.message || "Could not accept request." };
    }

    return { success: true, message: "Friend added." };
  } catch (error) {
    console.error("acceptFriendRequest error:", error);
    return { success: false, message: "Could not accept request." };
  }
},


};

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem('dualmath_device_id');
  if (!deviceId) {
    deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('dualmath_device_id', deviceId);
  }
  return deviceId;
};




export { supabase };