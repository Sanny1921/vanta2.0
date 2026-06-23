import { ROOM_LIFECYCLE, SOCKET_EVENTS, SYSTEM_MESSAGE_TYPES } from '../config/constants.js';
import roomManager from './RoomManager.js';
import messageManager from './MessageManager.js';
import { deleteRoomVoiceDir } from '../utils/voiceCleanup.js';

class LifecycleManager {
  constructor() {
    this.cleanupIntervals = new Map();
    this.lastCleanupCheck = {};
  }

  /**
   * Initialize lifecycle management for a room
   */
  initializeRoomLifecycle(io, roomId) {
    // Start monitoring this room
    this.monitorRoom(io, roomId);
  }

  /**
   * Monitor room for lifecycle events
   */
  monitorRoom(io, roomId) {
    if (this.cleanupIntervals.has(roomId)) return; // Already monitoring

    const interval = setInterval(() => {
      this.checkRoomLifecycle(io, roomId);
    }, 5000); // Check every 5 seconds

    this.cleanupIntervals.set(roomId, interval);
  }

  /**
   * Stop monitoring a room
   */
  stopMonitoringRoom(roomId) {
    const interval = this.cleanupIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.cleanupIntervals.delete(roomId);
    }
  }

  /**
   * Check room lifecycle rules
   */
  checkRoomLifecycle(io, roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const users = roomManager.getUsersInRoom(roomId);
    const now = Date.now();

    // Rule 1: Delete room if nobody joins within first 5 minutes
    if (users.length === 0) {
      if (now - room.createdAt > ROOM_LIFECYCLE.emptyRoomTimeoutMs) {
        this.terminateRoom(io, roomId, 'empty_timeout');
        return;
      }
    }

    // Rule 2: Delete room if only one user remains for 3 continuous minutes
    if (users.length === 1) {
      if (!room.singleUserStartedAt) {
        room.singleUserStartedAt = now;
      } else if (now - room.singleUserStartedAt > ROOM_LIFECYCLE.singleUserTimeoutMs) {
        this.terminateRoom(io, roomId, 'single_user_timeout');
        return;
      }
    } else {
      if (room.singleUserStartedAt) {
        room.singleUserStartedAt = null;
      }
    }

    // Rule 3: Delete room when lifespan expires
    if (now - room.createdAt > room.roomLifespanMs) {
      this.terminateRoom(io, roomId, 'lifespan_expired');
      return;
    }

    // Clean up expired messages
    const expiredMessages = messageManager.deleteExpiredMessages(roomId);
    if (expiredMessages.length > 0) {
      expiredMessages.forEach(msg => {
        io.to(roomId).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
          messageId: msg.messageId
        });
      });
    }
  }

  /**
   * Terminate room due to lifecycle rules
   */
  terminateRoom(io, roomId, reason) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    console.log(`[LifecycleManager] Terminating room ${roomId} - Reason: ${reason}`);

    // Get all users in room
    const users = roomManager.getUsersInRoom(roomId);

    // Delete room and messages
    roomManager.deleteRoom(roomId);
    messageManager.clearRoomMessages(roomId);
    
    // Purge all voice messages associated with the room
    deleteRoomVoiceDir(roomId);

    // Stop monitoring
    this.stopMonitoringRoom(roomId);

    // Broadcast room deleted event to all users
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_DELETED, {
      reason,
      message: `Room has been terminated and deleted.`
    });

    // Disconnect all users from room by making them leave
    io.in(roomId).socketsLeave(roomId);
  }

  /**
   * Gracefully terminate room after host termination
   */
  gracefulTermination(io, roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Send warning
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_TERMINATION_WARNING, {
      type: SYSTEM_MESSAGE_TYPES.ROOM_TERMINATION_WARNING,
      message: 'Host has scheduled room termination. Please finish your conversation.'
    });

    // After grace period, terminate room
    setTimeout(() => {
      const currentRoom = roomManager.getRoom(roomId);
      if (currentRoom && currentRoom.isTerminating) {
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_TERMINATED, {
          type: SYSTEM_MESSAGE_TYPES.ROOM_TERMINATED,
          message: 'Room terminated by host.'
        });

        // Delete room and messages
        roomManager.deleteRoom(roomId);
        messageManager.clearRoomMessages(roomId);
        
        // Purge all voice messages associated with the room
        deleteRoomVoiceDir(roomId);
        
        this.stopMonitoringRoom(roomId);

        // Notify all users
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_DELETED, {
          reason: 'host_termination',
          message: 'Room has been terminated by the host.'
        });

        // Make all sockets leave the room
        io.in(roomId).socketsLeave(roomId);
      }
    }, ROOM_LIFECYCLE.hostTerminationGraceMs);
  }

  /**
   * Clean up all intervals (for shutdown)
   */
  cleanupAll() {
    for (const [roomId, interval] of this.cleanupIntervals.entries()) {
      clearInterval(interval);
    }
    this.cleanupIntervals.clear();
  }
}

export default new LifecycleManager();
