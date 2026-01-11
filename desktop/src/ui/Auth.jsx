import React, { useState, useRef, useEffect } from "react";
import { Card, Button, Input } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";

export default function Auth({ onLoginSuccess, isLoggedIn, currentUser, onClose }) {
  const [mode, setMode] = useState("login"); // login, signup, forgot, verify, reset
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarData, setAvatarData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const fileInputRef = useRef(null);

  // Update avatar state when currentUser changes
  useEffect(() => {
    if (currentUser?.avatarData) {
      setAvatarData(currentUser.avatarData);
    } else {
      setAvatarData(null);
    }
  }, [currentUser?.avatarData, currentUser?.id]);

  // Check for password reset token or email verification in URL
  useEffect(() => {
    const hash = window.location.hash;
    
    // Check if already in recovery mode (from localStorage flag)
    const isRecoveryMode = localStorage.getItem('dualmath_password_recovery_mode') === 'true';
    if (isRecoveryMode) {
      console.log('🔐 Recovery mode flag detected - showing reset form');
      setMode("reset");
      return;
    }
    
    if (!hash) return;
    
    const hashParams = new URLSearchParams(hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    console.log('🔗 URL hash detected:', { type, hasToken: !!accessToken });
    
    if (type === 'recovery' && accessToken) {
      // Password reset flow
      // Set recovery mode flag
      localStorage.setItem('dualmath_password_recovery_mode', 'true');
      console.log('🔐 Recovery link detected - showing reset form');
      setMode("reset");
      
    } else if (type === 'signup' && accessToken) {
      // Email verification callback
      console.log('✅ Email verification link detected');
      
      const handleEmailVerification = async () => {
        try {
          // Wait for Supabase to process the token
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh the user data
          const freshUser = await userManager.getCurrentUser();
          if (freshUser?.emailVerified && onLoginSuccess) {
            setSuccess('Email verified successfully! You can now play.');
            onLoginSuccess(freshUser);
          } else {
            setSuccess('Email verified! Please login to continue.');
          }
        } catch (err) {
          console.error('Error handling email verification:', err);
        }
        
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
      };
      
      handleEmailVerification();
      setMode("login");
      
    } else if (type === 'magiclink' && accessToken) {
      console.log('🔗 Magic link detected');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Cooldown timer for resend verification
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Session validation interval
  useEffect(() => {
    if (!isLoggedIn) return;

    const validateInterval = setInterval(async () => {
      const result = await userManager.validateSession();
      if (!result.valid && result.reason === 'session_replaced') {
        setError("You've been logged out because another device signed in.");
        if (onLoginSuccess) onLoginSuccess(null);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(validateInterval);
  }, [isLoggedIn, onLoginSuccess]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = async () => {
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
    clearMessages();

    try {
      const result = await userManager.loginUser(trimmed, password);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Check if email verification is required
      if (result.requiresVerification) {
        setMode("verify");
        setEmail(result.user.email);
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
        return;
      }

      const freshUser = await userManager.getCurrentUser();
      setAvatarData(freshUser?.avatarData || result.user.avatarData);
      setEmailOrUsername("");
      setPassword("");
      if (onLoginSuccess) {
        onLoginSuccess(freshUser || result.user);
      }
    } catch (err) {
      setIsLoading(false);
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
    }
  };

  const handleSignup = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      setError("Please enter a username");
      return;
    }

    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters");
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const result = await userManager.signupUser(trimmedUsername, trimmedEmail, password);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Show verification screen
      if (result.requiresVerification) {
        setMode("verify");
        setSuccess("Account created! Please check your email to verify your account.");
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
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
    } catch (err) {
      setIsLoading(false);
      setError("Signup failed. Please try again.");
      console.error("Signup error:", err);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const result = await userManager.sendPasswordResetEmail(trimmedEmail);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      setEmail("");
    } catch (err) {
      setIsLoading(false);
      setError("Failed to send reset email. Please try again.");
      console.error("Forgot password error:", err);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const result = await userManager.updatePassword(newPassword);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Clear recovery mode flag
      localStorage.removeItem('dualmath_password_recovery_mode');
      
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      
      // Show success and switch to login mode
      setSuccess("Password updated successfully! Please login with your new password.");
      setNewPassword("");
      setNewPasswordConfirm("");
      
      // Important: Tell parent we're logged out so they show Auth component
      if (onLoginSuccess) {
        onLoginSuccess(null);
      }
      
      // Switch to login mode after a short delay
      setTimeout(() => {
        setMode("login");
      }, 100);
      
    } catch (err) {
      setIsLoading(false);
      setError("Failed to update password. The reset link may have expired. Please request a new one.");
      console.error("Reset password error:", err);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    clearMessages();

    try {
      // Pass the email we have (from currentUser or state)
      const emailToUse = currentUser?.email || email;
      const result = await userManager.resendVerificationEmail(emailToUse);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      setIsLoading(false);
      setError("Failed to resend verification email.");
      console.error("Resend verification error:", err);
    }
  };

  const handleLogout = async () => {
    await userManager.logoutUser();
    setMode("login");
    setEmailOrUsername("");
    setUsername("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setAvatarData(null);
    clearMessages();
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
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    clearMessages();
    setUploadStatus('Processing image...');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF, etc.)');
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      let avatarDataUrl;
      
      if (file.size > 100000) {
        setUploadStatus('Compressing image...');
        avatarDataUrl = await compressImage(file, 200, 0.7);
      } else {
        avatarDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }
      
      const dataSize = avatarDataUrl.length;
      if (dataSize > 500000) {
        setError('Image is still too large after compression. Please use a smaller image.');
        setUploadStatus('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      setUploadStatus('Saving to database...');
      setAvatarData(avatarDataUrl);
      
      const updated = await userManager.updateAvatar(currentUser.username, avatarDataUrl);
      
      if (updated) {
        const freshUser = await userManager.getCurrentUser();
        if (freshUser && onLoginSuccess) {
          console.log('✅ Avatar updated successfully');
          onLoginSuccess(freshUser);
        }
        setUploadStatus('');
      } else {
        setError('Failed to save avatar. Please try again.');
        setAvatarData(currentUser?.avatarData || null);
        setUploadStatus('');
      }
      
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError('Failed to process image. Please try again with a different image.');
      setUploadStatus('');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = async () => {
    setAvatarData(null);
    clearMessages();
    setUploadStatus('');
    await userManager.updateAvatar(currentUser.username, null);
    const freshUser = await userManager.getCurrentUser();
    if (freshUser && onLoginSuccess) {
      onLoginSuccess(freshUser);
    }
  };

  // PASSWORD RESET SCREEN - Must be first, before any other checks
  // This ensures users can reset password even if "logged in" via recovery token
  const isRecoveryMode = mode === "reset" || 
                         localStorage.getItem('dualmath_password_recovery_mode') === 'true' ||
                         window.location.hash.includes('type=recovery');
  
  if (isRecoveryMode && mode !== "login") {
    return (
      <div className="authModal">
        <Card title="🔐 Reset Password">
          <div className="stack">
            <p className="muted">Enter your new password below.</p>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearMessages();
              }}
              placeholder="New Password (6+ chars)"
              disabled={isLoading}
            />
            <Input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => {
                setNewPasswordConfirm(e.target.value);
                clearMessages();
              }}
              placeholder="Confirm New Password"
              onKeyPress={(e) => e.key === "Enter" && handleResetPassword()}
              disabled={isLoading}
            />
            {success && <div className="success">{success}</div>}
            {error && <div className="error">{error}</div>}
            <Button 
              onClick={handleResetPassword} 
              disabled={!newPassword || !newPasswordConfirm || isLoading}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
            <button
              className="linkBtn"
              onClick={() => {
                // Clear recovery mode and go to login
                localStorage.removeItem('dualmath_password_recovery_mode');
                setMode("login");
                clearMessages();
                window.history.replaceState(null, '', window.location.pathname);
                // Tell parent we're logged out
                if (onLoginSuccess) {
                  onLoginSuccess(null);
                }
              }}
            >
              Cancel
            </button>
          </div>
        </Card>
        
        <style>{`
          .success {
            padding: 12px;
            background: rgba(45,212,191,.08);
            border: 1px solid rgba(45,212,191,.5);
            border-radius: 8px;
            color: rgba(45,212,191,.9);
            font-size: 14px;
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  // Email Verification Screen
  if (mode === "verify" || (currentUser && !currentUser.emailVerified)) {
    return (
      <div className="authModal">
        <Card title="📧 Verify Your Email">
          <div className="stack">
            <div className="verifyIcon">✉️</div>
            <p className="verifyText">
              We've sent a verification link to:
            </p>
            <div className="emailDisplay">{currentUser?.email || email}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              Please check your inbox and click the verification link to continue playing.
            </p>
            
            {success && <div className="success">{success}</div>}
            {error && <div className="error">{error}</div>}
            
            <Button 
              onClick={handleResendVerification} 
              disabled={isLoading || resendCooldown > 0}
              variant="secondary"
            >
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : isLoading 
                  ? "Sending..." 
                  : "📨 Resend Verification Email"}
            </Button>
            
            <div className="divider">
              <span>or</span>
            </div>
            
            <Button 
              onClick={async () => {
                const freshUser = await userManager.getCurrentUser();
                if (freshUser?.emailVerified) {
                  onLoginSuccess(freshUser);
                } else {
                  setError("Email not verified yet. Please check your inbox.");
                }
              }}
              disabled={isLoading}
            >
              🔄 I've Verified My Email
            </Button>
            
            <button
              className="linkBtn"
              onClick={handleLogout}
              style={{ marginTop: '10px' }}
            >
              Use a different account
            </button>
          </div>
        </Card>
        
        <style>{`
          .verifyIcon {
            font-size: 64px;
            text-align: center;
            margin-bottom: 10px;
          }
          .verifyText {
            text-align: center;
            color: var(--muted);
            margin-bottom: 8px;
          }
          .emailDisplay {
            text-align: center;
            font-weight: 700;
            font-size: 16px;
            padding: 12px 16px;
            background: rgba(124,92,255,.1);
            border: 1px solid rgba(124,92,255,.3);
            border-radius: 10px;
            margin-bottom: 12px;
          }
          .divider {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--muted);
            font-size: 12px;
          }
          .divider::before,
          .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--line);
          }
          .success {
            padding: 12px;
            background: rgba(45,212,191,.08);
            border: 1px solid rgba(45,212,191,.5);
            border-radius: 8px;
            color: rgba(45,212,191,.9);
            font-size: 14px;
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  // Forgot Password Screen
  if (mode === "forgot") {
    return (
      <div className="authModal">
        <Card title="🔑 Forgot Password">
          <div className="stack">
            <p className="muted">Enter your email address and we'll send you a link to reset your password.</p>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearMessages();
              }}
              placeholder="Email address"
              onKeyPress={(e) => e.key === "Enter" && handleForgotPassword()}
              disabled={isLoading}
            />
            {success && <div className="success">{success}</div>}
            {error && <div className="error">{error}</div>}
            <Button 
              onClick={handleForgotPassword} 
              disabled={!email.trim() || isLoading}
            >
              {isLoading ? "Sending..." : "📧 Send Reset Link"}
            </Button>
            <div className="authToggle">
              <span className="muted">Remember your password? </span>
              <button
                className="linkBtn"
                onClick={() => {
                  setMode("login");
                  clearMessages();
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </Card>
        
        <style>{`
          .success {
            padding: 12px;
            background: rgba(45,212,191,.08);
            border: 1px solid rgba(45,212,191,.5);
            border-radius: 8px;
            color: rgba(45,212,191,.9);
            font-size: 14px;
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  // Not logged in - show login or signup
  if (!isLoggedIn) {
    return (
      <div className="authModal">
        {mode === "login" ? (
          <Card title="Login">
            <div className="stack">
              <p className="muted">Enter your email or username to login</p>
              {success && <div className="success">{success}</div>}
              <Input
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  setError("");
                }}
                placeholder="Email or username"
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
              
              <button
                className="linkBtn forgotLink"
                onClick={() => {
                  setMode("forgot");
                  clearMessages();
                }}
              >
                Forgot password?
              </button>
              
              <div className="authToggle">
                <span className="muted">Don't have an account? </span>
                <button
                  className="linkBtn"
                  onClick={() => {
                    setMode("signup");
                    clearMessages();
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
                  clearMessages();
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
                  clearMessages();
                }}
                placeholder="Email"
                disabled={isLoading}
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearMessages();
                }}
                placeholder="Password (6+ chars)"
                disabled={isLoading}
              />
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  clearMessages();
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
                    setMode("login");
                    clearMessages();
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </Card>
        )}
        
        <style>{`
          .forgotLink {
            text-align: center;
            font-size: 13px;
            color: var(--muted);
          }
          .forgotLink:hover {
            color: var(--accent);
          }
          .success {
            padding: 12px;
            background: rgba(45,212,191,.08);
            border: 1px solid rgba(45,212,191,.5);
            border-radius: 8px;
            color: rgba(45,212,191,.9);
            font-size: 14px;
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  // Logged in - show account settings
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
                {currentUser?.emailVerified ? (
                  <div className="verifiedBadge">✓ Email Verified</div>
                ) : (
                  <div className="unverifiedBadge">⚠ Email Not Verified</div>
                )}
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
                    clearMessages();
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
          margin-bottom: 8px;
        }
        
        .verifiedBadge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(45,212,191,.1);
          border: 1px solid rgba(45,212,191,.4);
          border-radius: 20px;
          font-size: 12px;
          color: rgba(45,212,191,.9);
          font-weight: 600;
        }
        
        .unverifiedBadge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(251,113,133,.1);
          border: 1px solid rgba(251,113,133,.4);
          border-radius: 20px;
          font-size: 12px;
          color: rgba(251,113,133,.9);
          font-weight: 600;
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