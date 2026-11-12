/**
 * CivicCare Administrator Command Center & Analytics Controller
 */

let chartCategoryInstance = null;
let chartStatusInstance = null;
let chartTrendsInstance = null;
let chartDepartmentInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.includes('admin-dashboard.html') || path.includes('/admin/dashboard')) {
    Auth.requireAuth(['admin']);
    loadAdminDashboard();
  } else if (path.includes('admin-analytics.html')) {
    Auth.requireAuth(['admin']);
    loadAdminAnalytics();
  } else if (path.includes('admin-departments.html')) {
    Auth.requireAuth(['admin']);
    loadAdminDepartments();
  } else if (path.includes('admin-users.html')) {
    Auth.requireAuth(['admin']);
    loadAdminUsers();
  } else if (path.includes('admin-officers.html') || path.includes('/admin/officers')) {
    Auth.requireAuth(['admin']);
    loadAdminOfficers();
  }
});

let currentLoadedOfficers = [];
let currentLoadedDepartments = [];

/**
 * Load Admin Officers Registry & Statistics
 */
async function loadAdminOfficers() {
  const tableContainer = document.getElementById('officers-table-container');
  const countBadge = document.getElementById('officer-count-badge');
  if (!tableContainer) return;

  try {
    const res = await apiRequest('/admin/officers');
    if (!res.success) throw new Error(res.message);

    currentLoadedOfficers = res.officers || [];
    if (countBadge) countBadge.textContent = `${currentLoadedOfficers.length} Officers`;

    // Update KPIs
    const totalOfficers = currentLoadedOfficers.length;
    const activeOfficers = currentLoadedOfficers.filter(o => o.active_status === 1 || o.active_status === true).length;
    const activeWorkload = currentLoadedOfficers.reduce((acc, o) => acc + (parseInt(o.active_complaints, 10) || 0), 0);
    const totalResolved = currentLoadedOfficers.reduce((acc, o) => acc + (parseInt(o.resolved_complaints, 10) || 0), 0);

    if (document.getElementById('kpi-total-officers')) document.getElementById('kpi-total-officers').textContent = totalOfficers;
    if (document.getElementById('kpi-active-officers')) document.getElementById('kpi-active-officers').textContent = activeOfficers;
    if (document.getElementById('kpi-active-workload')) document.getElementById('kpi-active-workload').textContent = activeWorkload;
    if (document.getElementById('kpi-resolved-complaints')) document.getElementById('kpi-resolved-complaints').textContent = totalResolved;

    if (currentLoadedOfficers.length === 0) {
      tableContainer.innerHTML = `
        <div class="p-5 text-center text-muted">
          <i class="bi bi-person-badge fs-1 d-block mb-2 text-secondary"></i>
          <h5>No Field Officers Registered Yet</h5>
          <p class="small">Click <strong>Add Officer</strong> above to assign new municipal inspectors.</p>
        </div>
      `;
      return;
    }

    const rows = currentLoadedOfficers.map(o => {
      const isActive = o.active_status === 1 || o.active_status === true;
      const activeCount = parseInt(o.active_complaints, 10) || 0;

      return `
        <tr>
          <td data-label="Employee ID"><span class="badge bg-dark font-monospace">${o.employee_id || 'N/A'}</span></td>
          <td data-label="Name & Phone">
            <div class="fw-bold text-dark">${o.officer_name}</div>
            <small class="text-muted"><i class="bi bi-telephone-fill me-1"></i>${o.officer_phone || 'N/A'}</small>
          </td>
          <td data-label="Email"><a href="mailto:${o.officer_email}" class="text-decoration-none">${o.officer_email}</a></td>
          <td data-label="Department"><span class="badge bg-light text-dark border">${o.department_name || 'Unassigned'}</span></td>
          <td data-label="Active Complaints">
            <span class="badge ${activeCount > 0 ? 'bg-warning text-dark' : 'bg-secondary'} rounded-pill px-3 py-1">
              ${activeCount} Active ${activeCount === 1 ? 'Complaint' : 'Complaints'}
            </span>
          </td>
          <td data-label="Status">
            ${isActive 
              ? `<span class="badge bg-success-subtle text-success border border-success rounded-pill px-3"><i class="bi bi-check-circle-fill me-1"></i>Active</span>`
              : `<span class="badge bg-danger-subtle text-danger border border-danger rounded-pill px-3"><i class="bi bi-dash-circle-fill me-1"></i>Inactive</span>`
            }
          </td>
          <td data-label="Actions">
            <div class="d-flex gap-1 justify-content-end flex-wrap">
              <button class="btn btn-sm btn-outline-dark" onclick="viewOfficerDetails(${o.id})" title="View Profile">
                <i class="bi bi-eye-fill"></i> View
              </button>
              <button class="btn btn-sm btn-outline-primary" onclick="openEditOfficerModal(${o.id})" title="Edit Profile">
                <i class="bi bi-pencil-fill"></i> Edit
              </button>
              <button class="btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleOfficerStatus(${o.id}, ${isActive})" title="${isActive ? 'Deactivate Officer' : 'Activate Officer'}">
                <i class="bi ${isActive ? 'bi-person-x-fill' : 'bi-person-check-fill'} me-1"></i>${isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover table-civic responsive-data-grid align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Employee ID</th>
              <th>Name & Phone</th>
              <th>Email</th>
              <th>Department</th>
              <th>Active Complaints</th>
              <th>Status</th>
              <th style="min-width: 220px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;

  } catch (err) {
    console.error('Load Officers Error:', err);
    tableContainer.innerHTML = `<div class="p-4 text-center text-danger"><i class="bi bi-exclamation-triangle fs-3 d-block mb-1"></i>Failed to load officers: ${err.message}</div>`;
  }
}

/**
 * Fetch departments helper for dropdown
 */
async function loadDepartmentsDropdown(selectedDeptId = null) {
  const selectEl = document.getElementById('modal-officer-department');
  if (!selectEl) return;

  try {
    const res = await apiRequest('/departments');
    if (res.success && res.departments) {
      currentLoadedDepartments = res.departments;
      selectEl.innerHTML = `
        <option value="" disabled ${!selectedDeptId ? 'selected' : ''}>Select Department</option>
        ${res.departments.map(d => `
          <option value="${d.id}" ${parseInt(d.id, 10) === parseInt(selectedDeptId, 10) ? 'selected' : ''}>${d.name}</option>
        `).join('')}
      `;
    }
  } catch (err) {
    console.error('Failed to load departments dropdown:', err);
  }
}

/**
 * Open Add Officer Modal
 */
async function openAddOfficerModal() {
  document.getElementById('officerModalTitle').innerHTML = `<i class="bi bi-person-plus-fill me-2"></i>Add Municipal Officer`;
  document.getElementById('modal-officer-id').value = '';
  document.getElementById('modal-officer-name').value = '';
  document.getElementById('modal-officer-email').value = '';
  document.getElementById('modal-officer-phone').value = '';
  document.getElementById('modal-officer-employee-id').value = '';
  document.getElementById('modal-officer-password').value = '';
  
  const passContainer = document.getElementById('password-field-container');
  if (passContainer) {
    passContainer.style.display = 'block';
    document.getElementById('modal-officer-password').required = true;
  }

  await loadDepartmentsDropdown();

  const modal = new bootstrap.Modal(document.getElementById('officerFormModal'));
  modal.show();
}

/**
 * Open Edit Officer Modal
 */
async function openEditOfficerModal(id) {
  const officer = currentLoadedOfficers.find(o => parseInt(o.id, 10) === parseInt(id, 10));
  if (!officer) return;

  document.getElementById('officerModalTitle').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Edit Officer Profile`;
  document.getElementById('modal-officer-id').value = officer.id;
  document.getElementById('modal-officer-name').value = officer.officer_name || '';
  document.getElementById('modal-officer-email').value = officer.officer_email || '';
  document.getElementById('modal-officer-phone').value = officer.officer_phone || '';
  document.getElementById('modal-officer-employee-id').value = officer.employee_id || '';
  
  const passContainer = document.getElementById('password-field-container');
  if (passContainer) {
    passContainer.style.display = 'none';
    document.getElementById('modal-officer-password').required = false;
  }

  await loadDepartmentsDropdown(officer.department_id);

  const modal = new bootstrap.Modal(document.getElementById('officerFormModal'));
  modal.show();
}

/**
 * Save Officer (Add or Edit)
 */
async function saveOfficer(event) {
  event.preventDefault();
  const saveBtn = document.getElementById('modal-officer-save-btn');
  const officerId = document.getElementById('modal-officer-id').value;

  const payload = {
    name: document.getElementById('modal-officer-name').value.trim(),
    email: document.getElementById('modal-officer-email').value.trim(),
    phone: document.getElementById('modal-officer-phone').value.trim(),
    department_id: document.getElementById('modal-officer-department').value,
    employee_id: document.getElementById('modal-officer-employee-id').value.trim(),
    tempPassword: document.getElementById('modal-officer-password').value
  };

  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

    let res;
    if (officerId) {
      // Update
      res = await apiRequest(`/admin/officers/${officerId}`, 'PUT', payload);
    } else {
      // Create
      res = await apiRequest('/admin/officers', 'POST', payload);
    }

    if (!res.success) {
      showToast(res.message || 'Failed to save officer.', 'danger');
      return;
    }

    showToast(res.message || 'Officer account saved successfully!', 'success');

    // Dismiss modal
    const modalEl = document.getElementById('officerFormModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Reload list
    await loadAdminOfficers();
  } catch (err) {
    showToast(err.message || 'An error occurred while saving officer profile.', 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="bi bi-check-lg me-1"></i> Save Officer`;
  }
}

/**
 * View Officer Profile Details Modal
 */
function viewOfficerDetails(id) {
  const officer = currentLoadedOfficers.find(o => parseInt(o.id, 10) === parseInt(id, 10));
  if (!officer) return;

  const bodyEl = document.getElementById('view-officer-body');
  const isActive = officer.active_status === 1 || officer.active_status === true;

  bodyEl.innerHTML = `
    <div class="text-center pb-3 border-bottom mb-3">
      <div class="avatar-placeholder bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style="width: 64px; height: 64px; font-size: 1.8rem; font-weight: bold;">
        ${officer.officer_name.charAt(0).toUpperCase()}
      </div>
      <h4 class="fw-bold mb-1">${officer.officer_name}</h4>
      <span class="badge bg-dark font-monospace fs-6">${officer.employee_id}</span>
      <div class="mt-2">
        ${isActive 
          ? `<span class="badge bg-success rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Active Duty</span>` 
          : `<span class="badge bg-danger rounded-pill"><i class="bi bi-x-circle-fill me-1"></i>Inactive / Deactivated</span>`}
      </div>
    </div>
    <div class="row g-3">
      <div class="col-6">
        <small class="text-muted d-block fw-bold">Department</small>
        <span>${officer.department_name || 'N/A'}</span>
      </div>
      <div class="col-6">
        <small class="text-muted d-block fw-bold">Phone</small>
        <span>${officer.officer_phone || 'N/A'}</span>
      </div>
      <div class="col-12">
        <small class="text-muted d-block fw-bold">Email Address</small>
        <span>${officer.officer_email}</span>
      </div>
      <div class="col-6">
        <small class="text-muted d-block fw-bold">Active Workload</small>
        <span class="badge bg-warning text-dark fs-6">${officer.active_complaints || 0} Complaints</span>
      </div>
      <div class="col-6">
        <small class="text-muted d-block fw-bold">Resolved Workload</small>
        <span class="badge bg-success fs-6">${officer.resolved_complaints || 0} Resolved</span>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('viewOfficerModal'));
  modal.show();
}

/**
 * Toggle Officer Status (Activate / Deactivate)
 */
async function toggleOfficerStatus(id, currentIsActive) {
  const actionText = currentIsActive ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${actionText} this officer account?`)) return;

  try {
    const res = await apiRequest(`/admin/officers/${id}/status`, 'PATCH', {
      active_status: currentIsActive ? 0 : 1
    });

    if (!res.success) {
      showToast(res.message || `Failed to ${actionText} officer.`, 'danger');
      return;
    }

    showToast(res.message || `Officer account ${actionText}d successfully!`, 'success');
    await loadAdminOfficers();
  } catch (err) {
    showToast(`Error trying to ${actionText} officer.`, 'danger');
  }
}

/**
 * Load Admin Command Center Dashboard from GET /api/admin/dashboard
 */
async function loadAdminDashboard() {
  const statsContainer = document.getElementById('admin-stats-cards');
  const tableContainer = document.getElementById('admin-recent-complaints-table');
  const highPriorityContainer = document.getElementById('admin-high-priority-container');

  try {
    const res = await apiRequest('/admin/dashboard');
    if (!res.success) return;

    const { stats, charts, recentComplaints, highPriorityComplaints } = res;

    // 1. Render 5 KPI Statistics Cards
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="col">
          <div class="stat-card">
            <div class="icon-box primary"><i class="bi bi-collection-fill"></i></div>
            <div class="stat-value">${stats.totalComplaints || 0}</div>
            <div class="stat-label">Total Complaints</div>
          </div>
        </div>
        <div class="col">
          <div class="stat-card">
            <div class="icon-box warning" style="background-color: #FEF3C7; color: #B45309;"><i class="bi bi-hourglass-split"></i></div>
            <div class="stat-value" style="color: #B45309;">${stats.pending || 0}</div>
            <div class="stat-label">Pending Review</div>
          </div>
        </div>
        <div class="col">
          <div class="stat-card">
            <div class="icon-box info" style="background-color: #E0F2FE; color: #0369A1;"><i class="bi bi-gear-wide-connected"></i></div>
            <div class="stat-value" style="color: #0369A1;">${stats.inProgress || 0}</div>
            <div class="stat-label">In Progress</div>
          </div>
        </div>
        <div class="col">
          <div class="stat-card">
            <div class="icon-box success" style="background-color: #DCFCE7; color: #15803D;"><i class="bi bi-check-circle-fill"></i></div>
            <div class="stat-value" style="color: #15803D;">${stats.resolved || 0}</div>
            <div class="stat-label">Resolved</div>
          </div>
        </div>
        <div class="col">
          <div class="stat-card border-danger">
            <div class="icon-box danger" style="background-color: #FEE2E2; color: #DC2626;"><i class="bi bi-exclamation-triangle-fill"></i></div>
            <div class="stat-value text-danger">${stats.critical || 0}</div>
            <div class="stat-label text-danger font-weight-bold">Critical Complaints</div>
          </div>
        </div>
      `;
    }

    // 2. Render High Priority / Critical Section
    if (highPriorityContainer) {
      if (!highPriorityComplaints || highPriorityComplaints.length === 0) {
        highPriorityContainer.innerHTML = `
          <div class="p-4 text-center text-success bg-light rounded border">
            <i class="bi bi-shield-check fs-2 d-block mb-1"></i>
            <strong>No Pending High / Critical Priority Complaints!</strong>
          </div>
        `;
      } else {
        const urgentCards = highPriorityComplaints.map(c => `
          <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100 border-danger shadow-sm">
              <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center py-2">
                <span class="fw-bold">${c.complaint_number}</span>
                ${getPriorityBadge(c.priority)}
              </div>
              <div class="card-body p-3">
                <h6 class="fw-bold text-dark mb-1 text-truncate">${c.title}</h6>
                <small class="text-muted d-block mb-2"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${c.location_address}</small>
                <div class="d-flex justify-content-between align-items-center small pt-2 border-top">
                  <span class="text-secondary">${c.citizen_name}</span>
                  ${getStatusBadge(c.status)}
                </div>
              </div>
            </div>
          </div>
        `).join('');

        highPriorityContainer.innerHTML = `<div class="row">${urgentCards}</div>`;
      }
    }

    // 3. Render 4 Chart.js Charts
    renderAdminCharts(charts);

    // 4. Render Recent Complaints Table
    if (tableContainer) {
      if (!recentComplaints || recentComplaints.length === 0) {
        tableContainer.innerHTML = `<div class="p-4 text-center text-muted">No recent complaints registered.</div>`;
        return;
      }

      const rows = recentComplaints.map(c => `
        <tr>
          <td data-label="Complaint ID">
            <a href="/complaint-details.html?id=${c.id}" class="fw-bold text-decoration-none text-primary">${c.complaint_number}</a>
          </td>
          <td data-label="Citizen"><span class="fw-semibold text-dark">${c.citizen_name}</span></td>
          <td data-label="Category"><span class="badge bg-light text-dark border">${c.category}</span></td>
          <td data-label="Priority">${getPriorityBadge(c.priority)}</td>
          <td data-label="Department"><small class="text-secondary fw-semibold">${c.department_name || '<span class="text-danger">Unassigned</span>'}</small></td>
          <td data-label="Officer"><small class="text-dark">${c.officer_name || '<span class="text-muted">Unassigned</span>'}</small></td>
          <td data-label="Status">${getStatusBadge(c.status)}</td>
          <td data-label="Date"><small class="text-muted">${new Date(c.created_at).toLocaleDateString()}</small></td>
          <td data-label="Action">
            <button class="btn btn-sm btn-outline-primary" onclick="openAssignModal(${c.id}, '${c.complaint_number}', ${c.department_id || 'null'}, ${c.officer_id || 'null'}, '${c.priority}')">
              <i class="bi bi-gear-fill me-1"></i>Assign / Review
            </button>
          </td>
        </tr>
      `).join('');

      tableContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table table-hover table-civic responsive-data-grid align-middle mb-0">
            <thead>
              <tr>
                <th>Complaint ID</th>
                <th>Citizen</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Department</th>
                <th>Officer</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    console.error('Load Admin Dashboard Error:', err);
    if (tableContainer) tableContainer.innerHTML = `<div class="alert alert-danger m-3">Error loading admin dashboard.</div>`;
  }
}

/**
 * Render 4 Dynamic Chart.js Visualization Charts
 */
function renderAdminCharts(chartsData) {
  const { byCategory, byStatus, overTime, byDepartment } = chartsData;

  // 1. Chart 1: Complaints by Category (Doughnut)
  const ctxCat = document.getElementById('chart-by-category');
  if (ctxCat) {
    if (chartCategoryInstance) chartCategoryInstance.destroy();
    chartCategoryInstance = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: byCategory.map(c => c.category),
        datasets: [{
          data: byCategory.map(c => c.count),
          backgroundColor: ['#176B87', '#64CCC5', '#F5A623', '#0284C7', '#2E9B62', '#8B5CF6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // 2. Chart 2: Complaints by Status (Pie)
  const ctxStat = document.getElementById('chart-by-status');
  if (ctxStat) {
    if (chartStatusInstance) chartStatusInstance.destroy();
    chartStatusInstance = new Chart(ctxStat, {
      type: 'pie',
      data: {
        labels: byStatus.map(s => s.status),
        datasets: [{
          data: byStatus.map(s => s.count),
          backgroundColor: ['#FEF3C7', '#E0F2FE', '#E0E7FF', '#DCFCE7', '#FEE2E2']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // 3. Chart 3: Complaints Over Time (Line Chart)
  const ctxTime = document.getElementById('chart-over-time');
  if (ctxTime) {
    if (chartTrendsInstance) chartTrendsInstance.destroy();
    chartTrendsInstance = new Chart(ctxTime, {
      type: 'line',
      data: {
        labels: overTime.map(t => new Date(t.date).toLocaleDateString()),
        datasets: [{
          label: 'Complaints Filed',
          data: overTime.map(t => t.count),
          borderColor: '#176B87',
          backgroundColor: 'rgba(23, 107, 135, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }

  // 4. Chart 4: Complaints by Department (Bar Chart - Total vs Resolved)
  const ctxDept = document.getElementById('chart-by-department');
  if (ctxDept) {
    if (chartDepartmentInstance) chartDepartmentInstance.destroy();
    chartDepartmentInstance = new Chart(ctxDept, {
      type: 'bar',
      data: {
        labels: byDepartment.map(d => d.department_name),
        datasets: [
          {
            label: 'Total Complaints',
            data: byDepartment.map(d => d.total),
            backgroundColor: '#176B87'
          },
          {
            label: 'Resolved',
            data: byDepartment.map(d => d.resolved),
            backgroundColor: '#2E9B62'
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }
}

/**
 * Open Detailed Admin Review & Management Modal
 */
async function openAdminReviewModal(complaintId) {
  try {
    const [resComp, resDepts] = await Promise.all([
      apiRequest(`/complaints/${complaintId}`),
      apiRequest('/departments')
    ]);

    if (!resComp.success || !resDepts.success) {
      showToast('Failed to load complaint details for review', 'danger');
      return;
    }

    const c = resComp.complaint;
    const history = resComp.history || [];
    const depts = resDepts.departments;

    const deptOptions = depts.map(d => `<option value="${d.id}" ${c.department_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('');

    const modalHtml = `
      <div class="modal fade" id="adminReviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white py-3">
              <div class="d-flex align-items-center">
                <h5 class="modal-title fw-bold mb-0 me-3"><i class="bi bi-shield-check text-warning me-2"></i>Grievance Review & Resolution - ${c.complaint_number}</h5>
                ${getStatusBadge(c.status)}
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
              <div class="row g-4">
                
                <!-- Left Column: Citizen Info, Complaint Details & Media -->
                <div class="col-lg-7">
                  <!-- Citizen Info Card -->
                  <div class="card mb-3 border-0 shadow-sm">
                    <div class="card-header bg-white py-2 font-weight-bold fw-bold text-primary border-bottom">
                      <i class="bi bi-person-circle me-2"></i>Citizen Details
                    </div>
                    <div class="card-body">
                      <div class="row">
                        <div class="col-sm-6 mb-2">
                          <small class="text-muted d-block">Citizen Name</small>
                          <span class="fw-bold text-dark">${c.citizen_name || 'N/A'}</span>
                        </div>
                        <div class="col-sm-6 mb-2">
                          <small class="text-muted d-block">Email Address</small>
                          <span class="text-dark">${c.citizen_email || 'N/A'}</span>
                        </div>
                        <div class="col-sm-6 mb-2">
                          <small class="text-muted d-block">Contact Phone</small>
                          <span class="text-dark">${c.citizen_phone || 'N/A'}</span>
                        </div>
                        <div class="col-sm-6 mb-2">
                          <small class="text-muted d-block">Filing Date</small>
                          <span class="text-dark">${new Date(c.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Grievance Description Card -->
                  <div class="card mb-3 border-0 shadow-sm">
                    <div class="card-header bg-white py-2 fw-bold text-primary border-bottom d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-file-text me-2"></i>Complaint Overview</span>
                      <span class="badge bg-light text-dark border">${c.category}</span>
                    </div>
                    <div class="card-body">
                      <h6 class="fw-bold text-dark mb-2">${c.title}</h6>
                      <p class="text-secondary small mb-3 style-description">${c.description}</p>
                      
                      <!-- Evidence Image -->
                      ${c.image_url ? `
                        <div class="mt-3">
                          <small class="text-muted d-block fw-bold mb-1">Attached Photo Evidence</small>
                          <a href="${c.image_url}" target="_blank">
                            <img src="${c.image_url}" class="img-fluid rounded border shadow-sm style-modal-img" alt="Complaint Evidence" style="max-height: 220px; object-fit: cover; width: 100%;">
                          </a>
                        </div>
                      ` : `
                        <div class="p-3 text-center bg-light rounded text-muted small border">
                          <i class="bi bi-image me-1"></i> No photo evidence attached.
                        </div>
                      `}
                    </div>
                  </div>

                  <!-- Location Card -->
                  <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white py-2 fw-bold text-primary border-bottom">
                      <i class="bi bi-geo-alt me-2"></i>Incident Location & Coordinates
                    </div>
                    <div class="card-body">
                      <p class="text-dark small mb-2"><i class="bi bi-pin-map text-danger me-1"></i><strong>Address:</strong> ${c.location_address}</p>
                      ${c.latitude && c.longitude ? `
                        <p class="text-muted small mb-2"><i class="bi bi-compass me-1"></i><strong>Coordinates:</strong> ${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}</p>
                        <div id="admin-modal-map" style="height: 180px; width: 100%;" class="rounded border"></div>
                      ` : `
                        <div class="p-2 text-center text-muted small bg-light rounded">No GPS coordinates recorded.</div>
                      `}
                    </div>
                  </div>
                </div>

                <!-- Right Column: Admin Actions & Status Routing -->
                <div class="col-lg-5">
                  <div class="card border-0 shadow-sm sticky-top" style="top: 1rem;">
                    <div class="card-header bg-primary text-white py-3">
                      <h6 class="mb-0 fw-bold"><i class="bi bi-sliders me-2"></i>Admin Action & Department Routing</h6>
                    </div>
                    <div class="card-body">
                      <form id="admin-review-form">
                        
                        <!-- Priority Dropdown -->
                        <div class="mb-3">
                          <label class="form-label fw-bold small">Set Priority Level</label>
                          <select name="priority" id="admin-modal-priority" class="form-select">
                            <option value="Low" ${c.priority === 'Low' ? 'selected' : ''}>Low</option>
                            <option value="Medium" ${c.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="High" ${c.priority === 'High' ? 'selected' : ''}>High</option>
                            <option value="Critical" ${c.priority === 'Critical' ? 'selected' : ''}>Critical</option>
                          </select>
                        </div>

                        <!-- Department Selection -->
                        <div class="mb-3">
                          <label class="form-label fw-bold small">Assigned Department <span class="text-danger">*</span></label>
                          <select name="department_id" id="admin-modal-dept-select" class="form-select" required>
                            <option value="">-- Select Department --</option>
                            ${deptOptions}
                          </select>
                        </div>

                        <!-- Officer Selection -->
                        <div class="mb-3">
                          <label class="form-label fw-bold small">Assigned Field Officer</label>
                          <select name="officer_id" id="admin-modal-officer-select" class="form-select">
                            <option value="">-- Unassigned (Department Pool) --</option>
                          </select>
                        </div>

                        <!-- Status Selection -->
                        <div class="mb-3">
                          <label class="form-label fw-bold small">Update Complaint Status</label>
                          <select name="status" id="admin-modal-status" class="form-select">
                            <option value="Submitted" ${c.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                            <option value="Under Review" ${c.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                            <option value="Assigned" ${c.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                            <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                          </select>
                        </div>

                        <!-- Remarks / Comment -->
                        <div class="mb-3">
                          <label class="form-label fw-bold small">Admin Note / Status Comment</label>
                          <textarea name="comment" class="form-control" rows="3" placeholder="Provide reason or instructions for officer/citizen..."></textarea>
                        </div>

                        <div class="d-grid gap-2">
                          <button type="submit" class="btn btn-primary fw-bold">
                            <i class="bi bi-check2-circle me-1"></i> Save & Dispatch Changes
                          </button>
                          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                      </form>

                      <!-- History Timeline summary -->
                      <div class="mt-4 pt-3 border-top">
                        <small class="fw-bold text-secondary d-block mb-2"><i class="bi bi-clock-history me-1"></i>Status Audit Trail</small>
                        <ul class="list-group list-group-flush small">
                          ${history.map(h => `
                            <li class="list-group-item px-0 bg-transparent">
                              <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold">${h.status}</span>
                                <small class="text-muted">${new Date(h.created_at).toLocaleDateString()}</small>
                              </div>
                              <span class="text-muted d-block small">${h.comment || ''}</span>
                            </li>
                          `).join('')}
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('adminReviewModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('adminReviewModal');
    const modalObj = new bootstrap.Modal(modalEl);

    // Dynamic Leaflet Map setup on modal shown
    let modalMap = null;
    modalEl.addEventListener('shown.bs.modal', () => {
      if (c.latitude && c.longitude && window.L) {
        modalMap = L.map('admin-modal-map').setView([c.latitude, c.longitude], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(modalMap);
        L.marker([c.latitude, c.longitude]).addTo(modalMap)
          .bindPopup(`<b>${c.complaint_number}</b><br>${c.title}`)
          .openPopup();
        setTimeout(() => modalMap.invalidateSize(), 200);
      }
    });

    modalObj.show();

    // Officer dropdown fetch logic based on selected department
    const deptSelect = document.getElementById('admin-modal-dept-select');
    const officerSelect = document.getElementById('admin-modal-officer-select');

    async function updateOfficerDropdown(deptId) {
      if (!deptId) {
        officerSelect.innerHTML = `<option value="">-- Select Department First --</option>`;
        return;
      }
      try {
        const resOff = await apiRequest(`/officers/department/${deptId}`);
        if (resOff.success) {
          officerSelect.innerHTML = `<option value="">-- Unassigned (Department Pool) --</option>` +
            resOff.officers.map(o => `<option value="${o.officer_id}" ${c.officer_id === o.officer_id ? 'selected' : ''}>${o.officer_name} (${o.employee_id}) - Workload: ${o.current_active_workload}</option>`).join('');
        }
      } catch (e) {}
    }

    if (c.department_id) {
      updateOfficerDropdown(c.department_id);
    }

    deptSelect.addEventListener('change', (e) => updateOfficerDropdown(e.target.value));

    // Submit handler
    const form = document.getElementById('admin-review-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(form));

      try {
        // 1. Assign Department, Officer & Priority
        const resAssign = await apiRequest(`/complaints/${complaintId}/assign`, 'PUT', {
          department_id: formData.department_id,
          officer_id: formData.officer_id || null,
          priority: formData.priority,
          comment: formData.comment
        });

        // 2. If status was explicitly chosen, call status update as well
        if (formData.status && formData.status !== c.status) {
          await apiRequest(`/complaints/${complaintId}/status`, 'PUT', {
            status: formData.status,
            comment: formData.comment || `Status updated to ${formData.status} by Administrator.`
          });
        }

        if (resAssign.success) {
          showToast('Complaint updated successfully!', 'success');
          modalObj.hide();
          
          if (typeof fetchAdminComplaintsRegistry === 'function') {
            fetchAdminComplaintsRegistry();
          }
          if (typeof loadAdminDashboard === 'function') {
            loadAdminDashboard();
          }
        }
      } catch (err) {
        showToast('Failed to save complaint changes.', 'danger');
      }
    });

  } catch (err) {
    console.error('Open Admin Review Modal Error:', err);
    showToast('Failed to load complaint review dialog.', 'danger');
  }
}

/**
 * Open Department & Officer Assignment Modal (Wrapper for backwards compatibility)
 */
async function openAssignModal(complaintId) {
  await openAdminReviewModal(complaintId);
}

/**
 * Load Admin Analytics Page
 */
async function loadAdminAnalytics() {
  try {
    const res = await apiRequest('/admin/dashboard');
    if (!res.success) return;
    renderAdminCharts(res.charts);
  } catch (err) {
    showToast('Failed to load analytics charts', 'danger');
  }
}

/**
 * Load Admin Department Management Page
 */
async function loadAdminDepartments() {
  const container = document.getElementById('departments-list-container');
  if (!container) return;

  try {
    const res = await apiRequest('/departments');
    if (!res.success) return;

    const depts = res.departments;
    const cards = depts.map(d => `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card-civic h-100">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 class="mb-0 text-primary fw-bold">${d.name}</h5>
            <span class="badge bg-info text-dark">${d.officer_count || 0} Officers</span>
          </div>
          <div class="card-body">
            <p class="text-secondary small mb-3">${d.description || 'No description available.'}</p>
            <div class="d-flex justify-content-between text-muted small border-top pt-2">
              <span>Total Complaints: <strong>${d.total_complaints || 0}</strong></span>
              <span>Resolved: <strong class="text-success">${d.resolved_complaints || 0}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="row">${cards}</div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error loading departments.</div>`;
  }
}

/**
 * Load Admin Users Directory Page
 */
async function loadAdminUsers() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  try {
    const res = await apiRequest('/admin/users');
    if (!res.success) return;

    const users = res.users;
    const rows = users.map(u => `
      <tr>
        <td data-label="ID">#${u.id}</td>
        <td data-label="Name & Email">
          <span class="fw-bold">${u.name}</span><br>
          <small class="text-muted">${u.email}</small>
        </td>
        <td data-label="Phone">${u.phone || 'N/A'}</td>
        <td data-label="System Role">
          <span class="badge ${u.role === 'admin' ? 'bg-danger' : u.role === 'officer' ? 'bg-primary' : 'bg-secondary'} text-capitalize">
            ${u.role}
          </span>
        </td>
        <td data-label="Address"><small class="text-muted">${u.address || 'N/A'}</small></td>
        <td data-label="Joined Date"><small class="text-muted">${new Date(u.created_at).toLocaleDateString()}</small></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover table-civic responsive-data-grid align-middle mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name & Email</th>
              <th>Phone</th>
              <th>System Role</th>
              <th>Address</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error loading user list.</div>`;
  }
}
