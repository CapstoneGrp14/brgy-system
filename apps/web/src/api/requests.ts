import type { DependantDto, NotificationsResponse, QueueResponse, QueueTab, RequestDto } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useMyRequests() {
  return useQuery({
    queryKey: ['requests', 'mine'],
    queryFn: async () => (await api.get<RequestDto[]>('/requests/mine')).data,
  });
}

export function useCreateDocumentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { documentType: string; purpose: string; beneficiaryCensusRecordId?: string }) =>
      (await api.post<RequestDto>('/requests/documents', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests', 'mine'] }),
  });
}

/**
 * Minors in the caller's household they may file for. Empty for everyone who is
 * not a registered head of family, so the picker simply does not appear.
 */
export function useDependants() {
  return useQuery({
    queryKey: ['requests', 'dependants'],
    queryFn: async () => (await api.get<DependantDto[]>('/requests/dependants')).data,
    staleTime: 5 * 60_000,
  });
}

export type QueueDeadline = 'all' | 'overdue' | 'soon' | 'ontrack';

export function useQueue(tab: QueueTab, page: number, q = '', deadline: QueueDeadline = 'all') {
  const term = q.trim();
  return useQuery({
    queryKey: ['requests', 'queue', tab, page, term, deadline],
    queryFn: async () =>
      (
        await api.get<QueueResponse>('/requests/queue', {
          // Omitted rather than sent empty so the cache key and the request
          // stay identical to the unfiltered case.
          params: { tab, page, pageSize: 5, ...(term ? { q: term } : {}), ...(deadline !== 'all' ? { deadline } : {}) },
        })
      ).data,
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: ['requests', 'stats'],
    queryFn: async () =>
      (await api.get<{ openTotal: number; dueSoon: number; overdue: number }>('/requests/stats')).data,
    refetchInterval: 30_000,
  });
}

export function useAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<RequestDto>(`/requests/${id}/advance`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useUploadSignedDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; file: File }) => {
      const form = new FormData();
      form.append('file', input.file);
      return (await api.post<RequestDto>(`/requests/${input.id}/document`, form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export async function downloadQueueCsv(): Promise<void> {
  const { data } = await api.get<Blob>('/requests/export.csv', { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'requests-queue.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<NotificationsResponse>('/notifications')).data,
    refetchInterval: 30_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
