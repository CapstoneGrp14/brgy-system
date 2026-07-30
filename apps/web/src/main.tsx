import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { tryRefresh } from './api/client';
import { router } from './app/router';
import { ConfirmDialogHost } from './components/ui/ConfirmDialog';
import { initRealtime } from './realtime/socket';
import { initSounds } from './realtime/sounds';
import './styles.css';

// Restore the session from the refresh cookie before the first guarded render.
void tryRefresh();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

// Live socket: connects when a session exists, refreshes caches on push events.
initRealtime(queryClient);
// Notification/chat sounds — audio unlocks on the user's first interaction.
initSounds();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ConfirmDialogHost />
    </QueryClientProvider>
  </React.StrictMode>,
);
