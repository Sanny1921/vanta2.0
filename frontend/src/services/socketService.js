import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;
const DIAG_PREFIX = '[Diag][SocketService]';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this._reconnectCallback = null;
    this._reconnecting = false;
    this._bufferedListeners = [];
  }

  connect() {
    console.log(`${DIAG_PREFIX} connect() called`, {
      hasExistingSocket: !!this.socket,
      socketUrl: SOCKET_URL,
      viteSocketUrl: import.meta.env.VITE_SOCKET_URL || null,
      viteApiUrl: import.meta.env.VITE_API_URL || null,
      windowOrigin: window.location.origin,
      online: navigator.onLine,
      userAgent: navigator.userAgent
    });

    if (this.socket) {
      console.log(`${DIAG_PREFIX} Reusing existing socket`, {
        socketId: this.socket.id,
        connected: this.socket.connected,
        transport: this.socket.io?.engine?.transport?.name || null
      });
      return this.socket;
    }

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
      console.log(`${DIAG_PREFIX} connect success`, {
        socketId: this.socket.id,
        connected: this.socket.connected,
        transport: this.socket.io?.engine?.transport?.name || null,
        socketUrl: SOCKET_URL
      });
      this.isConnected = true;

      // If this is a reconnection (not first connect), attempt to rejoin room
      if (this._reconnecting) {
        this._reconnecting = false;
        this._attemptAutoReconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      console.log(`${DIAG_PREFIX} disconnect`, {
        reason,
        socketId: this.socket?.id,
        socketUrl: SOCKET_URL
      });
      this.isConnected = false;
      // Mark that the next connect should attempt auto-reconnect
      this._reconnecting = true;
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      console.error(`${DIAG_PREFIX} socket error`, error);
    });

    this.socket.on('connect_error', (error) => {
      console.error(`${DIAG_PREFIX} connect_error`, {
        message: error.message,
        description: error.description,
        context: error.context,
        socketUrl: SOCKET_URL,
        online: navigator.onLine
      });
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`${DIAG_PREFIX} reconnect_attempt`, {
        attempt,
        socketUrl: SOCKET_URL
      });
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error(`${DIAG_PREFIX} reconnect_failed`, {
        socketUrl: SOCKET_URL
      });
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
    const startedAt = Date.now();
    console.log(`${DIAG_PREFIX} emit start`, {
      event,
      hasSocket: !!this.socket,
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      socketUrl: SOCKET_URL,
      data
    });

    if (this.socket) {
      this.socket.emit(event, data, (...args) => {
        console.log(`${DIAG_PREFIX} emit ack`, {
          event,
          elapsedMs: Date.now() - startedAt,
          args
        });
        if (callback) {
          callback(...args);
        }
      });
    } else {
      console.error(`${DIAG_PREFIX} emit dropped: socket is not initialized`, {
        event,
        data
      });
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
    console.log(`${DIAG_PREFIX} createRoom request start`, data);
    this.emit('create-room', data, callback);
  }

  joinRoom(data, callback) {
    console.log(`${DIAG_PREFIX} joinRoom request start`, data);
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

  joinVoiceCall(data, callback) {
    this.emit('voice-call-join', data, callback);
  }

  leaveVoiceCall() {
    this.emit('voice-call-leave');
  }

  typingStart(data) {
    this.emit('typing-start', data);
  }

  typingStop(data) {
    this.emit('typing-stop', data);
  }
}

export default new SocketService();
