import PropTypes from 'prop-types';
import '../css/ParticipantList.css';

export default function ParticipantList({
  participants,
  voiceParticipants,
  maxUsers,
  onClose
}) {
  const limit = maxUsers || 15;
  const waitingCount = Math.max(0, limit - participants.length);

  return (
    <div className="participant-list-overlay" onClick={onClose}>
      <div className="participant-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="participant-list-header">
          <h2>Participants</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="participant-list-content">
          <ul className="participant-list">
            {participants.map((user) => {
              const voiceUser = voiceParticipants?.find(vp => vp.roomUserId === user.roomUserId);
              return (
                <li key={user.roomUserId} className="participant-item">
                  <span className="status-dot online"></span>
                  <span className="participant-name">
                    {user.displayName}
                    {user.isHost && <span className="host-badge">(Host)</span>}
                    {voiceUser && voiceUser.isListenerOnly && (
                      <span className="voice-status-icon" title="Listener Mode">🎧</span>
                    )}
                    {voiceUser && voiceUser.isMuted && !voiceUser.isListenerOnly && (
                      <span className="voice-status-icon" title="Muted">🔇</span>
                    )}
                  </span>
                </li>
              );
            })}

            {Array.from({ length: waitingCount }).map((_, idx) => (
              <li key={`waiting-${idx}`} className="participant-item waiting">
                <span className="status-dot offline"></span>
                <span className="participant-name waiting-text">
                  Waiting...
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

ParticipantList.propTypes = {
  participants: PropTypes.arrayOf(PropTypes.object).isRequired,
  voiceParticipants: PropTypes.arrayOf(PropTypes.object),
  maxUsers: PropTypes.number,
  onClose: PropTypes.func.isRequired
};
