const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Middleware to verify JWT token and attach user object to req.user
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'civiccare_jwt_secret_key_2026_smart_city_system';
    const decoded = jwt.verify(token, secret);

    // Fetch user details from database to ensure user is active and exists
    const users = await query(
      'SELECT id, name, email, phone, role, address, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User no longer exists.'
      });
    }

    req.user = users[0];

    // If user is an officer, attach officer_id & department_id
    if (req.user.role === 'officer') {
      const officers = await query(
        'SELECT id as officer_id, department_id, employee_id, active_status FROM officers WHERE user_id = ?',
        [req.user.id]
      );
      if (officers && officers.length > 0) {
        req.user.officer_id = officers[0].officer_id;
        req.user.department_id = officers[0].department_id;
        req.user.employee_id = officers[0].employee_id;
      }
    }

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}

/**
 * Middleware to authorize specific roles
 * Example: authorizeRoles('admin', 'officer')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this resource.`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
