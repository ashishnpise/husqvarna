import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, CornerDownLeft, Eraser } from 'lucide-react';

interface QueryInputProps {
  onSubmit: (query: string) => Promise<void>;
  isLoading: boolean;
}

export const SAMPLE_PROMPTS = [
  'Compare Husqvarna Svartpilen 401 and Vitpilen 250 features',
  'How does Husqvarna Group GIS India architect its AWS ECS cloud services?',
];

export const QueryInput: React.FC<QueryInputProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on load
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift is pressed for multiline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Auto-adjust height up to a max
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
  };

  const handleSampleClick = (prompt: string) => {
    setQuery(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleClear = () => {
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const charCount = query.length;
  const isTooLong = charCount > 2000;

  return (
    <div className="query-input-section sticky-chat-bar" role="region" aria-label="Chat input area">
      {/* 2 Quick Inquiries Pills */}
      <div className="sample-prompts-container" aria-label="Suggested inquiries">
        <span className="sample-prompts-title">
          <Sparkles size={13} className="text-accent" />
          <span>Quick Inquiries:</span>
        </span>
        <div className="sample-prompts-list">
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="sample-prompt-pill"
              onClick={() => handleSampleClick(prompt)}
              disabled={isLoading}
              title={`Click to fill: "${prompt}"`}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Query Form */}
      <form onSubmit={handleSubmit} className="query-form" aria-label="Send message form">
        <div className="query-box-wrapper">
          <textarea
            ref={textareaRef}
            id="query-input-field"
            value={query}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Husqvarna Svartpilen 401, Vitpilen 250, Swedish heritage, or GIS cloud architecture..."
            rows={2}
            disabled={isLoading}
            className={`query-textarea ${isTooLong ? 'input-error' : ''}`}
            maxLength={2200}
            aria-label="Ask a question or enter a query"
          />

          <div className="query-box-footer">
            <div className="query-meta-hints">
              <span className={`char-counter ${isTooLong ? 'text-danger font-bold' : 'text-muted'}`}>
                {charCount} / 2000
              </span>
              <span className="keyboard-hint" title="Press Enter to send, Shift+Enter for new line">
                <CornerDownLeft size={12} />
                <span>Enter to send • Shift+Enter for new line</span>
              </span>
            </div>

            <div className="query-box-actions">
              {query.length > 0 && (
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={handleClear}
                  disabled={isLoading}
                  title="Clear input"
                  aria-label="Clear input text"
                >
                  <Eraser size={16} />
                </button>
              )}

              <button
                type="submit"
                id="btn-submit-query"
                disabled={isLoading || !query.trim() || isTooLong}
                className="btn-submit"
                aria-label="Send query"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

