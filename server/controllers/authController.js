const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { query } = require('../config/db');
const { sendPasswordResetEmail } = require('../config/email');

const secret = process.env.JWT_SECRET || 'civiccare_jwt_secret_key_2026_smart_city_system';
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

// Regex helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

/**
 * Register a new Citizen user (Public registration)
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, phone, password, confirmPassword, address } = req.body;

    // 1. Required fields check
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All required fields (Name, Email, Phone, Password) must be provided.'
      });
    }

    // 2. Email format validation
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // 3. Phone format validation
    const cleanedPhone = String(phone).replace(/[\s\-\(\)\+]/g, '');
    if (!PHONE_REGEX.test(cleanedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number (at least 10 digits).'
      });
    }

    // 4. Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 5. Confirm password check (if provided in payload)
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match.'
      });
    }

    // 6. Check duplicate email
    const existingUser = await UserModel.findByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists. Please login instead.'
      });
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Force role to 'citizen' (do NOT allow public registration as admin or officer)
    const userId = await UserModel.create({
      name: name.trim(),
      email: trimmedEmail,
      phone: cleanedPhone,
      password: hashedPassword,
      role: 'citizen', // STRICT ENFORCEMENT
      address: address ? address.trim() : ''
    });

    const user = await UserModel.findById(userId);

    // 9. Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully! Welcome to CivicCare.',
      token,
      user
    });
  } catch (error) {
    console.error('Registration Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user registration. Please try again.'
    });
  }
}

/**
 * Login User (Citizen / Officer / Admin)
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both your email address and password.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await UserModel.findByEmail(trimmedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please check your credentials.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please check your credentials.'
      });
    }

    // Omit password hash from output
    delete user.password;

    // Attach officer details if user role is officer
    if (user.role === 'officer') {
      const OfficerModel = require('../models/officerModel');
      const officer = await OfficerModel.findByUserId(user.id);
      if (officer) {
        user.officer_id = officer.officer_id;
        user.department_id = officer.department_id;
        user.department_name = officer.department_name;
        user.employee_id = officer.employee_id;
      }
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user
    });
  } catch (error) {
    console.error('Login Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login authentication.'
    });
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.'
    });
  }
}

/**
 * Request Password Reset (Forgot Password)
 * Generates 6-digit OTP code, stores with 15-minute expiry, and emails user
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Verify user exists in database
    const user = await UserModel.findByEmail(trimmedEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered CivicCare account found with this email address.'
      });
    }

    // Generate secure 6-digit verification code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up prior expired or unused codes for this email
    await query('DELETE FROM password_resets WHERE email = ?', [trimmedEmail]);

    // Insert new reset OTP with 15-minute validity using database clock
    await query(
      'INSERT INTO password_resets (email, otp_code, expires_at) VALUES (?, ?, NOW() + INTERVAL 15 MINUTE)',
      [trimmedEmail, otpCode]
    );

    // Send email with verification code
    const emailResult = await sendPasswordResetEmail(trimmedEmail, otpCode, user.name || 'Citizen');

    res.json({
      success: true,
      message: `A 6-digit reset code has been sent to ${trimmedEmail}.`,
      expiresIn: '15 minutes',
      // Include previewUrl if generated by test email service
      previewUrl: emailResult.previewUrl || null
    });
  } catch (error) {
    console.error('Forgot Password Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again.'
    });
  }
}

/**
 * Verify 6-digit Reset Code
 * POST /api/auth/verify-reset-code
 */
async function verifyResetCode(req, res) {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({
        success: false,
        message: 'Both email and 6-digit verification code are required.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedCode = String(otp_code).trim();

    const rows = await query(`
      SELECT * FROM password_resets 
      WHERE email = ? AND otp_code = ? AND expires_at > NOW()
      ORDER BY id DESC LIMIT 1
    `, [trimmedEmail, trimmedCode]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please check the code or request a new one.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code verified successfully. You may now enter your new password.'
    });
  } catch (error) {
    console.error('Verify Reset Code Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset code.'
    });
  }
}

/**
 * Reset Password with verified OTP
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { email, otp_code, newPassword, confirmPassword } = req.body;

    if (!email || !otp_code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedCode = String(otp_code).trim();

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and Confirm Password do not match.'
      });
    }

    // Verify OTP validity and expiration
    const rows = await query(`
      SELECT * FROM password_resets 
      WHERE email = ? AND otp_code = ? AND expires_at > NOW()
      ORDER BY id DESC LIMIT 1
    `, [trimmedEmail, trimmedCode]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in users table
    await query(
      'UPDATE users SET password = ?, must_change_password = 0 WHERE email = ?',
      [hashedPassword, trimmedEmail]
    );

    // Invalidate/delete all reset OTPs for this email
    await query('DELETE FROM password_resets WHERE email = ?', [trimmedEmail]);

    res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password. Please try again.'
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyResetCode,
  resetPassword
};
