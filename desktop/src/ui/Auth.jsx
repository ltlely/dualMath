import React, { useState, useRef, useEffect } from "react";
import { Card, Button, Input } from "./components.jsx";
import { userManager } from "../userManager.js";

export default function Auth({ onLoginSuccess, isLoggedIn, currentUser, onClose }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarData, setAvatarData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(""); // For showing upload progress
  const fileInputRef = useRef(null);

  // Update avatar state when currentUser changes
  useEffect(() => {
    if (currentUser?.avatarData) {
      setAvatarData(currentUser.avatarData);
    } else {
      setAvatarData(null);
    }
  }, [currentUser?.avatarData, currentUser?.id]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = () => {
    const trimmed = emailOrUsername.trim();

    if (!trimmed) {
      setError("Please enter email or username");
      return;
    }

    if (!password) {
      setError("Please enter password");
      return;
    }

    setIsLoading(true);
    setError("");

    setTimeout(() => {
      const result = userManager.loginUser(trimmed, password);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Get the most up-to-date user data from storage
      const currentUser = userManager.getCurrentUser();
      setAvatarData(currentUser?.avatarData || result.user.avatarData);
      setEmailOrUsername("");
      setPassword("");
      if (onLoginSuccess) {
        onLoginSuccess(currentUser || result.user);
      }
    }, 300);
  };

  const handleSignup = () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      setError("Please enter a username");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter an email");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    setTimeout(() => {
      const result = userManager.signupUser(trimmedUsername, trimmedEmail, password);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setAvatarData(result.user.avatarData);
      setUsername("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
      setIsLoginMode(true);
    }, 300);
  };

  const handleLogout = () => {
    userManager.logoutUser();
    setIsLoginMode(true);
    setEmailOrUsername("");
    setUsername("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setAvatarData(null);
    if (onLoginSuccess) {
      onLoginSuccess(null);
    }
    if (onClose) onClose();
  };

  // Compress image to reduce size
  const compressImage = (file, maxWidth = 200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Read the file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous states
    setError('');
    setUploadStatus('Processing image...');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF, etc.)');
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      let avatarDataUrl;
      
      // If file is larger than 100KB, compress it
      if (file.size > 100000) {
        setUploadStatus('Compressing image...');
        avatarDataUrl = await compressImage(file, 200, 0.7);
      } else {
        // Small file, read directly
        avatarDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }
      
      // Check final size (localStorage has ~5MB limit, but we want to be conservative)
      const dataSize = avatarDataUrl.length;
      if (dataSize > 500000) { // 500KB after compression
        setError('Image is still too large after compression. Please use a smaller image.');
        setUploadStatus('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setUploadStatus('Saving...');
      setAvatarData(avatarDataUrl);
      
      // Update avatar in userManager
      const updated = userManager.updateAvatar(currentUser.username, avatarDataUrl);
      
      if (updated) {
        // Get fresh user data and update parent state
        const freshUser = userManager.getCurrentUser();
        if (freshUser && onLoginSuccess) {
          console.log('✅ Avatar updated successfully');
          onLoginSuccess(freshUser);
        }
        setUploadStatus('');
      } else {
        setError('Failed to save avatar. Storage might be full. Try a smaller image.');
        setAvatarData(currentUser?.avatarData || null); // Revert
        setUploadStatus('');
      }
      
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError('Failed to process image. Please try again with a different image.');
      setUploadStatus('');
    }
    
    // Clear the file input for next upload
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarData(null);
    setError('');
    setUploadStatus('');
    userManager.updateAvatar(currentUser.username, null);
    const freshUser = userManager.getCurrentUser();
    if (freshUser && onLoginSuccess) {
      onLoginSuccess(freshUser);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="authModal">
        {isLoginMode ? (
          <Card title="Login">
            <div className="stack">
              <p className="muted">Enter your email or username to login</p>
              <Input
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  setError("");
                }}
                placeholder="email or username"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoading}
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Password"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoading}
              />
              {error && <div className="error">{error}</div>}
              <Button onClick={handleLogin} disabled={!emailOrUsername.trim() || !password || isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
              <div className="authToggle">
                <span className="muted">Don't have an account? </span>
                <button
                  className="linkBtn"
                  onClick={() => {
                    setIsLoginMode(false);
                    setError("");
                  }}
                >
                  Sign up
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Create Account">
            <div className="stack">
              <p className="muted">Create a new account</p>
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Username (3+ chars)"
                disabled={isLoading}
                maxLength="20"
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="Email"
                disabled={isLoading}
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Password (6+ chars)"
                disabled={isLoading}
              />
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  setError("");
                }}
                placeholder="Confirm Password"
                onKeyPress={(e) => e.key === "Enter" && handleSignup()}
                disabled={isLoading}
              />
              {error && <div className="error">{error}</div>}
              <Button
                onClick={handleSignup}
                disabled={!username.trim() || !email.trim() || !password || !passwordConfirm || isLoading}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
              <div className="authToggle">
                <span className="muted">Already have an account? </span>
                <button
                  className="linkBtn"
                  onClick={() => {
                    setIsLoginMode(true);
                    setError("");
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="authPanel">
      <Card
        title="Account Settings"
        right={
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        }
      >
        <div className="stack">
          <div className="userProfile">
            <div className="avatarSection">
              <div className="largeAvatar">
                {avatarData ? (
                  <img src={avatarData} alt="Avatar" />
                ) : (
                  <div className="avatarPlaceholder">
                    {currentUser?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className="userInfo">
                <div className="username">@{currentUser?.username}</div>
                <div className="displayNameSmall">{currentUser?.email}</div>
                
              </div>
            </div>

            <div className="uploadSection">
              <label className="label">Change Avatar</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError('');
                    setUploadStatus('');
                    fileInputRef.current?.click();
                  }}
                  disabled={!!uploadStatus}
                >
                  {uploadStatus || "📸 Upload Photo"}
                </Button>
                {avatarData && !uploadStatus && (
                  <Button
                    variant="secondary"
                    onClick={handleRemoveAvatar}
                  >
                    🗑️ Remove
                  </Button>
                )}
              </div>
              {error && (
                <div className="error" style={{ 
                  marginTop: "8px", 
                  fontSize: "12px", 
                  padding: "8px",
                  background: "rgba(251,113,133,.08)",
                  border: "1px solid rgba(251,113,133,.5)",
                  borderRadius: "8px",
                  color: "rgba(251,113,133,.9)"
                }}>
                  {error}
                </div>
              )}
              <p className="muted" style={{ fontSize: "12px", marginTop: "8px" }}>
                Upload a profile picture (JPG, PNG). Large images will be automatically compressed.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <style>{`
        .authPanel .largeAvatar {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(124,92,255,.18);
          border: 2px solid rgba(124,92,255,.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .authPanel .largeAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .authPanel .avatarPlaceholder {
          font-size: 32px;
          font-weight: 900;
          color: var(--accent);
        }
        
        .authPanel .avatarSection {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        
        .authPanel .userInfo {
          flex: 1;
        }
        
        .authPanel .username {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .authPanel .displayNameSmall {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 12px;
        }
        
        .authPanel .stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .authPanel .statItem {
          font-size: 12px;
          padding: 4px 8px;
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(38,38,74,.6);
          border-radius: 6px;
        }
        
        .authPanel .statLabel {
          color: var(--muted);
          margin-right: 4px;
        }
        
        .authPanel .statValue {
          font-weight: 700;
          color: var(--accent);
        }
        
        .authPanel .uploadSection {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(38,38,74,.6);
        }
      `}</style>
    </div>
  );
}