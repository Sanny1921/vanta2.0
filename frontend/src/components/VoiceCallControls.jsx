import PropTypes from 'prop-types';
import '../css/VoiceCallControls.css';

const MicIcon = ({ muted = false }) => (
  <svg className="voice-call-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="8" y1="22" x2="16" y2="22"></line>
    {muted && <line x1="3" y1="3" x2="21" y2="21"></line>}
  </svg>
);

const HeadphonesIcon = ({ size = 16 }) => (
  <svg className="voice-call-icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
  </svg>
);

const PhoneIcon = () => (
  <svg className="voice-call-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92Z"></path>
  </svg>
);

export default function VoiceCallControls({
  isInCall,
  isJoining,
  isMuted,
  isListenerOnly,
  participants,
  participantCount,
  maxParticipants,
  onJoinCall,
  onLeaveCall,
  onToggleMute,
  onToggleListenerOnly,
  onClose
}) {
  return (
    <div className="voice-call-modal-panel" role="dialog" aria-label="Voice call panel">
      {/* Panel Header */}
      <div className="vcm-header">
        <div className="vcm-status">
          <span className={`vcm-dot ${isInCall ? 'active' : ''}`}></span>
          <span className="vcm-title">Voice Call</span>
          <span className="vcm-count">{participantCount}/{maxParticipants}</span>
        </div>
        {onClose && (
          <button className="vcm-close-btn" onClick={onClose} aria-label="Close voice panel" title="Close panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="vcm-actions">
        {!isInCall && (
          <button
            type="button"
            className={`voice-call-mode ${isListenerOnly ? 'selected' : ''}`}
            onClick={onToggleListenerOnly}
            title="Listener-only mode"
            aria-pressed={isListenerOnly}
          >
            <HeadphonesIcon />
            <span>Listen Only</span>
          </button>
        )}

        {isInCall && !isListenerOnly && (
          <button
            type="button"
            className={`voice-call-button ${isMuted ? 'muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={isMuted}
          >
            <MicIcon muted={isMuted} />
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}

        {isInCall ? (
          <button
            type="button"
            className="voice-call-button leave"
            onClick={onLeaveCall}
            title="Leave call"
          >
            <PhoneIcon />
            <span>Leave Call</span>
          </button>
        ) : (
          <button
            type="button"
            className="voice-call-button join"
            onClick={onJoinCall}
            disabled={isJoining}
            title={isListenerOnly ? 'Join as listener' : 'Join call'}
          >
            {isListenerOnly ? <HeadphonesIcon /> : <MicIcon />}
            <span>{isJoining ? 'Joining…' : 'Join Call'}</span>
          </button>
        )}
      </div>

      {/* Participant List */}
      {isInCall && participants && participants.length > 0 && (
        <div className="vcm-participants">
          <span className="vcm-participants-label">In Call</span>
          <ul className="vcm-participant-list">
            {participants.map((p) => (
              <li key={p.roomUserId} className="vcm-participant-item">
                <span className="vcm-participant-name">{p.displayName || 'Anonymous'}</span>
                <div className="vcm-participant-badges">
                  {p.isListenerOnly && (
                    <span className="vcm-badge listener" title="Listener only">
                      <HeadphonesIcon size={11} />
                    </span>
                  )}
                  {p.isMuted && !p.isListenerOnly && (
                    <span className="vcm-badge muted" title="Muted">
                      <MicIcon muted={true} />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}

VoiceCallControls.propTypes = {
  isInCall: PropTypes.bool.isRequired,
  isJoining: PropTypes.bool.isRequired,
  isMuted: PropTypes.bool.isRequired,
  isListenerOnly: PropTypes.bool.isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({
    roomUserId: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    isMuted: PropTypes.bool,
    isListenerOnly: PropTypes.bool
  })),
  participantCount: PropTypes.number.isRequired,
  maxParticipants: PropTypes.number.isRequired,
  onJoinCall: PropTypes.func.isRequired,
  onLeaveCall: PropTypes.func.isRequired,
  onToggleMute: PropTypes.func.isRequired,
  onToggleListenerOnly: PropTypes.func.isRequired,
  onClose: PropTypes.func
};

MicIcon.propTypes = {
  muted: PropTypes.bool
};

HeadphonesIcon.propTypes = {
  size: PropTypes.number
};
