import type { LoginResponse, LoginResult, MeResponse, TwoFactorChallenge } from '@brgy/shared';
import { isTwoFactorChallenge } from '@brgy/shared';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth';
import { api } from './client';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterInput {
  fullName: string;
  birthdate: string;
  email: string;
  phone?: string;
  password: string;
}

/**
 * Step 1 of sign-in. With two-factor on, this resolves to a challenge instead
 * of a session — pass the emailed code to `verifyTwoFactor` to finish.
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>('/auth/login', input);
  if (!isTwoFactorChallenge(data)) useAuthStore.getState().setSession(data.accessToken, data.user);
  return data;
}

/** Step 2 of sign-in — exchange the emailed code for a session. */
export async function verifyTwoFactor(challengeId: string, code: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login/verify', { challengeId, code });
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data;
}

/** Email a fresh code for the same challenge (server enforces a cooldown). */
export async function resendTwoFactorCode(challengeId: string): Promise<TwoFactorChallenge> {
  const { data } = await api.post<TwoFactorChallenge>('/auth/login/resend', { challengeId });
  return data;
}

export async function register(input: RegisterInput): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register', input);
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data;
}

export async function acceptInvite(input: {
  token: string;
  password: string;
  phone?: string;
}): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/accept-invite', input);
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout').catch(() => undefined);
  useAuthStore.getState().clear();
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { token, newPassword });
}

export function useMe() {
  const authed = useAuthStore((s) => s.status === 'authed');
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<MeResponse>('/users/me')).data,
    enabled: authed,
  });
}
