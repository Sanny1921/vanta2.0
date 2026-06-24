import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useUI } from '../context/UIContext';
import socketService from '../services/socketService';
import { getAppUrl } from '../config/constants';
import ThemeSwitcher from '../components/ThemeSwitcher';
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
      {/* Replicated RoomHeader layout */}
      <div className="room-header preview-header" style={{ height: '52px', padding: '0 16px', borderBottom: '1px solid var(--vanta-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--vanta-surface)' }}>
        <div className="room-header-left">
          <span className="room-title" style={{ fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>VANTA</span>
        </div>
        <div className="room-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div className="voice-btn-wrapper">
            <button className="btn-voice-call" disabled title="Voice call" style={{ cursor: 'default', padding: '4px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          </div>
          <div className="room-header-right">
            <button className="btn-menu-trigger" disabled style={{ cursor: 'default', padding: '2px 4px', fontSize: '18px' }}>⋮</button>
          </div>
        </div>
      </div>
      
      <div ref={messagesContainerRef} className={`preview-messages ${isFading ? 'fading' : ''}`}>
        {showRoomCreated && (
          <div className="system-message-row" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
            <div className="system-message-content" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--vanta-surface)', border: '1px solid var(--vanta-border)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', color: 'var(--vanta-text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14" /></svg>
              <span className="system-text" style={{ fontWeight: '500' }}>Room created</span>
            </div>
          </div>
        )}
        {showAlexJoin && (
          <div className="system-message-row" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
            <div className="system-message-content" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--vanta-surface)', border: '1px solid var(--vanta-border)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', color: 'var(--vanta-text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
              <span className="system-text" style={{ fontWeight: '500' }}>Alex joined</span>
            </div>
          </div>
        )}
        {showAlexMsg && (
          <div className="message-row" style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div className="message-avatar" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--vanta-accent)', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
            <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div className="message-header-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="message-sender-name" style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--vanta-accent)' }}>Alex</span>
                <span className="message-timestamp" style={{ fontSize: '9px', color: 'var(--vanta-text-muted)' }}>10:00 PM</span>
              </div>
              <div className="message-text-content" style={{ fontSize: '12px', color: 'var(--vanta-text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                Need everyone online in 5 minutes.
              </div>
            </div>
          </div>
        )}
        {showSamJoin && (
          <div className="system-message-row" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
            <div className="system-message-content" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--vanta-surface)', border: '1px solid var(--vanta-border)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', color: 'var(--vanta-text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
              <span className="system-text" style={{ fontWeight: '500' }}>Sam joined</span>
            </div>
          </div>
        )}
        {showSamMsg && (
          <div className="message-row own" style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div className="message-avatar" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--vanta-text-primary)', border: '1px solid var(--vanta-border)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>
            <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div className="message-header-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="message-sender-name" style={{ fontSize: '11.5px', fontWeight: '600', color: '#a78bfa' }}>Sam</span>
                <span className="message-timestamp" style={{ fontSize: '9px', color: 'var(--vanta-text-muted)' }}>10:01 PM</span>
              </div>
              <div className="message-text-content" style={{ fontSize: '12px', color: 'var(--vanta-text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                Joining now.
              </div>
            </div>
          </div>
        )}
        {showRahulJoin && (
          <div className="system-message-row" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
            <div className="system-message-content" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--vanta-surface)', border: '1px solid var(--vanta-border)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', color: 'var(--vanta-text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
              <span className="system-text" style={{ fontWeight: '500' }}>Rahul joined</span>
            </div>
          </div>
        )}
        {showRahulMsg && (
          <div className="message-row" style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div className="message-avatar" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--vanta-accent)', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>R</div>
            <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div className="message-header-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="message-sender-name" style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--vanta-accent)' }}>Rahul</span>
                <span className="message-timestamp" style={{ fontSize: '9px', color: 'var(--vanta-text-muted)' }}>10:01 PM</span>
              </div>
              <div className="message-text-content" style={{ fontSize: '12px', color: 'var(--vanta-text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                On my way.
              </div>
            </div>
          </div>
        )}
        {showAlexMsg2 && (
          <div className="message-row" style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div className="message-avatar" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--vanta-accent)', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
            <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div className="message-header-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="message-sender-name" style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--vanta-accent)' }}>Alex</span>
                <span className="message-timestamp" style={{ fontSize: '9px', color: 'var(--vanta-text-muted)' }}>10:02 PM</span>
              </div>
              <div className="message-text-content" style={{ fontSize: '12px', color: 'var(--vanta-text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                Perfect.
              </div>
            </div>
          </div>
        )}
        {showSamMsg2 && (
          <div className="message-row own" style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div className="message-avatar" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--vanta-text-primary)', border: '1px solid var(--vanta-border)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>
            <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div className="message-header-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="message-sender-name" style={{ fontSize: '11.5px', fontWeight: '600', color: '#a78bfa' }}>Sam</span>
                <span className="message-timestamp" style={{ fontSize: '9px', color: 'var(--vanta-text-muted)' }}>10:02 PM</span>
              </div>
              <div className="message-text-content" style={{ fontSize: '12px', color: 'var(--vanta-text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                Let's start.
              </div>
            </div>
          </div>
        )}
        {showRahulMsg2 && (
          <div className="message-row" style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div className="message-avatar" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--vanta-accent)', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>R</div>
            <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div className="message-header-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="message-sender-name" style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--vanta-accent)' }}>Rahul</span>
                <span className="message-timestamp" style={{ fontSize: '9px', color: 'var(--vanta-text-muted)' }}>10:03 PM</span>
              </div>
              <div className="message-text-content" style={{ fontSize: '12px', color: 'var(--vanta-text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                Ready.
              </div>
            </div>
          </div>
        )}
        {showFinished && (
          <div className="system-message-row" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
            <div className="system-message-content" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--vanta-surface)', border: '1px solid var(--vanta-border)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', color: 'var(--vanta-text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span className="system-text" style={{ fontWeight: '500' }}>Conversation finished</span>
            </div>
          </div>
        )}
        {showExpired && (
          <div className="system-message-row" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
            <div className="system-message-content warning-sys-msg" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', color: '#f87171' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span className="system-text" style={{ fontWeight: '500' }}>Room expired</span>
            </div>
          </div>
        )}

        {showRemoved && (
          <div className="preview-expired-overlay" style={{ background: 'rgba(18, 16, 26, 0.85)' }}>
            <div className="room-deleted-message" style={{ padding: '16px 24px', fontSize: '13px', borderRadius: '10px' }}>
              Room has been deleted. Redirecting to home...
            </div>
          </div>
        )}
      </div>
      <div className="preview-composer" style={{ padding: '10px 16px', gap: '8px', background: 'var(--vanta-surface)', borderTop: '1px solid var(--vanta-border)', boxSizing: 'border-box' }}>
        <button className="preview-btn-attachment" disabled aria-label="Attachment" style={{ height: '32px', width: '32px', minWidth: '32px', borderRadius: '6px', background: 'none', border: '1px solid var(--vanta-border)', color: 'var(--vanta-text-muted)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
        <input type="text" className="composer-input" placeholder="Type a message..." disabled style={{ height: '32px', borderRadius: '6px', background: 'var(--vanta-input)', border: '1px solid var(--vanta-border)', padding: '6px 10px', fontSize: '12px', minWidth: '0', flex: '1', color: 'var(--vanta-text-primary)' }} />
        <button className="preview-btn-emoji" disabled aria-label="Emoji" style={{ height: '32px', width: '32px', minWidth: '32px', borderRadius: '6px', background: 'none', border: '1px solid var(--vanta-border)', color: 'var(--vanta-text-muted)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
        </button>
        <button className="btn-composer-send" disabled aria-label="Send message" style={{ height: '32px', width: '32px', minWidth: '32px', borderRadius: '6px', backgroundColor: 'var(--vanta-accent)', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const triggerRef = useRef(null);

  // Close menu on click outside and escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

        {/* Desktop links */}
        <div className="navbar-links desktop-only">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#why-vanta">Why Vanta</a>
          <a href="#faq">FAQ</a>
        </div>

        {/* Desktop actions */}
        <div className="navbar-actions desktop-only">
          <ThemeSwitcher />
          <button className="btn-navbar-secondary" onClick={() => setIsJoinModalOpen(true)}>
            Join Room
          </button>
          <button className="btn-navbar-primary" onClick={() => setIsCreateModalOpen(true)}>
            Create Room
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          ref={triggerRef}
          className="mobile-menu-trigger"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>

        {/* Mobile compact floating dropdown menu */}
        {isMobileMenuOpen && (
          <div className="vanta-mobile-dropdown" ref={mobileMenuRef}>
            <div className="dropdown-links">
              <a href="#home" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How It Works</a>
              <a href="#why-vanta" onClick={() => setIsMobileMenuOpen(false)}>Why Vanta</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>FAQ</a>
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-actions">
              <div className="mobile-theme-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '0 4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--vanta-text-secondary)', letterSpacing: '0.5px' }}>THEME</span>
                <ThemeSwitcher />
              </div>
              <button
                className="btn-dropdown-secondary"
                onClick={() => {
                  setIsJoinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                Join Room
              </button>
              <button
                className="btn-dropdown-primary"
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                Create Room
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <header id="home" className="hero-section">
        <div className="hero-container-inner">
          <div className="hero-left">
            <h1 className="hero-title">Create.<br />Share.<br />Talk.<br />Disappear.</h1>
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

        {/* Desktop-only Table */}
        <div className="comparison-table-wrapper desktop-only">
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

        {/* Mobile-only stacked comparison cards */}
        <div className="comparison-cards-wrapper mobile-only">
          <div className="comparison-card">
            <h4 className="comparison-card-title">Identity & Accounts</h4>
            <div className="comparison-card-row">
              <span className="side-label">Traditional</span>
              <span className="side-value traditional">Accounts Required</span>
            </div>
            <div className="comparison-card-row highlighted">
              <span className="side-label">Vanta</span>
              <span className="side-value vanta-value">No Account Required</span>
            </div>
          </div>

          <div className="comparison-card">
            <h4 className="comparison-card-title">User Profiles</h4>
            <div className="comparison-card-row">
              <span className="side-label">Traditional</span>
              <span className="side-value traditional">Permanent Profiles</span>
            </div>
            <div className="comparison-card-row highlighted">
              <span className="side-label">Vanta</span>
              <span className="side-value vanta-value">No Profiles</span>
            </div>
          </div>

          <div className="comparison-card">
            <h4 className="comparison-card-title">Message Retention</h4>
            <div className="comparison-card-row">
              <span className="side-label">Traditional</span>
              <span className="side-value traditional">Long-Term History</span>
            </div>
            <div className="comparison-card-row highlighted">
              <span className="side-label">Vanta</span>
              <span className="side-value vanta-value">Temporary Conversations</span>
            </div>
          </div>

          <div className="comparison-card">
            <h4 className="comparison-card-title">Core Philosophy</h4>
            <div className="comparison-card-row">
              <span className="side-label">Traditional</span>
              <span className="side-value traditional">Identity-Focused</span>
            </div>
            <div className="comparison-card-row highlighted">
              <span className="side-label">Vanta</span>
              <span className="side-value vanta-value">Conversation-Focused</span>
            </div>
          </div>

          <div className="comparison-card">
            <h4 className="comparison-card-title">Room Expiration</h4>
            <div className="comparison-card-row">
              <span className="side-label">Traditional</span>
              <span className="side-value traditional">Conversations Persist</span>
            </div>
            <div className="comparison-card-row highlighted">
              <span className="side-label">Vanta</span>
              <span className="side-value vanta-value">Automatic Expiration</span>
            </div>
          </div>

          <div className="comparison-card">
            <h4 className="comparison-card-title">Data Storage</h4>
            <div className="comparison-card-row">
              <span className="side-label">Traditional</span>
              <span className="side-value traditional">Stored Indefinitely</span>
            </div>
            <div className="comparison-card-row highlighted">
              <span className="side-label">Vanta</span>
              <span className="side-value vanta-value">Temporary By Design</span>
            </div>
          </div>
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
                <span className="faq-arrow">
                  {activeFaqIndex === index ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  )}
                </span>
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
