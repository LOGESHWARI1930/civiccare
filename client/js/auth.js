/**
 * CivicCare Auth & Session Manager
 */

const Auth = {
  getToken() {
    return localStorage.getItem('civiccare_token');
  },

  getUser() {
    const userStr = localStorage.getItem('civiccare_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setSession(token, user) {
    localStorage.setItem('civiccare_token', token);
    localStorage.setItem('civiccare_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('civiccare_token');
    localStorage.removeItem('civiccare_user');
    window.location.href = '/login.html';
  },

  isLoggedIn() {
    return Boolean(this.getToken() && this.getUser());
  },

  /**
   * Get Role Default Dashboard Path
   */
  getDashboardPath(role) {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'officer':
        return '/officer/dashboard';
      case 'citizen':
      default:
        return '/citizen/dashboard';
    }
  },

  /**
   * Enforce Role-Based Route Guarding
   */
  requireAuth(allowedRoles = []) {
    if (!this.isLoggedIn()) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }

    const user = this.getUser();
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      window.location.href = this.getDashboardPath(user.role);
      return false;
    }

    return true;
  }
};
