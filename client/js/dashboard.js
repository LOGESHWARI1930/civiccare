/**
 * CivicCare Citizen Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/citizen/dashboard') || window.location.pathname.includes('citizen-dashboard.html')) {
    Auth.requireAuth(['citizen']);
    initCitizenDashboard();
  }
});

/**
 * Initialize Citizen Dashboard with real values from GET /api/citizen/dashboard
 */
async function initCitizenDashboard() {
  const user = Auth.getUser();

  // Set greeting
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl && user) {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    greetingEl.innerHTML = `${timeOfDay}, ${user.name} 👋`;
  }

  // Load dashboard data from backend API
  await loadCitizenDashboardData();
}

/**
 * Fetch and render dynamic statistics, complaints table, and activity feed
 */
async function loadCitizenDashboardData() {
  const statsContainer = document.getElementById('citizen-stats-cards');
  const tableContainer = document.getElementById('citizen-complaints-list');
  const activityContainer = document.getElementById('recent-activity-container');

  try {
    const res = await apiRequest('/citizen/dashboard');
    if (!res.success) return;

    const { stats, recentComplaints, recentActivity } = res;

    // 1. Render Dashboard Statistics Cards
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="col-lg-3 col-6 mb-3">
          <div class="stat-card">
            <div class="icon-box primary"><i class="bi bi-file-text-fill"></i></div>
            <div class="stat-value">${stats.total || 0}</div>
            <div class="stat-label">Total Complaints</div>
          </div>
        </div>
        <div class="col-lg-3 col-6 mb-3">
          <div class="stat-card">
            <div class="icon-box warning" style="background-color: #FEF3C7; color: #B45309;"><i class="bi bi-clock-history"></i></div>
            <div class="stat-value" style="color: #B45309;">${stats.pending || 0}</div>
            <div class="stat-label">Pending Review</div>
          </div>
        </div>
        <div class="col-lg-3 col-6 mb-3">
          <div class="stat-card">
            <div class="icon-box info" style="background-color: #E0F2FE; color: #0369A1;"><i class="bi bi-gear-wide-connected"></i></div>
            <div class="stat-value" style="color: #0369A1;">${stats.inProgress || 0}</div>
            <div class="stat-label">In Progress</div>
          </div>
        </div>
        <div class="col-lg-3 col-6 mb-3">
          <div class="stat-card">
            <div class="icon-box success" style="background-color: #DCFCE7; color: #15803D;"><i class="bi bi-check-circle-fill"></i></div>
            <div class="stat-value" style="color: #15803D;">${stats.resolved || 0}</div>
            <div class="stat-label">Resolved</div>
          </div>
        </div>
      `;
    }

    // 2. Render Recent Complaints (Latest 5) or Empty State
    if (tableContainer) {
      if (!recentComplaints || recentComplaints.length === 0) {
        // Empty state per user request: "You're all clear! Report your first civic issue."
        tableContainer.innerHTML = `
          <div class="text-center py-5 px-3 bg-white rounded shadow-sm">
            <div class="fs-1 text-success mb-3"><i class="bi bi-check-circle-fill"></i></div>
            <h4 class="fw-bold text-dark mb-2">You're all clear!</h4>
            <p class="text-muted mb-4 fs-6">Report your first civic issue to help keep your neighborhood clean and safe.</p>
            <a href="/create-complaint.html" class="btn btn-civic-primary btn-lg px-4 shadow-sm">
              <i class="bi bi-plus-circle me-2"></i>+ Report New Issue
            </a>
          </div>
        `;
      } else {
        const rows = recentComplaints.map(c => `
          <tr>
            <td data-label="Complaint ID">
              <a href="/citizen/complaints/${c.id}" class="fw-bold text-decoration-none text-primary">
                ${c.complaint_number}
              </a>
            </td>
            <td data-label="Title & Location">
              <span class="fw-semibold text-dark">${c.title}</span><br>
              <small class="text-muted"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${c.location_address}</small>
            </td>
            <td data-label="Category"><span class="badge bg-light text-dark border">${c.category}</span></td>
            <td data-label="Priority">${getPriorityBadge(c.priority)}</td>
            <td data-label="Status">${getStatusBadge(c.status)}</td>
            <td data-label="Date"><small class="text-muted">${new Date(c.created_at).toLocaleDateString()}</small></td>
            <td data-label="Action">
              <a href="/citizen/complaints/${c.id}" class="btn btn-sm btn-outline-primary shadow-sm">
                <i class="bi bi-eye-fill me-1"></i> View Details
              </a>
            </td>
          </tr>
        `).join('');

        tableContainer.innerHTML = `
          <div class="table-responsive">
            <table class="table table-hover table-civic responsive-data-grid align-middle mb-0">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Title & Location</th>
                  <th>Category</th>
                  <th>Priority</th>
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
    }

    // 3. Render Recent Activity Feed
    if (activityContainer) {
      if (!recentActivity || recentActivity.length === 0) {
        activityContainer.innerHTML = `<div class="p-3 text-center text-muted small">No recent activity updates yet.</div>`;
      } else {
        const activityHtml = recentActivity.map(a => `
          <div class="d-flex align-items-start gap-3 p-3 border-bottom">
            <div class="rounded-circle bg-primary bg-opacity-10 p-2 text-primary">
              <i class="bi bi-activity fs-5"></i>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="small text-dark">${a.complaint_number}</strong>
                <small class="text-muted">${new Date(a.created_at).toLocaleString()}</small>
              </div>
              <div class="small text-secondary mb-1">
                Status updated to ${getStatusBadge(a.status)}
              </div>
              <p class="small text-muted mb-0 bg-light p-2 rounded border">${a.comment || 'Status updated by system.'}</p>
            </div>
          </div>
        `).join('');

        activityContainer.innerHTML = activityHtml;
      }
    }

  } catch (err) {
    if (tableContainer) tableContainer.innerHTML = `<div class="alert alert-danger m-3">Error loading dashboard grievances.</div>`;
  }
}
