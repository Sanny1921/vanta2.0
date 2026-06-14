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
  const policyText = `Auto-delete after ${autoDeleteMins} minute${autoDeleteMins > 1 ? 's' : ''}`;

  return (
    <div className="participant-list-overlay" onClick={onClose}>
      <div className="participant-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="participant-list-header">
          <h2>Room Details</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="participant-list-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--vanta-border)', paddingBottom: '12px' }}>
            <span style={{ color: 'var(--vanta-text-secondary)', fontSize: '14px' }}>Created By</span>
            <span style={{ fontWeight: '600', color: 'var(--vanta-text-primary)' }}>{hostName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--vanta-border)', paddingBottom: '12px' }}>
            <span style={{ color: 'var(--vanta-text-secondary)', fontSize: '14px' }}>Room Capacity</span>
            <span style={{ fontWeight: '600', color: 'var(--vanta-text-primary)' }}>
              {participants.length} / {settings?.maxUsers || 5}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--vanta-border)', paddingBottom: '12px' }}>
            <span style={{ color: 'var(--vanta-text-secondary)', fontSize: '14px' }}>Message Policy</span>
            <span style={{ fontWeight: '600', color: 'var(--vanta-text-primary)' }}>{policyText}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
            <span style={{ color: 'var(--vanta-text-secondary)', fontSize: '14px' }}>Privacy Status</span>
            <span style={{ fontWeight: '600', color: settings?.hasPassword ? '#f87171' : '#4ade80' }}>
              {settings?.hasPassword ? '🔒 Password Protected' : '🔓 Public'}
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
