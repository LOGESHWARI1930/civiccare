/**
 * CivicCare Field Officer Workspace Controller
 */

let officerRawComplaints = [];

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('officer-dashboard.html') || path.includes('/officer/dashboard')) {
    Auth.requireAuth(['officer']);
    loadOfficerDashboard();
  }
});

/**
 * Load Officer Dashboard (KPI Statistics + Assigned Complaints Table)
 */
async function loadOfficerDashboard() {
  const statsContainer = document.getElementById('officer-stats-cards');
  const tableContainer = document.getElementById('officer-complaints-table-container');
  const greetingEl = document.getElementById('officer-greeting-title');

  try {
    // 1. Fetch Officer Dashboard Overview Statistics & Profile
    const resStats = await apiRequest('/officer/dashboard');
    if (resStats.success) {
      const user = Auth.getUser();
      const officerName = resStats.officer?.name || user?.name || 'Officer';

      // Dynamic Time-Based Greeting
      const hour = new Date().getHours();
      let greetingTime = 'Good Morning';
      if (hour >= 12 && hour < 17) greetingTime = 'Good Afternoon';
      else if (hour >= 17) greetingTime = 'Good Evening';

      if (greetingEl) {
        greetingEl.innerHTML = `${greetingTime}, ${officerName} 👋`;
      }

      // Render 4 KPI Statistics Cards
      if (statsContainer) {
        const { totalAssigned = 0, pending = 0, inProgress = 0, resolved = 0 } = resStats.stats || {};
        statsContainer.innerHTML = `
          <div class="col-md-3 col-6">
            <div class="stat-card border-primary">
              <div class="icon-box primary"><i class="bi bi-briefcase-fill"></i></div>
              <div class="stat-value text-primary">${totalAssigned}</div>
              <div class="stat-label">Assigned Complaints</div>
            </div>
          </div>
          <div class="col-md-3 col-6">
            <div class="stat-card">
              <div class="icon-box warning" style="background-color: #FEF3C7; color: #B45309;"><i class="bi bi-hourglass-split"></i></div>
              <div class="stat-value" style="color: #B45309;">${pending}</div>
              <div class="stat-label">Pending Action</div>
            </div>
          </div>
          <div class="col-md-3 col-6">
            <div class="stat-card">
              <div class="icon-box info" style="background-color: #E0F2FE; color: #0369A1;"><i class="bi bi-gear-wide-connected"></i></div>
              <div class="stat-value" style="color: #0369A1;">${inProgress}</div>
              <div class="stat-label">In Progress</div>
            </div>
          </div>
          <div class="col-md-3 col-6">
            <div class="stat-card border-success">
              <div class="icon-box success" style="background-color: #DCFCE7; color: #15803D;"><i class="bi bi-check-circle-fill"></i></div>
              <div class="stat-value text-success">${resolved}</div>
              <div class="stat-label">Resolved</div>
            </div>
          </div>
        `;
      }
    }

    // 2. Fetch Complaints Assigned Strictly to Logged-In Officer
    const resComp = await apiRequest('/officer/complaints');
    if (!resComp.success) return;

    officerRawComplaints = resComp.complaints || [];
    renderOfficerComplaintsTable(officerRawComplaints);

  } catch (err) {
    console.error('Load Officer Dashboard Error:', err);
    if (tableContainer) {
      tableContainer.innerHTML = `<div class="alert alert-danger m-3">Error loading officer assigned complaints.</div>`;
    }
  }
}

/**
 * Render Assigned Complaints Table with Priority Highlighting
 */
function renderOfficerComplaintsTable(complaints) {
  const container = document.getElementById('officer-complaints-table-container');
  const badgeEl = document.getElementById('officer-assigned-badge');

  if (!container) return;
  if (badgeEl) badgeEl.textContent = `${complaints.length} Complaints`;

  if (complaints.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 px-3">
        <div class="fs-1 text-success mb-2"><i class="bi bi-shield-check"></i></div>
        <h5 class="fw-bold text-dark mb-1">No assigned complaints in queue</h5>
        <p class="text-muted small mb-0">You currently have no pending tasks assigned to your officer account.</p>
      </div>
    `;
    return;
  }

  const rows = complaints.map(c => {
    // Row highlighting based on Priority
    let rowClass = '';
    let urgentBadge = '';
    if (c.priority === 'Critical') {
      rowClass = 'highlight-urgent-row';
      urgentBadge = `<span class="badge bg-danger text-white ms-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>URGENT</span>`;
    } else if (c.priority === 'High') {
      rowClass = 'highlight-high-row';
    }

    return `
      <tr class="${rowClass}">
        <td data-label="Complaint ID">
          <a href="/officer/complaints/${c.id}" class="fw-bold text-decoration-none text-primary">${c.complaint_number}</a>
          ${urgentBadge}
        </td>
        <td data-label="Category"><span class="badge bg-light text-dark border">${c.category}</span></td>
        <td data-label="Location">
          <div class="text-truncate style-location" style="max-width: 220px;" title="${c.location_address}">
            <i class="bi bi-geo-alt-fill text-danger me-1"></i>${c.location_address}
          </div>
        </td>
        <td data-label="Priority">${getPriorityBadge(c.priority)}</td>
        <td data-label="Status">${getStatusBadge(c.status)}</td>
        <td data-label="Assigned Date"><small class="text-muted">${new Date(c.created_at).toLocaleDateString()}</small></td>
        <td data-label="Action">
          <div class="d-flex gap-1 justify-content-end flex-wrap" role="group">
            <a href="/officer/complaints/${c.id}" class="btn btn-sm btn-outline-primary" title="View & Resolve">
              <i class="bi bi-tools me-1"></i> Field Work
            </a>
            ${c.status !== 'In Progress' && c.status !== 'Resolved' ? `
              <button class="btn btn-sm btn-outline-info" onclick="updateOfficerComplaintStatus(${c.id}, 'In Progress')" title="Mark In Progress">
                <i class="bi bi-play-fill"></i> Start
              </button>
            ` : ''}
            ${c.status !== 'Resolved' ? `
              <button class="btn btn-sm btn-success fw-semibold" onclick="openResolveModal(${c.id}, '${c.complaint_number}')" title="Submit Resolution">
                <i class="bi bi-check2-circle me-1"></i> Resolve
              </button>
            ` : `
              <span class="badge bg-success-subtle text-success border border-success align-self-center px-2 py-1"><i class="bi bi-check-all me-1"></i>Done</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-civic responsive-data-grid align-middle mb-0">
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Category</th>
            <th>Location</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned Date</th>
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

/**
 * Filter Table by Search Keyword, Status, or Priority
 */
function filterOfficerTable() {
  const searchVal = document.getElementById('officer-search-input')?.value.toLowerCase().trim() || '';
  const statusVal = document.getElementById('officer-status-filter')?.value || 'All';
  const priorityVal = document.getElementById('officer-priority-filter')?.value || 'All';

  const filtered = officerRawComplaints.filter(c => {
    const matchSearch = !searchVal || 
      c.complaint_number.toLowerCase().includes(searchVal) ||
      c.title.toLowerCase().includes(searchVal) ||
      c.location_address.toLowerCase().includes(searchVal);

    const matchStatus = statusVal === 'All' || c.status === statusVal;
    const matchPriority = priorityVal === 'All' || c.priority === priorityVal;

    return matchSearch && matchStatus && matchPriority;
  });

  renderOfficerComplaintsTable(filtered);
}

/**
 * Update Officer Complaint Status (e.g., Mark In Progress)
 */
async function updateOfficerComplaintStatus(id, status) {
  try {
    const res = await apiRequest(`/complaints/${id}/status`, 'PUT', {
      status,
      comment: `Field Officer marked complaint status as "${status}".`
    });

    if (res.success) {
      showToast(res.message || `Status updated to ${status}`, 'success');
      loadOfficerDashboard();
    }
  } catch (err) {
    showToast('Failed to update complaint status.', 'danger');
  }
}

/**
 * Open Officer Resolution Modal
 */
function openResolveModal(id, complaintNumber) {
  const modalHtml = `
    <div class="modal fade" id="resolveModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white py-3">
            <h5 class="modal-title fw-bold"><i class="bi bi-check-circle me-2"></i>Submit Resolution - ${complaintNumber}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <form id="resolve-form" enctype="multipart/form-data">
            <input type="hidden" name="complaint_id" value="${id}">
            <div class="modal-body p-4">
              <div class="mb-3">
                <label class="form-label fw-bold">Resolution Work Description <span class="text-danger">*</span></label>
                <textarea name="description" class="form-control" rows="4" placeholder="Describe repair actions taken, materials used, and completion details..." required></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">Upload Resolution Photo Evidence (Optional)</label>
                <input type="file" name="evidence_image" class="form-control" accept="image/*">
                <div class="form-text small text-muted">Upload photo proving completed work on-site</div>
              </div>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" id="submit-resolve-btn" class="btn btn-success fw-bold">
                <i class="bi bi-check-lg me-1"></i> Submit & Mark Resolved
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById('resolveModal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modalObj = new bootstrap.Modal(document.getElementById('resolveModal'));
  modalObj.show();

  const form = document.getElementById('resolve-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-resolve-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Submitting...`;

    try {
      const formData = new FormData(form);
      const res = await apiRequest('/officers/resolve', 'POST', formData, true);
      if (res.success) {
        showToast(res.message || 'Resolution submitted successfully!', 'success');
        modalObj.hide();
        loadOfficerDashboard();
      } else {
        showToast(res.message || 'Failed to submit resolution.', 'danger');
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-lg me-1"></i> Submit & Mark Resolved`;
      }
    } catch (err) {
      showToast('Error submitting resolution.', 'danger');
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-check-lg me-1"></i> Submit & Mark Resolved`;
    }
  });
}
