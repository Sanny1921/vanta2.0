import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../css/VoicePlayer.css';

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || window.location.origin;

export default function VoicePlayer({ src, duration, messageId, roomId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);

  // Fetch the secure audio file as a Blob and create a local Object URL
  useEffect(() => {
    let active = true;
    let objectUrl = null;

    const fetchAudio = async () => {
      try {
        const cleanBaseUrl = BASE_URL.replace(/\/+$/, '');
        const fetchUrl = src.startsWith('http') ? src : `${cleanBaseUrl}${src}`;

        const roomUserId = sessionStorage.getItem('vanta_room_user_id');
        if (!roomUserId) {
          throw new Error('Room user ID not found in session.');
        }

        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'x-room-user-id': roomUserId
          }
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const blob = await response.blob();
        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error('[VoicePlayer] Failed to load audio stream:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchAudio();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  // Listen for global custom events to pause when another track begins playing
  useEffect(() => {
    const handleOtherPlay = (e) => {
      if (e.detail && e.detail.messageId !== messageId) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener('vanta-voice-play', handleOtherPlay);
    return () => {
      window.removeEventListener('vanta-voice-play', handleOtherPlay);
    };
  }, [messageId]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Dispatches event to pause all other voice message players
      window.dispatchEvent(new CustomEvent('vanta-voice-play', { detail: { messageId } }));
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('[VoicePlayer] Playback failed:', err));
    }
  };

  const formatTime = (timeInSecs) => {
    if (isNaN(timeInSecs) || !isFinite(timeInSecs)) return '0:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e) => {
    const seekVal = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(seekVal)) {
      audioRef.current.currentTime = seekVal;
      setCurrentTime(seekVal);
    }
  };

  if (loading) {
    return (
      <div className="voice-player-container loading">
        <div className="voice-loader-spinner" />
        <span className="voice-player-status">Loading voice...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="voice-player-container error">
        <svg viewBox="0 0 24 24" className="voice-error-icon" width="16" height="16">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span className="voice-player-status">Expired or unavailable</span>
      </div>
    );
  }

  const trackDuration = duration || (audioRef.current ? audioRef.current.duration : 0) || 0;

  return (
    <div className={`voice-player-container ${isPlaying ? 'playing' : ''}`}>
      <button onClick={togglePlay} className="voice-play-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="voice-waveform-and-slider">
        <input
          type="range"
          min="0"
          max={trackDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="voice-seeker"
          style={{
            background: `linear-gradient(to right, var(--vanta-accent) 0%, var(--vanta-accent) ${(currentTime / (trackDuration || 1)) * 100}%, rgba(255,255,255,0.08) ${(currentTime / (trackDuration || 1)) * 100}%, rgba(255,255,255,0.08) 100%)`
          }}
        />
        <div className="voice-waveform-animation">
          <span className={`bar ${isPlaying ? 'animate' : ''}`} />
          <span className={`bar ${isPlaying ? 'animate' : ''}`} />
          <span className={`bar ${isPlaying ? 'animate' : ''}`} />
          <span className={`bar ${isPlaying ? 'animate' : ''}`} />
          <span className={`bar ${isPlaying ? 'animate' : ''}`} />
        </div>
      </div>

      <div className="voice-time-display">
        {formatTime(currentTime)} / {formatTime(trackDuration)}
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />
    </div>
  );
}

VoicePlayer.propTypes = {
  src: PropTypes.string.isRequired,
  duration: PropTypes.number,
  messageId: PropTypes.string.isRequired,
  roomId: PropTypes.string.isRequired
};
