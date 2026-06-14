import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, confirmLabel, cancelLabel, resolve }
  const [alertModal, setAlertModal] = useState(null); // { title, message, type, resolve }

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
    <UIContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}

      {/* Toast container */}
      <div className="vanta-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`vanta-toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
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
