/**
 * API Service - Handles all communication with the backend
 * STRICT MODE: No fallbacks, no mock data, hard failures when backend unavailable
 */

import { auth } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get Firebase ID token for authenticated requests
  async getAuthToken() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw new Error('Authentication token expired. Please sign in again.');
    }
  }

  // Generic request method - HARD FAIL if backend unavailable
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token for authenticated requests
    let authHeaders = {};
    try {
      const token = await this.getAuthToken();
      authHeaders = {
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      // Only throw auth errors for protected endpoints
      if (!endpoint.includes('/health')) {
        throw error;
      }
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. You can only access your own data.');
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // STRICT MODE: No fallbacks, throw the error
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('NetworkError')) {
        throw new Error(`Backend server unavailable. Please ensure the server is running on ${this.baseURL.replace('/api', '')}`);
      }
      
      throw error;
    }
  }

  // Emergency endpoints
  async reportEmergency(emergencyData) {
    return this.request('/emergency/report', {
      method: 'POST',
      body: emergencyData
    });
  }

  async cancelEmergency(emergencyId, cancelData) {
    return this.request(`/emergency/cancel/${emergencyId}`, {
      method: 'POST',
      body: cancelData
    });
  }

  async getActiveEmergencies() {
    return this.request('/emergency/active');
  }

  async getEmergencyHistory(userId) {
    return this.request(`/emergency/history/${userId}`);
  }

  async resolveEmergency(emergencyId, resolutionData) {
    return this.request(`/emergency/resolve/${emergencyId}`, {
      method: 'POST',
      body: resolutionData
    });
  }

  // User endpoints
  async createOrUpdateUserProfile(userData) {
    return this.request('/users/profile', {
      method: 'POST',
      body: userData
    });
  }

  async getUserProfile(userId) {
    return this.request(`/users/profile/${userId}`);
  }

  async updateUserPreferences(userId, preferences) {
    return this.request(`/users/preferences/${userId}`, {
      method: 'PATCH',
      body: preferences
    });
  }

  async storeUserLearning(userId, learningData) {
    return this.request(`/users/learning/${userId}`, {
      method: 'POST',
      body: learningData
    });
  }

  async getUserStats(userId) {
    return this.request(`/users/stats/${userId}`);
  }

  // Trusted contacts endpoints
  async addTrustedContact(userId, contactData) {
    return this.request(`/contacts/${userId}`, {
      method: 'POST',
      body: contactData
    });
  }

  async getTrustedContacts(userId) {
    return this.request(`/contacts/${userId}`);
  }

  async updateTrustedContact(userId, contactId, contactData) {
    return this.request(`/contacts/${userId}/${contactId}`, {
      method: 'PUT',
      body: contactData
    });
  }

  async deleteTrustedContact(userId, contactId) {
    return this.request(`/contacts/${userId}/${contactId}`, {
      method: 'DELETE'
    });
  }

  async verifyTrustedContact(userId, contactId, verificationCode) {
    return this.request(`/contacts/${userId}/${contactId}/verify`, {
      method: 'POST',
      body: { verificationCode }
    });
  }

  // Health check (no auth required)
  async healthCheck() {
    return this.request('/health', { method: 'GET' });
  }

  // Emergency contacts endpoints (new dedicated system)
  async addEmergencyContact(contactData) {
    return this.request('/emergency-contacts/add', {
      method: 'POST',
      body: contactData
    });
  }

  async getEmergencyContacts() {
    return this.request('/emergency-contacts/list');
  }
}

export const apiService = new ApiService();
export default apiService;