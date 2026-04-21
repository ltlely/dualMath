import React, { useState, useEffect } from "react";
import { Card, Button, Input } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";
import PickCharacter from "./PickCharacter.jsx";

export default function Auth({ onLoginSuccess, isLoggedIn, currentUser, onClose, onOpenPickCharacter, }) {
  const [mode, setMode] = useState("login"); // login, signup, forgot, verify, reset, pickCharacter
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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [newUser, setNewUser] = useState(null);
  // pendingVerifyEmail is used to show the verify screen after signup
  // without having a logged-in currentUser yet
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState(null);


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
      localStorage.setItem('dualmath_password_recovery_mode', 'true');
      console.log('🔐 Recovery link detected - showing reset form');
      setMode("reset");
      
    } else if (type === 'signup' && accessToken) {
      // Email verification callback — just land on login with a success banner.
      // We do NOT auto-login here; the user must log in manually so the normal
      // login flow (including character pick for new accounts) runs cleanly.
      console.log('✅ Email verification link detected');
      window.history.replaceState(null, '', window.location.pathname);
      setMode("login");
      setSuccess("✅ Email verified! You can now log in and start playing.");
      
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
    }, 30000);

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

      // Block login if email is not verified — send them to the verify screen
      if (result.requiresVerification || (result.user && result.user.emailVerified === false)) {
        setPendingVerifyEmail(result.user?.email || null);
        setMode("verify");
        setError("Please verify your email before logging in. Check your inbox for the verification link.");
        return;
      }

      const freshUser = await userManager.getCurrentUser();
      const loggedInUser = freshUser || result.user;

      setAvatarData(loggedInUser?.avatarData || null);
      setEmailOrUsername("");
      setPassword("");

      // New user with no character yet — go pick one
      if (!loggedInUser?.starterCharacter) {
        if (onOpenPickCharacter) {
          onOpenPickCharacter(loggedInUser);
          return;
        }
        setNewUser(loggedInUser);
        setMode("pickCharacter");
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
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

      // Always go to verify screen after signup.
      // Character selection happens after the user verifies + logs in.
      setPendingVerifyEmail(trimmedEmail);
      setUsername("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setMode("verify");
      setSuccess("Account created! Check your inbox for a verification link.");
    } catch (err) {
      setIsLoading(false);
      setError("Signup failed. Please try again.");
      console.error("Signup error:", err);
    }
  };

  const handleCharacterComplete = (userWithAvatar) => {
    setNewUser(null);
    setMode("login");
    setSuccess("");

    if (onLoginSuccess) {
      onLoginSuccess(userWithAvatar);
    }

    if (onClose) {
      onClose();
    }
  };

  const handleCharacterBack = () => {
    setNewUser(null);
    setMode("login");
    setSuccess("");
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

      localStorage.removeItem('dualmath_password_recovery_mode');
      window.history.replaceState(null, '', window.location.pathname);

      setSuccess("Password updated! Please log in with your new password.");
      setNewPassword("");
      setNewPasswordConfirm("");
      setMode("login");

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
      const emailToUse = pendingVerifyEmail || currentUser?.email || email;
      console.log('📧 Resending verification to:', emailToUse);
      
      const result = await userManager.resendVerificationEmail(emailToUse);
      setIsLoading(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      setResendCooldown(60);
    } catch (err) {
      setIsLoading(false);
      setError("Failed to resend verification email.");
      console.error("Resend verification error:", err);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    clearMessages();

    try {
      const result = await userManager.refreshEmailVerificationStatus();
      
      console.log('📧 Verification check result:', result);
      
      if (result.verified) {
        setSuccess("Email verified! Logging you in...");
        const freshUser = await userManager.getCurrentUser();
        if (freshUser && onLoginSuccess) {
          onLoginSuccess(freshUser);
        }
      } else {
        setError("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (err) {
      console.error("Check verification error:", err);
      setError("Failed to check verification status. Please try again.");
    } finally {
      setCheckingVerification(false);
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
    setPendingVerifyEmail(null);
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

  const handleRemoveAvatar = async () => {
    setAvatarData(null);
    clearMessages();
    await userManager.updateAvatar(currentUser.username, null);
    const freshUser = await userManager.getCurrentUser();
    if (freshUser && onLoginSuccess) {
      onLoginSuccess(freshUser);
    }
  };

  // PASSWORD RESET SCREEN
  const isRecoveryMode = mode === "reset" || 
                         localStorage.getItem('dualmath_password_recovery_mode') === 'true' ||
                         window.location.hash.includes('type=recovery');
  
  if (isRecoveryMode && mode !== "login") {
    return (
      <div className="authScreen lobbySparkles">
         <img src="/clouds.png" alt="" className="authCloud authCloud1" />
  <img src="/clouds.png" alt="" className="authCloud authCloud2" />
  <img src="/clouds.png" alt="" className="authCloud authCloud3" />
  <img src="/clouds.png" alt="" className="authCloud authCloud4" />
  <img src="/clouds.png" alt="" className="authCloud authCloud5" />
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
                localStorage.removeItem('dualmath_password_recovery_mode');
                setMode("login");
                clearMessages();
                window.history.replaceState(null, '', window.location.pathname);
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

        @keyframes authCloudFloat {
  0% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
  25% {
    transform: translate3d(8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  50% {
    transform: translate3d(0, -18px, 0) scaleX(var(--cloud-flip, 1));
  }
  75% {
    transform: translate3d(-8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  100% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
}

.authBrand {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  text-align: center;
  pointer-events: none;
}

.authBrandSubtitle {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(107, 79, 52, 0.88);
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
  margin-top: 140px;
}

.authModal {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin-top: 00px;
}

.authCloud {
  position: absolute;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  opacity: 0.9;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(191, 141, 86, 0.18));
  animation: authCloudFloat 7s ease-in-out infinite;
  will-change: transform;
}

.authCloud1 {
  width: 520px;
  top: -108px;
  left: -80px;
  --cloud-flip: 1;
  animation-duration: 7.5s;
  animation-delay: 0s;
}

.authCloud2 {
  width: 480px;
  top: 120px;
  right: 180px;
 
  animation-duration: 8.2s;
  animation-delay: 0.8s;
}

.authCloud3 {
  width: 640px;
  bottom: 26px;
  left: 10px;
  
  animation-duration: 9s;
  animation-delay: 1.4s;
}

.authCloud4 {
  width: 570px;
  bottom: -200px;
  right: -108px;
  --cloud-flip: 1;
  animation-duration: 8.8s;
  animation-delay: 0.4s;
}

.authCloud5 {
  width: 440px;
  top: -200px;
  left: 100%;
  
  animation-duration: 7.8s;
  animation-delay: 1.1s;
  margin-left: -220px;
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}
        .authScreen {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 235, 190, 0.62), transparent 34%),
    linear-gradient(180deg, #ecdcb8 10%, #cfb07a 55%, #b98f58 100%);
}



.authScreen::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.20), transparent 8%),
    radial-gradient(circle at 78% 24%, rgba(255,245,220,0.16), transparent 10%),
    radial-gradient(circle at 68% 74%, rgba(255,255,255,0.14), transparent 9%),
    radial-gradient(circle at 28% 78%, rgba(255,245,220,0.12), transparent 11%);
  filter: blur(10px);
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}

.authModal > * {
  
  background: linear-gradient(180deg, rgba(255, 249, 236, 0.96), rgba(238, 212, 155, 0.92)) !important;
  border: 1px solid rgba(224, 171, 63, 0.32) !important;
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.14),
    0 0 18px rgba(255, 226, 150, 0.45),
    0 0 36px rgba(224, 171, 63, 0.32),
    0 0 60px rgba(224, 171, 63, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.45) !important;
}

@keyframes authCardGlow {
  0%, 100% {
    box-shadow:
      0 20px 40px rgba(95, 70, 48, 0.16),
      0 0 22px rgba(255, 231, 168, 0.55),
      0 0 46px rgba(237, 187, 87, 0.4),
      0 0 78px rgba(224, 171, 63, 0.24),
      inset 0 1px 0 rgba(255,255,255,0.5);
  }
  50% {
    box-shadow:
      0 20px 40px rgba(95, 70, 48, 0.16),
      0 0 28px rgba(255, 231, 168, 0.72),
      0 0 56px rgba(237, 187, 87, 0.52),
      0 0 96px rgba(224, 171, 63, 0.34),
      inset 0 1px 0 rgba(255,255,255,0.5);
  }
}

.authModal > * {
  animation: authCardGlow 2.8s ease-in-out infinite;
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

          .authScreen.lobbySparkles::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(255,244,210,0.24) 0 1px, transparent 1.9px),
    radial-gradient(circle, rgba(255,255,255,0.18) 0 1.2px, transparent 2px);
  background-size: 120px 120px, 170px 170px, 220px 220px;
  background-position: 20px 14px, 80px 50px, 140px 26px;
  opacity: 0.7;
}
        `}</style>
      </div>
      </div>
    );
  }

  // Email Verification Screen — shown after signup OR if a logged-in user isn't verified
  if (mode === "verify") {
    const displayEmail = pendingVerifyEmail || currentUser?.email || email;
    return (
      <div className="authScreen lobbySparkles">
         <img src="/clouds.png" alt="" className="authCloud authCloud1" />
  <img src="/clouds2.png" alt="" className="authCloud authCloud2" />
  <img src="/clouds2.png" alt="" className="authCloud authCloud3" />
  <img src="/clouds.png" alt="" className="authCloud authCloud4" />
  <img src="/clouds2.png" alt="" className="authCloud authCloud5" />
      <div className="authModal">
        <Card title="📧 Verify Your Email">
          <div className="stack">
            <div className="verifyIcon">✉️</div>
            <p className="verifyText">
              We've sent a verification link to:
            </p>
            <div className="emailDisplay">{displayEmail}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              Click the link in your inbox (check spam too). Once verified, come back here and log in to start playing!
            </p>
            
            {success && <div className="success">{success}</div>}
            {error && <div className="error">{error}</div>}

            <div className="divider"><span>already clicked the link?</span></div>
            
            <Button 
              onClick={() => {
                setPendingVerifyEmail(null);
                setMode("login");
                clearMessages();
              }}
            >
              Go to Login
            </Button>
            
            <div className="divider">
              <span>didn't get the email?</span>
            </div>
            
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
            
            <button
              className="linkBtn"
              onClick={() => {
                setPendingVerifyEmail(null);
                setMode("signup");
                clearMessages();
              }}
              style={{ marginTop: '10px' }}
            >
              Use a different account
            </button>
          </div>
        </Card>
        
        <style>{`
.authCloud {
  position: absolute;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  opacity: 0.9;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(191, 141, 86, 0.18));
}

.authCloud1 {
  width: 220px;
  top: 38px;
  left: -20px;
}

.authCloud2 {
  width: 180px;
  top: 120px;
  right: -10px;
 
}

.authCloud3 {
  width: 240px;
  bottom: 26px;
  left: 10px;
  
}

.authCloud4 {
  width: 170px;
  bottom: 90px;
  right: 18px;
}

.authCloud5 {
  width: 140px;
  top: 260px;
  left: 50%;
 
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}
        .authScreen.lobbySparkles::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(255,244,210,0.24) 0 1px, transparent 1.9px),
    radial-gradient(circle, rgba(255,255,255,0.18) 0 1.2px, transparent 2px);
  background-size: 120px 120px, 170px 170px, 220px 220px;
  background-position: 20px 14px, 80px 50px, 140px 26px;
  opacity: 0.7;
}

        .authScreen {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 235, 190, 0.62), transparent 34%),
    linear-gradient(180deg, #ecdcb8 10%, #cfb07a 55%, #b98f58 100%);
}

.authScreen::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.20), transparent 8%),
    radial-gradient(circle at 78% 24%, rgba(255,245,220,0.16), transparent 10%),
    radial-gradient(circle at 68% 74%, rgba(255,255,255,0.14), transparent 9%),
    radial-gradient(circle at 28% 78%, rgba(255,245,220,0.12), transparent 11%);
  filter: blur(10px);
}

.authScreen.lobbySparkles::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(255,244,210,0.24) 0 1px, transparent 1.9px),
    radial-gradient(circle, rgba(255,255,255,0.18) 0 1.2px, transparent 2px);
  background-size: 120px 120px, 170px 170px, 220px 220px;
  background-position: 20px 14px, 80px 50px, 140px 26px;
  opacity: 0.7;
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}

.authModal > * {
 
  background: linear-gradient(180deg, rgba(255, 249, 236, 0.92), rgba(238, 212, 155, 0.9)) !important;
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.14),
    0 0 28
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
      </div>
    );
  }

  // Forgot Password Screen
  if (mode === "forgot") {
    return (
      <div className="authScreen lobbySparkles">
         <img src="/clouds.png" alt="" className="authCloud authCloud1" />
  <img src="/clouds.png" alt="" className="authCloud authCloud2" />
  <img src="/clouds.png" alt="" className="authCloud authCloud3" />
  <img src="/clouds.png" alt="" className="authCloud authCloud4" />
  <img src="/clouds.png" alt="" className="authCloud authCloud5" />
      <div className="authModal">
        <Card title="🔑 Forgot Password">
          <div className="stack">
            <p className="muted">Enter your email address and we'll send you a link to reset your password.</p>
        
            <Input
              className="forgotEmailInput"
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

        .authModal .forgotEmailInput,
.authModal .forgotEmailInput input,
.authModal input.forgotEmailInput {
  border: 2px solid #c9ab86 !important;
  border-radius: 12px !important;
  background: #fffaf2 !important;
  color: #6b4f34 !important;
  height: 46px;
  padding: 0 14px;
  box-shadow: inset 0 1px 2px rgba(107, 79, 52, 0.06) !important;
}

.authModal .forgotEmailInput:focus,
.authModal .forgotEmailInput input:focus,
.authModal input.forgotEmailInput:focus {
  outline: none;
  border-color: #b88e63 !important;
  box-shadow: 0 0 0 3px rgba(201, 171, 134, 0.22) !important;
}
@keyframes authCloudFloat {
  0% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
  25% {
    transform: translate3d(8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  50% {
    transform: translate3d(0, -18px, 0) scaleX(var(--cloud-flip, 1));
  }
  75% {
    transform: translate3d(-8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  100% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
}

.authBrand {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  text-align: center;
  pointer-events: none;
  margin-bottom: 20px;
  
}

.authBrandTitle {
  font-size: clamp(38px, 6vw, 72px);
  font-weight: 1000;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff7e3;
  text-shadow:
    0 2px 0 #c99437,
    0 4px 0 #b07a25,
    0 10px 24px rgba(95, 70, 48, 0.28),
    0 0 20px rgba(255, 226, 150, 0.42);
}

.authBrandSubtitle {
  margin-top: 20px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(107, 79, 52, 0.88);
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
   margin-bottom: 20px;
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}

.authCloud {
  position: absolute;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  opacity: 0.9;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(191, 141, 86, 0.18));
  animation: authCloudFloat 7s ease-in-out infinite;
  will-change: transform;
}

.authCloud1 {
  width: 520px;
  top: -108px;
  left: -80px;
  --cloud-flip: 1;
  animation-duration: 7.5s;
  animation-delay: 0s;
}

.authCloud2 {
  width: 480px;
  top: 120px;
  right: 180px;
  
  animation-duration: 8.2s;
  animation-delay: 0.8s;
}

.authCloud3 {
  width: 640px;
  bottom: 26px;
  left: 10px;
 
  animation-duration: 9s;
  animation-delay: 1.4s;
}

.authCloud4 {
  width: 570px;
  bottom: -200px;
  right: -108px;
  --cloud-flip: 1;
  animation-duration: 8.8s;
  animation-delay: 0.4s;
}

.authCloud5 {
  width: 440px;
  top: -200px;
  left: 100%;
  
  animation-duration: 7.8s;
  animation-delay: 1.1s;
  margin-left: -220px;
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}
        .authScreen {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 235, 190, 0.62), transparent 34%),
    linear-gradient(180deg, #ecdcb8 10%, #cfb07a 55%, #b98f58 100%);
}



.authScreen::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.20), transparent 8%),
    radial-gradient(circle at 78% 24%, rgba(255,245,220,0.16), transparent 10%),
    radial-gradient(circle at 68% 74%, rgba(255,255,255,0.14), transparent 9%),
    radial-gradient(circle at 28% 78%, rgba(255,245,220,0.12), transparent 11%);
  filter: blur(10px);
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}

.authModal > * {
 
  background: linear-gradient(180deg, rgba(255, 249, 236, 0.96), rgba(238, 212, 155, 0.92)) !important;
  border: 1px solid rgba(224, 171, 63, 0.32) !important;
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.14),
    0 0 18px rgba(255, 226, 150, 0.45),
    0 0 36px rgba(224, 171, 63, 0.32),
    0 0 60px rgba(224, 171, 63, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.45) !important;
}

@keyframes authCardGlow {
  0%, 100% {
    box-shadow:
      0 20px 40px rgba(95, 70, 48, 0.16),
      0 0 22px rgba(255, 231, 168, 0.55),
      0 0 46px rgba(237, 187, 87, 0.4),
      0 0 78px rgba(224, 171, 63, 0.24),
      inset 0 1px 0 rgba(255,255,255,0.5);
  }
  50% {
    box-shadow:
      0 20px 40px rgba(95, 70, 48, 0.16),
      0 0 28px rgba(255, 231, 168, 0.72),
      0 0 56px rgba(237, 187, 87, 0.52),
      0 0 96px rgba(224, 171, 63, 0.34),
      inset 0 1px 0 rgba(255,255,255,0.5);
  }
}

.authModal > * {
  animation: authCardGlow 2.8s ease-in-out infinite;
}

.authScreen::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.20), transparent 8%),
    radial-gradient(circle at 78% 24%, rgba(255,245,220,0.16), transparent 10%),
    radial-gradient(circle at 68% 74%, rgba(255,255,255,0.14), transparent 9%),
    radial-gradient(circle at 28% 78%, rgba(255,245,220,0.12), transparent 11%);
  filter: blur(10px);
}

.authScreen.lobbySparkles::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(255,244,210,0.24) 0 1px, transparent 1.9px),
    radial-gradient(circle, rgba(255,255,255,0.18) 0 1.2px, transparent 2px);
  background-size: 120px 120px, 170px 170px, 220px 220px;
  background-position: 20px 14px, 80px 50px, 140px 26px;
  opacity: 0.7;
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}

.authModal > * {

  background: linear-gradient(180deg, rgba(255, 249, 236, 0.92), rgba(238, 212, 155, 0.9)) !important;
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.14),
    0 0 28
        .authModal .forgotEmailInput,
        .authModal .forgotEmailInput input,
        .authModal input.forgotEmailInput {
          border: 2px solid #c9ab86 !important;
          border-radius: 12px !important;
          background: #fffaf2 !important;
          color: #6b4f34 !important;
          height: 46px;
          padding: 0 14px;
          box-shadow: inset 0 1px 2px rgba(107, 79, 52, 0.06) !important;
        }

        .authModal .forgotEmailInput:focus,
        .authModal .forgotEmailInput input:focus,
        .authModal input.forgotEmailInput:focus {
          outline: none;
          border-color: #b88e63 !important;
          box-shadow: 0 0 0 3px rgba(201, 171, 134, 0.22) !important;
        }

        .authModal button:not(.linkBtn) {
          border: 2px solid #c9ab86 !important;
          border-radius: 12px !important;
          background: linear-gradient(180deg, #fffaf2 0%, #f6ead8 100%) !important;
          color: #6b4f34 !important;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(107, 79, 52, 0.08) !important;
          width: 170px;
          height: 42px;
          align-self: center;
        }

        .authModal button:not(.linkBtn):hover {
          background: linear-gradient(180deg, #fdf1df 0%, #ecd3ad 100%) !important;
          border-color: #b88e63 !important;
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
      </div>
    );
  }

  // Not logged in - show login or signup
  if (!isLoggedIn) {
    if (mode === "pickCharacter" && newUser && !newUser.starterCharacter) {
      return (
        <div className="authModal">
          <PickCharacter
            currentUser={newUser}
            onComplete={handleCharacterComplete}
            onBack={handleCharacterBack}
          />
        </div>
      );
    }

    return (
      <div className="authScreen lobbySparkles">
          <img src="/clouds.png" alt="" className="authCloud authCloud1" />
  <img src="/clouds.png" alt="" className="authCloud authCloud2" />
  <img src="/clouds.png" alt="" className="authCloud authCloud3" />
  <img src="/clouds.png" alt="" className="authCloud authCloud4" />
  <img src="/clouds.png" alt="" className="authCloud authCloud5" />

  <div className="shootingStar" />

   <div className="authBrand">
    <div className="authBrandTitle">Digi Rush</div>
    <div className="authBrandSubtitle">Battle, learn, and level up</div>
  </div>

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
              
              <div className="authToggle authToggleCentered">
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
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearMessages();
                }}
                placeholder="Username (3+ chars)"
                disabled={isLoading}
                maxLength="12"
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
                className="nextBtn"
                onClick={handleSignup}
                disabled={!username.trim() || !email.trim() || !password || !passwordConfirm || isLoading}
              >
                {isLoading ? "Creating account..." : "Next"}
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

.authToggleCentered {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
  text-align: center;
}

.authToggleCentered .muted,
.authToggleCentered .linkBtn {
  display: inline;
}
        @keyframes shootingStarFly {
  0% {
    transform: translate3d(-10vw, -10vh, 0) rotate(25deg);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  30% {
    transform: translate3d(35vw, 20vh, 0) rotate(25deg);
    opacity: 1;
  }
  45% {
    transform: translate3d(55vw, 32vh, 0) rotate(25deg);
    opacity: 0;
  }
  100% {
    transform: translate3d(55vw, 32vh, 0) rotate(25deg);
    opacity: 0;
  }
}

.shootingStar {
  position: absolute;
  top: 40px;
  left: 80px;
  width: 140px;
  height: 3px;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0),
    rgba(255,248,220,0.9),
    rgba(255,215,120,1)
  );
  box-shadow:
    0 0 8px rgba(255, 248, 220, 0.9),
    0 0 18px rgba(255, 215, 120, 0.75),
    0 0 28px rgba(224, 171, 63, 0.45);
  animation: shootingStarFly 5.5s linear infinite;
}

.shootingStar::before {
  content: "";
  position: absolute;
  right: -6px;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, #fffdf4 0%, #ffd86b 55%, rgba(255,216,107,0) 100%);
  box-shadow:
    0 0 10px rgba(255,255,255,0.9),
    0 0 18px rgba(255,216,107,0.8);
}

@media (max-width: 700px) {
  .shootingStar {
    width: 90px;
    top: 28px;
    left: 30px;
    animation-duration: 6.5s;
  }
}
  
@keyframes authCloudFloat {
  0% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
  25% {
    transform: translate3d(8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  50% {
    transform: translate3d(0, -18px, 0) scaleX(var(--cloud-flip, 1));
  }
  75% {
    transform: translate3d(-8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  100% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
}

.authScreen {
  min-height: 100dvh !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  padding: 24px !important;
  position: relative !important;
  overflow: hidden !important;
}

.authBrand {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  z-index: 2 !important;
  text-align: center !important;
  pointer-events: none !important;
  width: min(92vw, 1200px) !important;
  margin: 150px 0 20 0 !important;

}

.authBrandTitle {
  font-size: clamp(32px, 7vw, 96px) !important;
  font-weight: 1000 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #fff7e3 !important;
  text-shadow:
    0 2px 0 #c99437,
    0 4px 0 #b07a25,
    0 10px 24px rgba(95, 70, 48, 0.28),
    0 0 20px rgba(255, 226, 150, 0.42) !important;
  line-height: 1 !important;
  white-space: normal !important;
}

.authBrandSubtitle {
  margin-top: 6px !important;
  font-size: clamp(10px, 1.4vw, 16px) !important;
  font-weight: 800 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  color: rgba(107, 79, 52, 0.88) !important;
  text-shadow: 0 1px 0 rgba(255,255,255,0.35) !important;
  line-height: 1.2 !important;
  white-space: normal !important;
}

.authModal {
  width: min(94vw, 1200px) !important;
  max-width: 1200px !important;
  position: relative !important;
  z-index: 1 !important;
  margin: 0 !important;
  min-height: 70vh;
}

.authModal > * {
  width: 100% !important;
  max-width: none !important;
  min-width: 300px !important;
}

.authModal .card,
.authModal [class*="card"],
.authModal > * > * {
  width: 100% !important;
  max-width: none !important;
}

@media (max-width: 700px) {
  .authBrand {
    width: 94vw !important;
    margin: 16px 0 0 0 !important;
  }

  .authBrandTitle {
    font-size: clamp(26px, 9vw, 40px) !important;
  }

  .authBrandSubtitle {
    font-size: 10px !important;
    letter-spacing: 0.08em !important;
  }

  .authModal > * {
    min-width: 0 !important;
  }
}

.card {
  width: 100%;
  max-width: none;
  margin-bottom: 250px;
}

.authModal {
  width: min(94vw, 1200px) !important;
  max-width: 500px !important;
  position: relative;
  z-index: 1;
  margin-top: 0 !important;
}

.authModal > * {
  width: 100% !important;
  max-width: 1200px !important;
  min-width: 300px !important;
}

.authModal .card,
.authModal [class*="card"],
.authModal > * > * {
  width: 100% !important;
  max-width: 1200px !important;
  margin-top: 0 !important;

}

.authCloud {
  position: absolute;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  opacity: 0.9;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(191, 141, 86, 0.18));
  animation: authCloudFloat 7s ease-in-out infinite;
  will-change: transform;
}

.authCloud1 {
  width: 520px;
  top: -108px;
  left: -80px;
  --cloud-flip: 1;
  animation-duration: 7.5s;
  animation-delay: 0s;
}

.authCloud2 {
  width: 480px;
  top: 120px;
  right: 180px;
  
  animation-duration: 8.2s;
  animation-delay: 0.8s;
}

.authCloud3 {
  width: 640px;
  bottom: -36px;
  left: 10px;
 
  animation-duration: 9s;
  animation-delay: 1.4s;
}

.authCloud4 {
  width: 570px;
  bottom: -200px;
  right: -108px;
  --cloud-flip: 1;
  animation-duration: 8.8s;
  animation-delay: 0.4s;
}

.authCloud5 {
  width: 440px;
  top: -200px;
  left: 100%;
  
  animation-duration: 7.8s;
  animation-delay: 1.1s;
  margin-left: -220px;
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}
        .authScreen {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 235, 190, 0.62), transparent 34%),
    linear-gradient(180deg, #ecdcb8 10%, #cfb07a 55%, #b98f58 100%);
}



.authScreen::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.20), transparent 8%),
    radial-gradient(circle at 78% 24%, rgba(255,245,220,0.16), transparent 10%),
    radial-gradient(circle at 68% 74%, rgba(255,255,255,0.14), transparent 9%),
    radial-gradient(circle at 28% 78%, rgba(255,245,220,0.12), transparent 11%);
  filter: blur(10px);
}

.authModal {
  width: min(900px, 94vw);
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.authModal > * {
  width: 100% !important;
  min-width: 360px;
  max-width: 900px;
}

.authModal > * {
 
  background: linear-gradient(180deg, rgba(255, 249, 236, 0.96), rgba(238, 212, 155, 0.92)) !important;
  border: 1px solid rgba(224, 171, 63, 0.32) !important;
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.14),
    0 0 18px rgba(255, 226, 150, 0.45),
    0 0 36px rgba(224, 171, 63, 0.32),
    0 0 60px rgba(224, 171, 63, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.45) !important;
}

@keyframes authCardGlow {
  0%, 100% {
    box-shadow:
      0 20px 40px rgba(95, 70, 48, 0.16),
      0 0 22px rgba(255, 231, 168, 0.55),
      0 0 46px rgba(237, 187, 87, 0.4),
      0 0 78px rgba(224, 171, 63, 0.24),
      inset 0 1px 0 rgba(255,255,255,0.5);
  }
  50% {
    box-shadow:
      0 20px 40px rgba(95, 70, 48, 0.16),
      0 0 28px rgba(255, 231, 168, 0.72),
      0 0 56px rgba(237, 187, 87, 0.52),
      0 0 96px rgba(224, 171, 63, 0.34),
      inset 0 1px 0 rgba(255,255,255,0.5);
  }
}

.authModal > * {
  animation: authCardGlow 2.8s ease-in-out infinite;
}

.authModal button {
  border: none !important;
  box-shadow: none !important;
}

.authModal .linkBtn {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

.authModal button:not(.linkBtn) {
  border: 2px solid #c9ab86 !important;
  border-radius: 12px !important;
  color: #6b4f34 !important;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(107, 79, 52, 0.08) !important;
  width: 140px;
  height: 38px;
  align-self: center;
}

.authModal .nextBtn:hover {
  background: linear-gradient(180deg, #fdf1df 0%, #ecd3ad 100%) !important;
  border-color: #b88e63 !important;
}
        
.authModal button {
  opacity: 1;
  cursor: pointer;
  transition: none;
}

.authModal button:disabled {
  opacity: 1;
  cursor: pointer;
  filter: none;
}

.authModal button:hover,
.authModal button:disabled:hover {
  opacity: 1;
  filter: none;
  transform: none;
}
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
.authModal input {
  border: 2px solid #c9ab86 !important;
  border-radius: 12px;
  background: #fffaf2;
  color: var(--ink);
  box-shadow: inset 0 1px 2px rgba(107, 79, 52, 0.06);
}

.authModal input:focus {
  outline: none;
  border-color: #8d6b4f !important;
  box-shadow: 0 0 0 3px rgba(201, 171, 134, 0.22);
}

.authScreen.lobbySparkles::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(255,244,210,0.24) 0 1px, transparent 1.9px),
    radial-gradient(circle, rgba(255,255,255,0.18) 0 1.2px, transparent 2px);
  background-size: 120px 120px, 170px 170px, 220px 220px;
  background-position: 20px 14px, 80px 50px, 140px 26px;
  opacity: 0.9;
  z-index: 0;
}
        `}</style>
      </div>
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

        .authModal button {
          opacity: 1;
        }

        .authModal button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          filter: grayscale(0.15);
        }

        .authModal button:not(:disabled) {
          opacity: 1;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(107, 79, 52, 0.18);
        }

        .authModal > * {
          border: 2px solid #c9ab86;
          border-radius: 18px;
        }

        
      `}</style>
    </div>
  );
}