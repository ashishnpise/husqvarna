import React, { useState } from 'react';
import { X, Key, ShieldCheck, ShieldAlert, Trash2, RefreshCw, Check } from 'lucide-react';
import { ApiService, tokenStorage } from '../services/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenChanged: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onTokenChanged }) => {
  const [currentToken, setCurrentToken] = useState<string>(tokenStorage.get() || '');
  const [customInput, setCustomInput] = useState<string>('');
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleMintValid = async () => {
    setIsMinting(true);
    try {
      const res = await ApiService.mintToken(false);
      tokenStorage.set(res.token);
      setCurrentToken(res.token);
      onTokenChanged();
      showFeedback('Generated & saved fresh valid JWT token (expires in 1 hr)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mint failed';
      showFeedback(`Failed to mint token: ${msg}`);
    } finally {
      setIsMinting(false);
    }
  };

  const handleMintExpired = async () => {
    setIsMinting(true);
    try {
      const res = await ApiService.mintToken(true);
      tokenStorage.set(res.token);
      setCurrentToken(res.token);
      onTokenChanged();
      showFeedback('Generated & saved expired JWT token to test 401 error handling!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mint failed';
      showFeedback(`Failed to mint expired token: ${msg}`);
    } finally {
      setIsMinting(false);
    }
  };

  const handleClearToken = () => {
    tokenStorage.remove();
    setCurrentToken('');
    onTokenChanged();
    showFeedback('Cleared token. Next query will trigger 401 Unauthorized.');
  };

  const handleApplyCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    tokenStorage.set(trimmed);
    setCurrentToken(trimmed);
    setCustomInput('');
    onTokenChanged();
    showFeedback('Applied custom token to requests.');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Key size={18} className="text-accent" />
            <h3 className="modal-title">JWT Authentication Manager</h3>
          </div>
          <button type="button" className="btn-icon-subtle" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            The <code>/api/query</code> endpoint is protected with JWT Bearer authentication. Use these controls to
            conveniently test valid auth, expired auth, and missing token error scenarios.
          </p>

          {/* Current Token Status */}
          <div className="token-status-box">
            <div className="token-status-header">
              <span className="token-status-label">Active Stored Token:</span>
              <span className={`status-tag ${currentToken ? 'status-active' : 'status-empty'}`}>
                {currentToken ? (
                  <>
                    <ShieldCheck size={12} />
                    <span>Token Active</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={12} />
                    <span>No Token</span>
                  </>
                )}
              </span>
            </div>
            {currentToken ? (
              <pre className="token-preview font-mono">{currentToken}</pre>
            ) : (
              <p className="text-muted text-sm">No token configured in localStorage.</p>
            )}
          </div>

          {feedback && (
            <div className="feedback-toast">
              <Check size={14} />
              <span>{feedback}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="modal-actions-grid">
            <button
              type="button"
              className="action-card btn-mint-valid"
              onClick={handleMintValid}
              disabled={isMinting}
            >
              <RefreshCw size={18} className={isMinting ? 'animate-spin' : ''} />
              <div className="action-card-text">
                <span className="action-card-title">Mint Valid Token</span>
                <span className="action-card-sub">Issues a valid signed JWT with 1 hour expiration</span>
              </div>
            </button>

            <button
              type="button"
              className="action-card btn-mint-expired"
              onClick={handleMintExpired}
              disabled={isMinting}
            >
              <ShieldAlert size={18} className="text-warning" />
              <div className="action-card-text">
                <span className="action-card-title">Mint Expired Token</span>
                <span className="action-card-sub">Tests 401 TOKEN_EXPIRED error handling</span>
              </div>
            </button>

            <button
              type="button"
              className="action-card btn-clear-token"
              onClick={handleClearToken}
              disabled={!currentToken}
            >
              <Trash2 size={18} className="text-danger" />
              <div className="action-card-text">
                <span className="action-card-title">Clear Token</span>
                <span className="action-card-sub">Removes token to test 401 Missing Header handling</span>
              </div>
            </button>
          </div>

          {/* Custom Token Input */}
          <div className="custom-token-section">
            <label htmlFor="custom-token-input" className="custom-token-label">
              Or paste custom JWT / test token:
            </label>
            <div className="custom-token-row">
              <input
                id="custom-token-input"
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="custom-token-input font-mono"
              />
              <button
                type="button"
                className="btn-apply-custom"
                onClick={handleApplyCustom}
                disabled={!customInput.trim()}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-close" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
