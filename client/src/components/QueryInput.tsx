import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, CornerDownLeft, Eraser } from 'lucide-react';

interface QueryInputProps {
  onSubmit: (query: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_PROMPTS = [
  'How does Husqvarna Automower EPOS satellite navigation work?',
  'Explain Husqvarna Fleet Services IoT cloud telemetry pipeline',
  'Architectural considerations for containerized GIS microservices',
  'What are the key security practices for JWT-protected LLM APIs?',
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

    await onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSampleClick = (prompt: string) => {
    setQuery(prompt);
    textareaRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    textareaRef.current?.focus();
  };

  const charCount = query.length;
  const isTooLong = charCount > 2000;

  return (
    <div className="query-input-section">
      {/* Sample Prompt Pills */}
      <div className="sample-prompts-container">
        <span className="sample-prompts-title">
          <Sparkles size={14} className="text-accent" />
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
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Query Form */}
      <form onSubmit={handleSubmit} className="query-form">
        <div className="query-box-wrapper">
          <textarea
            ref={textareaRef}
            id="query-input-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or enter a query (e.g. Husqvarna robotics, cloud telemetry, architecture)..."
            rows={4}
            disabled={isLoading}
            className={`query-textarea ${isTooLong ? 'input-error' : ''}`}
            maxLength={2200}
          />

          <div className="query-box-footer">
            <div className="query-meta-hints">
              <span className={`char-counter ${isTooLong ? 'text-danger font-bold' : 'text-muted'}`}>
                {charCount} / 2000 characters
              </span>
              <span className="keyboard-hint">
                <CornerDownLeft size={12} />
                <span>Ctrl + Enter to send</span>
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
                >
                  <Eraser size={16} />
                </button>
              )}

              <button
                type="submit"
                id="btn-submit-query"
                disabled={isLoading || !query.trim() || isTooLong}
                className="btn-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing Query...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Query</span>
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
