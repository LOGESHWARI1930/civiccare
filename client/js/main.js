/**
 * CivicCare Shared UI Components & Helpers
 * Full Responsive Web & Mobile App Shell
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderSidebar();
  renderBottomNav();
  loadUnreadNotificationBadge();
});

/**
 * Render Reusable Navbar
 */
function renderNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  const user = Auth.getUser();
  const isLoggedIn = Auth.isLoggedIn();

  let rightNav = '';
  if (isLoggedIn) {
    const initials = (user.name || 'User')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    rightNav = `
      <div class="d-flex align-items-center gap-2 gap-md-3">
        <!-- Notifications Bell -->
        <a href="/notifications" class="btn btn-link text-white position-relative p-2" title="Notifications" aria-label="Notifications">
          <i class="bi bi-bell-fill fs-5"></i>
          <span id="notif-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none">0</span>
        </a>

        <!-- User Dropdown (Responsive Avatar Pill) -->
        <div class="dropdown">
          <button class="btn nav-user-pill dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <span class="nav-avatar-icon">${initials}</span>
            <span class="d-none d-md-inline fw-semibold text-truncate" style="max-width: 140px;">${user.name}</span>
            <span class="badge bg-secondary text-dark text-capitalize ms-1 d-none d-lg-inline" style="font-size: 0.68rem;">${user.role}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2">
            <li class="px-3 py-2 border-bottom d-md-none">
              <div class="fw-bold text-dark text-truncate">${user.name}</div>
              <small class="badge bg-secondary text-dark text-capitalize">${user.role}</small>
            </li>
            <li><a class="dropdown-item py-2" href="/profile.html"><i class="bi bi-person me-2 text-primary"></i>My Profile</a></li>
            <li><a class="dropdown-item py-2" href="/notifications"><i class="bi bi-bell me-2 text-info"></i>Notifications</a></li>
            <li><hr class="dropdown-divider my-1"></li>
            <li><a class="dropdown-item py-2 text-danger" href="#" onclick="Auth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
          </ul>
        </div>
      </div>
    `;
  } else {
    rightNav = `
      <div class="d-flex align-items-center gap-2">
        <a href="/login.html" class="btn btn-outline-light btn-sm px-3">Login</a>
        <a href="/register.html" class="btn btn-civic-secondary btn-sm px-3 d-none d-sm-inline-block">Register</a>
      </div>
    `;
  }

  container.innerHTML = `
    <nav class="navbar navbar-civic sticky-top">
      <div class="container-fluid px-2 px-md-3">
        <div class="d-flex align-items-center">
          ${isLoggedIn ? `
            <button class="btn btn-outline-light btn-sm d-lg-none me-2 px-2 py-1" onclick="toggleSidebar()" aria-label="Toggle navigation menu">
              <i class="bi bi-list fs-4"></i>
            </button>
          ` : ''}
          <a class="navbar-brand text-decoration-none d-flex align-items-center" href="/" title="CivicCare">
            <div class="bg-white rounded-3 px-2 py-1 d-inline-flex align-items-center shadow-sm">
              <img src="/assets/images/logo.png" alt="CivicCare" height="38" class="d-inline-block">
            </div>
          </a>
        </div>
        <div class="ms-auto">
          ${rightNav}
        </div>
      </div>
    </nav>
  `;
}

/**
 * Render Reusable Sidebar based on User Role with Drawer & Backdrop
 */
function renderSidebar() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  const user = Auth.getUser();
  if (!user) return;

  const currentPath = window.location.pathname;

  let items = [];
  if (user.role === 'citizen') {
    items = [
      { label: 'My Dashboard', icon: 'bi-grid-1x2-fill', link: '/citizen/dashboard', match: ['/citizen/dashboard', 'citizen-dashboard.html'] },
      { label: 'My Complaints', icon: 'bi-journal-text', link: '/citizen/complaints', match: ['/citizen/complaints', 'my-complaints.html'] },
      { label: 'Report Grievance', icon: 'bi-plus-circle-fill', link: '/citizen/report', match: ['/citizen/report', 'create-complaint.html'] },
      { label: 'Notifications', icon: 'bi-bell-fill', link: '/notifications', match: ['/notifications', 'notifications.html'] },
      { label: 'User Profile', icon: 'bi-person-circle', link: '/profile', match: ['/profile', 'profile.html'] }
    ];
  } else if (user.role === 'officer') {
    items = [
      { label: 'Field Workspace', icon: 'bi-card-checklist', link: '/officer/dashboard', match: ['/officer/dashboard', 'officer-dashboard.html'] },
      { label: 'Notifications', icon: 'bi-bell-fill', link: '/notifications', match: ['/notifications', 'notifications.html'] },
      { label: 'Officer Profile', icon: 'bi-person-circle', link: '/profile', match: ['/profile', 'profile.html'] }
    ];
  } else if (user.role === 'admin') {
    items = [
      { label: 'Command Center', icon: 'bi-speedometer2', link: '/admin/dashboard', match: ['/admin/dashboard', 'admin-dashboard.html'] },
      { label: 'Complaints Registry', icon: 'bi-journal-check', link: '/admin/complaints', match: ['/admin/complaints', 'admin-complaints.html'] },
      { label: 'Analytics Reports', icon: 'bi-bar-chart-line-fill', link: '/admin/analytics', match: ['/admin/analytics', 'admin-analytics.html'] },
      { label: 'Departments', icon: 'bi-building', link: '/admin/departments', match: ['/admin/departments', 'admin-departments.html'] },
      { label: 'Officers Directory', icon: 'bi-person-badge-fill', link: '/admin/officers', match: ['/admin/officers', 'admin-officers.html'] },
      { label: 'Users Directory', icon: 'bi-people-fill', link: '/admin-users.html', match: ['admin-users.html'] },
      { label: 'Notifications', icon: 'bi-bell-fill', link: '/notifications', match: ['/notifications', 'notifications.html'] },
      { label: 'Admin Profile', icon: 'bi-person-circle', link: '/profile', match: ['/profile', 'profile.html'] }
    ];
  }

  const html = items.map(item => {
    const isActive = item.match.some(m => currentPath.includes(m));
    return `
      <a href="${item.link}" class="sidebar-item ${isActive ? 'active' : ''}" onclick="closeSidebar()">
        <i class="bi ${item.icon}"></i>
        <span>${item.label}</span>
        ${item.link.includes('notification') ? `<span id="sidebar-notif-badge" class="badge rounded-pill bg-danger ms-auto d-none">0</span>` : ''}
      </a>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Mobile Backdrop -->
    <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="closeSidebar()"></div>

    <!-- Sidebar Drawer -->
    <aside class="sidebar-civic shadow-sm" id="civic-sidebar">
      <!-- Mobile Drawer Header -->
      <div class="sidebar-header-mobile d-lg-none">
        <div>
          <h6 class="fw-bold mb-0 text-white"><i class="bi bi-shield-check text-info me-1"></i> CivicCare</h6>
          <span class="badge bg-secondary text-dark text-capitalize" style="font-size: 0.7rem;">${user.role} Portal</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-light rounded-circle" onclick="closeSidebar()" aria-label="Close navigation">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Links Container -->
      <div class="sidebar-body-mobile">
        ${html}
      </div>
    </aside>
  `;

  // Attach ESC key listener to close drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
}

/**
 * Toggle & Close Sidebar Navigation Drawer
 */
function toggleSidebar() {
  const sidebar = document.getElementById('civic-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    const isShowing = sidebar.classList.contains('show');
    if (isShowing) {
      closeSidebar();
    } else {
      sidebar.classList.add('show');
      backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('civic-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
  document.body.style.overflow = '';
}

/**
 * Render Reusable App Bottom Navigation Bar for Mobile
 */
function renderBottomNav() {
  if (!Auth.isLoggedIn()) return;

  // Add clearance class to body
  document.body.classList.add('has-bottom-nav');

  let bottomNavContainer = document.getElementById('bottom-nav-container');
  if (!bottomNavContainer) {
    bottomNavContainer = document.createElement('nav');
    bottomNavContainer.id = 'bottom-nav-container';
    bottomNavContainer.className = 'bottom-nav-civic';
    document.body.appendChild(bottomNavContainer);
  }

  const user = Auth.getUser();
  const currentPath = window.location.pathname;

  let navItems = [];
  if (user.role === 'citizen') {
    navItems = [
      { label: 'Home', icon: 'bi-grid-fill', link: '/citizen/dashboard', match: ['/citizen/dashboard', 'citizen-dashboard.html'] },
      { label: 'Complaints', icon: 'bi-journal-text', link: '/citizen/complaints', match: ['/citizen/complaints', 'my-complaints.html'] },
      { label: 'Report', icon: 'bi-plus-lg', link: '/citizen/report', isAction: true, match: ['/citizen/report', 'create-complaint.html'] },
      { label: 'Alerts', icon: 'bi-bell-fill', link: '/notifications', hasBadge: true, match: ['/notifications', 'notifications.html'] },
      { label: 'Profile', icon: 'bi-person-fill', link: '/profile', match: ['/profile', 'profile.html'] }
    ];
  } else if (user.role === 'officer') {
    navItems = [
      { label: 'Queue', icon: 'bi-card-checklist', link: '/officer/dashboard', match: ['/officer/dashboard', 'officer-dashboard.html'] },
      { label: 'Alerts', icon: 'bi-bell-fill', link: '/notifications', hasBadge: true, match: ['/notifications', 'notifications.html'] },
      { label: 'Profile', icon: 'bi-person-fill', link: '/profile', match: ['/profile', 'profile.html'] }
    ];
  } else if (user.role === 'admin') {
    navItems = [
      { label: 'Dashboard', icon: 'bi-speedometer2', link: '/admin/dashboard', match: ['/admin/dashboard', 'admin-dashboard.html'] },
      { label: 'Complaints', icon: 'bi-journal-check', link: '/admin/complaints', match: ['/admin/complaints', 'admin-complaints.html'] },
      { label: 'Analytics', icon: 'bi-bar-chart-fill', link: '/admin/analytics', match: ['/admin/analytics', 'admin-analytics.html'] },
      { label: 'Alerts', icon: 'bi-bell-fill', link: '/notifications', hasBadge: true, match: ['/notifications', 'notifications.html'] },
      { label: 'Profile', icon: 'bi-person-fill', link: '/profile', match: ['/profile', 'profile.html'] }
    ];
  }

  bottomNavContainer.innerHTML = navItems.map(item => {
    const isActive = item.match.some(m => currentPath.includes(m));
    if (item.isAction) {
      return `
        <a href="${item.link}" class="bottom-nav-item nav-action-center" title="${item.label}">
          <div class="nav-action-bubble">
            <i class="bi ${item.icon}"></i>
          </div>
          <span>${item.label}</span>
        </a>
      `;
    }
    return `
      <a href="${item.link}" class="bottom-nav-item ${isActive ? 'active' : ''}">
        <i class="bi ${item.icon}"></i>
        <span>${item.label}</span>
        ${item.hasBadge ? `<span id="bottom-notif-badge" class="bottom-nav-badge d-none">0</span>` : ''}
      </a>
    `;
  }).join('');
}

/**
 * Status Badge HTML Generator
 */
function getStatusBadge(status) {
  switch (status) {
    case 'Submitted':
      return `<span class="badge-status badge-submitted"><i class="bi bi-send"></i> Submitted</span>`;
    case 'Under Review':
      return `<span class="badge-status badge-under-review"><i class="bi bi-search"></i> Under Review</span>`;
    case 'Assigned':
      return `<span class="badge-status badge-assigned"><i class="bi bi-person-check"></i> Assigned</span>`;
    case 'In Progress':
      return `<span class="badge-status badge-in-progress"><i class="bi bi-gear-wide-connected"></i> In Progress</span>`;
    case 'Resolved':
      return `<span class="badge-status badge-resolved"><i class="bi bi-check-circle-fill"></i> Resolved</span>`;
    case 'Rejected':
      return `<span class="badge-status badge-rejected"><i class="bi bi-x-circle-fill"></i> Rejected</span>`;
    default:
      return `<span class="badge-status badge-submitted">${status}</span>`;
  }
}

/**
 * Priority Badge HTML Generator
 */
function getPriorityBadge(priority) {
  switch (priority) {
    case 'Low':
      return `<span class="badge-priority priority-low">Low</span>`;
    case 'Medium':
      return `<span class="badge-priority priority-medium">Medium</span>`;
    case 'High':
      return `<span class="badge-priority priority-high">High</span>`;
    case 'Critical':
      return `<span class="badge-priority priority-critical"><i class="bi bi-exclamation-triangle-fill me-1"></i>Critical</span>`;
    default:
      return `<span class="badge-priority priority-medium">${priority}</span>`;
  }
}

/**
 * Load Unread Notification Count
 */
async function loadUnreadNotificationBadge() {
  if (!Auth.isLoggedIn()) return;
  try {
    const res = await apiRequest('/notifications');
    if (res.success && res.unreadCount > 0) {
      const badge = document.getElementById('notif-badge');
      if (badge) {
        badge.textContent = res.unreadCount;
        badge.classList.remove('d-none');
      }
      const sideBadge = document.getElementById('sidebar-notif-badge');
      if (sideBadge) {
        sideBadge.textContent = res.unreadCount;
        sideBadge.classList.remove('d-none');
      }
      const bottomBadge = document.getElementById('bottom-notif-badge');
      if (bottomBadge) {
        bottomBadge.textContent = res.unreadCount;
        bottomBadge.classList.remove('d-none');
      }
    }
  } catch (err) {
    // Ignore error silently
  }
}

/**
 * Open Full-Screen Image Lightbox (Touch Inspection)
 */
function openImageLightbox(imageUrl, title = 'Inspection Photo') {
  if (!imageUrl) return;

  // Remove existing lightbox if any
  const existing = document.getElementById('civic-lightbox');
  if (existing) existing.remove();

  const html = `
    <div id="civic-lightbox" class="civic-lightbox-backdrop" onclick="closeImageLightbox(event)">
      <div class="civic-lightbox-content">
        <button type="button" class="civic-lightbox-close" onclick="closeImageLightbox()" aria-label="Close Lightbox">
          <i class="bi bi-x-lg"></i>
        </button>
        <img src="${imageUrl}" alt="${title}" class="civic-lightbox-img" onclick="event.stopPropagation()">
        <div class="text-white text-center mt-2 small fw-semibold">${title}</div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(() => {
    const el = document.getElementById('civic-lightbox');
    if (el) el.classList.add('show');
  }, 10);
}

function closeImageLightbox(e) {
  if (e && e.target && e.target.classList.contains('civic-lightbox-img')) return;
  const el = document.getElementById('civic-lightbox');
  if (el) {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead() {
  try {
    await apiRequest('/notifications/read-all', 'PUT');
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.add('d-none');
    const sideBadge = document.getElementById('sidebar-notif-badge');
    if (sideBadge) sideBadge.classList.add('d-none');
    const bottomBadge = document.getElementById('bottom-notif-badge');
    if (bottomBadge) bottomBadge.classList.add('d-none');
    showToast('All notifications marked as read', 'success');
  } catch (err) {
    showToast('Failed to update notifications', 'danger');
  }
}
