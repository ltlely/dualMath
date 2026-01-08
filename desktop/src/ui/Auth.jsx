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
  const fileInputRef = useRef(null);

  // Update avatar state when currentUser changes
  useEffect(() => {
    if (currentUser?.avatarData) {
      setAvatarData(currentUser.avatarData);
    }
  }, [currentUser?.avatarData]);

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

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const avatarDataUrl = event.target.result;
      setAvatarData(avatarDataUrl);
      userManager.updateAvatar(currentUser.username, avatarDataUrl);
      if (onLoginSuccess) {
        onLoginSuccess(userManager.getCurrentUser());
      }
    };
    reader.readAsDataURL(file);
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
                <div className="stats">
                  <div className="statItem">
                    <span className="statLabel">Points:</span>
                    <span className="statValue">{currentUser?.points ?? 0}</span>
                  </div>
                  <div className="statItem">
                    <span className="statLabel">Wins:</span>
                    <span className="statValue">{currentUser?.wins ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="uploadSection">
              <label className="label">Change Avatar</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                📸 Upload Photo
              </Button>
              <p className="muted" style={{ fontSize: "12px", marginTop: "8px" }}>
                Upload a profile picture (JPG, PNG, etc.)
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
