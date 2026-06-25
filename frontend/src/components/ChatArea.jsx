import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';
import { getAppUrl } from '../config/constants';
import VoicePlayer from './VoicePlayer';
import '../css/ChatArea.css';

export default function ChatArea({
  messages,
  currentUserId,
  isRoomDeleted,
  messagesEndRef,
  roomId,
  onReply
}) {
  const { showToast } = useUI();
  const hasUserMessages = messages.some(msg => msg.type === 'user' || msg.type === 'voice');

  const handleCopyLink = () => {
    const appUrl = getAppUrl();
    const inviteLink = `${appUrl}/join/${roomId}`;

    navigator.clipboard.writeText(inviteLink);
    showToast('Invite link copied to clipboard!', 'success');
  };

  const getInitials = (name) => {
    return name ? name.trim().charAt(0).toUpperCase() : '?';
  };

  const formatVoiceDuration = (seconds) => {
    if (isNaN(seconds) || seconds === null || seconds === undefined) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleReplyClick = (replyToId) => {
    const originalEl = document.getElementById(`msg-${replyToId}`);
    if (originalEl) {
      originalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      originalEl.classList.remove('highlight-flash');
      void originalEl.offsetWidth; // force repaint
      originalEl.classList.add('highlight-flash');
      setTimeout(() => {
        originalEl.classList.remove('highlight-flash');
      }, 1000);
    }
  };

  const renderReplyPreview = (msg) => {
    if (!msg.replyTo) return null;
    const originalMessage = messages.find(m => m.messageId === msg.replyTo);
    if (originalMessage) {
      return (
        <div 
          className="message-reply-preview clickable"
          onClick={() => handleReplyClick(msg.replyTo)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="reply-preview-icon" style={{ color: 'var(--vanta-accent)', flexShrink: 0 }}><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          <span className="reply-preview-sender">{originalMessage.senderDisplayName}</span>
          <span className="reply-preview-text">
            {originalMessage.type === 'voice' 
              ? `Voice message • ${formatVoiceDuration(originalMessage.duration)}` 
              : originalMessage.content}
          </span>
        </div>
      );
    } else {
      return (
        <div className="message-reply-preview expired">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="reply-preview-icon" style={{ color: 'var(--vanta-text-muted)', flexShrink: 0 }}><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          <span className="reply-preview-text">Reply to expired message</span>
        </div>
      );
    }
  };

  // Helper to format system messages cleanly with SVG icons
  const renderSystemIcon = (content) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('created')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14"/></svg>
      );
    }
    if (lowerContent.includes('joined')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
      );
    }
    if (lowerContent.includes('left')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      );
    }
    if (lowerContent.includes('removed') || lowerContent.includes('kick')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    );
  };

  return (
    <div className={`chat-area ${isRoomDeleted ? 'room-deleted' : ''}`}>
      <div className="messages-container">
        
        {/* Empty state card */}
        {!hasUserMessages && (
          <div className="vanta-empty-state">
            <div className="empty-state-card">
              <div className="empty-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
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
                  <span className="system-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {renderSystemIcon(msg.content)}
                  </span>
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
              id={`msg-${msg.messageId}`}
              className={`message-row ${isOwn ? 'own' : ''}`}
            >
              <div className="message-avatar">
                {avatarLetter}
              </div>
              <div className="message-body">
                <div className="message-header-info">
                  <span className="message-sender-name">
                    {msg.senderDisplayName}
                    {msg.isHost && (
                      <span className="host-badge" title="Room Host">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      </span>
                    )}
                  </span>
                  <span className="message-timestamp">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {!isRoomDeleted && onReply && (
                    <button
                      type="button"
                      className="btn-message-reply"
                      onClick={() => onReply(msg)}
                      title="Reply to message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                      <span>Reply</span>
                    </button>
                  )}
                </div>
                {renderReplyPreview(msg)}
                <div className="message-text-content">
                  {msg.type === 'voice' ? (
                    <VoicePlayer
                      src={msg.mediaUrl}
                      duration={msg.duration}
                      messageId={msg.messageId}
                      roomId={roomId}
                    />
                  ) : (
                    msg.content
                  )}
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
  roomId: PropTypes.string.isRequired,
  onReply: PropTypes.func
};
