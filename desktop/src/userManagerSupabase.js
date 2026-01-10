// User data management with Supabase persistence
import { supabase } from './supabaseClient.js';
import { getRank, getRankProgress, updatePoints, getWinPoints, getLossPoints } from './rankingSystem.js';

const SESSION_KEY = "mathGame_session"; // Current session (sessionStorage - per tab)

export const userManager = {
  // Get current logged-in user for THIS session/tab
  async getCurrentUser() {
    try {
      // Check sessionStorage for current session
      const session = sessionStorage.getItem(SESSION_KEY);
      if (!session) return null;
      
      const sessionData = JSON.parse(session);
      const odooUserId = sessionData?.odooUserId;
      
      if (!odooUserId) return null;
      
      // Fetch fresh user data from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', odooUserId)
        .single();
      
      if (error || !data) {
        console.error('Error fetching user:', error);
        return null;
      }
      
      return this.mapDbUserToApp(data);
    } catch (e) {
      console.error('Error reading current user:', e);
      return null;
    }
  },

  // Synchronous version that reads from sessionStorage cache
  getCurrentUserSync() {
    try {
      const session = sessionStorage.getItem(SESSION_KEY);
      if (!session) return null;
      
      const sessionData = JSON.parse(session);
      return sessionData?.cachedUser || null;
    } catch (e) {
      console.error('Error reading cached user:', e);
      return null;
    }
  },

  // Map database user to app user format
  mapDbUserToApp(dbUser) {
    return {
      id: dbUser.id,
      odooUserId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      displayName: dbUser.display_name || dbUser.username,
      avatarData: dbUser.avatar_data,
      points: dbUser.points || 0,
      rankPoints: dbUser.rank_points || 0,
      wins: dbUser.wins || 0,
      losses: dbUser.losses || 0,
      totalGames: dbUser.total_games || 0,
      createdAt: dbUser.created_at,
    };
  },

  // Map app user to database format
  mapAppUserToDb(appUser) {
    return {
      username: appUser.username,
      email: appUser.email,
      display_name: appUser.displayName || appUser.username,
      avatar_data: appUser.avatarData,
      points: appUser.points || 0,
      rank_points: appUser.rankPoints || 0,
      wins: appUser.wins || 0,
      losses: appUser.losses || 0,
      total_games: appUser.totalGames || 0,
    };
  },

  // Save/update a user
  async saveUser(user) {
    if (!user || !user.id) {
      console.error('Cannot save user: invalid user object');
      return false;
    }

    try {
      const dbUser = this.mapAppUserToDb(user);
      
      const { error } = await supabase
        .from('users')
        .update(dbUser)
        .eq('id', user.id);
      
      if (error) {
        console.error('Error saving user:', error);
        return false;
      }

      // Update cached user in session
      this.updateSessionCache(user);
      
      return true;
    } catch (e) {
      console.error('Error saving user:', e);
      return false;
    }
  },

  // Update session cache
  updateSessionCache(user) {
    try {
      const session = sessionStorage.getItem(SESSION_KEY);
      if (session) {
        const sessionData = JSON.parse(session);
        sessionData.cachedUser = user;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }
    } catch (e) {
      console.error('Error updating session cache:', e);
    }
  },

  // Check if email exists
  async emailExists(email) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    return !error && data !== null;
  },

  // Check if username exists
  async usernameExists(username) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username)
      .single();
    
    return !error && data !== null;
  },

  // Get user by email
  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !data) return null;
    return this.mapDbUserToApp(data);
  },

  // Get user by username
  async getUserByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .single();
    
    if (error || !data) return null;
    return this.mapDbUserToApp(data);
  },

  // Validate login credentials
  async validateCredentials(emailOrUsername, password) {
    // Try to find by email first
    let dbUser = null;
    
    const { data: emailUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailOrUsername.toLowerCase())
      .single();
    
    if (emailUser) {
      dbUser = emailUser;
    } else {
      // Try username
      const { data: usernameUser } = await supabase
        .from('users')
        .select('*')
        .ilike('username', emailOrUsername)
        .single();
      
      dbUser = usernameUser;
    }

    if (!dbUser) {
      return { success: false, message: "User not found" };
    }

    // Simple password hash comparison
    const hashedPassword = this.simpleHash(password);
    if (dbUser.password_hash !== hashedPassword) {
      return { success: false, message: "Incorrect password" };
    }

    return { success: true, user: this.mapDbUserToApp(dbUser) };
  },

  // Simple password hashing (same as before)
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  },

  // Sign up - Create new user account
  async signupUser(username, email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    // Validation
    if (!normalizedUsername || normalizedUsername.length < 3) {
      return { success: false, message: "Username must be at least 3 characters" };
    }

    if (!normalizedEmail) {
      return { success: false, message: "Email is required" };
    }

    if (!password || password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" };
    }

    // Check if email exists
    if (await this.emailExists(normalizedEmail)) {
      return { success: false, message: "Email already registered" };
    }

    // Check if username exists
    if (await this.usernameExists(normalizedUsername)) {
      return { success: false, message: "Username already taken" };
    }

    // Create new user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash: this.simpleHash(password),
        display_name: normalizedUsername,
        avatar_data: null,
        points: 0,
        rank_points: 0,
        wins: 0,
        losses: 0,
        total_games: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return { success: false, message: "Failed to create account. Please try again." };
    }

    const user = this.mapDbUserToApp(data);
    
    // Set session for this tab
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ 
      odooUserId: user.id,
      cachedUser: user
    }));

    return { success: true, user };
  },

  // Login with email or username and password
  async loginUser(emailOrUsername, password) {
    const trimmed = emailOrUsername.trim();

    if (!trimmed) {
      return { success: false, message: "Email or username is required" };
    }

    if (!password) {
      return { success: false, message: "Password is required" };
    }

    const result = await this.validateCredentials(trimmed, password);
    
    if (!result.success) {
      return result;
    }

    const user = result.user;
    
    // Set session for this tab
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ 
      odooUserId: user.id,
      cachedUser: user
    }));
    
    return { success: true, user };
  },

  // Logout current user (this tab only)
  logoutUser() {
    sessionStorage.removeItem(SESSION_KEY);
  },

  // Get current rank based on rank points
  getUserRank(user = null) {
    const currentUser = user || this.getCurrentUserSync();
    if (!currentUser) return 'Novice';
    const rankPoints = currentUser.rankPoints ?? 0;
    return getRank(rankPoints);
  },

  // Get rank progress percentage
  getUserRankProgress(user = null) {
    const currentUser = user || this.getCurrentUserSync();
    if (!currentUser) return 0;
    const rankPoints = currentUser.rankPoints ?? 0;
    return getRankProgress(rankPoints);
  },

  // Get user stats (wins, losses, win rate, etc.)
  getUserStats(user = null) {
    const currentUser = user || this.getCurrentUserSync();
    if (!currentUser) return null;
    
    const wins = currentUser.wins || 0;
    const losses = currentUser.losses || 0;
    const totalGames = currentUser.totalGames || (wins + losses) || 0;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

    return {
      wins,
      losses,
      totalGames,
      winRate,
      rankPoints: currentUser.rankPoints || 0,
      rank: this.getUserRank(currentUser)
    };
  },

  // Handle game win with ranking system
  async handleGameWin() {
    const user = await this.getCurrentUser();
    if (!user) return null;

    if (user.rankPoints === undefined) {
      user.rankPoints = 0;
    }

    const oldPoints = user.rankPoints;
    const oldRank = getRank(oldPoints);
    const pointsGained = getWinPoints(oldPoints);
    
    user.rankPoints = updatePoints(oldPoints, true);
    user.wins = (user.wins || 0) + 1;
    user.totalGames = (user.totalGames || 0) + 1;
    
    const newRank = getRank(user.rankPoints);
    const rankUp = oldRank !== newRank;

    await this.saveUser(user);

    return { 
      user, 
      rankUp, 
      oldRank, 
      newRank,
      pointsGained,
      oldPoints,
      newPoints: user.rankPoints
    };
  },

  // Handle game loss with ranking system
  async handleGameLoss() {
    const user = await this.getCurrentUser();
    if (!user) return null;

    if (user.rankPoints === undefined) {
      user.rankPoints = 0;
    }

    const oldPoints = user.rankPoints;
    const oldRank = getRank(oldPoints);
    const pointsLost = getLossPoints(oldPoints);
    
    user.rankPoints = updatePoints(oldPoints, false);
    user.losses = (user.losses || 0) + 1;
    user.totalGames = (user.totalGames || 0) + 1;
    
    const newRank = getRank(user.rankPoints);
    const rankDown = oldRank !== newRank;

    await this.saveUser(user);

    return { 
      user, 
      rankDown, 
      oldRank, 
      newRank,
      pointsLost,
      oldPoints,
      newPoints: user.rankPoints
    };
  },

  // Update user avatar
  async updateAvatar(username, avatarData) {
    const user = await this.getUserByUsername(username);

    if (user) {
      user.avatarData = avatarData;
      const saved = await this.saveUser(user);
      return saved ? user : null;
    }
    return null;
  },

  // Update display name
  async updateDisplayName(username, displayName) {
    const user = await this.getUserByUsername(username);

    if (user) {
      user.displayName = displayName;
      const saved = await this.saveUser(user);
      return saved ? user : null;
    }
    return null;
  },

  // Get leaderboard
  async getLeaderboard() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('rank_points', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
    
    return data.map(u => this.mapDbUserToApp(u));
  },
};