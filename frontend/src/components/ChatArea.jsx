import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';
import '../css/ChatArea.css';

export default function ChatArea({
  messages,
  currentUserId,
  isRoomDeleted,
  messagesEndRef,
  roomId
}) {
  const { showToast } = useUI();
  const hasUserMessages = messages.some(msg => msg.type === 'user');

  const handleCopyLink = () => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const cleanAppUrl = appUrl.replace(/\/$/, '');
    const hasVantaPath = window.location.pathname.startsWith('/vanta') || cleanAppUrl.includes('/vanta');
    
    const inviteLink = hasVantaPath
      ? (cleanAppUrl.endsWith('/vanta') ? `${cleanAppUrl}/join/${roomId}` : `${cleanAppUrl}/vanta/join/${roomId}`)
      : `${cleanAppUrl}/join/${roomId}`;

    navigator.clipboard.writeText(inviteLink);
    showToast('Invite link copied to clipboard!', 'success');
  };

  const getInitials = (name) => {
    return name ? name.trim().charAt(0).toUpperCase() : '?';
  };

  // Helper to format system messages cleanly
  const getSystemIcon = (content) => {
    if (content.toLowerCase().includes('created')) return '✨';
    if (content.toLowerCase().includes('joined')) return '👤';
    if (content.toLowerCase().includes('left')) return '🚪';
    if (content.toLowerCase().includes('removed') || content.toLowerCase().includes('kick')) return '🚫';
    return '🔔';
  };

  return (
    <div className={`chat-area ${isRoomDeleted ? 'room-deleted' : ''}`}>
      <div className="messages-container">
        
        {/* Empty state card */}
        {!hasUserMessages && (
          <div className="vanta-empty-state">
            <div className="empty-state-card">
              <div className="empty-card-icon">✨</div>
              <h3>Room Created</h3>
              <p>Share the invite link to start the conversation.</p>
              <button onClick={handleCopyLink} className="btn-copy-invite">
                Copy Invite Link
              </button>
            </div>
          </div>
        )}

        {/* Message feed */}
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.messageId} className="system-message-row">
                <div className="system-message-content">
                  <span className="system-icon">{getSystemIcon(msg.content)}</span>
                  <span className="system-text">{msg.content}</span>
                  <span className="system-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            );
          }

          const isOwn = msg.senderId === currentUserId;
          const avatarLetter = getInitials(msg.senderDisplayName);

          return (
            <div
              key={msg.messageId}
              className={`message-row ${isOwn ? 'own' : ''}`}
            >
              <div className="message-avatar">
                {avatarLetter}
              </div>
              <div className="message-body">
                <div className="message-header-info">
                  <span className="message-sender-name">
                    {msg.senderDisplayName}
                    {msg.isHost && <span className="host-indicator-star">★</span>}
                  </span>
                  <span className="message-timestamp">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="message-text-content">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {isRoomDeleted && (
        <div className="room-deleted-overlay">
          <div className="room-deleted-message">
            Room has been deleted. Redirecting to home...
          </div>
        </div>
      )}
    </div>
  );
}

ChatArea.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUserId: PropTypes.string,
  isRoomDeleted: PropTypes.bool.isRequired,
  messagesEndRef: PropTypes.object,
  roomId: PropTypes.string.isRequired
};
