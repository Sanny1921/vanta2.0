import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import socketService from '../services/socketService';
import '../css/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { createRoom, joinRoom, setError, error } = useRoom();
  const [loading, setLoading] = useState(false);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Modal control states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);

  // Create room form
  const [createForm, setCreateForm] = useState({
    hostDisplayName: '',
    token: '',
    memberLimit: '5',
    password: ''
  });

  // Check if token is required based on member limit
  const memberLimitNum = parseInt(createForm.memberLimit);
  const tokenRequired = memberLimitNum > 5;

  // Join room form
  const [joinForm, setJoinForm] = useState({
    roomId: '',
    displayName: ''
  });

  // Initialize socket
  useEffect(() => {
    socketService.connect();
  }, []);

  // Pre-fill room ID from invite link and open join modal
  useEffect(() => {
    if (roomId) {
      setIsJoinModalOpen(true);
      setJoinForm((prev) => ({
        ...prev,
        roomId: roomId.toUpperCase()
      }));
    }
  }, [roomId]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate token requirement
    if (tokenRequired && !createForm.token.trim()) {
      setError('Token required for member limits above 5');
      setLoading(false);
      return;
    }

    try {
      const response = await createRoom({
        hostDisplayName: createForm.hostDisplayName,
        token: createForm.token || null,
        memberLimit: parseInt(createForm.memberLimit) || 5,
        password: createForm.password || null
      });

      // Close create modal and show details screen
      setIsCreateModalOpen(false);
      
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const resolvedRoomUrl = response.roomUrl && response.roomUrl.startsWith('http')
        ? response.roomUrl
        : `${appUrl}${response.roomUrl || `/join/${response.roomId}`}`;

      setCreatedRoomData({
        roomId: response.roomId,
        roomUrl: resolvedRoomUrl,
        password: createForm.password || null,
        settings: response.settings
      });
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await joinRoom({
        roomId: joinForm.roomId.toUpperCase(),
        displayName: joinForm.displayName
      });

      // Close modal on successful transition
      setIsJoinModalOpen(false);

      if (response.requiresPassword) {
        // Navigate to password screen
        navigate(`/join/${joinForm.roomId.toUpperCase()}/password`, {
          state: { displayName: joinForm.displayName }
        });
      } else {
        // Navigate to room
        navigate(`/room/${joinForm.roomId.toUpperCase()}`);
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (createdRoomData) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join Vanta Room',
            text: `Join my secure temporary chat room on Vanta. Room ID: ${createdRoomData.roomId}`,
            url: createdRoomData.roomUrl
          });
        } catch (err) {
          console.error('Error sharing:', err);
        }
      } else {
        navigator.clipboard.writeText(createdRoomData.roomUrl);
        alert('Invite Link copied to clipboard!');
      }
    }
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsJoinModalOpen(false);
    setError(null);
  };

  const toggleFaq = (index) => {
    setActiveFaqIndex(activeFaqIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: "Do I need an account?",
      answer: "No. Vanta does not require accounts. Create a room, share the link, and start talking. Think of Vanta as a temporary meeting point on the internet."
    },
    {
      question: "What happens when a room expires?",
      answer: "Once the lifespan of a room expires, it is permanently deleted from our server. All connected users are disconnected, and all chat history is immediately wiped from memory."
    },
    {
      question: "Are messages permanent?",
      answer: "No. Messages automatically self-destruct after the room's message retention timer (e.g. 5 minutes) expires. They are stored only in volatile memory on the server and are never persisted to any database."
    },
    {
      question: "What are tokens?",
      answer: "Tokens are optional premium keys that unlock enhanced room capabilities, such as longer room lifespans (up to 2 hours), larger participant limits (up to 100 members), and customizable message retention times."
    },
    {
      question: "Can I password protect a room?",
      answer: "Yes. When creating a room, you can set an optional password. Anyone who tries to join your room via ID or invite link will be prompted to verify the password before being granted entry."
    }
  ];

  if (createdRoomData) {
    return (
      <div className="home-container">
        <header className="home-header">
          <h1>Vanta</h1>
          <p className="tagline">Room Successfully Created</p>
        </header>

        <div className="form-container room-created-card">
          <h2>Room Details</h2>

          <div className="info-item">
            <span className="info-label">Room ID</span>
            <div className="info-value-group">
              <span className="info-value highlight">{createdRoomData.roomId}</span>
              <button 
                type="button" 
                className="btn-copy-small" 
                onClick={() => {
                  navigator.clipboard.writeText(createdRoomData.roomId);
                  alert('Room ID copied to clipboard!');
                }}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="info-item">
            <span className="info-label">Invite Link</span>
            <div className="info-value-group">
              <span className="info-value truncate">{createdRoomData.roomUrl}</span>
              <button 
                type="button" 
                className="btn-copy-small" 
                onClick={() => {
                  navigator.clipboard.writeText(createdRoomData.roomUrl);
                  alert('Invite Link copied to clipboard!');
                }}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="info-item">
            <span className="info-label">Password</span>
            <div className="info-value-group">
              <span className="info-value">
                {createdRoomData.password 
                  ? (showPassword ? createdRoomData.password : '••••••••') 
                  : 'None'}
              </span>
              {createdRoomData.password && (
                <button 
                  type="button" 
                  className="btn-eye-small" 
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              )}
            </div>
          </div>

          <div className="info-grid">
            <div className="info-grid-item">
              <span className="info-label">Lifespan</span>
              <span className="info-value">{createdRoomData.settings.roomLifespanMinutes} mins</span>
            </div>
            <div className="info-grid-item">
              <span className="info-label">Retention</span>
              <span className="info-value">{createdRoomData.settings.autoDeleteMinutes} mins</span>
            </div>
            <div className="info-grid-item">
              <span className="info-label">Max Users</span>
              <span className="info-value">{createdRoomData.settings.maxUsers}</span>
            </div>
          </div>

          <div className="button-group created-btn-group">
            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => navigate(`/room/${createdRoomData.roomId}`)}
            >
              Enter Room
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleShare}
            >
              Share Link
            </button>
          </div>
        </div>

        <footer className="home-footer">
          <p>Temporary. Lightweight. Fast.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <nav className="vanta-navbar">
        <div className="navbar-logo">
          <span className="logo-icon">▲</span> Vanta
        </div>
        <div className="navbar-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#tokens">Tokens</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="navbar-actions">
          <button className="btn-navbar-secondary" onClick={() => setIsJoinModalOpen(true)}>
            Join Room
          </button>
          <button className="btn-navbar-primary" onClick={() => setIsCreateModalOpen(true)}>
            Create Room
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header id="home" className="hero-section">
        <div className="hero-badge">No accounts. No permanent history. No clutter.</div>
        <h1 className="hero-title">
          Create.<br />
          Share.<br />
          Talk.<br />
          <span>Disappear.</span>
        </h1>
        <p className="hero-subheading">A temporary meeting point on the internet.</p>
        <p className="hero-description">
          Vanta creates temporary communication spaces where rooms and messages automatically expire.
        </p>
        <div className="hero-buttons">
          <button className="btn-hero-primary" onClick={() => setIsCreateModalOpen(true)}>
            Create Room
          </button>
          <button className="btn-hero-secondary" onClick={() => setIsJoinModalOpen(true)}>
            Join Room
          </button>
        </div>
      </header>

      {/* HOW VANTA WORKS */}
      <section id="how-it-works" className="section how-it-works">
        <h2 className="section-title">How Vanta Works</h2>
        <div className="flow-container">
          <div className="flow-step">
            <div className="step-icon">🏗️</div>
            <h3>Create Room</h3>
            <p>Set a custom limit, optional password, or use a token.</p>
          </div>
          <div className="flow-arrow">➔</div>
          <div className="flow-step">
            <div className="step-icon">🔗</div>
            <h3>Share Link</h3>
            <p>Copy the secure invite link or unique room ID.</p>
          </div>
          <div className="flow-arrow">➔</div>
          <div className="flow-step">
            <div className="step-icon">👥</div>
            <h3>People Join</h3>
            <p>Participants join instantly without any registrations.</p>
          </div>
          <div className="flow-arrow">➔</div>
          <div className="flow-step">
            <div className="step-icon">💬</div>
            <h3>Talk</h3>
            <p>Chat in real-time as messages automatically expire.</p>
          </div>
          <div className="flow-arrow">➔</div>
          <div className="flow-step">
            <div className="step-icon">⏱️</div>
            <h3>Room Expires</h3>
            <p>The entire room disappears forever once the timer runs out.</p>
          </div>
        </div>
      </section>

      {/* WHY VANTA EXISTS */}
      <section className="section why-exists">
        <h2 className="section-title">Not Every Conversation Needs To Last Forever</h2>
        <p className="section-subtitle">
          Most chat apps store your history indefinitely. Vanta is built for quick, temporary sessions:
        </p>
        <div className="exists-grid">
          <div className="exists-card">
            <h4>Study Groups</h4>
            <p>Work on assignments, discuss problems, and clear the room when finished.</p>
          </div>
          <div className="exists-card">
            <h4>Planning Sessions</h4>
            <p>Brainstorm layouts, outline tasks, and share sensitive ideas temporarily.</p>
          </div>
          <div className="exists-card">
            <h4>Quick Discussions</h4>
            <p>Ad-hoc check-ins where you don't need a persistent chat history trail.</p>
          </div>
          <div className="exists-card">
            <h4>Temporary Communities</h4>
            <p>Gather people for an event, webinar, or game lobby that has a clear end time.</p>
          </div>
        </div>
      </section>

      {/* TOKENS SECTION */}
      <section id="tokens" className="section tokens-section">
        <h2 className="section-title">Token Enhanced Rooms</h2>
        <p className="section-subtitle">
          Tokens unlock enhanced room capabilities for heavier workloads and events.
        </p>
        <div className="tokens-layout">
          <div className="tokens-benefits">
            <div className="benefit-item">
              <span className="benefit-check">✓</span>
              <div>
                <h5>Longer Lifespan</h5>
                <p>Extend room longevity up to 2 hours (default limit is 5 minutes).</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-check">✓</span>
              <div>
                <h5>More Participants</h5>
                <p>Increase room capacity up to 100+ concurrent members.</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-check">✓</span>
              <div>
                <h5>Longer Message Retention</h5>
                <p>Keep messages alive up to 15 minutes before they auto-delete.</p>
              </div>
            </div>
          </div>

          <div className="token-card-preview">
            <div className="token-card-header">
              <span className="token-badge">PREMIUM TOKEN</span>
              <span className="token-key-display">PREMIUM-001-XYZ</span>
            </div>
            <div className="token-card-body">
              <div className="token-stat">
                <span>Max Capacity:</span>
                <strong>100 users</strong>
              </div>
              <div className="token-stat">
                <span>Lifespan:</span>
                <strong>120 minutes</strong>
              </div>
              <div className="token-stat">
                <span>Retention:</span>
                <strong>15 minutes</strong>
              </div>
            </div>
            <div className="token-card-footer">
              <small>Try using token keys to unlock perks.</small>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="section features-section">
        <h2 className="section-title">Product Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚪</div>
            <h3>Temporary Rooms</h3>
            <p>Rooms automatically self-destruct once empty, inactive, or after lifespan expiration.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗑️</div>
            <h3>Message Auto Deletion</h3>
            <p>Messages exist only in volatile server memory and auto-delete on a strict rolling timer.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Communication</h3>
            <p>Instant socket-driven communication, message synchronization, and typing indicators.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Password Protected Rooms</h3>
            <p>Optional room lock configuration to keep conversations private and restricted.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔑</div>
            <h3>Token Enhanced Rooms</h3>
            <p>Unlock custom parameters using premium keys without account registrations.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👤</div>
            <h3>No Account Required</h3>
            <p>Zero registration, zero trackable profile data, zero personal identities retained.</p>
          </div>
        </div>
      </section>

      {/* HOW TO USE VANTA */}
      <section className="section how-to-use">
        <h2 className="section-title">How To Use Vanta</h2>
        <div className="timeline-container">
          <div className="timeline-item">
            <div className="timeline-number">1</div>
            <div className="timeline-content">
              <h3>Create Room</h3>
              <p>Configure details like member limits and optional passwords.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-number">2</div>
            <div className="timeline-content">
              <h3>Share Link</h3>
              <p>Send the unique URL or ID to invite your participants.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-number">3</div>
            <div className="timeline-content">
              <h3>Join Conversation</h3>
              <p>Discuss in real-time with automatic message removal.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-number">4</div>
            <div className="timeline-content">
              <h3>Room Expires</h3>
              <p>All traces of the chat are immediately deleted once empty or expired.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="section faq-section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqItems.map((item, index) => (
            <div className={`faq-item ${activeFaqIndex === index ? 'active' : ''}`} key={index}>
              <button className="faq-question" onClick={() => toggleFaq(index)}>
                <span>{item.question}</span>
                <span className="faq-arrow">{activeFaqIndex === index ? '▲' : '▼'}</span>
              </button>
              <div className="faq-answer">
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section cta-section">
        <div className="cta-content">
          <h2>Start Your Temporary Conversation</h2>
          <p>Create a room. Invite people. Talk freely.</p>
          <div className="cta-buttons">
            <button className="btn-hero-primary" onClick={() => setIsCreateModalOpen(true)}>
              Create Room
            </button>
            <button className="btn-hero-secondary" onClick={() => setIsJoinModalOpen(true)}>
              Join Room
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <h4>Vanta</h4>
            <p>Temporary Communication Platform</p>
          </div>
          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#tokens">Tokens</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-actions">
            <button onClick={() => setIsJoinModalOpen(true)}>Join Room</button>
            <button onClick={() => setIsCreateModalOpen(true)}>Create Room</button>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Vanta. All rights reserved.</p>
        </div>
      </footer>

      {/* CREATE ROOM MODAL */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-modal-close" onClick={closeModals}>✕</button>
            <form className="form-container" onSubmit={handleCreateSubmit}>
              <h2>Create a New Room</h2>

              {error && (
                <div className="error-message">
                  {typeof error === 'string' && error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="hostDisplayName">Your Name *</label>
                <input
                  type="text"
                  id="hostDisplayName"
                  placeholder="Enter your display name"
                  value={createForm.hostDisplayName}
                  onChange={(e) => setCreateForm({ ...createForm, hostDisplayName: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="memberLimit">Member Limit *</label>
                <select
                  id="memberLimit"
                  value={createForm.memberLimit}
                  onChange={(e) => setCreateForm({ ...createForm, memberLimit: e.target.value })}
                >
                  <option value="2">2 members</option>
                  <option value="5">5 members</option>
                  <option value="15">15 members</option>
                  <option value="25">25 members</option>
                  <option value="50">50 members</option>
                  <option value="100">100 members</option>
                  <option value="1000">No Limit</option>
                </select>
                {tokenRequired && (
                  <small style={{ color: '#ff6b6b' }}>⚠️ Token required for limits above 5</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password (Optional)</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Set a room password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="token">
                  Token Key {tokenRequired && <span style={{ color: '#ff6b6b' }}>*</span>}
                  {!tokenRequired && <span style={{ color: '#999' }}>(Optional)</span>}
                </label>
                <input
                  type="text"
                  id="token"
                  placeholder={tokenRequired ? "Enter valid token for this limit" : "Enter token for perks"}
                  value={createForm.token}
                  onChange={(e) => setCreateForm({ ...createForm, token: e.target.value })}
                  required={tokenRequired}
                  style={tokenRequired ? { borderColor: '#ff6b6b' } : {}}
                />
                <small>
                  {tokenRequired 
                    ? "Required: Token unlocks member limits above 5. Example: PREMIUM-001-XYZ" 
                    : "Optional: Example tokens: PREMIUM-001-XYZ, EXTENDED-002-ABC, STANDARD-003-DEF"}
                </small>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {isJoinModalOpen && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-modal-close" onClick={closeModals}>✕</button>
            <form className="form-container" onSubmit={handleJoinSubmit}>
              <h2>Join a Room</h2>

              {error && (
                <div className="error-message">
                  {error === 'ROOM_NOT_FOUND' && 'Room not found'}
                  {error === 'ROOM_EXPIRED' && 'Room has expired'}
                  {error === 'ROOM_FULL' && 'Room is full'}
                  {error === 'INVALID_DISPLAY_NAME' && 'Please enter a display name'}
                  {error === 'INVALID_DATA' && 'Please fill in all fields'}
                  {typeof error === 'string' && !['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'ROOM_FULL', 'INVALID_DISPLAY_NAME', 'INVALID_DATA'].includes(error) && error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="roomId">Room ID *</label>
                <input
                  type="text"
                  id="roomId"
                  placeholder="Enter room ID"
                  value={joinForm.roomId}
                  onChange={(e) => setJoinForm({ ...joinForm, roomId: e.target.value.toUpperCase() })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="displayName">Your Name *</label>
                <input
                  type="text"
                  id="displayName"
                  placeholder="Enter your display name"
                  value={joinForm.displayName}
                  onChange={(e) => setJoinForm({ ...joinForm, displayName: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
