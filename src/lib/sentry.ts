import * as Sentry from '@sentry/react';
import { Replay } from '@sentry/replay';

// Initialize Sentry
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (dsn && dsn !== 'your_sentry_dsn_here') {
    Sentry.init({
      dsn,
      integrations: [
        new Replay({
          // Capture replays for 10% of all sessions
          sessionSampleRate: 0.1,
          // Capture replays for 100% of sessions with an error
          errorSampleRate: 1.0,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of the transactions
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ['localhost', /^https:\/\/peerly\.io/],
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Environment
      environment: import.meta.env.VITE_APP_ENV || 'development',

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',

      // Error filtering
      beforeSend(event) {
        // Don't send events in development unless explicitly configured
        if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEV) {
          return null;
        }
        return event;
      },
    });

    console.log('Sentry initialized successfully');
  }
};

// User tracking
export const setUser = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

export const clearUser = () => {
  Sentry.setUser(null);
};

// Custom error reporting
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

// Performance tracking
export const addBreadcrumb = (message: string, category?: string, level?: Sentry.SeverityLevel) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
  });
};