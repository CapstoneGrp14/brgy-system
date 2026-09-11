import type { CensusHistoryRow, MasterlistResponse } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

/** Change history for one census record (loaded when its accordion opens). */
export function useCensusHistory(id: string | null) {
  return useQuery({
    queryKey: ['masterlist', 'history', id],
    queryFn: async () => (await api.get<CensusHistoryRow[]>(`/masterlist/${id}/history`)).data,
    enabled: id !== null,
  });
}

export interface MasterlistFilters {
  search: string;
  category: string;
  account: string;
  status: string;
  page: number;
  pageSize: number;
}

export function useMasterlist(filters: MasterlistFilters) {
  return useQuery({
    queryKey: ['masterlist', filters],
    queryFn: async () =>
      (
        await api.get<MasterlistResponse>('/masterlist', {
          params: {
            search: filters.search || undefined,
            category: filters.category || undefined,
            account: filters.account || undefined,
            status: filters.status || undefined,
            page: filters.page,
            pageSize: filters.pageSize,
          },
        })
      ).data,
    placeholderData: (prev) => prev,
  });
}

export interface AddRecordInput {
  fullName: string;
  birthdate?: string;
  address: string;
  purok?: string;
  category: string;
  lguEligibility?: string;
  householdCode?: string;
}

export function useAddRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddRecordInput) => (await api.post('/masterlist', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['masterlist'] }),
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: AddRecordInput & { id: string }) =>
      (await api.patch(`/masterlist/${id}`, input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['masterlist'] }),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/masterlist/${id}`);
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['masterlist'] }),
  });
}

export interface ImportResult {
  added: number;
  updated: number;
  deactivated: number;
  skipped: number;
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; mode: 'append' | 'refresh' }) => {
      const form = new FormData();
      form.append('file', input.file);
      form.append('mode', input.mode);
      return (await api.post<ImportResult>('/masterlist/import', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['masterlist'] }),
  });
}

export async function downloadMasterlistCsv(): Promise<void> {
  const { data } = await api.get<Blob>('/masterlist/export.csv', { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'census-masterlist.csv';
  a.click();
  URL.revokeObjectURL(url);
}
