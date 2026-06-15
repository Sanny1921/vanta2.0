import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useUI } from '../context/UIContext';
import socketService from '../services/socketService';
import { SOCKET_EVENTS, SYSTEM_MESSAGE_TYPES } from '../config/constants';
import ParticipantList from '../components/ParticipantList';
import ChatArea from '../components/ChatArea';
import MessageInput from '../components/MessageInput';
import RoomHeader from '../components/RoomHeader';
import RoomDetailsModal from '../components/RoomDetailsModal';
import ManageUsersModal from '../components/ManageUsersModal';
import '../css/Room.css';

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
  const messagesEndRef = useRef(null);
  const [rejoining, setRejoining] = useState(() => {
    const cachedRoomId = sessionStorage.getItem('vanta_room_id');
    const cachedDisplayName = sessionStorage.getItem('vanta_display_name');
    return (!currentRoom && cachedRoomId === roomId && cachedDisplayName);
  });

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
        type: 'user'
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
    };
  }, [addMessage, deleteMessage, addUser, removeUser, updateParticipants, addTypingUser, removeTypingUser, clearRoom, navigate]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          .then(() => {
            setRejoining(false);
          })
          .catch((err) => {
            console.error('[Room] Rejoin failed:', err);
            sessionStorage.removeItem('vanta_room_id');
            sessionStorage.removeItem('vanta_room_user_id');
            sessionStorage.removeItem('vanta_display_name');
            sessionStorage.removeItem('vanta_host_access_token');
            navigate(`/join/${roomId}`);
          });
      } else {
        // No session exists, redirect to home page join modal
        navigate(`/join/${roomId}`);
      }
    } else if (currentRoom !== roomId) {
      // Room mismatch
      navigate('/');
    }
  }, [currentRoom, roomId, joinRoom, navigate]);

  const handleLeaveRoom = () => {
    showConfirm({
      title: 'Leave Room?',
      message: 'You will disconnect from this conversation.',
      confirmLabel: 'Leave Room',
      cancelLabel: 'Cancel'
    }).then(confirmed => {
      if (confirmed) {
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
          onTypingStart={() => socketService.typingStart({ roomId: currentRoom, displayName })}
          onTypingStop={() => socketService.typingStop({ roomId: currentRoom, displayName })}
          disabled={roomDeleted}
        />

        {activeModal === 'participants' && (
          <ParticipantList
            participants={participants}
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
    </div>
  );
}
