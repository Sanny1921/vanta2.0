import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  emit(event, data, callback) {
    if (this.socket) {
      this.socket.emit(event, data, callback);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Room operations
  createRoom(data, callback) {
    this.emit('create-room', data, callback);
  }

  joinRoom(data, callback) {
    this.emit('join-room', data, callback);
  }

  verifyPassword(data, callback) {
    this.emit('verify-password', data, callback);
  }

  sendMessage(data) {
    this.emit('message-send', data);
  }

  leaveRoom(data) {
    this.emit('leave-room', data);
  }

  getParticipants(data, callback) {
    this.emit('get-participants', data, callback);
  }

  terminateRoom(data, callback) {
    this.emit('terminate-room', data, callback);
  }

  typingStart(data) {
    this.emit('typing-start', data);
  }

  typingStop(data) {
    this.emit('typing-stop', data);
  }
}

export default new SocketService();
