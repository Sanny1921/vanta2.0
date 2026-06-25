import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import socketService from '../services/socketService';

const RoomContext = createContext();
const DIAG_PREFIX = '[Diag][RoomContext]';

const deduplicateParticipants = (list) => {
  const seen = new Set();
  return (list || []).filter(p => {
    if (!p || !p.roomUserId) return false;
    if (seen.has(p.roomUserId)) return false;
    seen.add(p.roomUserId);
    return true;
  });
};

export const RoomProvider = ({ children }) => {
  // Room state
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUserId, setRoomUserId] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roomSettings, setRoomSettings] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [recordingUsers, setRecordingUsers] = useState(new Set());

  // Connect socket on mount
  useEffect(() => {
    socketService.connect();
  }, []);

  // Listen for mid-session Socket.IO auto-reconnects
  useEffect(() => {
    const handleAutoReconnect = (response) => {
      if (response.error) {
        console.error('[RoomContext] Auto-reconnect failed:', response.error);
        // If room is gone, clear local state
        if (['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'NOT_A_MEMBER'].includes(response.error)) {
          setCurrentRoom(null);
          setRoomUserId(null);
          setDisplayName('');
          setIsHost(false);
          setParticipants([]);
          setMessages([]);
          setTotalUsers(0);
          setRoomSettings(null);
        }
        return;
      }

      // Restore room state silently
      console.log('[RoomContext] Auto-reconnect restoring state for room:', response.roomId);
      setCurrentRoom(response.roomId);
      setRoomUserId(response.roomUserId);
      setDisplayName(response.displayName || sessionStorage.getItem('vanta_display_name') || '');
      setIsHost(response.isHost || false);
      setRoomSettings(response.settings || null);

      if (response.participants) {
        const uniqueParticipants = deduplicateParticipants(response.participants);
        setParticipants(uniqueParticipants);
        setTotalUsers(uniqueParticipants.length);
      } else {
        setTotalUsers(response.totalUsers || 0);
      }
      if (response.messages) {
        const historicalMessages = response.messages.map(msg => ({
          ...msg,
          type: msg.type || 'user'
        }));
        setMessages(historicalMessages);
      }
    };

    socketService.onReconnect(handleAutoReconnect);

    return () => {
      socketService.offReconnect();
    };
  }, []);

  // Room lifecycle
  const createRoom = useCallback((data) => {
    console.log(`${DIAG_PREFIX} createRoom start`, data);
    return new Promise((resolve, reject) => {
      socketService.createRoom(data, (response) => {
        console.log(`${DIAG_PREFIX} createRoom response`, response);
        if (response.error) {
          console.error(`${DIAG_PREFIX} createRoom failure`, response.error);
          setError(response.error);
          reject(response.error);
        } else {
          setCurrentRoom(response.roomId);
          setRoomUserId(response.roomUserId);
          setIsHost(true);
          setDisplayName(data.hostDisplayName);
          setRoomSettings(response.settings);
          setTotalUsers(1);
          setParticipants([{
            roomUserId: response.roomUserId,
            displayName: data.hostDisplayName,
            isHost: true
          }]);

          // Save session data to sessionStorage
          sessionStorage.setItem('vanta_room_id', response.roomId);
          sessionStorage.setItem('vanta_room_user_id', response.roomUserId);
          sessionStorage.setItem('vanta_display_name', data.hostDisplayName);
          sessionStorage.setItem('vanta_host_access_token', response.hostAccessToken);

          console.log(`${DIAG_PREFIX} createRoom success`, {
            roomId: response.roomId,
            roomUserId: response.roomUserId,
            settings: response.settings
          });
          resolve(response);
        }
      });
    });
  }, []);

  const joinRoom = useCallback((data) => {
    console.log(`${DIAG_PREFIX} joinRoom start`, data);
    return new Promise((resolve, reject) => {
      socketService.joinRoom(data, (response) => {
        console.log(`${DIAG_PREFIX} joinRoom response`, response);
        if (response.error) {
          console.error(`${DIAG_PREFIX} joinRoom failure`, response.error);
          setError(response.error);
          reject(response.error);
        } else if (response.requiresPassword) {
          console.log(`${DIAG_PREFIX} joinRoom password required`, {
            roomId: data.roomId
          });
          resolve({ requiresPassword: true });
        } else {
          setCurrentRoom(response.roomId);
          setRoomUserId(response.roomUserId);
          setDisplayName(response.displayName || data.displayName);
          const historicalMessages = (response.messages || []).map(msg => ({
            ...msg,
            type: msg.type || 'user'
          }));
          setMessages(historicalMessages);
          const uniqueParticipants = deduplicateParticipants(response.participants);
          setParticipants(uniqueParticipants);
          setTotalUsers(uniqueParticipants.length);
          setRoomSettings(response.settings || null);
          const isUserHost = uniqueParticipants.find(p => p.roomUserId === response.roomUserId)?.isHost || false;
          setIsHost(isUserHost);

          // Save session data to sessionStorage
          sessionStorage.setItem('vanta_room_id', response.roomId);
          sessionStorage.setItem('vanta_room_user_id', response.roomUserId);
          sessionStorage.setItem('vanta_display_name', response.displayName || data.displayName);
          // Preserve hostAccessToken: save if provided, never overwrite with undefined
          if (data.hostAccessToken) {
            sessionStorage.setItem('vanta_host_access_token', data.hostAccessToken);
          }

          console.log(`${DIAG_PREFIX} joinRoom success`, {
            roomId: response.roomId,
            roomUserId: response.roomUserId,
            totalUsers: uniqueParticipants.length
          });
          resolve(response);
        }
      });
    });
  }, []);

  const verifyPassword = useCallback((data) => {
    return new Promise((resolve, reject) => {
      socketService.verifyPassword(data, (response) => {
        if (response.error) {
          setError(response.error);
          reject(response.error);
        } else {
          setCurrentRoom(response.roomId);
          setRoomUserId(response.roomUserId);
          setDisplayName(response.displayName || data.displayName);
          const historicalMessages = (response.messages || []).map(msg => ({
            ...msg,
            type: msg.type || 'user'
          }));
          setMessages(historicalMessages);
          const uniqueParticipants = deduplicateParticipants(response.participants);
          setParticipants(uniqueParticipants);
          setTotalUsers(uniqueParticipants.length);
          setRoomSettings(response.settings || null);
          const isUserHost = uniqueParticipants.find(p => p.roomUserId === response.roomUserId)?.isHost || false;
          setIsHost(isUserHost);

          // Save session data to sessionStorage
          sessionStorage.setItem('vanta_room_id', response.roomId);
          sessionStorage.setItem('vanta_room_user_id', response.roomUserId);
          sessionStorage.setItem('vanta_display_name', response.displayName || data.displayName);
          if (data.hostAccessToken) {
            sessionStorage.setItem('vanta_host_access_token', data.hostAccessToken);
          }

          resolve(response);
        }
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      socketService.leaveRoom({ roomId: currentRoom });
      setCurrentRoom(null);
      setRoomUserId(null);
      setDisplayName('');
      setIsHost(false);
      setParticipants([]);
      setMessages([]);
      setTotalUsers(0);
      setError(null);

      // Clear sessionStorage
      sessionStorage.removeItem('vanta_room_id');
      sessionStorage.removeItem('vanta_room_user_id');
      sessionStorage.removeItem('vanta_display_name');
      sessionStorage.removeItem('vanta_host_access_token');
    }
  }, [currentRoom]);

  const sendMessage = useCallback((content) => {
    if (currentRoom && displayName) {
      socketService.sendMessage({
        roomId: currentRoom,
        senderDisplayName: displayName,
        content
      });
    }
  }, [currentRoom, displayName]);

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const deleteMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
  }, []);

  const addUser = useCallback((user) => {
    setParticipants(prev => {
      if (prev.some(p => p.roomUserId === user.roomUserId)) {
        return prev;
      }
      const nextParticipants = [...prev, user];
      setTotalUsers(nextParticipants.length);
      return nextParticipants;
    });
  }, []);

  const removeUser = useCallback((roomUserId) => {
    setParticipants(prev => prev.filter(p => p.roomUserId !== roomUserId));
    setTotalUsers(prev => Math.max(0, prev - 1));
  }, []);

  const updateParticipants = useCallback((participantsList, count) => {
    const uniqueParticipants = deduplicateParticipants(participantsList);
    setParticipants(uniqueParticipants);
    setTotalUsers(uniqueParticipants.length);
  }, []);

  const getParticipants = useCallback(() => {
    if (currentRoom) {
      socketService.getParticipants({ roomId: currentRoom }, (response) => {
        if (response.participants) {
          const uniqueParticipants = deduplicateParticipants(response.participants);
          setParticipants(uniqueParticipants);
          setTotalUsers(uniqueParticipants.length);
        }
      });
    }
  }, [currentRoom]);

  const terminateRoom = useCallback(() => {
    if (currentRoom && isHost) {
      const hostAccessToken = sessionStorage.getItem('vanta_host_access_token');
      socketService.terminateRoom({ roomId: currentRoom, hostAccessToken }, (response) => {
        if (response.error) {
          setError(response.error);
        }
      });
    }
  }, [currentRoom, isHost]);

  const sendTypingStart = useCallback(() => {
    if (currentRoom && displayName) {
      socketService.typingStart({
        roomId: currentRoom,
        displayName
      });
    }
  }, [currentRoom, displayName]);

  const sendTypingStop = useCallback(() => {
    if (currentRoom && displayName) {
      socketService.typingStop({
        roomId: currentRoom,
        displayName
      });
    }
  }, [currentRoom, displayName]);

  const addTypingUser = useCallback((displayName) => {
    setTypingUsers(prev => new Set([...prev, displayName]));
  }, []);

  const removeTypingUser = useCallback((displayName) => {
    setTypingUsers(prev => {
      const next = new Set(prev);
      next.delete(displayName);
      return next;
    });
  }, []);

  const sendRecordingStart = useCallback(() => {
    if (currentRoom && displayName) {
      socketService.recordingStart({
        roomId: currentRoom,
        displayName
      });
    }
  }, [currentRoom, displayName]);

  const sendRecordingStop = useCallback(() => {
    if (currentRoom && displayName) {
      socketService.recordingStop({
        roomId: currentRoom,
        displayName
      });
    }
  }, [currentRoom, displayName]);

  const addRecordingUser = useCallback((displayName) => {
    setRecordingUsers(prev => new Set([...prev, displayName]));
  }, []);

  const removeRecordingUser = useCallback((displayName) => {
    setRecordingUsers(prev => {
      const next = new Set(prev);
      next.delete(displayName);
      return next;
    });
  }, []);

  const clearRoom = useCallback(() => {
    setCurrentRoom(null);
    setRoomUserId(null);
    setDisplayName('');
    setIsHost(false);
    setParticipants([]);
    setMessages([]);
    setTotalUsers(0);
    setRoomSettings(null);
    setError(null);
    setTypingUsers(new Set());
    setRecordingUsers(new Set());

    // Clear sessionStorage
    sessionStorage.removeItem('vanta_room_id');
    sessionStorage.removeItem('vanta_room_user_id');
    sessionStorage.removeItem('vanta_display_name');
    sessionStorage.removeItem('vanta_host_access_token');
  }, []);

  const value = {
    // Room state
    currentRoom,
    roomUserId,
    displayName,
    isHost,
    participants,
    messages,
    totalUsers,
    roomSettings,

    // UI state
    loading,
    error,
    typingUsers: Array.from(typingUsers),
    recordingUsers: Array.from(recordingUsers),

    // Actions
    createRoom,
    joinRoom,
    verifyPassword,
    leaveRoom,
    sendMessage,
    addMessage,
    deleteMessage,
    addUser,
    removeUser,
    updateParticipants,
    getParticipants,
    terminateRoom,
    sendTypingStart,
    sendTypingStop,
    addTypingUser,
    removeTypingUser,
    sendRecordingStart,
    sendRecordingStop,
    addRecordingUser,
    removeRecordingUser,
    clearRoom,

    // Utilities
    setLoading,
    setError
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within RoomProvider');
  }
  return context;
};

RoomProvider.propTypes = {
  children: PropTypes.node.isRequired
};
