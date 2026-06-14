import { validatePassword } from '../utils/helpers.js';
import {
  SOCKET_EVENTS,
  SYSTEM_MESSAGE_TYPES,
  ROOM_LIFECYCLE
} from '../config/constants.js';
import roomManager from './RoomManager.js';
import messageManager from './MessageManager.js';
import lifecycleManager from './LifecycleManager.js';
import tokenManager from './TokenManager.js';

class SocketManager {
  /**
   * Setup all socket event listeners
   */
  setupSocketEvents(io) {
    io.on('connection', (socket) => {
      console.log(`[Socket] User connected: ${socket.id}`);

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

      socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) =>
        this.handleLeaveRoom(io, socket, data)
      );

      socket.on(SOCKET_EVENTS.KICK_USER, (data, callback) =>
        this.handleKickUser(io, socket, data, callback)
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
    try {
      const { hostDisplayName, token, memberLimit, password } = data;

      if (!hostDisplayName || hostDisplayName.trim() === '') {
        callback({ error: 'INVALID_DISPLAY_NAME' });
        return;
      }

      // Validate token requirement for member limits > 5
      const memberLimitNum = parseInt(memberLimit) || 5;
      if (memberLimitNum > 5) {
        if (!token || token.trim() === '') {
          callback({ error: 'TOKEN_REQUIRED' });
          return;
        }

        // Validate token
        const tokenValidation = tokenManager.validateToken(token);
        if (!tokenValidation.valid) {
          callback({ error: 'INVALID_TOKEN' });
          return;
        }
      }

      // Create room
      const creationResult = roomManager.createRoom(
        socket.id,
        hostDisplayName,
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
        null,
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
      console.error('[Socket] Error creating room:', error);
      callback({ error: 'CREATION_FAILED' });
    }
  }

  /**
   * Handle room joining
   */
  handleJoinRoom(io, socket, data, callback) {
    try {
      const { roomId, displayName, roomUserId, hostAccessToken } = data;

      if (!roomId || !displayName || displayName.trim() === '') {
        callback({ error: 'INVALID_DATA' });
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
      if (room.password) {
        callback({ requiresPassword: true });
        return;
      }

      // Add user to room
      const joinResult = roomManager.addUserToRoom(roomId, socket.id, displayName, roomUserId, hostAccessToken);

      if (joinResult.error) {
        callback({ error: joinResult.error, ...joinResult });
        return;
      }

      // Join socket to room
      socket.join(roomId);

      // Get room messages
      const messages = messageManager.getActiveMessages(roomId);
      const participants = roomManager.getRoomUsers(roomId);

      console.log(
        `[Socket] ${displayName} joined room ${roomId}. Total users: ${joinResult.totalUsers}`
      );

      callback({
        roomId,
        roomUserId: joinResult.roomUserId,
        displayName,
        totalUsers: joinResult.totalUsers,
        messages,
        participants,
        settings: {
          roomLifespanMinutes: room.settings.roomLifespanMinutes,
          autoDeleteMinutes: room.settings.autoDeleteMinutes,
          maxUsers: room.settings.maxUsers,
          hasPassword: !!room.password
        }
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
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, {
        participants: roomManager.getRoomUsers(roomId),
        totalUsers: roomManager.getRoomUserCount(roomId)
      });
    } catch (error) {
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

      if (!roomId || !displayName) {
        callback({ error: 'INVALID_DATA' });
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

      // Password correct (or rejoining), add user to room
      const joinResult = roomManager.addUserToRoom(roomId, socket.id, displayName, roomUserId, hostAccessToken);

      if (joinResult.error) {
        callback({ error: joinResult.error, ...joinResult });
        return;
      }

      // Join socket to room
      socket.join(roomId);

      const messages = messageManager.getActiveMessages(roomId);
      const participants = roomManager.getRoomUsers(roomId);

      console.log(
        `[Socket] ${displayName} joined password-protected room ${roomId}`
      );

      callback({
        roomId,
        roomUserId: joinResult.roomUserId,
        displayName,
        totalUsers: joinResult.totalUsers,
        messages,
        participants,
        settings: {
          roomLifespanMinutes: room.settings.roomLifespanMinutes,
          autoDeleteMinutes: room.settings.autoDeleteMinutes,
          maxUsers: room.settings.maxUsers,
          hasPassword: !!room.password
        }
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
      io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS_UPDATED, {
        participants: roomManager.getRoomUsers(roomId),
        totalUsers: roomManager.getRoomUserCount(roomId)
      });
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
      const { roomId, senderDisplayName, content } = data;

      if (!roomId || !content || content.trim() === '') {
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
          error: 'ROOM_NOT_FOUND'
        });
        return;
      }

      const socketInfo = roomManager.getSocketInfo(socket.id);
      const senderUserId = socketInfo ? socketInfo.userId : socket.id;
      const isHost = senderUserId === room.hostUserId;

      // Create message
      const message = messageManager.createMessage(
        roomId,
        senderUserId,
        senderDisplayName,
        content,
        room.autoDeleteMs,
        isHost
      );

      console.log(`[Socket] Message in room ${roomId}: ${message.messageId}`);

      // Broadcast message to room
      io.to(roomId).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
        messageId: message.messageId,
        roomId: message.roomId,
        senderId: message.senderId,
        senderDisplayName: message.senderDisplayName,
        content: message.content,
        createdAt: message.createdAt,
        expiresAt: message.expiresAt,
        isHost: message.isHost
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
      const isHost = (room.hostId === socket.id) || (hostAccessToken && hostAccessToken === room.hostAccessToken);
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
      const isHost = (room.hostId === socket.id) || (hostAccessToken && hostAccessToken === room.hostAccessToken);
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
    const { roomId, displayName } = data;
    if (roomId) {
      io.to(roomId).emit(SOCKET_EVENTS.TYPING_START, {
        displayName
      });
    }
  }

  /**
   * Handle typing stop
   */
  handleTypingStop(io, socket, data) {
    const { roomId, displayName } = data;
    if (roomId) {
      io.to(roomId).emit(SOCKET_EVENTS.TYPING_STOP, {
        displayName
      });
    }
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
   * Handle disconnect
   */
  handleDisconnect(io, socket) {
    try {
      const socketInfo = roomManager.getSocketInfo(socket.id);

      if (socketInfo) {
        const { roomId, userId: roomUserId } = socketInfo;

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
}

export default new SocketManager();
