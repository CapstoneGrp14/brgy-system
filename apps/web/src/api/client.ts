import type { LoginResponse } from '@brgy/shared';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth';

export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Silent refresh via httpOnly cookie. Shared promise so parallel 401s refresh once. */
let refreshing: Promise<LoginResponse | null> | null = null;

export async function tryRefresh(): Promise<LoginResponse | null> {
  refreshing ??= axios
    .post<LoginResponse>('/api/v1/auth/refresh')
    .then(({ data }) => {
      useAuthStore.getState().setSession(data.accessToken, data.user);
      return data;
    })
    .catch(() => {
      useAuthStore.getState().setGuest();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthCall = config?.url?.startsWith('/auth/');
  if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
    const session = await tryRefresh();
    if (session) {
      config._retried = true;
      config.headers.Authorization = `Bearer ${session.accessToken}`;
      return api.request(config);
    }
  }
  throw error;
});
