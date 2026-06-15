import crypto from 'crypto';

/**
 * Generate a unique ID using cryptographically secure random bytes
 */
export const generateId = (prefix = '') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(12);
  let random = '';
  for (let i = 0; i < 12; i++) {
    random += chars[bytes[i] % chars.length];
  }
  return prefix ? `${prefix}${random}` : random;
};

/**
 * Sanitize text input: strip HTML tags and restrict to max length
 */
export const sanitizeContent = (text, maxLength = 2000) => {
  if (typeof text !== 'string') return '';
  // Strip HTML/script tags
  const clean = text.replace(/<[^>]*>/g, '');
  return clean.substring(0, maxLength);
};

/**
 * Generate room URL
 */
export const generateRoomUrl = (roomId, baseUrl = process.env.CLIENT_URL || process.env.APP_URL) => {
  if (!baseUrl || baseUrl === '*') {
    return `/join/${roomId}`;
  }
  const cleanUrl = baseUrl.replace(/\*+/g, '').replace(/\/+$/, '');
  return `${cleanUrl}/join/${roomId}`;
};

/**
 * Validate password
 */
export const validatePassword = (inputPassword, storedPassword) => {
  return inputPassword === storedPassword;
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = () => {
  return Date.now();
};

/**
 * Check if timestamp is expired based on duration
 */
export const isExpired = (createdAt, durationMs) => {
  return Date.now() - createdAt > durationMs;
};
