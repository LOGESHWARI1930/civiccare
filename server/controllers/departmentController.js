const DepartmentModel = require('../models/departmentModel');

/**
 * Get all departments with officer counts and complaint statistics
 * GET /api/departments
 */
async function getDepartments(req, res) {
  try {
    const departments = await DepartmentModel.getAll();
    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Get Departments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments.'
    });
  }
}

/**
 * Create a new Department (Admin)
 * POST /api/departments
 */
async function createDepartment(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.'
      });
    }

    const id = await DepartmentModel.create({ name, description: description || '' });
    const department = await DepartmentModel.findById(id);

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department
    });
  } catch (error) {
    console.error('Create Department Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department.'
    });
  }
}

/**
 * Update Department (Admin)
 * PUT /api/departments/:id
 */
async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await DepartmentModel.update(id, { name, description });
    res.json({
      success: true,
      message: 'Department updated successfully.'
    });
  } catch (error) {
    console.error('Update Department Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department.'
    });
  }
}

/**
 * Delete Department (Admin)
 * DELETE /api/admin/departments/:id or DELETE /api/departments/:id
 */
async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;
    const { query } = require('../config/db');

    const dept = await DepartmentModel.findById(id);
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    // Dependency check 1: Active complaints assigned to this department
    const activeCompRows = await query(`
      SELECT COUNT(*) as count 
      FROM complaints 
      WHERE department_id = ? AND status IN ('Submitted', 'Under Review', 'Assigned', 'In Progress')
    `, [id]);
    const activeComplaints = activeCompRows[0]?.count || 0;

    // Dependency check 2: Officers assigned to this department
    const officerRows = await query(`
      SELECT COUNT(*) as count 
      FROM officers 
      WHERE department_id = ?
    `, [id]);
    const officerCount = officerRows[0]?.count || 0;

    // Strict Rule: Block deletion if active complaints or officers depend on department
    if (activeComplaints > 0 || officerCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department "${dept.name}". There are currently ${activeComplaints} active complaint(s) and ${officerCount} officer(s) dependent on this department. Please reassign them before deleting.`
      });
    }

    // Unlink historical resolved/rejected complaints
    await query('UPDATE complaints SET department_id = NULL WHERE department_id = ?', [id]);

    await DepartmentModel.delete(id);

    res.json({
      success: true,
      message: `Department "${dept.name}" deleted successfully.`
    });
  } catch (error) {
    console.error('Delete Department Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department.'
    });
  }
}

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
