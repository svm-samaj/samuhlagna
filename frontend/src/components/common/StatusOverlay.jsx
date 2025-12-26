import React from 'react';
import './StatusOverlay.css';

const StatusOverlay = ({ 
  isVisible, 
  message = "Loading...", 
  isError = false, 
  errorType = "general", // 'general', 'auth', 'unauthorized'
  onRetry = null,
  onClose = null,
  onLoginAgain = null
}) => {
  if (!isVisible) return null;

  // Detect if this is a success message (not loading, not error)
  const isSuccess = !isError && (
    message.toLowerCase().includes('successfully') ||
    message.toLowerCase().includes('success') ||
    message.toLowerCase().includes('deleted') ||
    message.toLowerCase().includes('added') ||
    message.toLowerCase().includes('updated')
  );

  // Detect if this is a loading state (not error, not success)
  const isLoading = !isError && !isSuccess;

  const getIcon = () => {
    if (isSuccess) return '✅';
    if (isError) {
      switch (errorType) {
        case 'auth':
        case 'unauthorized':
          return '🔒';
        default:
          return '⚠️';
      }
    }
    return null; // No icon for loading
  };

  const getTitle = () => {
    if (isSuccess) return 'Success';
    if (isError) {
      switch (errorType) {
        case 'auth':
          return 'Authentication Required';
        case 'unauthorized':
          return 'Access Denied';
        default:
          return message.includes('Are you sure') ? 'Confirm Action' : 'Error';
      }
    }
    return null; // No title for loading
  };

  return (
    <div className="status-overlay">
      <div className="status-overlay-backdrop"></div>
      <div className="status-overlay-content">
        {isLoading ? (
          // Loading state with spinner
          <>
            <div className="status-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="status-message">{message}</p>
            <div className="status-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </div>
          </>
        ) : (
          // Success or Error state with buttons
          <>
            <div className="status-icon">{getIcon()}</div>
            {(isError || isSuccess || message.includes('Are you sure')) && (
              <h3 className={`status-title ${isSuccess ? 'success-title' : ''}`}>{getTitle()}</h3>
            )}
            <p className={`status-message ${isSuccess ? 'success-message' : ''}`}>{message}</p>
            <div className="status-buttons">
              {onRetry && errorType === 'general' && isError && (
                <button className="retry-button" onClick={onRetry}>
                  {message.includes('Are you sure') ? 'Yes, Delete' : 'Try Again'}
                </button>
              )}
              {onClose && (
                <button className="close-button" onClick={onClose}>
                  OK
                </button>
              )}
              {onLoginAgain && (errorType === 'auth' || errorType === 'unauthorized') && (
                <button className="login-button" onClick={onLoginAgain}>
                  Login Again
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusOverlay;
