import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Header } from './components/Header.tsx';
import { QueryInput } from './components/QueryInput.tsx';
import { ResponseDisplay } from './components/ResponseDisplay.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ErrorAlert } from './components/ErrorAlert.tsx';
import { ApiService, tokenStorage, chatStorage } from './services/api.ts';
import { HealthStatus, ChatMessage } from './types/index.ts';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => chatStorage.get());
  const [hasPreviousChat, setHasPreviousChat] = useState<boolean>(() => Boolean(chatStorage.getPrevious()?.length));
  const [error, setError] = useState<{
    message: string;
    code?: string;
    status?: number;
    details?: unknown;
  } | null>(null);

  const syncTokenState = useCallback(() => {
    const token = tokenStorage.get();
    setHasToken(Boolean(token && token.trim().length > 0));
  }, []);

  useEffect(() => {
    syncTokenState();

    if (!tokenStorage.get()) {
      ApiService.mintToken(false)
        .then((res) => {
          tokenStorage.set(res.token);
          syncTokenState();
        })
        .catch(() => {
          // Fallback if backend not booted yet
        });
    }

    // Probe server health
    ApiService.getHealth()
      .then((data) => setHealth(data))
      .catch((err) => {
        console.warn('Backend server not yet ready:', err);
      });
  }, [syncTokenState]);

  // Handle submitting a query
  const handleQuerySubmit = async (queryText: string) => {
    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    chatStorage.set(updatedMessages);

    try {
      const result = await ApiService.sendQuery(queryText);
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: result.timestamp,
        model: result.model,
        provider: result.provider,
        latencyMs: result.latencyMs,
        usage: result.usage,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      chatStorage.set(finalMessages);
    } catch (err: unknown) {
      const errorObj = err as {
        message: string;
        code?: string;
        status?: number;
        details?: unknown;
      };

      setError({
        message: errorObj.message || 'An unexpected error occurred while executing query.',
        code: errorObj.code,
        status: errorObj.status,
        details: errorObj.details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      chatStorage.archiveCurrent();
      setHasPreviousChat(true);
    }
    setMessages([]);
    setError(null);
  };

  const handleRestorePrevious = () => {
    const prev = chatStorage.getPrevious();
    if (prev && prev.length > 0) {
      if (messages.length > 0) {
        chatStorage.archiveCurrent();
      }
      setMessages(prev);
      chatStorage.set(prev);
    }
  };

  return (
    <div className="app-container">
      <Header
        health={health}
        hasToken={hasToken}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onNewChat={handleNewChat}
        hasMessages={messages.length > 0}
        onRestorePrevious={handleRestorePrevious}
        hasPreviousChat={hasPreviousChat}
      />

      <ErrorAlert
        error={error}
        onDismiss={() => setError(null)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="main-content chat-main-layout">
        <section className="chat-scroll-area">
          <ResponseDisplay
            messages={messages}
            isLoading={isLoading}
            onSampleClick={handleQuerySubmit}
          />
        </section>

        <footer className="chat-docked-bottom">
          <QueryInput
            onSubmit={handleQuerySubmit}
            isLoading={isLoading}
          />
        </footer>
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onTokenChanged={syncTokenState}
      />
    </div>
  );
};

export default App;

