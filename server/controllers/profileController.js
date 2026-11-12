const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const OfficerModel = require('../models/officerModel');
const { query } = require('../config/db');

/**
 * Get profile information for logged-in user
 * GET /api/profile
 */
async function getProfile(req, res) {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      created_at: user.created_at
    };

    // If user is Officer, attach officer specific details: Employee ID, Department, Active Status
    if (user.role === 'officer') {
      const officer = await OfficerModel.findByUserId(user.id);
      if (officer) {
        profileData.employee_id = officer.employee_id;
        profileData.department_id = officer.department_id;
        profileData.department_name = officer.department_name;
        profileData.active_status = officer.active_status === 1 || officer.active_status === true;
      }
    }

    res.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.'
    });
  }
}

/**
 * Update profile information
 * PUT /api/profile
 */
async function updateProfile(req, res) {
  try {
    const { name, phone, address, role } = req.body;

    // Strict Security Rule: Do NOT allow users to change their own role!
    if (role && role !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Security violation: You cannot change your own user role.'
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Full Name cannot be empty.'
      });
    }

    await UserModel.updateProfile(req.user.id, {
      name: name.trim(),
      phone: phone ? String(phone).trim() : req.user.phone,
      address: address !== undefined ? String(address).trim() : req.user.address
    });

    const updatedUser = await UserModel.findById(req.user.id);

    // Attach officer details if officer
    if (updatedUser.role === 'officer') {
      const officer = await OfficerModel.findByUserId(updatedUser.id);
      if (officer) {
        updatedUser.employee_id = officer.employee_id;
        updatedUser.department_name = officer.department_name;
        updatedUser.active_status = officer.active_status;
      }
    }

    res.json({
      success: true,
      message: 'Profile information updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile details.'
    });
  }
}

/**
 * Update password securely using bcrypt
 * PUT /api/profile/password
 */
async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirm password are required.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Fetch hashed password from DB
    const userRows = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect. Please verify your current password.'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(req.user.id, hashedNewPassword);

    res.json({
      success: true,
      message: 'Password updated successfully!'
    });
  } catch (error) {
    console.error('Update Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password.'
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updatePassword
};
