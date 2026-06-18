import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';
import { getAppUrl } from '../config/constants';
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
    const appUrl = getAppUrl();
    return `${appUrl}/join/${roomId}`;
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
                <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
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
                <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                <span className="item-text">Copy Invite Link</span>
              </button>

              <button
                className="dropdown-item"
                onClick={() => {
                  onShowParticipants();
                  setShowDropdown(false);
                }}
              >
                <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span className="item-text">Participants ({totalUsers}/{maxUsers || 15})</span>
              </button>

              <button
                className="dropdown-item"
                onClick={() => {
                  onShowDetails();
                  setShowDropdown(false);
                }}
              >
                <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
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
                  <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span className="item-text">Manage Users</span>
                </button>

                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    onTerminate();
                    setShowDropdown(false);
                  }}
                >
                  <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
                <svg className="item-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
