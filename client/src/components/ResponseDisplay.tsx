import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Clock, Hash, Cpu, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types/index.ts';
import { SAMPLE_PROMPTS } from './QueryInput.tsx';

interface ResponseDisplayProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSampleClick?: (prompt: string) => void;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  messages,
  isLoading,
  onSampleClick,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or loading begins
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.warn('Failed to copy to clipboard.');
    }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n\n').map((paragraph, index) => {
      if (paragraph.startsWith('### ')) {
        return (
          <h3 key={index} className="md-h3">
            {paragraph.replace('### ', '')}
          </h3>
        );
      }
      if (paragraph.startsWith('#### ')) {
        return (
          <h4 key={index} className="md-h4">
            {paragraph.replace('#### ', '')}
          </h4>
        );
      }
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        return (
          <ul key={index} className="md-ul">
            {paragraph.split('\n').map((item, itemIdx) => (
              <li key={itemIdx} className="md-li">
                {item.replace(/^[-*]\s+/, '')}
              </li>
            ))}
          </ul>
        );
      }
      if (/^\d+\.\s/.test(paragraph)) {
        return (
          <ol key={index} className="md-ol">
            {paragraph.split('\n').map((item, itemIdx) => (
              <li key={itemIdx} className="md-li">
                {item.replace(/^\d+\.\s+/, '')}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <p key={index} className="md-p">
          {paragraph}
        </p>
      );
    });
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="chat-empty-state" role="region" aria-label="Welcome state">
        <div className="empty-state-badge">
          <Bot size={36} className="text-accent" />
        </div>
        <h2 className="empty-state-title">Ready for Technical Inquiries</h2>
        <p className="empty-state-text">
          Ask questions about Husqvarna Automower EPOS navigation, Fleet Services IoT telemetry,
          or GIS microservices architecture. Your chat history is preserved locally.
        </p>

        {/* 2 Quick Inquiries Highlight Cards */}
        {onSampleClick && (
          <div className="empty-quick-prompts">
            <span className="empty-quick-prompts-label">
              <Sparkles size={14} className="text-accent" />
              <span>Suggested Inquiries (1-Click):</span>
            </span>
            <div className="empty-quick-prompts-grid">
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-prompt-card"
                  onClick={() => onSampleClick(prompt)}
                >
                  <span className="quick-prompt-card-number">0{idx + 1}</span>
                  <span className="quick-prompt-card-text">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="chat-messages-container" role="log" aria-live="polite" aria-label="Chat messages thread">
      {messages.map((msg) => {
        if (msg.role === 'user') {
          return (
            <div key={msg.id} className="chat-message-row user-row">
              <div className="message-bubble user-bubble">
                <div className="bubble-header user-header">
                  <div className="bubble-author">
                    <User size={13} />
                    <span>You</span>
                  </div>
                  <span className="bubble-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="user-message-text">{msg.content}</div>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="chat-message-row assistant-row">
            <div className="message-bubble assistant-bubble">
              {/* Header telemetry and copy action */}
              <div className="bubble-header assistant-header">
                <div className="response-meta-left">
                  <div className="bubble-author assistant-author">
                    <Bot size={14} className="text-accent" />
                    <span>Husqvarna AI</span>
                  </div>
                  {msg.model && (
                    <div className="meta-badge model-badge">
                      <Cpu size={12} />
                      <span className="font-mono">{msg.model}</span>
                    </div>
                  )}
                  {msg.latencyMs !== undefined && (
                    <div className="meta-badge latency-badge" title="Response latency">
                      <Clock size={12} />
                      <span>{msg.latencyMs} ms</span>
                    </div>
                  )}
                  {msg.usage && (
                    <div className="meta-badge tokens-badge" title="Tokens used">
                      <Hash size={12} />
                      <span>{msg.usage.totalTokens} tokens</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="copy-btn"
                  title="Copy response to clipboard"
                  aria-label="Copy response text"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check size={13} className="text-accent" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formatted body */}
              <div className="response-body markdown-content">
                {renderFormattedText(msg.content)}
              </div>

              {/* Footer info */}
              <div className="response-footer">
                <span className="timestamp-text">
                  Generated at {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.provider && <span className="provider-tag">Engine: {msg.provider}</span>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="chat-message-row assistant-row loading-row">
          <div className="message-bubble assistant-bubble loading-state">
            <div className="bubble-header assistant-header">
              <div className="bubble-author assistant-author">
                <Bot size={14} className="text-accent icon-pulse" />
                <span>Husqvarna AI is generating...</span>
              </div>
            </div>
            <div className="skeleton-loader">
              <div className="skeleton-line title" />
              <div className="skeleton-line medium" />
              <div className="skeleton-line short" />
            </div>
            <p className="loading-caption">
              <Sparkles size={13} className="icon-pulse text-accent" />
              <span>Synthesizing response via Gemini Flash...</span>
            </p>
          </div>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

