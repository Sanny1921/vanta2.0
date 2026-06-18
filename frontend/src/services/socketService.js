import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this._reconnectCallback = null;
    this._reconnecting = false;
    this._bufferedListeners = [];
  }

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10
    });

    // Register any buffered/previously defined listeners
    this._bufferedListeners.forEach(({ event, callback }) => {
      this.socket.on(event, callback);
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.isConnected = true;

      // If this is a reconnection (not first connect), attempt to rejoin room
      if (this._reconnecting) {
        this._reconnecting = false;
        this._attemptAutoReconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      // Mark that the next connect should attempt auto-reconnect
      this._reconnecting = true;
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    return this.socket;
  }

  /**
   * Auto-reconnect to room using sessionStorage credentials
   */
  _attemptAutoReconnect() {
    const roomId = sessionStorage.getItem('vanta_room_id');
    const roomUserId = sessionStorage.getItem('vanta_room_user_id');
    const displayName = sessionStorage.getItem('vanta_display_name');
    const hostAccessToken = sessionStorage.getItem('vanta_host_access_token');

    if (!roomId || !roomUserId) {
      console.log('[Socket] No session to restore on reconnect');
      return;
    }

    console.log(`[Socket] Auto-reconnecting to room ${roomId} as ${displayName}`);

    this.emit('reconnect-room', {
      roomId,
      roomUserId,
      displayName,
      hostAccessToken
    }, (response) => {
      if (response.error) {
        console.error('[Socket] Auto-reconnect failed:', response.error);
        // If room is gone, clear session
        if (['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'NOT_A_MEMBER'].includes(response.error)) {
          sessionStorage.removeItem('vanta_room_id');
          sessionStorage.removeItem('vanta_room_user_id');
          sessionStorage.removeItem('vanta_display_name');
          sessionStorage.removeItem('vanta_host_access_token');
        }
      } else {
        console.log('[Socket] Auto-reconnect successful');
      }

      // Notify RoomContext of reconnect result
      if (this._reconnectCallback) {
        this._reconnectCallback(response);
      }
    });
  }

  /**
   * Register a callback to be called when auto-reconnect completes
   */
  onReconnect(callback) {
    this._reconnectCallback = callback;
  }

  /**
   * Remove the reconnect callback
   */
  offReconnect() {
    this._reconnectCallback = null;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this._reconnecting = false;
    }
  }

  emit(event, data, callback) {
    if (this.socket) {
      this.socket.emit(event, data, callback);
    }
  }

  on(event, callback) {
    this._bufferedListeners.push({ event, callback });
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (callback) {
      this._bufferedListeners = this._bufferedListeners.filter(
        (listener) => !(listener.event === event && listener.callback === callback)
      );
    } else {
      this._bufferedListeners = this._bufferedListeners.filter(
        (listener) => listener.event !== event
      );
    }
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

  reconnectRoom(data, callback) {
    this.emit('reconnect-room', data, callback);
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
