import express from "express";
import { getDb } from "./db.js";
import { hashPassword, verifyPassword, randomToken } from "./utils/crypto.js";
import { sendMail } from "./utils/mailer.js";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiters
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" }
});

const sensitiveLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 20,
  message: { error: "Too many attempts, please try again later" }
});

router.use("/register", sensitiveLimiter);
router.use("/login", sensitiveLimiter);
router.use("/password/forgot", sensitiveLimiter);
router.use("/password/reset", sensitiveLimiter);

// Helpers
function setSessionCookie(res, sessionId) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });
}

function clearSessionCookie(res) {
  res.clearCookie("sid", { path: "/" });
}

// Register - FIXED VERSION
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    console.log('🔍 Registration attempt for:', req.body.email);
    
    const { email, name, password } = req.body;
    
    // Validation
    if (!email || !name || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    
    if (!email.includes('@')) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }
    
    const db = await getDb();
    
    // Check existing user
    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing.length > 0) {
      console.log('⚠️ User already exists:', email);
      return res.status(409).json({ error: "Account exists" });
    }
    
    console.log('✅ Creating user in database...');
    
    // Create user
    const password_hash = await hashPassword(password);
    const [result] = await db.execute(
      "INSERT INTO users (email, name, password_hash) VALUES (?,?,?)",
      [email.toLowerCase(), name.trim(), password_hash]
    );
    const userId = result.insertId;
    
    console.log('✅ User created with ID:', userId);
    
    // Create email verification token
    console.log('🔍 Creating verification token...');
    const token = randomToken(32);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await db.execute(
      "INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?,?,?)",
      [token, userId, expires]
    );
    
    console.log('✅ Verification token created');
    
    // Try to send email (but don't let it break registration)
    try {
      console.log('📧 Attempting to send verification email...');
      const link = `${process.env.APP_BASE_URL}/api/auth/verify-email?token=${token}`;
      await sendMail({
        to: email,
        subject: "Verify your email - MantraAQ",
        html: `
          <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2>Welcome to MantraAQ!</h2>
            <p>Hi ${name},</p>
            <p>Please verify your email address to complete your registration:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${link}" style="background:#3b82f6; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">Verify Email</a>
            </div>
            <p>This link is valid for 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
        `
      });
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      // Email failed but don't break registration
      console.error('⚠️ Email sending failed:', emailError.message);
      console.log('🔍 Continuing with registration despite email failure...');
    }
    
    // Always send success response
    console.log('✅ Sending success response');
    return res.status(201).json({ 
      message: "Account created! Please check your email to verify your account." 
    });
    
  } catch (error) {
    console.error('🔥 Registration error:', error.message);
    console.error('Stack trace:', error.stack);
    next(error); // Pass to global error handler
  }
});


// Verify email - GET route for email links
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query; // ✅ Correct - from URL parameter
    
    if (!token) {
      return res.status(400).json({ error: "Verification token required" });
    }
    
    const db = await getDb();
    const [rows] = await db.execute(
      "SELECT * FROM email_verifications WHERE token = ? AND expires_at > NOW() AND used = FALSE", 
      [token]
    );
    
    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification link" });
    }
    
    const row = rows[0];

    // Mark user as verified
    await db.execute("UPDATE users SET email_verified = TRUE WHERE id = ?", [row.user_id]);
    await db.execute("UPDATE email_verifications SET used = TRUE WHERE token = ?", [token]);
    
    // Redirect to success page instead of JSON
    res.redirect("/?verified=true");
    
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});


// Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const db = await getDb();
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    const user = rows[0];
    
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid credentials",
        hint: "Check your email and password, or sign up if you don't have an account"
      });
    }
    
    const passwordCorrect = await verifyPassword(password, user.password_hash);
    if (!passwordCorrect) {
      return res.status(401).json({ 
        error: "Invalid credentials",
        hint: "Check your password or use 'Forgot Password' to reset it"
      });
    }

    // Create session
    const sid = uuidv4();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    await db.execute("INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)", [sid, user.id, expires]);
    setSessionCookie(res, sid);
    
    res.json({ 
  message: "Logged in successfully", 
  user: { 
    id: user.id, 
    email: user.email, 
    name: user.name,
    email_verified: user.email_verified, // ✅ Add verification status
    created_at: user.created_at
  } 
});

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (sid) {
      const db = await getDb();
      await db.execute("DELETE FROM sessions WHERE id = ?", [sid]);
    }
    clearSessionCookie(res);
    res.json({ message: "Logged out successfully" });
  } catch {
    res.status(200).json({ message: "Logged out" });
  }
});

// Session check
router.get("/me", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (!sid) return res.status(401).json({ user: null });
    
    const db = await getDb();
    const [sessions] = await db.execute("SELECT * FROM sessions WHERE id = ?", [sid]);
    const sess = sessions[0];
    
    if (!sess || new Date(sess.expires_at) < new Date()) {
      clearSessionCookie(res);
      return res.status(401).json({ user: null });
    }
    
    const [users] = await db.execute("SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?", [sess.user_id]);

    const user = users[0];
    res.json({ user });
  } catch {
    res.status(500).json({ user: null });
  }
});

// Resend verification email
router.post("/resend-verification", authLimiter, async (req, res) => {
  try {
    // Get user from session
    const sid = req.cookies?.sid;
    if (!sid) {
      return res.status(401).json({ error: "Please log in to resend verification" });
    }
    
    const db = await getDb();
    const [sessions] = await db.execute(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()", 
      [sid]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    
    const userId = sessions[0].user_id;
    
    // Get user details
    const [users] = await db.execute(
      "SELECT id, email, name, email_verified FROM users WHERE id = ?", 
      [userId]
    );
    
    const user = users[0];
    
    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }
    
    // Delete old unused tokens
    await db.execute("DELETE FROM email_verifications WHERE user_id = ? AND used = FALSE", [userId]);
    
    // Generate new verification token
    const token = randomToken(32);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    
    await db.execute(
      "INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)",
      [token, userId, expires]
    );
    
    // Try to send email (don't break if email fails)
    try {
      const link = `${process.env.APP_BASE_URL}/api/auth/verify-email?token=${token}`;
      await sendMail({
        to: user.email,
        subject: "Verify your email - MantraAQ",
        html: `
          <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2>Email Verification</h2>
            <p>Hi ${user.name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${link}" style="background:#3b82f6; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">Verify Email</a>
            </div>
            <p>This link is valid for 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Still return success to prevent enumeration
    }
    
    res.json({ message: "Verification email sent! Please check your inbox." });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: "Failed to send verification email. Please try again." });
  }
});


// Forgot password request
router.post("/password/forgot", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }
    
    const db = await getDb();
    const [rows] = await db.execute("SELECT id, name FROM users WHERE email = ?", [email.toLowerCase()]);
    const user = rows[0];
    
    if (user) {
      const token = randomToken(32);
      const expires = new Date(Date.now() + 1000 * 60 * 15); // 15 min
      await db.execute(
        "INSERT INTO password_resets (token, user_id, expires_at) VALUES (?,?,?)",
        [token, user.id, expires]
      );
      
      const link = `${process.env.APP_BASE_URL}/reset-password?token=${token}`;
      await sendMail({
        to: email,
        subject: "Reset your password - MantraAQ",
        html: `
          <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2>Password Reset Request</h2>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${link}" style="background:#3b82f6; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">Reset Password</a>
            </div>
            <p>This link will expire in 15 minutes for security reasons.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
    }
    
    // Always same response to prevent email enumeration
    res.json({ 
      message: "If an account with that email exists, we've sent password reset instructions." 
    });
  } catch (e) {
    console.error(e);
    res.status(200).json({ 
      message: "If an account with that email exists, we've sent password reset instructions." 
    });
  }
});

// Reset password
router.post("/password/reset", sensitiveLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    
    const db = await getDb();
    const [rows] = await db.execute(
      "SELECT * FROM password_resets WHERE token = ? AND used = FALSE", 
      [token]
    );
    const row = rows[0];
    
    if (!row) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }
    
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: "Reset link has expired" });
    }

    const newHash = await hashPassword(password);
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, row.user_id]);
    await db.execute("UPDATE password_resets SET used = TRUE WHERE token = ?", [token]);
    
    res.json({ message: "Password updated successfully. Please log in with your new password." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Password reset failed. Please try again." });
  }
});

export default router;


