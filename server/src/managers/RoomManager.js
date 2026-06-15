import { generateId, generateRoomUrl, getCurrentTimestamp } from '../utils/helpers.js';
import { DEFAULT_ROOM_SETTINGS } from '../config/constants.js';
import tokenManager from './TokenManager.js';

class RoomManager {
  constructor() {
    // Map to store rooms: roomId -> room object
    this.rooms = new Map();
    // Map to store room users: roomId -> [users]
    this.roomUsers = new Map();
    // Map to track socket to room/user: socketId -> { roomId, userId }
    this.socketMap = new Map();
    // Map to track pending disconnect timeouts: roomUserId -> { timeoutId, socketId, roomId }
    this.pendingDisconnects = new Map();
  }

  /**
   * Create a new room
   */
  createRoom(hostId, hostDisplayName, token = null, memberLimit = null) {
    const roomId = generateId('ROOM');
    const createdAt = getCurrentTimestamp();

    // Validate token and get perks
    let settings;
    if (token) {
      const tokenValidation = tokenManager.validateToken(token);
      if (tokenValidation.valid) {
        settings = {
          ...tokenValidation.perks
        };
      } else {
        settings = { ...DEFAULT_ROOM_SETTINGS };
      }
    } else {
      settings = { ...DEFAULT_ROOM_SETTINGS };
    }

    // Use the memberLimit if provided
    if (memberLimit) {
      const limitVal = parseInt(memberLimit);
      if (!isNaN(limitVal) && limitVal >= 2 && limitVal <= 1000) {
        if (token) {
          // If a token is provided, clamp by the token's maximum allowed capacity
          settings.maxUsers = Math.min(limitVal, settings.maxUsers);
        } else {
          // If no token is provided, respect the user's limit (up to the free tier limit of 15)
          settings.maxUsers = Math.min(limitVal, 15);
        }
      }
    }

    const hostAccessToken = generateId('HOST');

    const room = {
      roomId,
      hostId,
      hostDisplayName,
      hostAccessToken,
      createdAt,
      roomLifespanMs: settings.roomLifespanMinutes * 60 * 1000,
      autoDeleteMs: settings.autoDeleteMinutes * 60 * 1000,
      maxUsers: settings.maxUsers,
      password: null,
      settings,
      isTerminating: false,
      terminatingAt: null
    };

    this.rooms.set(roomId, room);
    this.roomUsers.set(roomId, []);

    return {
      roomId,
      roomUrl: generateRoomUrl(roomId),
      hostId,
      hostAccessToken,
      createdAt,
      settings: {
        roomLifespanMinutes: settings.roomLifespanMinutes,
        autoDeleteMinutes: settings.autoDeleteMinutes,
        maxUsers: settings.maxUsers
      }
    };
  }

  /**
   * Set password for a room
   */
  setRoomPassword(roomId, password) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.password = password;
      return true;
    }
    return false;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Check if room exists and is active
   */
  isRoomActive(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const createdAt = room.createdAt;
    const roomLifespanMs = room.roomLifespanMs;
    const now = getCurrentTimestamp();

    // Check if room has expired
    if (now - createdAt > roomLifespanMs) {
      return false;
    }

    return true;
  }

  /**
   * Add user to room
   */
  addUserToRoom(roomId, socketId, displayName, roomUserId = null, hostAccessToken = null) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Validate display name
    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return { error: 'INVALID_DISPLAY_NAME' };
    }

    const cleanName = displayName.trim();
    if (cleanName.length > 20) {
      return { error: 'Username is too long (max 20 characters)' };
    }

    const reservedNames = ['host', 'admin', 'moderator', 'system', 'vanta'];
    if (reservedNames.includes(cleanName.toLowerCase())) {
      return { error: 'This username is reserved' };
    }

    const users = this.roomUsers.get(roomId) || [];

    // Check if user is rejoining (session restoration)
    let user = null;
    if (roomUserId) {
      user = users.find(u => u.roomUserId === roomUserId);
    }

    if (user) {
      // Rejoining! Clear any pending disconnect timeouts
      this.clearPendingDisconnect(roomUserId);

      // Clean up old socket registration if it changed
      if (user.socketId && user.socketId !== socketId) {
        this.socketMap.delete(user.socketId);
      }

      // Update user details
      user.socketId = socketId;
      this.socketMap.set(socketId, { roomId, userId: roomUserId });

      // Restore host privileges if they are verified
      const isHost = (roomUserId === room.hostUserId) || (hostAccessToken && hostAccessToken === room.hostAccessToken);
      if (isHost) {
        room.hostId = socketId;
        room.hostUserId = roomUserId;
      }

      console.log(`[RoomManager] Restored session for ${displayName} (ID: ${roomUserId}, Host: ${isHost})`);

      return {
        roomUserId,
        displayName: user.displayName,
        isHost,
        totalUsers: users.length,
        rejoined: true
      };
    }

    // New user joining (check limit)
    if (users.length >= room.maxUsers) {
      return { error: 'ROOM_FULL', maxUsers: room.maxUsers, currentUsers: users.length };
    }

    const actualUserId = roomUserId || generateId('USER');
    const newUser = {
      roomUserId: actualUserId,
      socketId,
      displayName,
      joinedAt: getCurrentTimestamp()
    };

    // If host token matches or this is the creator of the room (socketId === room.hostId)
    const isHost = (socketId === room.hostId) || (hostAccessToken && hostAccessToken === room.hostAccessToken);
    if (isHost) {
      room.hostUserId = actualUserId;
      room.hostId = socketId;
    }

    users.push(newUser);
    this.roomUsers.set(roomId, users);
    this.socketMap.set(socketId, { roomId, userId: actualUserId });

    return {
      roomUserId: actualUserId,
      displayName,
      isHost,
      totalUsers: users.length
    };
  }

  /**
   * Remove user from room
   */
  removeUserFromRoom(roomId, socketId) {
    const users = this.roomUsers.get(roomId) || [];
    const userIndex = users.findIndex(u => u.socketId === socketId);

    if (userIndex !== -1) {
      const user = users[userIndex];
      // Clean up any pending disconnects
      this.clearPendingDisconnect(user.roomUserId);
      
      users.splice(userIndex, 1);
      this.roomUsers.set(roomId, users);
      this.socketMap.delete(socketId);
      return user;
    }
    return null;
  }

  /**
   * Add a pending disconnect grace period
   */
  addPendingDisconnect(roomId, socketId, roomUserId, onExpired) {
    this.clearPendingDisconnect(roomUserId);

    const timeoutId = setTimeout(() => {
      this.pendingDisconnects.delete(roomUserId);
      const user = this.removeUserFromRoom(roomId, socketId);
      if (user && onExpired) {
        onExpired(user);
      }
    }, 45000); // 45-second grace period for page refreshes and network blips

    this.pendingDisconnects.set(roomUserId, { timeoutId, socketId, roomId });
  }

  /**
   * Clear a pending disconnect
   */
  clearPendingDisconnect(roomUserId) {
    const pending = this.pendingDisconnects.get(roomUserId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingDisconnects.delete(roomUserId);
      return true;
    }
    return false;
  }

  /**
   * Check if a user with the given roomUserId is currently in the room
   * (either active or pending disconnect)
   */
  isReturningUser(roomId, roomUserId) {
    if (!roomUserId) return false;
    const users = this.roomUsers.get(roomId) || [];
    if (users.some(u => u.roomUserId === roomUserId)) return true;
    // Also check pending disconnects (user is mid-reconnect)
    if (this.pendingDisconnects.has(roomUserId)) return true;
    return false;
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    const users = this.roomUsers.get(roomId) || [];

    if (!room) return [];

    return users.map(user => ({
      roomUserId: user.roomUserId,
      displayName: user.displayName,
      isHost: user.roomUserId === room.hostUserId,
      joinedAt: user.joinedAt
    }));
  }

  /**
   * Get user count in room
   */
  getRoomUserCount(roomId) {
    const users = this.roomUsers.get(roomId) || [];
    return users.length;
  }

  /**
   * Get socket info
   */
  getSocketInfo(socketId) {
    return this.socketMap.get(socketId);
  }

  /**
   * Get users in room by roomId
   */
  getUsersInRoom(roomId) {
    return this.roomUsers.get(roomId) || [];
  }

  /**
   * Mark room as terminating
   */
  markRoomTerminating(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.isTerminating = true;
      room.terminatingAt = getCurrentTimestamp();
      return true;
    }
    return false;
  }

  /**
   * Delete room
   */
  deleteRoom(roomId) {
    this.rooms.delete(roomId);
    this.roomUsers.delete(roomId);

    // Clean up socket map
    for (const [socketId, info] of this.socketMap.entries()) {
      if (info.roomId === roomId) {
        this.socketMap.delete(socketId);
      }
    }

    // Clean up pending disconnects
    for (const [userId, info] of this.pendingDisconnects.entries()) {
      if (info.roomId === roomId) {
        if (info.timeoutId) {
          clearTimeout(info.timeoutId);
        }
        this.pendingDisconnects.delete(userId);
      }
    }

    return true;
  }

  /**
   * Get all rooms (for debugging)
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get expired rooms
   */
  getExpiredRooms() {
    const now = getCurrentTimestamp();
    const expired = [];

    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.createdAt > room.roomLifespanMs) {
        expired.push(roomId);
      }
    }

    return expired;
  }

  /**
   * Get rooms with no users for a duration
   */
  getEmptyRooms(durationMs) {
    const now = getCurrentTimestamp();
    const empty = [];

    for (const [roomId, room] of this.rooms.entries()) {
      const users = this.roomUsers.get(roomId) || [];
      if (users.length === 0 && now - room.createdAt > durationMs) {
        empty.push(roomId);
      }
    }

    return empty;
  }

  /**
   * Get rooms with single user for a duration
   */
  getSingleUserRooms(durationMs) {
    const now = getCurrentTimestamp();
    const singleUser = [];

    for (const [roomId, room] of this.rooms.entries()) {
      const users = this.roomUsers.get(roomId) || [];
      if (users.length === 1) {
        const user = users[0];
        if (now - user.joinedAt > durationMs) {
          singleUser.push(roomId);
        }
      }
    }

    return singleUser;
  }
}

export default new RoomManager();
