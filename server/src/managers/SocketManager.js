import { validatePassword, sanitizeContent } from '../utils/helpers.js';
import {
  SOCKET_EVENTS,
  SYSTEM_MESSAGE_TYPES,
  ROOM_LIFECYCLE
} from '../config/constants.js';
import roomManager from './RoomManager.js';
import messageManager from './MessageManager.js';
import lifecycleManager from './LifecycleManager.js';
import tokenManager from './TokenManager.js';

// In-memory rate limiting map: key -> { messages: [timestamps], actions: [timestamps] }
const rateLimits = new Map();
const MAX_VOICE_PARTICIPANTS = 8;
const DIAG_PREFIX = '[Diag][SocketManager]';

/**
 * Check rate limit for a key
 * @returns {boolean} true if request is allowed, false if rate limited
 */
const checkRateLimit = (key, limit, windowMs, type = 'actions') => {
  const now = Date.now();
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { messages: [], actions: [] });
  }
  const limits = rateLimits.get(key);
  const activeRecords = limits[type].filter(ts => now - ts < windowMs);
  if (activeRecords.length >= limit) {
    return false;
  }
  activeRecords.push(now);
  limits[type] = activeRecords;
  return true;
};

class SocketManager {
  constructor() {
    this.voiceParticipants = new Map();
  }

  /**
   * Setup all socket event listeners
   */
  setupSocketEvents(io) {
    io.on('connection', (socket) => {
      console.log(`[Socket] User connected: ${socket.id}`);
      console.log(`${DIAG_PREFIX} socket connected`, {
        socketId: socket.id,
        address: socket.handshake.address,
        origin: socket.handshake.headers.origin,
        userAgent: socket.handshake.headers['user-agent']
      });

      // Room events
      socket.on(SOCKET_EVENTS.CREATE_ROOM, (data, callback) =>
        this.handleCreateRoom(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.JOIN_ROOM, (data, callback) =>
        this.handleJoinRoom(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.VERIFY_PASSWORD, (data, callback) =>
        this.handleVerifyPassword(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.MESSAGE_SEND, (data) =>
        this.handleMessageSend(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.GET_PARTICIPANTS, (data, callback) =>
        this.handleGetParticipants(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.TERMINATE_ROOM, (data, callback) =>
        this.handleTerminateRoom(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.TYPING_START, (data) =>
        this.handleTypingStart(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.TYPING_STOP, (data) =>
        this.handleTypingStop(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.RECORDING_START, (data) =>
        this.handleRecordingStart(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.RECORDING_STOP, (data) =>
        this.handleRecordingStop(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) =>
        this.handleLeaveRoom(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.KICK_USER, (data, callback) =>
        this.handleKickUser(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.RECONNECT_ROOM, (data, callback) =>
        this.handleReconnectRoom(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.WEBRTC_OFFER, (data) =>
        this.handleWebRTCOffer(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.WEBRTC_ANSWER, (data) =>
        this.handleWebRTCAnswer(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, (data) =>
        this.handleWebRTCIceCandidate(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.WEBRTC_INIT, (data) =>
        this.handleWebRTCInit(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.VOICE_CALL_JOIN, (data, callback) =>
        this.handleVoiceCallJoin(io, socket, data, callback)
      );

      socket.on(SOCKET_EVENTS.VOICE_CALL_LEAVE, () =>
        this.handleVoiceCallLeave(io, socket)
      );

      socket.on('disconnect', () =>
        this.handleDisconnect(io, socket)
      );
    });
  }

  /**
   * Handle room creation
   */
  handleCreateRoom(io, socket, data, callback) {
    let creationResult = null;
    try {
      const originalCallback = callback;
      callback = (response) => {
        console.log(`${DIAG_PREFIX} create-room callback response`, {
          socketId: socket.id,
          response
        });
        originalCallback(response);
      };
      console.log(`${DIAG_PREFIX} create-room handler start`, {
        socketId: socket.id,
        connected: socket.connected,
        origin: socket.handshake.headers.origin,
        data: {
          ...data,
          password: data?.password ? '[present]' : null,
          token: data?.token ? '[present]' : null
        }
      });
      const { hostDisplayName, token, memberLimit, password } = data;

      // Rate limiting: Max 3 creations per minute per IP
      const clientIp = socket.handshake.address || socket.id;
      if (!checkRateLimit(clientIp, 3, 60000, 'actions')) {
        callback({ error: 'Too many room creations. Please wait.' });
        return;
      }

      if (!hostDisplayName || typeof hostDisplayName !== 'string' || hostDisplayName.trim() === '') {
        callback({ error: 'INVALID_DISPLAY_NAME' });
        return;
      }

      const cleanName = hostDisplayName.trim();
      if (cleanName.length > 20) {
        callback({ error: 'Username is too long (max 20 characters)' });
        return;
      }

      const reservedNames = ['host', 'admin', 'moderator', 'system', 'vanta'];
      if (reservedNames.includes(cleanName.toLowerCase())) {
        callback({ error: 'This username is reserved' });
        return;
      }

      if (password && password.length > 50) {
        callback({ error: 'Password is too long (max 50 characters)' });
        return;
      }

      // Validate token requirement for member limits > 15
      const memberLimitNum = parseInt(memberLimit) || 15;
      if (memberLimitNum > 15) {
        if (!token || token.trim() === '') {
          callback({ error: 'TOKEN_REQUIRED' });
          return;
        }

        // Validate token
        const tokenValidation = tokenManager.validateToken(token, false);
        if (!tokenValidation.valid) {
          callback({ error: 'INVALID_TOKEN' });
          return;
        }
      }

      // Create room
      creationResult = roomManager.createRoom(
        socket.id,
        cleanName,
        token,
        memberLimit
      );

      // Set password if provided
      if (password && password.trim() !== '') {
        roomManager.setRoomPassword(creationResult.roomId, password);
      }

      // Initialize lifecycle management
      lifecycleManager.initializeRoomLifecycle(io, creationResult.roomId);

      // Join the room creator to the room
      const joinResult = roomManager.addUserToRoom(
        creationResult.roomId,
        socket.id,
        hostDisplayName,
        creationResult.hostUserId,
        creationResult.hostAccessToken
      );

      // Join socket to room namespace
      socket.join(creationResult.roomId);

      console.log(
        `[Socket] Room created: ${creationResult.roomId} by ${hostDisplayName}`
      );

      callback({
        roomId: creationResult.roomId,
        roomUrl: creationResult.roomUrl,
        roomUserId: joinResult.roomUserId,
        hostAccessToken: creationResult.hostAccessToken,
        settings: {
          ...creationResult.settings,
          hasPassword: !!password
        }
      });
      console.log(`${DIAG_PREFIX} create-room callback success`, {
        socketId: socket.id,
        roomId: creationResult.roomId,
        roomUserId: joinResult.roomUserId
      });

      // Emit room created event
      io.to(creationResult.roomId).emit(SOCKET_EVENTS.ROOM_JOINED, {
        roomId: creationResult.roomId,
        user: {
          roomUserId: joinResult.roomUserId,
          displayName: hostDisplayName,
          isHost: true
        },
        totalUsers: 1,
        message: `${hostDisplayName} created the room`
      });

      // Broadcast room users updated event
      io.to(creationResult.roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, {
        participants: roomManager.getRoomUsers(creationResult.roomId),
        totalUsers: roomManager.getRoomUserCount(creationResult.roomId)
      });
    } catch (error) {
      console.error(`${DIAG_PREFIX} create-room handler failure`, {
        socketId: socket.id,
        error: error.message,
        stack: error.stack
      });
      console.error('[Socket] Error creating room:', error);
      if (creationResult && creationResult.roomId) {
        try {
          roomManager.deleteRoom(creationResult.roomId);
          console.log(`[Socket] Rolled back and deleted partially created room: ${creationResult.roomId}`);
        } catch (cleanupError) {
          console.error('[Socket] Error cleaning up room after creation failure:', cleanupError);
        }
      }
      callback({ error: 'CREATION_FAILED' });
    }
  }

  /**
   * Handle room joining
   */
  handleJoinRoom(io, socket, data, callback) {
    try {
      const originalCallback = callback;
      callback = (response) => {
        console.log(`${DIAG_PREFIX} join-room callback response`, {
          socketId: socket.id,
          response
        });
        originalCallback(response);
      };
      console.log(`${DIAG_PREFIX} join-room handler start`, {
        socketId: socket.id,
        connected: socket.connected,
        origin: socket.handshake.headers.origin,
        data
      });
      const { roomId, displayName, roomUserId, hostAccessToken } = data;

      // Rate limiting: Max 5 join attempts per 10 seconds per IP
      const clientIp = socket.handshake.address || socket.id;
      if (!checkRateLimit(clientIp, 5, 10000, 'actions')) {
        callback({ error: 'Too many join attempts. Please wait.' });
        return;
      }

      if (!roomId || !displayName || typeof displayName !== 'string' || displayName.trim() === '') {
        callback({ error: 'INVALID_DATA' });
        return;
      }

      const cleanName = displayName.trim();
      if (cleanName.length > 20) {
        callback({ error: 'Username is too long (max 20 characters)' });
        return;
      }

      const reservedNames = ['host', 'admin', 'moderator', 'system', 'vanta'];
      if (reservedNames.includes(cleanName.toLowerCase())) {
        callback({ error: 'This username is reserved' });
        return;
      }

      // Check if room exists
      const room = roomManager.getRoom(roomId);
      if (!room) {
        callback({ error: SOCKET_EVENTS.ROOM_NOT_FOUND });
        return;
      }

      // Check if room is active
      if (!roomManager.isRoomActive(roomId)) {
        callback({ error: SOCKET_EVENTS.ROOM_EXPIRED });
        return;
      }

      // Check if room requires password
      // Skip password gate for returning users (they already verified once)
      const isReturning = roomUserId && roomManager.isReturningUser(roomId, roomUserId);
      if (room.password && !isReturning) {
        callback({ requiresPassword: true });
        return;
      }

      // Get room users before joining
      const participantsBefore = roomManager.getRoomUsers(roomId);
      console.log(`[SyncLog] Room ${roomId} participant list BEFORE join:`, JSON.stringify(participantsBefore));

      // Add user to room
      const joinResult = roomManager.addUserToRoom(roomId, socket.id, cleanName, roomUserId, hostAccessToken);

      if (joinResult.error) {
        callback({ error: joinResult.error, ...joinResult });
        return;
      }

      // Join socket to room
      socket.join(roomId);

      // Emit current voice call participants directly to the joining socket
      socket.emit(SOCKET_EVENTS.VOICE_CALL_USERS, {
        participants: this.getVoiceParticipantList(roomId)
      });

      // Get room messages
      const messages = messageManager.getActiveMessages(roomId);
      const participantsAfter = roomManager.getRoomUsers(roomId);

      console.log(`[SyncLog] Room ${roomId} participant list AFTER join:`, JSON.stringify(participantsAfter));

      console.log(
        `[Socket] ${displayName} joined room ${roomId}. Total users: ${joinResult.totalUsers}`
      );

      const snapshotJoined = {
        roomId,
        roomUserId: joinResult.roomUserId,
        displayName,
        totalUsers: joinResult.totalUsers,
        messages,
        participants: participantsAfter,
        voiceParticipants: this.getVoiceParticipantList(roomId),
        settings: {
          roomLifespanMinutes: room.settings.roomLifespanMinutes,
          autoDeleteMinutes: room.settings.autoDeleteMinutes,
          maxUsers: room.settings.maxUsers,
          hasPassword: !!room.password
        }
      };
      console.log(`[SyncLog] Snapshot sent to joining client:`, JSON.stringify(snapshotJoined));
      callback(snapshotJoined);
      console.log(`${DIAG_PREFIX} join-room callback success`, {
        socketId: socket.id,
        roomId,
        roomUserId: joinResult.roomUserId,
        totalUsers: joinResult.totalUsers,
        requiresPassword: false
      });

      // Notify others (only if they didn't just rejoin in-place)
      if (!joinResult.rejoined) {
        io.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
          type: SYSTEM_MESSAGE_TYPES.USER_JOINED,
          user: {
            roomUserId: joinResult.roomUserId,
            displayName,
            isHost: joinResult.isHost
          },
          totalUsers: joinResult.totalUsers,
          message: `${displayName} joined the room`
        });
      }

      // Broadcast room users updated event
      const snapshotExisting = {
        participants: participantsAfter,
        totalUsers: roomManager.getRoomUserCount(roomId)
      };
      console.log(`[SyncLog] Snapshot sent to existing clients:`, JSON.stringify(snapshotExisting));
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, snapshotExisting);
    } catch (error) {
      console.error(`${DIAG_PREFIX} join-room handler failure`, {
        socketId: socket.id,
        error: error.message,
        stack: error.stack
      });
      console.error('[Socket] Error joining room:', error);
      callback({ error: 'JOIN_FAILED' });
    }
  }

  /**
   * Handle password verification
   */
  handleVerifyPassword(io, socket, data, callback) {
    try {
      const { roomId, displayName, password, roomUserId, hostAccessToken } = data;

      // Rate limiting: Max 5 attempts per 10 seconds per IP
      const clientIp = socket.handshake.address || socket.id;
      if (!checkRateLimit(clientIp, 5, 10000, 'actions')) {
        callback({ error: 'Too many join attempts. Please wait.' });
        return;
      }

      if (!roomId || !displayName || typeof displayName !== 'string') {
        callback({ error: 'INVALID_DATA' });
        return;
      }

      const cleanName = displayName.trim();
      if (cleanName.length > 20) {
        callback({ error: 'Username is too long (max 20 characters)' });
        return;
      }

      if (['host', 'admin', 'moderator', 'system', 'vanta'].includes(cleanName.toLowerCase())) {
        callback({ error: 'This username is reserved' });
        return;
      }

      if (password && password.length > 50) {
        callback({ error: 'Password is too long (max 50 characters)' });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        callback({ error: SOCKET_EVENTS.ROOM_NOT_FOUND });
        return;
      }

      // Verify password (skip password check if this is a host/user rejoining)
      const isRejoining = roomUserId && roomManager.getRoomUsers(roomId).some(u => u.roomUserId === roomUserId);
      if (!isRejoining && room.password && !validatePassword(password, room.password)) {
        callback({ error: 'PASSWORD_INVALID' });
        return;
      }

      // Get room users before joining
      const participantsBefore = roomManager.getRoomUsers(roomId);
      console.log(`[SyncLog] Room ${roomId} participant list BEFORE join:`, JSON.stringify(participantsBefore));

      // Password correct (or rejoining), add user to room
      const joinResult = roomManager.addUserToRoom(roomId, socket.id, cleanName, roomUserId, hostAccessToken);

      if (joinResult.error) {
        callback({ error: joinResult.error, ...joinResult });
        return;
      }

      // Join socket to room
      socket.join(roomId);

      // Emit current voice call participants directly to the joining socket
      socket.emit(SOCKET_EVENTS.VOICE_CALL_USERS, {
        participants: this.getVoiceParticipantList(roomId)
      });

      const messages = messageManager.getActiveMessages(roomId);
      const participantsAfter = roomManager.getRoomUsers(roomId);

      console.log(`[SyncLog] Room ${roomId} participant list AFTER join:`, JSON.stringify(participantsAfter));

      console.log(
        `[Socket] ${displayName} joined password-protected room ${roomId}`
      );

      const snapshotJoined = {
        roomId,
        roomUserId: joinResult.roomUserId,
        displayName,
        totalUsers: joinResult.totalUsers,
        messages,
        participants: participantsAfter,
        voiceParticipants: this.getVoiceParticipantList(roomId),
        settings: {
          roomLifespanMinutes: room.settings.roomLifespanMinutes,
          autoDeleteMinutes: room.settings.autoDeleteMinutes,
          maxUsers: room.settings.maxUsers,
          hasPassword: !!room.password
        }
      };
      console.log(`[SyncLog] Snapshot sent to joining client:`, JSON.stringify(snapshotJoined));
      callback(snapshotJoined);

      // Notify others (only if they didn't just rejoin in-place)
      if (!joinResult.rejoined) {
        io.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
          type: SYSTEM_MESSAGE_TYPES.USER_JOINED,
          user: {
            roomUserId: joinResult.roomUserId,
            displayName,
            isHost: joinResult.isHost
          },
          totalUsers: joinResult.totalUsers,
          message: `${displayName} joined the room`
        });
      }

      // Broadcast room users updated event
      const snapshotExisting = {
        participants: participantsAfter,
        totalUsers: roomManager.getRoomUserCount(roomId)
      };
      console.log(`[SyncLog] Snapshot sent to existing clients:`, JSON.stringify(snapshotExisting));
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, snapshotExisting);
    } catch (error) {
      console.error('[Socket] Error verifying password:', error);
      callback({ error: 'PASSWORD_VERIFICATION_FAILED' });
    }
  }


  /**
   * Handle message sending
   */
  handleMessageSend(io, socket, data) {
    try {
      const { roomId, content, type, mediaUrl, duration, replyTo } = data;
      const isVoice = type === 'voice';

      if (!roomId) return;
      if (!isVoice && (!content || content.trim() === '')) {
        return;
      }
      if (isVoice && (!mediaUrl || mediaUrl.trim() === '')) {
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
          error: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Verify membership
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo || socketInfo.roomId !== roomId) {
        socket.emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
          error: 'UNAUTHORIZED_MEMBER'
        });
        return;
      }

      // Rate limiting: Max 5 messages per 2 seconds per socket
      if (!checkRateLimit(socket.id, 5, 2000, 'messages')) {
        socket.emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'You are sending messages too fast.'
        });
        return;
      }

      // Enforce server-side user details
      const senderUserId = socketInfo.userId;
      const senderDisplayName = socketInfo.displayName;
      const isHost = senderUserId === room.hostUserId;

      // Sanitize and limit message content
      let sanitizedContent = '';
      if (!isVoice) {
        sanitizedContent = sanitizeContent(content, 2000);
        if (!sanitizedContent || sanitizedContent.trim() === '') {
          return;
        }
      } else {
        sanitizedContent = '[Voice Message]';
      }

      // Create message
      const message = messageManager.createMessage(
        roomId,
        senderUserId,
        senderDisplayName,
        sanitizedContent,
        room.autoDeleteMs,
        isHost,
        type || 'text',
        mediaUrl || null,
        duration || null,
        replyTo || null
      );

      console.log(`[Socket] Message in room ${roomId}: ${message.messageId} (Type: ${message.type})`);

      // Broadcast message to room
      io.to(roomId).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
        messageId: message.messageId,
        roomId: message.roomId,
        senderId: message.senderId,
        senderDisplayName: message.senderDisplayName,
        content: message.content,
        type: message.type,
        mediaUrl: message.mediaUrl,
        duration: message.duration,
        createdAt: message.createdAt,
        expiresAt: message.expiresAt,
        isHost: message.isHost,
        replyTo: message.replyTo
      });
    } catch (error) {
      console.error('[Socket] Error sending message:', error);
    }
  }

  /**
   * Handle get participants
   */
  handleGetParticipants(io, socket, data, callback) {
    try {
      const { roomId } = data;

      if (!roomId) {
        callback({ error: 'INVALID_ROOM_ID' });
        return;
      }

      // Verify membership
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo || socketInfo.roomId !== roomId) {
        callback({ error: 'UNAUTHORIZED' });
        return;
      }

      const participants = roomManager.getRoomUsers(roomId);
      callback({ participants });
    } catch (error) {
      console.error('[Socket] Error getting participants:', error);
      callback({ error: 'GET_PARTICIPANTS_FAILED' });
    }
  }

  /**
   * Handle room termination
   */
  handleTerminateRoom(io, socket, data, callback) {
    try {
      const { roomId } = data;

      if (!roomId) {
        callback({ error: 'INVALID_ROOM_ID' });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        callback({ error: 'ROOM_NOT_FOUND' });
        return;
      }

      // Check if user is host
      const { hostAccessToken } = data;
      const socketInfo = roomManager.getSocketInfo(socket.id);
      const isHost = (socketInfo && socketInfo.userId === room.hostUserId) ||
        (hostAccessToken && hostAccessToken === room.hostAccessToken);
      if (!isHost) {
        callback({ error: 'NOT_HOST' });
        return;
      }

      // Mark as terminating
      roomManager.markRoomTerminating(roomId);

      console.log(`[Socket] Room ${roomId} termination initiated by host`);

      // Graceful termination
      lifecycleManager.gracefulTermination(io, roomId);

      callback({ success: true });
    } catch (error) {
      console.error('[Socket] Error terminating room:', error);
      callback({ error: 'TERMINATION_FAILED' });
    }
  }

  /**
   * Handle kicking a user
   */
  handleKickUser(io, socket, data, callback) {
    try {
      const { roomId, targetRoomUserId, hostAccessToken } = data;

      if (!roomId || !targetRoomUserId) {
        if (callback) callback({ error: 'INVALID_DATA' });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        if (callback) callback({ error: 'ROOM_NOT_FOUND' });
        return;
      }

      // Check if requester is host
      const socketInfo = roomManager.getSocketInfo(socket.id);
      const isHost = (socketInfo && socketInfo.userId === room.hostUserId) ||
        (hostAccessToken && hostAccessToken === room.hostAccessToken);

      console.log(`[KickLog] Host attempting remove:`, {
        roomId,
        hostUserId: room.hostUserId,
        targetUserId: targetRoomUserId,
        socketInfo,
        authorizationResult: isHost
      });

      if (!isHost) {
        if (callback) callback({ error: 'NOT_HOST' });
        return;
      }

      const users = roomManager.getUsersInRoom(roomId);
      const targetUser = users.find(u => u.roomUserId === targetRoomUserId);

      if (!targetUser) {
        if (callback) callback({ error: 'USER_NOT_FOUND' });
        return;
      }

      const targetSocketId = targetUser.socketId;
      const removedUser = roomManager.removeUserFromRoom(roomId, targetSocketId);

      if (removedUser) {
        this.removeVoiceParticipant(io, roomId, removedUser.roomUserId);

        // Disconnect/leave room for the kicked socket
        io.to(targetSocketId).emit(SOCKET_EVENTS.KICKED_FROM_ROOM, { roomId });
        io.in(targetSocketId).socketsLeave(roomId);

        console.log(`[Socket] Host kicked user ${removedUser.displayName} (ID: ${removedUser.roomUserId}) from room ${roomId}`);

        // Notify others
        io.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
          type: SYSTEM_MESSAGE_TYPES.USER_LEFT,
          user: {
            roomUserId: removedUser.roomUserId,
            displayName: removedUser.displayName
          },
          totalUsers: roomManager.getRoomUserCount(roomId),
          message: `${removedUser.displayName} left the room`
        });

        // Broadcast room users updated event
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, {
          participants: roomManager.getRoomUsers(roomId),
          totalUsers: roomManager.getRoomUserCount(roomId)
        });

        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ error: 'KICK_FAILED' });
      }
    } catch (error) {
      console.error('[Socket] Error kicking user:', error);
      if (callback) callback({ error: 'SERVER_ERROR' });
    }
  }

  /**
   * Handle typing start
   */
  handleTypingStart(io, socket, data) {
    const { roomId } = data;
    if (!roomId) return;

    const socketInfo = roomManager.getSocketInfo(socket.id);
    if (!socketInfo || socketInfo.roomId !== roomId) return;

    io.to(roomId).emit(SOCKET_EVENTS.TYPING_START, {
      displayName: socketInfo.displayName
    });
  }

  handleTypingStop(io, socket, data) {
    const { roomId } = data;
    if (!roomId) return;

    const socketInfo = roomManager.getSocketInfo(socket.id);
    if (!socketInfo || socketInfo.roomId !== roomId) return;

    io.to(roomId).emit(SOCKET_EVENTS.TYPING_STOP, {
      displayName: socketInfo.displayName
    });
  }

  handleRecordingStart(io, socket, data) {
    const { roomId } = data;
    if (!roomId) return;

    const socketInfo = roomManager.getSocketInfo(socket.id);
    if (!socketInfo || socketInfo.roomId !== roomId) return;

    io.to(roomId).emit(SOCKET_EVENTS.RECORDING_START, {
      displayName: socketInfo.displayName
    });
  }

  handleRecordingStop(io, socket, data) {
    const { roomId } = data;
    if (!roomId) return;

    const socketInfo = roomManager.getSocketInfo(socket.id);
    if (!socketInfo || socketInfo.roomId !== roomId) return;

    io.to(roomId).emit(SOCKET_EVENTS.RECORDING_STOP, {
      displayName: socketInfo.displayName
    });
  }

  /**
   * Handle leave room
   */
  handleLeaveRoom(io, socket, data) {
    try {
      const { roomId } = data;

      if (!roomId) return;

      const user = roomManager.removeUserFromRoom(roomId, socket.id);
      if (user) {
        this.removeVoiceParticipant(io, roomId, user.roomUserId);
        socket.leave(roomId);

        console.log(
          `[Socket] ${user.displayName} left room ${roomId}`
        );

        // Notify others
        io.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
          type: SYSTEM_MESSAGE_TYPES.USER_LEFT,
          user: {
            roomUserId: user.roomUserId,
            displayName: user.displayName
          },
          totalUsers: roomManager.getRoomUserCount(roomId),
          message: `${user.displayName} left the room`
        });

        // Broadcast room users updated event
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, {
          participants: roomManager.getRoomUsers(roomId),
          totalUsers: roomManager.getRoomUserCount(roomId)
        });
      }
    } catch (error) {
      console.error('[Socket] Error leaving room:', error);
    }
  }

  /**
   * Handle reconnect-room (mid-session Socket.IO reconnect)
   */
  handleReconnectRoom(io, socket, data, callback) {
    try {
      const { roomId, roomUserId, hostAccessToken, displayName } = data;

      if (!roomId || !roomUserId) {
        callback({ error: 'INVALID_DATA' });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        callback({ error: 'ROOM_NOT_FOUND' });
        return;
      }

      if (!roomManager.isRoomActive(roomId)) {
        callback({ error: 'ROOM_EXPIRED' });
        return;
      }

      // Check if user is actually a member of this room
      if (!roomManager.isReturningUser(roomId, roomUserId)) {
        callback({ error: 'NOT_A_MEMBER' });
        return;
      }

      // Get room users before joining
      const participantsBefore = roomManager.getRoomUsers(roomId);
      console.log(`[SyncLog] Room ${roomId} participant list BEFORE join:`, JSON.stringify(participantsBefore));

      // Re-attach socket to the existing user record
      const joinResult = roomManager.addUserToRoom(roomId, socket.id, displayName || 'User', roomUserId, hostAccessToken);

      if (joinResult.error) {
        callback({ error: joinResult.error });
        return;
      }

      // Re-join socket to room namespace
      socket.join(roomId);

      // Emit current voice call participants directly to the reconnecting socket
      socket.emit(SOCKET_EVENTS.VOICE_CALL_USERS, {
        participants: this.getVoiceParticipantList(roomId)
      });

      // Get current room state
      const messages = messageManager.getActiveMessages(roomId);
      const participantsAfter = roomManager.getRoomUsers(roomId);

      console.log(`[SyncLog] Room ${roomId} participant list AFTER join:`, JSON.stringify(participantsAfter));

      console.log(`[Socket] Reconnected ${displayName || roomUserId} to room ${roomId} (Host: ${joinResult.isHost})`);

      const snapshotJoined = {
        roomId,
        roomUserId: joinResult.roomUserId,
        displayName: joinResult.displayName,
        isHost: joinResult.isHost,
        totalUsers: joinResult.totalUsers,
        messages,
        participants: participantsAfter,
        voiceParticipants: this.getVoiceParticipantList(roomId),
        settings: {
          roomLifespanMinutes: room.settings.roomLifespanMinutes,
          autoDeleteMinutes: room.settings.autoDeleteMinutes,
          maxUsers: room.settings.maxUsers,
          hasPassword: !!room.password
        },
        reconnected: true
      };
      console.log(`[SyncLog] Snapshot sent to joining client:`, JSON.stringify(snapshotJoined));
      callback(snapshotJoined);

      // Broadcast updated participant list (socket ID changed)
      const snapshotExisting = {
        participants: participantsAfter,
        totalUsers: roomManager.getRoomUserCount(roomId)
      };
      console.log(`[SyncLog] Snapshot sent to existing clients:`, JSON.stringify(snapshotExisting));
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, snapshotExisting);
    } catch (error) {
      console.error('[Socket] Error handling reconnect:', error);
      callback({ error: 'RECONNECT_FAILED' });
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(io, socket) {
    try {
      const socketInfo = roomManager.getSocketInfo(socket.id);

      if (socketInfo) {
        const { roomId, userId: roomUserId } = socketInfo;
        this.removeVoiceParticipant(io, roomId, roomUserId);

        console.log(`[Socket] User ${roomUserId} disconnected temporarily from room ${roomId}. Starting grace period.`);

        roomManager.addPendingDisconnect(roomId, socket.id, roomUserId, (user) => {
          console.log(`[Socket] Disconnect grace period expired for ${user.displayName} (ID: ${user.roomUserId}) in room ${roomId}`);

          // Notify others
          io.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
            type: SYSTEM_MESSAGE_TYPES.USER_LEFT,
            user: {
              roomUserId: user.roomUserId,
              displayName: user.displayName
            },
            totalUsers: roomManager.getRoomUserCount(roomId),
            message: `${user.displayName} left the room`
          });

          // Broadcast room users updated event
          io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, {
            participants: roomManager.getRoomUsers(roomId),
            totalUsers: roomManager.getRoomUserCount(roomId)
          });
        });
      }

      console.log(`[Socket] User socket disconnected: ${socket.id}`);
    } catch (error) {
      console.error('[Socket] Error handling disconnect:', error);
    }
  }

  /**
   * Handle WebRTC Offer signaling relay
   */
  handleWebRTCOffer(io, socket, data) {
    try {
      const { targetRoomUserId, offer, context } = data;
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo) return;
      const { roomId, userId: senderRoomUserId } = socketInfo;

      const roomUsers = roomManager.getUsersInRoom(roomId);
      const targetUser = roomUsers.find(u => u.roomUserId === targetRoomUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit(SOCKET_EVENTS.WEBRTC_OFFER, {
          senderRoomUserId,
          offer,
          context
        });
      }
    } catch (error) {
      console.error('[Socket] Error in webrtc-offer:', error);
    }
  }

  /**
   * Handle WebRTC Answer signaling relay
   */
  handleWebRTCAnswer(io, socket, data) {
    try {
      const { targetRoomUserId, answer, context } = data;
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo) return;
      const { roomId, userId: senderRoomUserId } = socketInfo;

      const roomUsers = roomManager.getUsersInRoom(roomId);
      const targetUser = roomUsers.find(u => u.roomUserId === targetRoomUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit(SOCKET_EVENTS.WEBRTC_ANSWER, {
          senderRoomUserId,
          answer,
          context
        });
      }
    } catch (error) {
      console.error('[Socket] Error in webrtc-answer:', error);
    }
  }

  /**
   * Handle WebRTC ICE Candidate signaling relay
   */
  handleWebRTCIceCandidate(io, socket, data) {
    try {
      const { targetRoomUserId, candidate, context } = data;
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo) return;
      const { roomId, userId: senderRoomUserId } = socketInfo;

      const roomUsers = roomManager.getUsersInRoom(roomId);
      const targetUser = roomUsers.find(u => u.roomUserId === targetRoomUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
          senderRoomUserId,
          candidate,
          context
        });
      }
    } catch (error) {
      console.error('[Socket] Error in webrtc-ice-candidate:', error);
    }
  }

  /**
   * Handle WebRTC Init signal broadcast
   */
  handleWebRTCInit(io, socket, data = {}) {
    try {
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo) return;
      const { roomId, userId: roomUserId } = socketInfo;
      const { context } = data || {};

      console.log(`[Socket] WebRTC Init from ${roomUserId} in room ${roomId}`);
      // Broadcast to other sockets in the room
      socket.to(roomId).emit(SOCKET_EVENTS.WEBRTC_INIT, {
        roomUserId,
        context
      });
    } catch (error) {
      console.error('[Socket] Error in webrtc-init:', error);
    }
  }

  getVoiceRoom(roomId) {
    if (!this.voiceParticipants.has(roomId)) {
      this.voiceParticipants.set(roomId, new Map());
    }
    return this.voiceParticipants.get(roomId);
  }

  getVoiceParticipantList(roomId) {
    return Array.from(this.getVoiceRoom(roomId).values());
  }

  removeVoiceParticipant(io, roomId, roomUserId) {
    const voiceRoom = this.voiceParticipants.get(roomId);
    if (!voiceRoom || !voiceRoom.has(roomUserId)) return;

    const participant = voiceRoom.get(roomUserId);
    voiceRoom.delete(roomUserId);

    const participants = Array.from(voiceRoom.values());

    io.to(roomId).emit(SOCKET_EVENTS.VOICE_CALL_USER_LEFT, {
      roomUserId,
      displayName: participant.displayName,
      participants
    });

    if (voiceRoom.size === 0) {
      this.voiceParticipants.delete(roomId);
    }
  }

  handleVoiceCallJoin(io, socket, data = {}, callback) {
    try {
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo) {
        if (callback) callback({ error: 'UNAUTHORIZED_MEMBER' });
        return;
      }

      const { roomId, userId: roomUserId, displayName } = socketInfo;
      const room = roomManager.getRoom(roomId);
      if (!room || !roomManager.isRoomActive(roomId)) {
        if (callback) callback({ error: 'ROOM_NOT_FOUND' });
        return;
      }

      const voiceRoom = this.getVoiceRoom(roomId);
      const existing = voiceRoom.get(roomUserId);
      if (!existing && voiceRoom.size >= MAX_VOICE_PARTICIPANTS) {
        if (callback) callback({ error: 'VOICE_CALL_FULL', maxParticipants: MAX_VOICE_PARTICIPANTS });
        return;
      }

      const participant = {
        roomUserId,
        displayName,
        isMuted: !!data.isMuted,
        isListenerOnly: !!data.isListenerOnly
      };

      voiceRoom.set(roomUserId, participant);

      const participants = this.getVoiceParticipantList(roomId);
      if (callback) {
        callback({
          success: true,
          participant,
          participants,
          maxParticipants: MAX_VOICE_PARTICIPANTS
        });
      }

      if (!existing) {
        socket.to(roomId).emit(SOCKET_EVENTS.VOICE_CALL_USER_JOINED, {
          participant,
          participants
        });
      } else {
        io.to(roomId).emit(SOCKET_EVENTS.VOICE_CALL_USERS, {
          participants
        });
      }
    } catch (error) {
      console.error('[Socket] Error joining voice call:', error);
      if (callback) callback({ error: 'VOICE_JOIN_FAILED' });
    }
  }

  handleVoiceCallLeave(io, socket) {
    try {
      const socketInfo = roomManager.getSocketInfo(socket.id);
      if (!socketInfo) return;
      this.removeVoiceParticipant(io, socketInfo.roomId, socketInfo.userId);
    } catch (error) {
      console.error('[Socket] Error leaving voice call:', error);
    }
  }
}

export default new SocketManager();
