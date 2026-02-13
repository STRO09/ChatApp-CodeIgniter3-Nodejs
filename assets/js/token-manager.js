/**
 * Token Manager - Handles JWT and Refresh Token logic
 */
class TokenManager {
  constructor() {
    this.accessTokenKey = "access_token";
    this.tokenExpiryKey = "token_expiry";
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  /**
   * Store access token in localStorage
   */
  setAccessToken(token, expiresIn) {
    localStorage.setItem(this.accessTokenKey, token);

    // Calculate expiry time (subtract 1 minute for safety margin)
    const expiryTime = Date.now() + this.parseExpiresIn(expiresIn) - 60000;
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken() {
    return localStorage.getItem(this.accessTokenKey);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    if (!expiry) return true;

    return Date.now() >= parseInt(expiry);
  }

  /**
   * Clear tokens
   */
  clearTokens() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
  }

  /**
   * Parse expiresIn string (e.g., "15m") to milliseconds
   */
  parseExpiresIn(expiresIn) {
    if (typeof expiresIn === "number") {
      return expiresIn * 1000;
    }

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 1000);
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/refresh`, {
        method: "POST",
        credentials: "include", // Include cookies (refresh token)
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success && data.data.accessToken) {
        this.setAccessToken(data.data.accessToken, data.data.expiresIn);

        // Notify all waiting requests
        this.refreshSubscribers.forEach((callback) => callback(data.data.accessToken));
        this.refreshSubscribers = [];

        return data.data.accessToken;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      this.clearTokens();
      window.location.href = "/index.php/AuthController";
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
}

/**
 * API Client with retry logic and automatic token refresh
 */
class APIClient {
  constructor() {
    this.tokenManager = new TokenManager();
    this.maxRetries = 3;
    this.retryDelay = 1000; // milliseconds
    this.baseUrl = API_CONFIG.baseUrl;
    this.apiVersion = "v1";
  }

  /**
   * Build full API URL
   */
  buildUrl(endpoint) {
    endpoint = endpoint.replace(/^\//, "");
    return `${this.baseUrl}/api/${this.apiVersion}/${endpoint}`;
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(endpoint, options = {}, retryCount = 0) {
    const url = this.buildUrl(endpoint);

    // Get access token
    let token = this.tokenManager.getAccessToken();

    // Check if token is expired
    if (token && this.tokenManager.isTokenExpired()) {
      try {
        token = await this.tokenManager.refreshToken();
      } catch (error) {
        throw new Error("Authentication failed");
      }
    }

    // Build headers
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Make request
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Include cookies
      });

      // Handle 401 (Unauthorized)
      if (response.status === 401 && retryCount === 0) {
        const data = await response.json();

        // Check if it's token expiration
        if (data.error && data.error.code === 1002) {
          try {
            // Refresh token and retry
            await this.tokenManager.refreshToken();
            return this.makeRequest(endpoint, options, retryCount + 1);
          } catch (error) {
            throw new Error("Authentication failed");
          }
        }
      }

      // Handle server errors with retry
      if (response.status >= 500 && retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      // Parse response
      const data = await response.json();
      return data;
    } catch (error) {
      // Network error - retry
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.makeRequest(url, {
      method: "GET",
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.makeRequest(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.makeRequest(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Handle login response
   */
  handleLoginResponse(data) {
    if (data.success && data.data.accessToken) {
      this.tokenManager.setAccessToken(data.data.accessToken, data.data.expiresIn);
      return true;
    }
    return false;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.post("logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.tokenManager.clearTokens();
      window.location.href = "/index.php/AuthController";
    }
  }
}

/**
 * Global API Configuration
 */
const API_CONFIG = {
  baseUrl: window.location.origin, // Adjust this to your backend URL
};

// Initialize global API client
const apiClient = new APIClient();

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { APIClient, TokenManager };
}