import React from 'react';
import { AlertCircle, X, KeyRound, Clock, ShieldX } from 'lucide-react';

interface ErrorAlertProps {
  error: {
    message: string;
    code?: string;
    status?: number;
    details?: unknown;
  } | null;
  onDismiss: () => void;
  onOpenAuthModal?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss, onOpenAuthModal }) => {
  if (!error) return null;

  const isAuthError =
    error.status === 401 ||
    error.code === 'TOKEN_EXPIRED' ||
    error.code === 'MISSING_AUTHORIZATION_HEADER' ||
    error.code === 'INVALID_TOKEN';

  const isTimeoutError = error.status === 504 || error.code === 'GATEWAY_TIMEOUT';

  return (
    <div className="error-alert-card" role="alert" id="error-alert">
      <div className="error-alert-icon">
        {isAuthError ? <ShieldX size={20} /> : isTimeoutError ? <Clock size={20} /> : <AlertCircle size={20} />}
      </div>
      <div className="error-alert-content">
        <div className="error-alert-header">
          <span className="error-alert-title">
            {isAuthError ? 'Authentication Required' : isTimeoutError ? 'Gateway Timeout' : 'Request Error'}
          </span>
          {error.code && <span className="error-code-badge font-mono">{error.code}</span>}
          {error.status && <span className="error-status-badge">HTTP {error.status}</span>}
        </div>
        <p className="error-alert-message">{error.message}</p>

        {isAuthError && onOpenAuthModal && (
          <button type="button" className="error-action-btn" onClick={onOpenAuthModal}>
            <KeyRound size={14} />
            <span>Generate Valid Test JWT Token</span>
          </button>
        )}
      </div>
      <button type="button" className="error-alert-dismiss" onClick={onDismiss} aria-label="Dismiss error">
        <X size={16} />
      </button>
    </div>
  );
};
