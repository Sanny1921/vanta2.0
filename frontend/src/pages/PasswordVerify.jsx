import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import '../css/PasswordVerify.css';

export default function PasswordVerify() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const { verifyPassword, error, setError } = useRoom();
  const displayName = location.state?.displayName || '';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await verifyPassword({
        roomId: roomId.toUpperCase(),
        displayName,
        password
      });
      navigate(`/room/${roomId.toUpperCase()}`);
    } catch (err) {
      console.error('Password verification failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-verify-container">
      <div className="password-verify-card">
        <h1>Enter Password</h1>
        <p className="room-id">Room ID: {roomId}</p>

        {error && (
          <div className="error-message">
            {error === 'PASSWORD_INVALID' && 'Invalid password'}
            {typeof error === 'string' && error !== 'PASSWORD_INVALID' && error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Room Password</label>
            <div className="password-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Enter Room'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
