import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useUI } from '../context/UIContext';
import socketService from '../services/socketService';
import webRTCService from '../services/WebRTCService';
import { SOCKET_EVENTS, SYSTEM_MESSAGE_TYPES } from '../config/constants';
import ParticipantList from '../components/ParticipantList';
import ChatArea from '../components/ChatArea';
import MessageInput from '../components/MessageInput';
import RoomHeader from '../components/RoomHeader';

import RoomDetailsModal from '../components/RoomDetailsModal';
import ManageUsersModal from '../components/ManageUsersModal';
import '../css/Room.css';

const MAX_VOICE_PARTICIPANTS = 8;

export default function Room() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { showConfirm, showToast } = useUI();
  const {
    currentRoom,
    roomUserId,
    displayName,
    isHost,
    participants,
    messages,
    totalUsers,
    roomSettings,
    addMessage,
    deleteMessage,
    addUser,
    removeUser,
    updateParticipants,
    addTypingUser,
    removeTypingUser,
    clearRoom,
    terminateRoom,
    leaveRoom,
    joinRoom
  } = useRoom();

  const [activeModal, setActiveModal] = useState(null); // 'participants' | 'details' | 'manage' | null
  const [roomDeleted, setRoomDeleted] = useState(false);
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [isJoiningVoiceCall, setIsJoiningVoiceCall] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isListenerOnly, setIsListenerOnly] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  const [remoteVoiceStreams, setRemoteVoiceStreams] = useState([]);
  const messagesEndRef = useRef(null);
  const hasSynced = useRef(false);
  const isInVoiceCallRef = useRef(false);
  const isVoiceMutedRef = useRef(false);
  const isListenerOnlyRef = useRef(false);
  const [rejoining, setRejoining] = useState(() => {
    const cachedRoomId = sessionStorage.getItem('vanta_room_id');
    const cachedDisplayName = sessionStorage.getItem('vanta_display_name');
    return (!currentRoom && cachedRoomId === roomId && cachedDisplayName);
  });

  useEffect(() => {
    isInVoiceCallRef.current = isInVoiceCall;
  }, [isInVoiceCall]);

  useEffect(() => {
    isVoiceMutedRef.current = isVoiceMuted;
  }, [isVoiceMuted]);

  useEffect(() => {
    isListenerOnlyRef.current = isListenerOnly;
  }, [isListenerOnly]);

  const negotiateVoicePeers = useCallback((callParticipants) => {
    if (!roomUserId) return;
    callParticipants.forEach(participant => {
      if (participant.roomUserId !== roomUserId && roomUserId < participant.roomUserId) {
        webRTCService.initiateVoiceConnection(participant.roomUserId);
      }
    });
  }, [roomUserId]);

  const leaveVoiceCall = useCallback(({ notifyServer = true } = {}) => {
    if (notifyServer) {
      socketService.leaveVoiceCall();
    }
    webRTCService.closeAllVoiceConnections();
    setIsInVoiceCall(false);
    setIsJoiningVoiceCall(false);
    setIsVoiceMuted(false);
    setVoiceParticipants([]);
    setRemoteVoiceStreams([]);
    sessionStorage.removeItem('vanta_voice_call_active');
    sessionStorage.removeItem('vanta_voice_listener_only');
    sessionStorage.removeItem('vanta_voice_muted');
  }, []);

  const joinVoiceCall = useCallback(async ({ restore = false } = {}) => {
    if (!currentRoom || !roomUserId || isJoiningVoiceCall) return;

    const listenerOnly = restore
      ? sessionStorage.getItem('vanta_voice_listener_only') === 'true'
      : isListenerOnlyRef.current;
    const muted = restore
      ? sessionStorage.getItem('vanta_voice_muted') === 'true'
      : isVoiceMutedRef.current;

    setIsJoiningVoiceCall(true);

    try {
      await webRTCService.startVoiceCall({ listenerOnly });
      webRTCService.setVoiceMuted(listenerOnly ? true : muted);

      socketService.joinVoiceCall({
        isListenerOnly: listenerOnly,
        isMuted: listenerOnly ? true : muted
      }, (response) => {
        if (response?.error) {
          webRTCService.closeAllVoiceConnections();
          setIsJoiningVoiceCall(false);
          showToast(`Voice call unavailable: ${response.error}`, 'error');
          return;
        }

        const nextParticipants = response.participants || [];
        setVoiceParticipants(nextParticipants);
        setIsInVoiceCall(true);
        setIsJoiningVoiceCall(false);
        setIsListenerOnly(listenerOnly);
        setIsVoiceMuted(listenerOnly ? true : muted);
        sessionStorage.setItem('vanta_voice_call_active', 'true');
        sessionStorage.setItem('vanta_voice_listener_only', String(listenerOnly));
        sessionStorage.setItem('vanta_voice_muted', String(listenerOnly ? true : muted));

        socketService.emit(SOCKET_EVENTS.WEBRTC_INIT, { context: 'voice' });
        negotiateVoicePeers(nextParticipants);
      });
    } catch (error) {
      console.error('[VoiceCall] Failed to join voice call:', error);
      setIsJoiningVoiceCall(false);
      webRTCService.closeAllVoiceConnections();
      showToast('Microphone access failed. Try listener-only mode.', 'error');
    }
  }, [currentRoom, roomUserId, isJoiningVoiceCall, negotiateVoicePeers, showToast]);

  const toggleVoiceMute = useCallback(() => {
    if (!isInVoiceCall || isListenerOnly) return;
    const nextMuted = !isVoiceMuted;
    setIsVoiceMuted(nextMuted);
    webRTCService.setVoiceMuted(nextMuted);
    sessionStorage.setItem('vanta_voice_muted', String(nextMuted));
    socketService.joinVoiceCall({
      isListenerOnly,
      isMuted: nextMuted
    });
  }, [isInVoiceCall, isListenerOnly, isVoiceMuted]);

  const toggleListenerOnly = useCallback(() => {
    if (isInVoiceCall) return;
    setIsListenerOnly(prev => {
      const next = !prev;
      sessionStorage.setItem('vanta_voice_listener_only', String(next));
      return next;
    });
  }, [isInVoiceCall]);

  // Setup socket listeners
  useEffect(() => {
    socketService.on(SOCKET_EVENTS.MESSAGE_RECEIVED, (data) => {
      const message = {
        messageId: data.messageId,
        roomId: data.roomId,
        senderId: data.senderId,
        senderDisplayName: data.senderDisplayName,
        content: data.content,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        isHost: data.isHost,
        type: data.type || 'user',
        mediaUrl: data.mediaUrl || null,
        duration: data.duration || null
      };
      addMessage(message);
    });

    socketService.on(SOCKET_EVENTS.MESSAGE_DELETED, (data) => {
      deleteMessage(data.messageId);
    });

    socketService.on(SOCKET_EVENTS.USER_JOINED, (data) => {
      if (data.type === SYSTEM_MESSAGE_TYPES.USER_JOINED) {
        addMessage({
          messageId: `sys-${Date.now()}`,
          type: 'system',
          content: data.message,
          createdAt: Date.now()
        });
        addUser(data.user);
      }
    });

    socketService.on(SOCKET_EVENTS.USER_LEFT, (data) => {
      if (data.type === SYSTEM_MESSAGE_TYPES.USER_LEFT) {
        addMessage({
          messageId: `sys-${Date.now()}`,
          type: 'system',
          content: data.message,
          createdAt: Date.now()
        });
        removeUser(data.user.roomUserId);
        webRTCService.closePeerConnection(data.user.roomUserId);
        webRTCService.closeVoicePeerConnection(data.user.roomUserId);
      }
    });

    socketService.on(SOCKET_EVENTS.TYPING_START, (data) => {
      addTypingUser(data.displayName);
    });

    socketService.on(SOCKET_EVENTS.TYPING_STOP, (data) => {
      removeTypingUser(data.displayName);
    });

    socketService.on(SOCKET_EVENTS.ROOM_TERMINATION_WARNING, (data) => {
      if (data.type === SYSTEM_MESSAGE_TYPES.ROOM_TERMINATION_WARNING) {
        addMessage({
          messageId: `sys-${Date.now()}`,
          type: 'system',
          content: data.message,
          createdAt: Date.now()
        });
      }
    });

    socketService.on(SOCKET_EVENTS.ROOM_TERMINATED, (data) => {
      if (data.type === SYSTEM_MESSAGE_TYPES.ROOM_TERMINATED) {
        addMessage({
          messageId: `sys-${Date.now()}`,
          type: 'system',
          content: data.message,
          createdAt: Date.now()
        });
      }
    });

    socketService.on(SOCKET_EVENTS.ROOM_USERS_UPDATED, (data) => {
      updateParticipants(data.participants, data.totalUsers);
    });

    socketService.on(SOCKET_EVENTS.ROOM_DELETED, () => {
      leaveVoiceCall({ notifyServer: false });
      setRoomDeleted(true);
      addMessage({
        messageId: `sys-${Date.now()}`,
        type: 'system',
        content: 'Room has been deleted.',
        createdAt: Date.now()
      });
      setTimeout(() => {
        clearRoom();
        navigate('/');
      }, 3000);
    });

    socketService.on(SOCKET_EVENTS.KICKED_FROM_ROOM, () => {
      leaveVoiceCall({ notifyServer: false });
      setRoomDeleted(true);
      addMessage({
        messageId: `sys-${Date.now()}`,
        type: 'system',
        content: 'You have been removed from the room by the host.',
        createdAt: Date.now()
      });
      setTimeout(() => {
        clearRoom();
        navigate('/');
      }, 3000);
    });

    socketService.on(SOCKET_EVENTS.VOICE_CALL_USERS, (data) => {
      setVoiceParticipants(data.participants || []);
    });

    socketService.on(SOCKET_EVENTS.VOICE_CALL_USER_JOINED, (data) => {
      const nextParticipants = data.participants || [];
      setVoiceParticipants(nextParticipants);
      if (!isInVoiceCallRef.current || !roomUserId || !data.participant) return;

      const remoteUserId = data.participant.roomUserId;
      webRTCService.closeVoicePeerConnection(remoteUserId);
      if (roomUserId < remoteUserId) {
        webRTCService.initiateVoiceConnection(remoteUserId);
      }
    });

    socketService.on(SOCKET_EVENTS.VOICE_CALL_USER_LEFT, (data) => {
      setVoiceParticipants(data.participants || []);
      if (data.roomUserId) {
        webRTCService.closeVoicePeerConnection(data.roomUserId);
      }
    });

    const handleSocketConnect = () => {
      if (sessionStorage.getItem('vanta_voice_call_active') === 'true') {
        setTimeout(() => {
          joinVoiceCall({ restore: true });
        }, 250);
      }
    };
    socketService.on('connect', handleSocketConnect);

    // WebRTC Signaling Listeners
    socketService.on(SOCKET_EVENTS.WEBRTC_INIT, (data) => {
      const { roomUserId: remoteUserId, context } = data;
      if (context === 'voice') {
        if (isInVoiceCallRef.current && roomUserId && remoteUserId) {
          webRTCService.closeVoicePeerConnection(remoteUserId);
          if (roomUserId < remoteUserId) {
            webRTCService.initiateVoiceConnection(remoteUserId);
          }
        }
        return;
      }

      console.log(`[WebRTC] Received WEBRTC_INIT from ${remoteUserId}`);
      // Tear down old peer connection for this user
      webRTCService.closePeerConnection(remoteUserId);
      // If we are the initiator (smaller ID), send offer
      if (roomUserId && roomUserId < remoteUserId) {
        webRTCService.initiateCall(remoteUserId);
      }
    });

    socketService.on(SOCKET_EVENTS.WEBRTC_OFFER, (data) => {
      const { senderRoomUserId, offer, context } = data;
      if (context === 'voice') {
        webRTCService.handleVoiceOffer(senderRoomUserId, offer);
        return;
      }
      webRTCService.handleOffer(senderRoomUserId, offer);
    });

    socketService.on(SOCKET_EVENTS.WEBRTC_ANSWER, (data) => {
      const { senderRoomUserId, answer, context } = data;
      if (context === 'voice') {
        webRTCService.handleVoiceAnswer(senderRoomUserId, answer);
        return;
      }
      webRTCService.handleAnswer(senderRoomUserId, answer);
    });

    socketService.on(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, (data) => {
      const { senderRoomUserId, candidate, context } = data;
      if (context === 'voice') {
        webRTCService.handleVoiceIceCandidate(senderRoomUserId, candidate);
        return;
      }
      webRTCService.handleIceCandidate(senderRoomUserId, candidate);
    });

    return () => {
      socketService.off(SOCKET_EVENTS.MESSAGE_RECEIVED);
      socketService.off(SOCKET_EVENTS.MESSAGE_DELETED);
      socketService.off(SOCKET_EVENTS.USER_JOINED);
      socketService.off(SOCKET_EVENTS.USER_LEFT);
      socketService.off(SOCKET_EVENTS.ROOM_USERS_UPDATED);
      socketService.off(SOCKET_EVENTS.TYPING_START);
      socketService.off(SOCKET_EVENTS.TYPING_STOP);
      socketService.off(SOCKET_EVENTS.ROOM_TERMINATION_WARNING);
      socketService.off(SOCKET_EVENTS.ROOM_TERMINATED);
      socketService.off(SOCKET_EVENTS.ROOM_DELETED);
      socketService.off(SOCKET_EVENTS.KICKED_FROM_ROOM);
      socketService.off(SOCKET_EVENTS.VOICE_CALL_USERS);
      socketService.off(SOCKET_EVENTS.VOICE_CALL_USER_JOINED);
      socketService.off(SOCKET_EVENTS.VOICE_CALL_USER_LEFT);
      socketService.off('connect', handleSocketConnect);

      // WebRTC Cleanups
      socketService.off(SOCKET_EVENTS.WEBRTC_INIT);
      socketService.off(SOCKET_EVENTS.WEBRTC_OFFER);
      socketService.off(SOCKET_EVENTS.WEBRTC_ANSWER);
      socketService.off(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE);
    };
  }, [addMessage, deleteMessage, addUser, removeUser, updateParticipants, addTypingUser, removeTypingUser, clearRoom, navigate, roomUserId, leaveVoiceCall, joinVoiceCall]);

  useEffect(() => {
    webRTCService.setOnRemoteVoiceStreamsChange(setRemoteVoiceStreams);
    return () => {
      webRTCService.setOnRemoteVoiceStreamsChange(null);
    };
  }, []);

  useEffect(() => {
    if (!currentRoom || !roomUserId || isInVoiceCall || isJoiningVoiceCall) return;
    if (sessionStorage.getItem('vanta_voice_call_active') === 'true') {
      const restoreTimer = setTimeout(() => {
        joinVoiceCall({ restore: true });
      }, 0);
      return () => clearTimeout(restoreTimer);
    }
  }, [currentRoom, roomUserId, isInVoiceCall, isJoiningVoiceCall, joinVoiceCall]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebRTC initialization and periodic peer syncing
  useEffect(() => {
    if (currentRoom && roomUserId) {
      console.log(`[WebRTC] Initializing local user ${roomUserId} in room ${currentRoom}`);
      webRTCService.setLocalUser(roomUserId);

      // Notify others we are ready to connect
      socketService.emit(SOCKET_EVENTS.WEBRTC_INIT);

      // Start connection with existing participants where we are the initiator
      participants.forEach(p => {
        if (p.roomUserId !== roomUserId) {
          if (roomUserId < p.roomUserId) {
            webRTCService.initiateCall(p.roomUserId);
          }
        }
      });
    }

    return () => {
      webRTCService.closeAll();
      webRTCService.closeAllVoiceConnections();
    };
  }, [currentRoom, roomUserId]);

  // Clean up stale WebRTC connections
  useEffect(() => {
    if (!currentRoom || !roomUserId) return;
    const activeParticipantIds = new Set(participants.map(p => p.roomUserId));
    for (const userId of webRTCService.peerConnections.keys()) {
      if (!activeParticipantIds.has(userId)) {
        console.log(`[WebRTC] Participant ${userId} is no longer in the room. Cleaning up connection.`);
        webRTCService.closePeerConnection(userId);
      }
    }
    for (const userId of webRTCService.voicePeerConnections.keys()) {
      if (!activeParticipantIds.has(userId)) {
        console.log(`[WebRTC-Voice] Participant ${userId} is no longer in the room. Cleaning up voice connection.`);
        webRTCService.closeVoicePeerConnection(userId);
      }
    }
  }, [participants, currentRoom, roomUserId]);

  // Lock document/body scrolling completely while inside the room page to prevent virtual keyboard upward layout shifts
  useEffect(() => {
    const origBodyOverflow = document.body.style.overflow;
    const origBodyPosition = document.body.style.position;
    const origBodyHeight = document.body.style.height;
    const origBodyWidth = document.body.style.width;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.height = '100%';
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';

    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.body.style.position = origBodyPosition;
      document.body.style.height = origBodyHeight;
      document.body.style.width = origBodyWidth;
      document.documentElement.style.overflow = origHtmlOverflow;
      document.documentElement.style.height = origHtmlHeight;
    };
  }, []);

  // Handle mobile visual viewport resizing (keyboard popups)
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      const visualHeight = window.visualViewport.height;
      const offsetTop = window.visualViewport.offsetTop;

      document.documentElement.style.setProperty('--visual-height', `${visualHeight}px`);
      document.documentElement.style.setProperty('--visual-top', `${offsetTop}px`);

      // Prevent automatic browser scroll adjustment
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;

      // Snap to bottom instantly to avoid smooth scroll animations fighting the viewport resize
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

      // Secondary snap in next tick to ensure layout has fully settled
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 30);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    // Initial run
    handleViewportChange();

    return () => {
      window.visualViewport.removeEventListener('resize', handleViewportChange);
      window.visualViewport.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Handle session recovery and redirects
  useEffect(() => {
    const cachedRoomId = sessionStorage.getItem('vanta_room_id');
    const cachedRoomUserId = sessionStorage.getItem('vanta_room_user_id');
    const cachedDisplayName = sessionStorage.getItem('vanta_display_name');
    const cachedHostAccessToken = sessionStorage.getItem('vanta_host_access_token');

    if (!currentRoom) {
      if (cachedRoomId === roomId && cachedDisplayName) {
        setRejoining(true);
        // Connect socket
        socketService.connect();

        joinRoom({
          roomId,
          displayName: cachedDisplayName,
          roomUserId: cachedRoomUserId,
          hostAccessToken: cachedHostAccessToken
        })
          .then((response) => {
            setRejoining(false);
            hasSynced.current = true;
            if (response && response.voiceParticipants) {
              setVoiceParticipants(response.voiceParticipants);
            }
          })
          .catch((err) => {
            console.error('[Room] Rejoin failed:', err);
            clearRoom();
            navigate(`/join/${roomId}`);
          });
      } else {
        // No session exists, redirect to home page join modal
        navigate(`/join/${roomId}`);
      }
    } else if (currentRoom !== roomId) {
      // Room mismatch
      navigate('/');
    } else if (!hasSynced.current) {
      // Sync local room state with the server if we already entered/created the room context
      // but haven't fetched the latest participants/messages since component mount.
      joinRoom({
        roomId,
        displayName: cachedDisplayName || displayName,
        roomUserId: cachedRoomUserId || roomUserId,
        hostAccessToken: cachedHostAccessToken
      })
        .then((response) => {
          hasSynced.current = true;
          if (response && response.voiceParticipants) {
            setVoiceParticipants(response.voiceParticipants);
          }
        })
        .catch((err) => {
          console.error('[Room] Sync failed:', err);
          clearRoom();
          navigate(`/join/${roomId}`);
        });
    }
  }, [currentRoom, roomId, joinRoom, navigate, displayName, roomUserId]);

  const handleLeaveRoom = () => {
    showConfirm({
      title: 'Leave Room?',
      message: 'You will disconnect from this conversation.',
      confirmLabel: 'Leave Room',
      cancelLabel: 'Cancel'
    }).then(confirmed => {
      if (confirmed) {
        leaveVoiceCall();
        leaveRoom();
        navigate('/');
      }
    });
  };

  const handleTerminateRoom = () => {
    showConfirm({
      title: 'Terminate Room?',
      message: 'Are you sure you want to terminate the room? All participants will be disconnected.',
      confirmLabel: 'Terminate',
      cancelLabel: 'Cancel'
    }).then(confirmed => {
      if (confirmed) {
        terminateRoom();
      }
    });
  };

  const handleRemoveUser = (targetRoomUserId, displayName) => {
    const hostAccessToken = sessionStorage.getItem('vanta_host_access_token');
    socketService.emit(SOCKET_EVENTS.KICK_USER, {
      roomId,
      targetRoomUserId,
      hostAccessToken
    }, (response) => {
      if (response && response.error) {
        showToast(`Failed to remove user: ${response.error}`, 'error');
      } else {
        showToast(`User ${displayName || ''} removed`, 'success');
        setActiveModal(null);
      }
    });
  };

  if (rejoining) {
    return (
      <div className="room-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--vanta-text-secondary)', fontSize: '14px', fontWeight: '500' }}>Restoring Vanta Session...</p>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div className="room-content-wrapper">
        <RoomHeader
          roomId={roomId || ''}
          totalUsers={totalUsers}
          maxUsers={roomSettings?.maxUsers}
          isHost={isHost}
          onShowParticipants={() => setActiveModal('participants')}
          onShowDetails={() => setActiveModal('details')}
          onShowManageUsers={() => setActiveModal('manage')}
          onTerminate={handleTerminateRoom}
          onLeaveRoom={handleLeaveRoom}
          isInVoiceCall={isInVoiceCall}
          isJoiningVoiceCall={isJoiningVoiceCall}
          isVoiceMuted={isVoiceMuted}
          isListenerOnly={isListenerOnly}
          voiceParticipants={voiceParticipants}
          maxVoiceParticipants={MAX_VOICE_PARTICIPANTS}
          onJoinCall={() => joinVoiceCall()}
          onLeaveCall={() => leaveVoiceCall()}
          onToggleMute={toggleVoiceMute}
          onToggleListenerOnly={toggleListenerOnly}
        />

        <ChatArea
          messages={messages}
          currentUserId={roomUserId || ''}
          isRoomDeleted={roomDeleted}
          messagesEndRef={messagesEndRef}
          roomId={roomId || ''}
        />

        <MessageInput
          onSendMessage={(content) => {
            socketService.sendMessage({
              roomId: currentRoom,
              senderDisplayName: displayName,
              content
            });
          }}
          onSendVoiceMessage={(mediaUrl, duration) => {
            socketService.emit('message-send', {
              roomId: currentRoom,
              senderDisplayName: displayName,
              content: '[Voice Message]',
              type: 'voice',
              mediaUrl,
              duration
            });
          }}
          onTypingStart={() => socketService.typingStart({ roomId: currentRoom, displayName })}
          onTypingStop={() => socketService.typingStop({ roomId: currentRoom, displayName })}
          disabled={roomDeleted}
          roomId={currentRoom || ''}
        />

        {activeModal === 'participants' && (
          <ParticipantList
            participants={participants}
            voiceParticipants={voiceParticipants}
            maxUsers={roomSettings?.maxUsers}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'details' && (
          <RoomDetailsModal
            settings={roomSettings}
            participants={participants}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'manage' && (
          <ManageUsersModal
            participants={participants}
            currentUserId={roomUserId || ''}
            onRemoveUser={handleRemoveUser}
            onClose={() => setActiveModal(null)}
          />
        )}
      </div>

      {/* Hidden audio elements for remote voice call streams */}
      <div className="voice-call-audio" aria-hidden="true" style={{ display: 'none' }}>
        {remoteVoiceStreams.map(({ roomUserId, stream }) => (
          <audio
            key={roomUserId}
            ref={(node) => {
              if (node && node.srcObject !== stream) {
                node.srcObject = stream;
              }
            }}
            autoPlay
          />
        ))}
      </div>
    </div>
  );
}
