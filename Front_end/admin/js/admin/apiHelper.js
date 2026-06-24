/**
 * Admin Module API Integration Helper
 * Provides standardized functions for API calls across admin modules
 */

const AdminAPI = {
  // Base configuration
  baseUrl: "http://localhost:8000/api",
  
  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint (e.g., '/cours/add')
   * @param {Object} options - Fetch options (method, body, etc.)
   * @returns {Promise} API response
   */
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || `Erreur API: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  },

  /**
   * GET request helper
   */
  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  /**
   * POST request helper
   */
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * PUT request helper
   */
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request helper
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },

  /**
   * Handle form submission with modal management
   * @param {string} modalId - Modal ID to close after success
   * @param {string} endpoint - API endpoint
   * @param {Object} formData - Form data to send
   * @param {Function} onSuccess - Callback after success
   */
  async submitForm(modalId, endpoint, formData, onSuccess) {
    try {
      const response = await this.post(endpoint, formData);
      
      // Close modal
      if (window.ModalManager) {
        ModalManager.close(modalId);
        ModalManager.resetForm(modalId);
      }

      // Call success callback
      if (onSuccess) await onSuccess(response);
      
      return response;
    } catch (error) {
      alert(error.message || "Une erreur s'est produite");
      throw error;
    }
  },

  /**
   * Check if token is valid
   * @returns {boolean}
   */
  isTokenValid() {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  getLoginUrl() {
    return new URL("../login.html", window.location.href).href;
  },

  /**
   * Redirect to login if token is invalid or if user is not admin
   */
  redirectIfTokenInvalid() {
    const role = localStorage.getItem("role");
    if (!this.isTokenValid() || role !== "admin") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = this.getLoginUrl();
      return true;
    }
    return false;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await this.request("/auth/logout", { method: "POST" });
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = this.getLoginUrl();
    }
  },
};

/**
 * Setup logout links
 */
function setupLogoutHandlers() {
  document.querySelectorAll(".logout-link, .sidebar-footer .nav-link").forEach((link) => {
    if (link.textContent.toLowerCase().includes("déconnexion") || 
        link.textContent.toLowerCase().includes("logout")) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        AdminAPI.logout();
      });
    }
  });
}

// Auto-setup on DOM ready
document.addEventListener("DOMContentLoaded", setupLogoutHandlers);
