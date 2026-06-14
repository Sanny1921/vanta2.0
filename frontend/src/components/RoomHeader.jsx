import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';
import '../css/RoomHeader.css';

export default function RoomHeader({
  roomId,
  totalUsers,
  maxUsers,
  isHost,
  onShowParticipants,
  onShowDetails,
  onShowManageUsers,
  onTerminate,
  onLeaveRoom
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { showToast } = useUI();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const getInviteLink = () => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const cleanAppUrl = appUrl.replace(/\/$/, '');
    const hasVantaPath = window.location.pathname.startsWith('/vanta') || cleanAppUrl.includes('/vanta');
    return hasVantaPath
      ? (cleanAppUrl.endsWith('/vanta') ? `${cleanAppUrl}/join/${roomId}` : `${cleanAppUrl}/vanta/join/${roomId}`)
      : `${cleanAppUrl}/join/${roomId}`;
  };

  return (
    <header className="room-header">
      <div className="room-header-left">
        <h1 className="room-title">VANTA</h1>
      </div>

      <div className="room-header-right" ref={dropdownRef}>
        <button
          className="btn-menu-trigger"
          onClick={() => setShowDropdown(!showDropdown)}
          aria-label="Room options"
        >
          ⋮
        </button>

        {showDropdown && (
          <div className="vanta-dropdown">
            <div className="dropdown-section">
              <span className="dropdown-section-title">ROOM</span>
              
              <button 
                className="dropdown-item" 
                onClick={() => {
                  copyToClipboard(roomId, 'Room ID');
                  setShowDropdown(false);
                }}
              >
                <span className="item-icon">#</span>
                <span className="item-text">Room ID</span>
                <span className="item-value">{roomId}</span>
              </button>

              <button 
                className="dropdown-item" 
                onClick={() => {
                  copyToClipboard(getInviteLink(), 'Invite Link');
                  setShowDropdown(false);
                }}
              >
                <span className="item-icon">🔗</span>
                <span className="item-text">Copy Invite Link</span>
              </button>

              <button 
                className="dropdown-item" 
                onClick={() => {
                  onShowParticipants();
                  setShowDropdown(false);
                }}
              >
                <span className="item-icon">👥</span>
                <span className="item-text">Participants ({totalUsers}/{maxUsers || 5})</span>
              </button>

              <button 
                className="dropdown-item" 
                onClick={() => {
                  onShowDetails();
                  setShowDropdown(false);
                }}
              >
                <span className="item-icon">ℹ️</span>
                <span className="item-text">Room Details</span>
              </button>
            </div>

            {isHost && (
              <div className="dropdown-section border-top">
                <span className="dropdown-section-title">HOST OPTIONS</span>

                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    onShowManageUsers();
                    setShowDropdown(false);
                  }}
                >
                  <span className="item-icon">👤</span>
                  <span className="item-text">Manage Users</span>
                </button>

                <button 
                  className="dropdown-item danger" 
                  onClick={() => {
                    onTerminate();
                    setShowDropdown(false);
                  }}
                >
                  <span className="item-icon">🗑️</span>
                  <span className="item-text">Terminate Room</span>
                </button>
              </div>
            )}

            <div className="dropdown-section border-top">
              <button 
                className="dropdown-item leave-btn" 
                onClick={() => {
                  onLeaveRoom();
                  setShowDropdown(false);
                }}
              >
                <span className="item-icon">↪️</span>
                <span className="item-text">Leave Room</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

RoomHeader.propTypes = {
  roomId: PropTypes.string.isRequired,
  totalUsers: PropTypes.number.isRequired,
  maxUsers: PropTypes.number,
  isHost: PropTypes.bool.isRequired,
  onShowParticipants: PropTypes.func.isRequired,
  onShowDetails: PropTypes.func.isRequired,
  onShowManageUsers: PropTypes.func.isRequired,
  onTerminate: PropTypes.func.isRequired,
  onLeaveRoom: PropTypes.func.isRequired
};
