import { DEFAULT_ROOM_SETTINGS } from '../config/constants.js';

class TokenManager {
  constructor() {
    // Map to store tokens: tokenId -> { token, valid, usesLeft, perks }
    this.tokens = new Map();
    this.initializeTokens();
  }

  /**
   * Initialize with sample tokens (can be extended from database)
   */
  initializeTokens() {
    // Premium token: 2 hour lifespan, 15 min auto-delete, 100 users
    this.tokens.set('PREMIUM-001-XYZ', {
      token: 'PREMIUM-001-XYZ',
      valid: true,
      usesLeft: 5,
      perks: {
        roomLifespanMinutes: 120,
        autoDeleteMinutes: 15,
        maxUsers: 100
      }
    });

    // Extended token: 1 hour lifespan, 5 min auto-delete, 50 users
    this.tokens.set('EXTENDED-002-ABC', {
      token: 'EXTENDED-002-ABC',
      valid: true,
      usesLeft: 3,
      perks: {
        roomLifespanMinutes: 60,
        autoDeleteMinutes: 5,
        maxUsers: 50
      }
    });

    // Standard token: 45 min lifespan, 2 min auto-delete, 20 users
    this.tokens.set('STANDARD-003-DEF', {
      token: 'STANDARD-003-DEF',
      valid: true,
      usesLeft: 10,
      perks: {
        roomLifespanMinutes: 45,
        autoDeleteMinutes: 2,
        maxUsers: 20
      }
    });
  }

  /**
   * Validate token and apply perks
   * @param {string} token - Token to validate
   * @returns {object} Validation result with applied perks or default settings
   */
  validateToken(token, decrement = true) {
    if (!token || token.trim() === '') {
      return {
        valid: false,
        usesLeft: 0,
        perks: { ...DEFAULT_ROOM_SETTINGS }
      };
    }

    const tokenData = this.tokens.get(token.toUpperCase());

    if (!tokenData || !tokenData.valid || tokenData.usesLeft <= 0) {
      return {
        valid: false,
        usesLeft: 0,
        perks: { ...DEFAULT_ROOM_SETTINGS }
      };
    }

    // Decrement uses
    if (decrement) {
      tokenData.usesLeft--;
    }

    return {
      valid: true,
      token: tokenData.token,
      usesLeft: tokenData.usesLeft,
      perks: { ...tokenData.perks }
    };
  }

  /**
   * Get default room settings
   */
  getDefaultSettings() {
    return { ...DEFAULT_ROOM_SETTINGS };
  }

  /**
   * Add a new token (for admin/system use)
   */
  addToken(token, perks, usesLeft = 1) {
    const tokenId = token.toUpperCase();
    this.tokens.set(tokenId, {
      token: tokenId,
      valid: true,
      usesLeft,
      perks
    });
    return tokenId;
  }

  /**
   * Revoke a token
   */
  revokeToken(token) {
    const tokenData = this.tokens.get(token.toUpperCase());
    if (tokenData) {
      tokenData.valid = false;
    }
  }

  /**
   * Get token info (for debugging/admin)
   */
  getTokenInfo(token) {
    return this.tokens.get(token.toUpperCase());
  }
}

export default new TokenManager();
