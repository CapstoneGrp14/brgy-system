import type { LoginResponse, MeResponse } from '@brgy/shared';
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

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', input);
  useAuthStore.getState().setSession(data.accessToken, data.user);
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
