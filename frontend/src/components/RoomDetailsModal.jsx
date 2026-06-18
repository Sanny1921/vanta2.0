import PropTypes from 'prop-types';
import '../css/ParticipantList.css'; // Reuse overlay/modal styles for consistency

export default function RoomDetailsModal({
  settings,
  participants,
  onClose
}) {
  const host = participants.find(p => p.isHost);
  const hostName = host ? host.displayName : 'Unknown';

  // Format message policy
  const autoDeleteMins = settings?.autoDeleteMinutes || 1;
  const policyText = `${autoDeleteMins} min${autoDeleteMins > 1 ? 's' : ''}`;

  return (
    <div className="participant-list-overlay" onClick={onClose}>
      <div className="participant-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="participant-list-header">
          <h2>Room Details</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="participant-list-content">
          <div className="details-row">
            <span className="details-label">Created By</span>
            <span className="details-chip host">{hostName}</span>
          </div>

          <div className="details-row">
            <span className="details-label">Capacity</span>
            <span className="details-chip capacity">
              {participants.length} / {settings?.maxUsers || 15}
            </span>
          </div>

          <div className="details-row">
            <span className="details-label">Retention Policy</span>
            <span className="details-chip policy">Delete after {policyText}</span>
          </div>

          <div className="details-row">
            <span className="details-label">Privacy Status</span>
            <span className={`details-chip ${settings?.hasPassword ? 'private' : 'public'}`}>
              {settings?.hasPassword ? 'Private' : 'Public'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

RoomDetailsModal.propTypes = {
  settings: PropTypes.object,
  participants: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired
};
