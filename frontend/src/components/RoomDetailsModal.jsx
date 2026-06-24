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
            <span className="details-chip host">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              {hostName}
            </span>
          </div>

          <div className="details-row">
            <span className="details-label">Capacity</span>
            <span className="details-chip capacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {participants.length} / {settings?.maxUsers || 15}
            </span>
          </div>

          <div className="details-row">
            <span className="details-label">Retention Policy</span>
            <span className="details-chip policy">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Delete after {policyText}
            </span>
          </div>

          <div className="details-row">
            <span className="details-label">Privacy Status</span>
            <span className={`details-chip ${settings?.hasPassword ? 'private' : 'public'}`}>
              {settings?.hasPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
              )}
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
