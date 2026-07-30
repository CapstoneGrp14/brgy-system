import type { CharterContent } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useCharter() {
  return useQuery({
    queryKey: ['charter'],
    queryFn: async () => (await api.get<CharterContent>('/charter')).data,
  });
}

export function useUpdateCharter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: CharterContent) => (await api.put<CharterContent>('/charter', content)).data,
    onSuccess: (data) => qc.setQueryData(['charter'], data),
  });
}
