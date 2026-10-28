import React, { useState } from 'react';
import { Copy, Check, Clock, Hash, Cpu, Bot, Sparkles } from 'lucide-react';
import { QueryResponseData } from '../types/index.ts';

interface ResponseDisplayProps {
  data: QueryResponseData | null;
  isLoading: boolean;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ data, isLoading }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data?.response) return;
    try {
      await navigator.clipboard.writeText(data.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      console.warn('Failed to copy to clipboard.');
    }
  };

  if (isLoading) {
    return (
      <div className="response-card loading-state">
        <div className="skeleton-loader">
          <div className="skeleton-header">
            <div className="skeleton-line title" />
            <div className="skeleton-line pill" />
          </div>
          <div className="skeleton-content">
            <div className="skeleton-line" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
          </div>
        </div>
        <p className="loading-caption">
          <Sparkles size={14} className="icon-pulse text-accent" />
          <span>Generating intelligence via Gemini Flash...</span>
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="response-card empty-state">
        <div className="empty-state-icon">
          <Bot size={40} />
        </div>
        <h3 className="empty-state-title">Ready for Queries</h3>
        <p className="empty-state-text">
          Submit a technical inquiry above to evaluate real-time response generation, telemetry metrics, and JWT authorization handling.
        </p>
      </div>
    );
  }

  return (
    <div className="response-card active-state" id="response-display">
      {/* Response Header & Telemetry */}
      <div className="response-card-header">
        <div className="response-meta-left">
          <div className="meta-badge model-badge">
            <Cpu size={14} />
            <span className="font-mono">{data.model}</span>
          </div>
          <div className="meta-badge latency-badge" title="End-to-end server & LLM latency">
            <Clock size={14} />
            <span>{data.latencyMs} ms</span>
          </div>
          <div className="meta-badge tokens-badge" title="Token consumption">
            <Hash size={14} />
            <span>
              {data.usage.totalTokens} tokens ({data.usage.promptTokens} in / {data.usage.completionTokens} out)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="copy-btn"
          id="btn-copy-response"
          title="Copy markdown text to clipboard"
        >
          {copied ? (
            <>
              <Check size={14} className="text-accent" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Query Echo Banner */}
      <div className="query-echo">
        <span className="echo-label">Query:</span>
        <span className="echo-text">"{data.query}"</span>
      </div>

      {/* Formatted Response Body */}
      <div className="response-body markdown-content">
        {data.response.split('\n\n').map((paragraph, index) => {
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
        })}
      </div>

      {/* Timestamp footer */}
      <div className="response-footer">
        <span className="timestamp-text">Generated at: {new Date(data.timestamp).toLocaleTimeString()}</span>
        <span className="provider-tag">Engine: {data.provider}</span>
      </div>
    </div>
  );
};
