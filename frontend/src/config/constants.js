/**
 * Socket.IO Events
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
  RECONNECT_ROOM: 'reconnect-room'
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

/**
 * Dynamically determine the application's base URL at runtime.
 * Handles subpath deployment (e.g., GitHub Pages /vanta) and root-level deployments (Vercel, Local).
 */
export const getAppUrl = () => {
  const origin = window.location.origin;
  if (window.location.pathname.startsWith('/vanta')) {
    return `${origin}/vanta`;
  }
  return origin;
};
