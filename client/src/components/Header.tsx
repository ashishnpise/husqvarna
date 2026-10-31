import React from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, Activity, Plus, RotateCcw } from 'lucide-react';
import { HealthStatus } from '../types/index.ts';

interface HeaderProps {
  health: HealthStatus | null;
  hasToken: boolean;
  onOpenAuthModal: () => void;
  onNewChat?: () => void;
  hasMessages?: boolean;
  onRestorePrevious?: () => void;
  hasPreviousChat?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  hasToken,
  onOpenAuthModal,
  onNewChat,
  hasMessages,
  onRestorePrevious,
  hasPreviousChat,
}) => {

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo-container">
          <svg className="brand-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#00b4d8" fillOpacity="0.15" />
            <path
              d="M10 8V24M22 8V24M10 16H22"
              stroke="#00b4d8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="brand-titles">
          <div className="brand-badge-row">
            <span className="brand-name">HUSQVARNA GROUP</span>
            <span className="brand-sub">GIS INDIA</span>
          </div>
          <h1 className="header-title">AI Query Assistant</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Server & LLM Status Indicator */}
        <div className="status-pill" title={`Server uptime: ${health?.uptimeSeconds ?? 0}s`}>
          <Activity size={14} className={health ? 'icon-pulse text-accent' : 'text-muted'} />
          <span className="status-label">Backend:</span>
          <span className="status-value">{health ? 'Connected' : 'Connecting...'}</span>
        </div>

        {/* Model & Provider Badge */}
        <div className="status-pill model-pill">
          <Sparkles size={14} className={health?.realApiKeyConfigured ? 'text-accent' : 'text-warning'} />
          <span className="status-label">Model:</span>
          <span className="status-value font-mono">
            {health?.model || 'gemini-3.5-flash'}
            {!health?.realApiKeyConfigured && ' (Key Required)'}
          </span>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          id="btn-new-chat"
          className="btn-new-chat"
          onClick={onNewChat}
          title={hasMessages ? "Start a new chat session (archives current conversation locally)" : "Start a fresh chat"}
        >
          <Plus size={15} />
          <span>New Chat</span>
          {hasMessages && <span className="active-dot" title="Active conversation" />}
        </button>

        {/* Restore Single Saved Previous Chat (if available) */}
        {hasPreviousChat && onRestorePrevious && (
          <button
            type="button"
            id="btn-restore-chat"
            className="btn-restore-chat"
            onClick={onRestorePrevious}
            title="Restore your previous chat session"
          >
            <RotateCcw size={13} />
            <span>Restore Last Chat</span>
          </button>
        )}

        {/* JWT Auth Button & Status */}
        <button
          type="button"
          id="btn-auth-manager"
          className={`auth-status-btn ${hasToken ? 'auth-active' : 'auth-missing'}`}
          onClick={onOpenAuthModal}
          title="Click to view or switch JWT tokens"
        >
          {hasToken ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{hasToken ? 'JWT Authenticated' : 'No Token (401)'}</span>
        </button>
      </div>
    </header>
  );
};
