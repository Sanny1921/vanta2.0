import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';
import '../css/ParticipantList.css';

export default function ManageUsersModal({
  participants,
  currentUserId,
  onRemoveUser,
  onClose
}) {
  const otherParticipants = participants.filter(p => p.roomUserId !== currentUserId);
  const { showConfirm } = useUI();

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleButtonClick = (userId, displayName) => {
    showConfirm({
      title: 'Remove User?',
      message: `Are you sure you want to remove ${displayName} from this room?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    }).then((confirmed) => {
      if (confirmed) {
        onRemoveUser(userId, displayName);
      }
    });
  };

  return (
    <div className="participant-list-overlay" onClick={onClose}>
      <div className="participant-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="participant-list-header">
          <h2>Manage Users</h2>
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="participant-list-content">
          {otherParticipants.length === 0 ? (
            <p className="no-participants" style={{ textAlign: 'center', padding: '20px 0', color: 'var(--vanta-text-secondary)' }}>
              No other participants to manage.
            </p>
          ) : (
            <ul className="participant-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {otherParticipants.map((user) => {
                return (
                  <li key={user.roomUserId} className="participant-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--vanta-border)' }}>
                    <span className="participant-name" style={{ color: 'var(--vanta-text-primary)', fontWeight: '500' }}>
                      {user.displayName}
                    </span>
                    <button
                      type="button"
                      className="btn-remove-user"
                      onClick={() => handleButtonClick(user.roomUserId, user.displayName)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: '85px',
                        textAlign: 'center'
                      }}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

ManageUsersModal.propTypes = {
  participants: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUserId: PropTypes.string.isRequired,
  onRemoveUser: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};
