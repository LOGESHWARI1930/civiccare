/**
 * CivicCare Centralized API Service
 */

const API_BASE_URL = '/api';

/**
 * Fetch wrapper with JWT Token and Error Handling
 */
async function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const token = localStorage.getItem('civiccare_token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (data && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    method,
    headers
  };

  if (data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        // Token expired or invalid
        localStorage.removeItem('civiccare_token');
        localStorage.removeItem('civiccare_user');
        window.location.href = '/login.html?expired=true';
      }
      throw new Error(result.message || 'API request failed.');
    }

    return result;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error.message);
    showToast(error.message || 'Network request failed', 'danger');
    throw error;
  }
}

/**
 * Global Toast Notification Helper
 */
function showToast(message, type = 'info', title = 'CivicCare Notice') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toastId = `toast-${Date.now()}`;
  const bgClass = type === 'danger' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : 'bg-primary text-white';

  const html = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 show shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <strong>${title}:</strong> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  setTimeout(() => {
    const element = document.getElementById(toastId);
    if (element) element.remove();
  }, 4500);
}
