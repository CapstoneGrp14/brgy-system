import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface SosAlertView {
  id: string;
  residentName: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
  resolvedBy: string | null;
}

export interface ChatMessageView {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

// ── SOS ──
export function useMySos() {
  return useQuery({
    queryKey: ['sos', 'mine'],
    queryFn: async () => (await api.get<SosAlertView | null>('/sos/mine')).data,
    refetchInterval: 30_000,
  });
}

export function useTriggerSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coords: { lat?: number; lng?: number; accuracy?: number }) =>
      (await api.post<SosAlertView>('/sos', coords)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sos'] }),
  });
}

export function useCancelSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<SosAlertView>('/sos/cancel')).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sos'] }),
  });
}

export function useActiveSos(enabled = true) {
  return useQuery({
    queryKey: ['sos', 'active'],
    queryFn: async () => (await api.get<SosAlertView[]>('/sos/active')).data,
    refetchInterval: 20_000,
    enabled,
  });
}

export function useResolveSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<SosAlertView>(`/sos/${id}/resolve`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sos'] }),
  });
}

export interface SosHotspotPoint {
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
}

/** Historical incident points for the staff/admin SOS hotspot heat layer. */
export function useSosHotspot(enabled = true) {
  return useQuery({
    queryKey: ['sos', 'hotspot'],
    queryFn: async () => (await api.get<SosHotspotPoint[]>('/sos/hotspot')).data,
    refetchInterval: 60_000,
    enabled,
  });
}

// ── Staff chat ──
export function useChatHistory() {
  return useQuery({
    queryKey: ['chat', 'staff'],
    queryFn: async () => (await api.get<ChatMessageView[]>('/chat/staff')).data,
    refetchInterval: 60_000, // fallback only — live updates arrive over the socket
  });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post<ChatMessageView>('/chat/staff', { body })).data,
    onSuccess: (message) => {
      qc.setQueryData<ChatMessageView[]>(['chat', 'staff'], (old) => {
        if (!old) return [message];
        if (old.some((m) => m.id === message.id)) return old;
        return [...old.slice(-49), message];
      });
    },
  });
}

// ── 591 Assistant ──
export interface AssistantAction {
  labelText: string;
  path: string;
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: async (input: { message: string; language: 'en' | 'fil' }) =>
      (await api.post<{ reply: string; intent: string; actions: AssistantAction[] }>('/assistant', input)).data,
  });
}
