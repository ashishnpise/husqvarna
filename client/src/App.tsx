import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Header } from './components/Header.tsx';
import { QueryInput } from './components/QueryInput.tsx';
import { ResponseDisplay } from './components/ResponseDisplay.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ErrorAlert } from './components/ErrorAlert.tsx';
import { ApiService, tokenStorage } from './services/api.ts';
import { HealthStatus, QueryResponseData } from './types/index.ts';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<QueryResponseData | null>(null);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    status?: number;
    details?: unknown;
  } | null>(null);

  // Sync token state
  const syncTokenState = useCallback(() => {
    const token = tokenStorage.get();
    setHasToken(Boolean(token && token.trim().length > 0));
  }, []);

  // Initialize application
  useEffect(() => {
    syncTokenState();

    // Ensure a default test token exists on first load for zero-friction evaluation
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

  const handleQuerySubmit = async (queryText: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ApiService.sendQuery(queryText);
      setResponse(result);
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

  return (
    <div className="app-container">
      <Header
        health={health}
        hasToken={hasToken}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <ErrorAlert
        error={error}
        onDismiss={() => setError(null)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="main-content">
        <QueryInput
          onSubmit={handleQuerySubmit}
          isLoading={isLoading}
        />

        <ResponseDisplay
          data={response}
          isLoading={isLoading}
        />
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
