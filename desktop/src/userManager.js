// User data management with localStorage persistence
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

const STORAGE_KEY = "mathGame_user";
const USERS_KEY = "mathGame_users";

// Helper function to safely set localStorage with error handling
const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Clearing old data...');
      // Try to clear current user and retry
      localStorage.removeItem(STORAGE_KEY);
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e2) {
        console.error('Still exceeded after clearing. Data too large.');
        return false;
      }
    }
    console.error('Error saving to localStorage:', e);
    return false;
  }
};

export const userManager = {
  // Get current logged-in user
  getCurrentUser() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      return current ? JSON.parse(current) : null;
    } catch (e) {
      console.error('Error reading current user:', e);
      return null;
    }
  },

  // Get all users
  getAllUsers() {
    try {
      const users = localStorage.getItem(USERS_KEY);
      return users ? JSON.parse(users) : {};
    } catch (e) {
      console.error('Error reading users:', e);
      return {};
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
      wins: 0,
      createdAt: Date.now(),
    };

    users[userId] = user;
    
    const usersSuccess = safeSetItem(USERS_KEY, JSON.stringify(users));
    const userSuccess = safeSetItem(STORAGE_KEY, JSON.stringify(user));
    
    if (!usersSuccess || !userSuccess) {
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
    const success = safeSetItem(STORAGE_KEY, JSON.stringify(user));
    
    if (!success) {
      return { success: false, message: "Failed to save login session. Try clearing your browser data." };
    }
    
    return { success: true, user };
  },

  // Logout current user
  logoutUser() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Add points to current user
  addPoints(points) {
    const user = this.getCurrentUser();
    if (!user) return null;

    user.points += points;
    user.wins += 1;

    const users = this.getAllUsers();
    users[user.id] = user;

    safeSetItem(USERS_KEY, JSON.stringify(users));
    safeSetItem(STORAGE_KEY, JSON.stringify(user));

    return user;
  },

  // Update user avatar
  updateAvatar(username, avatarData) {
    const user = this.getUserByUsername(username);

    if (user) {
      user.avatarData = avatarData;
      const users = this.getAllUsers();
      users[user.id] = user;
      
      const usersSuccess = safeSetItem(USERS_KEY, JSON.stringify(users));
      
      const current = this.getCurrentUser();
      if (current && current.id === user.id) {
        current.avatarData = avatarData;
        const userSuccess = safeSetItem(STORAGE_KEY, JSON.stringify(current));
        
        if (!usersSuccess || !userSuccess) {
          return null;
        }
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
      safeSetItem(USERS_KEY, JSON.stringify(users));

      const current = this.getCurrentUser();
      if (current && current.id === user.id) {
        current.displayName = displayName;
        safeSetItem(STORAGE_KEY, JSON.stringify(current));
      }

      return user;
    }
    return null;
  },

  // Get leaderboard
  getLeaderboard() {
    const users = Object.values(this.getAllUsers());
    return users.sort((a, b) => b.points - a.points);
  },

  // Clear all storage (useful for debugging)
  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USERS_KEY);
  }
};