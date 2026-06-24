import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, confirmLabel, cancelLabel, resolve }
  const [alertModal, setAlertModal] = useState(null); // { title, message, type, resolve }

  const [theme, setTheme] = useState(() => localStorage.getItem('vanta_theme') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('vanta_accent') || 'purple');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vanta_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('vanta_accent', accent);
  }, [accent]);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const showConfirm = useCallback((config) => {
    return new Promise((resolve) => {
      setConfirmModal({
        ...config,
        resolve
      });
    });
  }, []);

  const showAlert = useCallback((config) => {
    return new Promise((resolve) => {
      setAlertModal({
        ...config,
        resolve
      });
    });
  }, []);

  // Keyboard controls: Escape key closes active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmModal) {
          confirmModal.resolve(false);
          setConfirmModal(null);
        } else if (alertModal) {
          alertModal.resolve();
          setAlertModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal, alertModal]);

  const handleConfirmAction = (value) => {
    if (confirmModal) {
      confirmModal.resolve(value);
      setConfirmModal(null);
    }
  };

  const handleAlertClose = () => {
    if (alertModal) {
      alertModal.resolve();
      setAlertModal(null);
    }
  };

  return (
    <UIContext.Provider value={{ showToast, showConfirm, showAlert, theme, setTheme, accent, setAccent }}>
      {children}

      {/* Toast container */}
      <div className="vanta-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`vanta-toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
              {toast.type === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              )}
              {toast.type === 'warning' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              )}
              {toast.type === 'info' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              )}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Confirmation modal */}
      {confirmModal && (
        <div 
          className="vanta-custom-modal-backdrop" 
          onClick={() => handleConfirmAction(false)}
        >
          <div 
            className="vanta-custom-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">{confirmModal.title || 'Confirm Action'}</h3>
            <p className="modal-body">{confirmModal.message}</p>
            <div className="modal-actions">
              <button 
                type="button"
                className="btn-modal-cancel" 
                onClick={() => handleConfirmAction(false)}
              >
                {confirmModal.cancelLabel || 'Cancel'}
              </button>
              <button 
                type="button"
                className="btn-modal-confirm" 
                onClick={() => handleConfirmAction(true)}
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert modal */}
      {alertModal && (
        <div 
          className="vanta-custom-modal-backdrop" 
          onClick={handleAlertClose}
        >
          <div 
            className="vanta-custom-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`modal-title ${alertModal.type || 'info'}`}>
              {alertModal.title || (alertModal.type === 'error' ? 'Error' : 'Alert')}
            </h3>
            <p className="modal-body">{alertModal.message}</p>
            <div className="modal-actions">
              <button 
                type="button"
                className="btn-modal-close-alert" 
                onClick={handleAlertClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

UIProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
