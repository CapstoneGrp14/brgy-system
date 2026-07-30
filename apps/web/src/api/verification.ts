import type { MyVerificationDto, VerificationQueueResponse } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useMyVerification() {
  return useQuery({
    queryKey: ['verification', 'mine'],
    queryFn: async () => (await api.get<MyVerificationDto | null>('/verification/mine')).data,
    refetchInterval: (query) => {
      const d = query.state.data;
      // Poll fast while OCR runs or staff review is pending.
      return d && (d.ocrVerdict === 'PENDING' || d.status === 'PENDING') ? 4000 : false;
    },
  });
}

export interface DocTypeRow {
  id: string;
  labelText: string;
  isActive?: boolean;
  createdBy?: string;
}

export function useDocTypes() {
  return useQuery({
    queryKey: ['verification', 'doc-types'],
    queryFn: async () => (await api.get<DocTypeRow[]>('/verification/doc-types')).data,
  });
}

export function useAllDocTypes() {
  return useQuery({
    queryKey: ['verification', 'doc-types', 'all'],
    queryFn: async () => (await api.get<DocTypeRow[]>('/verification/doc-types/all')).data,
  });
}

export function useAddDocType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (labelText: string) =>
      (await api.post('/verification/doc-types', { labelText })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['verification', 'doc-types'] }),
  });
}

export function useToggleDocType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/verification/doc-types/${id}/toggle`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['verification', 'doc-types'] }),
  });
}

export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { docTypeId: string; file: File }) => {
      const form = new FormData();
      form.append('docTypeId', input.docTypeId);
      form.append('file', input.file);
      return (await api.post<MyVerificationDto>('/verification/submit', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['verification'] }),
  });
}

export function useVerificationQueue() {
  return useQuery({
    queryKey: ['verification', 'queue'],
    queryFn: async () => (await api.get<VerificationQueueResponse>('/verification/queue')).data,
    refetchInterval: 15_000,
  });
}

export function useDecideVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean }) =>
      (await api.post(`/verification/${input.id}/decide`, { approve: input.approve })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['verification'] }),
  });
}
