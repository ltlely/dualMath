// User data management with localStorage persistence
// Uses sessionStorage for current session to prevent cross-tab login conflicts
import { getRank, getRankProgress, updatePoints, getWinPoints, getLossPoints } from './rankingSystem.js';

// Simple password hashing (for client-side, not production secure)
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

const SESSION_KEY = "mathGame_session"; // Current session (sessionStorage - per tab)
const USERS_KEY = "mathGame_users";     // All users data (localStorage - persistent)

// Helper function to safely set localStorage with error handling
const safeSetItem = (storage, key, value) => {
  try {
    storage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded. Clearing old data...');
      storage.removeItem(key);
      try {
        storage.setItem(key, value);
        return true;
      } catch (e2) {
        console.error('Still exceeded after clearing. Data too large.');
        return false;
      }
    }
    console.error('Error saving to storage:', e);
    return false;
  }
};

export const userManager = {
  // Get current logged-in user for THIS session/tab
  getCurrentUser() {
    try {
      // Use sessionStorage for current session (tab-specific)
      const session = sessionStorage.getItem(SESSION_KEY);
      if (!session) return null;
      
      const sessionData = JSON.parse(session);
      const userId = sessionData?.userId;
      
      if (!userId) return null;
      
      // Get the latest user data from localStorage (shared storage)
      const users = this.getAllUsers();
      return users[userId] || null;
    } catch (e) {
      console.error('Error reading current user:', e);
      return null;
    }
  },

  // Get all users from shared storage
  getAllUsers() {
    try {
      const users = localStorage.getItem(USERS_KEY);
      return users ? JSON.parse(users) : {};
    } catch (e) {
      console.error('Error reading users:', e);
      return {};
    }
  },

  // Save/update a user
  saveUser(user) {
    if (!user || !user.id) {
      console.error('Cannot save user: invalid user object');
      return false;
    }

    try {
      // Update in users collection (localStorage)
      const users = this.getAllUsers();
      users[user.id] = user;
      const usersSuccess = safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));
      
      // Update session if it's the current user
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === user.id) {
        // Session already points to this user, data will be fresh on next getCurrentUser()
      }
      
      return usersSuccess;
    } catch (e) {
      console.error('Error saving user:', e);
      return false;
    }
  },

  // Check if email exists
  emailExists(email) {
    const users = this.getAllUsers();
    return Object.values(users).some(user => user.email?.toLowerCase() === email.toLowerCase());
  },

  // Check if username exists
  usernameExists(username) {
    const users = this.getAllUsers();
    return Object.values(users).some(user => user.username?.toLowerCase() === username.toLowerCase());
  },

  // Get user by email
  getUserByEmail(email) {
    const users = this.getAllUsers();
    return Object.values(users).find(user => user.email?.toLowerCase() === email.toLowerCase()) || null;
  },

  // Get user by username
  getUserByUsername(username) {
    const users = this.getAllUsers();
    return Object.values(users).find(user => user.username?.toLowerCase() === username.toLowerCase()) || null;
  },

  // Validate login credentials
  validateCredentials(emailOrUsername, password) {
    let user = null;
    
    // Try to find by email first
    user = this.getUserByEmail(emailOrUsername);
    
    // If not found by email, try username
    if (!user) {
      user = this.getUserByUsername(emailOrUsername);
    }

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const hashedPassword = simpleHash(password);
    if (user.passwordHash !== hashedPassword) {
      return { success: false, message: "Incorrect password" };
    }

    return { success: true, user };
  },

  // Sign up - Create new user account
  signupUser(username, email, password) {
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

    if (this.emailExists(normalizedEmail)) {
      return { success: false, message: "Email already registered" };
    }

    if (this.usernameExists(normalizedUsername)) {
      return { success: false, message: "Username already taken" };
    }

    // Create new user
    const userId = Date.now().toString();
    const users = this.getAllUsers();
    const user = {
      id: userId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash: simpleHash(password),
      displayName: normalizedUsername,
      avatarData: null,
      points: 0,
      rankPoints: 0,
      wins: 0,
      losses: 0,
      totalGames: 0,
      createdAt: Date.now(),
    };

    users[userId] = user;
    
    // Save to shared storage
    const usersSuccess = safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));
    
    // Set session for this tab only
    const sessionSuccess = safeSetItem(sessionStorage, SESSION_KEY, JSON.stringify({ userId: user.id }));
    
    if (!usersSuccess || !sessionSuccess) {
      return { success: false, message: "Failed to save user data. Storage quota exceeded." };
    }

    return { success: true, user };
  },

  // Login with email or username and password
  loginUser(emailOrUsername, password) {
    const trimmed = emailOrUsername.trim();

    if (!trimmed) {
      return { success: false, message: "Email or username is required" };
    }

    if (!password) {
      return { success: false, message: "Password is required" };
    }

    const result = this.validateCredentials(trimmed, password);
    
    if (!result.success) {
      return result;
    }

    const user = result.user;
    
    // Set session for this tab only (not shared across tabs)
    const success = safeSetItem(sessionStorage, SESSION_KEY, JSON.stringify({ userId: user.id }));
    
    if (!success) {
      return { success: false, message: "Failed to save login session. Try clearing your browser data." };
    }
    
    return { success: true, user };
  },

  // Logout current user (this tab only)
  logoutUser() {
    sessionStorage.removeItem(SESSION_KEY);
  },

  // Add points to current user (legacy method for backward compatibility)
  addPoints(points) {
    const user = this.getCurrentUser();
    if (!user) return null;

    user.points += points;
    user.wins += 1;

    const users = this.getAllUsers();
    users[user.id] = user;

    safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));

    return user;
  },

  // Get current rank based on rank points
  getUserRank(user = null) {
    const currentUser = user || this.getCurrentUser();
    if (!currentUser) return 'Novice';
    const rankPoints = currentUser.rankPoints ?? 0;
    return getRank(rankPoints);
  },

  // Get rank progress percentage
  getUserRankProgress(user = null) {
    const currentUser = user || this.getCurrentUser();
    if (!currentUser) return 0;
    const rankPoints = currentUser.rankPoints ?? 0;
    return getRankProgress(rankPoints);
  },

  // Get user stats (wins, losses, win rate, etc.)
  getUserStats(user = null) {
    const currentUser = user || this.getCurrentUser();
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
  handleGameWin() {
    const user = this.getCurrentUser();
    if (!user) return null;

    // Initialize rankPoints if it doesn't exist (for existing users)
    if (user.rankPoints === undefined) {
      user.rankPoints = 0;
    }

    const oldPoints = user.rankPoints;
    const oldRank = getRank(oldPoints);
    const pointsGained = getWinPoints(oldPoints);
    
    // Update rank points based on current rank
    user.rankPoints = updatePoints(oldPoints, true);
    user.wins = (user.wins || 0) + 1;
    user.totalGames = (user.totalGames || 0) + 1;
    
    const newRank = getRank(user.rankPoints);
    const rankUp = oldRank !== newRank;

    const users = this.getAllUsers();
    users[user.id] = user;

    safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));

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
  handleGameLoss() {
    const user = this.getCurrentUser();
    if (!user) return null;

    // Initialize rankPoints if it doesn't exist (for existing users)
    if (user.rankPoints === undefined) {
      user.rankPoints = 0;
    }

    const oldPoints = user.rankPoints;
    const oldRank = getRank(oldPoints);
    const pointsLost = getLossPoints(oldPoints);
    
    // Update rank points based on current rank
    user.rankPoints = updatePoints(oldPoints, false);
    user.losses = (user.losses || 0) + 1;
    user.totalGames = (user.totalGames || 0) + 1;
    
    const newRank = getRank(user.rankPoints);
    const rankDown = oldRank !== newRank;

    const users = this.getAllUsers();
    users[user.id] = user;

    safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));

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
  updateAvatar(username, avatarData) {
    const user = this.getUserByUsername(username);

    if (user) {
      user.avatarData = avatarData;
      const users = this.getAllUsers();
      users[user.id] = user;
      
      const usersSuccess = safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));
      
      if (!usersSuccess) {
        return null;
      }

      return user;
    }
    return null;
  },

  // Update display name
  updateDisplayName(username, displayName) {
    const user = this.getUserByUsername(username);

    if (user) {
      user.displayName = displayName;
      const users = this.getAllUsers();
      users[user.id] = user;
      safeSetItem(localStorage, USERS_KEY, JSON.stringify(users));

      return user;
    }
    return null;
  },

  // Get leaderboard
  getLeaderboard() {
    const users = Object.values(this.getAllUsers());
    return users.sort((a, b) => (b.rankPoints ?? 0) - (a.rankPoints ?? 0));
  },

  // Clear all storage (useful for debugging)
  clearAllData() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USERS_KEY);
  }
};