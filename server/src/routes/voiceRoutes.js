import express from 'express';
import fs from 'fs';
import roomManager from '../managers/RoomManager.js';
import { generateId } from '../utils/helpers.js';
import { getRoomVoiceDir, getVoiceFilePath } from '../utils/voiceCleanup.js';

const router = express.Router();

// Enforce raw binary parsing for voice uploads with 1MB maximum limit
const rawAudioParser = express.raw({
  type: ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'application/octet-stream'],
  limit: '1mb'
});

/**
 * POST /api/rooms/:roomId/voice-messages
 * Secure upload endpoint for voice messages.
 * Expects raw audio binary body and membership authentication headers.
 */
router.post('/rooms/:roomId/voice-messages', rawAudioParser, (req, res) => {
  try {
    const { roomId } = req.params;
    const roomUserId = req.headers['x-room-user-id'];

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required.' });
    }

    // 1. Validate room existence and active status
    const room = roomManager.getRoom(roomId);
    if (!room || !roomManager.isRoomActive(roomId)) {
      return res.status(404).json({ error: 'Room not found or has expired.' });
    }

    // 2. Validate room membership
    if (!roomUserId || !roomManager.isReturningUser(roomId, roomUserId)) {
      return res.status(403).json({ error: 'Unauthorized: You are not a member of this room.' });
    }

    // 3. Validate raw audio body existence
    if (!req.body || !(req.body instanceof Buffer) || req.body.length === 0) {
      return res.status(400).json({ error: 'Invalid upload: Empty or invalid audio stream.' });
    }

    // 4. Validate size limit (1MB double-check)
    const MAX_SIZE = 1024 * 1024; // 1 MB
    if (req.body.length > MAX_SIZE) {
      return res.status(413).json({ error: 'Upload rejected: Audio file exceeds 1 MB limit.' });
    }

    // 5. Detect and restrict mime type
    const contentType = req.headers['content-type'] || '';
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'application/octet-stream'];
    if (!allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({ error: 'Unsupported format: WebM, AAC, or MP4 audio only.' });
    }

    // 6. Generate secure message ID
    const messageId = generateId('MSG');

    // 7. Ensure directory exists and write file securely
    const dirPath = getRoomVoiceDir(roomId);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = getVoiceFilePath(roomId, messageId);
    fs.writeFileSync(filePath, req.body);

    // 8. Audit logging
    console.log(`[Audit] [VoiceUpload] User ${roomUserId} uploaded voice message ${messageId} to room ${roomId} (Size: ${req.body.length} bytes, Format: ${contentType})`);

    return res.status(201).json({
      messageId,
      fileUrl: `/api/rooms/${roomId}/voice-messages/${messageId}`
    });
  } catch (error) {
    console.error('[Error] [VoiceUpload] Failed uploading voice message:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/rooms/:roomId/voice-messages/:messageId
 * Secure download endpoint.
 * Validates requester membership before serving the file.
 */
router.get('/rooms/:roomId/voice-messages/:messageId', (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    
    // Support header validation or query string validation for browser fallback
    const roomUserId = req.headers['x-room-user-id'] || req.query.userId;

    if (!roomId || !messageId) {
      return res.status(400).json({ error: 'Room ID and Message ID are required.' });
    }

    // 1. Validate room existence and active status
    const room = roomManager.getRoom(roomId);
    if (!room || !roomManager.isRoomActive(roomId)) {
      return res.status(404).json({ error: 'Room not found or has expired.' });
    }

    // 2. Validate room membership
    if (!roomUserId || !roomManager.isReturningUser(roomId, roomUserId)) {
      return res.status(403).json({ error: 'Unauthorized access to room content.' });
    }

    // 3. Resolve file and verify existence
    const filePath = getVoiceFilePath(roomId, messageId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Voice message file not found.' });
    }

    // 4. Set secure caching and content-type headers
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 mins private cache

    // 5. Stream the file content
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error(`[Error] [VoiceDownload] Failed streaming file ${messageId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed streaming voice asset.' });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error('[Error] [VoiceDownload] Failed getting voice message:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
