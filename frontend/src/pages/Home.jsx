import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useUI } from '../context/UIContext';
import socketService from '../services/socketService';
import '../css/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { createRoom, joinRoom, setError, error } = useRoom();
  const { showToast } = useUI();
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
      showToast('Room created successfully!', 'success');
    } catch (err) {
      console.error('Failed to create room:', err);
      showToast(typeof err === 'string' ? err : 'Failed to create room', 'error');
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
      let errMsg = 'Failed to join room';
      if (err === 'ROOM_NOT_FOUND') errMsg = 'Invalid room code';
      else if (err === 'ROOM_EXPIRED') errMsg = 'Room has expired';
      else if (err === 'ROOM_FULL') errMsg = 'Room is full';
      else if (err === 'INVALID_DISPLAY_NAME') errMsg = 'Please enter a display name';
      else if (err === 'INVALID_DATA') errMsg = 'Please fill in all fields';
      else if (typeof err === 'string') errMsg = err;
      showToast(errMsg, 'error');
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
        showToast('Invite Link copied to clipboard!', 'success');
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
                  showToast('Room ID copied to clipboard!', 'success');
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
                  showToast('Invite Link copied to clipboard!', 'success');
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
          <span className="logo-icon">▲</span> VANTA
        </div>
        <div className="navbar-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#why-vanta">Why Vanta</a>
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
        <div className="hero-container-inner">
          <div className="hero-left">
            <div className="hero-badge">Temporary rooms. Real conversations.</div>
            <h1 className="hero-title">
              Create. Share.<br />
              <span className="accent-text">Talk.</span> Leave.
            </h1>
            <p className="hero-description">
              Vanta is a temporary meeting place on the internet.<br /><br />
              No accounts. No communities. No permanent history.<br /><br />
              Just create a room, share a link, and start talking.
            </p>
            <div className="hero-buttons">
              <button className="btn-hero-primary" onClick={() => setIsCreateModalOpen(true)}>
                <span className="btn-icon">⚡</span> Create Room
              </button>
              <button className="btn-hero-secondary" onClick={() => setIsJoinModalOpen(true)}>
                Join Room <span className="btn-icon-right">➔</span>
              </button>
            </div>
            <div className="hero-features-row">
              <span className="feature-indicator">
                <span className="feature-indicator-icon">🛡️</span> No Signup Required
              </span>
              <span className="feature-indicator">
                <span className="feature-indicator-icon">🔒</span> End-to-End Encrypted
              </span>
              <span className="feature-indicator">
                <span className="feature-indicator-icon">⏱️</span> Auto-Delete
              </span>
            </div>
          </div>

          <div className="hero-right">
            {/* Realistic Chat Room Preview */}
            <div className="chat-preview-card">
              <div className="preview-header">
                <span className="preview-title">VANTA</span>
                <span className="preview-options">⋮</span>
              </div>
              <div className="preview-messages">
                <div className="preview-system-msg">
                  <span className="sys-icon">✨</span> Room created - Today, 10:24 AM
                </div>
                <div className="preview-system-msg">
                  <span className="sys-icon">👤</span> Alex joined the room
                </div>
                <div className="preview-user-msg">
                  <div className="avatar">A</div>
                  <div className="msg-content">
                    <div className="msg-header">Alex <span className="msg-time">10:24 AM</span></div>
                    <div className="msg-body">Hey everyone!</div>
                  </div>
                </div>
                <div className="preview-system-msg">
                  <span className="sys-icon">👤</span> Sam joined the room
                </div>
                <div className="preview-user-msg">
                  <div className="avatar blue">S</div>
                  <div className="msg-content">
                    <div className="msg-header">Sam <span className="msg-time">10:25 AM</span></div>
                    <div className="msg-body">Hello!</div>
                  </div>
                </div>
                <div className="preview-system-msg">
                  <span className="sys-icon">🚪</span> Rahul left the room
                </div>
                <div className="preview-user-msg">
                  <div className="avatar">A</div>
                  <div className="msg-content">
                    <div className="msg-header">Alex <span className="msg-time">10:27 AM</span></div>
                    <div className="msg-body">Let's start.</div>
                  </div>
                </div>
              </div>
              <div className="preview-composer">
                <span className="composer-attach">📎</span>
                <input type="text" className="composer-input" placeholder="Type a message..." disabled />
                <span className="composer-emoji">😊</span>
                <button className="btn-composer-send" disabled>Send</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2 — HOW VANTA WORKS */}
      <section id="how-it-works" className="section how-it-works-section">
        <span className="section-label">SIMPLE & FAST</span>
        <h2 className="section-title-new">How Vanta Works</h2>
        <p className="section-subtitle-new">Start a conversation in four simple steps.</p>
        <div className="flow-grid-new">
          <div className="flow-card-new">
            <div className="card-number">1</div>
            <div className="card-icon-container">
              <span className="card-icon-new">⚙️</span>
            </div>
            <h3>Create a Room</h3>
            <p>Choose your room settings and create a temporary space in seconds.</p>
          </div>
          <div className="flow-arrow-new">➔</div>
          <div className="flow-card-new">
            <div className="card-number">2</div>
            <div className="card-icon-container">
              <span className="card-icon-new">🔗</span>
            </div>
            <h3>Share the Link</h3>
            <p>Share the invite link with anyone you want to bring in.</p>
          </div>
          <div className="flow-arrow-new">➔</div>
          <div className="flow-card-new">
            <div className="card-number">3</div>
            <div className="card-icon-container">
              <span className="card-icon-new">💬</span>
            </div>
            <h3>Start Talking</h3>
            <p>Chat in real time. No login needed for you or your participants.</p>
          </div>
          <div className="flow-arrow-new">➔</div>
          <div className="flow-card-new">
            <div className="card-number">4</div>
            <div className="card-icon-container">
              <span className="card-icon-new">🗑️</span>
            </div>
            <h3>Leave No Trace</h3>
            <p>When the room ends, messages disappear automatically.</p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHY VANTA IS DIFFERENT */}
      <section id="why-vanta" className="section why-vanta-section">
        <div className="why-vanta-inner">
          <div className="why-vanta-left">
            <span className="section-label left-aligned">BUILT DIFFERENT</span>
            <h2 className="section-title-new left-aligned">
              Why Vanta<br />
              <span className="accent-text">is Different</span>
            </h2>
            <p className="why-vanta-description">
              Vanta is not built to keep you engaged forever.<br /><br />
              It's built to help people have meaningful conversations without the baggage.
            </p>
          </div>
          <div className="why-vanta-right">
            <div className="feature-grid-new">
              <div className="feature-item-new">
                <span className="feature-item-icon">👁️‍🗨️</span>
                <div className="feature-item-text">
                  <h3>No Permanent History</h3>
                  <p>Rooms and messages auto-delete. Nothing stays behind.</p>
                </div>
              </div>
              <div className="feature-item-new">
                <span className="feature-item-icon">⏱️</span>
                <div className="feature-item-text">
                  <h3>Temporary by Design</h3>
                  <p>Every room has an expiry. Everything disappears.</p>
                </div>
              </div>
              <div className="feature-item-new">
                <span className="feature-item-icon">👤</span>
                <div className="feature-item-text">
                  <h3>No Accounts</h3>
                  <p>Jump in instantly. No signups, no profiles, no hassle.</p>
                </div>
              </div>
              <div className="feature-item-new">
                <span className="feature-item-icon">⚡</span>
                <div className="feature-item-text">
                  <h3>Light & Fast</h3>
                  <p>Minimal. Clean. Built for speed and simplicity.</p>
                </div>
              </div>
              <div className="feature-item-new">
                <span className="feature-item-icon">🔒</span>
                <div className="feature-item-text">
                  <h3>Privacy First</h3>
                  <p>End-to-end encrypted rooms to keep your conversations safe.</p>
                </div>
              </div>
              <div className="feature-item-new">
                <span className="feature-item-icon">👥</span>
                <div className="feature-item-text">
                  <h3>No Communities</h3>
                  <p>No servers. No channels. Just people and conversations.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY CHOOSE VANTA OVER OTHER PLATFORMS */}
      <section className="section comparison-section">
        <span className="section-label">THE BETTER CHOICE</span>
        <h2 className="section-title-new">Why Choose Vanta Over Other Platforms?</h2>
        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="th-feature">Feature</th>
                <th className="th-vanta highlighted-col">Vanta</th>
                <th>WhatsApp</th>
                <th>Discord</th>
                <th>Telegram</th>
                <th>Google Meet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-feature">No Account Required</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
              </tr>
              <tr>
                <td className="td-feature">Temporary Rooms</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
              </tr>
              <tr>
                <td className="td-feature">Auto Delete Messages</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
              </tr>
              <tr>
                <td className="td-feature">No Permanent History</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
              </tr>
              <tr>
                <td className="td-feature">Easy Shareable Link</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="check-val">✓</td>
                <td className="check-val">✓</td>
                <td className="check-val">✓</td>
                <td className="check-val">✓</td>
              </tr>
              <tr>
                <td className="td-feature">Distraction Free</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
              </tr>
              <tr>
                <td className="td-feature">Built For Temporary Use</td>
                <td className="td-vanta highlighted-col"><span className="check-mark">✓</span></td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
                <td className="cross-val">✕</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="section faq-section">
        <span className="section-label">QUESTIONS & ANSWERS</span>
        <h2 className="section-title-new">Frequently Asked Questions</h2>
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

      {/* SECTION 5 — FINAL CTA */}
      <section className="section final-cta-section">
        <div className="final-cta-card">
          <div className="final-cta-left">
            <h2>Ready to start a conversation?</h2>
            <p>Create a room in seconds. No signup. No delays.</p>
          </div>
          <div className="final-cta-right">
            <button className="btn-hero-primary" onClick={() => setIsCreateModalOpen(true)}>
              <span className="btn-icon">⚡</span> Create Room
            </button>
            <button className="btn-hero-secondary" onClick={() => setIsJoinModalOpen(true)}>
              Join Room <span className="btn-icon-right">➔</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="new-vanta-footer">
        <div className="footer-top-new">
          <div className="footer-brand-new">
            <div className="footer-logo">▲ VANTA</div>
            <p>Temporary communication without permanent history.</p>
          </div>
          <div className="footer-links-new">
            <a href="#faq">FAQ</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-socials">
            <a href="https://github.com" aria-label="GitHub" target="_blank" rel="noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-bottom-new">
          <p>© 2026 Vanta. All rights reserved.</p>
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
