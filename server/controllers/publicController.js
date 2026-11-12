const { query } = require('../config/db');

/**
 * Get public statistics for landing page
 * GET /api/public/statistics
 */
async function getPublicStatistics(req, res) {
  try {
    const totalRows = await query('SELECT COUNT(*) as count FROM complaints');
    const resolvedRows = await query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'");
    const activeRows = await query("SELECT COUNT(*) as count FROM complaints WHERE status NOT IN ('Resolved', 'Rejected')");
    const citizenRows = await query("SELECT COUNT(*) as count FROM users WHERE role = 'citizen'");

    res.json({
      success: true,
      statistics: {
        totalComplaints: totalRows[0]?.count || 0,
        resolvedComplaints: resolvedRows[0]?.count || 0,
        activeComplaints: activeRows[0]?.count || 0,
        registeredCitizens: citizenRows[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Public Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public statistics.'
    });
  }
}

module.exports = {
  getPublicStatistics
};
