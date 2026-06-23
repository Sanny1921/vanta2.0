/**
 * Default room settings (in minutes, converted to milliseconds internally)
 */
export const DEFAULT_ROOM_SETTINGS = {
  roomLifespanMinutes: 30,
  autoDeleteMinutes: 1,
  maxUsers: 15
};

/**
 * Room lifecycle timings (in milliseconds)
 */
export const ROOM_LIFECYCLE = {
  // Delete room if nobody joins within 5 minutes
  emptyRoomTimeoutMs: 5 * 60 * 1000,

  // Delete room if only 1 user remains for 3 continuous minutes
  singleUserTimeoutMs: 3 * 60 * 1000,

  // Grace period before room termination after host termination message
  hostTerminationGraceMs: 30 * 1000
};

/**
 * Socket events
 */
export const SOCKET_EVENTS = {
  // Room events
  CREATE_ROOM: 'create-room',
  ROOM_CREATED: 'room-created',
  JOIN_ROOM: 'join-room',
  ROOM_JOINED: 'room-joined',
  ROOM_FULL: 'room-full',
  ROOM_NOT_FOUND: 'room-not-found',
  ROOM_EXPIRED: 'room-expired',
  LEAVE_ROOM: 'leave-room',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  ROOM_USERS_UPDATED: 'room-users-updated',

  // Password verification
  VERIFY_PASSWORD: 'verify-password',
  PASSWORD_VERIFIED: 'password-verified',
  PASSWORD_INVALID: 'password-invalid',

  // Messages
  MESSAGE_SEND: 'message-send',
  MESSAGE_RECEIVED: 'message-received',
  MESSAGE_DELETED: 'message-deleted',

  // Typing indicators
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',

  // Room termination
  TERMINATE_ROOM: 'terminate-room',
  ROOM_TERMINATION_WARNING: 'room-termination-warning',
  ROOM_TERMINATED: 'room-terminated',
  ROOM_DELETED: 'room-deleted',

  // Participants
  GET_PARTICIPANTS: 'get-participants',
  PARTICIPANTS: 'participants',

  // Host Moderation / Kick
  KICK_USER: 'kick-user',
  KICKED_FROM_ROOM: 'kicked-from-room',

  // Reconnection
  RECONNECT_ROOM: 'reconnect-room',

  // WebRTC Signaling
  WEBRTC_OFFER: 'webrtc-offer',
  WEBRTC_ANSWER: 'webrtc-answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
  WEBRTC_INIT: 'webrtc-init',

  // Voice call roster
  VOICE_CALL_JOIN: 'voice-call-join',
  VOICE_CALL_LEAVE: 'voice-call-leave',
  VOICE_CALL_USERS: 'voice-call-users',
  VOICE_CALL_USER_JOINED: 'voice-call-user-joined',
  VOICE_CALL_USER_LEFT: 'voice-call-user-left'
};

/**
 * System message types
 */
export const SYSTEM_MESSAGE_TYPES = {
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  ROOM_TERMINATION_WARNING: 'room-termination-warning',
  ROOM_TERMINATED: 'room-terminated'
};
