import type { QueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';
import { playChat, playNotify, playSos } from './sounds';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/**
 * Keeps one authenticated socket alive for the session. Live events refresh
 * the matching TanStack Query caches so every screen updates without reloads.
 */
export function initRealtime(queryClient: QueryClient): void {
  let currentToken: string | null = null;

  const connect = (token: string) => {
    socket?.disconnect();
    // Same-origin: Vite proxies /socket.io (ws) to the API in dev.
    socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });

    socket.on('notify', (n: { title: string; type: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // SOS and urgent broadcasts interrupt; everything else just updates the bell.
      if (n.type === 'sos' || n.title.includes('🚨')) useUiStore.getState().toast(n.title);
      if (n.type !== 'sos') playNotify(); // sos:new plays its own urgent tone
    });

    socket.on('sos:new', () => {
      void queryClient.invalidateQueries({ queryKey: ['sos'] });
      playSos();
    });
    socket.on('sos:update', () => {
      void queryClient.invalidateQueries({ queryKey: ['sos'] });
    });
    socket.on('sos:resolved', () => {
      void queryClient.invalidateQueries({ queryKey: ['sos'] });
    });

    socket.on('announcement:new', (a: { title: string; urgent: boolean }) => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      if (a.urgent) useUiStore.getState().toast(`🚨 URGENT: ${a.title}`);
    });
    socket.on('announcement:update', () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    });
    socket.on('announcement:delete', () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    });

    socket.on('chat:new', (message: { id: string; senderId?: string }) => {
      queryClient.setQueryData<{ id: string }[]>(['chat', 'staff'], (old) => {
        if (!old) return old;
        if (old.some((m) => m.id === message.id)) return old;
        return [...old.slice(-49), message as never];
      });
      useUiStore.getState().bumpChat();
      // no pop for your own messages echoing back
      if (message.senderId !== useAuthStore.getState().user?.id) playChat();
    });
  };

  useAuthStore.subscribe((state) => {
    if (state.accessToken && state.accessToken !== currentToken) {
      currentToken = state.accessToken;
      connect(state.accessToken);
    } else if (!state.accessToken && currentToken) {
      currentToken = null;
      socket?.disconnect();
      socket = null;
    }
  });
}
