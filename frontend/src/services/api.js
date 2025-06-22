// API Service for PublicPooper Backend - Development Configuration
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://air.local:8000'; // SSR fallback
  
  if (process.env.NODE_ENV === 'production') {
    return `https://${window.location.host}`;
  }
  
  // Development: Use air.local backend
  return 'http://air.local:8000';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('API Service initialized with base URL:', this.baseUrl);
  }

  // Helper method for API calls with enhanced CORS handling
  async apiCall(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      mode: 'cors', // Enable CORS
      credentials: 'omit', // Don't send credentials for CORS
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Request-Method': options.method || 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Accept',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check if it's a CORS preflight response
      if (response.status === 0 || response.type === 'opaque') {
        throw new Error('CORS_ERROR');
      }
      
      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 404) {
          throw new Error(`Resource not found: ${endpoint}`);
        } else if (response.status === 403) {
          throw new Error('Access forbidden - check API permissions');
        } else if (response.status === 400) {
          // Try to get the error message from response body
          let errorMessage = 'Bad Request';
          try {
            const errorBody = await response.text();
            console.error('400 Error details:', errorBody);
            errorMessage = errorBody || 'Bad Request';
          } catch (e) {
            console.error('Could not read error response body');
          }
          throw new Error(`Validation error: ${errorMessage}`);
        } else if (response.status === 500) {
          throw new Error('Server error - backend may be down');
        }
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API Call Failed: ${config.method || 'GET'} ${url}`, error);
      
      // Enhanced error handling for SSL/HTTPS connection issues
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('🔴 Connection failed - Backend server issues:');
        console.error('  1. Backend server not running');
        console.error('  2. SSL certificate invalid/missing (HTTPS required)');
        console.error('  3. Network connectivity problems');
        console.error('  4. CORS configuration issues');
        console.error(`  🌐 Attempted URL: ${url}`);
        console.error('  💡 For development: Ensure backend supports HTTPS or use self-signed certificates');
        
        throw new Error('BACKEND_ERROR: Cannot connect to server. Please ensure the backend is running with HTTPS/SSL support.');
      }
      
      // Enhanced CORS error handling
      if (error.name === 'TypeError' && 
          (error.message.includes('Network request failed') ||
           error.message.includes('CORS'))) {
        throw new Error('CORS_ERROR: Cannot connect to API server. The server may not have CORS enabled or may be down. Please ensure the backend server is running with HTTPS/SSL support and proper CORS configuration.');
      }
      
      if (error.message === 'CORS_ERROR') {
        throw new Error('CORS_ERROR: Cross-origin request blocked. Please ensure the backend server has Access-Control-Allow-Origin headers configured.');
      }
      
      throw error;
    }
  }

  // User Management
  async createUser(userData) {
    console.log('Creating user with data:', userData);
    console.log('JSON payload:', JSON.stringify(userData));
    return this.apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginByUsername(username) {
    console.log('Attempting to login with username:', username);
    try {
      // Use the backend login endpoint
      const response = await this.apiCall('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username: username }),
      });
      console.log('Login successful:', response);
      return response;
    } catch (error) {
      console.log('Full error details:', error);
      if (error.message.includes('Resource not found') || error.message.includes('User not found')) {
        console.log('User not found with this username');
        throw new Error('USER_NOT_FOUND: No user found with this username. Please create a new account or check your username.');
      }
      console.log('Login failed:', error.message);
      throw error;
    }
  }

  async getUser(uid) {
    return this.apiCall(`/users/${uid}`);
  }

  // Room Management
  async joinRoom(roomIdentifier, uid, roomData) {
    // roomIdentifier can be either room name (for new rooms) or room ID (for existing rooms)
    return this.apiCall(`/rooms/${roomIdentifier}/join/${uid}`, {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async leaveRoom(rid, uid) {
    try {
      return this.apiCall(`/rooms/${rid}/leave/${uid}`, {
        method: 'POST',
      });
    } catch (error) {
      // Leave room failures are often not critical - the user is leaving anyway
      if (error.message.includes('Resource not found')) {
        console.warn('Leave room endpoint not found - this may be expected if the backend handles disconnection automatically');
        return { success: false, reason: 'endpoint_not_found' };
      }
      throw error; // Re-throw other errors
    }
  }

  async getRoomDetails(rid) {
    return this.apiCall(`/rooms/${rid}`);
  }

  async getRoomUsers(rid) {
    return this.apiCall(`/rooms/${rid}/users`);
  }

  async getConnectedUsers(rid) {
    return this.apiCall(`/rooms/${rid}/connected-users`);
  }

  // Get all rooms from backend
  async getAllRooms() {
    return this.apiCall('/rooms');
  }

  // Get comprehensive room info including users and recent messages
  async getRoomInfo(rid) {
    try {
      const [roomDetails, users, chatHistory] = await Promise.all([
        this.getRoomDetails(rid),
        this.getConnectedUsers(rid).catch(() => []),
        this.getChatHistory(rid).catch(() => [])
      ]);
      
      return {
        ...roomDetails,
        connectedUsers: users,
        recentMessages: chatHistory.slice(-10), // Last 10 messages
        userCount: users.length,
        hasActivity: chatHistory.length > 0
      };
    } catch (error) {
      console.error(`Failed to get room info for ${rid}:`, error);
      return null;
    }
  }

  // Helper method to get room by ID (if it exists)
  async getRoomById(roomId) {
    try {
      // Try to get room details using the room ID
      return await this.getRoomDetails(roomId);
    } catch (error) {
      // If room doesn't exist with that ID, return null
      return null;
    }
  }

  // Helper method to get room by name (searches through all rooms)
  async getRoomByName(roomName) {
    try {
      // Get all rooms and find by name
      const allRooms = await this.getAllRooms();
      return allRooms.find(room => room.rname === roomName) || null;
    } catch (error) {
      // If can't fetch rooms, return null
      return null;
    }
  }

  // Get connected users with fallback for room name vs ID
  async getConnectedUsersSafe(roomIdentifier) {
    try {
      // First try with the room identifier directly
      return await this.getConnectedUsers(roomIdentifier);
    } catch (error) {
      // If that fails, try to get room details first to get the real rid
      try {
        const roomDetails = await this.getRoomByName(roomIdentifier);
        if (roomDetails && roomDetails.rid) {
          return await this.getConnectedUsers(roomDetails.rid);
        }
      } catch (innerError) {
        console.log(`Could not fetch connected users for ${roomIdentifier}:`, innerError);
      }
      // Return empty array as fallback
      return [];
    }
  }

  // Chat System
  async sendChatMessage(rid, uid, messageData) {
    return this.apiCall(`/rooms/${rid}/chat/${uid}`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getChatHistory(rid) {
    return this.apiCall(`/rooms/${rid}/chat`);
  }

  // Betting System (Competitive rooms only)
  async placeBet(rid, uid, betData) {
    return this.apiCall(`/rooms/${rid}/bet/${uid}`, {
      method: 'POST',
      body: JSON.stringify(betData),
    });
  }

  async getRoomBets(rid) {
    return this.apiCall(`/rooms/${rid}/bets`);
  }

  async getUserBets(uid) {
    return this.apiCall(`/users/${uid}/bets`);
  }

  // Emoji Management
  async getEmojis(uid = null) {
    const endpoint = uid ? `/emojis?uid=${uid}` : '/emojis';
    return this.apiCall(endpoint);
  }

  async uploadEmoji(uid, file, name, isPremium = false) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/emojis/upload/${uid}?name=${name}&isPremium=${isPremium}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
        body: formData,
      });
      
      // Check if it's a CORS preflight response
      if (response.status === 0 || response.type === 'opaque') {
        throw new Error('CORS_ERROR');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Emoji upload failed:', error);
      
      // Enhanced CORS error handling
      if (error.name === 'TypeError' && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('Network request failed') ||
           error.message.includes('CORS'))) {
        throw new Error('CORS_ERROR: Cannot connect to API server for emoji upload. Please ensure the backend server is running with HTTPS/SSL support and proper CORS configuration.');
      }
      
      if (error.message === 'CORS_ERROR') {
        throw new Error('CORS_ERROR: Cross-origin request blocked during emoji upload. Please ensure the backend server has Access-Control-Allow-Origin headers configured.');
      }
      
      throw error;
    }
  }

  async deleteEmoji(eid, uid) {
    return this.apiCall(`/emojis/${eid}/${uid}`, {
      method: 'DELETE',
    });
  }

  // WebSocket connection helper
  createWebSocket(roomId, userId) {
    const wsHost = process.env.NODE_ENV === 'production' 
      ? window.location.host 
      : 'air.local:8000';
    const wsProtocol = process.env.NODE_ENV === 'production' ? 'ws' : 'ws';
    const wsUrl = `${wsProtocol}://${wsHost}/ws/${roomId}/${userId}`;
    console.log('Creating WebSocket connection to:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      return ws;
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
      throw new Error('WebSocket connection not available');
    }
  }

  // Helper to get emoji URL
  getEmojiUrl(filename) {
    return `${this.baseUrl}/emojis/${filename}`;
  }
}

export default new ApiService();
