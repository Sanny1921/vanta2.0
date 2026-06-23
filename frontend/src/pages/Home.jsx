import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useUI } from '../context/UIContext';
import socketService from '../services/socketService';
import { getAppUrl } from '../config/constants';
import '../css/Home.css';

const DIAG_PREFIX = '[Diag][Home]';

function LiveConversationDemo() {
  const [step, setStep] = useState(0);
  const messagesContainerRef = useRef(null);

  const steps = [
    { id: 0, delay: 1000 },  // Room Created
    { id: 1, delay: 1000 },  // Alex Joined
    { id: 2, delay: 1200 },  // Alex Message
    { id: 3, delay: 1000 },  // Sam Joined
    { id: 4, delay: 1200 },  // Sam Message
    { id: 5, delay: 1000 },  // Rahul Joined
    { id: 6, delay: 1200 },  // Rahul Message
    { id: 7, delay: 1000 },  // Alex Reply
    { id: 8, delay: 1000 },  // Sam Reply
    { id: 9, delay: 1200 },  // Rahul Reply
    { id: 10, delay: 2000 }, // Conversation Finished
    { id: 11, delay: 2000 }, // Room Expired
    { id: 12, delay: 1500 }, // Messages Fade
    { id: 13, delay: 2000 }, // Room Removed (messages fade)
  ];

  useEffect(() => {
    const currentStepConfig = steps[step];
    const timer = setTimeout(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, currentStepConfig ? currentStepConfig.delay : 1000);

    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      if (step === 0) {
        messagesContainerRef.current.scrollTop = 0;
      } else {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [step]);

  const showRoomCreated = step >= 0;
  const showAlexJoin = step >= 1;
  const showAlexMsg = step >= 2;
  const showSamJoin = step >= 3;
  const showSamMsg = step >= 4;
  const showRahulJoin = step >= 5;
  const showRahulMsg = step >= 6;
  const showAlexMsg2 = step >= 7;
  const showSamMsg2 = step >= 8;
  const showRahulMsg2 = step >= 9;
  const showFinished = step >= 10;
  const showExpired = step >= 11;
  const isFading = step >= 12;
  const showRemoved = step >= 13;

  return (
    <div className="chat-preview-card">
      <div className="preview-header">
        <span className="preview-title">▲ VANTA</span>
        <div className="preview-status-badge">
          <span className="pulse-dot"></span>
          <span>live-preview</span>
        </div>
      </div>
      <div ref={messagesContainerRef} className={`preview-messages ${isFading ? 'fading' : ''}`}>
        {showRoomCreated && (
          <div className="preview-system-msg animate-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M12 5v14M5 12h14" /></svg>
            Room created
          </div>
        )}
        {showAlexJoin && (
          <div className="preview-system-msg animate-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
            Alex joined
          </div>
        )}
        {showAlexMsg && (
          <div className="preview-user-msg animate-message">
            <div className="avatar">A</div>
            <div className="msg-content">
              <div className="msg-header">Alex</div>
              <div className="msg-body">Need everyone online in 5 minutes.</div>
            </div>
          </div>
        )}
        {showSamJoin && (
          <div className="preview-system-msg animate-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
            Sam joined
          </div>
        )}
        {showSamMsg && (
          <div className="preview-user-msg animate-message">
            <div className="avatar violet">S</div>
            <div className="msg-content">
              <div className="msg-header">Sam</div>
              <div className="msg-body">Joining now.</div>
            </div>
          </div>
        )}
        {showRahulJoin && (
          <div className="preview-system-msg animate-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
            Rahul joined
          </div>
        )}
        {showRahulMsg && (
          <div className="preview-user-msg animate-message">
            <div className="avatar gray">R</div>
            <div className="msg-content">
              <div className="msg-header">Rahul</div>
              <div className="msg-body">On my way.</div>
            </div>
          </div>
        )}
        {showAlexMsg2 && (
          <div className="preview-user-msg animate-message">
            <div className="avatar">A</div>
            <div className="msg-content">
              <div className="msg-header">Alex</div>
              <div className="msg-body">Perfect.</div>
            </div>
          </div>
        )}
        {showSamMsg2 && (
          <div className="preview-user-msg animate-message">
            <div className="avatar violet">S</div>
            <div className="msg-content">
              <div className="msg-header">Sam</div>
              <div className="msg-body">Let's start.</div>
            </div>
          </div>
        )}
        {showRahulMsg2 && (
          <div className="preview-user-msg animate-message">
            <div className="avatar gray">R</div>
            <div className="msg-content">
              <div className="msg-header">Rahul</div>
              <div className="msg-body">Ready.</div>
            </div>
          </div>
        )}
        {showFinished && (
          <div className="preview-system-msg animate-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            Conversation finished
          </div>
        )}
        {showExpired && (
          <div className="preview-system-msg animate-message warning-sys-msg">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Room expired
          </div>
        )}

        {showRemoved && (
          <div className="preview-expired-overlay">
            <div className="expired-badge" style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(8, 7, 12, 0.95)', color: '#ffffff' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
              Room removed
            </div>
          </div>
        )}
      </div>
      <div className="preview-composer">
        <button className="preview-btn-attachment" disabled>📎</button>
        <input type="text" className="composer-input" placeholder="Type a message..." disabled />
        <button className="preview-btn-emoji" disabled>😀</button>
        <button className="btn-composer-send" disabled>Send</button>
      </div>
    </div>
  );
}

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
  const tokenRequired = memberLimitNum > 15;

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
    console.log(`${DIAG_PREFIX} Create button click`, {
      form: {
        ...createForm,
        password: createForm.password ? '[present]' : null
      },
      tokenRequired,
      socketConnected: socketService.socket?.connected || false,
      socketId: socketService.socket?.id || null
    });
    setLoading(true);
    setError(null);

    // Validate token requirement
    if (tokenRequired && !createForm.token.trim()) {
      setError('Token required for member limits above 5');
      setLoading(false);
      return;
    }

    try {
      console.log(`${DIAG_PREFIX} Create request start`);
      const response = await createRoom({
        hostDisplayName: createForm.hostDisplayName,
        token: createForm.token || null,
        memberLimit: parseInt(createForm.memberLimit) || 5,
        password: createForm.password || null
      });
      console.log(`${DIAG_PREFIX} Create request success`, response);

      // Close create modal and show details screen
      setIsCreateModalOpen(false);

      const appUrl = getAppUrl();
      const resolvedRoomUrl = `${appUrl}/join/${response.roomId}`;

      setCreatedRoomData({
        roomId: response.roomId,
        roomUrl: resolvedRoomUrl,
        password: createForm.password || null,
        settings: response.settings
      });
      showToast('Room created successfully!', 'success');
    } catch (err) {
      console.error(`${DIAG_PREFIX} Create request failure`, err);
      console.error('Failed to create room:', err);
      showToast(typeof err === 'string' ? err : 'Failed to create room', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    console.log(`${DIAG_PREFIX} Join button click`, {
      form: joinForm,
      socketConnected: socketService.socket?.connected || false,
      socketId: socketService.socket?.id || null
    });
    setLoading(true);
    setError(null);

    try {
      console.log(`${DIAG_PREFIX} Join request start`);
      const response = await joinRoom({
        roomId: joinForm.roomId.toUpperCase(),
        displayName: joinForm.displayName
      });
      console.log(`${DIAG_PREFIX} Join request success`, response);

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
      console.error(`${DIAG_PREFIX} Join request failure`, err);
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
          <p className="tagline">Your room is ready.</p>
        </header>

        <div className="room-created-success-card">
          <h2>Room Created</h2>

          <div className="waiting-participants-badge">
            <span className="pulse-dot"></span>
            Waiting for participants
          </div>
          <p className="waiting-guidance">Share the invite link to begin the conversation.</p>

          <div className="info-item" style={{ textAlign: 'left' }}>
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

          <div className="info-item" style={{ textAlign: 'left' }}>
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

          {createdRoomData.password && (
            <div className="info-item" style={{ textAlign: 'left' }}>
              <span className="info-label">Password</span>
              <div className="info-value-group">
                <span className="info-value">
                  {showPassword ? createdRoomData.password : '••••••••'}
                </span>
                <button
                  type="button"
                  className="btn-eye-small"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
          )}

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
              onClick={() => {
                navigator.clipboard.writeText(createdRoomData.roomUrl);
                showToast('Invite Link copied to clipboard!', 'success');
              }}
            >
              Share Link
            </button>
          </div>
        </div>

        <footer className="home-footer">
          <p>© Vanta</p>
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
            <h1 className="hero-title">
              Create.<br />
              Share.<br />
              Talk.<br />
              Disappear.
            </h1>
            <p className="hero-description">
              Built for conversations, not archives.
            </p>
            <div className="hero-buttons">
              <button className="btn-hero-primary" onClick={() => setIsCreateModalOpen(true)}>
                Create Room
              </button>
              <button className="btn-hero-secondary" onClick={() => setIsJoinModalOpen(true)}>
                Join Room
              </button>
            </div>
            <p className="hero-supporting-text">
              We store nothing permanently. Rooms automatically expire.
            </p>
          </div>

          <div className="hero-right">
            <LiveConversationDemo />
          </div>
        </div>
      </header>

      {/* SECTION 3 — HOW IT WORKS */}
      <section id="how-it-works" className="section how-it-works-section">
        <span className="section-label">HOW IT WORKS</span>
        <h2 className="section-title-new">How Vanta Works</h2>

        <div className="how-it-works-grid">
          <div className="how-step-card">
            <div className="how-step-number">Step 01</div>
            <h3>Create Room</h3>
            <p>Configure room settings and generate an invite link.</p>
          </div>
          <div className="how-step-card">
            <div className="how-step-number">Step 02</div>
            <h3>Share Link</h3>
            <p>Invite participants instantly.</p>
          </div>
          <div className="how-step-card">
            <div className="how-step-number">Step 03</div>
            <h3>Talk Freely</h3>
            <p>Communicate without creating accounts.</p>
          </div>
          <div className="how-step-card">
            <div className="how-step-number">Step 04</div>
            <h3>Room Disappears</h3>
            <p>The room automatically expires after the conversation ends.</p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY VANTA */}
      <section id="why-vanta" className="section why-vanta-section">
        <span className="section-label">PHILOSOPHY</span>
        <h2 className="section-title-new">Temporary communication without permanent history.</h2>

        <div className="why-vanta-positioning-intro">
          <p>
            Most communication platforms are built around identities, profiles, and permanent history.
            Vanta is built around the conversation itself.
          </p>
          <p className="positioning-steps">
            Create a room. Invite participants. Have the conversation. Move on.
          </p>
        </div>

        <div className="comparison-table-wrapper">
          <table className="vanta-comparison-table">
            <thead>
              <tr>
                <th>Traditional Platforms</th>
                <th className="highlighted-header">Vanta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Accounts Required</td>
                <td className="highlighted-cell">No Account Required</td>
              </tr>
              <tr>
                <td>Permanent Profiles</td>
                <td className="highlighted-cell">No Profiles</td>
              </tr>
              <tr>
                <td>Long-Term Message History</td>
                <td className="highlighted-cell">Temporary Conversations</td>
              </tr>
              <tr>
                <td>Identity-Focused</td>
                <td className="highlighted-cell">Conversation-Focused</td>
              </tr>
              <tr>
                <td>Conversations Persist</td>
                <td className="highlighted-cell">Automatic Expiration</td>
              </tr>
              <tr>
                <td>Data Stored Indefinitely</td>
                <td className="highlighted-cell">Temporary By Design</td>
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
            <h2>Not every conversation is meant to last forever.</h2>
            <p>Create a room. Share a link. Have the conversation. Move on.</p>
          </div>
          <div className="final-cta-right">
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
      <footer className="new-vanta-footer">
        <div className="footer-top-new">
          <div className="footer-column brand-column">
            <div className="footer-logo">▲ VANTA</div>
            <p className="footer-description">Private temporary communication without accounts.</p>
            <p className="footer-philosophy">Built for conversations, not archives.</p>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Product</h4>
            <ul className="footer-column-links">
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#why-vanta">Why Vanta</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Legal</h4>
            <ul className="footer-column-links">
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms & Conditions</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Contact</h4>
            <ul className="footer-column-links">
              <li><a href="#contact">Contact</a></li>
              <li><a href="#support">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-new">
          <p>© Vanta</p>
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
                <small className="field-help">Displayed to other participants.</small>
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
                  <small style={{ color: '#ff6b6b' }}>Token required for limits above 15</small>
                )}
                <small className="field-help">Maximum number of participants allowed in this room.</small>
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
                <small className="field-help">Leave empty to create a public room.</small>
              </div>

              <div className="form-group">
                <label htmlFor="token">
                  Premium Token {tokenRequired && <span style={{ color: '#ff6b6b' }}>*</span>}
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
                <small className="field-help">
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
