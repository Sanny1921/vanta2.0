import fs from 'fs';
import path from 'path';

const BASE_TEMP_DIR = '/tmp/vanta-rooms';

/**
 * Sanitize keys to prevent path traversal attacks
 */
export const sanitizeKey = (key) => {
  if (typeof key !== 'string') return '';
  return key.replace(/[^A-Za-z0-9_-]/g, '');
};

/**
 * Get the path to a room's voice message directory
 */
export const getRoomVoiceDir = (roomId) => {
  const safeRoomId = sanitizeKey(roomId);
  if (!safeRoomId) throw new Error('Invalid Room ID');
  return path.join(BASE_TEMP_DIR, safeRoomId);
};

/**
 * Get the path to a specific voice message file
 */
export const getVoiceFilePath = (roomId, messageId) => {
  const safeRoomId = sanitizeKey(roomId);
  const safeMessageId = sanitizeKey(messageId);
  if (!safeRoomId || !safeMessageId) throw new Error('Invalid Room or Message ID');
  return path.join(BASE_TEMP_DIR, safeRoomId, `${safeMessageId}.webm`);
};

/**
 * Delete a specific voice message file
 */
export const deleteVoiceFile = (roomId, messageId) => {
  try {
    const filePath = getVoiceFilePath(roomId, messageId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Audit] [VoiceStorage] Deleted voice message file for message ${messageId} in room ${roomId}`);
      
      // Clean up parent directory if empty
      const dirPath = getRoomVoiceDir(roomId);
      if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`[Audit] [VoiceStorage] Cleaned up empty room directory for room ${roomId}`);
      }
      return true;
    }
  } catch (error) {
    console.error(`[Error] [VoiceStorage] Failed to delete voice file for msg ${messageId} in room ${roomId}:`, error);
  }
  return false;
};

/**
 * Delete all files and the directory for a specific room
 */
export const deleteRoomVoiceDir = (roomId) => {
  try {
    const dirPath = getRoomVoiceDir(roomId);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[Audit] [VoiceStorage] Purged all voice assets for room ${roomId}`);
      return true;
    }
  } catch (error) {
    console.error(`[Error] [VoiceStorage] Failed to delete voice directory for room ${roomId}:`, error);
  }
  return false;
};

/**
 * Clear all temporary voice storage (used on server startup)
 */
export const clearAllVoiceFiles = () => {
  try {
    if (fs.existsSync(BASE_TEMP_DIR)) {
      fs.rmSync(BASE_TEMP_DIR, { recursive: true, force: true });
      console.log('[Audit] [VoiceStorage] Swept and cleared all temporary voice storage directories from disk.');
    }
  } catch (error) {
    console.error('[Error] [VoiceStorage] Failed to clear temporary voice storage on boot:', error);
  }
};
