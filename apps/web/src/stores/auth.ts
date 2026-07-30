import type { AuthUser } from '@brgy/shared';
import { create } from 'zustand';

type AuthStatus = 'unknown' | 'authed' | 'guest';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  setGuest: () => void;
  clear: () => void;
}

/**
 * Session lives in memory; on hard reload the app silently calls
 * /auth/refresh (httpOnly cookie) to restore it. `status` starts as
 * 'unknown' so guards can wait instead of bouncing to /login.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authed' }),
  setGuest: () => set({ accessToken: null, user: null, status: 'guest' }),
  clear: () => set({ accessToken: null, user: null, status: 'guest' }),
}));

export const roleHome = (role: AuthUser['role']): string =>
  role === 'ADMIN' ? '/admin/overview' : role === 'EMPLOYEE' ? '/employee/dashboard' : '/resident/dashboard';
