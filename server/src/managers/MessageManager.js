import { generateId, getCurrentTimestamp } from '../utils/helpers.js';
import { deleteVoiceFile } from '../utils/voiceCleanup.js';

class MessageManager {
  constructor() {
    // Map to store messages: roomId -> [messages]
    this.messages = new Map();
  }

  createMessage(
    roomId,
    senderId,
    senderDisplayName,
    content,
    expiresAtMs,
    isHost = false,
    type = 'text',
    mediaUrl = null,
    duration = null
  ) {
    const messageId = generateId('MSG');
    const createdAt = getCurrentTimestamp();

    // Determine type-specific expiry duration
    let msgExpiryMs;
    if (type === 'voice') {
      msgExpiryMs = 300 * 1000; // 5 minutes for voice messages
    } else {
      msgExpiryMs = expiresAtMs || (60 * 1000); // Respect room settings or default to 60s for text
    }

    const message = {
      messageId,
      roomId,
      senderId,
      senderDisplayName,
      content,
      type,
      mediaUrl,
      duration,
      createdAt,
      expiresAt: createdAt + msgExpiryMs,
      isHost
    };

    // Initialize room messages if not exists
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }

    this.messages.get(roomId).push(message);
    return message;
  }

  /**
   * Get all messages for a room
   */
  getMessages(roomId) {
    return this.messages.get(roomId) || [];
  }

  /**
   * Get non-expired messages for a room
   */
  getActiveMessages(roomId) {
    const allMessages = this.messages.get(roomId) || [];
    const now = getCurrentTimestamp();
    return allMessages.filter(msg => msg.expiresAt > now);
  }

  /**
   * Delete a specific message
   */
  deleteMessage(roomId, messageId) {
    if (!this.messages.has(roomId)) return false;

    const roomMessages = this.messages.get(roomId);
    const index = roomMessages.findIndex(m => m.messageId === messageId);

    if (index !== -1) {
      const msg = roomMessages[index];
      if (msg.type === 'voice') {
        deleteVoiceFile(roomId, messageId);
      }
      roomMessages.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Delete all expired messages for a room
   */
  deleteExpiredMessages(roomId) {
    if (!this.messages.has(roomId)) return [];

    const roomMessages = this.messages.get(roomId);
    const now = getCurrentTimestamp();
    const expiredMessages = [];

    // Filter out expired messages
    const activeMessages = [];
    roomMessages.forEach(msg => {
      if (msg.expiresAt > now) {
        activeMessages.push(msg);
      } else {
        expiredMessages.push(msg);
        // Automatically delete associated voice file if it expires
        if (msg.type === 'voice') {
          deleteVoiceFile(roomId, msg.messageId);
        }
      }
    });

    this.messages.set(roomId, activeMessages);
    return expiredMessages;
  }

  /**
   * Clear all messages for a room
   */
  clearRoomMessages(roomId) {
    this.messages.delete(roomId);
  }

  /**
   * Get message expiration time in milliseconds
   */
  getMessageLifespan(autoDeleteMinutes) {
    return autoDeleteMinutes * 60 * 1000;
  }
}

export default new MessageManager();
